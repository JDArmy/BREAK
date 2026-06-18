<script setup lang="ts">
import { computed, markRaw, onMounted, shallowRef, type Component } from "vue";
import { useRoute } from "vue-router";
import { initLocaleMessages } from "@/i18n";

const route = useRoute();
const relationViewComponent = shallowRef<Component | null>(null);

const currentEntity = computed(() => {
  const type = typeof route.params.type === "string" ? route.params.type : "";
  const key = typeof route.params.key === "string" ? route.params.key : "";
  return [type, key].filter(Boolean).join(" / ");
});

onMounted(() => {
  const loadRelationView = () => {
    void Promise.all([initLocaleMessages(), import("@/views/RelationView.vue")]).then(([, mod]) => {
      relationViewComponent.value = markRaw(mod.default);
    });
  };

  if (window.innerWidth >= 768) {
    loadRelationView();
    return;
  }

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(loadRelationView, { timeout: 2000 });
    return;
  }

  window.setTimeout(loadRelationView, 0);
});
</script>

<template>
  <section v-if="!relationViewComponent" class="relation-route-shell" aria-busy="true">
    <div class="relation-route-shell__bar">
      <span>JDArmy BREAK</span>
      <strong>{{ currentEntity }}</strong>
    </div>
    <div class="relation-route-shell__tabs">
      <span></span>
      <span></span>
    </div>
    <div class="relation-route-shell__canvas">
      <i></i>
      <i></i>
      <i></i>
      <i></i>
    </div>
  </section>
  <component :is="relationViewComponent" v-else />
</template>

<style scoped>
.relation-route-shell {
  display: flex;
  flex-direction: column;
  min-height: calc(100dvh - 132px);
  padding: 12px;
  background: var(--break-bg-primary);
  color: var(--break-text-primary);
}

.relation-route-shell__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 42px;
  border-bottom: 1px solid var(--break-border);
  font-size: 0.875rem;
}

.relation-route-shell__bar strong {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: var(--break-text-muted);
  font-size: 0.75rem;
}

.relation-route-shell__tabs {
  display: flex;
  gap: 8px;
  padding: 12px 0;
}

.relation-route-shell__tabs span {
  display: block;
  width: 88px;
  height: 26px;
  border-radius: 4px;
  background: var(--break-bg-secondary);
}

.relation-route-shell__canvas {
  position: relative;
  flex: 1;
  min-height: 360px;
  border: 1px solid var(--break-border);
  background:
    linear-gradient(90deg, var(--break-border) 1px, transparent 1px),
    linear-gradient(var(--break-border) 1px, transparent 1px);
  background-size: 48px 48px;
}

.relation-route-shell__canvas i {
  position: absolute;
  display: block;
  width: 86px;
  height: 28px;
  border-radius: 4px;
  background: var(--break-bg-secondary);
  border: 1px solid var(--break-border);
}

.relation-route-shell__canvas i:nth-child(1) {
  left: 8%;
  top: 18%;
}

.relation-route-shell__canvas i:nth-child(2) {
  left: 38%;
  top: 36%;
}

.relation-route-shell__canvas i:nth-child(3) {
  right: 10%;
  top: 28%;
}

.relation-route-shell__canvas i:nth-child(4) {
  left: 24%;
  bottom: 18%;
}

@media (max-width: 767px) {
  .relation-route-shell {
    min-height: calc(100dvh - 96px);
    padding: 8px;
  }

  .relation-route-shell__bar {
    min-height: 38px;
  }

  .relation-route-shell__canvas {
    min-height: 520px;
  }
}
</style>
