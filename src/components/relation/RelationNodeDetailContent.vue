<script setup lang="ts">
import { ref } from "vue";
import RelationNodeDrawerHeader from "@/components/relation/RelationNodeDrawerHeader.vue";
import RelationNodeDrawerRelations from "@/components/relation/RelationNodeDrawerRelations.vue";
import RelationNodeInsightBlocks from "@/components/relation/RelationNodeInsightBlocks.vue";
import type {
  AttackPathExplanation,
  NodeAnalysisSummary,
  NodeBusinessSceneImpactSummary,
  NodeCoverageSummary,
  RootPathSummary,
  RootRelationSummary,
} from "@/components/relation/relationNodeDrawerInsightTypes";
import type {
  AttackPathFilterOption,
  AttackPathFilterType,
  AttackPathFilters,
} from "@/views/relation/relationTypes";

interface DetailNode {
  id: string;
  type: string;
}

interface RelationSummary {
  relationKey: string;
  direction: string;
  text: string;
  directness: string;
  otherNodeId: string;
  otherNodeType: string;
  otherNodeTitle: string;
  sourceFields: string[];
  evidenceLabel: string;
  explanation: string;
  impactHint: string;
  qualityFlags: string[];
}

defineProps<{
  selectedNetworkNode: DetailNode;
  selectedNetworkNodeTitle: string;
  selectedNetworkRelationCounts: {
    incoming: number;
    outgoing: number;
  };
  rootNodeRelations: RootRelationSummary[];
  selectedNodeRootPath: RootPathSummary | null;
  selectedNodeAnalysisSummary: NodeAnalysisSummary | null;
  selectedNodeAttackPathSummary: string[];
  selectedNodeAttackPathDescription: string;
  selectedNodeAttackPathExplanations: AttackPathExplanation[];
  attackPathFilterOptions: Record<AttackPathFilterType, AttackPathFilterOption[]>;
  attackPathFilters: AttackPathFilters;
  hasActiveAttackPathFilters: boolean;
  selectedNodeBusinessSceneImpactSummary: NodeBusinessSceneImpactSummary | null;
  selectedNodeCoverageSummary: NodeCoverageSummary | null;
  selectedNetworkRelations: RelationSummary[];
  relKey: string;
  getNodeTypeTitle: (type: string) => string;
  isPathNodeCurrentSelection: (nodeId: string) => boolean;
  isRelationOnSelectedPath: (relationKey: string) => boolean;
  isCurrentNodeRoot: boolean;
  drawerCopyFeedbackMessage: string;
  drawerCopyFeedbackType: "success" | "error";
  showOpenAsRootAction?: boolean;
  showRootRelationBlock?: boolean;
  showAttackPathBlock?: boolean;
}>();

const emit = defineEmits<{
  "copy-csv": [];
  "view-detail": [];
  "open-detail-new-window": [];
  "open-as-root": [];
  "update:attack-path-filters": [value: AttackPathFilters];
  "reset-attack-path-filters": [];
  "focus-node": [nodeId: string];
  "open-node-as-root": [nodeId: string];
  "open-node-detail": [nodeId: string];
}>();

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
</script>

<template>
  <RelationNodeDrawerHeader
    :selected-network-node="selectedNetworkNode"
    :selected-network-node-title="selectedNetworkNodeTitle"
    :selected-network-relation-counts="selectedNetworkRelationCounts"
    :rel-key="relKey"
    :get-node-type-title="getNodeTypeTitle"
    :show-open-as-root-action="showOpenAsRootAction"
    @view-detail="emit('view-detail')"
    @open-detail-new-window="emit('open-detail-new-window')"
    @open-as-root="emit('open-as-root')"
    @filter-relations-by-direction="filterRelationsByDirection"
  />
  <RelationNodeInsightBlocks
    :root-node-relations="rootNodeRelations"
    :selected-node-root-path="selectedNodeRootPath"
    :selected-node-analysis-summary="selectedNodeAnalysisSummary"
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
    :show-attack-path-block="showAttackPathBlock"
    :rel-key="relKey"
    :is-path-node-current-selection="isPathNodeCurrentSelection"
    :is-current-node-root="isCurrentNodeRoot"
    @update:attack-path-filters="emit('update:attack-path-filters', $event)"
    @reset-attack-path-filters="emit('reset-attack-path-filters')"
    @focus-node="emit('focus-node', $event)"
    @open-node-as-root="emit('open-node-as-root', $event)"
  />
  <div ref="relationsSectionRef">
    <RelationNodeDrawerRelations
      ref="relationsRef"
      :selected-network-relations="selectedNetworkRelations"
      :is-relation-on-selected-path="isRelationOnSelectedPath"
      :copy-feedback-message="drawerCopyFeedbackMessage"
      :copy-feedback-type="drawerCopyFeedbackType"
      @copy-csv="emit('copy-csv')"
      @open-node-detail="emit('open-node-detail', $event)"
    />
  </div>
</template>
