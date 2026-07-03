import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  finishTopLoading,
  setTopLoadingProgress,
  startTopLoading,
  topLoadingState,
} from "@/utils/topLoading";

describe("topLoading", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    finishTopLoading("a");
    finishTopLoading("b");
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("任务开始时显示顶部加载条并更新进度", () => {
    startTopLoading("a", 20);
    expect(topLoadingState.active.value).toBe(true);
    expect(topLoadingState.progress.value).toBe(20);

    setTopLoadingProgress("a", 64);
    expect(topLoadingState.progress.value).toBe(64);
  });

  it("多个任务全部完成后才隐藏", () => {
    startTopLoading("a", 20);
    startTopLoading("b", 30);

    finishTopLoading("a");
    vi.advanceTimersByTime(300);
    expect(topLoadingState.active.value).toBe(true);

    finishTopLoading("b");
    expect(topLoadingState.progress.value).toBe(100);
    vi.advanceTimersByTime(220);
    expect(topLoadingState.active.value).toBe(false);
    expect(topLoadingState.progress.value).toBe(0);
  });
});
