import { createI18n } from "vue-i18n";
import { ElMessage } from "element-plus";
import en from "./en/index.json";
import cn from "./zh-CN/index.json";

const languages = {
  en: "English",
  cn: "中文",
};

const LOCALE_STORAGE_KEY = "break-locale";

type Locale = "cn" | "en";
type BreakMessages = typeof import("../BREAK").default;

const getInitialLocale = (): Locale => {
  const saved = typeof localStorage !== "undefined" ? localStorage.getItem(LOCALE_STORAGE_KEY) : null;
  if (saved && saved in languages) return saved as Locale;

  const browserLang = typeof navigator !== "undefined" ? (navigator.language || "") : "";
  if (browserLang.startsWith("zh")) return "cn";
  if (browserLang.startsWith("en")) return "en";

  return "cn";
};

const initialLocale = getInitialLocale();
export { initialLocale };

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

// 加载失败提示（不走 i18n 管道，因为此时 i18n 数据可能还没注入；按浏览器语言判断文案）
const DATA_LOAD_FAIL_MSG = typeof navigator !== "undefined" && navigator.language?.startsWith("en")
  ? "Data failed to load. Please refresh the page."
  : "数据加载失败，请刷新页面";

const showDataLoadError = () => {
  ElMessage({ message: DATA_LOAD_FAIL_MSG, type: "error", plain: true, duration: 5000, grouping: true });
};

const ensureCnLocaleMessages = async () => {
  if (hasBreakMessages("cn")) return;

  try {
    const cnBREAK = await loadCnBreakMessages();
    i18n.global.setLocaleMessage("cn", {
      ...cn,
      BREAK: cnBREAK,
    });
  } catch (err) {
    showDataLoadError();
    throw err;
  }
};

const ensureEnLocaleMessages = async () => {
  if (hasBreakMessages("en")) return;

  if (!enBreakMessagePromise) {
    // 直接 import 构建时预合并的完整英文数据，无需加载中文 BREAK
    // 失败时清空缓存并 rethrow，避免把 rejected Promise 永久缓存导致英文模式瘫痪
    enBreakMessagePromise = import("./en/BREAK-full")
      .then(({ default: enBREAK }) => {
        i18n.global.setLocaleMessage("en", {
          ...en,
          BREAK: enBREAK as unknown as BreakMessages,
        });
      })
      .catch((err) => {
        enBreakMessagePromise = null;
        showDataLoadError();
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

// 初始化时同步 <html lang>
if (typeof document !== "undefined") {
  document.documentElement.lang = initialLocale === "en" ? "en" : "zh-CN";
}

const setLocale = async (locale: Locale) => {
  await ensureLocaleMessages(locale);
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  i18n.global.locale.value = locale;
  // 同步更新 <html lang> 属性，利于 SEO 和辅助技术
  document.documentElement.lang = locale === "cn" ? "zh-CN" : "en";
};

export {
  i18n,
  initLocaleMessages,
  languages,
  setLocale,
  LOCALE_STORAGE_KEY,
};
