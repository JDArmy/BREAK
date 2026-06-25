import { afterEach, describe, expect, it } from "vitest";
import BREAK from "@/BREAK";
import { createRelationNodeCoverageBuilders } from "../relationNodeCoverageBuilders";
import { RelationType } from "../relationTypes";

const t = (key: string, params?: Record<string, unknown>) =>
  params ? `${key}:${Object.values(params).join("|")}` : key;

const getNodeTitle = (type: RelationType, key: string) => `${type}:${key}`;

const builders = () =>
  createRelationNodeCoverageBuilders({
    t,
    getNodeTitle: getNodeTitle as never,
  });

const cleanup = {
  risks: [] as string[],
  avoidances: [] as string[],
  attackTools: [] as string[],
  threatActors: [] as string[],
};

const addRisk = (id: string, avoidances: string[] = []) => {
  (BREAK.risks as Record<string, unknown>)[id] = {
    title: id,
    keywords: [],
    definition: id,
    description: id,
    complexity: "低级",
    influence: id,
    avoidances,
    references: [],
  };
  cleanup.risks.push(id);
};

const addAvoidance = (id: string) => {
  (BREAK.avoidances as Record<string, unknown>)[id] = {
    title: id,
    category: "AC01",
    keywords: [],
    definition: id,
    description: id,
    references: [],
  };
  cleanup.avoidances.push(id);
};

const addAttackTool = (
  id: string,
  options: {
    directCauseRisks?: string[];
    indirectSupportRisks?: string[];
    avoidances?: string[];
  } = {},
) => {
  (BREAK.attackTools as Record<string, unknown>)[id] = {
    title: id,
    keywords: [],
    description: id,
    directCauseRisks: options.directCauseRisks ?? [],
    indirectSupportRisks: options.indirectSupportRisks ?? [],
    avoidances: options.avoidances ?? [],
    references: [],
  };
  cleanup.attackTools.push(id);
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
  (BREAK.threatActors as Record<string, unknown>)[id] = {
    title: id,
    keywords: [],
    description: id,
    buildAttackTools: options.buildAttackTools ?? [],
    useAttackTools: options.useAttackTools ?? [],
    directCauseRisks: options.directCauseRisks ?? [],
    indirectSupportRisks: options.indirectSupportRisks ?? [],
    references: [],
  };
  cleanup.threatActors.push(id);
};

describe("relationNodeCoverageBuilders", () => {
  afterEach(() => {
    cleanup.risks.splice(0).forEach((id) => {
      delete (BREAK.risks as Record<string, unknown>)[id];
    });
    cleanup.avoidances.splice(0).forEach((id) => {
      delete (BREAK.avoidances as Record<string, unknown>)[id];
    });
    cleanup.attackTools.splice(0).forEach((id) => {
      delete (BREAK.attackTools as Record<string, unknown>)[id];
    });
    cleanup.threatActors.splice(0).forEach((id) => {
      delete (BREAK.threatActors as Record<string, unknown>)[id];
    });
  });

  it("returns null for unknown entities", () => {
    const coverage = builders();

    expect(coverage.buildRiskCoverage("R9999-MISSING")).toBeNull();
    expect(coverage.buildAvoidanceCoverage("A9999-MISSING")).toBeNull();
    expect(coverage.buildAttackToolCoverage("AT9999-MISSING")).toBeNull();
    expect(coverage.buildThreatActorCoverage("TA9999-MISSING")).toBeNull();
  });

  it("marks risk coverage danger when no direct or tool avoidances exist", () => {
    addRisk("R9999-NO-COVERAGE");

    expect(builders().buildRiskCoverage("R9999-NO-COVERAGE")).toEqual(
      expect.objectContaining({
        severity: "danger",
        notice: "relationView.nodeCoverageNotice.risk",
        items: [],
      }),
    );
  });

  it("marks risk coverage warning when only attack-tool avoidances exist", () => {
    addAvoidance("A9999-TOOL");
    addRisk("R9999-TOOL-ONLY");
    addAttackTool("AT9999-TOOL-ONLY", {
      directCauseRisks: ["R9999-TOOL-ONLY"],
      avoidances: ["A9999-TOOL"],
    });

    expect(builders().buildRiskCoverage("R9999-TOOL-ONLY")).toEqual(
      expect.objectContaining({
        severity: "warning",
        items: [
          expect.objectContaining({
            id: "A9999-TOOL",
            sourceFields: ["AttackTool.avoidances"],
          }),
        ],
      }),
    );
  });

  it("marks attack-tool and threat-actor coverage gaps as warnings", () => {
    addAttackTool("AT9999-EMPTY");
    addThreatActor("TA9999-EMPTY");

    expect(builders().buildAttackToolCoverage("AT9999-EMPTY")).toEqual(
      expect.objectContaining({
        severity: "warning",
        notice: "relationView.nodeCoverageNotice.attackTool",
        items: [],
      }),
    );
    expect(builders().buildThreatActorCoverage("TA9999-EMPTY")).toEqual(
      expect.objectContaining({
        severity: "warning",
        notice: "relationView.nodeCoverageNotice.threatActor",
        items: [],
      }),
    );
  });

  it("filters invalid referenced entities from attack-tool and threat-actor coverage", () => {
    addRisk("R9999-VALID");
    addAvoidance("A9999-VALID");
    addAttackTool("AT9999-MIXED", {
      directCauseRisks: ["R9999-VALID", "R9999-MISSING"],
      indirectSupportRisks: ["R9999-VALID"],
      avoidances: ["A9999-VALID", "A9999-MISSING"],
    });
    addThreatActor("TA9999-MIXED", {
      buildAttackTools: ["AT9999-MIXED", "AT9999-MISSING"],
      useAttackTools: ["AT9999-MIXED"],
      directCauseRisks: ["R9999-VALID"],
      indirectSupportRisks: ["R9999-MISSING"],
    });

    expect(
      builders().buildAttackToolCoverage("AT9999-MIXED")?.items.map((item) => item.id),
    ).toEqual(["R9999-VALID", "A9999-VALID"]);
    expect(
      builders().buildThreatActorCoverage("TA9999-MIXED")?.items.map((item) => item.id),
    ).toEqual(["AT9999-MIXED", "R9999-VALID"]);
  });
});
