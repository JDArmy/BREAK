<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type {
  RootPathSummary,
  RootRelationSummary,
} from "@/components/relation/relationNodeDrawerInsightTypes";
import "@/components/relation/relationNodeDrawerInsights.css";

defineProps<{
  rootNodeRelations: RootRelationSummary[];
  selectedNodeRootPath: RootPathSummary | null;
  relKey: string;
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
          <span class="node-relation-directness">{{
            relation.directness
          }}</span>
        </div>
        <div v-if="relation.sourceFields.length" class="node-relation-fields">
          {{ t("relationView.sourceFields") }}:
          {{ relation.sourceFields.join(", ") }}
        </div>
        <div class="node-relation-fields">{{ relation.explanation }}</div>
        <div class="node-relation-fields">{{ relation.impactHint }}</div>
      </div>
    </div>
  </div>
  <div v-else class="node-explain-block">
    <h3>{{ t("relationView.rootRelation") }}</h3>
    <div class="node-insight-panel node-root-relation-empty-panel">
      <div class="node-root-relation-status">
        {{
          isCurrentNodeRoot
            ? t("relationView.currentNodeIsRoot")
            : t("relationView.noDirectRootRelation")
        }}
      </div>
      <div v-if="selectedNodeRootPath" class="node-path-preview">
        <div class="node-path-summary">
          {{
            t("relationView.indirectPathSummary", {
              count: selectedNodeRootPath.hopCount,
            })
          }}
        </div>
        <div class="node-path-chain">
          <div class="node-path-node node-path-node-root">
            <div class="node-path-node-tag">
              {{ t("relationView.rootStart") }}
            </div>
            <div class="node-path-node-main">
              <span
                :title="selectedNodeRootPath.startNode.type"
                class="node-path-node-id"
              >
                {{ selectedNodeRootPath.startNode.id }}
              </span>
              <span>{{ selectedNodeRootPath.startNode.title }}</span>
            </div>
            <div class="node-path-node-actions">
              <el-button
                link
                size="small"
                :disabled="
                  isPathNodeCurrentSelection(selectedNodeRootPath.startNode.id)
                "
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
                <span class="node-relation-direction">{{
                  step.relation.direction
                }}</span>
                <span>{{ step.relation.text }}</span>
                <span class="node-relation-directness">{{
                  step.relation.directness
                }}</span>
              </div>
              <div
                v-if="step.relation.sourceFields.length"
                class="node-relation-fields"
              >
                {{ t("relationView.sourceFields") }}:
                {{ step.relation.sourceFields.join(", ") }}
              </div>
            </div>
            <div
              :class="[
                'node-path-node',
                step.isCurrentTarget ? 'node-path-node-current' : '',
              ]"
            >
              <div class="node-path-node-tag">
                {{
                  step.isCurrentTarget
                    ? t("relationView.currentNode")
                    : t("relationView.pathNode")
                }}
              </div>
              <div class="node-path-node-main">
                <span :title="step.targetNode.type" class="node-path-node-id">{{
                  step.targetNode.id
                }}</span>
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
</template>
