<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { inject } from "vue";
import RelationNodeDetailContent from "@/components/relation/RelationNodeDetailContent.vue";
import { RELATION_VIEW_MODEL_KEY } from "@/views/relation/relationViewModelKey";
import type { AttackPathFilters } from "@/views/relation/relationTypes";

// inject viewModel（RelationView provide），取代 props 钻取。
// 本组件是 AnalysisPane → NodeDetailContent 的薄透传层，仅保留 update:attack-path-filters
// emit 透传（Content 需父级协调 preserveScrollPane 滚动保持，故 emit 而非直接写 vm）。
// 其余事件（copy-csv/view-detail/open-as-root 等）Content 已直接调 vm 方法，不再透传。
const vm = inject(RELATION_VIEW_MODEL_KEY)!;

const emit = defineEmits<{
  "update:attack-path-filters": [value: AttackPathFilters];
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
      />
    </div>
  </div>
</template>
