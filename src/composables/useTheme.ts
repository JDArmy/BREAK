import { ref, computed, onMounted, onUnmounted, watch } from "vue";

/** 主题模式 */
export type ThemeMode = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "break-theme";

/** 获取初始主题偏好 */
function getInitialTheme(): ThemeMode {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === "light" || saved === "dark" || saved === "system") return saved;
  return "system";
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

export function useTheme() {
  const theme = ref<ThemeMode>(getInitialTheme());

  // 系统偏好检测
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const systemDark = ref(mediaQuery.matches);

  // 监听系统偏好变化
  function onMediaChange(e: MediaQueryListEvent) {
    systemDark.value = e.matches;
  }

  // 实际是否暗色
  const isDark = computed(
    () => theme.value === "dark" || (theme.value === "system" && systemDark.value)
  );

  // 设置主题
  function setTheme(mode: ThemeMode) {
    theme.value = mode;
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  }

  // 监听主题变化，应用到 DOM
  watch(isDark, (dark) => applyTheme(dark), { immediate: true });

  onMounted(() => {
    mediaQuery.addEventListener("change", onMediaChange);
  });

  onUnmounted(() => {
    mediaQuery.removeEventListener("change", onMediaChange);
  });

  return { theme, isDark, setTheme };
}
