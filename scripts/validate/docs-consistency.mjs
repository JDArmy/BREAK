import fs from 'fs';
import path from 'path';
import { projectRoot, readJson } from '../search/common.mjs';

const docs = {
  readme: fs.readFileSync(path.join(projectRoot, 'README.md'), 'utf8'),
  readmeCn: fs.readFileSync(path.join(projectRoot, 'README_CN.md'), 'utf8'),
  roadmap: fs.readFileSync(path.join(projectRoot, 'ROADMAP.md'), 'utf8'),
};

const packageJson = readJson(path.join(projectRoot, 'package.json'));

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
expectIncludes('roadmap', `当前项目版本：${packageJson.version}`, 'ROADMAP package version');
expectIncludes('roadmap', `参考资料总量：${metricReferenceTotal} 条`, 'ROADMAP reference total');

const roadmapRows = [
  ['Risk', counts.risks],
  ['Avoidance', counts.avoidances],
  ['AttackTool', counts.attackTools],
  ['ThreatActor', counts.threatActors],
  ['Term', counts.terms],
  ['BusinessScene', counts.businessScenes],
  ['AvoidanceCategory', counts.avoidanceCategories],
];

for (const [label, count] of roadmapRows) {
  expectIncludes('roadmap', `| ${label} | ${count.main} | ${count.sub} | ${count.total} |`, `ROADMAP ${label} row`);
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
