import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildRelationNoteContext,
  expectedAttackToolRelations,
  expectedAvoidanceRelations,
  expectedRiskRelationNote,
  expectedThreatActorRelations,
} from "./relation-note-utils.mjs";

const root = "src/BREAK";

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

function writeJson(filePath, data) {
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function loadFiles(dir) {
  const fullDir = join(root, dir);
  return readdirSync(fullDir)
    .filter((item) => item.endsWith(".json"))
    .sort()
    .map((file) => {
      const filePath = join(fullDir, file);
      return { filePath, data: readJson(filePath) };
    });
}

function records(files) {
  return files.flatMap(({ filePath, data }) =>
    Object.entries(data).map(([id, entity]) => ({ id, key: id, entity, filePath })),
  );
}

const riskFiles = loadFiles("risks");
const avoidanceFiles = loadFiles("avoidances");
const attackToolFiles = loadFiles("attack-tools");
const threatActorFiles = loadFiles("threat-actors");

const risks = records(riskFiles);
const avoidances = records(avoidanceFiles);
const attackTools = records(attackToolFiles);
const threatActors = records(threatActorFiles);
const context = buildRelationNoteContext({ risks, avoidances, attackTools, threatActors });

for (const source of avoidances) {
  source.entity.relatedAvoidances = expectedAvoidanceRelations(source.key, avoidances, context);
}

for (const source of attackTools) {
  source.entity.relatedAttackTools = expectedAttackToolRelations(source.key, attackTools, context);
}

for (const source of threatActors) {
  source.entity.relatedThreatActors = expectedThreatActorRelations(source.key, threatActors, context);
}

// Risk.relatedRisks：不重算 relation 类型（保留 prerequisite/escalation/variant/co-occurrence 语义），
// 只重算 note。派生 note 非空则覆盖；不可派生（expected 返回空）则保留手写 note。
// 校验 target key 存在，不存在则移除该 relation。仅当 relatedRisks 内容变化时落盘。
const riskValidKeys = new Set(risks.map((item) => item.key));
let riskDerivedNotes = 0;
let riskPreservedNotes = 0;
let riskRemovedRelations = 0;
const changedRiskFiles = new Set();

for (const source of risks) {
  const original = source.entity.relatedRisks || [];
  const next = [];
  for (const relation of original) {
    const targetKey = relation?.key;
    if (!targetKey || !riskValidKeys.has(targetKey)) {
      riskRemovedRelations++;
      continue;
    }
    const expected = expectedRiskRelationNote(source.key, targetKey, relation.relation, context);
    let note = relation.note;
    if (expected) {
      // 可派生：覆盖（无论原 note 是否手写，只要结构可派生就统一为派生 note）
      note = expected;
      riskDerivedNotes++;
    } else {
      // 不可派生：保留原 note（手写语义，如"在定义或描述中互相指向""同属风险场景"）
      riskPreservedNotes++;
    }
    next.push({ key: targetKey, relation: relation.relation, note });
  }
  if (JSON.stringify(next) !== JSON.stringify(original)) {
    source.entity.relatedRisks = next;
    changedRiskFiles.add(source.filePath);
  }
}

for (const { filePath, data } of [...avoidanceFiles, ...attackToolFiles, ...threatActorFiles]) {
  writeJson(filePath, data);
}

// Risk 文件单独写：只改 relatedRisks，不动其他字段。仅在变化时写。
for (const { filePath, data } of riskFiles) {
  if (changedRiskFiles.has(filePath)) {
    writeJson(filePath, data);
  }
}

console.log(`已同步规避手段横向关系: ${avoidances.length}/${avoidances.length}`);
console.log(`已同步攻击工具横向关系: ${attackTools.length}/${attackTools.length}`);
console.log(`已同步威胁行为者横向关系: ${threatActors.length}/${threatActors.length}`);
console.log(
  `已同步风险横向关系 note: 派生覆盖 ${riskDerivedNotes} 条，保留手写 ${riskPreservedNotes} 条，移除悬空 ${riskRemovedRelations} 条，改写 ${changedRiskFiles.size} 个文件`,
);
