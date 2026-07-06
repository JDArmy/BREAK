/**
 * 项目版本同步脚本（命令：npm run version:sync -- --bump=patch|minor|major）
 *
 * 同步三处版本号：
 *   1. package.json 的 version
 *   2. src/BREAK/basic-info/main.json 的 version 和 updated
 *   3. CHANGELOG.md 顶部插入新版本占位条目（summary 留空待填）
 *
 * 配合 entity:version:bump（实体级 version 递增）使用：
 *   - entity:version:bump：递增每个实体的 version 字段（触发 i18n 重新合并）
 *   - version:sync：递增项目版本号（package.json + main.json + CHANGELOG）
 *
 * 用法：
 *   npm run version:sync -- --bump=patch    # 2.42.20 → 2.42.21
 *   npm run version:sync -- --bump=minor    # 2.42.20 → 2.43.0
 *   npm run version:sync -- --bump=major    # 2.42.20 → 3.0.0
 *   npm run version:sync -- --bump=patch --note="修复 X"  # 附带 CHANGELOG summary
 *   npm run version:sync -- --dry-run       # 仅预览不写入
 *
 * 注意：不自动判断 patch/minor/major——由提交者根据变更范围人工指定
 * （CLAUDE.md：小修补丁、较大次版本、重大主版本）。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { today } from './changed-entities.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');
const packageJsonPath = path.join(projectRoot, 'package.json');
const mainJsonPath = path.join(projectRoot, 'src/BREAK/basic-info/main.json');
const changelogPath = path.join(projectRoot, 'CHANGELOG.md');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

function readArg(name) {
  const prefix = `--${name}=`;
  const found = args.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length).trim() : '';
}

const bump = readArg('bump');
const note = readArg('note');

if (!['patch', 'minor', 'major'].includes(bump)) {
  console.error('❌ 缺少或非法 --bump 参数，需为 patch|minor|major');
  console.error('   用法：npm run version:sync -- --bump=patch [--note="说明"] [--dry-run]');
  process.exit(1);
}

function bumpVersion(version, kind) {
  const parts = version.split('.').map((n) => Number(n));
  if (parts.length !== 3 || parts.some((n) => !Number.isInteger(n))) {
    throw new Error(`版本号格式非法：${version}（需 X.Y.Z）`);
  }
  let [major, minor, patch] = parts;
  if (kind === 'major') {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (kind === 'minor') {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }
  return `${major}.${minor}.${patch}`;
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const mainJson = JSON.parse(fs.readFileSync(mainJsonPath, 'utf8'));

const oldVersion = packageJson.version;
const newVersion = bumpVersion(oldVersion, bump);
const todayStr = today();

console.log(`版本递增（${bump}）：${oldVersion} → ${newVersion}`);
console.log(`updated：${todayStr}`);
if (note) console.log(`CHANGELOG summary：${note}`);

if (dryRun) {
  console.log('\n🔍 预览模式，不写入文件');
  process.exit(0);
}

// 1. package.json
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
console.log(`✅ 已更新 ${path.relative(projectRoot, packageJsonPath)}`);

// 2. main.json（version + updated）
mainJson.version = newVersion;
mainJson.updated = todayStr;
fs.writeFileSync(mainJsonPath, JSON.stringify(mainJson, null, 2) + '\n', 'utf8');
console.log(`✅ 已更新 ${path.relative(projectRoot, mainJsonPath)}`);

// 3. CHANGELOG.md：在首个 ## 版本标题前插入新版本占位条目
let changelog = fs.readFileSync(changelogPath, 'utf8');
const summaryLine = note || '（待填写本次变更说明）';
const newEntry = `## ${newVersion}\n\n${summaryLine}\n\n`;
// 在第一个 "## " 前插入（保留头部 "# Change log" 等内容）
const firstVersionIdx = changelog.indexOf('\n## ');
if (firstVersionIdx === -1) {
  // 无现有版本条目，追加到末尾
  changelog = changelog.replace(/\n*$/, '\n\n') + newEntry;
} else {
  changelog = changelog.slice(0, firstVersionIdx + 1) + newEntry + changelog.slice(firstVersionIdx + 1);
}
fs.writeFileSync(changelogPath, changelog, 'utf8');
console.log(`✅ 已在 ${path.relative(projectRoot, changelogPath)} 插入 ${newVersion} 占位条目`);

console.log(`\n✅ 版本同步完成：${oldVersion} → ${newVersion}`);
console.log('后续：填写 CHANGELOG 的变更说明，然后 git add 并提交。');
