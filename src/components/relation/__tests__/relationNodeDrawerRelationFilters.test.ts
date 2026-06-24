import { describe, expect, it } from "vitest";
import {
  buildRelationFilterOptions,
  createEmptyRelationFilters,
  filterRelations,
  relationMatchesFilters,
  sanitizeRelationFilters,
  uniqueSortedRelationFilterValues,
  type RelationSummary,
} from "@/components/relation/relationNodeDrawerRelationFilters";
import { RelationType } from "@/views/relation/relationTypes";

const relation = (
  overrides: Partial<RelationSummary> = {},
): RelationSummary => ({
  relationKey: "R0001->A0001",
  relationLineKey: "relationLine.avoidanceMeans",
  direction: "流出",
  directionKey: "outgoing",
  text: "规避",
  directness: "直接",
  directnessKey: "direct",
  otherNodeId: "A0001",
  otherNodeType: RelationType.avoidance,
  otherNodeTitle: "验证码",
  sourceFields: ["Risk.avoidances"],
  evidenceLabel: "Risk.avoidances",
  explanation: "风险通过规避手段缓解。",
  impactHint: "影响提示",
  qualityFlags: [],
  ...overrides,
});

const relations = [
  relation(),
  relation({
    relationKey: "AT0001->R0001",
    relationLineKey: "relationLine.directCauseRisk",
    direction: "流入",
    directionKey: "incoming",
    directness: "间接",
    directnessKey: "indirect",
    otherNodeId: "AT0001",
    otherNodeType: RelationType.attackTool,
  }),
  relation({
    relationKey: "TA0001->AT0001",
    relationLineKey: "relationLine.useAttackTool",
    direction: "流入",
    directionKey: "incoming",
    directness: "直接",
    directnessKey: "direct",
    otherNodeId: "TA0001",
    otherNodeType: RelationType.threatActor,
  }),
];

describe("relationNodeDrawerRelationFilters", () => {
  it("按方向、关系类型和直接性过滤关系", () => {
    const filters = {
      direction: "incoming",
      relationType: "relationLine.useAttackTool",
      directness: "direct",
    };

    expect(filterRelations(relations, filters).map((item) => item.relationKey)).toEqual([
      "TA0001->AT0001",
    ]);
    expect(relationMatchesFilters(relations[0], filters)).toBe(false);
    expect(relationMatchesFilters(relations[0], filters, "direction")).toBe(false);
    expect(
      relationMatchesFilters(relations[0], {
        direction: "outgoing",
        relationType: "relationLine.avoidanceMeans",
        directness: "direct",
      }),
    ).toBe(true);
  });

  it("构建级联筛选选项时忽略当前维度并保留其他维度约束", () => {
    const options = buildRelationFilterOptions(relations, {
      direction: "incoming",
      relationType: "",
      directness: "direct",
    });

    expect(options.directions).toEqual(["incoming", "outgoing"]);
    expect(options.relationTypes).toEqual(["relationLine.useAttackTool"]);
    expect(options.directness).toEqual(["direct", "indirect"]);
  });

  it("筛选选项去空、去重并按自然顺序排序", () => {
    expect(
      uniqueSortedRelationFilterValues(["type10", "", "type2", "type2", "type1"]),
    ).toEqual(["type1", "type2", "type10"]);
  });

  it("清理已经不在候选项中的筛选值", () => {
    const filters = {
      direction: "incoming",
      relationType: "missing",
      directness: "direct",
    };
    const options = buildRelationFilterOptions(relations, filters);

    expect(sanitizeRelationFilters(filters, options)).toEqual({
      direction: "",
      relationType: "",
      directness: "",
    });
    expect(createEmptyRelationFilters()).toEqual({
      direction: "",
      relationType: "",
      directness: "",
    });
  });
});
