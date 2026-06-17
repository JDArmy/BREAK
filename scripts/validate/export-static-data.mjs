import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ensureDir, projectRoot, readJson, writeJson } from '../search/common.mjs';

const outputDir = path.join(projectRoot, 'public/data');
const dataPath = path.join(outputDir, 'break-data.json');
const manifestPath = path.join(outputDir, 'break-manifest.json');
const packageJson = readJson(path.join(projectRoot, 'package.json'));

const exportConfigs = [
  { key: 'risks', dir: 'src/BREAK/risks' },
  { key: 'avoidances', dir: 'src/BREAK/avoidances' },
  { key: 'attackTools', dir: 'src/BREAK/attack-tools' },
  { key: 'threatActors', dir: 'src/BREAK/threat-actors' },
  { key: 'terms', dir: 'src/BREAK/terms' },
  { key: 'businessScenes', dir: 'src/BREAK/business-scenes' },
  { key: 'avoidanceCategories', dir: 'src/BREAK/avoidance-categories' },
];

function sortedObject(value) {
  if (Array.isArray(value)) {
    return value.map(sortedObject);
  }
  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, nested]) => [key, sortedObject(nested)])
  );
}

function loadEntityMap(relativeDir) {
  const dir = path.join(projectRoot, relativeDir);
  const merged = {};

  for (const file of fs
    .readdirSync(dir)
    .filter((item) => item.endsWith('.json'))
    .sort()) {
    Object.assign(merged, readJson(path.join(dir, file)));
  }

  return sortedObject(merged);
}

function summarize(records) {
  const keys = Object.keys(records);
  const main = keys.filter((key) => !key.includes('-')).length;
  return {
    main,
    sub: keys.length - main,
    total: keys.length,
  };
}

function getGeneratedAt() {
  if (process.env.BREAK_DATA_GENERATED_AT) {
    return new Date(process.env.BREAK_DATA_GENERATED_AT).toISOString();
  }

  const sourcePaths = exportConfigs.map((config) => config.dir);
  const committedAt = execFileSync('git', ['log', '-1', '--format=%cI', '--', ...sourcePaths], {
    cwd: projectRoot,
    encoding: 'utf8',
  }).trim();
  return new Date(committedAt).toISOString();
}

const generatedAt = getGeneratedAt();
const data = {
  schemaVersion: 1,
  packageVersion: packageJson.version,
  generatedAt,
  locale: 'zh-CN',
  data: Object.fromEntries(exportConfigs.map((config) => [config.key, loadEntityMap(config.dir)])),
};

const counts = Object.fromEntries(
  Object.entries(data.data).map(([key, records]) => [key, summarize(records)])
);

const dataJson = `${JSON.stringify(data, null, 2)}\n`;
const sha256 = crypto.createHash('sha256').update(dataJson).digest('hex');
const manifest = {
  schemaVersion: 1,
  packageVersion: packageJson.version,
  generatedAt,
  locale: 'zh-CN',
  files: {
    data: {
      path: 'data/break-data.json',
      bytes: Buffer.byteLength(dataJson),
      sha256,
    },
  },
  counts,
};

ensureDir(outputDir);
fs.writeFileSync(dataPath, dataJson);
writeJson(manifestPath, manifest);

console.log('\n✅ 静态数据导出完成');
console.log(`data=${path.relative(projectRoot, dataPath)}`);
console.log(`manifest=${path.relative(projectRoot, manifestPath)}`);
console.log(
  `entities=${counts.risks.total}/${counts.avoidances.total}/${counts.attackTools.total}/${counts.threatActors.total}/${counts.terms.total}/${counts.businessScenes.total}/${counts.avoidanceCategories.total}`
);
