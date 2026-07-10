import fs from 'fs';
import path from 'path';
import { ensureDir, projectRoot, writeJson } from '../search/common.mjs';

const assetsDir = path.join(projectRoot, 'dist/assets');
const reportDir = path.join(projectRoot, 'research/search-reports');
const reportJsonPath = path.join(reportDir, 'bundle-budget.json');
const reportMdPath = path.join(reportDir, 'bundle-budget.md');
const noFail = process.argv.includes('--no-fail');
const checkOnly = process.argv.includes('--check-only');

const budgets = {
  maxJsChunkBytes: 800 * 1024,
  maxDataChunkBytes: 900 * 1024,
  echartsBytes: 500 * 1024,
  zrenderBytes: 220 * 1024,
  elementPlusBytes: 420 * 1024,
  entryBytes: 180 * 1024,
};

function isDataChunk(asset) {
  return (
    asset.type === 'js' &&
    (asset.file.startsWith('BREAK-') ||
      asset.file.startsWith('i18n-en-') ||
      asset.file.startsWith('en-full-') ||
      asset.file.startsWith('useCases-'))
  );
}

function formatKb(bytes) {
  return Number((bytes / 1024).toFixed(2));
}

function listAssets() {
  if (!fs.existsSync(assetsDir)) {
    throw new Error('dist/assets 不存在，请先运行 npm run build-only');
  }

  return fs
    .readdirSync(assetsDir)
    .filter((file) => file.endsWith('.js') || file.endsWith('.css'))
    .map((file) => {
      const filePath = path.join(assetsDir, file);
      const stat = fs.statSync(filePath);
      return {
        file,
        type: file.endsWith('.js') ? 'js' : 'css',
        bytes: stat.size,
        kb: formatKb(stat.size),
      };
    })
    .sort((a, b) => b.bytes - a.bytes);
}

function findAsset(assets, prefix) {
  return assets.find((asset) => asset.file.startsWith(prefix));
}

function addIssue(issues, type, message, asset, budgetBytes) {
  issues.push({
    type,
    message,
    file: asset?.file,
    kb: asset ? formatKb(asset.bytes) : undefined,
    budgetKb: formatKb(budgetBytes),
  });
}

function buildReport() {
  const assets = listAssets();
  const jsAssets = assets.filter((asset) => asset.type === 'js');
  const appJsAssets = jsAssets.filter((asset) => !isDataChunk(asset));
  const dataJsAssets = jsAssets.filter(isDataChunk);
  const largestJs = jsAssets[0];
  const largestAppJs = appJsAssets[0];
  const largestDataJs = dataJsAssets[0];
  const echarts = findAsset(assets, 'echarts-');
  const zrender = findAsset(assets, 'zrender-');
  const elementPlus = findAsset(assets, 'element-plus-');
  const entry = findAsset(assets, 'index-');
  const issues = [];

  if (largestAppJs && largestAppJs.bytes > budgets.maxJsChunkBytes) {
    addIssue(
      issues,
      'max_js_chunk_exceeded',
      `最大应用 JS chunk 超过 ${formatKb(budgets.maxJsChunkBytes)} kB`,
      largestAppJs,
      budgets.maxJsChunkBytes,
    );
  }
  // 检查所有超阈值的数据 chunk（而非仅最大的），避免修了最大的、第二大的接力触发却未被报告
  for (const dataAsset of dataJsAssets) {
    if (dataAsset.bytes > budgets.maxDataChunkBytes) {
      addIssue(
        issues,
        'max_data_chunk_exceeded',
        `数据 JS chunk 超过 ${formatKb(budgets.maxDataChunkBytes)} kB`,
        dataAsset,
        budgets.maxDataChunkBytes,
      );
    }
  }
  if (echarts && echarts.bytes > budgets.echartsBytes) {
    addIssue(issues, 'echarts_budget_exceeded', 'ECharts chunk 超出预算', echarts, budgets.echartsBytes);
  }
  if (zrender && zrender.bytes > budgets.zrenderBytes) {
    addIssue(issues, 'zrender_budget_exceeded', 'ZRender chunk 超出预算', zrender, budgets.zrenderBytes);
  }
  if (elementPlus && elementPlus.bytes > budgets.elementPlusBytes) {
    addIssue(issues, 'element_plus_budget_exceeded', 'Element Plus chunk 超出预算', elementPlus, budgets.elementPlusBytes);
  }
  if (entry && entry.bytes > budgets.entryBytes) {
    addIssue(issues, 'entry_budget_exceeded', '入口 chunk 超出预算', entry, budgets.entryBytes);
  }

  return {
    generatedAt: new Date().toISOString(),
    budgets: Object.fromEntries(Object.entries(budgets).map(([key, value]) => [key, formatKb(value)])),
    summary: {
      assetCount: assets.length,
      jsCount: jsAssets.length,
      largestJs,
      largestAppJs,
      largestDataJs,
      echarts,
      zrender,
      elementPlus,
      entry,
    },
    topAssets: assets.slice(0, 12),
    issues,
  };
}

function renderMarkdown(report) {
  const lines = [
    '# BREAK Bundle 预算报告',
    '',
    `生成时间: ${report.generatedAt}`,
    '',
    '## 预算',
    '',
    '| 项目 | kB |',
    '| --- | ---: |',
  ];

  for (const [key, value] of Object.entries(report.budgets)) {
    lines.push(`| ${key} | ${value} |`);
  }

  lines.push('', '## 最大资源', '');
  lines.push('| 文件 | 类型 | kB |');
  lines.push('| --- | --- | ---: |');
  for (const asset of report.topAssets) {
    lines.push(`| ${asset.file} | ${asset.type} | ${asset.kb} |`);
  }

  lines.push('', '## 问题', '');
  if (report.issues.length === 0) {
    lines.push('未发现 bundle 预算问题。');
  } else {
    for (const issue of report.issues) {
      lines.push(`- [${issue.type}] ${issue.message}: ${issue.file} ${issue.kb} kB / budget ${issue.budgetKb} kB`);
    }
  }

  return `${lines.join('\n')}\n`;
}

const report = buildReport();
if (!checkOnly) {
  ensureDir(reportDir);
  writeJson(reportJsonPath, report);
  fs.writeFileSync(reportMdPath, renderMarkdown(report));
}

console.log('\n=== BREAK Bundle 预算报告 ===\n');
console.log(`assets=${report.summary.assetCount}, js=${report.summary.jsCount}`);
console.log(`largestJs=${report.summary.largestJs?.file || 'n/a'} ${report.summary.largestJs?.kb || 0}kB`);
console.log(`largestAppJs=${report.summary.largestAppJs?.file || 'n/a'} ${report.summary.largestAppJs?.kb || 0}kB`);
console.log(`largestDataJs=${report.summary.largestDataJs?.file || 'n/a'} ${report.summary.largestDataJs?.kb || 0}kB`);
console.log(`issues=${report.issues.length}`);
if (checkOnly) {
  console.log('\ncheckOnly=true，未刷新报告文件');
} else {
  console.log(`\n报告已保存到: ${reportMdPath}`);
}

if (report.issues.length > 0 && !noFail) {
  process.exitCode = 1;
}
