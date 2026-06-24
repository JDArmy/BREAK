import { computed, ref } from "vue";
import { afterEach, describe, expect, it } from "vitest";
import BREAK from "@/BREAK";
import { createRelationCoverageAnalysis } from "../relationCoverageAnalysis";
import { RelationType, type Node, type RelationEntityType } from "../relationTypes";

describe("relationCoverageAnalysis", () => {
  type BreakTestEntity = Record<string, unknown>;
  type BreakTestCollection = Record<string, BreakTestEntity>;

  const riskStore = BREAK.risks as unknown as BreakTestCollection;
  const avoidanceStore = BREAK.avoidances as unknown as BreakTestCollection;
  const attackToolStore = BREAK.attackTools as unknown as BreakTestCollection;
  const threatActorStore =
    BREAK.threatActors as unknown as BreakTestCollection;

  const cleanupKeys = {
    risks: [] as string[],
    avoidances: [] as string[],
    attackTools: [] as string[],
    threatActors: [] as string[],
  };
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

  const analysisFor = ({
    relType = RelationType.risk,
    relKey = "R0005-001",
    selectedNode = null,
  }: {
    relType?: RelationType;
    relKey?: string;
    selectedNode?: Node | null;
  }) =>
    createRelationCoverageAnalysis({
      t,
      relType: ref(relType),
      relKey: ref(relKey),
      selectedNetworkNode: computed(() => selectedNode),
      getNodeTitle,
    });

  const addRisk = (id: string, avoidances: string[] = []) => {
    cleanupKeys.risks.push(id);
    riskStore[id] = {
      title: id,
      keywords: [],
      definition: `${id} definition`,
      description: `${id} description`,
      complexity: "中级",
      influence: `${id} influence`,
      avoidances,
      references: [],
    };
  };

  const addAvoidance = (id: string, effectiveness?: "high" | "medium" | "low") => {
    cleanupKeys.avoidances.push(id);
    avoidanceStore[id] = {
      title: id,
      category: "AC01",
      keywords: [],
      definition: `${id} definition`,
      description: `${id} description`,
      limitation: "",
      references: [],
      ...(effectiveness ? { effectiveness } : {}),
    };
  };

  const addAttackTool = (
    id: string,
    options: {
      directCauseRisks?: string[];
      indirectSupportRisks?: string[];
      avoidances?: string[];
    } = {},
  ) => {
    cleanupKeys.attackTools.push(id);
    attackToolStore[id] = {
      title: id,
      keywords: [],
      description: `${id} description`,
      directCauseRisks: options.directCauseRisks ?? [],
      indirectSupportRisks: options.indirectSupportRisks ?? [],
      avoidances: options.avoidances ?? [],
      references: [],
    };
  };

  const addThreatActor = (
    id: string,
    options: {
      buildAttackTools?: string[];
      useAttackTools?: string[];
      directCauseRisks?: string[];
      indirectSupportRisks?: string[];
    } = {},
  ) => {
    cleanupKeys.threatActors.push(id);
    threatActorStore[id] = {
      title: id,
      keywords: [],
      description: `${id} description`,
      buildAttackTools: options.buildAttackTools ?? [],
      useAttackTools: options.useAttackTools ?? [],
      directCauseRisks: options.directCauseRisks ?? [],
      indirectSupportRisks: options.indirectSupportRisks ?? [],
      references: [],
    };
  };

  afterEach(() => {
    cleanupKeys.risks.splice(0).forEach((id) => {
      delete riskStore[id];
    });
    cleanupKeys.avoidances.splice(0).forEach((id) => {
      delete avoidanceStore[id];
    });
    cleanupKeys.attackTools.splice(0).forEach((id) => {
      delete attackToolStore[id];
    });
    cleanupKeys.threatActors.splice(0).forEach((id) => {
      delete threatActorStore[id];
    });
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
        summary: expect.stringContaining(
          "relationView.nodeCoverageSummary.risk",
        ),
        metrics: expect.arrayContaining([
          expect.objectContaining({
            label: "relationView.nodeCoverageMetricDirect",
          }),
        ]),
        items: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            type: RelationType.avoidance,
            sourceFields: expect.arrayContaining(["Risk.avoidances"]),
          }),
        ]),
      }),
    );
  });

  it("summarizes attack-tool coverage by associated risks and avoidances", () => {
    const analysis = createRelationCoverageAnalysis({
      t,
      relType: ref(RelationType.attackTool),
      relKey: ref("AT0001"),
      selectedNetworkNode: computed(() =>
        node("AT0001", RelationType.attackTool),
      ),
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
      }),
    );
  });

  it("tracks the selected drawer node instead of the relation root", () => {
    const analysis = createRelationCoverageAnalysis({
      t,
      relType: ref(RelationType.risk),
      relKey: ref("R0005-001"),
      selectedNetworkNode: computed(() =>
        node("AT0001", RelationType.attackTool),
      ),
      getNodeTitle,
    });

    expect(analysis.selectedNodeCoverageSummary.value).toEqual(
      expect.objectContaining({
        title: expect.stringContaining("attack-tool:AT0001"),
        summary: expect.stringContaining(
          "relationView.nodeCoverageSummary.attackTool",
        ),
      }),
    );
  });

  it("summarizes threat-actor coverage by tools and risks", () => {
    const analysis = createRelationCoverageAnalysis({
      t,
      relType: ref(RelationType.threatActor),
      relKey: ref("TA0017"),
      selectedNetworkNode: computed(() =>
        node("TA0017", RelationType.threatActor),
      ),
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
      }),
    );
  });

  it("returns empty summaries when no supported node is selected", () => {
    expect(
      analysisFor({ selectedNode: null }).selectedNodeCoverageSummary.value,
    ).toBeNull();
    expect(
      analysisFor({
        selectedNode: node("T0001", RelationType.term),
      }).selectedNodeCoverageSummary.value,
    ).toBeNull();
    expect(
      analysisFor({
        selectedNode: node("R9999-TEST", RelationType.risk),
      }).selectedNodeCoverageSummary.value,
    ).toBeNull();
  });

  it("marks an orphan avoidance as a warning and exposes review guidance", () => {
    addAvoidance("A9999-ORPHAN");

    const analysis = analysisFor({
      relType: RelationType.avoidance,
      relKey: "A9999-ORPHAN",
      selectedNode: node("A9999-ORPHAN", RelationType.avoidance),
    });

    expect(analysis.selectedNodeCoverageSummary.value).toEqual(
      expect.objectContaining({
        severity: "warning",
        notice: "relationView.nodeCoverageNotice.avoidance",
        items: [],
      }),
    );
    expect(analysis.selectedNodeSpecialInsightSummary.value).toEqual(
      expect.objectContaining({
        severity: "warning",
        recommendation:
          "relationView.specialInsight.avoidance.recommendReview",
        sections: expect.arrayContaining([
          expect.objectContaining({
            notice: "relationView.specialInsight.avoidance.noOverlapNotice",
          }),
        ]),
      }),
    );
  });

  it("sorts avoidance coverage by effectiveness before id", () => {
    addAvoidance("A9999-LOW", "low");
    addAvoidance("A9999-HIGH", "high");
    addRisk("R9999-SORT", ["A9999-LOW", "A9999-HIGH"]);

    const analysis = analysisFor({
      selectedNode: node("R9999-SORT", RelationType.risk),
    });

    expect(
      analysis.selectedNodeCoverageSummary.value?.items.map((item) => item.id),
    ).toEqual(["A9999-HIGH", "A9999-LOW"]);
    expect(analysis.selectedNodeCoverageSummary.value?.items[0].meta).toContain(
      "relationView.avoidanceEffectiveness.high",
    );
  });

  it("reports attack-tool coverage gaps in special insight", () => {
    addRisk("R9999-GAP");
    addAvoidance("A9999-CONTROL");
    addAttackTool("AT9999-GAP", {
      directCauseRisks: ["R9999-GAP"],
      avoidances: ["A9999-CONTROL"],
    });

    const analysis = analysisFor({
      relType: RelationType.attackTool,
      relKey: "AT9999-GAP",
      selectedNode: node("AT9999-GAP", RelationType.attackTool),
    });

    expect(analysis.selectedNodeSpecialInsightSummary.value).toEqual(
      expect.objectContaining({
        severity: "warning",
        recommendation: "relationView.specialInsight.attackTool.recommendGap",
        sections: expect.arrayContaining([
          expect.objectContaining({
            notice: "relationView.specialInsight.attackTool.gapNotice",
            items: expect.arrayContaining([
              expect.objectContaining({
                id: "R9999-GAP",
                sourceFields: ["Risk.avoidances"],
              }),
            ]),
          }),
        ]),
      }),
    );
  });

  it("combines threat-actor tools, risks and defense priorities", () => {
    addRisk("R9999-ACTOR-GAP");
    addRisk("R9999-ACTOR-COVERED", ["A9999-ACTOR-CONTROL"]);
    addAvoidance("A9999-ACTOR-CONTROL");
    addAttackTool("AT9999-ACTOR", {
      indirectSupportRisks: ["R9999-ACTOR-COVERED"],
      avoidances: ["A9999-ACTOR-CONTROL"],
    });
    addThreatActor("TA9999-ACTOR", {
      buildAttackTools: ["AT9999-ACTOR"],
      useAttackTools: ["AT9999-ACTOR"],
      directCauseRisks: ["R9999-ACTOR-GAP"],
    });

    const analysis = analysisFor({
      relType: RelationType.threatActor,
      relKey: "TA9999-ACTOR",
      selectedNode: node("TA9999-ACTOR", RelationType.threatActor),
    });

    expect(analysis.selectedNodeSpecialInsightSummary.value).toEqual(
      expect.objectContaining({
        severity: "warning",
        summary: expect.stringContaining('"tools":1'),
        recommendation: "relationView.specialInsight.threatActor.recommendGap",
        sections: expect.arrayContaining([
          expect.objectContaining({
            notice: "relationView.specialInsight.threatActor.gapNotice",
            items: expect.arrayContaining([
              expect.objectContaining({
                id: "A9999-ACTOR-CONTROL",
                type: RelationType.avoidance,
              }),
              expect.objectContaining({
                id: "R9999-ACTOR-GAP",
                type: RelationType.risk,
              }),
            ]),
          }),
        ]),
      }),
    );
  });
});
