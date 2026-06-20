/**
 * useRelatedEntities 单元测试
 * 测试反查工厂：单字段、多字段 OR、key 响应式、空 key
 */
import { describe, it, expect } from "vitest";
import { ref, computed } from "vue";
import { useRelatedEntities } from "@/composables/useRelatedEntities";

// 构造模拟 BREAK 表
const attackTools = {
  AT0001: { directCauseRisks: ["R0001"], indirectSupportRisks: ["R0099"] },
  AT0002: { directCauseRisks: ["R0099"], indirectSupportRisks: ["R0001"] },
  AT0003: { directCauseRisks: ["R0005"], indirectSupportRisks: ["R0006"] },
};

const terms = {
  T0001: { relatedRisks: ["R0001", "R0005"] },
  T0002: { relatedRisks: ["R0099"] },
  T0003: { relatedRisks: [] },
};

describe("useRelatedEntities", () => {
  it("单字段反查：返回所有该字段包含 targetKey 的实体 key", () => {
    const targetKey = ref("R0001");
    const result = useRelatedEntities(terms, "relatedRisks", targetKey);
    expect(result.value).toEqual(["T0001"]);
  });

  it("多字段 OR：任一字段命中即算关联", () => {
    const targetKey = ref("R0001");
    // AT0001 directCause 命中，AT0002 indirectSupport 命中，AT0003 都不命中
    const result = useRelatedEntities(
      attackTools,
      ["directCauseRisks", "indirectSupportRisks"],
      targetKey,
    );
    expect(result.value).toEqual(["AT0001", "AT0002"]);
  });

  it("targetKey 变化时响应式重算", () => {
    const targetKey = ref("R0001");
    const result = useRelatedEntities(terms, "relatedRisks", targetKey);
    expect(result.value).toEqual(["T0001"]);
    targetKey.value = "R0005";
    expect(result.value).toEqual(["T0001"]);
    targetKey.value = "R0099";
    expect(result.value).toEqual(["T0002"]);
    targetKey.value = "R0006";
    expect(result.value).toEqual([]);
  });

  it("空 targetKey 返回空数组", () => {
    const targetKey = ref("");
    const result = useRelatedEntities(terms, "relatedRisks", targetKey);
    expect(result.value).toEqual([]);
  });

  it("支持 getter / computed 传入", () => {
    const base = ref("R0001");
    const getterKey = () => base.value;
    const computedKey = computed(() => base.value);

    const fromGetter = useRelatedEntities(terms, "relatedRisks", getterKey);
    const fromComputed = useRelatedEntities(terms, "relatedRisks", computedKey);
    expect(fromGetter.value).toEqual(["T0001"]);
    expect(fromComputed.value).toEqual(["T0001"]);

    base.value = "R0099";
    expect(fromGetter.value).toEqual(["T0002"]);
    expect(fromComputed.value).toEqual(["T0002"]);
  });

  it("字段非数组或不存在时安全跳过", () => {
    const mixed = {
      E1: { tags: ["a"], name: "x" },
      E2: { tags: "not-an-array" },
      E3: { name: "no-tags-field" },
    };
    const result = useRelatedEntities(mixed, "tags", ref("a"));
    expect(result.value).toEqual(["E1"]);
  });
});
