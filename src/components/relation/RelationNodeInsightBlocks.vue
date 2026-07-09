<script setup lang="ts">
import RelationNodeAnalysisBlock from "@/components/relation/RelationNodeAnalysisBlock.vue";
import RelationNodeAttackPathBlock from "@/components/relation/RelationNodeAttackPathBlock.vue";
import RelationNodeBusinessDomainImpactBlock from "@/components/relation/RelationNodeBusinessDomainImpactBlock.vue";
import RelationNodeCoverageBlock from "@/components/relation/RelationNodeCoverageBlock.vue";
import RelationNodeRelatedEntityBlock from "@/components/relation/RelationNodeRelatedEntityBlock.vue";
import RelationNodeRootRelationBlock from "@/components/relation/RelationNodeRootRelationBlock.vue";
import type {
  AttackPathExplanation,
  NodeAnalysisSummary,
  NodeBusinessDomainImpactSummary,
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
import "@/components/relation/relationNodeDrawerInsights.css";

defineProps<{
  rootNodeRelations: RootRelationSummary[];
  selectedNodeRootPath: RootPathSummary | null;
  selectedNodeAnalysisSummary: NodeAnalysisSummary | null;
  selectedNodeRelatedEntitySummary: NodeRelatedEntitySummary | null;
  selectedNodeType: string;
  selectedNodeId: string;
  selectedNodeAttackPathSummary: string[];
  selectedNodeAttackPathDescription: string;
  selectedNodeAttackPathExplanations: AttackPathExplanation[];
  attackPathFilterOptions: Record<AttackPathFilterType, AttackPathFilterOption[]>;
  attackPathFilters: AttackPathFilters;
  hasActiveAttackPathFilters: boolean;
  selectedNodeBusinessDomainImpactSummary: NodeBusinessDomainImpactSummary | null;
  selectedNodeCoverageSummary: NodeCoverageSummary | null;
  showRootRelationBlock?: boolean;
  showCoverageBlock?: boolean;
  showAttackPathBlock?: boolean;
  hideRelatedEntityActions?: boolean;
  relKey: string;
  isPathNodeCurrentSelection: (nodeId: string) => boolean;
  isCurrentNodeRoot: boolean;
}>();

const emit = defineEmits<{
  "update:attack-path-filters": [value: AttackPathFilters];
  "reset-attack-path-filters": [];
  "focus-node": [nodeId: string];
  "open-node-as-root": [nodeId: string];
  "open-node-detail": [nodeId: string];
}>();
</script>

<template>
  <RelationNodeRootRelationBlock
    v-if="showRootRelationBlock !== false"
    :root-node-relations="rootNodeRelations"
    :selected-node-root-path="selectedNodeRootPath"
    :rel-key="relKey"
    :is-path-node-current-selection="isPathNodeCurrentSelection"
    :is-current-node-root="isCurrentNodeRoot"
    @focus-node="emit('focus-node', $event)"
    @open-node-as-root="emit('open-node-as-root', $event)"
  />
  <RelationNodeAnalysisBlock
    :summary="selectedNodeAnalysisSummary"
    :selected-node-type="selectedNodeType"
    :selected-node-id="selectedNodeId"
  />
  <RelationNodeRelatedEntityBlock
    :summary="selectedNodeRelatedEntitySummary"
    :hide-actions="hideRelatedEntityActions"
    @focus-node="emit('focus-node', $event)"
    @open-node-as-root="emit('open-node-as-root', $event)"
    @open-node-detail="emit('open-node-detail', $event)"
  />
  <RelationNodeBusinessDomainImpactBlock
    :summary="selectedNodeBusinessDomainImpactSummary"
  />
  <RelationNodeCoverageBlock
    v-if="showCoverageBlock !== false"
    :summary="selectedNodeCoverageSummary"
  />
  <RelationNodeAttackPathBlock
    v-if="showAttackPathBlock !== false"
    :selected-node-attack-path-summary="selectedNodeAttackPathSummary"
    :selected-node-attack-path-description="selectedNodeAttackPathDescription"
    :selected-node-attack-path-explanations="selectedNodeAttackPathExplanations"
    :attack-path-filter-options="attackPathFilterOptions"
    :attack-path-filters="attackPathFilters"
    :has-active-attack-path-filters="hasActiveAttackPathFilters"
    @update:attack-path-filters="emit('update:attack-path-filters', $event)"
    @reset-attack-path-filters="emit('reset-attack-path-filters')"
  />
</template>
