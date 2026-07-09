import { createApp } from "vue";
import { ElMessage } from "element-plus";
import App from "./App.vue";
import router from "./router";
import { i18n, initLocaleMessages, initialLocale } from "./i18n";
import {
  recoverFromChunkLoadError,
} from "@/utils/chunkLoadRecovery";
import { setupAppUpdate } from "@/utils/appUpdate";
import {
  finishTopLoading,
  setTopLoadingProgress,
  startTopLoading,
} from "@/utils/topLoading";

import "element-plus/theme-chalk/dark/css-vars.css";
import "./assets/main.css";
import "./components/entity/entity.css";

declare global {
  interface Window {
    __BREAK_BOOT__?: {
      setStage: (text: string, percent?: number, hint?: string) => void;
      setError: (text: string) => void;
      done: () => void;
    };
  }
}

const boot = window.__BREAK_BOOT__;
const bootMessages = {
  cn: {
    initializing: "正在初始化应用...",
    mounting: "加载完成，正在显示页面...",
    coreModules: "正在加载核心模块...",
    englishKnowledge: "正在加载英文知识库数据...",
    englishKnowledgeHint: "英文模式首次加载需要拉取完整翻译数据。",
    preloadKnowledge: "正在预加载知识库数据...",
    preloadKnowledgeHint: "桌面端会预加载完整知识库，便于后续搜索和详情查看。",
    lightHome: "正在加载首页轻量数据...",
    lightHomeHint: "移动端会先显示首页，再空闲加载完整数据。",
    backgroundKnowledge: "正在后台加载完整知识库...",
    dataLoadFailed: "数据加载失败，请刷新页面",
  },
  en: {
    initializing: "Initializing app...",
    mounting: "Loading complete. Opening the page...",
    coreModules: "Loading core modules...",
    englishKnowledge: "Loading English knowledge base data...",
    englishKnowledgeHint: "English mode needs to fetch the full translation data on first load.",
    preloadKnowledge: "Preloading knowledge base data...",
    preloadKnowledgeHint: "Desktop devices preload the full knowledge base for search and detail views.",
    lightHome: "Loading lightweight home data...",
    lightHomeHint: "Mobile devices show the home page first, then load full data when idle.",
    backgroundKnowledge: "Loading full knowledge base in the background...",
    dataLoadFailed: "Data failed to load. Please refresh the page.",
  },
} as const;

const bootText = bootMessages[initialLocale];

boot?.setStage(bootText.initializing, 18);

const mountApp = () => {
  boot?.setStage(bootText.mounting, 100);
  window.requestAnimationFrame(() => {
    window.setTimeout(() => {
      app.mount("#app");
      boot?.done();
    }, 180);
  });
};

const app = createApp(App);

app.config.errorHandler = (err, instance, info) => {
  console.error('Vue Error:', err);
  console.error('Component:', instance);
  console.error('Info:', info);
  recoverFromChunkLoadError(err, "vue-error-handler");
};

app.use(i18n);
app.use(router);
boot?.setStage(bootText.coreModules, 28);

// 捕获非 Vue 管理的动态 import 失败（如 router lazy load 等 Promise rejection）
window.addEventListener("unhandledrejection", (event) => {
  if (recoverFromChunkLoadError(event.reason, "unhandledrejection")) {
    event.preventDefault();
  }
});

const isEnglishLocale = initialLocale === "en";
const shouldLoadInitialLocaleBeforeMount =
  typeof window !== "undefined" && window.innerWidth >= 768;
const MOBILE_IDLE_PRELOAD_DELAY_MS = 15000;

const DATA_LOAD_FAIL_MSG = bootText.dataLoadFailed;

if (isEnglishLocale) {
  // 英文 locale 必须在 mount 前加载完 BREAK 数据，否则首屏显示中文
  boot?.setStage(bootText.englishKnowledge, 45, bootText.englishKnowledgeHint);
  startTopLoading("initial-locale", 35);
  initLocaleMessages()
    .catch((error) => {
      console.error("Failed to load EN locale messages:", error);
      boot?.setError(DATA_LOAD_FAIL_MSG);
      ElMessage({ message: DATA_LOAD_FAIL_MSG, type: "error", plain: true, duration: 5000, grouping: true });
    })
    .finally(() => {
      finishTopLoading("initial-locale");
      mountApp();
    });
} else {
  // 中文 locale：直接 mount，保持现有行为
  if (shouldLoadInitialLocaleBeforeMount) {
    boot?.setStage(bootText.preloadKnowledge, 45, bootText.preloadKnowledgeHint);
    startTopLoading("initial-locale", 35);
    initLocaleMessages()
      .then(() => setTopLoadingProgress("initial-locale", 95))
      .catch((error) => {
        console.error("Failed to load initial locale messages:", error);
        boot?.setError(DATA_LOAD_FAIL_MSG);
        ElMessage({ message: DATA_LOAD_FAIL_MSG, type: "error", plain: true, duration: 5000, grouping: true });
      })
      .finally(() => finishTopLoading("initial-locale"));
  } else {
    boot?.setStage(bootText.lightHome, 52, bootText.lightHomeHint);
  }

  mountApp();
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
  boot?.setStage(bootText.backgroundKnowledge, 72);
  startTopLoading("idle-locale", 20);
  initLocaleMessages()
    .then(() => setTopLoadingProgress("idle-locale", 95))
    .catch((error) => {
      console.error("Failed to load initial locale messages:", error);
      ElMessage({ message: DATA_LOAD_FAIL_MSG, type: "error", plain: true, duration: 5000, grouping: true });
    })
    .finally(() => finishTopLoading("idle-locale"));
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

// ─── Service Worker 注册 + 静默更新协调 ───
setupAppUpdate();
