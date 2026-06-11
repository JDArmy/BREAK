/**
 * 数据完整性测试
 * 直接读取 JSON 文件验证数据一致性和交叉引用有效性
 * 不依赖 Vite 运行时，在 Node 环境中独立执行
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

/** 读取指定目录下所有 JSON 文件并合并为扁平字典 */
function loadAllJson(dir: string): Record<string, Record<string, unknown>> {
  const result: Record<string, Record<string, unknown>> = {};
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    const content = JSON.parse(readFileSync(join(dir, file), "utf-8"));
    Object.assign(result, content);
  }
  return result;
}

const ROOT = "src/BREAK";
const I18N_EN_ROOT = "src/i18n/en/BREAK";

const risks = loadAllJson(join(ROOT, "risks"));
const avoidances = loadAllJson(join(ROOT, "avoidances"));
const attackTools = loadAllJson(join(ROOT, "attack-tools"));
const threatActors = loadAllJson(join(ROOT, "threat-actors"));
const businessScenes = loadAllJson(join(ROOT, "business-scenes"));

const enRisks = loadAllJson(join(I18N_EN_ROOT, "risks"));
const enAvoidances = loadAllJson(join(I18N_EN_ROOT, "avoidances"));
const enAttackTools = loadAllJson(join(I18N_EN_ROOT, "attack-tools"));
const enThreatActors = loadAllJson(join(I18N_EN_ROOT, "threat-actors"));
const enBusinessScenes = loadAllJson(join(I18N_EN_ROOT, "business-scenes"));

const riskIds = Object.keys(risks);
const avoidanceIds = Object.keys(avoidances);
const attackToolIds = Object.keys(attackTools);
const threatActorIds = Object.keys(threatActors);

describe("数据完整性", () => {
  describe("必填字段", () => {
    it("所有 Risk 条目均含 title, definition, description, complexity, influence, avoidances", () => {
      const missing: string[] = [];
      for (const [id, entity] of Object.entries(risks)) {
        if (!entity.title) missing.push(`${id}.title`);
        if (!entity.definition) missing.push(`${id}.definition`);
        if (!entity.description) missing.push(`${id}.description`);
        if (!entity.complexity) missing.push(`${id}.complexity`);
        if (!entity.influence) missing.push(`${id}.influence`);
        if (!Array.isArray(entity.avoidances)) missing.push(`${id}.avoidances`);
      }
      expect(missing, `缺少必填字段: ${missing.join(", ")}`).toEqual([]);
    });

    it("所有 Avoidance 条目均含 title, category, definition, description", () => {
      const missing: string[] = [];
      for (const [id, entity] of Object.entries(avoidances)) {
        if (!entity.title) missing.push(`${id}.title`);
        if (!entity.category) missing.push(`${id}.category`);
        if (!entity.definition) missing.push(`${id}.definition`);
        if (!entity.description) missing.push(`${id}.description`);
      }
      expect(missing, `缺少必填字段: ${missing.join(", ")}`).toEqual([]);
    });

    it("所有 AttackTool 条目均含 title, description", () => {
      const missing: string[] = [];
      for (const [id, entity] of Object.entries(attackTools)) {
        if (!entity.title) missing.push(`${id}.title`);
        if (!entity.description) missing.push(`${id}.description`);
      }
      expect(missing, `缺少必填字段: ${missing.join(", ")}`).toEqual([]);
    });

    it("所有 ThreatActor 条目均含 title, description", () => {
      const missing: string[] = [];
      for (const [id, entity] of Object.entries(threatActors)) {
        if (!entity.title) missing.push(`${id}.title`);
        if (!entity.description) missing.push(`${id}.description`);
      }
      expect(missing, `缺少必填字段: ${missing.join(", ")}`).toEqual([]);
    });

    it("所有 Reference 均含 link 和 title", () => {
      const missing: string[] = [];
      const allEntities = [
        ...Object.entries(risks).map(([id, e]) => [id, e] as const),
        ...Object.entries(avoidances).map(([id, e]) => [id, e] as const),
        ...Object.entries(attackTools).map(([id, e]) => [id, e] as const),
        ...Object.entries(threatActors).map(([id, e]) => [id, e] as const),
      ];
      for (const [id, entity] of allEntities) {
        const refs = entity.references as Array<Record<string, unknown>> | undefined;
        if (!refs) continue;
        for (let i = 0; i < refs.length; i++) {
          if (!refs[i].link) missing.push(`${id}.references[${i}].link`);
          if (!refs[i].title) missing.push(`${id}.references[${i}].title`);
        }
      }
      expect(missing, `Reference 缺少字段: ${missing.slice(0, 10).join(", ")}${missing.length > 10 ? ` ...共${missing.length}条` : ""}`).toEqual([]);
    });
  });

  describe("枚举值合法性", () => {
    it("Risk complexity 值属于 {'初级', '中级', '高级'}", () => {
      const valid = new Set(["初级", "中级", "高级"]);
      const invalid: string[] = [];
      for (const [id, entity] of Object.entries(risks)) {
        if (entity.complexity && !valid.has(entity.complexity as string)) {
          invalid.push(`${id}: ${entity.complexity}`);
        }
      }
      expect(invalid, `无效 complexity 值: ${invalid.join(", ")}`).toEqual([]);
    });
  });

  describe("交叉引用有效性", () => {
    it("所有 Risk.avoidances 引用的 ID 在 Avoidance 中存在", () => {
      const invalid: string[] = [];
      for (const [id, entity] of Object.entries(risks)) {
        const arr = entity.avoidances as string[] | undefined;
        if (!arr) continue;
        for (const ref of arr) {
          if (!avoidanceIds.includes(ref)) invalid.push(`${id}.avoidances: ${ref}`);
        }
      }
      expect(invalid, `无效引用: ${invalid.slice(0, 10).join(", ")}`).toEqual([]);
    });

    it("所有 AttackTool.directCauseRisks 引用的 ID 在 Risk 中存在", () => {
      const invalid: string[] = [];
      for (const [id, entity] of Object.entries(attackTools)) {
        const arr = entity.directCauseRisks as string[] | undefined;
        if (!arr) continue;
        for (const ref of arr) {
          if (!riskIds.includes(ref)) invalid.push(`${id}.directCauseRisks: ${ref}`);
        }
      }
      expect(invalid, `无效引用: ${invalid.slice(0, 10).join(", ")}`).toEqual([]);
    });

    it("所有 AttackTool.indirectSupportRisks 引用的 ID 在 Risk 中存在", () => {
      const invalid: string[] = [];
      for (const [id, entity] of Object.entries(attackTools)) {
        const arr = entity.indirectSupportRisks as string[] | undefined;
        if (!arr) continue;
        for (const ref of arr) {
          if (!riskIds.includes(ref)) invalid.push(`${id}.indirectSupportRisks: ${ref}`);
        }
      }
      expect(invalid, `无效引用: ${invalid.slice(0, 10).join(", ")}`).toEqual([]);
    });

    it("所有 AttackTool.avoidances 引用的 ID 在 Avoidance 中存在", () => {
      const invalid: string[] = [];
      for (const [id, entity] of Object.entries(attackTools)) {
        const arr = entity.avoidances as string[] | undefined;
        if (!arr) continue;
        for (const ref of arr) {
          if (!avoidanceIds.includes(ref)) invalid.push(`${id}.avoidances: ${ref}`);
        }
      }
      expect(invalid, `无效引用: ${invalid.slice(0, 10).join(", ")}`).toEqual([]);
    });

    it("所有 ThreatActor.buildAttackTools 引用的 ID 在 AttackTool 中存在", () => {
      const invalid: string[] = [];
      for (const [id, entity] of Object.entries(threatActors)) {
        const arr = entity.buildAttackTools as string[] | undefined;
        if (!arr) continue;
        for (const ref of arr) {
          if (!attackToolIds.includes(ref)) invalid.push(`${id}.buildAttackTools: ${ref}`);
        }
      }
      expect(invalid, `无效引用: ${invalid.slice(0, 10).join(", ")}`).toEqual([]);
    });

    it("所有 ThreatActor.useAttackTools 引用的 ID 在 AttackTool 中存在", () => {
      const invalid: string[] = [];
      for (const [id, entity] of Object.entries(threatActors)) {
        const arr = entity.useAttackTools as string[] | undefined;
        if (!arr) continue;
        for (const ref of arr) {
          if (!attackToolIds.includes(ref)) invalid.push(`${id}.useAttackTools: ${ref}`);
        }
      }
      expect(invalid, `无效引用: ${invalid.slice(0, 10).join(", ")}`).toEqual([]);
    });

    it("所有 ThreatActor.directCauseRisks 引用的 ID 在 Risk 中存在", () => {
      const invalid: string[] = [];
      for (const [id, entity] of Object.entries(threatActors)) {
        const arr = entity.directCauseRisks as string[] | undefined;
        if (!arr) continue;
        for (const ref of arr) {
          if (!riskIds.includes(ref)) invalid.push(`${id}.directCauseRisks: ${ref}`);
        }
      }
      expect(invalid, `无效引用: ${invalid.slice(0, 10).join(", ")}`).toEqual([]);
    });

    it("所有 ThreatActor.indirectSupportRisks 引用的 ID 在 Risk 中存在", () => {
      const invalid: string[] = [];
      for (const [id, entity] of Object.entries(threatActors)) {
        const arr = entity.indirectSupportRisks as string[] | undefined;
        if (!arr) continue;
        for (const ref of arr) {
          if (!riskIds.includes(ref)) invalid.push(`${id}.indirectSupportRisks: ${ref}`);
        }
      }
      expect(invalid, `无效引用: ${invalid.slice(0, 10).join(", ")}`).toEqual([]);
    });
  });

  describe("i18n 同步", () => {
    it("中英文 Risk 条目数一致", () => {
      expect(Object.keys(enRisks).length).toBe(riskIds.length);
    });

    it("中英文 Avoidance 条目数一致", () => {
      expect(Object.keys(enAvoidances).length).toBe(avoidanceIds.length);
    });

    it("中英文 AttackTool 条目数一致", () => {
      expect(Object.keys(enAttackTools).length).toBe(attackToolIds.length);
    });

    it("中英文 ThreatActor 条目数一致", () => {
      expect(Object.keys(enThreatActors).length).toBe(threatActorIds.length);
    });

    it("中英文 BusinessScene 条目数一致", () => {
      expect(Object.keys(enBusinessScenes).length).toBe(Object.keys(businessScenes).length);
    });

    it("中文每个实体 key 在英文翻译中均存在", () => {
      const missing: string[] = [];
      for (const id of riskIds) {
        if (!enRisks[id]) missing.push(`risk:${id}`);
      }
      for (const id of avoidanceIds) {
        if (!enAvoidances[id]) missing.push(`avoidance:${id}`);
      }
      for (const id of attackToolIds) {
        if (!enAttackTools[id]) missing.push(`attackTool:${id}`);
      }
      for (const id of threatActorIds) {
        if (!enThreatActors[id]) missing.push(`threatActor:${id}`);
      }
      expect(missing, `EN 缺少 key: ${missing.slice(0, 10).join(", ")}`).toEqual([]);
    });
  });

  describe("孤儿条目", () => {
    it("无孤儿 Avoidance（每个 Avoidance 至少被一个 Risk 引用）", () => {
      const referencedAvoidances = new Set<string>();
      for (const entity of Object.values(risks)) {
        const arr = entity.avoidances as string[] | undefined;
        if (arr) arr.forEach((a) => referencedAvoidances.add(a));
      }
      for (const entity of Object.values(attackTools)) {
        const arr = entity.avoidances as string[] | undefined;
        if (arr) arr.forEach((a) => referencedAvoidances.add(a));
      }

      const orphans = avoidanceIds.filter((id) => !referencedAvoidances.has(id));
      expect(orphans, `孤儿 Avoidance: ${orphans.join(", ")}`).toEqual([]);
    });
  });
});
