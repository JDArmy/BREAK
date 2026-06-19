import basicInfo from "./basic-info";
import risks from "./risks";
import businessScenes from "./business-scenes";

const entityCounts = {
  avoidances: 300,
  subAvoidances: 78,
  attackTools: 110,
  subAttackTools: 13,
  threatActors: 70,
  subThreatActors: 9,
  terms: 600,
} as const;

const homeBREAK = {
  ...basicInfo,
  ...risks,
  ...businessScenes,
  entityCounts,
};

export default homeBREAK;
export type HomeBREAK = typeof homeBREAK;
