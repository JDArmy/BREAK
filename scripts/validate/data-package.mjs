import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { projectRoot, readJson } from '../search/common.mjs';

const packageJson = readJson(path.join(projectRoot, 'package.json'));
const packageDir = path.join(projectRoot, 'dist/break-data-package');
const packagePackagePath = path.join(packageDir, 'package.json');
const packageDataPath = path.join(packageDir, 'data/break-data.json');
const packageManifestPath = path.join(packageDir, 'data/break-manifest.json');
const packageRuntimePath = path.join(packageDir, 'index.js');
const packageTypesPath = path.join(packageDir, 'index.d.ts');
const packageReadmePath = path.join(packageDir, 'README.md');
const publicDataPath = path.join(projectRoot, 'public/data/break-data.json');
const publicManifestPath = path.join(projectRoot, 'public/data/break-manifest.json');

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
const packageMeta = fs.existsSync(packagePackagePath) ? readJson(packagePackagePath) : null;
const packageDataText = readText(packageDataPath, issues);
const packageManifestText = readText(packageManifestPath, issues);
const publicDataText = readText(publicDataPath, issues);
const publicManifestText = readText(publicManifestPath, issues);
const runtimeText = readText(packageRuntimePath, issues);
const typeText = readText(packageTypesPath, issues);
const readmeText = readText(packageReadmePath, issues);

if (!packageMeta) {
  issues.push(`缺少文件: ${path.relative(projectRoot, packagePackagePath)}`);
} else {
  expectEqual(issues, 'package name', packageMeta.name, '@jdarmy/break-data');
  expectEqual(issues, 'package version', packageMeta.version, packageJson.version);
  expectEqual(issues, 'package private', packageMeta.private, false);
  expectEqual(issues, 'package type', packageMeta.type, 'module');
  expectEqual(issues, 'package main', packageMeta.main, './index.js');
  expectEqual(issues, 'package types', packageMeta.types, './index.d.ts');
  expectEqual(issues, 'package sideEffects', packageMeta.sideEffects, false);
  for (const file of ['data/break-data.json', 'data/break-manifest.json', 'index.js', 'index.d.ts', 'README.md']) {
    if (!packageMeta.files?.includes(file)) {
      issues.push(`package files 缺少 ${file}`);
    }
  }
  expectEqual(issues, 'package root export default', packageMeta.exports?.['.']?.default, './index.js');
  expectEqual(issues, 'package root export types', packageMeta.exports?.['.']?.types, './index.d.ts');
}

if (packageDataText && publicDataText) {
  expectEqual(issues, 'package data 与 public data 不一致', packageDataText, publicDataText);
}
if (packageManifestText && publicManifestText) {
  expectEqual(issues, 'package manifest 与 public manifest 不一致', packageManifestText, publicManifestText);
}

if (packageDataText && packageManifestText) {
  const manifest = JSON.parse(packageManifestText);
  const sha256 = crypto.createHash('sha256').update(packageDataText).digest('hex');
  expectEqual(issues, 'manifest data sha256', manifest.files?.data?.sha256, sha256);
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
]) {
  expectIncludes(issues, 'index.d.ts', typeText, expectedType);
}

for (const expectedText of ['breakData', 'breakManifest', "with { type: 'json' }"]) {
  expectIncludes(issues, 'index.js', runtimeText, expectedText);
}

for (const expectedText of ['Package Boundary', 'Version Strategy', '@jdarmy/break-data', packageJson.version, 'index.js']) {
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
