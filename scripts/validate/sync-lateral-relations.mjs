import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildRelationNoteContext,
  expectedAttackToolRelations,
  expectedAvoidanceRelations,
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
const context = buildRelationNoteContext({ risks, attackTools, threatActors });

for (const source of avoidances) {
  source.entity.relatedAvoidances = expectedAvoidanceRelations(source.key, avoidances, context);
}

for (const source of attackTools) {
  source.entity.relatedAttackTools = expectedAttackToolRelations(source.key, attackTools, context);
}

for (const { filePath, data } of [...avoidanceFiles, ...attackToolFiles]) {
  writeJson(filePath, data);
}

console.log(`已同步规避手段横向关系: ${avoidances.length}/${avoidances.length}`);
console.log(`已同步攻击工具横向关系: ${attackTools.length}/${attackTools.length}`);
