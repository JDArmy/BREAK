// 生成首页轻量数据入口 src/BREAK/home.ts 的 entityCounts。
// 扫描 src/BREAK/ 各实体目录，统计 main/sub/total，避免硬编码计数与实际数据脱节。
// 与 DATA_SCHEMA.md（schema:docs:write 生成并入库）同模式：生成结果 git 跟踪，数据变化时重跑刷新。
import fs from 'node:fs';
import path from 'node:path';
import { projectRoot, readJson } from '../search/common.mjs';

const homePath = path.join(projectRoot, 'src/BREAK/home.ts');

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

const counts = {
  avoidances: countRecords('src/BREAK/avoidances'),
  attackTools: countRecords('src/BREAK/attack-tools'),
  threatActors: countRecords('src/BREAK/threat-actors'),
  terms: countRecords('src/BREAK/terms'),
  cases: countRecords('src/BREAK/cases'),
};

const entityCounts = {
  avoidances: counts.avoidances.total,
  subAvoidances: counts.avoidances.sub,
  attackTools: counts.attackTools.total,
  subAttackTools: counts.attackTools.sub,
  threatActors: counts.threatActors.total,
  subThreatActors: counts.threatActors.sub,
  terms: counts.terms.total,
  cases: counts.cases.total,
};

const content = `import basicInfo from "./basic-info";
import risks from "./risks";
import businessDomains from "./business-domains";

// 由 scripts/validate/generate-home-counts.mjs 生成，勿手动编辑。
// 数据变化后运行 npm run generate:home-counts 刷新（build 链已包含）。
const entityCounts = {
  avoidances: ${entityCounts.avoidances},
  subAvoidances: ${entityCounts.subAvoidances},
  attackTools: ${entityCounts.attackTools},
  subAttackTools: ${entityCounts.subAttackTools},
  threatActors: ${entityCounts.threatActors},
  subThreatActors: ${entityCounts.subThreatActors},
  terms: ${entityCounts.terms},
  cases: ${entityCounts.cases},
} as const;

const homeBREAK = {
  ...basicInfo,
  ...risks,
  ...businessDomains,
  entityCounts,
};

export default homeBREAK;
export type HomeBREAK = typeof homeBREAK;
`;

const existing = fs.existsSync(homePath) ? fs.readFileSync(homePath, 'utf8') : '';

if (process.argv.includes('--check')) {
  // 校验模式：不写文件，仅检查 home.ts 计数与实际数据是否一致
  if (existing !== content) {
    console.error('\n❌ home.ts 计数与实际数据不一致\n');
    console.error('请运行 npm run generate:home-counts 刷新 src/BREAK/home.ts。');
    process.exit(1);
  }
  console.log('✅ home.ts 计数与实际数据一致');
  process.exit(0);
}

if (existing === content) {
  console.log('✅ home.ts 计数已是最新，无需更新');
  process.exit(0);
}

fs.writeFileSync(homePath, content, 'utf8');
console.log('✅ home.ts 计数已生成');
console.log(
  `entities=${counts.avoidances.total}/${counts.attackTools.total}/${counts.threatActors.total}/${counts.terms.total}/${counts.cases.total}`
);
