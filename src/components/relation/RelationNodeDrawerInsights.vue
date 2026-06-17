<script setup lang="ts">
import RelationNodeAnalysisBlock from "@/components/relation/RelationNodeAnalysisBlock.vue";
import RelationNodeAttackPathBlock from "@/components/relation/RelationNodeAttackPathBlock.vue";
import RelationNodeCoverageBlock from "@/components/relation/RelationNodeCoverageBlock.vue";
import RelationNodeRootRelationBlock from "@/components/relation/RelationNodeRootRelationBlock.vue";
import type {
  AttackPathExplanation,
  NodeAnalysisSummary,
  NodeCoverageSummary,
  RootPathSummary,
  RootRelationSummary,
} from "@/components/relation/relationNodeDrawerInsightTypes";
import "@/components/relation/relationNodeDrawerInsights.css";

defineProps<{
  rootNodeRelations: RootRelationSummary[];
  selectedNodeRootPath: RootPathSummary | null;
  selectedNodeAnalysisSummary: NodeAnalysisSummary | null;
  selectedNodeAttackPathSummary: string[];
  selectedNodeAttackPathDescription: string;
  selectedNodeAttackPathExplanations: AttackPathExplanation[];
  selectedNodeCoverageSummary: NodeCoverageSummary | null;
  relKey: string;
  isPathNodeCurrentSelection: (nodeId: string) => boolean;
  isCurrentNodeRoot: boolean;
}>();

const emit = defineEmits<{
  "focus-node": [nodeId: string];
  "open-node-as-root": [nodeId: string];
}>();
</script>

<template>
  <RelationNodeRootRelationBlock
    :root-node-relations="rootNodeRelations"
    :selected-node-root-path="selectedNodeRootPath"
    :rel-key="relKey"
    :is-path-node-current-selection="isPathNodeCurrentSelection"
    :is-current-node-root="isCurrentNodeRoot"
    @focus-node="emit('focus-node', $event)"
    @open-node-as-root="emit('open-node-as-root', $event)"
  />
  <RelationNodeAnalysisBlock :summary="selectedNodeAnalysisSummary" />
  <RelationNodeCoverageBlock :summary="selectedNodeCoverageSummary" />
  <RelationNodeAttackPathBlock
    :selected-node-attack-path-summary="selectedNodeAttackPathSummary"
    :selected-node-attack-path-description="selectedNodeAttackPathDescription"
    :selected-node-attack-path-explanations="selectedNodeAttackPathExplanations"
  />
</template>
