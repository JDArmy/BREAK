import type { Router } from "vue-router";
import { RelationType } from "@/views/relation/relationTypes";

export const pushRelationNodeRoute = (router: Router, type: RelationType, id: string) =>
  router.push({
    name: "relation",
    params: {
      type,
      key: id,
    },
  });

export const pushDetailNodeRoute = (router: Router, type: RelationType, id: string) => {
  switch (type) {
    case RelationType.risk:
      return router.push({
        name: "riskDetail",
        params: {
          rKey: id,
        },
      });
    case RelationType.avoidance:
      return router.push({
        name: "avoidances",
        hash: `#${id}`,
      });
    case RelationType.attackTool:
      return router.push({
        name: "attackTools",
        hash: `#${id}`,
      });
    case RelationType.threatActor:
      return router.push({
        name: "threatActors",
        hash: `#${id}`,
      });
  }
};
