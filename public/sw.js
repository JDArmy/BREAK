/**
 * BREAK Service Worker
 * 缓存策略：
 *   - HTML(navigate)：network-first，离线回退 index.html
 *   - JS/CSS(带 hash)：cache-first
 *   - data/*.json：stale-while-revalidate
 *   - 图片/字体：cache-first
 *   - 其他：network-first
 *
 * 更新策略：
 *   - 新 SW 安装后默认等待，由页面在空闲/隐藏等安全时机发送 SKIP_WAITING
 *   - 激活时保留上一版本缓存，避免旧页面懒加载旧 chunk 时被新版本清理破坏
 */

const CACHE_NAME = "break-__SW_VERSION__";
const CACHE_PREFIX = "break-";
const PRECACHE_URLS = ["./", "./manifest.webmanifest", "./favicon.ico", "./logo.png", "./icons/icon-192x192.png", "./icons/icon-512x512.png"];
const SCOPE_PATH = new URL(self.registration.scope).pathname.replace(/\/$/, "");
const ASSET_PATH_PREFIX = `${SCOPE_PATH}/assets/`;

// ─── Install：预缓存核心资源 ───
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
});

// ─── Activate：清理旧版本缓存 ───
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        const breakCaches = keys.filter((key) => key.startsWith(CACHE_PREFIX));
        const previousCaches = breakCaches.filter((key) => key !== CACHE_NAME);
        const cachesToKeep = new Set([CACHE_NAME, ...previousCaches.slice(-1)]);
        return Promise.all(
          breakCaches
            .filter((key) => !cachesToKeep.has(key))
            .map((key) => caches.delete(key))
        );
      })
      .then(() => self.clients.claim())
  );
});

// ─── Message：页面确认安全后再激活新版本 ───
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    event.waitUntil(self.skipWaiting());
  }
});

// ─── Fetch：分策略拦截 ───
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 仅处理同源请求
  if (url.origin !== self.location.origin) return;

  // 导航请求（HTML）：network-first
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  const pathname = url.pathname;

  // 构建静态资源（JS/CSS）：cache-first。Vite/Rolldown hash 不是纯十六进制，不能用 [\da-f] 限定。
  if (pathname.startsWith(ASSET_PATH_PREFIX) && /\.(js|css)$/i.test(pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // 数据文件：stale-while-revalidate
  if (/\/data\/.*\.json$/i.test(pathname)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // 图片/字体：cache-first
  if (/\.(png|jpg|jpeg|svg|gif|ico|woff2?|ttf|eot)$/i.test(pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // 其他：network-first
  event.respondWith(networkFirst(request));
});

// ─── 策略实现 ───

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    // 导航请求兜底到 index.html（SPA hash 路由）
    if (!cached && request.mode === "navigate") {
      return caches.match("./");
    }
    return cached || new Response("Offline", { status: 503, statusText: "Service Unavailable" });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Offline", { status: 503, statusText: "Service Unavailable" });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  // 后台更新（不阻塞响应）
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);
  // 有缓存立即返回，否则等网络
  return cached || (await fetchPromise) || new Response("Offline", { status: 503, statusText: "Service Unavailable" });
}
