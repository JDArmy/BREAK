import { createApp } from "vue";
import { ElMessage } from "element-plus";
import App from "./App.vue";
import router from "./router";
import { i18n, initLocaleMessages, initialLocale } from "./i18n";

import "element-plus/theme-chalk/dark/css-vars.css";
import "./assets/main.css";
import "./components/entity/entity.css";

const app = createApp(App);

app.config.errorHandler = (err, instance, info) => {
  console.error('Vue Error:', err);
  console.error('Component:', instance);
  console.error('Info:', info);
  // Vue 异步组件（defineAsyncComponent）加载失败也走此处
  if (isChunkLoadError(err)) {
    handleChunkLoadError();
  }
};

app.use(i18n);
app.use(router);

// ─── Chunk 加载失败自动刷新（部署更新后旧资源 404/500） ───
const CHUNK_RELOAD_KEY = "__break_chunk_reload__";

function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message;
  return (
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Loading chunk [\w.-]+ failed/i.test(msg) ||
    /Loading CSS chunk [\w.-]+ failed/i.test(msg)
  );
}

function handleChunkLoadError() {
  const currentPath = window.location.hash.slice(1) || window.location.pathname || "/";
  const reloadRecord = sessionStorage.getItem(CHUNK_RELOAD_KEY);
  // 同一路径只自动刷新 1 次，避免无限循环
  if (reloadRecord !== currentPath) {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, currentPath);
    console.warn("[BREAK] Chunk 加载失败，自动刷新页面");
    window.location.reload();
    return;
  }
  // 已经刷新过仍然失败，清除标记
  sessionStorage.removeItem(CHUNK_RELOAD_KEY);
}

// 捕获非 Vue 管理的动态 import 失败（如 router lazy load 等 Promise rejection）
window.addEventListener("unhandledrejection", (event) => {
  if (isChunkLoadError(event.reason)) {
    event.preventDefault();
    handleChunkLoadError();
  }
});

// 页面正常加载成功后清除刷新标记
window.addEventListener("load", () => {
  sessionStorage.removeItem(CHUNK_RELOAD_KEY);
});

const isEnglishLocale = initialLocale === "en";
const shouldLoadInitialLocaleBeforeMount =
  typeof window !== "undefined" && window.innerWidth >= 768;
const MOBILE_IDLE_PRELOAD_DELAY_MS = 15000;

const DATA_LOAD_FAIL_MSG = navigator.language?.startsWith("en")
  ? "Data failed to load. Please refresh the page."
  : "数据加载失败，请刷新页面";

if (isEnglishLocale) {
  // 英文 locale 必须在 mount 前加载完 BREAK 数据，否则首屏显示中文
  initLocaleMessages()
    .catch((error) => {
      console.error("Failed to load EN locale messages:", error);
      ElMessage({ message: DATA_LOAD_FAIL_MSG, type: "error", plain: true, duration: 5000, grouping: true });
    })
    .finally(() => {
      app.mount("#app");
    });
} else {
  // 中文 locale：直接 mount，保持现有行为
  if (shouldLoadInitialLocaleBeforeMount) {
    initLocaleMessages().catch((error) => {
      console.error("Failed to load initial locale messages:", error);
      ElMessage({ message: DATA_LOAD_FAIL_MSG, type: "error", plain: true, duration: 5000, grouping: true });
    });
  }

  app.mount("#app");
}

const getConnection = () => {
  const navigatorWithConnection = navigator as Navigator & {
    connection?: {
      saveData?: boolean;
      effectiveType?: string;
    };
  };
  return navigatorWithConnection.connection;
};

const shouldPreloadOnMobileConnection = () => {
  const connection = getConnection();
  if (!connection) return true;
  if (connection.saveData) return false;
  return !["slow-2g", "2g"].includes(connection.effectiveType ?? "");
};

const preloadLocaleMessages = () => {
  initLocaleMessages().catch((error) => {
    console.error("Failed to load initial locale messages:", error);
    ElMessage({ message: DATA_LOAD_FAIL_MSG, type: "error", plain: true, duration: 5000, grouping: true });
  });
};

const scheduleMobileLocalePreload = () => {
  if (typeof window === "undefined" || shouldLoadInitialLocaleBeforeMount) return;
  if (!shouldPreloadOnMobileConnection()) return;

  window.setTimeout(() => {
    if (!shouldPreloadOnMobileConnection()) return;

    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(preloadLocaleMessages, { timeout: 5000 });
      return;
    }

    preloadLocaleMessages();
  }, MOBILE_IDLE_PRELOAD_DELAY_MS);
};

window.requestAnimationFrame(scheduleMobileLocalePreload);

// ─── Service Worker 注册 + 更新提示 ───
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then((registration) => {
        // 检测到新版本时提示用户
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "activated" && navigator.serviceWorker.controller) {
              ElMessage({
                message: navigator.language?.startsWith("en")
                  ? "New version available. Please refresh the page."
                  : "发现新版本，请刷新页面。",
                type: "info",
                plain: true,
                duration: 8000,
                grouping: true,
              });
            }
          });
        });
      })
      .catch((err) => {
        console.warn("[BREAK] Service Worker 注册失败:", err);
      });
  });
}
