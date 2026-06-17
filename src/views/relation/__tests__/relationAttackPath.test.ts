import { computed, ref } from "vue";
import { describe, expect, it } from "vitest";
import { createRelationAttackPathData } from "../relationAttackPath";
import {
  createRelationTypeMapping,
  RelationType,
  type Node,
} from "../relationTypes";

describe("relationAttackPath", () => {
  const t = (key: string) => key;
  const relationTypeMapping = createRelationTypeMapping(
    t,
    (type) => `color:${type}`
  );
  const getSankeyNodeName = (
    type: Exclude<RelationType, RelationType.all>,
    key: string
  ) => `${type}:${key}`;

  const createAttackPathData = (options: {
    relType: RelationType;
    relKey: string;
    selectedNode?: Node | null;
    isMobile?: boolean;
  }) => {
    const selectedNode = ref<Node | null>(options.selectedNode ?? null);
    return createRelationAttackPathData({
      t,
      isMobile: ref(options.isMobile ?? false),
      relType: ref(options.relType),
      relKey: ref(options.relKey),
      selectedNetworkNode: computed(() => selectedNode.value),
      RelationTypeMapping: relationTypeMapping,
      getSankeyNodeName,
      getNodeTitle: (type, key) =>
        `BREAK.${relationTypeMapping[type].BreakKey}.${key}.title`,
    });
  };

  it("builds Sankey attack paths from threat actors through tools and risks to avoidances", () => {
    const attackPath = createAttackPathData({
      relType: RelationType.attackTool,
      relKey: "AT0001",
    });

    const nodeKeys = new Set(
      attackPath.sankeyData.value.nodes.map(
        (node) => `${node.entityType}:${node.entityKey}`
      )
    );
    expect(nodeKeys).toContain("threat-actor:TA0017");
    expect(nodeKeys).toContain("attack-tool:AT0001");
    expect(nodeKeys).toContain("risk:R0005-001");
    expect(nodeKeys).toContain("avoidance:A0016-003");

    expect(attackPath.sankeyData.value.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "threat-actor:TA0017",
          depth: 0,
          itemStyle: { color: "color:threat-actor" },
        }),
        expect.objectContaining({
          name: "attack-tool:AT0001",
          depth: 1,
          itemStyle: { color: "color:attack-tool" },
        }),
        expect.objectContaining({
          name: "risk:R0005-001",
          depth: 2,
          itemStyle: { color: "color:risk" },
        }),
        expect.objectContaining({
          name: "avoidance:A0016-003",
          depth: 3,
          itemStyle: { color: "color:avoidance" },
        }),
      ])
    );

    expect(attackPath.sankeyData.value.links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "threat-actor:TA0017",
          target: "attack-tool:AT0001",
          value: expect.any(Number),
        }),
        expect.objectContaining({
          source: "attack-tool:AT0001",
          target: "risk:R0005-001",
          value: expect.any(Number),
        }),
        expect.objectContaining({
          source: "risk:R0005-001",
          target: "avoidance:A0016-003",
          value: expect.any(Number),
        }),
      ])
    );
    expect(attackPath.attackPathDetails.value.length).toBeGreaterThan(0);
    expect(attackPath.filteredAttackPaths.value.length).toBeGreaterThan(0);
    expect(attackPath.attackPathFilterOptions.value[RelationType.risk]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "R0005-001",
          label: "BREAK.risks.R0005-001.title",
        }),
      ])
    );
    expect(attackPath.selectedAttackPathDetail.value).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        nodes: expect.arrayContaining([
          expect.objectContaining({ type: RelationType.attackTool, key: "AT0001" }),
        ]),
      })
    );
  });

  it("filters selected-node path roles and descriptions by the current relation context", () => {
    const attackPath = createAttackPathData({
      relType: RelationType.attackTool,
      relKey: "AT0001",
      selectedNode: {
        id: "R0005-001",
        type: RelationType.risk,
        text: "批量小号作弊",
        color: "",
      },
    });

    expect(attackPath.selectedNodeAttackPathSummary.value).toEqual([
      "relationView.pathRoleRisk",
    ]);
    expect(attackPath.selectedNodeAttackPathDescription.value).toBe(
      "relationView.pathRoleRiskDesc"
    );
    expect(attackPath.selectedNodeAttackPathExplanations.value[0]).toEqual(
      expect.objectContaining({
        riskId: "R0005-001",
        risk: expect.objectContaining({
          id: "R0005-001",
          title: "BREAK.risks.R0005-001.title",
        }),
        summary: "relationView.attackPathGroupedExplanationSummary",
        pathCount: expect.any(Number),
        threatActors: expect.arrayContaining([
          expect.objectContaining({
            id: "TA0017",
            title: "BREAK.threatActors.TA0017.title",
          }),
        ]),
        analysisFinding: "relationView.attackPathFinding.toolRisk",
        recommendedAction: "relationView.attackPathRecommendedAction.toolRisk",
        evidenceFields: expect.arrayContaining([
          "ThreatActor.useAttackTools",
          "AttackTool.directCauseRisks",
          "AttackTool.avoidances",
          "Risk.avoidances",
        ]),
        steps: expect.arrayContaining([
          expect.objectContaining({
            relationType: expect.stringMatching(
              /^relationLine\.(buildAttackTool|useAttackTool)$/
            ),
            sourceFields: expect.arrayContaining([
              "ThreatActor.useAttackTools",
            ]),
            attackIntent: "relationView.attackPathIntent.actorToTool",
            toTitle: "BREAK.attackTools.AT0001.title",
          }),
          expect.objectContaining({
            relationType: "relationLine.directCauseRisk",
            sourceFields: ["AttackTool.directCauseRisks"],
            attackIntent: "relationView.attackPathIntent.toolToRisk",
          }),
          expect.objectContaining({
            relationType: "relationLine.avoidanceMeans",
            sourceFields: expect.arrayContaining([
              "AttackTool.avoidances",
              "Risk.avoidances",
            ]),
            defensiveMeaning: "relationView.attackPathDefense.riskToAvoidance",
          }),
        ]),
      })
    );
  });

  it("groups repeated paths that only differ by threat actor", () => {
    const attackPath = createAttackPathData({
      relType: RelationType.risk,
      relKey: "R0001",
      selectedNode: {
        id: "R0001",
        type: RelationType.risk,
        text: "风险",
        color: "",
      },
    });

    const groupedPath =
      attackPath.selectedNodeAttackPathExplanations.value.find(
        (path) =>
          path.attackToolId === "AT0002" && path.avoidanceId === "A0010-001"
      );

    expect(
      attackPath.selectedNodeAttackPathExplanations.value.length
    ).toBeGreaterThan(3);
    expect(groupedPath).toEqual(
      expect.objectContaining({
        pathKey: "attack-tool:AT0002->risk:R0001->avoidance:A0010-001",
        riskId: "R0001",
        attackToolId: "AT0002",
        avoidanceId: "A0010-001",
      })
    );
    expect(groupedPath?.pathCount).toBeGreaterThan(1);
    expect(groupedPath?.threatActors.length).toBeGreaterThan(1);
    expect(groupedPath?.steps[0]).toEqual(
      expect.objectContaining({
        fromId: "relationView.groupedThreatActors",
        fromTitle: "relationView.groupedThreatActors",
        toId: "AT0002",
        toTitle: "BREAK.attackTools.AT0002.title",
        sourceFields: ["ThreatActor.useAttackTools"],
      })
    );
  });

  it("prioritizes attack-tool-specific avoidances over generic risk avoidances", () => {
    const attackPath = createAttackPathData({
      relType: RelationType.risk,
      relKey: "R0001",
      selectedNode: {
        id: "R0001",
        type: RelationType.risk,
        text: "流程自动化",
        color: "",
      },
    });

    const proxyPaths = attackPath.selectedNodeAttackPathExplanations.value
      .filter(
        (path) =>
          path.threatActors.some((actor) => actor.id === "TA0038") &&
          path.attackToolId === "AT0034-001" &&
          path.riskId === "R0001"
      )
      .map((path) => path.avoidanceId);

    expect(proxyPaths).toEqual([
      "A0016-001",
      "A0029-002",
      "A0038",
      "A0038-002",
    ]);
    expect(proxyPaths).not.toContain("A0001");

    const proxyIpIntelligencePath =
      attackPath.selectedNodeAttackPathExplanations.value.find(
        (path) =>
          path.attackToolId === "AT0034-001" &&
          path.riskId === "R0001" &&
          path.avoidanceId === "A0016-001"
      );

    expect(proxyIpIntelligencePath?.evidenceFields).toEqual(
      expect.arrayContaining(["AttackTool.avoidances", "Risk.avoidances"])
    );
  });

  it("returns no attack-path role for terms and expands mobile Sankey height for dense layers", () => {
    const attackPath = createAttackPathData({
      relType: RelationType.risk,
      relKey: "R0001",
      isMobile: true,
      selectedNode: {
        id: "T0001",
        type: RelationType.term,
        text: "术语",
        color: "",
      },
    });

    expect(attackPath.selectedNodeAttackPathSummary.value).toEqual([]);
    expect(attackPath.selectedNodeAttackPathDescription.value).toBe("");
    expect(attackPath.sankeyChartHeight.value).toBeGreaterThanOrEqual(620);
  });
});
