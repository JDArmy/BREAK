<script setup lang="ts">
import { ref, inject } from "vue";
import RelationNodeDrawerHeader from "@/components/relation/RelationNodeDrawerHeader.vue";
import RelationNodeDrawerRelations from "@/components/relation/RelationNodeDrawerRelations.vue";
import RelationNodeInsightBlocks from "@/components/relation/RelationNodeInsightBlocks.vue";
import { RELATION_VIEW_MODEL_KEY } from "@/views/relation/relationViewModelKey";
import type { AttackPathFilters } from "@/views/relation/relationTypes";

// inject viewModel（RelationView provide），取代 props 钻取
const vm = inject(RELATION_VIEW_MODEL_KEY)!;
// ref/computed 解构安全，模板内自动 unwrap；方法直接解构
const {
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
  selectedNetworkRelations,
  relKey,
  getNodeTypeTitle,
  isPathNodeCurrentSelection,
  isRelationOnSelectedPath,
  isCurrentNodeRoot,
  drawerCopyFeedbackMessage,
  drawerCopyFeedbackType,
  copySelectedNodeCsv,
  gotoSelectedNodeDetailView,
  openSelectedNodeDetailInNewWindow,
  openSelectedNodeAsRoot,
  resetAttackPathFilters,
  focusNodeInDrawer,
  openNodeAsRootById,
  gotoNodeDetailViewById,
} = vm;

// 一次性配置开关保留为 props（Drawer 传 true，AnalysisDetailColumn 传 false 差异化）
withDefaults(defineProps<{
  showOpenAsRootAction?: boolean;
  showRootRelationBlock?: boolean;
  showCoverageBlock?: boolean;
  showAttackPathBlock?: boolean;
  hideRelatedEntityActions?: boolean;
}>(), {
  showOpenAsRootAction: true,
  showRootRelationBlock: true,
  showCoverageBlock: true,
  showAttackPathBlock: true,
});

const relationsSectionRef = ref<HTMLElement | null>(null);
const relationsRef = ref<InstanceType<typeof RelationNodeDrawerRelations> | null>(
  null
);

const filterRelationsByDirection = (direction: "incoming" | "outgoing") => {
  relationsRef.value?.setDirectionFilter(direction);
  relationsSectionRef.value?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
};

// update:attack-path-filters：直接写回 vm 的 ref
const updateAttackPathFilters = (value: AttackPathFilters) => {
  attackPathFilters.value = value;
};
</script>

<template>
  <RelationNodeDrawerHeader
    :selected-network-node="selectedNetworkNode"
    :selected-network-node-title="selectedNetworkNodeTitle"
    :selected-network-relation-counts="selectedNetworkRelationCounts"
    :rel-key="relKey"
    :get-node-type-title="getNodeTypeTitle"
    :show-open-as-root-action="showOpenAsRootAction"
    @view-detail="gotoSelectedNodeDetailView"
    @open-detail-new-window="openSelectedNodeDetailInNewWindow"
    @open-as-root="openSelectedNodeAsRoot"
    @filter-relations-by-direction="filterRelationsByDirection"
  />
  <RelationNodeInsightBlocks
    :root-node-relations="rootNodeRelations"
    :selected-node-root-path="selectedNodeRootPath"
    :selected-node-analysis-summary="selectedNodeAnalysisSummary"
    :selected-node-related-entity-summary="selectedNodeRelatedEntitySummary"
    :selected-node-type="selectedNetworkNode.type"
    :selected-node-id="selectedNetworkNode.id"
    :selected-node-attack-path-summary="selectedNodeAttackPathSummary"
    :selected-node-attack-path-description="selectedNodeAttackPathDescription"
    :selected-node-attack-path-explanations="selectedNodeAttackPathExplanations"
    :attack-path-filter-options="attackPathFilterOptions"
    :attack-path-filters="attackPathFilters"
    :has-active-attack-path-filters="hasActiveAttackPathFilters"
    :selected-node-business-scene-impact-summary="
      selectedNodeBusinessSceneImpactSummary
    "
    :selected-node-coverage-summary="selectedNodeCoverageSummary"
    :show-root-relation-block="showRootRelationBlock"
    :show-coverage-block="showCoverageBlock"
    :show-attack-path-block="showAttackPathBlock"
    :hide-related-entity-actions="hideRelatedEntityActions"
    :rel-key="relKey"
    :is-path-node-current-selection="isPathNodeCurrentSelection"
    :is-current-node-root="isCurrentNodeRoot"
    @update:attack-path-filters="updateAttackPathFilters"
    @reset-attack-path-filters="resetAttackPathFilters"
    @focus-node="focusNodeInDrawer"
    @open-node-as-root="openNodeAsRootById"
    @open-node-detail="gotoNodeDetailViewById"
  />
  <div ref="relationsSectionRef">
    <RelationNodeDrawerRelations
      ref="relationsRef"
      :selected-network-relations="selectedNetworkRelations"
      :is-relation-on-selected-path="isRelationOnSelectedPath"
      :copy-feedback-message="drawerCopyFeedbackMessage"
      :copy-feedback-type="drawerCopyFeedbackType"
      @copy-csv="copySelectedNodeCsv"
      @open-node-detail="gotoNodeDetailViewById"
    />
  </div>
</template>
