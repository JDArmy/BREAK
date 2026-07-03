/**
 * business-scene-dimensions.mjs
 *
 * 校验 BusinessScene 的 RiskScene 是否互斥归属到维度（riskDimensions）。
 *
 * 问题：riskDimensions[*].riskScenes 中同一 RS 出现在多个维度时，前端
 *       useHomeSceneLayout 按维度展开 RS，会在每个维度下各渲染一次场景
 *       卡片，导致 UI 重复。项目规范要求 RS 互斥归属一个维度（BS13 等
 *       现有场景均如此）。
 *
 * 检测：
 *   cross_dimension_riskscene — 同一 RS 出现在多个 riskDimensions 中
 *
 * 说明：
 *   - 这是数据设计纪律问题，修复需人工判断 RS 应归属哪个维度，故不提供
 *     --fix 自动修复（与 business-scene-sub-risks.mjs 的父子重复不同）。
 *   - business-scenes.mjs 校验 riskScenes 层的跨场景归类（Risk 跨 RS），
 *     本脚本校验 riskDimensions 层的 RS 跨维度复用，两者互补。
 *
 * 用法：
 *   node scripts/validate/business-scene-dimensions.mjs
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

function run() {
  const files = loadBusinessSceneFiles();

  let totalDuplicates = 0;
  const details = [];

  for (const { fileName, bsId, data } of files) {
    const bs = data[bsId];
    const riskDimensions = bs.riskDimensions || {};

    // 统计每个 RS 出现在哪些维度
    const rsToDims = new Map();
    for (const [rdId, rdData] of Object.entries(riskDimensions)) {
      for (const rsId of rdData.riskScenes || []) {
        if (!rsToDims.has(rsId)) rsToDims.set(rsId, []);
        rsToDims.get(rsId).push(rdId);
      }
    }

    // 找出跨维度复用的 RS
    for (const [rsId, dims] of rsToDims) {
      if (dims.length > 1) {
        totalDuplicates++;
        const rsTitle = bs.riskScenes?.[rsId]?.title || rsId;
        if (details.length < 20) {
          details.push(
            `  ${fileName} ${bsId} ${rsId}(${rsTitle}): 出现在 ${dims.join(', ')} 共 ${dims.length} 个维度`,
          );
        }
      }
    }
  }

  if (totalDuplicates === 0) {
    console.log('✅ BusinessScene 维度互斥校验通过（无 RS 跨维度复用）');
    return;
  }

  console.error(
    `❌ 发现 ${totalDuplicates} 处 RS 跨维度复用（同一 RS 出现在多个 riskDimensions，会导致前端场景卡片重复渲染）`,
  );
  if (details.length > 0) {
    console.error('详情：');
    for (const d of details) console.error(d);
    if (totalDuplicates > details.length) {
      console.error(`  ... 还有 ${totalDuplicates - details.length} 处`);
    }
  }
  console.error(
    '修复：为每个跨维度 RS 选一个最主要归属维度，从其他维度的 riskScenes 中移除该 RS。参见 CLAUDE.md BusinessScene 章节。',
  );

  process.exitCode = 1;
}

run();
