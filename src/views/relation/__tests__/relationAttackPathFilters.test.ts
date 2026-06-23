import { computed, ref } from "vue";
import { describe, expect, it } from "vitest";
import {
  createRelationAttackPathFilters,
  pathMatchesAttackPathFilters,
} from "../relationAttackPathFilters";
import {
  RelationType,
  type AttackPath,
  type AttackPathDetail,
} from "../relationTypes";

describe("relationAttackPathFilters", () => {
  const paths = ref<AttackPath[]>([
    {
      threatActorKey: "TA0002",
      attackToolKey: "AT0002",
      riskKey: "R0002",
      avoidanceKey: "A0002",
    },
    {
      threatActorKey: "TA0001",
      attackToolKey: "AT0001",
      riskKey: "R0001",
      avoidanceKey: "A0001",
    },
    {
      threatActorKey: "TA0001",
      attackToolKey: "AT0001",
      riskKey: "R0002",
      avoidanceKey: "A0002",
    },
  ]);

  const buildAttackPathDetail = (path: AttackPath): AttackPathDetail => ({
    id: [
      path.threatActorKey,
      path.attackToolKey,
      path.riskKey,
      path.avoidanceKey,
    ]
      .filter(Boolean)
      .join("->"),
    label: path.riskKey,
    nodes: [],
    segments: [],
  });

  const createFilters = () =>
    createRelationAttackPathFilters({
      allAttackPaths: computed(() => paths.value),
      buildAttackPathDetail,
      getNodeTitle: (type, key) => `${type}:${key}`,
      selectedAttackPathId: ref(""),
    });

  it("按攻击路径字段匹配筛选条件，并支持忽略当前维度", () => {
    const path = paths.value[1];
    const filters = {
      [RelationType.threatActor]: "TA0001",
      [RelationType.attackTool]: "AT0002",
    };

    expect(pathMatchesAttackPathFilters(path, filters)).toBe(false);
    expect(
      pathMatchesAttackPathFilters(path, filters, RelationType.attackTool)
    ).toBe(true);
  });

  it("生成按 key 排序的选项，并在计数时排除当前维度筛选", () => {
    const filters = createFilters();

    filters.attackPathFilters.value = {
      [RelationType.threatActor]: "TA0001",
    };

    expect(filters.filteredAttackPaths.value).toHaveLength(2);
    expect(filters.attackPathFilterOptions.value[RelationType.risk]).toEqual([
      { key: "R0001", label: "risk:R0001", count: 1 },
      { key: "R0002", label: "risk:R0002", count: 1 },
    ]);
    expect(
      filters.attackPathFilterOptions.value[RelationType.threatActor]
    ).toEqual([
      { key: "TA0001", label: "threat-actor:TA0001", count: 2 },
      { key: "TA0002", label: "threat-actor:TA0002", count: 1 },
    ]);
  });

  it("清理失效筛选条件和不可见的选中路径", () => {
    const selectedAttackPathId = ref("TA0002->AT0002->R0002->A0002");
    const filters = createRelationAttackPathFilters({
      allAttackPaths: computed(() => paths.value),
      buildAttackPathDetail,
      getNodeTitle: (type, key) => `${type}:${key}`,
      selectedAttackPathId,
    });

    filters.attackPathFilters.value = {
      [RelationType.threatActor]: "TA0001",
      [RelationType.risk]: "R9999",
    };

    filters.normalizeAttackPathFilters();

    expect(filters.attackPathFilters.value).toEqual({
      [RelationType.threatActor]: "TA0001",
    });
    expect(selectedAttackPathId.value).toBe("");
  });
});
