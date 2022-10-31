import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
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
            path: "/avoidances",
            name: "avoidances",
            component: () => import("@/views/AvoidancesView.vue"),
        },
    ],
});

export default router;
