<script setup lang="ts">
import { useI18n } from "vue-i18n";

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

defineProps<{
  selectedNetworkRelations: RelationSummary[];
  isRelationOnSelectedPath: (relationKey: string) => boolean;
}>();

const { t } = useI18n();
</script>

<template>
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

.node-relation-direction {
  margin-right: 6px;
  font-weight: 700;
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

.node-relation-fields,
.node-relation-target {
  color: var(--break-text-muted);
  overflow-wrap: anywhere;
}

.node-relation-target {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
</style>
