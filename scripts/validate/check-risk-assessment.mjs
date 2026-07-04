#!/usr/bin/env node
/**
 * 风险分级评估只读校验器（接入 validate:data）
 *
 * 校验规则（有 riskAssessment 时）：
 *   1. 5 维度枚举合法（low/medium/high/critical）
 *   2. observables 非空数组，每条 ≥6 字，无重复（防空泛占位）
 *   3. assessedAt 格式 YYYY-MM-DD
 *   4. priorityOverride === true 时 priorityNote 必填
 *   5. priority 存在时必须合法；未 override 时必须等于 computePriority
 *      （priority 缺失视为「待 sync」，仅警告不阻断——回填阶段可缺）
 *   6. 英文 i18n 文件的 riskAssessment 只允许含 observables/priorityNote
 *      （防止英文误填 priority/likelihood 等结构字段覆盖中文值）
 *
 * 未回填 riskAssessment 的实体不报错（渐进补全中），仅统计覆盖率。
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  computePriority,
  PRIORITY_LEVELS,
  SEVERITY_LEVELS,
  ASSESSMENT_TRANSLATABLE_KEYS,
} from "./risk-assessment-utils.mjs";

const zhDir = "src/BREAK/risks";
const enDir = "src/i18n/en/BREAK/risks";

const issues = [];
const warnings = [];
let assessed = 0;
let total = 0;

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

function checkDimensions(id, a) {
  const dims = {
    likelihood: a.likelihood,
    businessLoss: a.businessLoss,
    attackCost: a.attackCost,
    detectionDifficulty: a.detectionDifficulty,
    defenseMaturity: a.defenseMaturity,
  };
  for (const [dim, val] of Object.entries(dims)) {
    if (!SEVERITY_LEVELS.includes(val)) {
      issues.push(`${id}.riskAssessment.${dim}: 非法枚举值 "${val}"`);
    }
  }
}

function checkObservables(id, a) {
  if (!Array.isArray(a.observables)) {
    issues.push(`${id}.riskAssessment.observables: 必须是数组`);
    return;
  }
  if (a.observables.length === 0) {
    issues.push(`${id}.riskAssessment.observables: 不能为空`);
    return;
  }
  const seen = new Set();
  for (const [i, obs] of a.observables.entries()) {
    if (typeof obs !== "string" || obs.trim().length < 6) {
      issues.push(`${id}.riskAssessment.observables[${i}]: 过短或空泛（≥6 字）"${String(obs).slice(0, 20)}"`);
    }
    const key = obs.trim();
    if (seen.has(key)) {
      issues.push(`${id}.riskAssessment.observables[${i}]: 与前条重复`);
    }
    seen.add(key);
  }
}

function checkAssessedAt(id, a) {
  if (a.assessedAt && !/^\d{4}-\d{2}-\d{2}$/.test(a.assessedAt)) {
    issues.push(`${id}.riskAssessment.assessedAt: 格式必须 YYYY-MM-DD，当前 "${a.assessedAt}"`);
  }
}

// 1. 校验中文源
const files = readdirSync(zhDir)
  .filter((f) => /^R\d{4}\.json$/.test(f))
  .sort();

// 中文源 observables map：在主循环中顺手填充，供英文长度对比（避免第二次遍历同批文件）
const zhObservablesById = new Map();

for (const file of files) {
  const data = readJson(join(zhDir, file));
  for (const [id, entity] of Object.entries(data)) {
    total++;
    const a = entity.riskAssessment;
    if (!a) continue; // 未回填，跳过
    assessed++;

    // 顺手记录中文 observables，供英文长度对比
    if (Array.isArray(a.observables)) {
      zhObservablesById.set(id, a.observables);
    }

    checkDimensions(id, a);
    checkObservables(id, a);
    checkAssessedAt(id, a);

    // 回填了 riskAssessment 但实体缺 updated（CLAUDE.md 要求改实体同步 updated）
    if (!entity.updated) {
      warnings.push(`${id}: 有 riskAssessment 但缺 updated（应同步更新）`);
    }

    if (a.priorityOverride === true) {
      if (!a.priorityNote) {
        issues.push(`${id}.riskAssessment: priorityOverride=true 但缺 priorityNote（覆盖需说明理由）`);
      }
      // 覆盖时 priority 仍需合法
      if (a.priority && !PRIORITY_LEVELS.includes(a.priority)) {
        issues.push(`${id}.riskAssessment.priority: 非法值 "${a.priority}"`);
      }
      continue;
    }

    // 非 override：priority 可缺失（待 sync），但有值就必须合法且与公式一致
    if (a.priority === undefined || a.priority === null) {
      warnings.push(`${id}.riskAssessment.priority: 缺失（请运行 npm run sync:risk-assessment 计算）`);
      continue;
    }
    if (!PRIORITY_LEVELS.includes(a.priority)) {
      issues.push(`${id}.riskAssessment.priority: 非法值 "${a.priority}"`);
      continue;
    }
    const expected = computePriority(a);
    if (a.priority !== expected) {
      issues.push(
        `${id}.riskAssessment.priority: 值 ${a.priority} 与公式计算 ${expected} 不一致，请运行 npm run sync:risk-assessment`
      );
    }
  }
}

// 2. 校验英文 i18n 文件 riskAssessment 只含可翻译字段
//    并校验英文 observables 与中文源长度一致（mergeWithStructure 按索引合并，长度不一致会错配）
if (existsSync(enDir)) {
  const enFiles = readdirSync(enDir).filter((f) => /^R\d{4}\.json$/.test(f)).sort();
  for (const file of enFiles) {
    const data = readJson(join(enDir, file));
    for (const [id, entity] of Object.entries(data)) {
      const a = entity.riskAssessment;
      if (!a) continue;
      const extra = Object.keys(a).filter((k) => !ASSESSMENT_TRANSLATABLE_KEYS.includes(k));
      if (extra.length > 0) {
        issues.push(
          `${id} (en): riskAssessment 含非法结构字段 ${extra.join(", ")}（英文只允许维护 ${ASSESSMENT_TRANSLATABLE_KEYS.join("/")},）`
        );
      }
      // 英文 observables 与中文源长度一致（mergeWithStructure 按索引合并，长度不一致会错配）
      if (Array.isArray(a.observables)) {
        const zhObs = zhObservablesById.get(id);
        if (!zhObs) {
          // 中文源无 riskAssessment.observables 但英文有：英文 observables 成孤儿（mergeWithStructure 无中文基底可合并）
          issues.push(
            `${id} (en): riskAssessment.observables 在中文源无对应（中文无 riskAssessment.observables，英文为孤儿数据）`
          );
        } else if (a.observables.length !== zhObs.length) {
          issues.push(
            `${id} (en): riskAssessment.observables 长度不一致: 中文 ${zhObs.length} 条, 英文 ${a.observables.length} 条`
          );
        }
      }
    }
  }
}

console.log(`\n=== 风险分级评估检查 ===\n`);
const coverage = total > 0 ? ((assessed / total) * 100).toFixed(1) : "0";
console.log(`已评估: ${assessed}/${total} (${coverage}%)`);
console.log(`问题数: ${issues.length}`);
if (warnings.length > 0) {
  console.log(`警告数: ${warnings.length}（priority 待 sync，非阻断）`);
}
console.log("");

if (issues.length > 0) {
  console.log(`❌ 风险分级评估存在 ${issues.length} 个问题：\n`);
  for (const issue of issues.slice(0, 80)) {
    console.log(`- ${issue}`);
  }
  if (issues.length > 80) {
    console.log(`\n  ...另有 ${issues.length - 80} 个问题未显示`);
  }
  process.exit(1);
} else {
  console.log(`✅ 风险分级评估校验通过`);
}

