/**
 * business-scene-sub-risks.mjs
 *
 * 校验（默认）+ 修复（--fix）BusinessScene 中的子风险重复问题。
 *
 * 问题：riskScenes[].risks 同时列出父风险和子风险时，前端 useSubRiskToggle
 *       会在父风险展开时自动显示子风险，导致子风险在 UI 上出现两次。
 *
 * 检测问题：
 *   parent_child_duplicate — 父子同时存在于同一 riskScene（--fix 可自动移除子风险）
 *
 * 用法：
 *   node scripts/validate/business-scene-sub-risks.mjs          # 校验模式
 *   node scripts/validate/business-scene-sub-risks.mjs --fix     # 修复模式
 */

import fs from 'fs';
import path from 'path';
import { projectRoot, readJson, writeJson } from '../search/common.mjs';

const fix = process.argv.includes('--fix');
const bsDir = path.join(projectRoot, 'src/BREAK/business-scenes');

/** 加载所有 BS 文件，返回 [{ filePath, bsId, data }] */
function loadBusinessSceneFiles() {
  return fs
    .readdirSync(bsDir)
    .filter((f) => f.startsWith('BS') && f.endsWith('.json'))
    .sort()
    .map((f) => {
      const filePath = path.join(bsDir, f);
      const data = readJson(filePath);
      const bsId = Object.keys(data)[0];
      return { filePath, fileName: f, bsId, data };
    });
}

function run() {
  const files = loadBusinessSceneFiles();

  let totalDuplicates = 0;
  let totalFixed = 0;
  const duplicateDetails = [];

  for (const { filePath, fileName, bsId, data } of files) {
    const bs = data[bsId];
    const riskScenes = bs.riskScenes || {};
    let fileModified = false;

    for (const [rsId, rsData] of Object.entries(riskScenes)) {
      const risks = rsData.risks || [];
      const risksSet = new Set(risks);
      const toRemove = [];

      for (const riskId of risks) {
        if (!riskId.includes('-')) continue;
        const parent = riskId.split('-')[0];

        if (risksSet.has(parent)) {
          // 父子同时存在
          totalDuplicates++;
          toRemove.push(riskId);
          if (duplicateDetails.length < 10) {
            duplicateDetails.push(
              `  ${fileName} ${rsId}(${rsData.title}): ${parent} + ${riskId}`,
            );
          }
        }
      }

      if (fix && toRemove.length > 0) {
        const removeSet = new Set(toRemove);
        rsData.risks = risks.filter((r) => !removeSet.has(r));
        totalFixed += toRemove.length;
        fileModified = true;
      }
    }

    if (fix && fileModified) {
      writeJson(filePath, data);
    }
  }

  // 输出结果
  if (totalDuplicates === 0) {
    console.log('✅ BusinessScene 子风险校验通过（无父子重复）');
    return;
  }

  if (totalDuplicates > 0) {
    if (fix) {
      console.log(`✅ 已修复 ${totalFixed} 处父子重复（从 risks 数组移除了子风险 ID）`);
    } else {
      console.error(`❌ 发现 ${totalDuplicates} 处父子重复（父风险和子风险同时存在于 riskScene.risks）`);
      if (duplicateDetails.length > 0) {
        console.error('示例：');
        for (const d of duplicateDetails) console.error(d);
        if (totalDuplicates > duplicateDetails.length) {
          console.error(`  ... 还有 ${totalDuplicates - duplicateDetails.length} 处`);
        }
      }
      console.error('运行 node scripts/validate/business-scene-sub-risks.mjs --fix 自动修复');
    }
  }

  // 父子重复在非 fix 模式下视为失败
  if (totalDuplicates > 0 && !fix) {
    process.exitCode = 1;
  }
}

run();
