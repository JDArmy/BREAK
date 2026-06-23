import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { projectRoot, readJson } from '../search/common.mjs';

const packageJson = readJson(path.join(projectRoot, 'package.json'));
const publicDataPath = path.join(projectRoot, 'public/data/break-data.json');
const publicManifestPath = path.join(projectRoot, 'public/data/break-manifest.json');
const publicQualityReportPath = path.join(projectRoot, 'public/data/quality-report.json');
const docsDataPath = path.join(projectRoot, 'dist/data/break-data.json');
const docsManifestPath = path.join(projectRoot, 'dist/data/break-manifest.json');
const docsQualityReportPath = path.join(projectRoot, 'dist/data/quality-report.json');

const expectedCounts = {
  risks: countRecords('src/BREAK/risks'),
  avoidances: countRecords('src/BREAK/avoidances'),
  attackTools: countRecords('src/BREAK/attack-tools'),
  threatActors: countRecords('src/BREAK/threat-actors'),
  terms: countRecords('src/BREAK/terms'),
  businessScenes: countRecords('src/BREAK/business-scenes'),
  avoidanceCategories: countRecords('src/BREAK/avoidance-categories'),
  cases: countRecords('src/BREAK/cases'),
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
const publicQualityReportText = readText(publicQualityReportPath, issues);
const docsDataText = readText(docsDataPath, issues);
const docsManifestText = readText(docsManifestPath, issues);
const docsQualityReportText = readText(docsQualityReportPath, issues);

if (publicDataText && docsDataText) {
  expectEqual(issues, 'dist data 与 public data 不一致', docsDataText, publicDataText);
}
if (publicManifestText && docsManifestText) {
  expectEqual(issues, 'dist manifest 与 public manifest 不一致', docsManifestText, publicManifestText);
}
if (publicQualityReportText && docsQualityReportText) {
  expectEqual(issues, 'dist quality-report 与 public quality-report 不一致', docsQualityReportText, publicQualityReportText);
}

let data;
let manifest;
let qualityReport;
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
try {
  qualityReport = JSON.parse(publicQualityReportText);
} catch (error) {
  issues.push(`public/data/quality-report.json 解析失败: ${error.message}`);
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

if (manifest && qualityReport) {
  expectEqual(issues, 'qualityReport.schemaVersion', qualityReport.schemaVersion, 1);
  expectEqual(issues, 'qualityReport.generatedAt', qualityReport.generatedAt, manifest.generatedAt);
  if (!Number.isInteger(qualityReport.embeddedIssueLimit) || qualityReport.embeddedIssueLimit <= 0) {
    issues.push('qualityReport.embeddedIssueLimit 必须是正整数');
  }
  for (const key of [
    'weakRelations',
    'missingCoverage',
    'sceneIssues',
    'i18nIssues',
    'referenceHealthIssues',
    'caseSourceIssues',
  ]) {
    if (!Array.isArray(qualityReport[key])) {
      issues.push(`qualityReport.${key} 必须是数组`);
    }
    expectEqual(
      issues,
      `qualityReport.summary.${key}.total`,
      qualityReport.summary?.[key]?.total,
      Array.isArray(qualityReport[key]) ? qualityReport[key].length : undefined,
    );
  }
  if (!qualityReport.sourceReports || typeof qualityReport.sourceReports !== 'object') {
    issues.push('qualityReport.sourceReports 必须是对象');
  }
  for (const key of ['referenceHealth', 'caseSourceQuality']) {
    if (!qualityReport.sourceReports?.[key] || typeof qualityReport.sourceReports[key] !== 'object') {
      issues.push(`qualityReport.sourceReports.${key} 必须是对象`);
    }
  }
  const qualityReportSha256 = crypto.createHash('sha256').update(publicQualityReportText).digest('hex');
  expectEqual(issues, 'manifest qualityReport sha256', manifest.files?.qualityReport?.sha256, qualityReportSha256);
  expectEqual(
    issues,
    'manifest qualityReport bytes',
    manifest.files?.qualityReport?.bytes,
    Buffer.byteLength(publicQualityReportText),
  );
  expectEqual(issues, 'manifest qualityReport path', manifest.files?.qualityReport?.path, 'data/quality-report.json');

  // STIX/JSON-LD 产物校验（存在时校验 sha256 一致性）
  const interopFiles = [
    { key: 'stixZh', publicFile: 'break-stix-zh.json', expectedPath: 'data/break-stix-zh.json' },
    { key: 'stixEn', publicFile: 'break-stix-en.json', expectedPath: 'data/break-stix-en.json' },
    { key: 'jsonldZh', publicFile: 'break-ld-zh.jsonld', expectedPath: 'data/break-ld-zh.jsonld' },
    { key: 'jsonldEn', publicFile: 'break-ld-en.jsonld', expectedPath: 'data/break-ld-en.jsonld' },
  ];
  for (const { key, publicFile, expectedPath } of interopFiles) {
    const filePath = path.join(projectRoot, 'public/data', publicFile);
    if (fs.existsSync(filePath) && manifest.files?.[key]) {
      const text = fs.readFileSync(filePath, 'utf8');
      const sha256 = crypto.createHash('sha256').update(text).digest('hex');
      expectEqual(issues, `manifest ${key} sha256`, manifest.files[key].sha256, sha256);
      expectEqual(issues, `manifest ${key} bytes`, manifest.files[key].bytes, Buffer.byteLength(text));
      expectEqual(issues, `manifest ${key} path`, manifest.files[key].path, expectedPath);
    }
  }
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
  `entities=${expectedCounts.risks.total}/${expectedCounts.avoidances.total}/${expectedCounts.attackTools.total}/${expectedCounts.threatActors.total}/${expectedCounts.terms.total}/${expectedCounts.businessScenes.total}/${expectedCounts.avoidanceCategories.total}/${expectedCounts.cases.total}`
);
