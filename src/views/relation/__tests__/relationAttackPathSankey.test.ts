import { computed, ref } from "vue";
import { describe, expect, it } from "vitest";
import { createRelationAttackPathSankey } from "../relationAttackPathSankey";
import { createRelationTypeMapping, RelationType } from "../relationTypes";

describe("relationAttackPathSankey", () => {
  const relationTypeMapping = createRelationTypeMapping(
    (key) => key,
    (type) => `color:${type}`
  );

  it("聚合攻击路径节点和重复链接，并按端类型生成层级", () => {
    const sankey = createRelationAttackPathSankey({
      allAttackPaths: computed(() => [
        {
          threatActorKey: "TA0001",
          attackToolKey: "AT0001",
          riskKey: "R0001",
          avoidanceKey: "A0001",
        },
        {
          threatActorKey: "TA0001",
          attackToolKey: "AT0001",
          riskKey: "R0001",
          avoidanceKey: "A0001",
        },
        {
          attackToolKey: "AT0002",
          riskKey: "R0001",
        },
      ]),
      getSankeyNodeName: (type, key) => `${type}:${key}`,
      isMobile: ref(false),
      RelationTypeMapping: relationTypeMapping,
    });

    expect(sankey.sankeyData.value.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "threat-actor:TA0001",
          depth: 0,
          entityType: RelationType.threatActor,
          itemStyle: { color: "color:threat-actor" },
        }),
        expect.objectContaining({
          name: "attack-tool:AT0001",
          depth: 1,
          entityType: RelationType.attackTool,
        }),
        expect.objectContaining({
          name: "risk:R0001",
          depth: 2,
          entityType: RelationType.risk,
        }),
        expect.objectContaining({
          name: "avoidance:A0001",
          depth: 3,
          entityType: RelationType.avoidance,
        }),
      ])
    );
    expect(sankey.sankeyData.value.links).toEqual(
      expect.arrayContaining([
        {
          source: "threat-actor:TA0001",
          target: "attack-tool:AT0001",
          value: 2,
        },
        { source: "attack-tool:AT0001", target: "risk:R0001", value: 2 },
        { source: "risk:R0001", target: "avoidance:A0001", value: 2 },
        { source: "attack-tool:AT0002", target: "risk:R0001", value: 1 },
      ])
    );
  });

  it("根据最密集层级和移动端状态计算图表高度", () => {
    const isMobile = ref(false);
    const sankey = createRelationAttackPathSankey({
      allAttackPaths: computed(() =>
        Array.from({ length: 20 }, (_, index) => ({
          riskKey: `R${String(index + 1).padStart(4, "0")}`,
        })),
      ),
      getSankeyNodeName: (type, key) => `${type}:${key}`,
      isMobile,
      RelationTypeMapping: relationTypeMapping,
    });

    expect(sankey.sankeyChartHeight.value).toBe(576);

    isMobile.value = true;

    expect(sankey.sankeyChartHeight.value).toBe(820);
  });
});
