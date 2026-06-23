import { loadJsonModules } from "../utils";

interface AttackTool {
  title: string;
  keywords: string[];
  description: string;
  references: {
    title: string;
    link: string;
  }[];
  avoidances: string[];
  directCauseRisks: string[];
  indirectSupportRisks: string[];
  relatedAttackTools?: {
    key: string;
    relation: "prerequisite" | "co-used" | "alternative" | "capability-upgrade";
    note?: string;
  }[];
  updated?: string;
}

interface AttackTools {
  [key: string]: AttackTool;
}

const attackToolFiles = import.meta.glob("./AT*.json", { eager: true });
const allAttackTools = loadJsonModules<AttackTools>(attackToolFiles);

const attackTools = {
  attackTools: allAttackTools,
};

export default attackTools;
export type { AttackTool, AttackTools };
