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

const LOCALE_STORAGE_KEY = "break-locale";

const getInitialLocale = (): string => {
  const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (saved && saved in languages) return saved;

  const browserLang = navigator.language || "";
  if (browserLang.startsWith("zh")) return "cn";
  if (browserLang.startsWith("en")) return "en";

  return "cn";
};

const i18n = createI18n({
  legacy: false,
  locale: getInitialLocale(),
  fallbackLocale: "cn",
  messages: messages,
});

const setLocale = (locale: string) => {
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  (i18n.global.locale as { value: string }).value = locale;
};

export { i18n, languages, setLocale, LOCALE_STORAGE_KEY };
