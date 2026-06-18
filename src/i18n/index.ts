import { createI18n } from "vue-i18n";
import en from "./en/index.json";
import cn from "./zh-CN/index.json";

/**
 * 深度合并结构数据与翻译文本
 * 以中文结构数据为基础，用英文翻译文本覆盖对应字段
 * - 结构字段（ID 数组、references[].link、updated 等）从中文源保留
 * - 翻译字段（title、description 等）从英文翻译覆盖
 */
const replaceArrayTranslationKeys = new Set(["keywords", "aliases"]);

function mergeWithStructure(
  structure: unknown,
  translations: unknown,
  key?: string
): unknown {
  if (replaceArrayTranslationKeys.has(key ?? "") && Array.isArray(structure)) {
    return Array.isArray(translations) ? translations : [];
  }
  if (translations === undefined || translations === null) return structure;
  if (structure === undefined || structure === null) return translations;
  if (typeof structure !== "object") return translations;
  if (typeof translations !== "object") return translations;

  // 数组：逐元素合并
  if (Array.isArray(structure)) {
    if (!Array.isArray(translations)) return structure;
    return structure.map((item, idx) =>
      idx < translations.length
        ? mergeWithStructure(item, translations[idx])
        : item
    );
  }
  if (Array.isArray(translations)) return translations;

  // 对象：先复制全部结构字段，再用翻译覆盖
  const result: Record<string, unknown> = {
    ...(structure as Record<string, unknown>),
  };
  for (const arrayKey of replaceArrayTranslationKeys) {
    const structVal = (structure as Record<string, unknown>)[arrayKey];
    if (Array.isArray(structVal) && !(arrayKey in (translations as Record<string, unknown>))) {
      result[arrayKey] = [];
    }
  }
  for (const [key, transVal] of Object.entries(
    translations as Record<string, unknown>
  )) {
    const structVal = (structure as Record<string, unknown>)[key];
    if (transVal !== undefined) {
      // 两者都是数组：逐元素递归合并
      if (Array.isArray(transVal) && Array.isArray(structVal)) {
        result[key] = replaceArrayTranslationKeys.has(key)
          ? transVal
          : (structVal as unknown[]).map((item, idx) =>
              idx < (transVal as unknown[]).length
                ? mergeWithStructure(item, (transVal as unknown[])[idx], key)
                : item
            );
      } else if (
        typeof transVal === "object" &&
        transVal !== null &&
        !Array.isArray(transVal) &&
        typeof structVal === "object" &&
        structVal !== null &&
        !Array.isArray(structVal)
      ) {
        // 嵌套对象：递归合并
        result[key] = mergeWithStructure(structVal, transVal, key);
      } else {
        // 翻译文本覆盖结构值
        result[key] = transVal;
      }
    }
  }
  return result;
}

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
    cnBreakMessagePromise = import("../BREAK").then(
      ({ default: cnBREAK }) => cnBREAK
    );
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
    enBreakMessagePromise = Promise.all([
      loadCnBreakMessages(),
      import("./en/BREAK"),
    ]).then(([cnBREAK, { default: enBREAK }]) => {
      i18n.global.setLocaleMessage("en", {
        ...en,
        BREAK: mergeWithStructure(cnBREAK, enBREAK) as typeof enBREAK,
      });
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

export { i18n, initLocaleMessages, languages, setLocale, LOCALE_STORAGE_KEY };
