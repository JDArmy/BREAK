import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { loadCases, type Cases } from "@/BREAK/cases";
import { mergeWithStructure } from "@/i18n";

// 案例数据全局单例：懒加载，所有使用案例的地方共享同一份缓存。
// 首页不加载 cases；访问 /cases、搜索、相关案例反查时触发 loadCases。
// 中文：src/BREAK/cases 原始数据；英文：src/i18n/en/BREAK/cases 翻译合并。
const cases = ref<Cases>({});
const loaded = ref(false);
let cnLoadingPromise: Promise<Cases> | null = null;

// 英文翻译懒加载（非 eager glob，仅英文模式且 cases 已加载时合并）
const enCaseFiles = import.meta.glob("../i18n/en/BREAK/cases/C*.json");

function loadCnCases(): Promise<Cases> {
  if (cnLoadingPromise) return cnLoadingPromise;
  // 失败时清空缓存并 rethrow，避免把 rejected Promise 永久缓存导致案例功能瘫痪
  cnLoadingPromise = loadCases().catch((err) => {
    cnLoadingPromise = null;
    throw err;
  });
  return cnLoadingPromise;
}

async function applyEnTranslations() {
  const cn = await loadCnCases();
  const entries = await Promise.all(
    Object.values(enCaseFiles).map((loader) => loader())
  );
  const enCases: Record<string, unknown> = {};
  for (const mod of entries) {
    const data = (mod as { default: Record<string, unknown> }).default;
    Object.assign(enCases, data);
  }
  const merged = mergeWithStructure(cn, enCases) as Cases;
  Object.keys(cases.value).forEach((k) => delete cases.value[k]);
  Object.assign(cases.value, merged);
}

export function useCases() {
  const { locale } = useI18n();

  const ensureCases = async (): Promise<void> => {
    if (!loaded.value) {
      const cn = await loadCnCases();
      Object.keys(cases.value).forEach((k) => delete cases.value[k]);
      Object.assign(cases.value, cn);
      loaded.value = true;
      if (locale.value === "en") await applyEnTranslations();
    }
  };

  // locale 切换时重新合并翻译
  watch(locale, async (newLocale) => {
    if (!loaded.value) return;
    if (newLocale === "en") {
      await applyEnTranslations();
    } else {
      const cn = await loadCnCases();
      Object.keys(cases.value).forEach((k) => delete cases.value[k]);
      Object.assign(cases.value, cn);
    }
  });

  return { cases, loaded, ensureCases };
}
