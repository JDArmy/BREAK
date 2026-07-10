import { describe, expect, it } from "vitest";

describe("案例懒加载", () => {
  it("初始状态不缓存案例，加载后缓存并复用同一个结果", async () => {
    const modulePath = `../cases/index.ts?case-loader-test-${Date.now()}`;
    const { getCases, loadCases } = await import(modulePath);

    expect(getCases()).toBeNull();

    const [cases, concurrentCases] = await Promise.all([loadCases(), loadCases()]);
    expect(concurrentCases).toBe(cases);

    expect(Object.keys(cases).length).toBe(1781);
    expect(cases.C0001).toBeDefined();
    expect(getCases()).toBe(cases);
    await expect(loadCases()).resolves.toBe(cases);
  });
});
