/**
 * business-scene-coverage.mjs
 *
 * 校验专题业务场景（BS01+）的特有 Risk 是否在 BS00 全场景中归类。
 *
 * 问题：专题场景（如 BS19 具身智能）新建的特有 Risk 若只放专题场景、
 *       不归到 BS00 全场景，会导致全场景视图缺失这些风险，用户在
 *       BS00 找不到具身智能特有风险点。项目惯例（BS14 AI / BS16 IoT /
 *       BS17 元宇宙）均把特有 Risk 同时归到 BS00 的对应 RS。
 *
 * 检测：
 *   uncovered_specialty_risk — 专题场景中存在、但 BS00 全场景中缺失的 Risk
 *
 * 说明：
 *   - BS00 是全场景容器，收录跨行业通用风险与各专题场景的特有风险。
 *   - 专题场景的特有 Risk 应同时归到 BS00 的对应 RS（按风险语义选择
 *     最贴近的 RS，如 VLA 模型攻击归 RS13、IoT 固件归 RS19）。
 *   - 本脚本与 business-scenes.mjs 互补：后者校验 Risk 跨 RS 归类的
 *     合理性，本脚本校验专题特有 Risk 在全场景的覆盖完整性。
 *
 * 用法：
 *   node scripts/validate/business-scene-coverage.mjs
 */

import fs from 'fs';
import path from 'path';
import { projectRoot, readJson } from '../search/common.mjs';

const bsDir = path.join(projectRoot, 'src/BREAK/business-scenes');

/** 加载所有 BS 文件，返回 [{ fileName, bsId, data }] */
function loadBusinessSceneFiles() {
  return fs
    .readdirSync(bsDir)
    .filter((f) => f.startsWith('BS') && f.endsWith('.json'))
    .sort()
    .map((f) => {
      const data = readJson(path.join(bsDir, f));
      const bsId = Object.keys(data)[0];
      return { fileName: f, bsId, data };
    });
}

/** 收集某 BS 中所有 RS 引用的 Risk（去重） */
function collectRisks(bs) {
  const risks = new Set();
  for (const rs of Object.values(bs.riskScenes || {})) {
    for (const r of rs.risks || []) risks.add(r);
  }
  for (const r of bs.risks || []) risks.add(r);
  return risks;
}

function run() {
  const files = loadBusinessSceneFiles();

  // 收集 BS00 全场景的 Risk 集合
  let bs00Risks = new Set();
  const specialtyFiles = [];
  for (const f of files) {
    if (f.bsId === 'BS00') {
      bs00Risks = collectRisks(f.data['BS00']);
    } else {
      specialtyFiles.push(f);
    }
  }

  if (bs00Risks.size === 0) {
    console.error('❌ 未找到 BS00 全场景文件，无法校验覆盖性');
    process.exitCode = 1;
    return;
  }

  let totalUncovered = 0;
  const details = [];

  for (const { fileName, bsId, data } of specialtyFiles) {
    const bs = data[bsId];
    const specialtyRisks = collectRisks(bs);
    for (const r of specialtyRisks) {
      // 仅校验父风险（不含 -001 子风险，子风险由父覆盖）
      if (r.includes('-')) continue;
      if (!bs00Risks.has(r)) {
        totalUncovered++;
        if (details.length < 30) {
          details.push(`  ${fileName} ${bsId}: ${r} 未归到 BS00 全场景`);
        }
      }
    }
  }

  if (totalUncovered === 0) {
    console.log(
      '✅ BusinessScene 全场景覆盖校验通过（专题场景特有 Risk 均已归到 BS00）',
    );
    return;
  }

  console.error(
    `❌ 发现 ${totalUncovered} 个专题场景特有 Risk 未归到 BS00 全场景`,
  );
  if (details.length > 0) {
    console.error('详情：');
    for (const d of details) console.error(d);
    if (totalUncovered > details.length) {
      console.error(`  ... 还有 ${totalUncovered - details.length} 个`);
    }
  }
  console.error(
    '修复：将专题场景的特有 Risk 按语义归到 BS00 的对应 RS（如 AI 模型攻击归 RS13、IoT 固件归 RS19、传感器归 RS21）。参见 CLAUDE.md BusinessScene 章节。',
  );

  process.exitCode = 1;
}

run();
