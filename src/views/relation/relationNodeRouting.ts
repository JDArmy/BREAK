import type { RouteLocationRaw, Router } from "vue-router";
import { RelationType } from "@/views/relation/relationTypes";

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

const getRelationNodeRoute = (type: RelationType, id: string): RouteLocationRaw => ({
  name: "relation",
  params: {
    type,
    key: id,
  },
});

const getDetailNodeRoute = (
  type: RelationType,
  id: string,
  detailAnchor?: DetailNodeAnchor
): RouteLocationRaw => {
  let route: RouteLocationRaw;
  switch (type) {
    case RelationType.risk:
      route = {
        name: "risks",
        hash: `#${id}`,
      };
      break;
    case RelationType.avoidance:
      route = {
        name: "avoidances",
        hash: `#${id}`,
      };
      break;
    case RelationType.attackTool:
      route = {
        name: "attackTools",
        hash: `#${id}`,
      };
      break;
    case RelationType.threatActor:
      route = {
        name: "threatActors",
        hash: `#${id}`,
      };
      break;
    case RelationType.term:
      route = {
        name: "terms",
        hash: `#${id}`,
      };
      break;
  }

  return withDetailAnchor(route, detailAnchor);
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
