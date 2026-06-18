import fs from 'fs';
import path from 'path';
import { projectRoot, readJson } from '../search/common.mjs';

const docs = {
  readme: fs.readFileSync(path.join(projectRoot, 'README.md'), 'utf8'),
  readmeCn: fs.readFileSync(path.join(projectRoot, 'README_CN.md'), 'utf8'),
  ciWorkflow: fs.readFileSync(path.join(projectRoot, '.github/workflows/ci.yml'), 'utf8'),
  deployWorkflow: fs.readFileSync(path.join(projectRoot, '.github/workflows/deploy.yml'), 'utf8'),
  pullRequestTemplate: fs.readFileSync(path.join(projectRoot, '.github/pull_request_template.md'), 'utf8'),
  dataChangeIssueTemplate: fs.readFileSync(path.join(projectRoot, '.github/ISSUE_TEMPLATE/data-change.md'), 'utf8'),
};

const packageJson = readJson(path.join(projectRoot, 'package.json'));
const buildScript = packageJson.scripts?.build || '';

const entityDirs = {
  risks: 'src/BREAK/risks',
  avoidances: 'src/BREAK/avoidances',
  attackTools: 'src/BREAK/attack-tools',
  threatActors: 'src/BREAK/threat-actors',
  terms: 'src/BREAK/terms',
  businessScenes: 'src/BREAK/business-scenes',
  avoidanceCategories: 'src/BREAK/avoidance-categories',
};

function loadRecords(relativeDir) {
  const dir = path.join(projectRoot, relativeDir);
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .flatMap((file) => Object.entries(readJson(path.join(dir, file))).map(([key, entity]) => ({ key, entity })));
}

function summarize(relativeDir) {
  const records = loadRecords(relativeDir);
  const main = records.filter(({ key }) => !key.includes('-')).length;
  const sub = records.length - main;
  return {
    main,
    sub,
    total: records.length,
  };
}

const counts = Object.fromEntries(
  Object.entries(entityDirs).map(([key, dir]) => [key, summarize(dir)])
);

const metricReferenceTypes = ['risks', 'avoidances', 'attackTools', 'threatActors'];
const metricReferenceTotal = metricReferenceTypes.reduce(
  (sum, key) =>
    sum +
    loadRecords(entityDirs[key]).reduce(
      (count, { entity }) => count + (Array.isArray(entity.references) ? entity.references.length : 0),
      0
    ),
  0
);

const failures = [];

function expectIncludes(docName, snippet, description) {
  if (!docs[docName].includes(snippet)) {
    failures.push(`${docName}: 缺少或未同步 ${description}: ${snippet}`);
  }
}

const buildGateScripts = [
  'lint',
  'type-check',
  'validate:data',
  'test',
  'test:coverage',
  'validate:schema-docs',
  'validate:docs-build',
  'export:data',
  'export:data-package',
  'build-only',
  'audit:bundle:check',
  'validate:data-export',
  'validate:data-package',
  'test:smoke',
  'test:performance',
  'test:relation-stability',
  'test:lighthouse',
];
const documentedUtilityScripts = ['schema:docs:write'];

const englishStats =
  `The current framework catalogues ${counts.risks.total} risk items, ` +
  `${counts.avoidances.total} avoidance measures, ${counts.attackTools.total} attack tools, ` +
  `${counts.threatActors.total} threat actors, ${counts.terms.total} industry terms, ` +
  `${counts.businessScenes.total} business scenes, and ${counts.avoidanceCategories.total} avoidance categories`;

const chineseStats =
  `目前框架共收集和整理风险点 ${counts.risks.total} 个、规避手段 ${counts.avoidances.total} 个、` +
  `攻击工具 ${counts.attackTools.total} 个、威胁行为者 ${counts.threatActors.total} 个、` +
  `行业术语 ${counts.terms.total} 个、业务场景 ${counts.businessScenes.total} 个、` +
  `规避手段分类 ${counts.avoidanceCategories.total} 个`;

expectIncludes('readme', englishStats, 'README entity totals');
expectIncludes('readmeCn', chineseStats, 'README_CN entity totals');
expectIncludes('readme', '[DATA_SCHEMA.md](./DATA_SCHEMA.md)', 'README schema docs link');
expectIncludes('readmeCn', '[DATA_SCHEMA.md](./DATA_SCHEMA.md)', 'README_CN schema docs link');

for (const scriptName of buildGateScripts) {
  if (!buildScript.includes(`npm run ${scriptName}`)) {
    failures.push(`package.json: build 脚本缺少门禁 npm run ${scriptName}`);
  }
  expectIncludes('readme', `npm run ${scriptName}`, `README build gate ${scriptName}`);
  expectIncludes('readmeCn', `npm run ${scriptName}`, `README_CN build gate ${scriptName}`);
  expectIncludes('ciWorkflow', `npm run ${scriptName}`, `CI workflow build gate ${scriptName}`);
  expectIncludes('deployWorkflow', `npm run ${scriptName}`, `Deploy workflow build gate ${scriptName}`);
}

for (const scriptName of documentedUtilityScripts) {
  expectIncludes('readme', `npm run ${scriptName}`, `README utility script ${scriptName}`);
  expectIncludes('readmeCn', `npm run ${scriptName}`, `README_CN utility script ${scriptName}`);
}

for (const snippet of ['CHANGELOG.md', 'data / app / docs / build', 'npm run export:data-package']) {
  expectIncludes('pullRequestTemplate', snippet, `PR template contribution gate ${snippet}`);
}

for (const snippet of ['CHANGELOG.md', '静态数据包或 npm 数据包评估', 'data/app/docs/build']) {
  expectIncludes('dataChangeIssueTemplate', snippet, `data issue template contribution gate ${snippet}`);
}

if (failures.length > 0) {
  console.error('\n❌ 文档统计一致性检查失败\n');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('\n✅ 文档统计一致性检查通过');
console.log(
  `entities=${counts.risks.total}/${counts.avoidances.total}/${counts.attackTools.total}/${counts.threatActors.total}/${counts.terms.total}/${counts.businessScenes.total}/${counts.avoidanceCategories.total}`
);
console.log(`metricReferences=${metricReferenceTotal}`);
