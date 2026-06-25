import { computed, ref } from "vue";
import { describe, expect, it } from "vitest";
import { createRelationBusinessSceneImpact } from "../relationBusinessSceneImpact";
import { RelationType, type Node, type RelationEntityType } from "../relationTypes";

describe("relationBusinessSceneImpact", () => {
  const t = (key: string, params?: Record<string, unknown>) =>
    params ? `${key}:${JSON.stringify(params)}` : key;
  const getNodeTitle = (type: RelationEntityType, key: string) =>
    `${type}:${key}`;

  const node = (id: string, type: RelationType): Node => ({
    id,
    type,
    text: id,
    color: "",
  });

  it("returns null when no network node is selected", () => {
    const analysis = createRelationBusinessSceneImpact({
      t,
      selectedNetworkNode: computed(() => null),
      getNodeTitle,
    });

    expect(analysis.selectedNodeBusinessSceneImpactSummary.value).toBeNull();
  });

  it("maps a risk to business scenes and risk scenes from business-scene definitions", () => {
    const analysis = createRelationBusinessSceneImpact({
      t,
      selectedNetworkNode: computed(() => node("R0005-001", RelationType.risk)),
      getNodeTitle,
    });

    expect(analysis.selectedNodeBusinessSceneImpactSummary.value).toEqual(
      expect.objectContaining({
        title: expect.stringContaining("risk:R0005-001"),
        summary: expect.stringContaining(
          "relationView.businessSceneImpactSummary",
        ),
        items: expect.arrayContaining([
          expect.objectContaining({
            id: "BS00",
            riskScenes: expect.arrayContaining([
              expect.objectContaining({
                id: "RS01",
                risks: expect.arrayContaining([
                  expect.objectContaining({
                    id: "R0005-001",
                    sourceFields: ["selected node"],
                  }),
                ]),
              }),
            ]),
          }),
        ]),
      }),
    );
  });

  it("maps an attack tool to business scenes through caused risks", () => {
    const analysis = createRelationBusinessSceneImpact({
      t,
      selectedNetworkNode: computed(() =>
        node("AT0001", RelationType.attackTool),
      ),
      getNodeTitle,
    });

    expect(analysis.selectedNodeBusinessSceneImpactSummary.value).toEqual(
      expect.objectContaining({
        metrics: expect.arrayContaining([
          expect.objectContaining({
            label: "relationView.businessSceneImpactMetricRisk",
            value: expect.any(Number),
          }),
        ]),
        risks: expect.arrayContaining([
          expect.objectContaining({
            id: "R0005-001",
            sourceFields: expect.arrayContaining([
              "AttackTool.directCauseRisks",
            ]),
          }),
        ]),
      }),
    );
  });

  it("merges direct and indirect risk sources for attack tools", () => {
    const analysis = createRelationBusinessSceneImpact({
      t,
      selectedNetworkNode: computed(() =>
        node("AT0029", RelationType.attackTool),
      ),
      getNodeTitle,
    });

    expect(analysis.selectedNodeBusinessSceneImpactSummary.value?.risks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "R0005-001",
          sourceFields: expect.arrayContaining([
            "AttackTool.indirectSupportRisks",
          ]),
        }),
      ]),
    );
  });

  it("maps a threat actor through direct and indirect supported risks", () => {
    const analysis = createRelationBusinessSceneImpact({
      t,
      selectedNetworkNode: computed(() =>
        node("TA0017", RelationType.threatActor),
      ),
      getNodeTitle,
    });

    const risks = analysis.selectedNodeBusinessSceneImpactSummary.value?.risks;
    expect(risks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "R0005-001",
          sourceFields: expect.arrayContaining([
            "ThreatActor.directCauseRisks",
          ]),
        }),
        expect.objectContaining({
          id: "R0001",
          sourceFields: expect.arrayContaining([
            "ThreatActor.indirectSupportRisks",
          ]),
        }),
      ]),
    );
  });

  it("maps a term through related risks", () => {
    const analysis = createRelationBusinessSceneImpact({
      t,
      selectedNetworkNode: computed(() => node("T0131", RelationType.term)),
      getNodeTitle,
    });

    expect(analysis.selectedNodeBusinessSceneImpactSummary.value?.risks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "R0060",
          sourceFields: ["Term.relatedRisks"],
        }),
        expect.objectContaining({
          id: "R0095",
          sourceFields: ["Term.relatedRisks"],
        }),
      ]),
    );
  });

  it("maps an avoidance to business scenes through covered risks", () => {
    const analysis = createRelationBusinessSceneImpact({
      t,
      selectedNetworkNode: computed(() =>
        node("A0001", RelationType.avoidance),
      ),
      getNodeTitle,
    });

    expect(
      analysis.selectedNodeBusinessSceneImpactSummary.value?.items.length,
    ).toBeGreaterThan(0);
    expect(
      analysis.selectedNodeBusinessSceneImpactSummary.value?.risks,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceFields: ["Risk.avoidances"],
        }),
      ]),
    );
  });

  it("tracks the selected drawer node instead of the root relation key", () => {
    const selectedNode = ref<Node>(node("AT0001", RelationType.attackTool));
    const analysis = createRelationBusinessSceneImpact({
      t,
      selectedNetworkNode: computed(() => selectedNode.value),
      getNodeTitle,
    });

    expect(
      analysis.selectedNodeBusinessSceneImpactSummary.value?.risks,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "R0005-001",
          sourceFields: expect.arrayContaining(["AttackTool.directCauseRisks"]),
        }),
      ]),
    );

    selectedNode.value = node("R0005-001", RelationType.risk);

    expect(
      analysis.selectedNodeBusinessSceneImpactSummary.value?.risks,
    ).toEqual([
      expect.objectContaining({
        id: "R0005-001",
        sourceFields: ["selected node"],
      }),
    ]);
  });

  it("returns an empty impact summary for unknown entities", () => {
    const analysis = createRelationBusinessSceneImpact({
      t,
      selectedNetworkNode: computed(() =>
        node("AT9999", RelationType.attackTool),
      ),
      getNodeTitle,
    });

    expect(analysis.selectedNodeBusinessSceneImpactSummary.value).toEqual(
      expect.objectContaining({
        summary: "relationView.businessSceneImpactSummaryEmpty",
        metrics: [
          {
            label: "relationView.businessSceneImpactMetricBusinessScene",
            value: 0,
          },
          {
            label: "relationView.businessSceneImpactMetricRiskScene",
            value: 0,
          },
          {
            label: "relationView.businessSceneImpactMetricRisk",
            value: 0,
          },
        ],
        items: [],
        risks: [],
        notice: "relationView.businessSceneImpactNoticeEmpty",
      }),
    );
  });
});
