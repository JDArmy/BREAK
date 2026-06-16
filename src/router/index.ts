import { createRouter, createWebHashHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";

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
      path: "/risks",
      name: "risks",
      component: () => import("@/views/RisksView.vue"),
    },
    {
      path: "/avoidances",
      name: "avoidances",
      component: () => import("@/views/AvoidancesView.vue"),
    },
    {
      path: "/attack-tools",
      name: "attackTools",
      component: () => import("@/views/AttackToolsView.vue"),
    },
    {
      path: "/threat-actors",
      name: "threatActors",
      component: () => import("@/views/ThreatActorsView.vue"),
    },
    {
      path: "/terms",
      name: "terms",
      component: () => import("@/views/TermsView.vue"),
    },
    {
      path: "/relation/:type/:key",
      name: "relation",
      component: () => import("@/views/RelationView.vue"),
    },
    {
      path: "/:pathMatch(.*)*",
      redirect: "/",
    },
  ],
  scrollBehavior(to, _from, savedPosition) {
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

    return { top: 0 };
  },
});

export default router;
