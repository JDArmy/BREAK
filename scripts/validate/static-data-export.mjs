import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { projectRoot, readJson } from '../search/common.mjs';

const packageJson = readJson(path.join(projectRoot, 'package.json'));
const publicDataPath = path.join(projectRoot, 'public/data/break-data.json');
const publicManifestPath = path.join(projectRoot, 'public/data/break-manifest.json');
const docsDataPath = path.join(projectRoot, 'docs/data/break-data.json');
const docsManifestPath = path.join(projectRoot, 'docs/data/break-manifest.json');

const expectedCounts = {
  risks: countRecords('src/BREAK/risks'),
  avoidances: countRecords('src/BREAK/avoidances'),
  attackTools: countRecords('src/BREAK/attack-tools'),
  threatActors: countRecords('src/BREAK/threat-actors'),
  terms: countRecords('src/BREAK/terms'),
  businessScenes: countRecords('src/BREAK/business-scenes'),
  avoidanceCategories: countRecords('src/BREAK/avoidance-categories'),
};

function countRecords(relativeDir) {
  const dir = path.join(projectRoot, relativeDir);
  const keys = fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .flatMap((file) => Object.keys(readJson(path.join(dir, file))));
  const main = keys.filter((key) => !key.includes('-')).length;
  return {
    main,
    sub: keys.length - main,
    total: keys.length,
  };
}

function readText(filePath, issues) {
  if (!fs.existsSync(filePath)) {
    issues.push(`缺少文件: ${path.relative(projectRoot, filePath)}`);
    return '';
  }
  return fs.readFileSync(filePath, 'utf8');
}

function expectEqual(issues, label, actual, expected) {
  if (actual !== expected) {
    issues.push(`${label}: expected=${expected}, actual=${actual}`);
  }
}

function expectDeepEqual(issues, label, actual, expected) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    issues.push(`${label}: expected=${JSON.stringify(expected)}, actual=${JSON.stringify(actual)}`);
  }
}

const issues = [];
const publicDataText = readText(publicDataPath, issues);
const publicManifestText = readText(publicManifestPath, issues);
const docsDataText = readText(docsDataPath, issues);
const docsManifestText = readText(docsManifestPath, issues);

if (publicDataText && docsDataText) {
  expectEqual(issues, 'docs data 与 public data 不一致', docsDataText, publicDataText);
}
if (publicManifestText && docsManifestText) {
  expectEqual(issues, 'docs manifest 与 public manifest 不一致', docsManifestText, publicManifestText);
}

let data;
let manifest;
try {
  data = JSON.parse(publicDataText);
} catch (error) {
  issues.push(`public/data/break-data.json 解析失败: ${error.message}`);
}
try {
  manifest = JSON.parse(publicManifestText);
} catch (error) {
  issues.push(`public/data/break-manifest.json 解析失败: ${error.message}`);
}

if (data && manifest) {
  expectEqual(issues, 'data.schemaVersion', data.schemaVersion, 1);
  expectEqual(issues, 'manifest.schemaVersion', manifest.schemaVersion, 1);
  expectEqual(issues, 'data.packageVersion', data.packageVersion, packageJson.version);
  expectEqual(issues, 'manifest.packageVersion', manifest.packageVersion, packageJson.version);
  expectEqual(issues, 'data.locale', data.locale, 'zh-CN');
  expectEqual(issues, 'manifest.locale', manifest.locale, 'zh-CN');
  expectDeepEqual(issues, 'manifest.counts', manifest.counts, expectedCounts);

  for (const [key, expected] of Object.entries(expectedCounts)) {
    expectEqual(issues, `data.data.${key} count`, Object.keys(data.data?.[key] || {}).length, expected.total);
  }

  const dataSha256 = crypto.createHash('sha256').update(publicDataText).digest('hex');
  expectEqual(issues, 'manifest data sha256', manifest.files?.data?.sha256, dataSha256);
  expectEqual(issues, 'manifest data bytes', manifest.files?.data?.bytes, Buffer.byteLength(publicDataText));
  expectEqual(issues, 'manifest data path', manifest.files?.data?.path, 'data/break-data.json');
}

if (issues.length > 0) {
  console.error('\n❌ 静态数据导出校验失败\n');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log('\n✅ 静态数据导出校验通过');
console.log(
  `entities=${expectedCounts.risks.total}/${expectedCounts.avoidances.total}/${expectedCounts.attackTools.total}/${expectedCounts.threatActors.total}/${expectedCounts.terms.total}/${expectedCounts.businessScenes.total}/${expectedCounts.avoidanceCategories.total}`
);
