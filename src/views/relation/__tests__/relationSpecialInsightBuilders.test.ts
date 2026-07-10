import { afterEach, describe, expect, it } from "vitest";
import BREAK from "@/BREAK";
import { createRelationSpecialInsightBuilders } from "../relationSpecialInsightBuilders";
import { RelationType, type RelationEntityType } from "../relationTypes";

describe("relationSpecialInsightBuilders", () => {
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
  const builders = () => createRelationSpecialInsightBuilders({ t, getNodeTitle });

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

  const addAvoidance = (id: string) => {
    cleanupKeys.avoidances.push(id);
    avoidanceStore[id] = {
      title: id,
      category: "prevention",
      keywords: [],
      definition: `${id} definition`,
      description: `${id} description`,
      references: [],
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

  it("不存在的实体返回空专项洞察", () => {
    const {
      buildAttackToolSpecialInsight,
      buildAvoidanceSpecialInsight,
      buildThreatActorSpecialInsight,
    } = builders();

    expect(buildAvoidanceSpecialInsight("A9999-MISSING")).toBeNull();
    expect(buildAttackToolSpecialInsight("AT9999-MISSING")).toBeNull();
    expect(buildThreatActorSpecialInsight("TA9999-MISSING")).toBeNull();
  });

  it("规避手段无风险和工具覆盖时给出复核建议", () => {
    addAvoidance("A9999-ORPHAN-INSIGHT");

    expect(
      builders().buildAvoidanceSpecialInsight("A9999-ORPHAN-INSIGHT"),
    ).toEqual(
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

  it("规避手段风险和工具重叠覆盖时输出高置信项和追溯项", () => {
    addAvoidance("A9999-OVERLAP");
    addRisk("R9999-OVERLAP", ["A9999-OVERLAP"]);
    addAttackTool("AT9999-OVERLAP", {
      directCauseRisks: ["R9999-OVERLAP"],
      avoidances: ["A9999-OVERLAP"],
    });
    addThreatActor("TA9999-OVERLAP", {
      directCauseRisks: ["R9999-OVERLAP"],
      useAttackTools: ["AT9999-OVERLAP"],
    });

    const insight = builders().buildAvoidanceSpecialInsight("A9999-OVERLAP");

    expect(insight).toEqual(
      expect.objectContaining({
        severity: "normal",
        recommendation: "relationView.specialInsight.avoidance.recommendUse",
      }),
    );
    expect(insight?.sections[0].notice).toBeUndefined();
    expect(insight?.sections[0].items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "R9999-OVERLAP",
          meta: "relationView.specialInsight.metaHighConfidence",
          type: RelationType.risk,
        }),
      ]),
    );
    expect(insight?.sections[1].items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "TA9999-OVERLAP" }),
        expect.objectContaining({ id: "AT9999-OVERLAP" }),
      ]),
    );
  });

  it("攻击工具所有风险已有规避手段时给出使用建议", () => {
    addAvoidance("A9999-TOOL-CONTROL");
    addRisk("R9999-TOOL-COVERED", ["A9999-TOOL-CONTROL"]);
    addAttackTool("AT9999-COVERED", {
      directCauseRisks: ["R9999-TOOL-COVERED"],
      avoidances: ["A9999-TOOL-CONTROL"],
    });
    addThreatActor("TA9999-BUILDER", {
      buildAttackTools: ["AT9999-COVERED"],
    });
    addThreatActor("TA9999-USER", {
      useAttackTools: ["AT9999-COVERED"],
    });

    const insight = builders().buildAttackToolSpecialInsight("AT9999-COVERED");

    expect(insight).toEqual(
      expect.objectContaining({
        severity: "normal",
        recommendation: "relationView.specialInsight.attackTool.recommendUse",
      }),
    );
    expect(insight?.sections[1].notice).toBeUndefined();
    expect(insight?.summary).toContain('"actors":2');
  });

  it("威胁行为者覆盖风险都有防御优先项时不输出 gap", () => {
    addAvoidance("A9999-ACTOR-CONTROL");
    addRisk("R9999-ACTOR-COVERED", ["A9999-ACTOR-CONTROL"]);
    addAttackTool("AT9999-ACTOR-COVERED", {
      indirectSupportRisks: ["R9999-ACTOR-COVERED"],
      avoidances: ["A9999-ACTOR-CONTROL"],
    });
    addThreatActor("TA9999-COVERED", {
      buildAttackTools: ["AT9999-ACTOR-COVERED"],
      useAttackTools: ["AT9999-ACTOR-COVERED"],
      directCauseRisks: ["R9999-ACTOR-COVERED"],
    });

    const insight =
      builders().buildThreatActorSpecialInsight("TA9999-COVERED");

    expect(insight).toEqual(
      expect.objectContaining({
        severity: "normal",
        recommendation: "relationView.specialInsight.threatActor.recommendUse",
      }),
    );
    expect(insight?.sections[2].notice).toBeUndefined();
    expect(insight?.sections[2].items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "A9999-ACTOR-CONTROL",
          type: RelationType.avoidance,
        }),
      ]),
    );
  });
});
