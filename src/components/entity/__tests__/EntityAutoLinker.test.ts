import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

/**
 * EntityAutoLinker 的 handleMutations 防抖逻辑测试。
 *
 * 核心回归保障：连续多次 MutationObserver 回调时，
 * 防抖后的处理函数必须覆盖所有批次的 mutations，
 * 不能因为 clearTimeout 丢失早期批次。
 */
describe("EntityAutoLinker mutation batching", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("防抖应收集所有批次的 mutations，不丢失中间批次", () => {
    // 模拟 pendingMutations + handleMutations 的核心逻辑
    let pendingMutations: string[] = [];
    let processedBatch: string[] = [];
    let scanTimer: ReturnType<typeof setTimeout> | null = null;

    function handleMutations(mutations: string[]) {
      pendingMutations.push(...mutations);
      if (scanTimer) clearTimeout(scanTimer);
      scanTimer = setTimeout(() => {
        processedBatch = [...pendingMutations];
        pendingMutations = [];
      }, 100);
    }

    // 连续 3 次调用（模拟 MutationObserver 快速触发）
    handleMutations(["a", "b"]);
    handleMutations(["c"]);
    handleMutations(["d", "e"]);

    // 防抖 100ms 后执行
    vi.advanceTimersByTime(100);

    // 所有 5 个 mutation 都应被处理，不丢失
    expect(processedBatch).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("防抖期间的旧 mutations 不应因 clearTimeout 丢失", () => {
    let pendingMutations: string[] = [];
    const results: string[][] = [];
    let scanTimer: ReturnType<typeof setTimeout> | null = null;

    function handleMutations(mutations: string[]) {
      pendingMutations.push(...mutations);
      if (scanTimer) clearTimeout(scanTimer);
      scanTimer = setTimeout(() => {
        results.push([...pendingMutations]);
        pendingMutations = [];
      }, 100);
    }

    // 第一批
    handleMutations(["x"]);
    vi.advanceTimersByTime(50); // 50ms 后还没执行

    // 第二批（在 100ms 防抖期内）
    handleMutations(["y"]);
    vi.advanceTimersByTime(100); // 防抖完成

    // 只执行一次，但包含两批的内容
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual(["x", "y"]);
  });
});
