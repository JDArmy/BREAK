import { useRouter } from "vue-router";
import { getEntityEntryByRelationKey, getEntityEntry } from "@/BREAK/entityRegistry";

/**
 * 关系图实体类型，对应 /relations/{视角}/{entity}/{id} 路由的 entity 段（单数）。
 * 与 src/views/relation/relationTypes.ts 的 RelationType 保持一致。
 */
export type RelationEntityType = "risk" | "avoidance" | "attack-tool" | "threat-actor";

/** 风险视角路由名，用于 term 等无视角实体的兜底 */
const FALLBACK_PERSPECTIVE_ROUTE = getEntityEntry("risk").relationPerspectiveRouteName;

/**
 * 从 entityRegistry 派生实体类型对应的关系图视角路由名。
 * term 等无视角实体兜底到风险视角。
 */
const getRelationRouteName = (type: RelationEntityType): string => {
  const entry = getEntityEntryByRelationKey(type);
  return entry?.relationPerspectiveRouteName || FALLBACK_PERSPECTIVE_ROUTE;
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
      name: getRelationRouteName(type),
      params: { entity: type, id: key },
    });
  };
  return { openRelationGraph };
}
