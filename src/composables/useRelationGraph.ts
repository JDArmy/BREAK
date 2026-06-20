import { useRouter } from "vue-router";

/**
 * 关系图实体类型，对应 /relation/:type/:key 路由的 type 段。
 * 与 src/views/relation/relationTypes.ts 的 RelationType 保持一致。
 */
export type RelationEntityType = "risk" | "avoidance" | "attack-tool" | "threat-actor";

/**
 * 封装跳转到关系图路由的通用逻辑。
 *
 * 列表详情页（RisksView/AvoidancesView/AttackToolsView/ThreatActorsView）的"打开关系图"按钮
 * 逐字重复 router.push({ name: "relation", params: { type, key } })，仅 type 不同，抽出复用。
 *
 * 注意：详情抽屉（RiskDetail 等）内的 openRelationGraph 是 window.open 新标签语义，
 * 与本件的同窗口 router.push 不同，不在本件范围。
 *
 * @param type 实体类型
 * @returns { openRelationGraph } 跳转到 /relation/:type/:key
 */
export function useRelationGraph(type: RelationEntityType) {
  const router = useRouter();
  const openRelationGraph = (key: string) => {
    router.push({ name: "relation", params: { type, key } });
  };
  return { openRelationGraph };
}
