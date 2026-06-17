import { computed, ref } from "vue";
import { describe, expect, it } from "vitest";
import { createRelationAttackPathData } from "../relationAttackPath";
import { createRelationTypeMapping, RelationType, type AttackPathFilters, type Node } from "../relationTypes";

describe("relationAttackPath", () => {
  const t = (key: string) => key;
  const relationTypeMapping = createRelationTypeMapping(t, (type) => `color:${type}`);
  const getSankeyNodeName = (type: Exclude<RelationType, RelationType.all>, key: string) => `${type}:${key}`;

  const createAttackPathData = (options: {
    relType: RelationType;
    relKey: string;
    selectedNode?: Node | null;
    isMobile?: boolean;
    filters?: AttackPathFilters;
    selectedAttackPathId?: string;
  }) => {
    const selectedNode = ref<Node | null>(options.selectedNode ?? null);
    return createRelationAttackPathData({
      t,
      isMobile: ref(options.isMobile ?? false),
      relType: ref(options.relType),
      relKey: ref(options.relKey),
      attackPathFilters: ref(options.filters ?? {}),
      selectedAttackPathId: ref(options.selectedAttackPathId ?? ""),
      selectedNetworkNode: computed(() => selectedNode.value),
      RelationTypeMapping: relationTypeMapping,
      getSankeyNodeName,
      getNodeTitle: (type, key) => `${type}:${key}:title`,
    });
  };

  it("builds Sankey attack paths from threat actors through tools and risks to avoidances", () => {
    const attackPath = createAttackPathData({
      relType: RelationType.attackTool,
      relKey: "AT0001",
    });

    const nodeKeys = new Set(attackPath.sankeyData.value.nodes.map((node) => `${node.entityType}:${node.entityKey}`));
    expect(nodeKeys).toContain("threat-actor:TA0017");
    expect(nodeKeys).toContain("attack-tool:AT0001");
    expect(nodeKeys).toContain("risk:R0005-001");
    expect(nodeKeys).toContain("avoidance:A0001");

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
          name: "avoidance:A0001",
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
          target: "avoidance:A0001",
          value: expect.any(Number),
        }),
      ])
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

    expect(attackPath.selectedNodeAttackPathSummary.value).toEqual(["relationView.pathRoleRisk"]);
    expect(attackPath.selectedNodeAttackPathDescription.value).toBe("relationView.pathRoleRiskDesc");
  });

  it("filters Sankey paths by entity type and exposes path filter options", () => {
    const unfiltered = createAttackPathData({
      relType: RelationType.attackTool,
      relKey: "AT0001",
    });
    const filtered = createAttackPathData({
      relType: RelationType.attackTool,
      relKey: "AT0001",
      filters: {
        [RelationType.risk]: "R0005-001",
        [RelationType.avoidance]: "A0001",
      },
    });

    expect(unfiltered.filteredAttackPaths.value.length).toBeGreaterThan(filtered.filteredAttackPaths.value.length);
    expect(filtered.filteredAttackPaths.value.every((path) => path.riskKey === "R0005-001")).toBe(true);
    expect(filtered.filteredAttackPaths.value.every((path) => path.avoidanceKey === "A0001")).toBe(true);
    expect(filtered.sankeyData.value.nodes.map((node) => `${node.entityType}:${node.entityKey}`)).toEqual(
      expect.arrayContaining(["risk:R0005-001", "avoidance:A0001"])
    );
    expect(filtered.attackPathFilterOptions.value[RelationType.risk]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "R0005-001",
          label: "R0005-001 risk:R0005-001:title",
          count: expect.any(Number),
        }),
      ])
    );
    expect(filtered.hasActiveAttackPathFilters.value).toBe(true);
  });

  it("explains each selected attack path segment with source fields and reasons", () => {
    const attackPath = createAttackPathData({
      relType: RelationType.attackTool,
      relKey: "AT0001",
      filters: {
        [RelationType.threatActor]: "TA0017",
        [RelationType.risk]: "R0005-001",
        [RelationType.avoidance]: "A0001",
      },
    });

    const detail = attackPath.selectedAttackPathDetail.value;
    expect(detail?.label).toBe("TA0017 -> AT0001 -> R0005-001 -> A0001");
    expect(detail?.segments).toEqual([
      expect.objectContaining({
        sourceFields: ["ThreatActor.buildAttackTools"],
        relation: "relationLine.buildAttackTool",
        reason: "relationView.pathReasonBuildTool",
      }),
      expect.objectContaining({
        sourceFields: ["AttackTool.directCauseRisks"],
        relation: "relationLine.directCauseRisk",
        reason: "relationView.pathReasonDirectRisk",
      }),
      expect.objectContaining({
        sourceFields: ["Risk.avoidances"],
        relation: "relationLine.avoidanceMeans",
        reason: "relationView.pathReasonRiskAvoidance",
      }),
    ]);
  });

  it("selects a requested attack path detail and falls back when the id is unavailable", () => {
    const attackPath = createAttackPathData({
      relType: RelationType.attackTool,
      relKey: "AT0001",
      filters: {
        [RelationType.risk]: "R0005-001",
        [RelationType.avoidance]: "A0001",
      },
    });
    const requestedId = attackPath.attackPathDetails.value[1]?.id;
    const selected = createAttackPathData({
      relType: RelationType.attackTool,
      relKey: "AT0001",
      filters: {
        [RelationType.risk]: "R0005-001",
        [RelationType.avoidance]: "A0001",
      },
      selectedAttackPathId: requestedId,
    });
    const fallback = createAttackPathData({
      relType: RelationType.attackTool,
      relKey: "AT0001",
      selectedAttackPathId: "missing",
    });

    expect(selected.selectedAttackPathDetail.value?.id).toBe(requestedId);
    expect(fallback.selectedAttackPathDetail.value?.id).toBe(fallback.attackPathDetails.value[0]?.id);
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
