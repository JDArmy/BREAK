import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import { i18n, initLocaleMessages } from "./i18n";

import "element-plus/theme-chalk/dark/css-vars.css";
import "./assets/main.css";

const app = createApp(App);

app.config.errorHandler = (err, instance, info) => {
  console.error('Vue Error:', err);
  console.error('Component:', instance);
  console.error('Info:', info);
};

app.use(i18n);
app.use(router);

const shouldLoadInitialLocaleBeforeMount =
  typeof window !== "undefined" && window.innerWidth >= 768;

if (shouldLoadInitialLocaleBeforeMount) {
  initLocaleMessages().catch((error) => {
    console.error("Failed to load initial locale messages:", error);
  });
}

app.mount("#app");

const scheduleInitLocaleMessages = () => {
  const run = () => {
    initLocaleMessages().catch((error) => {
      console.error("Failed to load initial locale messages:", error);
    });
  };

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(run, { timeout: 3000 });
    return;
  }

  window.setTimeout(run, 0);
};

window.requestAnimationFrame(() => {
  if (!shouldLoadInitialLocaleBeforeMount) {
    scheduleInitLocaleMessages();
  }
});
