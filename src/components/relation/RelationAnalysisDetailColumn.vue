<script setup lang="ts">
import { useI18n } from "vue-i18n";
import RelationNodeDetailContent from "@/components/relation/RelationNodeDetailContent.vue";
import type {
  AttackPathExplanation,
  NodeAnalysisSummary,
  NodeBusinessSceneImpactSummary,
  NodeCoverageSummary,
  NodeRelatedEntitySummary,
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
  attackPathFilterOptions: Record<AttackPathFilterType, AttackPathFilterOption[]>;
  attackPathFilters: AttackPathFilters;
  drawerCopyFeedbackMessage: string;
  drawerCopyFeedbackType: "success" | "error";
  getNodeTypeTitle: (type: string) => string;
  hasActiveAttackPathFilters: boolean;
  isCurrentNodeRoot: boolean;
  isPathNodeCurrentSelection: (nodeId: string) => boolean;
  isRelationOnSelectedPath: (relationKey: string) => boolean;
  relKey: string;
  rootNodeRelations: RootRelationSummary[];
  selectedNetworkNode: DetailNode | null;
  selectedNetworkNodeTitle: string;
  selectedNetworkRelationCounts: {
    incoming: number;
    outgoing: number;
  };
  selectedNetworkRelations: RelationSummary[];
  selectedNodeAnalysisSummary: NodeAnalysisSummary | null;
  selectedNodeAttackPathDescription: string;
  selectedNodeAttackPathExplanations: AttackPathExplanation[];
  selectedNodeAttackPathSummary: string[];
  selectedNodeBusinessSceneImpactSummary: NodeBusinessSceneImpactSummary | null;
  selectedNodeCoverageSummary: NodeCoverageSummary | null;
  selectedNodeRelatedEntitySummary: NodeRelatedEntitySummary | null;
  selectedNodeRootPath: RootPathSummary | null;
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

const { t } = useI18n();
</script>

<template>
  <div v-if="selectedNetworkNode" class="node-explain-block">
    <h3>{{ t("relationView.relationDetail") }}</h3>
    <div class="node-insight-panel relation-analysis-detail-panel">
      <RelationNodeDetailContent
        :selected-network-node="selectedNetworkNode"
        :selected-network-node-title="selectedNetworkNodeTitle"
        :selected-network-relation-counts="selectedNetworkRelationCounts"
        :root-node-relations="rootNodeRelations"
        :selected-node-root-path="selectedNodeRootPath"
        :selected-node-analysis-summary="selectedNodeAnalysisSummary"
        :selected-node-related-entity-summary="selectedNodeRelatedEntitySummary"
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
        :show-root-relation-block="false"
        :show-coverage-block="false"
        :show-attack-path-block="false"
        :selected-network-relations="selectedNetworkRelations"
        :rel-key="relKey"
        :get-node-type-title="getNodeTypeTitle"
        :is-path-node-current-selection="isPathNodeCurrentSelection"
        :is-relation-on-selected-path="isRelationOnSelectedPath"
        :is-current-node-root="isCurrentNodeRoot"
        :drawer-copy-feedback-message="drawerCopyFeedbackMessage"
        :drawer-copy-feedback-type="drawerCopyFeedbackType"
        :show-open-as-root-action="false"
        @copy-csv="emit('copy-csv')"
        @view-detail="emit('view-detail')"
        @open-detail-new-window="emit('open-detail-new-window')"
        @open-as-root="emit('open-as-root')"
        @update:attack-path-filters="
          emit('update:attack-path-filters', $event)
        "
        @reset-attack-path-filters="emit('reset-attack-path-filters')"
        @focus-node="emit('focus-node', $event)"
        @open-node-as-root="emit('open-node-as-root', $event)"
        @open-node-detail="emit('open-node-detail', $event)"
      />
    </div>
  </div>
</template>
