import { computed, ref } from "vue";
import { describe, expect, it } from "vitest";
import { createRelationCoverageAnalysis } from "../relationCoverageAnalysis";
import { RelationType, type Node } from "../relationTypes";

describe("relationCoverageAnalysis", () => {
  const t = (key: string, params?: Record<string, unknown>) =>
    params ? `${key}:${JSON.stringify(params)}` : key;
  const getNodeTitle = (type: Exclude<RelationType, RelationType.all>, key: string) =>
    `${type}:${key}`;

  const node = (id: string, type: RelationType): Node => ({
    id,
    type,
    text: id,
    color: "",
  });

  it("summarizes risk avoidance coverage from the risk and related tools", () => {
    const analysis = createRelationCoverageAnalysis({
      t,
      relType: ref(RelationType.risk),
      relKey: ref("R0005-001"),
      selectedNetworkNode: computed(() => node("R0005-001", RelationType.risk)),
      getNodeTitle,
    });

    expect(analysis.selectedNodeCoverageSummary.value).toEqual(
      expect.objectContaining({
        title: expect.stringContaining("risk:R0005-001"),
        summary: expect.stringContaining("relationView.nodeCoverageSummary.risk"),
        metrics: expect.arrayContaining([
          expect.objectContaining({ label: "relationView.nodeCoverageMetricDirect" }),
        ]),
        items: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            type: RelationType.avoidance,
            sourceFields: expect.arrayContaining([
              "Risk.avoidances",
            ]),
          }),
        ]),
      })
    );
  });

  it("summarizes attack-tool coverage by associated risks and avoidances", () => {
    const analysis = createRelationCoverageAnalysis({
      t,
      relType: ref(RelationType.attackTool),
      relKey: ref("AT0001"),
      selectedNetworkNode: computed(() => node("AT0001", RelationType.attackTool)),
      getNodeTitle,
    });

    expect(analysis.selectedNodeCoverageSummary.value).toEqual(
      expect.objectContaining({
        title: expect.stringContaining("attack-tool:AT0001"),
        items: expect.arrayContaining([
          expect.objectContaining({
            type: RelationType.risk,
          }),
          expect.objectContaining({
            type: RelationType.avoidance,
          }),
        ]),
      })
    );
  });

  it("summarizes threat-actor coverage by tools and risks", () => {
    const analysis = createRelationCoverageAnalysis({
      t,
      relType: ref(RelationType.threatActor),
      relKey: ref("TA0017"),
      selectedNetworkNode: computed(() => node("TA0017", RelationType.threatActor)),
      getNodeTitle,
    });

    expect(analysis.selectedNodeCoverageSummary.value).toEqual(
      expect.objectContaining({
        title: expect.stringContaining("threat-actor:TA0017"),
        items: expect.arrayContaining([
          expect.objectContaining({
            type: RelationType.attackTool,
          }),
          expect.objectContaining({
            type: RelationType.risk,
          }),
        ]),
      })
    );
  });
});
