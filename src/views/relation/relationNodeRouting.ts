import type { RouteLocationRaw, Router } from "vue-router";
import { RelationType, type RelationEntityType } from "@/views/relation/relationTypes";
import { getEntityEntryByRelationKey } from "@/BREAK/entityRegistry";

export type DetailNodeAnchor =
  | "risks"
  | "avoidances"
  | "attack-tools"
  | "threat-actors"
  | "terms"
  | "business-scenes"
  | "references";

const withDetailAnchor = (
  route: RouteLocationRaw,
  detailAnchor?: DetailNodeAnchor
): RouteLocationRaw => {
  if (!detailAnchor || typeof route !== "object" || route === null) return route;
  return {
    ...route,
    query: {
      ...(route.query ?? {}),
      detailAnchor,
    },
  };
};

/**
 * 实体类型 → 主角色视角的「带实体子路由」name。
 * 「作为根节点打开」/「打开关系图」按实体主角色映射视角：
 * risk→风险视角、avoidance→防御覆盖、attack-tool/threat-actor→攻击路径。
 * term 不作为关系图根节点（需求明确只含 4 类），走 getRelationNodeRoute 兜底。
 */
const RELATION_PERSPECTIVE_ROUTE_BY_TYPE: Partial<Record<RelationEntityType, string>> = {
  [RelationType.risk]: "relationRiskEntity",
  [RelationType.avoidance]: "relationDefenseCoverageEntity",
  [RelationType.attackTool]: "relationAttackPathEntity",
  [RelationType.threatActor]: "relationAttackPathEntity",
};

const getRelationNodeRoute = (type: RelationType, id: string): RouteLocationRaw => {
  const name =
    RELATION_PERSPECTIVE_ROUTE_BY_TYPE[type as RelationEntityType] ?? "relationRiskEntity";
  return {
    name,
    params: {
      entity: type,
      id,
    },
  };
};

/** 实体类型 → 知识库 detail 路由 name + paramKey（从 entityRegistry 派生） */
const getDetailRouteEntry = (type: RelationType) => {
  const entry = getEntityEntryByRelationKey(type);
  if (entry) return { name: entry.detailRouteName, paramKey: entry.paramKey };
  // all 兜底到 risk
  const fallback = getEntityEntryByRelationKey("risk")!;
  return { name: fallback.detailRouteName, paramKey: fallback.paramKey };
};

const getDetailNodeRoute = (
  type: RelationType,
  id: string,
  detailAnchor?: DetailNodeAnchor
): RouteLocationRaw => {
  const entry = getDetailRouteEntry(type);
  return withDetailAnchor(
    { name: entry.name, params: { [entry.paramKey]: id } },
    detailAnchor
  );
};

export const pushRelationNodeRoute = (router: Router, type: RelationType, id: string) =>
  router.push(getRelationNodeRoute(type, id));

export const pushDetailNodeRoute = (router: Router, type: RelationType, id: string) =>
  router.push(getDetailNodeRoute(type, id));

export const pushDetailNodeRouteWithAnchor = (
  router: Router,
  type: RelationType,
  id: string,
  detailAnchor: DetailNodeAnchor
) => router.push(getDetailNodeRoute(type, id, detailAnchor));

export const openDetailNodeRouteInNewWindow = (
  router: Router,
  type: RelationType,
  id: string,
  detailAnchor?: DetailNodeAnchor
) => {
  const href = router.resolve(getDetailNodeRoute(type, id, detailAnchor)).href;
  window.open(href, "_blank", "noopener");
};
