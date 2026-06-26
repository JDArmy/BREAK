import { describe, expect, it } from "vitest";
import {
  inferEntityType,
  entityI18nPrefix,
  getEntityEntry,
  getEntityEntryByBreakKey,
  getEntityEntryByRelationKey,
  entityRegistry,
  ENTITY_ID_PATTERN,
  ALL_ENTITY_TYPES,
} from "@/BREAK/entityRegistry";

describe("entityRegistry", () => {
  describe("inferEntityType", () => {
    it("正确推断各前缀类型", () => {
      expect(inferEntityType("R0001")).toBe("risk");
      expect(inferEntityType("A0001")).toBe("avoidance");
      expect(inferEntityType("AT0001")).toBe("attackTool");
      expect(inferEntityType("TA0001")).toBe("threatActor");
      expect(inferEntityType("T0001")).toBe("term");
      expect(inferEntityType("C0001")).toBe("case");
    });

    it("AT 优先于 A（最长前缀优先）", () => {
      expect(inferEntityType("AT0001")).toBe("attackTool");
      expect(inferEntityType("A0001")).toBe("avoidance");
    });

    it("TA 优先于 T（最长前缀优先）", () => {
      expect(inferEntityType("TA0001")).toBe("threatActor");
      expect(inferEntityType("T0001")).toBe("term");
    });

    it("带子编号的 ID 仍可推断", () => {
      expect(inferEntityType("R0001-001")).toBe("risk");
      expect(inferEntityType("AT0001-002")).toBe("attackTool");
    });

    it("无法识别的 ID 返回 null", () => {
      expect(inferEntityType("X0001")).toBeNull();
      expect(inferEntityType("BS01")).toBeNull();
      expect(inferEntityType("")).toBeNull();
    });
  });

  describe("entityI18nPrefix", () => {
    it("生成正确的 i18n 前缀", () => {
      expect(entityI18nPrefix("R0001", "risk")).toBe("BREAK.risks.R0001");
      expect(entityI18nPrefix("A0001", "avoidance")).toBe("BREAK.avoidances.A0001");
      expect(entityI18nPrefix("AT0001", "attackTool")).toBe("BREAK.attackTools.AT0001");
      expect(entityI18nPrefix("TA0001", "threatActor")).toBe("BREAK.threatActors.TA0001");
      expect(entityI18nPrefix("T0001", "term")).toBe("BREAK.terms.T0001");
      expect(entityI18nPrefix("C0001", "case")).toBe("BREAK.cases.C0001");
    });
  });

  describe("getEntityEntry", () => {
    it("按类型返回注册信息", () => {
      const risk = getEntityEntry("risk");
      expect(risk.idPrefix).toBe("R");
      expect(risk.paramKey).toBe("rKey");
      expect(risk.breakKey).toBe("risks");
      expect(risk.i18nPath).toBe("BREAK.risks");
      expect(risk.detailRouteName).toBe("knowledgesRiskDetail");
      expect(risk.dataSource).toBe("i18n");
    });

    it("case 类型标记为懒加载", () => {
      const caseEntry = getEntityEntry("case");
      expect(caseEntry.dataSource).toBe("lazy");
      expect(caseEntry.paramKey).toBe("cKey");
    });
  });

  describe("getEntityEntryByBreakKey", () => {
    it("按 breakKey 查找", () => {
      expect(getEntityEntryByBreakKey("risks")?.type).toBe("risk");
      expect(getEntityEntryByBreakKey("avoidances")?.type).toBe("avoidance");
      expect(getEntityEntryByBreakKey("attackTools")?.type).toBe("attackTool");
      expect(getEntityEntryByBreakKey("threatActors")?.type).toBe("threatActor");
      expect(getEntityEntryByBreakKey("terms")?.type).toBe("term");
      expect(getEntityEntryByBreakKey("cases")?.type).toBe("case");
    });

    it("不存在的 breakKey 返回 undefined", () => {
      expect(getEntityEntryByBreakKey("unknown")).toBeUndefined();
      expect(getEntityEntryByBreakKey("")).toBeUndefined();
    });
  });

  describe("getEntityEntryByRelationKey", () => {
    it("按 relationKey 查找", () => {
      expect(getEntityEntryByRelationKey("risk")?.type).toBe("risk");
      expect(getEntityEntryByRelationKey("avoidance")?.type).toBe("avoidance");
      expect(getEntityEntryByRelationKey("attack-tool")?.type).toBe("attackTool");
      expect(getEntityEntryByRelationKey("threat-actor")?.type).toBe("threatActor");
      expect(getEntityEntryByRelationKey("term")?.type).toBe("term");
      expect(getEntityEntryByRelationKey("case")?.type).toBe("case");
    });

    it("不存在的 relationKey 返回 undefined", () => {
      expect(getEntityEntryByRelationKey("unknown")).toBeUndefined();
    });
  });

  describe("ENTITY_ID_PATTERN", () => {
    it("匹配各种实体 ID", () => {
      const text = "风险 R0001 和攻击工具 AT0002-001 以及案例 C1234";
      const matches = text.match(new RegExp(ENTITY_ID_PATTERN.source, "g"));
      expect(matches).toEqual(["R0001", "AT0002-001", "C1234"]);
    });

    it("不匹配非实体前缀", () => {
      const text = "BS01 不是实体 ID，X1234 也不是";
      const matches = text.match(new RegExp(ENTITY_ID_PATTERN.source, "g"));
      expect(matches).toBeNull();
    });
  });

  describe("entityRegistry", () => {
    it("包含 6 种实体类型", () => {
      expect(entityRegistry).toHaveLength(6);
    });

    it("ALL_ENTITY_TYPES 包含全部类型", () => {
      expect(ALL_ENTITY_TYPES).toHaveLength(6);
      expect(ALL_ENTITY_TYPES).toContain("risk");
      expect(ALL_ENTITY_TYPES).toContain("case");
    });

    it("每个注册项字段完整", () => {
      for (const entry of entityRegistry) {
        expect(entry.type).toBeTruthy();
        expect(entry.idPrefix).toBeTruthy();
        expect(entry.relationKey).toBeTruthy();
        expect(entry.paramKey).toBeTruthy();
        expect(entry.breakKey).toBeTruthy();
        expect(entry.i18nPath).toBeTruthy();
        expect(entry.typeLabelKey).toBeTruthy();
        expect(entry.listRouteName).toBeTruthy();
        expect(entry.detailRouteName).toBeTruthy();
        expect(entry.fieldPriority.length).toBeGreaterThan(0);
        expect(["i18n", "lazy"]).toContain(entry.dataSource);
      }
    });

    it("关系图视角路由名正确配置", () => {
      expect(getEntityEntry("risk").relationPerspectiveRouteName).toBe("relationRiskEntity");
      expect(getEntityEntry("avoidance").relationPerspectiveRouteName).toBe("relationDefenseCoverageEntity");
      expect(getEntityEntry("attackTool").relationPerspectiveRouteName).toBe("relationAttackPathEntity");
      expect(getEntityEntry("threatActor").relationPerspectiveRouteName).toBe("relationAttackPathEntity");
      expect(getEntityEntry("term").relationPerspectiveRouteName).toBe("");
      expect(getEntityEntry("case").relationPerspectiveRouteName).toBe("");
    });
  });
});
