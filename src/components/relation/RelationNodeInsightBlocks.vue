<script setup lang="ts">
import RelationNodeAnalysisBlock from "@/components/relation/RelationNodeAnalysisBlock.vue";
import RelationNodeAttackPathBlock from "@/components/relation/RelationNodeAttackPathBlock.vue";
import RelationNodeBusinessSceneImpactBlock from "@/components/relation/RelationNodeBusinessSceneImpactBlock.vue";
import RelationNodeCoverageBlock from "@/components/relation/RelationNodeCoverageBlock.vue";
import RelationNodeRootRelationBlock from "@/components/relation/RelationNodeRootRelationBlock.vue";
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
import "@/components/relation/relationNodeDrawerInsights.css";

defineProps<{
  rootNodeRelations: RootRelationSummary[];
  selectedNodeRootPath: RootPathSummary | null;
  selectedNodeAnalysisSummary: NodeAnalysisSummary | null;
  selectedNodeType: string;
  selectedNodeId: string;
  selectedNodeAttackPathSummary: string[];
  selectedNodeAttackPathDescription: string;
  selectedNodeAttackPathExplanations: AttackPathExplanation[];
  attackPathFilterOptions: Record<AttackPathFilterType, AttackPathFilterOption[]>;
  attackPathFilters: AttackPathFilters;
  hasActiveAttackPathFilters: boolean;
  selectedNodeBusinessSceneImpactSummary: NodeBusinessSceneImpactSummary | null;
  selectedNodeCoverageSummary: NodeCoverageSummary | null;
  showRootRelationBlock?: boolean;
  showAttackPathBlock?: boolean;
  relKey: string;
  isPathNodeCurrentSelection: (nodeId: string) => boolean;
  isCurrentNodeRoot: boolean;
}>();

const emit = defineEmits<{
  "update:attack-path-filters": [value: AttackPathFilters];
  "reset-attack-path-filters": [];
  "focus-node": [nodeId: string];
  "open-node-as-root": [nodeId: string];
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
  <RelationNodeBusinessSceneImpactBlock
    :summary="selectedNodeBusinessSceneImpactSummary"
  />
  <RelationNodeCoverageBlock :summary="selectedNodeCoverageSummary" />
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
