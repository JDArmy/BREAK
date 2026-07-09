import type { RouteLocationRaw, Router } from "vue-router";
import { RelationType } from "@/views/relation/relationTypes";
import { getEntityEntryByRelationKey, getEntityEntry } from "@/BREAK/entityRegistry";

export type DetailNodeAnchor =
  | "risks"
  | "avoidances"
  | "attack-tools"
  | "threat-actors"
  | "terms"
  | "business-domains"
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

/** 风险视角路由名，用于 term 等无视角实体的兜底 */
const FALLBACK_PERSPECTIVE_ROUTE = getEntityEntry("risk").relationPerspectiveRouteName;

const getRelationNodeRoute = (type: RelationType, id: string): RouteLocationRaw => {
  const entry = getEntityEntryByRelationKey(type);
  const name = entry?.relationPerspectiveRouteName || FALLBACK_PERSPECTIVE_ROUTE;
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
