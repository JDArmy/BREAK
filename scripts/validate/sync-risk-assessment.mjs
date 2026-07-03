#!/usr/bin/env node
/**
 * 同步风险分级优先级（写回脚本）
 *
 * 遍历所有 Risk 实体：
 *   - 无 riskAssessment → 跳过（未回填，渐进补全中）
 *   - priorityOverride === true → 尊重专家覆盖，只校验 priority 合法 + priorityNote 必填，不重算
 *   - 否则 → 用 computePriority 计算 priority 并写回（仅当值变化才落盘）
 *
 * 仅写 Risk 文件（横向关系脚本此前只读 Risk，本脚本首次写 Risk 文件）。
 * 不改 updated（updated 由回填方维护，本脚本只重算 priority）。
 *
 * 用法：npm run sync:risk-assessment
 */

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { computePriority, PRIORITY_LEVELS } from "./risk-assessment-utils.mjs";

const root = "src/BREAK/risks";

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

function writeJson(filePath, data) {
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

const files = readdirSync(root)
  .filter((f) => /^R\d{4}\.json$/.test(f))
  .sort();

let computed = 0;
let overridden = 0;
let skipped = 0;
let changedFiles = 0;

for (const file of files) {
  const filePath = join(root, file);
  const data = readJson(filePath);
  let fileChanged = false;

  for (const [id, entity] of Object.entries(data)) {
    const a = entity.riskAssessment;
    if (!a) {
      skipped++;
      continue;
    }

    const dims = [a.likelihood, a.businessLoss, a.attackCost, a.detectionDifficulty, a.defenseMaturity];
    if (dims.some((d) => !d)) {
      console.error(`⚠️  ${id}: riskAssessment 缺少维度评分，跳过`);
      skipped++;
      continue;
    }

    if (a.priorityOverride === true) {
      if (!PRIORITY_LEVELS.includes(a.priority)) {
        console.error(`❌ ${id}: priorityOverride=true 但 priority 非法: ${a.priority}`);
        process.exit(1);
      }
      if (!a.priorityNote) {
        console.error(`❌ ${id}: priorityOverride=true 但缺 priorityNote（覆盖需说明理由）`);
        process.exit(1);
      }
      overridden++;
      continue;
    }

    const newPriority = computePriority(a);
    if (a.priority !== newPriority) {
      a.priority = newPriority;
      fileChanged = true;
    }
    computed++;
  }

  if (fileChanged) {
    writeJson(filePath, data);
    changedFiles++;
  }
}

console.log(`✅ 风险分级同步完成: 计算 ${computed}，覆盖 ${overridden}，跳过 ${skipped}，改写 ${changedFiles} 个文件`);
