import { createRouter, createWebHashHistory } from "vue-router";
import { initLocaleMessages } from "@/i18n";
import { entityRegistry, type EntityType } from "@/BREAK/entityRegistry";
import { loadNetworkECharts, loadSankeyECharts } from "@/views/relation/relationECharts";
import {
  getRelationDefaultViewByPerspective,
  type RelationPerspectiveKey,
} from "@/views/relation/relationAnalysisPerspectives";
import { ElMessage } from "element-plus";
import { recoverFromChunkLoadError } from "@/utils/chunkLoadRecovery";
import { finishTopLoading, startTopLoading } from "@/utils/topLoading";

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
// RelationRouteShell 动态加载，避免静态 import 进入首屏 chunk（与 loadRelationView 同 chunk 策略）
const loadRelationRouteShell = () => import("@/views/RelationRouteShell.vue");

/** 实体类型 → 知识库视图懒加载工厂（list/detail 共用同一 View 组件，由 route.params 区分模式） */
const viewLoaders: Record<EntityType, () => Promise<unknown>> = {
  risk: () => import("@/views/RisksView.vue"),
  avoidance: () => import("@/views/AvoidancesView.vue"),
  attackTool: () => import("@/views/AttackToolsView.vue"),
  threatActor: () => import("@/views/ThreatActorsView.vue"),
  term: () => import("@/views/TermsView.vue"),
  case: () => import("@/views/CasesView.vue"),
};

// 关系图 4 视角路由元信息从 relationAnalysisPerspectives 集中维护（单一来源），避免多处映射重复
import { RELATION_PERSPECTIVE_ROUTES } from "@/views/relation/relationAnalysisPerspectives";

type RelationPreloadTarget = "network" | "sankey";

const normalizeDocsHashRoute = () => {
  if (typeof window === "undefined") return;
  const base = import.meta.env.BASE_URL || "/";
  const basePath = base.endsWith("/") ? base.slice(0, -1) : base;
  const pathname = window.location.pathname;
  const relativePath =
    basePath && pathname.startsWith(`${basePath}/`)
      ? pathname.slice(basePath.length)
      : pathname;

  if (!relativePath.startsWith("/docs")) return;
  if (window.location.hash && window.location.hash !== "#/") return;

  const normalized = `${basePath || ""}/#${relativePath}${window.location.search}`;
  window.history.replaceState(null, "", normalized);
};

normalizeDocsHashRoute();

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

    // 首页抽屉：/home/{entity}/{id}（从 entityRegistry 派生，case 无 home 抽屉）
    ...entityRegistry
      .filter((e) => e.homeDetailRouteName)
      .map((e) => ({
        path: `/home/${e.relationKey}/:${e.paramKey}`,
        name: e.homeDetailRouteName,
        meta: { needsBreakData: true },
        component: loadHomeView,
      })),

    // 业务域：bdKey 不变；/business-domain/:bdKey/{entity}/{id}（从 entityRegistry 派生）
    {
      path: "/business-domain/:bdKey",
      name: "businessDomain",
      component: loadHomeView,
    },
    ...entityRegistry
      .filter((e) => e.businessDomainDetailRouteName)
      .map((e) => ({
        path: `/business-domain/:bdKey/${e.relationKey}/:${e.paramKey}`,
        name: e.businessDomainDetailRouteName,
        meta: { needsBreakData: true },
        component: loadHomeView,
      })),

    // 知识库 list/detail：/knowledges/{entity}/list 与 /knowledges/{entity}/detail/{id}
    // list/detail 共用同一 View 组件，由 route.params 是否含 id 区分模式（flatMap 配对生成）
    ...entityRegistry.flatMap((e) => [
      {
        path: `/knowledges/${e.relationKey}/list`,
        name: e.listRouteName,
        meta: { needsBreakData: true, knowledgeEntity: e.relationKey },
        component: viewLoaders[e.type],
      },
      {
        path: `/knowledges/${e.relationKey}/detail/:${e.paramKey}`,
        name: e.detailRouteName,
        meta: { needsBreakData: true, knowledgeEntity: e.relationKey },
        component: viewLoaders[e.type],
      },
    ]),

    // 关系图谱：4 视角 × 2 形态（视角首页 + 带实体子路由），从 RELATION_PERSPECTIVE_ROUTES 派生
    ...RELATION_PERSPECTIVE_ROUTES.flatMap((p) => [
      {
        path: `/relations/${p.pathSegment}`,
        name: p.baseRouteName,
        meta: { needsBreakData: true, relationPerspective: p.perspective },
        component: loadRelationRouteShell,
      },
      {
        path: `/relations/${p.pathSegment}/:entity/:id`,
        name: p.entityRouteName,
        meta: { needsBreakData: true, relationPerspective: p.perspective },
        component: loadRelationRouteShell,
      },
    ]),

    // 更新日志
    {
      path: "/changelog",
      name: "changelog",
      component: () => import("@/views/ChangelogView.vue"),
    },

    // 文档
    {
      path: "/docs",
      name: "docs",
      component: () => import("@/views/DocsView.vue"),
    },
    {
      path: "/docs/:slug",
      name: "docs-detail",
      component: () => import("@/views/DocsView.vue"),
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

    // 首页路由之间切换时保持滚动位置（路由名从 entityRegistry 派生，与 SearchDialog 的 homePageRoutes 一致）
    const homeRouteNames = new Set<string>([
      "home",
      "businessDomain",
      ...entityRegistry.map((e) => e.homeDetailRouteName).filter(Boolean),
      ...entityRegistry.map((e) => e.businessDomainDetailRouteName).filter(Boolean),
    ]);
    if (homeRouteNames.has(to.name as string) && homeRouteNames.has(from.name as string)) {
      return false;
    }

    return { top: 0 };
  },
});

let routeDataLoadSeq = 0;

router.beforeEach((to) => {
  startTopLoading("route", 18, { delayMs: 180 });
  // 通过路由 meta 标记判断是否需要加载 BREAK 数据，无需维护硬编码路由名集合
  if (to.meta.needsBreakData) {
    const taskId = `route-data:${++routeDataLoadSeq}`;
    startTopLoading(taskId, 28, { delayMs: 180 });
    void initLocaleMessages()
      .catch((err) => {
        console.error("[router] BREAK 数据加载失败:", err);
        ElMessage({ message: String(err?.message || "Data load failed"), type: "error", plain: true, duration: 5000, grouping: true });
      })
      .finally(() => finishTopLoading(taskId));
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
  window.setTimeout(() => finishTopLoading("route"), 120);
  let title = SITE_TITLE;
  if (to.meta.knowledgeEntity) {
    title = `${PAGE_TITLES[to.meta.knowledgeEntity] || to.meta.knowledgeEntity} | ${SITE_TITLE}`;
  } else if (to.meta.relationPerspective) {
    title = `${PERSPECTIVE_TITLES[to.meta.relationPerspective] || "Relations"} | ${SITE_TITLE}`;
  } else if (to.name === "businessDomain") {
    title = `Business Domains | ${SITE_TITLE}`;
  } else if (to.name === "changelog") {
    title = `Changelog | ${SITE_TITLE}`;
  } else if (to.name === "docs" || to.name === "docs-detail") {
    title = `Docs | ${SITE_TITLE}`;
  }
  document.title = title;
});

// 全局动态 import 失败处理：部署更新后旧 chunk 不存在，由 main.ts 的
// unhandledrejection 监听统一处理自动刷新。router.onError 作为补充拦截，
// 防止路由级 chunk 错误被 Vue 吞掉而不触发 unhandledrejection。
router.onError((error) => {
  finishTopLoading("route");
  recoverFromChunkLoadError(error, "router");
});

export default router;
