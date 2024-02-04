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
// 合并所有 JSON 对象
const allAttackTools = Object.values(attackToolFiles).reduce(
  (allAttackTools: AttackTools, attackTool: any) => ({
    ...allAttackTools,
    ...attackTool.default,
  }),
  {}
);

const attackTools = {
  attackTools: allAttackTools,
};

export default attackTools;
export type { AttackTool, AttackTools };
