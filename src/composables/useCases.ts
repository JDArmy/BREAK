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
let localeWatchRegistered = false;

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
  // 逐文件加载英文翻译，单个文件失败不影响整体（降级为中文）
  const entries = await Promise.all(
    Object.values(enCaseFiles).map((loader) =>
      loader().catch((err) => {
        console.warn("[useCases] 加载英文案例翻译文件失败，该文件降级为中文:", err);
        return null;
      })
    )
  );
  const enCases: Record<string, unknown> = {};
  for (const mod of entries) {
    if (!mod) continue;
    const data = (mod as { default: Record<string, unknown> }).default;
    Object.assign(enCases, data);
  }
  const merged = mergeWithStructure(cn, enCases) as Cases;
  cases.value = merged;
}

async function syncCasesForLocale(newLocale: string) {
  try {
    if (newLocale === "en") {
      await applyEnTranslations();
    } else {
      cases.value = await loadCnCases();
    }
  } catch (err) {
    console.error("[useCases] 切换语言时加载案例数据失败:", err);
  }
}

function registerLocaleWatcher(locale: ReturnType<typeof useI18n>["locale"]) {
  if (localeWatchRegistered) return;
  localeWatchRegistered = true;

  // locale 切换时重新合并翻译。watch 只注册一次，避免多个组件同时使用案例数据时重复加载与覆盖。
  watch(locale, async (newLocale) => {
    if (!loaded.value) return;
    await syncCasesForLocale(newLocale);
  });
}

export function useCases() {
  const { locale } = useI18n();
  registerLocaleWatcher(locale);

  const ensureCases = async (): Promise<void> => {
    if (!loaded.value) {
      cases.value = await loadCnCases();
      loaded.value = true;
      if (locale.value === "en") await applyEnTranslations();
    }
  };

  return { cases, loaded, ensureCases };
}
