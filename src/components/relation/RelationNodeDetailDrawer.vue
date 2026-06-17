<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useBreakpoints } from "@/composables/useBreakpoints";
import RelationNodeDrawerHeader from "@/components/relation/RelationNodeDrawerHeader.vue";
import RelationNodeDrawerInsights from "@/components/relation/RelationNodeDrawerInsights.vue";
import RelationNodeDrawerRelations from "@/components/relation/RelationNodeDrawerRelations.vue";

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

interface RootRelationSummary {
  direction: string;
  text: string;
  directness: string;
  sourceFields: string[];
  evidenceLabel: string;
  explanation: string;
  impactHint: string;
  qualityFlags: string[];
}

interface PathNodeSummary {
  id: string;
  type: string;
  title: string;
}

interface PathStepSummary {
  relation: {
    direction: string;
    text: string;
    directness: string;
    sourceFields: string[];
  };
  targetNode: PathNodeSummary;
  isCurrentTarget: boolean;
}

interface RootPathSummary {
  hopCount: number;
  startNode: PathNodeSummary;
  steps: PathStepSummary[];
}

interface RootPreviewSummary {
  nodeCount: number;
  lineCount: number;
  groupedCounts: Record<string, number>;
}

interface AttackPathExplanation {
  pathKey: string;
  threatActorId?: string;
  attackToolId?: string;
  riskId: string;
  avoidanceId?: string;
  summary: string;
  defensiveFocus: string[];
  qualityFlags: string[];
  steps: Array<{
    fromId: string;
    toId: string;
    relationType: string;
    sourceFields: string[];
    attackIntent: string;
    defensiveMeaning: string;
  }>;
}

const props = defineProps<{
  modelValue: boolean;
  selectedNetworkNode: DetailNode | null;
  selectedNetworkNodeTitle: string;
  selectedNetworkRelationCounts: {
    incoming: number;
    outgoing: number;
  };
  rootNodeRelations: RootRelationSummary[];
  selectedNodeRootPath: RootPathSummary | null;
  selectedNodeAttackPathSummary: string[];
  selectedNodeAttackPathDescription: string;
  selectedNodeAttackPathExplanations: AttackPathExplanation[];
  selectedNodeRootPreview: RootPreviewSummary | null;
  isCurrentNodeRoot: boolean;
  selectedNetworkRelations: RelationSummary[];
  relKey: string;
  getNodeTypeTitle: (type: string) => string;
  isPathNodeCurrentSelection: (nodeId: string) => boolean;
  isRelationOnSelectedPath: (relationKey: string) => boolean;
  drawerCopyFeedbackMessage: string;
  drawerCopyFeedbackType: "success" | "error";
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  "copy-csv": [];
  "view-detail": [];
  "open-detail-new-window": [];
  "open-as-root": [];
  "focus-node": [nodeId: string];
  "open-node-as-root": [nodeId: string];
  "open-node-detail": [nodeId: string];
}>();

const { t } = useI18n();
const { isMobile } = useBreakpoints();

const drawerVisible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit("update:modelValue", value),
});
</script>

<template>
  <el-drawer
    v-model="drawerVisible"
    :title="t('relationView.nodeDetail')"
    :direction="isMobile ? 'btt' : 'rtl'"
    :size="isMobile ? '82dvh' : '520px'"
    append-to-body
    :z-index="4000"
    class="relation-drawer"
  >
    <div v-if="selectedNetworkNode" class="drawer-section">
      <RelationNodeDrawerHeader
        :selected-network-node="selectedNetworkNode"
        :selected-network-node-title="selectedNetworkNodeTitle"
        :selected-network-relation-counts="selectedNetworkRelationCounts"
        :rel-key="relKey"
        :get-node-type-title="getNodeTypeTitle"
        @view-detail="emit('view-detail')"
        @open-detail-new-window="emit('open-detail-new-window')"
        @open-as-root="emit('open-as-root')"
      />
      <RelationNodeDrawerInsights
        :root-node-relations="rootNodeRelations"
        :selected-node-root-path="selectedNodeRootPath"
        :selected-node-attack-path-summary="selectedNodeAttackPathSummary"
        :selected-node-attack-path-description="selectedNodeAttackPathDescription"
        :selected-node-attack-path-explanations="selectedNodeAttackPathExplanations"
        :selected-node-root-preview="selectedNodeRootPreview"
        :rel-key="relKey"
        :get-node-type-title="getNodeTypeTitle"
        :is-path-node-current-selection="isPathNodeCurrentSelection"
        :is-current-node-root="isCurrentNodeRoot"
        @focus-node="emit('focus-node', $event)"
        @open-node-as-root="emit('open-node-as-root', $event)"
      />
      <RelationNodeDrawerRelations
        :selected-network-relations="selectedNetworkRelations"
        :is-relation-on-selected-path="isRelationOnSelectedPath"
        :copy-feedback-message="drawerCopyFeedbackMessage"
        :copy-feedback-type="drawerCopyFeedbackType"
        @copy-csv="emit('copy-csv')"
        @open-node-detail="emit('open-node-detail', $event)"
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
