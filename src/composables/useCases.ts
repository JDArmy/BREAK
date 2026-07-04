import type { Ref } from "vue";
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { ElMessage } from "element-plus";
import { loadCases, type Cases } from "@/BREAK/cases";
import { i18n } from "@/i18n";

// 英文翻译：直接 import 构建时预合并的完整英文 cases 数据
// 中文：src/BREAK/cases 原始数据；英文：src/i18n/en/.generated/cases.json 预合并数据。
// 模块级单例 ref，导出供其他 composable（如 useSearchCore）直接访问，避免重复实例化。
export const cases = ref<Cases>({});
const loaded = ref(false);
const loadError = ref(false);
let cnLoadingPromise: Promise<Cases> | null = null;
let localeWatchRegistered = false;

function loadCnCases(): Promise<Cases> {
  if (cnLoadingPromise) return cnLoadingPromise;
  // 失败时清空缓存并 rethrow，避免把 rejected Promise 永久缓存导致案例功能瘫痪
  cnLoadingPromise = loadCases().catch((err) => {
    cnLoadingPromise = null;
    throw err;
  });
  return cnLoadingPromise;
}

// 英文完整 cases 懒加载（非 eager glob，从构建时预合并的 .generated 目录加载）
const enFullCaseFiles = import.meta.glob("../i18n/en/.generated/cases/C*.json");

// 英文 cases 直接加载构建时预合并的完整数据，无需中文 cases 作基底

async function applyEnTranslations() {
  const entries = await Promise.all(
    Object.values(enFullCaseFiles).map((loader) =>
      loader().catch((err) => {
        console.warn("[useCases] 加载英文案例数据文件失败:", err);
        return null;
      })
    )
  );
  const enCases: Cases = {};
  for (const mod of entries) {
    if (!mod) continue;
    const data = (mod as { default: Record<string, unknown> }).default;
    Object.assign(enCases, data);
  }
  cases.value = enCases;
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
    ElMessage({ message: i18n.global.t("error.caseSyncFailed"), type: "error", plain: true, duration: 3000, grouping: true });
  }
}

function registerLocaleWatcher(locale: Ref<string>) {
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
    if (loaded.value) return;
    // 重试时先清错误态
    loadError.value = false;
    try {
      if (locale.value === "en") {
        // 英文 locale 直接加载预合并数据，无需先加载中文
        await applyEnTranslations();
      } else {
        cases.value = await loadCnCases();
      }
      loaded.value = true;
    } catch (err) {
      // 首次加载失败：记录错误态供 UI 展示失败提示与重试入口，并 rethrow 保留“失败即拒绝”契约，
      // 供调用方（如测试、相关案例反查）感知失败；UI 层通过 loadError 反映状态而非依赖 rejection。
      console.error("[useCases] 加载案例数据失败:", err);
      loadError.value = true;
      throw err;
    }
  };

  return { cases, loaded, loadError, ensureCases };
}
