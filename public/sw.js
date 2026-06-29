/**
 * BREAK Service Worker
 * 缓存策略：
 *   - HTML(navigate)：network-first，离线回退 index.html
 *   - JS/CSS(带 hash)：cache-first
 *   - data/*.json：stale-while-revalidate
 *   - 图片/字体：cache-first
 *   - 其他：network-first
 */

const CACHE_NAME = "break-__SW_VERSION__";
const PRECACHE_URLS = ["./", "./manifest.webmanifest", "./favicon.ico", "./logo.png", "./icons/icon-192x192.png", "./icons/icon-512x512.png"];

// ─── Install：预缓存核心资源 ───
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

// ─── Activate：清理旧版本缓存 ───
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
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

  // 带 hash 的静态资源（JS/CSS）：cache-first
  if (/\/assets\/.*[-.][\da-f]{6,}\.(js|css)$/i.test(pathname)) {
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
