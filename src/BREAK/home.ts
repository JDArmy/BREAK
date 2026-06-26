import basicInfo from "./basic-info";
import risks from "./risks";
import businessScenes from "./business-scenes";

// 由 scripts/validate/generate-home-counts.mjs 生成，勿手动编辑。
// 数据变化后运行 npm run generate:home-counts 刷新（build 链已包含）。
const entityCounts = {
  avoidances: 300,
  subAvoidances: 78,
  attackTools: 112,
  subAttackTools: 13,
  threatActors: 73,
  subThreatActors: 9,
  terms: 600,
  cases: 1797,
} as const;

const homeBREAK = {
  ...basicInfo,
  ...risks,
  ...businessScenes,
  entityCounts,
};

export default homeBREAK;
export type HomeBREAK = typeof homeBREAK;
