<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { inject } from "vue";
import RelationNodeDetailContent from "@/components/relation/RelationNodeDetailContent.vue";
import { RELATION_VIEW_MODEL_KEY } from "@/views/relation/relationViewModelKey";
import type { AttackPathFilters } from "@/views/relation/relationTypes";

// inject viewModel（RelationView provide），取代 props 钻取。
// 本组件是 AnalysisPane → NodeDetailContent 的薄透传层，透传改 vm 状态触发父级 watch 的 emits，
// 让 AnalysisPane 协调 preserveScrollPane 滚动保持。不改 vm 状态的操作（copy-csv/view-detail 等）
// Content 直接调 vm 方法，不透传。
const vm = inject(RELATION_VIEW_MODEL_KEY)!;

const emit = defineEmits<{
  "update:attack-path-filters": [value: AttackPathFilters];
  "reset-attack-path-filters": [];
  "focus-node": [nodeId: string];
  "open-as-root": [];
  "open-node-as-root": [nodeId: string];
}>();

const { t } = useI18n();
</script>

<template>
  <div v-if="vm.selectedNetworkNode.value" class="node-explain-block">
    <h3>{{ t("relationView.nodeDetail") }}</h3>
    <div class="node-insight-panel relation-analysis-detail-panel">
      <RelationNodeDetailContent
        :show-root-relation-block="false"
        :show-coverage-block="false"
        :show-attack-path-block="false"
        :hide-related-entity-actions="true"
        :show-open-as-root-action="false"
        @update:attack-path-filters="emit('update:attack-path-filters', $event)"
        @reset-attack-path-filters="emit('reset-attack-path-filters')"
        @focus-node="emit('focus-node', $event)"
        @open-as-root="emit('open-as-root')"
        @open-node-as-root="emit('open-node-as-root', $event)"
      />
    </div>
  </div>
</template>
