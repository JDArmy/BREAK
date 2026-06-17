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

initLocaleMessages()
  .then(() => {
    app.mount("#app");
  })
  .catch((error) => {
    console.error("Failed to load initial locale messages:", error);
    app.mount("#app");
  });
