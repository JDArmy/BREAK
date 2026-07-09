import basicInfo from "./basic-info";
import risks from "./risks";
import businessDomains from "./business-domains";

// 由 scripts/validate/generate-home-counts.mjs 生成，勿手动编辑。
// 数据变化后运行 npm run generate:home-counts 刷新（build 链已包含）。
const entityCounts = {
  avoidances: 326,
  subAvoidances: 105,
  attackTools: 119,
  subAttackTools: 37,
  threatActors: 75,
  subThreatActors: 14,
  terms: 593,
  cases: 1782,
} as const;

const homeBREAK = {
  ...basicInfo,
  ...risks,
  ...businessDomains,
  entityCounts,
};

export default homeBREAK;
export type HomeBREAK = typeof homeBREAK;
