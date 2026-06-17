import { createRouter, createWebHashHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
import { loadNetworkECharts, loadSankeyECharts } from "@/views/relation/relationECharts";

const loadRelationView = () => import("@/views/RelationView.vue");
type RelationPreloadTarget = "network" | "sankey";

export const preloadRelationView = (target?: RelationPreloadTarget) => {
  void loadRelationView();
  if (target === "network") {
    void loadNetworkECharts();
  } else if (target === "sankey") {
    void loadSankeyECharts();
  }
};

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomeView,
    },
    {
      path: "/risks/:rKey",
      name: "riskDetail",
      component: HomeView,
    },
    {
      path: "/avoidances/:aKey",
      name: "avoidanceDetail",
      component: HomeView,
    },
    {
      path: "/attack-tools/:atKey",
      name: "attackToolDetail",
      component: HomeView,
    },
    {
      path: "/threat-actors/:taKey",
      name: "threatActorDetail",
      component: HomeView,
    },
    {
      path: "/terms/:tKey",
      name: "termDetail",
      component: HomeView,
    },
    {
      path: "/business-scene/:bsKey",
      name: "businessScene",
      component: HomeView,
    },
    {
      path: "/business-scene/:bsKey/risks/:rKey",
      name: "businessSceneRiskDetail",
      component: HomeView,
    },
    {
      path: "/risks",
      name: "risks",
      component: () => import("@/views/RisksView.vue"),
    },
    {
      path: "/risks/detail/:rKey",
      name: "risksDetail",
      component: () => import("@/views/RisksView.vue"),
    },
    {
      path: "/avoidances",
      name: "avoidances",
      component: () => import("@/views/AvoidancesView.vue"),
    },
    {
      path: "/avoidances/detail/:aKey",
      name: "avoidancesDetail",
      component: () => import("@/views/AvoidancesView.vue"),
    },
    {
      path: "/attack-tools",
      name: "attackTools",
      component: () => import("@/views/AttackToolsView.vue"),
    },
    {
      path: "/attack-tools/detail/:atKey",
      name: "attackToolsDetail",
      component: () => import("@/views/AttackToolsView.vue"),
    },
    {
      path: "/threat-actors",
      name: "threatActors",
      component: () => import("@/views/ThreatActorsView.vue"),
    },
    {
      path: "/threat-actors/detail/:taKey",
      name: "threatActorsDetail",
      component: () => import("@/views/ThreatActorsView.vue"),
    },
    {
      path: "/terms",
      name: "terms",
      component: () => import("@/views/TermsView.vue"),
    },
    {
      path: "/terms/detail/:tKey",
      name: "termsDetail",
      component: () => import("@/views/TermsView.vue"),
    },
    {
      path: "/relation/:type/:key",
      name: "relation",
      component: loadRelationView,
    },
    {
      path: "/:pathMatch(.*)*",
      redirect: "/",
    },
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }

    if (to.hash) {
      return new Promise((resolve) => {
        const tryScroll = (attempts = 0) => {
          const el = document.querySelector(to.hash);
          if (el) {
            resolve({ el: to.hash, behavior: "smooth" });
          } else if (attempts >= 10) {
            // 元素未找到，不执行滚动，避免警告
            resolve(false);
          } else {
            setTimeout(() => tryScroll(attempts + 1), 100);
          }
        };
        setTimeout(() => tryScroll(), 100);
      });
    }

    // 首页路由之间切换时保持滚动位置
    const homeRoutes = ["home", "businessScene", "riskDetail", "businessSceneRiskDetail", "avoidanceDetail", "attackToolDetail", "threatActorDetail", "termDetail"];
    if (homeRoutes.includes(to.name as string) && homeRoutes.includes(from.name as string)) {
      return false;
    }

    return { top: 0 };
  },
});

router.beforeEach((to) => {
  if (to.name === "relation") {
    if (window.innerWidth < 768) return;
    const view = typeof to.query.view === "string" ? to.query.view : "";
    if (view === "network" || (view !== "sankey" && window.innerWidth >= 768)) {
      void loadNetworkECharts();
    } else {
      void loadSankeyECharts();
    }
  }
});

export default router;
