import { createI18n } from "vue-i18n";
import en from "./en/index.json";
import cn from "./zh-CN/index.json";
import { mergeWithStructure } from "@/utils/mergeWithStructure.mjs";

const languages = {
  en: "English",
  cn: "中文",
};

const LOCALE_STORAGE_KEY = "break-locale";

type Locale = "cn" | "en";
type BreakMessages = typeof import("../BREAK").default;

const getInitialLocale = (): Locale => {
  const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (saved && saved in languages) return saved as Locale;

  const browserLang = navigator.language || "";
  if (browserLang.startsWith("zh")) return "cn";
  if (browserLang.startsWith("en")) return "en";

  return "cn";
};

const initialLocale = getInitialLocale();

const messages = {
  en,
  cn,
};

const i18n = createI18n({
  legacy: false,
  locale: initialLocale,
  fallbackLocale: "cn",
  messages: messages,
});

let cnBreakMessagePromise: Promise<BreakMessages> | null = null;
let enBreakMessagePromise: Promise<void> | null = null;

const hasBreakMessages = (locale: Locale) => {
  const breakMessages = (i18n.global.getLocaleMessage(locale) as Record<string, unknown>)
    .BREAK;
  return Boolean(
    breakMessages &&
      typeof breakMessages === "object" &&
      "risks" in breakMessages &&
      "avoidances" in breakMessages &&
      "attackTools" in breakMessages &&
      "threatActors" in breakMessages
  );
};

const loadCnBreakMessages = () => {
  if (!cnBreakMessagePromise) {
    // 失败时清空缓存并 rethrow，避免把 rejected Promise 永久缓存导致功能瘫痪
    cnBreakMessagePromise = import("../BREAK")
      .then(({ default: cnBREAK }) => cnBREAK)
      .catch((err) => {
        cnBreakMessagePromise = null;
        throw err;
      });
  }

  return cnBreakMessagePromise;
};

const ensureCnLocaleMessages = async () => {
  if (hasBreakMessages("cn")) return;

  const cnBREAK = await loadCnBreakMessages();
  i18n.global.setLocaleMessage("cn", {
    ...cn,
    BREAK: cnBREAK,
  });
};

const ensureEnLocaleMessages = async () => {
  if (hasBreakMessages("en")) return;

  if (!enBreakMessagePromise) {
    // 失败时清空缓存并 rethrow，避免把 rejected Promise 永久缓存导致英文模式瘫痪
    enBreakMessagePromise = Promise.all([
      loadCnBreakMessages(),
      import("./en/BREAK"),
    ])
      .then(([cnBREAK, { default: enBREAK }]) => {
        i18n.global.setLocaleMessage("en", {
          ...en,
          BREAK: mergeWithStructure(cnBREAK, enBREAK) as BreakMessages,
        });
      })
      .catch((err) => {
        enBreakMessagePromise = null;
        throw err;
      });
  }

  await enBreakMessagePromise;
};

const ensureLocaleMessages = async (locale: Locale) => {
  if (locale === "cn") {
    await ensureCnLocaleMessages();
    return;
  }

  await ensureEnLocaleMessages();
};

const initLocaleMessages = () => ensureLocaleMessages(initialLocale);

const setLocale = async (locale: Locale) => {
  await ensureLocaleMessages(locale);
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  i18n.global.locale.value = locale;
};

export {
  i18n,
  initLocaleMessages,
  languages,
  mergeWithStructure,
  setLocale,
  LOCALE_STORAGE_KEY,
};
