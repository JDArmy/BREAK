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
};

app.use(i18n);
app.use(router);

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
