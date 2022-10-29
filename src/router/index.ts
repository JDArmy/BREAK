import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: "/",
            name: "home",
            component: () => import("@/views/HomeView.vue"),
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
    ],
});

export default router;
