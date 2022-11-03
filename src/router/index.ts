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
      path: "/risk/:rKey",
      name: "riskDetail",
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
      path: "/business-scenes",
      name: "businessScenes",
      component: () => import("@/views/BusinessScenesView.vue"),
    },
    {
      path: "/ability-providers",
      name: "abilityProviders",
      component: () => import("@/views/AbilityProvidersView.vue"),
    },
  ],
});

export default router;
