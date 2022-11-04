import { createI18n } from "vue-i18n";
import en from "./en/index.json";
import cn from "./zh-CN/index.json";

import enBREAK from "./en/BREAK";
import cnBREAK from "../BREAK";

const languages = {
  en: "English",
  cn: "中文",
};

const messages = {
  en: { ...en, BREAK: enBREAK },
  cn: { ...cn, BREAK: cnBREAK },
};

const i18n = createI18n({
  locale: "cn",
  messages: messages,
});

export { i18n, languages };
