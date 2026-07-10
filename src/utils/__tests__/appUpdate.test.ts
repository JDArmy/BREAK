import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanupDevelopmentServiceWorker } from "@/utils/appUpdate";

describe("appUpdate 开发环境清理", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete (navigator as Navigator & { serviceWorker?: ServiceWorkerContainer }).serviceWorker;
    sessionStorage.clear();
  });

  it("注销遗留 Service Worker、删除 BREAK 缓存并刷新一次", async () => {
    const unregister = vi.fn(async () => true);
    const deleteCache = vi.fn(async () => true);
    const reload = vi.fn();
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        controller: {},
        getRegistrations: vi.fn(async () => [{ unregister }]),
      },
    });
    vi.stubGlobal("caches", {
      keys: vi.fn(async () => ["break-2.42.0", "other-cache"]),
      delete: deleteCache,
    });

    await cleanupDevelopmentServiceWorker(reload);
    await cleanupDevelopmentServiceWorker(reload);

    expect(unregister).toHaveBeenCalledTimes(2);
    expect(deleteCache).toHaveBeenCalledTimes(2);
    expect(deleteCache).toHaveBeenCalledWith("break-2.42.0");
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("页面已不受控制时清除刷新标记", async () => {
    sessionStorage.setItem("break-dev-sw-cleanup-reloaded", "1");
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        controller: null,
        getRegistrations: vi.fn(async () => []),
      },
    });
    vi.stubGlobal("caches", {
      keys: vi.fn(async () => []),
      delete: vi.fn(async () => true),
    });

    await cleanupDevelopmentServiceWorker(vi.fn());

    expect(sessionStorage.getItem("break-dev-sw-cleanup-reloaded")).toBeNull();
  });
});
