import { createRouter, createWebHashHistory } from "vue-router";
import RelationRouteShell from "@/views/RelationRouteShell.vue";
import { initLocaleMessages } from "@/i18n";
import { loadNetworkECharts, loadSankeyECharts } from "@/views/relation/relationECharts";
import {
  getRelationDefaultViewByPerspective,
  type RelationPerspectiveKey,
} from "@/views/relation/relationAnalysisPerspectives";
import { ElMessage } from "element-plus";

// 扩展 vue-router 的 RouteMeta 类型
declare module "vue-router" {
  interface RouteMeta {
    /** 设为 true 表示该路由需要加载完整 BREAK 数据（触发 i18n 懒加载） */
    needsBreakData?: boolean;
    /** 知识库实体标识（单数：risk/avoidance/attack-tool/threat-actor/term/case） */
    knowledgeEntity?: string;
    /** 关系图视角标识（risk/attackPath/defenseCoverage/pathExplorer） */
    relationPerspective?: RelationPerspectiveKey;
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
    // 首页根
    {
      path: "/",
      name: "home",
      component: loadHomeView,
    },

    // 首页抽屉：/home/{entity}/{id}（entity 单数）
    {
      path: "/home/risk/:rKey",
      name: "homeRiskDetail",
      meta: { needsBreakData: true },
      component: loadHomeView,
    },
    {
      path: "/home/avoidance/:aKey",
      name: "homeAvoidanceDetail",
      meta: { needsBreakData: true },
      component: loadHomeView,
    },
    {
      path: "/home/attack-tool/:atKey",
      name: "homeAttackToolDetail",
      meta: { needsBreakData: true },
      component: loadHomeView,
    },
    {
      path: "/home/threat-actor/:taKey",
      name: "homeThreatActorDetail",
      meta: { needsBreakData: true },
      component: loadHomeView,
    },
    {
      path: "/home/term/:tKey",
      name: "homeTermDetail",
      meta: { needsBreakData: true },
      component: loadHomeView,
    },

    // 业务场景：bsKey 不变；新增 /business-scene/:bsKey/{entity}/{id}（所有实体类型）
    {
      path: "/business-scene/:bsKey",
      name: "businessScene",
      component: loadHomeView,
    },
    {
      path: "/business-scene/:bsKey/risk/:rKey",
      name: "businessSceneRiskDetail",
      meta: { needsBreakData: true },
      component: loadHomeView,
    },
    {
      path: "/business-scene/:bsKey/avoidance/:aKey",
      name: "businessSceneAvoidanceDetail",
      meta: { needsBreakData: true },
      component: loadHomeView,
    },
    {
      path: "/business-scene/:bsKey/attack-tool/:atKey",
      name: "businessSceneAttackToolDetail",
      meta: { needsBreakData: true },
      component: loadHomeView,
    },
    {
      path: "/business-scene/:bsKey/threat-actor/:taKey",
      name: "businessSceneThreatActorDetail",
      meta: { needsBreakData: true },
      component: loadHomeView,
    },
    {
      path: "/business-scene/:bsKey/term/:tKey",
      name: "businessSceneTermDetail",
      meta: { needsBreakData: true },
      component: loadHomeView,
    },

    // 知识库列表：/knowledges/{entity}/list（entity 单数）
    {
      path: "/knowledges/risk/list",
      name: "knowledgesRiskList",
      meta: { needsBreakData: true, knowledgeEntity: "risk" },
      component: () => import("@/views/RisksView.vue"),
    },
    {
      path: "/knowledges/avoidance/list",
      name: "knowledgesAvoidanceList",
      meta: { needsBreakData: true, knowledgeEntity: "avoidance" },
      component: () => import("@/views/AvoidancesView.vue"),
    },
    {
      path: "/knowledges/attack-tool/list",
      name: "knowledgesAttackToolList",
      meta: { needsBreakData: true, knowledgeEntity: "attack-tool" },
      component: () => import("@/views/AttackToolsView.vue"),
    },
    {
      path: "/knowledges/threat-actor/list",
      name: "knowledgesThreatActorList",
      meta: { needsBreakData: true, knowledgeEntity: "threat-actor" },
      component: () => import("@/views/ThreatActorsView.vue"),
    },
    {
      path: "/knowledges/term/list",
      name: "knowledgesTermList",
      meta: { needsBreakData: true, knowledgeEntity: "term" },
      component: () => import("@/views/TermsView.vue"),
    },
    {
      path: "/knowledges/case/list",
      name: "knowledgesCaseList",
      meta: { needsBreakData: true, knowledgeEntity: "case" },
      component: () => import("@/views/CasesView.vue"),
    },

    // 知识库详情：/knowledges/{entity}/detail/{id}（entity 单数，paramKey 沿用）
    {
      path: "/knowledges/risk/detail/:rKey",
      name: "knowledgesRiskDetail",
      meta: { needsBreakData: true, knowledgeEntity: "risk" },
      component: () => import("@/views/RisksView.vue"),
    },
    {
      path: "/knowledges/avoidance/detail/:aKey",
      name: "knowledgesAvoidanceDetail",
      meta: { needsBreakData: true, knowledgeEntity: "avoidance" },
      component: () => import("@/views/AvoidancesView.vue"),
    },
    {
      path: "/knowledges/attack-tool/detail/:atKey",
      name: "knowledgesAttackToolDetail",
      meta: { needsBreakData: true, knowledgeEntity: "attack-tool" },
      component: () => import("@/views/AttackToolsView.vue"),
    },
    {
      path: "/knowledges/threat-actor/detail/:taKey",
      name: "knowledgesThreatActorDetail",
      meta: { needsBreakData: true, knowledgeEntity: "threat-actor" },
      component: () => import("@/views/ThreatActorsView.vue"),
    },
    {
      path: "/knowledges/term/detail/:tKey",
      name: "knowledgesTermDetail",
      meta: { needsBreakData: true, knowledgeEntity: "term" },
      component: () => import("@/views/TermsView.vue"),
    },
    {
      path: "/knowledges/case/detail/:cKey",
      name: "knowledgesCaseDetail",
      meta: { needsBreakData: true, knowledgeEntity: "case" },
      component: () => import("@/views/CasesView.vue"),
    },

    // 关系图谱：4 视角 × 2 形态（视角首页 + 带实体子路由）
    {
      path: "/relations/risk-relation",
      name: "relationRisk",
      meta: { needsBreakData: true, relationPerspective: "risk" },
      component: RelationRouteShell,
    },
    {
      path: "/relations/risk-relation/:entity/:id",
      name: "relationRiskEntity",
      meta: { needsBreakData: true, relationPerspective: "risk" },
      component: RelationRouteShell,
    },
    {
      path: "/relations/attack-path",
      name: "relationAttackPath",
      meta: { needsBreakData: true, relationPerspective: "attackPath" },
      component: RelationRouteShell,
    },
    {
      path: "/relations/attack-path/:entity/:id",
      name: "relationAttackPathEntity",
      meta: { needsBreakData: true, relationPerspective: "attackPath" },
      component: RelationRouteShell,
    },
    {
      path: "/relations/defense-coverage",
      name: "relationDefenseCoverage",
      meta: { needsBreakData: true, relationPerspective: "defenseCoverage" },
      component: RelationRouteShell,
    },
    {
      path: "/relations/defense-coverage/:entity/:id",
      name: "relationDefenseCoverageEntity",
      meta: { needsBreakData: true, relationPerspective: "defenseCoverage" },
      component: RelationRouteShell,
    },
    {
      path: "/relations/path-explorer",
      name: "relationPathExplorer",
      meta: { needsBreakData: true, relationPerspective: "pathExplorer" },
      component: RelationRouteShell,
    },
    {
      path: "/relations/path-explorer/:entity/:id",
      name: "relationPathExplorerEntity",
      meta: { needsBreakData: true, relationPerspective: "pathExplorer" },
      component: RelationRouteShell,
    },

    // 更新日志
    {
      path: "/changelog",
      name: "changelog",
      component: () => import("@/views/ChangelogView.vue"),
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
    const homeRoutes = [
      "home",
      "businessScene",
      "homeRiskDetail",
      "homeAvoidanceDetail",
      "homeAttackToolDetail",
      "homeThreatActorDetail",
      "homeTermDetail",
      "businessSceneRiskDetail",
      "businessSceneAvoidanceDetail",
      "businessSceneAttackToolDetail",
      "businessSceneThreatActorDetail",
      "businessSceneTermDetail",
    ];
    if (homeRoutes.includes(to.name as string) && homeRoutes.includes(from.name as string)) {
      return false;
    }

    return { top: 0 };
  },
});

router.beforeEach((to) => {
  // 通过路由 meta 标记判断是否需要加载 BREAK 数据，无需维护硬编码路由名集合
  if (to.meta.needsBreakData) {
    void initLocaleMessages().catch((err) => {
      console.error("[router] BREAK 数据加载失败:", err);
      ElMessage({ message: String(err?.message || "Data load failed"), type: "error", plain: true, duration: 5000, grouping: true });
    });
  }

  // 关系图谱路由：按视角预加载对应 ECharts
  if (to.meta.relationPerspective) {
    if (window.innerWidth < 768) return;
    const defaultView = getRelationDefaultViewByPerspective(to.meta.relationPerspective);
    void loadRelationView();
    if (defaultView === "network") {
      void loadNetworkECharts();
    } else {
      void loadSankeyECharts();
    }
  }
});

// 动态页面标题：根据路由 meta 设置 document.title
const SITE_TITLE = "JDArmy BREAK";
const PAGE_TITLES: Record<string, string> = {
  risk: "Risks",
  avoidance: "Avoidances",
  "attack-tool": "Attack Tools",
  "threat-actor": "Threat Actors",
  term: "Terms",
  case: "Cases",
};
const PERSPECTIVE_TITLES: Record<string, string> = {
  risk: "Risk Relation",
  attackPath: "Attack Path",
  defenseCoverage: "Defense Coverage",
  pathExplorer: "Path Explorer",
};

router.afterEach((to) => {
  let title = SITE_TITLE;
  if (to.meta.knowledgeEntity) {
    title = `${PAGE_TITLES[to.meta.knowledgeEntity] || to.meta.knowledgeEntity} | ${SITE_TITLE}`;
  } else if (to.meta.relationPerspective) {
    title = `${PERSPECTIVE_TITLES[to.meta.relationPerspective] || "Relations"} | ${SITE_TITLE}`;
  } else if (to.name === "businessScene") {
    title = `Business Scenes | ${SITE_TITLE}`;
  } else if (to.name === "changelog") {
    title = `Changelog | ${SITE_TITLE}`;
  }
  document.title = title;
});

// 全局动态 import 失败处理：部署更新后旧 chunk 不存在，由 main.ts 的
// unhandledrejection 监听统一处理自动刷新。router.onError 作为补充拦截，
// 防止路由级 chunk 错误被 Vue 吞掉而不触发 unhandledrejection。
router.onError((error) => {
  if (isChunkLoadError(error)) {
    const CHUNK_RELOAD_KEY = "__break_chunk_reload__";
    const currentPath = window.location.hash.slice(1) || "/";
    if (sessionStorage.getItem(CHUNK_RELOAD_KEY) !== currentPath) {
      sessionStorage.setItem(CHUNK_RELOAD_KEY, currentPath);
      console.warn("[router] Chunk 加载失败，自动刷新页面:", error.message);
      window.location.reload();
    } else {
      sessionStorage.removeItem(CHUNK_RELOAD_KEY);
    }
  }
});

function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message;
  return (
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Loading chunk [\w.-]+ failed/i.test(msg) ||
    /Loading CSS chunk [\w.-]+ failed/i.test(msg)
  );
}

export default router;
