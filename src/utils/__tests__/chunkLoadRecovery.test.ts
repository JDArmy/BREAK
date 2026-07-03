import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ElMessage } from "element-plus";

const appUpdateMocks = vi.hoisted(() => ({
  hasPendingAppUpdate: vi.fn(() => false),
  applyPendingAppUpdate: vi.fn(() => false),
}));

vi.mock("@/utils/appUpdate", () => appUpdateMocks);

import {
  clearChunkReloadMark,
  createRecoverableAsyncComponent,
  isChunkLoadError,
  recoverFromChunkLoadError,
} from "@/utils/chunkLoadRecovery";

vi.mock("element-plus", () => ({
  ElMessage: vi.fn(),
}));

describe("chunkLoadRecovery", () => {
  let reloadSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-03T00:00:00Z"));
    vi.mocked(ElMessage).mockClear();
    appUpdateMocks.hasPendingAppUpdate.mockReturnValue(false);
    appUpdateMocks.applyPendingAppUpdate.mockReturnValue(false);
    appUpdateMocks.hasPendingAppUpdate.mockClear();
    appUpdateMocks.applyPendingAppUpdate.mockClear();
    sessionStorage.clear();
    reloadSpy = vi.spyOn(window.location, "reload").mockImplementation(() => undefined);
  });

  afterEach(() => {
    reloadSpy.mockRestore();
    vi.useRealTimers();
  });

  it("识别动态 import 失败", () => {
    expect(isChunkLoadError(new Error("Failed to fetch dynamically imported module"))).toBe(true);
    expect(isChunkLoadError(new Error("Loading chunk abc failed"))).toBe(true);
    expect(isChunkLoadError(new Error("普通错误"))).toBe(false);
  });

  it("同一路径首次 chunk 加载失败时自动刷新一次", () => {
    const handled = recoverFromChunkLoadError(
      new Error("Failed to fetch dynamically imported module"),
      "test",
    );

    expect(handled).toBe(true);
    expect(ElMessage).toHaveBeenCalledWith(expect.objectContaining({ type: "info" }));
    vi.runOnlyPendingTimers();
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it("同一路径重复失败时提示手动刷新，避免无限刷新", () => {
    sessionStorage.setItem(
      "__break_chunk_reload__",
      JSON.stringify({ path: window.location.pathname || "/", time: Date.now() }),
    );

    const handled = recoverFromChunkLoadError(
      new Error("Failed to fetch dynamically imported module"),
      "test",
    );

    expect(handled).toBe(true);
    expect(ElMessage).toHaveBeenCalledWith(expect.objectContaining({ type: "error" }));
    vi.runOnlyPendingTimers();
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it("刷新标记超过冷却窗口后允许再次自动恢复", () => {
    sessionStorage.setItem(
      "__break_chunk_reload__",
      JSON.stringify({ path: window.location.pathname || "/", time: Date.now() - 121000 }),
    );

    const handled = recoverFromChunkLoadError(
      new Error("Failed to fetch dynamically imported module"),
      "test",
    );

    expect(handled).toBe(true);
    expect(ElMessage).toHaveBeenCalledWith(expect.objectContaining({ type: "info" }));
    vi.runOnlyPendingTimers();
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it("可清理刷新标记", () => {
    sessionStorage.setItem("__break_chunk_reload__", "/");
    clearChunkReloadMark();
    expect(sessionStorage.getItem("__break_chunk_reload__")).toBeNull();
  });

  it("存在待更新版本时异步组件不再请求旧 chunk，直接触发更新", () => {
    appUpdateMocks.hasPendingAppUpdate.mockReturnValue(true);
    appUpdateMocks.applyPendingAppUpdate.mockReturnValue(true);
    const loader = vi.fn(async () => ({ template: "<div />" }));
    const component = createRecoverableAsyncComponent(loader, undefined, "FeatureEntry") as {
      __asyncLoader: () => Promise<unknown>;
    };

    void component.__asyncLoader();

    expect(appUpdateMocks.applyPendingAppUpdate).toHaveBeenCalledWith("async:FeatureEntry");
    expect(loader).not.toHaveBeenCalled();
  });

  it("支持后台异步组件静默加载，不渲染加载占位", () => {
    const loader = vi.fn(async () => ({ template: "<div />" }));
    const component = createRecoverableAsyncComponent(
      loader,
      undefined,
      "BackgroundWorker",
      { showLoading: false },
    ) as {
      __asyncLoader: () => Promise<unknown>;
      __asyncLoadingComponent?: unknown;
    };

    expect(component.__asyncLoadingComponent).toBeUndefined();
  });
});
