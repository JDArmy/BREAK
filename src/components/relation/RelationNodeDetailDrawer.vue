<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { TopRight } from "@element-plus/icons-vue";

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
}

interface RootRelationSummary {
  direction: string;
  text: string;
  directness: string;
  sourceFields: string[];
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
  selectedNodeRootPreview: RootPreviewSummary | null;
  selectedNetworkRelations: RelationSummary[];
  relKey: string;
  getNodeTypeTitle: (type: string) => string;
  isPathNodeCurrentSelection: (nodeId: string) => boolean;
  isRelationOnSelectedPath: (relationKey: string) => boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  "view-detail": [];
  "open-as-root": [];
  "focus-node": [nodeId: string];
  "open-node-as-root": [nodeId: string];
}>();

const { t } = useI18n();

const drawerVisible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit("update:modelValue", value),
});
</script>

<template>
  <el-drawer
    v-model="drawerVisible"
    :title="t('relationView.nodeDetail')"
    direction="rtl"
    size="420px"
    append-to-body
    :z-index="4000"
    class="relation-drawer"
  >
    <div v-if="selectedNetworkNode" class="drawer-section">
      <div class="node-detail-title">
        <span class="node-detail-id">{{ selectedNetworkNode.id }}</span>
        <span class="node-detail-type">{{ getNodeTypeTitle(selectedNetworkNode.type) }}</span>
      </div>
      <div class="node-detail-name">{{ selectedNetworkNodeTitle }}</div>
      <div class="node-detail-counts">
        <span>{{ t("relationView.incoming") }}: {{ selectedNetworkRelationCounts.incoming }}</span>
        <span>{{ t("relationView.outgoing") }}: {{ selectedNetworkRelationCounts.outgoing }}</span>
      </div>
      <div class="node-detail-actions">
        <el-button size="small" @click="emit('view-detail')">
          <span class="menu-action-with-icon">
            <el-icon><TopRight /></el-icon>
            <span>{{ t("viewDetail") }}</span>
          </span>
        </el-button>
        <el-button
          size="small"
          :disabled="selectedNetworkNode.id === relKey"
          @click="emit('open-as-root')"
        >
          {{ t("openAsRoot") }}
        </el-button>
      </div>
      <div v-if="rootNodeRelations.length" class="node-explain-block">
        <h3>{{ t("relationView.rootRelation") }}</h3>
        <div
          v-for="relation in rootNodeRelations"
          :key="`${relation.direction}-${relation.text}`"
          class="node-relation-item"
        >
          <div>
            <span class="node-relation-direction">{{ relation.direction }}</span>
            <span>{{ relation.text }}</span>
            <span class="node-relation-directness">{{ relation.directness }}</span>
          </div>
          <div v-if="relation.sourceFields.length" class="node-relation-fields">
            {{ t("relationView.sourceFields") }}: {{ relation.sourceFields.join(", ") }}
          </div>
        </div>
      </div>
      <div v-else class="node-explain-block">
        <h3>{{ t("relationView.rootRelation") }}</h3>
        <div class="node-relation-more">{{ t("relationView.noDirectRootRelation") }}</div>
        <div v-if="selectedNodeRootPath" class="node-path-preview">
          <div class="node-path-summary">
            {{ t("relationView.indirectPathSummary", { count: selectedNodeRootPath.hopCount }) }}
          </div>
          <div class="node-path-chain">
            <div class="node-path-node node-path-node-root">
              <div class="node-path-node-tag">{{ t("relationView.rootStart") }}</div>
              <div class="node-path-node-main">
                <span :title="selectedNodeRootPath.startNode.type" class="node-path-node-id">
                  {{ selectedNodeRootPath.startNode.id }}
                </span>
                <span>{{ selectedNodeRootPath.startNode.title }}</span>
              </div>
              <div class="node-path-node-actions">
                <el-button
                  link
                  size="small"
                  :disabled="isPathNodeCurrentSelection(selectedNodeRootPath.startNode.id)"
                  @click="emit('focus-node', selectedNodeRootPath.startNode.id)"
                >
                  {{ t("relationView.switchNode") }}
                </el-button>
                <el-button link size="small" disabled>
                  {{ t("openAsRoot") }}
                </el-button>
              </div>
            </div>
            <div
              v-for="(step, index) in selectedNodeRootPath.steps"
              :key="`${step.relation.direction}-${step.relation.text}-${step.targetNode.id}-${index}`"
              class="node-path-step"
            >
              <div class="node-path-relation">
                <div>
                  <span class="node-relation-direction">{{ step.relation.direction }}</span>
                  <span>{{ step.relation.text }}</span>
                  <span class="node-relation-directness">{{ step.relation.directness }}</span>
                </div>
                <div v-if="step.relation.sourceFields.length" class="node-relation-fields">
                  {{ t("relationView.sourceFields") }}: {{ step.relation.sourceFields.join(", ") }}
                </div>
              </div>
              <div :class="['node-path-node', step.isCurrentTarget ? 'node-path-node-current' : '']">
                <div class="node-path-node-tag">
                  {{ step.isCurrentTarget ? t("relationView.currentNode") : t("relationView.pathNode") }}
                </div>
                <div class="node-path-node-main">
                  <span :title="step.targetNode.type" class="node-path-node-id">{{ step.targetNode.id }}</span>
                  <span>{{ step.targetNode.title }}</span>
                </div>
                <div class="node-path-node-actions">
                  <el-button
                    link
                    size="small"
                    :disabled="isPathNodeCurrentSelection(step.targetNode.id)"
                    @click="emit('focus-node', step.targetNode.id)"
                  >
                    {{ t("relationView.switchNode") }}
                  </el-button>
                  <el-button
                    link
                    size="small"
                    :disabled="step.targetNode.id === relKey"
                    @click="emit('open-node-as-root', step.targetNode.id)"
                  >
                    {{ t("openAsRoot") }}
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-if="selectedNodeAttackPathSummary.length" class="node-explain-block">
        <h3>{{ t("relationView.attackPathRole") }}</h3>
        <div v-if="selectedNodeAttackPathDescription" class="node-relation-more">
          {{ selectedNodeAttackPathDescription }}
        </div>
        <div class="node-role-list">
          <span v-for="role in selectedNodeAttackPathSummary" :key="role" class="node-role-chip">{{ role }}</span>
        </div>
      </div>
      <div v-if="selectedNodeRootPreview" class="node-explain-block">
        <h3>{{ t("relationView.rootPreview") }}</h3>
        <div class="node-detail-counts">
          <span>{{ t("relationView.previewNodeCount") }}: {{ selectedNodeRootPreview.nodeCount }}</span>
          <span>{{ t("relationView.previewRelationCount") }}: {{ selectedNodeRootPreview.lineCount }}</span>
        </div>
        <div class="node-preview-groups">
          <span
            v-for="(count, type) in selectedNodeRootPreview.groupedCounts"
            :key="type"
            class="node-role-chip"
          >
            {{ getNodeTypeTitle(type) }} {{ count }}
          </span>
        </div>
      </div>
      <div class="node-explain-block">
        <h3>{{ t("relationView.allRelations") }}</h3>
      </div>
      <div class="node-relation-list">
        <div
          v-for="relation in selectedNetworkRelations"
          :key="relation.relationKey"
          :class="['node-relation-item', { 'node-relation-item-active': isRelationOnSelectedPath(relation.relationKey) }]"
        >
          <div>
            <span class="node-relation-direction">{{ relation.direction }}</span>
            <span>{{ relation.text }}</span>
            <span class="node-relation-directness">{{ relation.directness }}</span>
          </div>
          <div class="node-relation-target">
            <span :title="relation.otherNodeType">{{ relation.otherNodeId }}</span>
            <span>{{ relation.otherNodeTitle }}</span>
          </div>
          <div v-if="relation.sourceFields.length" class="node-relation-fields">
            {{ t("relationView.sourceFields") }}: {{ relation.sourceFields.join(", ") }}
          </div>
        </div>
      </div>
    </div>
  </el-drawer>
</template>

<style scoped>
.drawer-section {
  color: var(--break-text-primary);
}

.node-relation-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.node-relation-item {
  padding-top: 6px;
  border-top: 1px solid var(--break-border);
  font-size: 12px;
  line-height: 1.4;
}

.node-relation-item-active {
  margin-inline: -8px;
  padding: 6px 8px 0;
  border-radius: 8px;
  background: color-mix(in srgb, var(--el-color-primary) 10%, transparent);
  border-top-color: color-mix(in srgb, var(--el-color-primary) 28%, var(--break-border));
}

.menu-action-with-icon {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.node-relation-direction {
  margin-right: 6px;
  font-weight: 700;
}

.node-relation-fields,
.node-relation-target,
.node-relation-more {
  color: var(--break-text-muted);
  overflow-wrap: anywhere;
}

.node-path-preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.node-path-summary {
  color: var(--break-text-secondary);
  font-size: 12px;
}

.node-path-chain {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.node-path-step {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-left: 12px;
}

.node-path-step::before {
  content: "";
  position: absolute;
  top: -4px;
  bottom: calc(100% - 12px);
  left: 3px;
  width: 1px;
  background: var(--break-border);
}

.node-path-node {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  border: 1px solid var(--break-border);
  border-radius: 8px;
  background: var(--break-bg-soft);
}

.node-path-node-root {
  border-color: color-mix(in srgb, var(--el-color-primary) 28%, var(--break-border));
}

.node-path-node-current {
  border-color: color-mix(in srgb, var(--el-color-success) 28%, var(--break-border));
}

.node-path-node-tag {
  color: var(--break-text-muted);
  font-size: 11px;
  font-weight: 600;
}

.node-path-node-main {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 6px;
  color: var(--break-text-primary);
  font-size: 12px;
  overflow-wrap: anywhere;
}

.node-path-node-id {
  font-weight: 700;
}

.node-path-node-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
}

.node-path-relation {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-left: 16px;
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

.node-detail-title,
.node-detail-counts,
.node-detail-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.node-detail-id {
  font-weight: 800;
}

.node-detail-type {
  padding: 2px 6px;
  border: 1px solid var(--break-border);
  border-radius: 999px;
  color: var(--break-text-secondary);
  font-size: 11px;
}

.node-detail-name {
  margin-bottom: 8px;
  color: var(--break-text-secondary);
  font-size: 13px;
  overflow-wrap: anywhere;
}

.node-detail-counts {
  color: var(--break-text-muted);
  font-size: 12px;
}

.node-explain-block {
  margin-top: 14px;
}

.node-explain-block h3 {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 700;
}

.node-relation-directness,
.node-role-chip {
  display: inline-flex;
  align-items: center;
  margin-left: 8px;
  padding: 2px 8px;
  border: 1px solid var(--break-border);
  border-radius: 999px;
  color: var(--break-text-secondary);
  font-size: 11px;
}

.node-role-list,
.node-preview-groups {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.node-relation-target {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
</style>
