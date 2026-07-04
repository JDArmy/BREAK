<script setup lang="ts">
import { computed, inject } from "vue";
import { useI18n } from "vue-i18n";
import { useBreakpoints } from "@/composables/useBreakpoints";
import RelationNodeDetailContent from "@/components/relation/RelationNodeDetailContent.vue";
import { RELATION_VIEW_MODEL_KEY } from "@/views/relation/relationViewModelKey";

// inject viewModel（RelationView provide），取代 props 钻取
const vm = inject(RELATION_VIEW_MODEL_KEY)!;
// ref/computed 解构安全，模板内自动 unwrap；方法直接解构
const {
  nodeDetailDrawerVisible,
  selectedNetworkNode,
  selectedNetworkNodeTitle,
  selectedNetworkRelationCounts,
  rootNodeRelations,
  selectedNodeRootPath,
  selectedNodeAnalysisSummary,
  selectedNodeRelatedEntitySummary,
  selectedNodeAttackPathSummary,
  selectedNodeAttackPathDescription,
  selectedNodeAttackPathExplanations,
  attackPathFilterOptions,
  attackPathFilters,
  hasActiveAttackPathFilters,
  selectedNodeBusinessSceneImpactSummary,
  selectedNodeCoverageSummary,
  isCurrentNodeRoot,
  selectedNetworkRelations,
  relKey,
  getNodeTypeTitle,
  isPathNodeCurrentSelection,
  isRelationOnSelectedPath,
  drawerCopyFeedbackMessage,
  drawerCopyFeedbackType,
  openSelectedNodeAsRoot,
  resetAttackPathFilters,
  focusNodeInDrawer,
  openNodeAsRootById,
} = vm;
// 原 RelationView 模板 :hide-related-entity-actions="activeView === 'pathExplorer'"
const hideRelatedEntityActions = computed(() => vm.activeView.value === "pathExplorer");

const { t } = useI18n();
const { isMobile } = useBreakpoints();
</script>

<template>
  <el-drawer
    v-model="nodeDetailDrawerVisible"
    :title="t('relationView.nodeDetail')"
    :direction="isMobile ? 'btt' : 'rtl'"
    :size="isMobile ? '82dvh' : '520px'"
    append-to-body
    :z-index="4000"
    class="relation-drawer"
  >
    <div v-if="selectedNetworkNode" class="drawer-section">
      <RelationNodeDetailContent
        :selected-network-node="selectedNetworkNode"
        :selected-network-node-title="selectedNetworkNodeTitle"
        :selected-network-relation-counts="selectedNetworkRelationCounts"
        :root-node-relations="rootNodeRelations"
        :selected-node-root-path="selectedNodeRootPath"
        :selected-node-analysis-summary="selectedNodeAnalysisSummary"
        :selected-node-related-entity-summary="selectedNodeRelatedEntitySummary"
        :selected-node-attack-path-summary="selectedNodeAttackPathSummary"
        :selected-node-attack-path-description="
          selectedNodeAttackPathDescription
        "
        :selected-node-attack-path-explanations="
          selectedNodeAttackPathExplanations
        "
        :attack-path-filter-options="attackPathFilterOptions"
        :attack-path-filters="attackPathFilters"
        :has-active-attack-path-filters="hasActiveAttackPathFilters"
        :selected-node-business-scene-impact-summary="
          selectedNodeBusinessSceneImpactSummary
        "
        :selected-node-coverage-summary="selectedNodeCoverageSummary"
        :selected-network-relations="selectedNetworkRelations"
        :rel-key="relKey"
        :get-node-type-title="getNodeTypeTitle"
        :is-path-node-current-selection="isPathNodeCurrentSelection"
        :is-relation-on-selected-path="isRelationOnSelectedPath"
        :is-current-node-root="isCurrentNodeRoot"
        :drawer-copy-feedback-message="drawerCopyFeedbackMessage"
        :drawer-copy-feedback-type="drawerCopyFeedbackType"
        :show-open-as-root-action="true"
        :show-root-relation-block="true"
        :show-coverage-block="true"
        :show-attack-path-block="true"
        :hide-related-entity-actions="hideRelatedEntityActions"
        @update:attack-path-filters="attackPathFilters = $event"
        @reset-attack-path-filters="resetAttackPathFilters"
        @focus-node="focusNodeInDrawer"
        @open-as-root="openSelectedNodeAsRoot"
        @open-node-as-root="openNodeAsRootById"
      />
    </div>
  </el-drawer>
</template>

<style scoped>
.drawer-section {
  color: var(--break-text-primary);
}

.relation-drawer :deep(.el-drawer) {
  z-index: 4000 !important;
}

.relation-drawer :deep(.el-overlay) {
  z-index: 4000 !important;
}

.relation-drawer :deep(.el-drawer__header) {
  margin-bottom: 8px;
}

.relation-drawer :deep(.el-drawer__body) {
  padding-top: 0;
  overflow-y: auto;
}

@media (max-width: 767px) {
  .relation-drawer :deep(.el-drawer) {
    width: 100% !important;
    max-width: 100vw;
    border-radius: 12px 12px 0 0;
  }

  .relation-drawer :deep(.el-drawer__header) {
    padding: 12px 14px 8px;
    margin-bottom: 4px;
  }

  .relation-drawer :deep(.el-drawer__body) {
    padding: 0 12px 14px;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
  }
}
</style>
