import { computed, ref } from "vue";
import { describe, expect, it } from "vitest";
import { createRelationAttackPathCoverage } from "../relationAttackPathCoverage";
import { RelationType, type AttackPath } from "../relationTypes";

describe("relationAttackPathCoverage", () => {
  const t = (key: string) => key;
  const getNodeTitle = (
    type: Exclude<RelationType, RelationType.all>,
    key: string
  ) => `${type}:${key}`;

  it("按风险直接规避、工具规避和重叠来源汇总防御覆盖", () => {
    const paths = ref<AttackPath[]>([
      {
        attackToolKey: "AT0002",
        riskKey: "R0001",
        avoidanceKey: "A0010-001",
      },
      {
        attackToolKey: "AT0034-001",
        riskKey: "R0001",
        avoidanceKey: "A0016-001",
      },
      {
        attackToolKey: "AT0099",
        riskKey: "R0001",
        avoidanceKey: "A9999",
      },
    ]);
    const { riskAvoidanceCoverage } = createRelationAttackPathCoverage({
      allAttackPaths: computed(() => paths.value),
      getNodeTitle,
      relKey: ref("R0001"),
      relType: ref(RelationType.risk),
      t,
    });

    expect(riskAvoidanceCoverage.value).toEqual(
      expect.objectContaining({
        directCount: expect.any(Number),
        attackToolCount: 1,
        overlapCount: expect.any(Number),
      })
    );
    expect(riskAvoidanceCoverage.value?.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          avoidanceKey: "A0010-001",
          source: "both",
          sourceLabel: "relationView.coverageSourceBoth",
          attackToolLabels: ["attack-tool:AT0002 (AT0002)"],
          sourceFields: ["Risk.avoidances", "AttackTool.avoidances"],
        }),
        expect.objectContaining({
          avoidanceKey: "A9999",
          source: "attackTool",
          sourceLabel: "relationView.coverageSourceAttackTool",
          attackToolLabels: ["attack-tool:AT0099 (AT0099)"],
          sourceFields: ["AttackTool.avoidances"],
        }),
      ])
    );
  });

  it("非风险上下文不生成防御覆盖汇总", () => {
    const { riskAvoidanceCoverage } = createRelationAttackPathCoverage({
      allAttackPaths: computed(() => []),
      getNodeTitle,
      relKey: ref("AT0001"),
      relType: ref(RelationType.attackTool),
      t,
    });

    expect(riskAvoidanceCoverage.value).toBeNull();
  });
});
