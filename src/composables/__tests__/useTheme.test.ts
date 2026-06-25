import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, nextTick } from "vue";

const createLocalStorageMock = () => {
  const store = new Map<string, string>();
  return {
    clear: vi.fn(() => store.clear()),
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
  };
};

describe("useTheme", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createLocalStorageMock());
    vi.resetModules();
    vi.clearAllMocks();
    document.documentElement.className = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("读取本地主题偏好并把 dark class 同步到 DOM", async () => {
    localStorage.setItem("break-theme", "light");
    const { useTheme } = await import("@/composables/useTheme");
    const { theme, isDark, setTheme } = useTheme();

    expect(theme.value).toBe("light");
    expect(isDark.value).toBe(false);
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    setTheme("dark");
    await nextTick();
    expect(localStorage.getItem("break-theme")).toBe("dark");
    expect(isDark.value).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("无效本地主题偏好回落到 dark 并可切换回 light", async () => {
    localStorage.setItem("break-theme", "invalid");
    const { useTheme } = await import("@/composables/useTheme");
    const { theme, isDark, setTheme } = useTheme();

    expect(theme.value).toBe("dark");
    expect(isDark.value).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    setTheme("light");
    await nextTick();

    expect(theme.value).toBe("light");
    expect(isDark.value).toBe(false);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("system 模式跟随 matchMedia，并按组件挂载数量管理监听器", async () => {
    const listeners = new Set<(event: MediaQueryListEvent) => void>();
    const addEventListener = vi.fn((_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener);
    });
    const removeEventListener = vi.fn((_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener);
    });
    vi.stubGlobal("matchMedia", vi.fn(() => ({
      matches: false,
      addEventListener,
      removeEventListener,
    })));
    localStorage.setItem("break-theme", "system");

    const { useTheme } = await import("@/composables/useTheme");
    let first!: ReturnType<typeof useTheme>;
    let second!: ReturnType<typeof useTheme>;
    const First = defineComponent({
      setup() {
        first = useTheme();
        return () => null;
      },
    });
    const Second = defineComponent({
      setup() {
        second = useTheme();
        return () => null;
      },
    });

    const firstWrapper = mount(First);
    const secondWrapper = mount(Second);

    expect(addEventListener).toHaveBeenCalledTimes(1);
    expect(first.isDark.value).toBe(false);
    expect(second.theme.value).toBe("system");

    for (const listener of listeners) {
      listener({ matches: true } as MediaQueryListEvent);
    }
    await nextTick();
    expect(first.isDark.value).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    firstWrapper.unmount();
    expect(removeEventListener).not.toHaveBeenCalled();
    secondWrapper.unmount();
    expect(removeEventListener).toHaveBeenCalledTimes(1);
  });

  it("system 模式在系统偏好为浅色时保持 light DOM 状态", async () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
    localStorage.setItem("break-theme", "system");

    const { useTheme } = await import("@/composables/useTheme");
    const { theme, isDark } = useTheme();

    expect(theme.value).toBe("system");
    expect(isDark.value).toBe(false);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
