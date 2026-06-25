<script setup lang="ts">
import { computed, markRaw, onUnmounted, shallowRef, type Component } from "vue";
import { useRoute } from "vue-router";
import { initLocaleMessages } from "@/i18n";

const route = useRoute();
const relationViewComponent = shallowRef<Component | null>(null);

const currentEntity = computed(() => {
  const type = typeof route.params.entity === "string" ? route.params.entity : "";
  const key = typeof route.params.id === "string" ? route.params.id : "";
  return [type, key].filter(Boolean).join(" / ");
});

let loadTimer: ReturnType<typeof setTimeout> | null = null;
let loadIdleHandle: number | null = null;
let cancelled = false;

const loadRelationView = () => {
  loadIdleHandle = null;
  loadTimer = null;
  void Promise.all([initLocaleMessages(), import("@/views/RelationView.vue")]).then(([, mod]) => {
    // 组件已卸载则不再写入，避免操作已销毁的响应式状态
    if (cancelled) return;
    relationViewComponent.value = markRaw(mod.default);
  });
};

if (window.innerWidth >= 768) {
  loadRelationView();
} else if ("requestIdleCallback" in window) {
  loadIdleHandle = window.requestIdleCallback(loadRelationView, { timeout: 2000 });
} else {
  loadTimer = window.setTimeout(loadRelationView, 0);
}

onUnmounted(() => {
  cancelled = true;
  if (loadTimer !== null) {
    clearTimeout(loadTimer);
    loadTimer = null;
  }
  if (loadIdleHandle !== null && "cancelIdleCallback" in window) {
    window.cancelIdleCallback(loadIdleHandle);
    loadIdleHandle = null;
  }
});
</script>

<template>
  <section v-if="!relationViewComponent" class="relation-route-shell" aria-busy="true">
    <div class="relation-route-shell__panel">
      <div class="relation-route-shell__spinner" aria-hidden="true"></div>
      <div>
        <div class="relation-route-shell__title">JDArmy BREAK</div>
        <div class="relation-route-shell__meta">
          {{ $t("relationView.network") }}
          <span v-if="currentEntity">/ {{ currentEntity }}</span>
        </div>
      </div>
    </div>
  </section>
  <component :is="relationViewComponent" v-else />
</template>

<style scoped>
.relation-route-shell {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100dvh - 132px);
  padding: 12px;
  background: var(--break-bg-primary);
  color: var(--break-text-primary);
}

.relation-route-shell__panel {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: min(360px, 100%);
  padding: 18px 20px;
  border: 1px solid var(--break-border);
  border-radius: 8px;
  background: var(--break-bg-card);
}

.relation-route-shell__spinner {
  width: 22px;
  height: 22px;
  border: 1px solid var(--break-border);
  border-top-color: var(--break-link);
  border-radius: 50%;
  animation: relation-route-shell-spin 0.8s linear infinite;
}

.relation-route-shell__title {
  font-size: 0.875rem;
  font-weight: 700;
  line-height: 1.4;
}

.relation-route-shell__meta {
  margin-top: 2px;
  color: var(--break-text-muted);
  font-size: 0.75rem;
  line-height: 1.4;
}

@keyframes relation-route-shell-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 767px) {
  .relation-route-shell {
    min-height: calc(100dvh - 96px);
    padding: 8px;
  }

  .relation-route-shell__panel {
    min-width: 0;
    width: 100%;
  }
}
</style>
