import { useRouter } from "vue-router";

/**
 * 关系图实体类型，对应 /relations/{视角}/{entity}/{id} 路由的 entity 段（单数）。
 * 与 src/views/relation/relationTypes.ts 的 RelationType 保持一致。
 */
export type RelationEntityType = "risk" | "avoidance" | "attack-tool" | "threat-actor";

/**
 * 实体类型 → 主角色视角的「带实体子路由」name。
 * 「打开关系图」按实体主角色映射视角：
 * risk→风险视角、avoidance→防御覆盖、attack-tool/threat-actor→攻击路径。
 */
const RELATION_ROUTE_BY_TYPE: Record<RelationEntityType, string> = {
  risk: "relationRiskEntity",
  avoidance: "relationDefenseCoverageEntity",
  "attack-tool": "relationAttackPathEntity",
  "threat-actor": "relationAttackPathEntity",
};

/**
 * 封装跳转到关系图路由的通用逻辑。
 *
 * 列表详情页（RisksView/AvoidancesView/AttackToolsView/ThreatActorsView）的"打开关系图"按钮
 * 复用本件，跳转到该实体主角色视角的带实体子路由。
 *
 * 注意：详情抽屉（RiskDetail 等）内的 openRelationGraph 是 window.open 新标签语义，
 * 与本件的同窗口 router.push 不同，不在本件范围。
 *
 * @param type 实体类型
 * @returns { openRelationGraph } 跳转到 /relations/{视角}/{entity}/{id}
 */
export function useRelationGraph(type: RelationEntityType) {
  const router = useRouter();
  const openRelationGraph = (key: string) => {
    router.push({
      name: RELATION_ROUTE_BY_TYPE[type],
      params: { entity: type, id: key },
    });
  };
  return { openRelationGraph };
}
