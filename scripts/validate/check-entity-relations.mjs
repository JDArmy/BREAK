import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { validateDerivedRelationNotes, validateDerivedRelationTop6 } from "./relation-note-utils.mjs";

const root = "src/BREAK";

const entityDirs = {
  risks: "risks",
  avoidances: "avoidances",
  attackTools: "attack-tools",
  threatActors: "threat-actors",
  terms: "terms",
  businessScenes: "business-scenes",
  cases: "cases",
};

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

function loadEntities(dir) {
  const records = [];
  const fullDir = join(root, dir);
  for (const file of readdirSync(fullDir).filter((item) => item.endsWith(".json")).sort()) {
    const data = readJson(join(fullDir, file));
    for (const [id, entity] of Object.entries(data)) {
      records.push({ id, entity, file: join(fullDir, file) });
    }
  }
  return records;
}

function ids(records) {
  return new Set(records.map((record) => record.id));
}

function addIssue(issues, file, id, message) {
  issues.push(`${file}.${id}: ${message}`);
}

function checkRefs(issues, record, field, validIds, label) {
  const values = record.entity[field];
  if (!Array.isArray(values)) return;

  for (const ref of values) {
    if (!validIds.has(ref)) {
      addIssue(issues, record.file, record.id, `${field} 引用了不存在的 ${label}: ${ref}`);
    }
  }
}

function collectBusinessSceneIdsAndRisks(records) {
  const sceneIds = new Set();
  const riskRefs = new Set();

  for (const { id, entity } of records) {
    sceneIds.add(id);
    for (const ref of entity.risks || []) riskRefs.add(ref);
    for (const riskScene of Object.values(entity.riskScenes || {})) {
      for (const ref of riskScene.risks || []) riskRefs.add(ref);
    }
  }

  return { sceneIds, riskRefs };
}

const risks = loadEntities(entityDirs.risks);
const avoidances = loadEntities(entityDirs.avoidances);
const attackTools = loadEntities(entityDirs.attackTools);
const threatActors = loadEntities(entityDirs.threatActors);
const terms = loadEntities(entityDirs.terms);
const businessScenes = loadEntities(entityDirs.businessScenes);
const cases = loadEntities(entityDirs.cases);

const riskIds = ids(risks);
const avoidanceIds = ids(avoidances);
const attackToolIds = ids(attackTools);
const threatActorIds = ids(threatActors);
const { sceneIds, riskRefs: businessSceneRiskRefs } = collectBusinessSceneIdsAndRisks(businessScenes);

const avoidanceCategories = readJson(join(root, "avoidance-categories", "avoidanceCategories.json"));
const avoidanceCategoryIds = new Set(Object.keys(avoidanceCategories));
const riskRelationTypes = new Set(["prerequisite", "co-occurrence", "escalation", "variant"]);
const avoidanceRelationTypes = new Set(["prerequisite", "complement", "alternative", "mitigates-gap"]);
const attackToolRelationTypes = new Set(["prerequisite", "co-used", "alternative", "capability-upgrade"]);
const threatActorRelationTypes = new Set(["co-involved"]);

const issues = [];

for (const record of avoidances) {
  if (!avoidanceCategoryIds.has(record.entity.category)) {
    addIssue(
      issues,
      record.file,
      record.id,
      `category 引用了未定义的规避分类: ${record.entity.category}`,
    );
  }

  const relatedAvoidances = record.entity.relatedAvoidances || [];
  if (!Array.isArray(relatedAvoidances)) {
    addIssue(issues, record.file, record.id, "relatedAvoidances 必须是数组");
  } else {
    const seen = new Set();
    for (const [index, relation] of relatedAvoidances.entries()) {
      const ref = relation?.key;
      const relationType = relation?.relation;
      if (!ref || !avoidanceIds.has(ref)) {
        addIssue(issues, record.file, record.id, `relatedAvoidances[${index}].key 引用了不存在的 Avoidance: ${ref}`);
      }
      if (ref === record.id) {
        addIssue(issues, record.file, record.id, `relatedAvoidances[${index}].key 不能引用自身`);
      }
      if (!avoidanceRelationTypes.has(relationType)) {
        addIssue(issues, record.file, record.id, `relatedAvoidances[${index}].relation 非法: ${relationType}`);
      }
      const fingerprint = `${ref}:${relationType}`;
      if (seen.has(fingerprint)) {
        addIssue(issues, record.file, record.id, `relatedAvoidances 存在重复关系: ${fingerprint}`);
      }
      seen.add(fingerprint);
    }
  }
}

for (const record of risks) {
  if (!Array.isArray(record.entity.avoidances) || record.entity.avoidances.length === 0) {
    addIssue(issues, record.file, record.id, "avoidances 不能为空");
  }
  checkRefs(issues, record, "avoidances", avoidanceIds, "Avoidance");

  const relatedRisks = record.entity.relatedRisks || [];
  if (!Array.isArray(relatedRisks)) {
    addIssue(issues, record.file, record.id, "relatedRisks 必须是数组");
  } else {
    const seen = new Set();
    for (const [index, relation] of relatedRisks.entries()) {
      const ref = relation?.key;
      const relationType = relation?.relation;
      if (!ref || !riskIds.has(ref)) {
        addIssue(issues, record.file, record.id, `relatedRisks[${index}].key 引用了不存在的 Risk: ${ref}`);
      }
      if (ref === record.id) {
        addIssue(issues, record.file, record.id, `relatedRisks[${index}].key 不能引用自身`);
      }
      if (!riskRelationTypes.has(relationType)) {
        addIssue(issues, record.file, record.id, `relatedRisks[${index}].relation 非法: ${relationType}`);
      }
      const fingerprint = `${ref}:${relationType}`;
      if (seen.has(fingerprint)) {
        addIssue(issues, record.file, record.id, `relatedRisks 存在重复关系: ${fingerprint}`);
      }
      seen.add(fingerprint);
    }
  }
}

for (const record of attackTools) {
  for (const field of ["directCauseRisks", "indirectSupportRisks"]) {
    if (!Array.isArray(record.entity[field]) || record.entity[field].length === 0) {
      addIssue(issues, record.file, record.id, `${field} 不能为空`);
    }
    checkRefs(issues, record, field, riskIds, "Risk");
  }

  if (!Array.isArray(record.entity.avoidances) || record.entity.avoidances.length === 0) {
    addIssue(issues, record.file, record.id, "avoidances 不能为空");
  }
  checkRefs(issues, record, "avoidances", avoidanceIds, "Avoidance");

  const relatedAttackTools = record.entity.relatedAttackTools || [];
  if (!Array.isArray(relatedAttackTools)) {
    addIssue(issues, record.file, record.id, "relatedAttackTools 必须是数组");
  } else {
    const seen = new Set();
    for (const [index, relation] of relatedAttackTools.entries()) {
      const ref = relation?.key;
      const relationType = relation?.relation;
      if (!ref || !attackToolIds.has(ref)) {
        addIssue(issues, record.file, record.id, `relatedAttackTools[${index}].key 引用了不存在的 AttackTool: ${ref}`);
      }
      if (ref === record.id) {
        addIssue(issues, record.file, record.id, `relatedAttackTools[${index}].key 不能引用自身`);
      }
      if (!attackToolRelationTypes.has(relationType)) {
        addIssue(issues, record.file, record.id, `relatedAttackTools[${index}].relation 非法: ${relationType}`);
      }
      const fingerprint = `${ref}:${relationType}`;
      if (seen.has(fingerprint)) {
        addIssue(issues, record.file, record.id, `relatedAttackTools 存在重复关系: ${fingerprint}`);
      }
      seen.add(fingerprint);
    }
  }
}

for (const record of threatActors) {
  for (const field of ["directCauseRisks", "indirectSupportRisks"]) {
    if (!Array.isArray(record.entity[field]) || record.entity[field].length === 0) {
      addIssue(issues, record.file, record.id, `${field} 不能为空`);
    }
    checkRefs(issues, record, field, riskIds, "Risk");
  }

  checkRefs(issues, record, "buildAttackTools", attackToolIds, "AttackTool");
  checkRefs(issues, record, "useAttackTools", attackToolIds, "AttackTool");

  const relatedThreatActors = record.entity.relatedThreatActors || [];
  if (!Array.isArray(relatedThreatActors)) {
    addIssue(issues, record.file, record.id, "relatedThreatActors 必须是数组");
  } else {
    const seen = new Set();
    for (const [index, relation] of relatedThreatActors.entries()) {
      const ref = relation?.key;
      const relationType = relation?.relation;
      if (!ref || !threatActorIds.has(ref)) {
        addIssue(issues, record.file, record.id, `relatedThreatActors[${index}].key 引用了不存在的 ThreatActor: ${ref}`);
      }
      if (ref === record.id) {
        addIssue(issues, record.file, record.id, `relatedThreatActors[${index}].key 不能引用自身`);
      }
      if (!threatActorRelationTypes.has(relationType)) {
        addIssue(issues, record.file, record.id, `relatedThreatActors[${index}].relation 非法: ${relationType}`);
      }
      const fingerprint = `${ref}:${relationType}`;
      if (seen.has(fingerprint)) {
        addIssue(issues, record.file, record.id, `relatedThreatActors 存在重复关系: ${fingerprint}`);
      }
      seen.add(fingerprint);
    }
  }
}

for (const record of terms) {
  checkRefs(issues, record, "relatedRisks", riskIds, "Risk");
  checkRefs(issues, record, "relatedAvoidances", avoidanceIds, "Avoidance");
  checkRefs(issues, record, "relatedAttackTools", attackToolIds, "AttackTool");
  checkRefs(issues, record, "relatedThreatActors", threatActorIds, "ThreatActor");
  checkRefs(issues, record, "relatedBusinessScenes", sceneIds, "BusinessScene");

  for (const field of [
    "aliases",
    "relatedRisks",
    "relatedAvoidances",
    "relatedAttackTools",
    "relatedThreatActors",
    "relatedBusinessScenes",
  ]) {
    if (!Array.isArray(record.entity[field])) {
      addIssue(issues, record.file, record.id, `${field} 必须显式声明为数组`);
    }
  }
}

for (const record of cases) {
  if (!Array.isArray(record.entity.relatedRisks) || record.entity.relatedRisks.length === 0) {
    addIssue(issues, record.file, record.id, "relatedRisks 不能为空");
  }
  checkRefs(issues, record, "relatedRisks", riskIds, "Risk");
  checkRefs(issues, record, "relatedAttackTools", attackToolIds, "AttackTool");
  checkRefs(issues, record, "relatedThreatActors", threatActorIds, "ThreatActor");
}

for (const ref of businessSceneRiskRefs) {
  if (!riskIds.has(ref)) {
    issues.push(`src/BREAK/business-scenes: riskScenes 引用了不存在的 Risk: ${ref}`);
  }
}

const referencedAvoidances = new Set([
  ...risks.flatMap(({ entity }) => entity.avoidances || []),
  ...attackTools.flatMap(({ entity }) => entity.avoidances || []),
]);
for (const { id, entity, file } of avoidances) {
  if (!referencedAvoidances.has(id)) {
    addIssue(issues, file, id, `未被 Risk/AttackTool 引用: ${entity.title}`);
  }
}

const referencedMainRisks = new Set([
  ...businessSceneRiskRefs,
  ...attackTools.flatMap(({ entity }) => [
    ...(entity.directCauseRisks || []),
    ...(entity.indirectSupportRisks || []),
  ]),
  ...threatActors.flatMap(({ entity }) => [
    ...(entity.directCauseRisks || []),
    ...(entity.indirectSupportRisks || []),
  ]),
]);
for (const { id, entity, file } of risks) {
  if (!id.includes("-") && !referencedMainRisks.has(id)) {
    addIssue(issues, file, id, `主风险未被场景/工具/行为者引用: ${entity.title}`);
  }
}

for (const issue of validateDerivedRelationNotes({ risks, avoidances, attackTools, threatActors })) {
  const records = issue.entity === "Avoidance" ? avoidances : attackTools;
  const record = records.find((item) => item.id === issue.sourceKey);
  addIssue(
    issues,
    record?.file || `src/BREAK/${issue.entity}`,
    issue.sourceKey,
    `${issue.field}[${issue.index}].note 与当前关系数据不一致: ${issue.sourceKey} -> ${issue.targetKey}; 当前="${issue.note}"; 应为="${issue.expected}"`,
  );
}

for (const issue of validateDerivedRelationTop6({ risks, avoidances, attackTools, threatActors })) {
  const records = issue.entity === "Avoidance" ? avoidances : attackTools;
  const record = records.find((item) => item.id === issue.sourceKey);
  addIssue(
    issues,
    record?.file || `src/BREAK/${issue.entity}`,
    issue.sourceKey,
    `${issue.field} 不是按共同连接数派生的 top6: 当前 ${issue.actualCount} 条，应为 ${issue.expectedCount} 条；请运行 npm run sync:lateral-relations`,
  );
}

if (issues.length > 0) {
  console.error(`\n❌ 实体关系质量检查失败，共 ${issues.length} 个问题`);
  for (const issue of issues.slice(0, 120)) {
    console.error(`- ${issue}`);
  }
  if (issues.length > 120) {
    console.error(`... 另有 ${issues.length - 120} 个问题未显示`);
  }
  process.exit(1);
}

console.log("\n✅ 实体关系质量检查通过");
console.log(`avoidanceCategories=${avoidanceCategoryIds.size}`);
console.log(`risks=${risks.length}, avoidances=${avoidances.length}, attackTools=${attackTools.length}`);
console.log(`threatActors=${threatActors.length}, terms=${terms.length}, businessScenes=${businessScenes.length}`);
console.log(`cases=${cases.length}`);
