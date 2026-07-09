import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ensureDir, projectRoot, readJson, writeJson } from '../search/common.mjs';
import { writeQualityReport } from './quality-report.mjs';

const outputDir = path.join(projectRoot, 'public/data');
const dataPath = path.join(outputDir, 'break-data.json');
const manifestPath = path.join(outputDir, 'break-manifest.json');
const qualityReportPath = path.join(outputDir, 'quality-report.json');
const packageJson = readJson(path.join(projectRoot, 'package.json'));

const exportConfigs = [
  { key: 'risks', dir: 'src/BREAK/risks', hasVersion: true },
  { key: 'avoidances', dir: 'src/BREAK/avoidances', hasVersion: true },
  { key: 'attackTools', dir: 'src/BREAK/attack-tools', hasVersion: true },
  { key: 'threatActors', dir: 'src/BREAK/threat-actors', hasVersion: true },
  { key: 'terms', dir: 'src/BREAK/terms', hasVersion: true },
  { key: 'businessDomains', dir: 'src/BREAK/business-domains', hasVersion: true },
  { key: 'avoidanceCategories', dir: 'src/BREAK/avoidance-categories', hasVersion: false },
  { key: 'cases', dir: 'src/BREAK/cases', hasVersion: true },
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

function loadEntityMap(relativeDir, injectVersion) {
  const dir = path.join(projectRoot, relativeDir);
  const merged = {};

  for (const file of fs
    .readdirSync(dir)
    .filter((item) => item.endsWith('.json'))
    .sort()) {
    Object.assign(merged, readJson(path.join(dir, file)));
  }

  // 为缺失 version 的实体注入默认值 1
  if (injectVersion) {
    for (const entity of Object.values(merged)) {
      if (entity && typeof entity === 'object' && entity.version == null) {
        entity.version = 1;
      }
    }
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
  let committedAt = '';
  try {
    committedAt = execFileSync('git', ['log', '-1', '--format=%cI', '--', ...sourcePaths], {
      cwd: projectRoot,
      encoding: 'utf8',
    }).trim();
  } catch {
    // git 不可用或无仓库时回退到当前时间
  }
  const parsed = new Date(committedAt);
  // 新文件/无提交历史时 committedAt 为空，new Date('') 得到 Invalid Date，回退到当前时间避免崩溃
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

const generatedAt = getGeneratedAt();
const data = {
  schemaVersion: 1,
  packageVersion: packageJson.version,
  generatedAt,
  locale: 'zh-CN',
  data: Object.fromEntries(exportConfigs.map((config) => [config.key, loadEntityMap(config.dir, config.hasVersion)])),
};

const counts = Object.fromEntries(
  Object.entries(data.data).map(([key, records]) => [key, summarize(records)])
);

const dataJson = `${JSON.stringify(data, null, 2)}\n`;
const sha256 = crypto.createHash('sha256').update(dataJson).digest('hex');
const qualityReport = writeQualityReport({ generatedAt });
const qualityReportJson = fs.readFileSync(qualityReportPath, 'utf8');
const qualityReportSha256 = crypto.createHash('sha256').update(qualityReportJson).digest('hex');
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
    qualityReport: {
      path: 'data/quality-report.json',
      bytes: Buffer.byteLength(qualityReportJson),
      sha256: qualityReportSha256,
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
console.log(`qualityReport=${path.relative(projectRoot, qualityReportPath)}`);
console.log(
  `entities=${counts.risks.total}/${counts.avoidances.total}/${counts.attackTools.total}/${counts.threatActors.total}/${counts.terms.total}/${counts.businessDomains.total}/${counts.avoidanceCategories.total}/${counts.cases.total}`
);
console.log(
  `quality=${qualityReport.weakRelations.length}/${qualityReport.missingCoverage.length}/${qualityReport.sceneIssues.length}/${qualityReport.i18nIssues.length}/${qualityReport.referenceHealthIssues.length}/${qualityReport.caseSourceIssues.length}`
);
