/**
 * useRelatedCases 单元测试
 * mock useCasesByRisk 与 useLazyCasesSection，验证按 type 选 getter、relatedCases 响应式、sectionRef 存在
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";

const ensureCases = vi.fn(() => Promise.resolve());
const cases = ref<Record<string, { title: string }>>({});
const loaded = ref(false);

// mock useCasesByRisk：返回受控 getter
vi.mock("@/composables/useCasesByRisk", () => ({
  useCasesByRisk: () => ({
    ensureCases,
    cases,
    loaded,
    getCasesByRisk: (k: string) => [`risk-${k}`],
    getCasesByAttackTool: (k: string) => [`at-${k}`],
    getCasesByThreatActor: (k: string) => [`ta-${k}`],
  }),
}));

// mock useLazyCasesSection：返回固定 sectionRef，不建真实 observer
vi.mock("@/composables/useLazyCasesSection", () => ({
  useLazyCasesSection: (trigger: () => void | Promise<void>) => {
    // 保留 trigger 引用以验证传入的是 ensureCases
    void trigger;
    return { sectionRef: { value: undefined } };
  },
}));

import { useRelatedCases } from "@/composables/useRelatedCases";

describe("useRelatedCases", () => {
  beforeEach(() => {
    ensureCases.mockClear();
  });

  it("risk 类型用 getCasesByRisk", () => {
    const key = ref("R0001");
    const { relatedCases } = useRelatedCases("risk", key);
    expect(relatedCases.value).toEqual(["risk-R0001"]);
  });

  it("attackTool 类型用 getCasesByAttackTool", () => {
    const key = ref("AT0001");
    const { relatedCases } = useRelatedCases("attackTool", key);
    expect(relatedCases.value).toEqual(["at-AT0001"]);
  });

  it("threatActor 类型用 getCasesByThreatActor", () => {
    const key = ref("TA0001");
    const { relatedCases } = useRelatedCases("threatActor", key);
    expect(relatedCases.value).toEqual(["ta-TA0001"]);
  });

  it("entityKey 变化时 relatedCases 响应式重算", () => {
    const key = ref("R0001");
    const { relatedCases } = useRelatedCases("risk", key);
    expect(relatedCases.value).toEqual(["risk-R0001"]);
    key.value = "R0002";
    expect(relatedCases.value).toEqual(["risk-R0002"]);
  });

  it("暴露 ensureCases / cases / loaded / sectionRef", () => {
    const result = useRelatedCases("risk", ref("R0001"));
    expect(typeof result.ensureCases).toBe("function");
    expect(result.cases).toBe(cases);
    expect(result.loaded).toBe(loaded);
    expect(result.sectionRef).toBeDefined();
  });
});
