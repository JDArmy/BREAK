import { createRouter, createWebHashHistory } from "vue-router";
import RelationRouteShell from "@/views/RelationRouteShell.vue";
import { initLocaleMessages } from "@/i18n";
import { loadNetworkECharts, loadSankeyECharts } from "@/views/relation/relationECharts";

// 扩展 vue-router 的 RouteMeta 类型，支持 needsBreakData 标记
declare module "vue-router" {
  interface RouteMeta {
    /** 设为 true 表示该路由需要加载完整 BREAK 数据（触发 i18n 懒加载） */
    needsBreakData?: boolean;
  }
}

const loadHomeView = () => import("@/views/HomeView.vue");
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
      component: loadHomeView,
    },
    {
      path: "/risks/:rKey",
      name: "riskDetail",
      meta: { needsBreakData: true },
      component: loadHomeView,
    },
    {
      path: "/avoidances/:aKey",
      name: "avoidanceDetail",
      meta: { needsBreakData: true },
      component: loadHomeView,
    },
    {
      path: "/attack-tools/:atKey",
      name: "attackToolDetail",
      meta: { needsBreakData: true },
      component: loadHomeView,
    },
    {
      path: "/threat-actors/:taKey",
      name: "threatActorDetail",
      meta: { needsBreakData: true },
      component: loadHomeView,
    },
    {
      path: "/terms/:tKey",
      name: "termDetail",
      meta: { needsBreakData: true },
      component: loadHomeView,
    },
    {
      path: "/business-scene/:bsKey",
      name: "businessScene",
      component: loadHomeView,
    },
    {
      path: "/business-scene/:bsKey/risks/:rKey",
      name: "businessSceneRiskDetail",
      meta: { needsBreakData: true },
      component: loadHomeView,
    },
    {
      path: "/risks",
      name: "risks",
      meta: { needsBreakData: true },
      component: () => import("@/views/RisksView.vue"),
    },
    {
      path: "/risks/detail/:rKey",
      name: "risksDetail",
      meta: { needsBreakData: true },
      component: () => import("@/views/RisksView.vue"),
    },
    {
      path: "/avoidances",
      name: "avoidances",
      meta: { needsBreakData: true },
      component: () => import("@/views/AvoidancesView.vue"),
    },
    {
      path: "/avoidances/detail/:aKey",
      name: "avoidancesDetail",
      meta: { needsBreakData: true },
      component: () => import("@/views/AvoidancesView.vue"),
    },
    {
      path: "/attack-tools",
      name: "attackTools",
      meta: { needsBreakData: true },
      component: () => import("@/views/AttackToolsView.vue"),
    },
    {
      path: "/attack-tools/detail/:atKey",
      name: "attackToolsDetail",
      meta: { needsBreakData: true },
      component: () => import("@/views/AttackToolsView.vue"),
    },
    {
      path: "/threat-actors",
      name: "threatActors",
      meta: { needsBreakData: true },
      component: () => import("@/views/ThreatActorsView.vue"),
    },
    {
      path: "/threat-actors/detail/:taKey",
      name: "threatActorsDetail",
      meta: { needsBreakData: true },
      component: () => import("@/views/ThreatActorsView.vue"),
    },
    {
      path: "/terms",
      name: "terms",
      meta: { needsBreakData: true },
      component: () => import("@/views/TermsView.vue"),
    },
    {
      path: "/terms/detail/:tKey",
      name: "termsDetail",
      meta: { needsBreakData: true },
      component: () => import("@/views/TermsView.vue"),
    },
    {
      path: "/cases",
      name: "cases",
      meta: { needsBreakData: true },
      component: () => import("@/views/CasesView.vue"),
    },
    {
      path: "/cases/detail/:cKey",
      name: "casesDetail",
      meta: { needsBreakData: true },
      component: () => import("@/views/CasesView.vue"),
    },
    {
      path: "/relation/:type/:key",
      name: "relation",
      meta: { needsBreakData: true },
      component: RelationRouteShell,
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
  // 通过路由 meta 标记判断是否需要加载 BREAK 数据，无需维护硬编码路由名集合
  if (to.meta.needsBreakData) {
    void initLocaleMessages();
  }

  if (to.name === "relation") {
    if (window.innerWidth < 768) return;
    const view = typeof to.query.view === "string" ? to.query.view : "";
    void loadRelationView();
    if (view === "network" || (view !== "sankey" && window.innerWidth >= 768)) {
      void loadNetworkECharts();
    } else {
      void loadSankeyECharts();
    }
  }
});

export default router;
