import { ref, computed, onMounted, onUnmounted, watch } from "vue";

/** 主题模式 */
export type ThemeMode = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "break-theme";

/** 获取初始主题偏好 */
function getInitialTheme(): ThemeMode {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === "light" || saved === "dark" || saved === "system") return saved;
  return "dark";
}

/** 在 DOM 上应用/移除 dark class */
function applyTheme(isDark: boolean) {
  const html = document.documentElement;
  if (isDark) {
    html.classList.add("dark");
  } else {
    html.classList.remove("dark");
  }
}

// ===== 模块级单例状态，所有组件共享 =====
const theme = ref<ThemeMode>(getInitialTheme());
const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
const systemDark = ref(mediaQuery.matches);

// 实际是否暗色
const isDark = computed(
  () => theme.value === "dark" || (theme.value === "system" && systemDark.value)
);

// 监听系统偏好变化
function onMediaChange(e: MediaQueryListEvent) {
  systemDark.value = e.matches;
}

// 监听主题变化，应用到 DOM
watch(isDark, (dark) => applyTheme(dark), { immediate: true });

// 全局系统偏好监听器引用计数
let mediaListenerCount = 0;

export function useTheme() {
  // 设置主题
  function setTheme(mode: ThemeMode) {
    theme.value = mode;
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  }

  onMounted(() => {
    if (mediaListenerCount === 0) {
      mediaQuery.addEventListener("change", onMediaChange);
    }
    mediaListenerCount++;
  });

  onUnmounted(() => {
    mediaListenerCount--;
    if (mediaListenerCount === 0) {
      mediaQuery.removeEventListener("change", onMediaChange);
    }
  });

  return { theme, isDark, setTheme };
}
