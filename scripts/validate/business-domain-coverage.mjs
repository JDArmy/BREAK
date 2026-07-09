/**
 * business-domain-coverage.mjs
 *
 * 校验专题业务域（BD01+）的特有 Risk 是否在 BD00 全域中归类。
 *
 * 问题：专题域（如 BD19 具身智能）新建的特有 Risk 若只放专题域、
 *       不归到 BD00 全域，会导致全域视图缺失这些风险，用户在
 *       BD00 找不到具身智能特有风险点。项目惯例（BD14 AI / BD16 IoT /
 *       BD17 元宇宙）均把特有 Risk 同时归到 BD00 的对应 RS。
 *
 * 检测：
 *   uncovered_specialty_risk — 专题域中存在、但 BD00 全域中缺失的 Risk
 *
 * 说明：
 *   - BD00 是全域容器，收录跨行业通用风险与各专题域的特有风险。
 *   - 专题域的特有 Risk 应同时归到 BD00 的对应 RS（按风险语义选择
 *     最贴近的 RS，如 VLA 模型攻击归 RS13、IoT 固件归 RS19）。
 *   - 本脚本与 business-domains.mjs 互补：后者校验 Risk 跨 RS 归类的
 *     合理性，本脚本校验专题特有 Risk 在全域的覆盖完整性。
 *
 * 用法：
 *   node scripts/validate/business-domain-coverage.mjs
 */

import fs from 'fs';
import path from 'path';
import { projectRoot, readJson } from '../search/common.mjs';

const bdDir = path.join(projectRoot, 'src/BREAK/business-domains');

/** 加载所有 BD 文件，返回 [{ fileName, bdId, data }] */
function loadBusinessDomainFiles() {
  return fs
    .readdirSync(bdDir)
    .filter((f) => f.startsWith('BD') && f.endsWith('.json'))
    .sort()
    .map((f) => {
      const data = readJson(path.join(bdDir, f));
      const bdId = Object.keys(data)[0];
      return { fileName: f, bdId, data };
    });
}

/** 收集某 BD 中所有 RS 引用的 Risk（去重） */
function collectRisks(domain) {
  const risks = new Set();
  for (const rs of Object.values(domain.riskScenes || {})) {
    for (const r of rs.risks || []) risks.add(r);
  }
  for (const r of domain.risks || []) risks.add(r);
  return risks;
}

function run() {
  const files = loadBusinessDomainFiles();

  // 收集 BD00 全域的 Risk 集合
  let bd00Risks = new Set();
  const specialtyFiles = [];
  for (const f of files) {
    if (f.bdId === 'BD00') {
      bd00Risks = collectRisks(f.data['BD00']);
    } else {
      specialtyFiles.push(f);
    }
  }

  if (bd00Risks.size === 0) {
    console.error('❌ 未找到 BD00 全域文件，无法校验覆盖性');
    process.exitCode = 1;
    return;
  }

  let totalUncovered = 0;
  const details = [];

  for (const { fileName, bdId, data } of specialtyFiles) {
    const domain = data[bdId];
    const specialtyRisks = collectRisks(domain);
    for (const r of specialtyRisks) {
      // 仅校验父风险（不含 -001 子风险，子风险由父覆盖）
      if (r.includes('-')) continue;
      if (!bd00Risks.has(r)) {
        totalUncovered++;
        if (details.length < 30) {
          details.push(`  ${fileName} ${bdId}: ${r} 未归到 BD00 全域`);
        }
      }
    }
  }

  if (totalUncovered === 0) {
    console.log(
      '✅ BusinessDomain 全域覆盖校验通过（专题域特有 Risk 均已归到 BD00）',
    );
    return;
  }

  console.error(
    `❌ 发现 ${totalUncovered} 个专题域特有 Risk 未归到 BD00 全域`,
  );
  if (details.length > 0) {
    console.error('详情：');
    for (const d of details) console.error(d);
    if (totalUncovered > details.length) {
      console.error(`  ... 还有 ${totalUncovered - details.length} 个`);
    }
  }
  console.error(
    '修复：将专题域的特有 Risk 按语义归到 BD00 的对应 RS（如 AI 模型攻击归 RS13、IoT 固件归 RS19、传感器归 RS21）。参见 CLAUDE.md BusinessDomain 章节。',
  );

  process.exitCode = 1;
}

run();
