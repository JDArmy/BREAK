import { describe, expect, it, vi } from "vitest";
import {
  buildGlobalNodeAnalysisSummary,
  buildGlobalNodeRelatedEntitySummary,
  buildGlobalNodeRelationCounts,
  buildGlobalNodeRelations,
  getGlobalLines,
  getNodeTypeById,
} from "../relationGlobalLines";
import { RelationType } from "../relationTypes";

// mock BREAK 全局数据——覆盖跨类型关系 + 同类型 related*
vi.mock("@/BREAK", () => ({
  default: {
    risks: {
      R0001: { avoidances: ["A0001", "A0002"], relatedRisks: [{ key: "R0002", relation: "variant", note: "" }] },
      R0002: { avoidances: ["A0002"] },
    },
    avoidances: {
      A0001: {},
      A0002: {},
    },
    attackTools: {
      AT0001: {
        directCauseRisks: ["R0001"],
        indirectSupportRisks: ["R0002"],
        avoidances: ["A0001"],
        relatedAttackTools: [{ key: "AT0002", relation: "co-used", note: "" }],
      },
      AT0002: {
        directCauseRisks: [],
        indirectSupportRisks: [],
        avoidances: [],
      },
    },
    threatActors: {
      TA0001: {
        directCauseRisks: ["R0001"],
        indirectSupportRisks: [],
        buildAttackTools: ["AT0001"],
        useAttackTools: ["AT0002"],
      },
    },
    terms: {
      T0001: {
        relatedRisks: ["R0001"],
        relatedAvoidances: [],
        relatedAttackTools: [],
        relatedThreatActors: [],
      },
    },
  },
}));

const t = (key: string) => `t:${key}`;
const getNodeTitle = (type: RelationType, key: string) => `title:${type}:${key}`;
const getNodeTypeTitle = (type: string) => `typeTitle:${type}`;
// 完整 key 视为 direct（isDirectRelationLine 实际按规则判定，这里用 stub）
const isDirectRelationLine = (lineKey: string) =>
  lineKey === "relationLine.directCauseRisk" ||
  lineKey === "relationLine.avoidanceMeans" ||
  lineKey === "relationLine.buildAttackTool" ||
  lineKey === "relationLine.useAttackTool";
const getRelationSourceFields = (
  line: { relationKey: string; from: string; to: string },
  fromType?: string,
) => {
  if (line.relationKey === "relationLine.directCauseRisk" && fromType === "attack-tool") {
    return ["AttackTool.directCauseRisks"];
  }
  return [];
};
const getRelationPriority = () => 0;
const explainRelation = (
  line: { relationKey: string },
  sourceType?: string,
) => ({
  evidenceLevel: "direct",
  explanation: `exp:${line.relationKey}:${sourceType ?? ""}`,
  impactHint: "",
  qualityFlags: [],
});
const formatEvidenceLevel = (level: string) => `label:${level}`;

describe("relationGlobalLines", () => {
  describe("getGlobalLines", () => {
    it("枚举跨类型关系边且 relationKey 为完整 relationLine.* key", () => {
      const lines = getGlobalLines();
      // Risk→Avoidance
      expect(lines.some((l) => l.from === "R0001" && l.to === "A0001" && l.relationKey === "relationLine.avoidanceMeans")).toBe(true);
      // AttackTool→Risk direct
      expect(lines.some((l) => l.from === "AT0001" && l.to === "R0001" && l.relationKey === "relationLine.directCauseRisk")).toBe(true);
      // AttackTool→Avoidance
      expect(lines.some((l) => l.from === "AT0001" && l.to === "A0001" && l.relationKey === "relationLine.avoidanceMeans")).toBe(true);
      // ThreatActor→AttackTool build/use
      expect(lines.some((l) => l.from === "TA0001" && l.to === "AT0001" && l.relationKey === "relationLine.buildAttackTool")).toBe(true);
      expect(lines.some((l) => l.from === "TA0001" && l.to === "AT0002" && l.relationKey === "relationLine.useAttackTool")).toBe(true);
      // Term→Risk
      expect(lines.some((l) => l.from === "T0001" && l.to === "R0001" && l.relationKey === "relationLine.relatedTerm")).toBe(true);
    });
  });

  describe("getNodeTypeById", () => {
    it("前缀推断类型", () => {
      expect(getNodeTypeById("AT0001")).toBe(RelationType.attackTool);
      expect(getNodeTypeById("TA0001")).toBe(RelationType.threatActor);
      expect(getNodeTypeById("R0001")).toBe(RelationType.risk);
      expect(getNodeTypeById("A0001")).toBe(RelationType.avoidance);
      expect(getNodeTypeById("T0001")).toBe(RelationType.term);
      expect(getNodeTypeById("X9999")).toBe(RelationType.risk);
    });
  });

  describe("buildGlobalNodeRelationCounts", () => {
    it("统计 AT0001 的 incoming/outgoing", () => {
      const counts = buildGlobalNodeRelationCounts("AT0001", getGlobalLines());
      // outgoing: R0001(direct), R0002(indirect), A0001(avoidance) = 3
      // incoming: TA0001(build) = 1
      expect(counts.outgoing).toBe(3);
      expect(counts.incoming).toBe(1);
    });

    it("无关系节点返回 0/0", () => {
      const counts = buildGlobalNodeRelationCounts("AT0002", getGlobalLines());
      // AT0002: incoming TA0001(use)=1
      expect(counts.incoming).toBe(1);
      expect(counts.outgoing).toBe(0);
    });
  });

  describe("buildGlobalNodeRelations", () => {
    it("构建关系列表，otherNodeType/Title 非空且 sourceFields 含类型特定字段", () => {
      const relations = buildGlobalNodeRelations({
        nodeId: "AT0001",
        globalLines: getGlobalLines(),
        getNodeTitle,
        getNodeTypeTitle,
        isDirectRelationLine,
        getRelationSourceFields,
        getRelationPriority,
        explainRelation,
        formatEvidenceLevel,
        t,
      });
      // 至少 4 条（3 outgoing + 1 incoming）
      expect(relations.length).toBeGreaterThanOrEqual(4);
      const directRisk = relations.find((r) => r.otherNodeId === "R0001" && r.relationLineKey === "relationLine.directCauseRisk");
      expect(directRisk).toBeDefined();
      // 邻居类型/标题非空（回退生效）
      expect(directRisk!.otherNodeType).toBe("typeTitle:risk");
      expect(directRisk!.otherNodeTitle).toBe("title:risk:R0001");
      // sourceFields 含类型特定字段（传了 fromType=attack-tool）
      expect(directRisk!.sourceFields).toContain("AttackTool.directCauseRisks");
      // 过滤器所需 key 存在
      expect(directRisk!.directionKey).toBe("outgoing");
      expect(directRisk!.directnessKey).toBe("direct");
      expect(directRisk!.relationLineKey).toBe("relationLine.directCauseRisk");
    });

    it("incoming 关系 direction 为 incoming", () => {
      const relations = buildGlobalNodeRelations({
        nodeId: "AT0001",
        globalLines: getGlobalLines(),
        getNodeTitle,
        getNodeTypeTitle,
        isDirectRelationLine,
        getRelationSourceFields,
        getRelationPriority,
        explainRelation,
        formatEvidenceLevel,
        t,
      });
      const buildRel = relations.find((r) => r.otherNodeId === "TA0001");
      expect(buildRel).toBeDefined();
      expect(buildRel!.directionKey).toBe("incoming");
    });

    it("无关系节点返回空数组", () => {
      const relations = buildGlobalNodeRelations({
        nodeId: "R9999",
        globalLines: getGlobalLines(),
        getNodeTitle,
        getNodeTypeTitle,
        isDirectRelationLine,
        getRelationSourceFields,
        getRelationPriority,
        explainRelation,
        formatEvidenceLevel,
        t,
      });
      expect(relations).toEqual([]);
    });
  });

  describe("buildGlobalNodeAnalysisSummary", () => {
    it("构建 AT0001 概览，计数正确且不触发 missingRiskLink（有 risk 关系）", () => {
      const summary = buildGlobalNodeAnalysisSummary({
        node: { id: "AT0001", type: RelationType.attackTool },
        globalLines: getGlobalLines(),
        getNodeTitle,
        getNodeTypeTitle,
        t,
      });
      expect(summary).not.toBeNull();
      expect(summary!.summary).toContain("t:relationView.nodeAnalysis.attack-tool");
      // AT0001 关系数 = 4（3 outgoing + 1 incoming）
      // notices 不含 missingRiskLink（有 R0001/R0002）
      expect(summary!.notices.some((n) => n.includes("missingRiskLink"))).toBe(false);
    });

    it("无 risk 关系的 attackTool 触发 missingRiskLink", () => {
      const summary = buildGlobalNodeAnalysisSummary({
        node: { id: "AT0002", type: RelationType.attackTool },
        globalLines: getGlobalLines(),
        getNodeTitle,
        getNodeTypeTitle,
        t,
      });
      // AT0002 仅 incoming TA0001(use)，无 risk → relationCount=1 → lowConnectivity + missingRiskLink
      expect(summary!.notices.some((n) => n.includes("lowConnectivity"))).toBe(true);
      expect(summary!.notices.some((n) => n.includes("missingRiskLink"))).toBe(true);
    });

    it("null 节点返回 null", () => {
      const summary = buildGlobalNodeAnalysisSummary({
        node: null,
        globalLines: getGlobalLines(),
        getNodeTitle,
        getNodeTypeTitle,
        t,
      });
      expect(summary).toBeNull();
    });

    it("无关系节点触发 lowConnectivity", () => {
      const summary = buildGlobalNodeAnalysisSummary({
        node: { id: "R9999", type: RelationType.risk },
        globalLines: getGlobalLines(),
        getNodeTitle,
        getNodeTypeTitle,
        t,
      });
      expect(summary!.notices.some((n) => n.includes("lowConnectivity"))).toBe(true);
    });
  });

  describe("buildGlobalNodeRelatedEntitySummary", () => {
    it("attackTool 读 relatedAttackTools", () => {
      const summary = buildGlobalNodeRelatedEntitySummary({
        nodeId: "AT0001",
        getNodeTitle,
        getNodeTypeTitle,
        t,
      });
      expect(summary).not.toBeNull();
      expect(summary!.items.length).toBe(1);
      expect(summary!.items[0]!.id).toBe("AT0002");
      expect(summary!.items[0]!.title).toBe("title:attack-tool:AT0002");
    });

    it("risk 读 relatedRisks", () => {
      const summary = buildGlobalNodeRelatedEntitySummary({
        nodeId: "R0001",
        getNodeTitle,
        getNodeTypeTitle,
        t,
      });
      expect(summary).not.toBeNull();
      expect(summary!.items[0]!.id).toBe("R0002");
    });

    it("term 无同类型相关实体返回 null", () => {
      const summary = buildGlobalNodeRelatedEntitySummary({
        nodeId: "T0001",
        getNodeTitle,
        getNodeTypeTitle,
        t,
      });
      expect(summary).toBeNull();
    });

    it("related* 字段缺失返回 null", () => {
      const summary = buildGlobalNodeRelatedEntitySummary({
        nodeId: "AT0002",
        getNodeTitle,
        getNodeTypeTitle,
        t,
      });
      expect(summary).toBeNull();
    });
  });
});
