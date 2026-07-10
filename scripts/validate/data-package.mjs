import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { projectRoot, readJson } from '../search/common.mjs';

const packageJson = readJson(path.join(projectRoot, 'package.json'));
const packageDir = path.join(projectRoot, 'dist/break-data-package');
const packagePackagePath = path.join(packageDir, 'package.json');
const packageDataPath = path.join(packageDir, 'data/break-data.json');
const packageDataEnPath = path.join(packageDir, 'data/break-data-en.json');
const packageManifestPath = path.join(packageDir, 'data/break-manifest.json');
const packageQualityReportPath = path.join(packageDir, 'data/quality-report.json');
const packageRuntimePath = path.join(packageDir, 'index.js');
const packageTypesPath = path.join(packageDir, 'index.d.ts');
const packageReadmePath = path.join(packageDir, 'README.md');
const publicDataPath = path.join(projectRoot, 'public/data/break-data.json');
const publicDataEnPath = path.join(projectRoot, 'public/data/break-data-en.json');
const publicManifestPath = path.join(projectRoot, 'public/data/break-manifest.json');
const publicQualityReportPath = path.join(projectRoot, 'public/data/quality-report.json');

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

function expectIncludes(issues, label, text, expected) {
  if (!text.includes(expected)) {
    issues.push(`${label}: 缺少 ${expected}`);
  }
}

const issues = [];

// 产物存在性护栏：dist/break-data-package/ 不存在时直接报明确错误并退出，
// 避免 readText 返回空字符串后 expectIncludes 雪崩式报"缺少 X"误导诊断
if (!fs.existsSync(packageDir) || !fs.existsSync(packagePackagePath)) {
  console.error(
    `❌ 数据包产物不存在: ${path.relative(projectRoot, packageDir)}\n` +
      `请先运行 npm run export:data-package 生成产物后再校验。`,
  );
  process.exit(1);
}

const packageMeta = readJson(packagePackagePath);
const packageDataText = readText(packageDataPath, issues);
const packageDataEnText = readText(packageDataEnPath, issues);
const packageManifestText = readText(packageManifestPath, issues);
const packageQualityReportText = readText(packageQualityReportPath, issues);
const publicDataText = readText(publicDataPath, issues);
const publicDataEnText = readText(publicDataEnPath, issues);
const publicManifestText = readText(publicManifestPath, issues);
const publicQualityReportText = readText(publicQualityReportPath, issues);
const runtimeText = readText(packageRuntimePath, issues);
const typeText = readText(packageTypesPath, issues);
const readmeText = readText(packageReadmePath, issues);

expectEqual(issues, 'package name', packageMeta.name, '@jdarmy/break-data');
expectEqual(issues, 'package version', packageMeta.version, packageJson.version);
expectEqual(issues, 'package private', packageMeta.private, false);
expectEqual(issues, 'package type', packageMeta.type, 'module');
expectEqual(issues, 'package main', packageMeta.main, './index.js');
expectEqual(issues, 'package types', packageMeta.types, './index.d.ts');
expectEqual(issues, 'package sideEffects', packageMeta.sideEffects, false);
for (const file of [
  'data/break-data.json',
  'data/break-data-en.json',
  'data/break-manifest.json',
  'data/quality-report.json',
  'index.js',
  'index.d.ts',
  'README.md',
]) {
  if (!packageMeta.files?.includes(file)) {
    issues.push(`package files 缺少 ${file}`);
  }
}
expectEqual(issues, 'package root export default', packageMeta.exports?.['.']?.default, './index.js');
expectEqual(issues, 'package root export types', packageMeta.exports?.['.']?.types, './index.d.ts');
expectEqual(issues, 'package break-data-en export', packageMeta.exports?.['./data/break-data-en.json'], './data/break-data-en.json');

if (packageDataText && publicDataText) {
  expectEqual(issues, 'package data 与 public data 不一致', packageDataText, publicDataText);
}
if (packageDataEnText && publicDataEnText) {
  expectEqual(issues, 'package data-en 与 public data-en 不一致', packageDataEnText, publicDataEnText);
}
if (packageManifestText && publicManifestText) {
  expectEqual(issues, 'package manifest 与 public manifest 不一致', packageManifestText, publicManifestText);
}
if (packageQualityReportText && publicQualityReportText) {
  expectEqual(
    issues,
    'package quality-report 与 public quality-report 不一致',
    packageQualityReportText,
    publicQualityReportText,
  );
}

// STIX/JSON-LD 产物一致性校验
const interopFiles = [
  { pkgFile: 'data/break-stix-zh.json', pubFile: 'public/data/break-stix-zh.json' },
  { pkgFile: 'data/break-stix-en.json', pubFile: 'public/data/break-stix-en.json' },
  { pkgFile: 'data/break-ld-zh.jsonld', pubFile: 'public/data/break-ld-zh.jsonld' },
  { pkgFile: 'data/break-ld-en.jsonld', pubFile: 'public/data/break-ld-en.jsonld' },
];
for (const { pkgFile, pubFile } of interopFiles) {
  const pkgPath = path.join(packageDir, pkgFile);
  const pubPath = path.join(projectRoot, pubFile);
  if (fs.existsSync(pubPath)) {
    if (!fs.existsSync(pkgPath)) {
      issues.push(`npm 包缺少 ${pkgFile}（public 中已存在）`);
    } else {
      const pkgText = fs.readFileSync(pkgPath, 'utf8');
      const pubText = fs.readFileSync(pubPath, 'utf8');
      expectEqual(issues, `package ${pkgFile} 与 public 不一致`, pkgText, pubText);
    }
  }
}

if (packageDataText && packageDataEnText && packageManifestText && packageQualityReportText) {
  const manifest = JSON.parse(packageManifestText);
  const sha256 = crypto.createHash('sha256').update(packageDataText).digest('hex');
  const dataEnSha256 = crypto.createHash('sha256').update(packageDataEnText).digest('hex');
  const qualityReportSha256 = crypto.createHash('sha256').update(packageQualityReportText).digest('hex');
  expectEqual(issues, 'manifest data sha256', manifest.files?.data?.sha256, sha256);
  expectEqual(issues, 'manifest dataEn sha256', manifest.files?.dataEn?.sha256, dataEnSha256);
  expectEqual(issues, 'manifest qualityReport sha256', manifest.files?.qualityReport?.sha256, qualityReportSha256);
  expectEqual(issues, 'manifest packageVersion', manifest.packageVersion, packageJson.version);
}

for (const expectedType of [
  'BreakDataBundle',
  'BreakDataManifest',
  'BreakRisk',
  'BreakAvoidance',
  'BreakAttackTool',
  'BreakThreatActor',
  'BreakTerm',
  'BreakTermCategoryRegistry',
  'BreakCase',
  'BreakQualityReport',
  'BreakQualityIssue',
]) {
  expectIncludes(issues, 'index.d.ts', typeText, expectedType);
}

for (const expectedText of ['breakData', 'breakDataEn', 'breakManifest', 'breakQualityReport', "with { type: 'json' }"]) {
  expectIncludes(issues, 'index.js', runtimeText, expectedText);
}

for (const expectedText of ['Package Boundary', 'Version Strategy', '@jdarmy/break-data', packageJson.version, 'break-data-en.json', 'index.js']) {
  expectIncludes(issues, 'package README', readmeText, expectedText);
}

if (issues.length > 0) {
  console.error('\n❌ npm 数据包评估产物校验失败\n');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log('\n✅ npm 数据包评估产物校验通过');
console.log('package=dist/break-data-package');
console.log(`version=${packageJson.version}`);
