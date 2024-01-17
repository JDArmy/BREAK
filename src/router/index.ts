import { createRouter, createWebHashHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
// createWebHistory(import.meta.env.BASE_URL),

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomeView,
    },
    {
      path: "/risks",
      name: "risks",
      component: () => import("@/views/RisksView.vue"),
    },
    {
      path: "/risk/:rKey",
      name: "riskDetail",
      component: HomeView,
    },
    {
      path: "/business-scene/:bsKey",
      name: "businessScene",
      component: HomeView,
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
      path: "/ability-providers",
      name: "abilityProviders",
      component: () => import("@/views/AbilityProvidersView.vue"),
    },
  ],
  scrollBehavior(to) {
    if (to.hash) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ el: to.hash, behavior: "smooth" });
        }, 300); // 延迟 500 毫秒以确保元素已经被渲染
      });
    }
  },
});

export default router;
