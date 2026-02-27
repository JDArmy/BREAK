import { loadJsonModules } from "../utils";

interface AttackTool {
  title: string;
  description: string;
  references: {
    title: string;
    link: string;
  }[];
  avoidances: string[];
  couseRisks: string[];
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
