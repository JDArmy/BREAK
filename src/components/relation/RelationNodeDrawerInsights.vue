<script setup lang="ts">
import { useI18n } from "vue-i18n";

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

defineProps<{
  rootNodeRelations: RootRelationSummary[];
  selectedNodeRootPath: RootPathSummary | null;
  selectedNodeAttackPathSummary: string[];
  selectedNodeAttackPathDescription: string;
  selectedNodeRootPreview: RootPreviewSummary | null;
  relKey: string;
  getNodeTypeTitle: (type: string) => string;
  isPathNodeCurrentSelection: (nodeId: string) => boolean;
  isCurrentNodeRoot: boolean;
}>();

const emit = defineEmits<{
  "focus-node": [nodeId: string];
  "open-node-as-root": [nodeId: string];
}>();

const { t } = useI18n();
</script>

<template>
  <div v-if="rootNodeRelations.length" class="node-explain-block">
    <h3>{{ t("relationView.rootRelation") }}</h3>
    <div class="node-insight-panel">
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
  </div>
  <div v-else class="node-explain-block">
    <h3>{{ t("relationView.rootRelation") }}</h3>
    <div class="node-insight-panel">
      <div class="node-relation-more">{{ isCurrentNodeRoot ? t("relationView.currentNodeIsRoot") : t("relationView.noDirectRootRelation") }}</div>
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
  </div>

  <div v-if="selectedNodeAttackPathSummary.length" class="node-explain-block">
    <h3>{{ t("relationView.attackPathRole") }}</h3>
    <div class="node-insight-panel node-attack-role-panel">
      <div v-if="selectedNodeAttackPathDescription" class="node-attack-role-description">
        {{ selectedNodeAttackPathDescription }}
      </div>
      <div class="node-role-list">
        <span v-for="role in selectedNodeAttackPathSummary" :key="role" class="node-role-chip">{{ role }}</span>
      </div>
    </div>
  </div>

  <div v-if="selectedNodeRootPreview" class="node-explain-block">
    <h3>{{ t("relationView.rootPreview") }}</h3>
    <div class="node-insight-panel">
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
  </div>
</template>

<style scoped>
.node-explain-block {
  margin-top: 14px;
}

.node-explain-block h3 {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 700;
}

.node-insight-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--break-border);
  border-radius: 8px;
  background: var(--break-bg-soft);
}

.node-relation-item {
  padding-top: 10px;
  font-size: 12px;
  line-height: 1.4;
}

.node-relation-item:first-child {
  padding-top: 0;
}

.node-relation-item + .node-relation-item {
  border-top: 1px solid var(--break-border);
}

.node-relation-direction {
  margin-right: 6px;
  font-weight: 700;
}

.node-relation-fields,
.node-relation-more {
  color: var(--break-text-muted);
  font-size: 12px;
  line-height: 1.65;
  overflow-wrap: anywhere;
}

.node-relation-directness {
  display: inline-flex;
  align-items: center;
  margin-left: 8px;
  padding: 2px 8px;
  border: 1px solid var(--break-border);
  border-radius: 999px;
  color: var(--break-text-secondary);
  font-size: 11px;
}

.node-role-chip {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border: 1px solid var(--break-border);
  border-radius: 999px;
  background: var(--break-bg);
  color: var(--break-text-secondary);
  font-size: 11px;
  line-height: 1.2;
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

.node-role-list,
.node-preview-groups,
.node-detail-counts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.node-detail-counts {
  color: var(--break-text-muted);
  font-size: 12px;
}

.node-attack-role-panel {
  border: 1px solid color-mix(in srgb, var(--el-color-primary) 18%, var(--break-border));
  background: color-mix(in srgb, var(--el-color-primary) 4%, var(--break-bg));
}

.node-attack-role-description {
  color: var(--break-text-secondary);
  font-size: 12px;
  line-height: 1.65;
}

@media (max-width: 767px) {
  .node-explain-block {
    margin-top: 10px;
  }

  .node-explain-block h3 {
    margin-bottom: 6px;
    font-size: 12px;
  }

  .node-insight-panel {
    gap: 8px;
    padding: 8px 9px;
    border-radius: 7px;
  }

  .node-relation-item {
    padding-top: 8px;
    line-height: 1.45;
  }

  .node-relation-directness {
    margin-left: 4px;
    padding: 1px 6px;
  }

  .node-role-chip {
    padding: 3px 8px;
    border-radius: 8px;
    overflow-wrap: anywhere;
  }

  .node-path-step {
    gap: 6px;
    padding-left: 8px;
  }

  .node-path-node {
    gap: 5px;
    padding: 7px 8px;
    border-radius: 7px;
  }

  .node-path-node-main {
    display: block;
    line-height: 1.55;
  }

  .node-path-node-id {
    margin-right: 6px;
  }

  .node-path-node-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }

  .node-path-node-actions :deep(.el-button) {
    justify-content: center;
    margin-left: 0;
    min-width: 0;
  }

  .node-path-relation {
    padding-left: 8px;
    font-size: 12px;
    overflow-wrap: anywhere;
  }

  .node-role-list,
  .node-preview-groups,
  .node-detail-counts {
    gap: 5px;
  }
}
</style>
