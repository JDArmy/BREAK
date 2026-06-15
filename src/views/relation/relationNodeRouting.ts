import type { RouteLocationRaw, Router } from "vue-router";
import { RelationType } from "@/views/relation/relationTypes";

const getRelationNodeRoute = (type: RelationType, id: string): RouteLocationRaw => ({
  name: "relation",
  params: {
    type,
    key: id,
  },
});

const getDetailNodeRoute = (type: RelationType, id: string): RouteLocationRaw => {
  switch (type) {
    case RelationType.risk:
      return {
        name: "riskDetail",
        params: {
          rKey: id,
        },
      };
    case RelationType.avoidance:
      return {
        name: "avoidances",
        hash: `#${id}`,
      };
    case RelationType.attackTool:
      return {
        name: "attackTools",
        hash: `#${id}`,
      };
    case RelationType.threatActor:
      return {
        name: "threatActors",
        hash: `#${id}`,
      };
  }
};

export const pushRelationNodeRoute = (router: Router, type: RelationType, id: string) =>
  router.push(getRelationNodeRoute(type, id));

export const pushDetailNodeRoute = (router: Router, type: RelationType, id: string) =>
  router.push(getDetailNodeRoute(type, id));

export const openDetailNodeRouteInNewWindow = (router: Router, type: RelationType, id: string) => {
  const href = router.resolve(getDetailNodeRoute(type, id)).href;
  window.open(href, "_blank", "noopener");
};
