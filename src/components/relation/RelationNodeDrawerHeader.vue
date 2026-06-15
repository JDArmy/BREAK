<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { TopRight } from "@element-plus/icons-vue";

interface DetailNode {
  id: string;
  type: string;
}

defineProps<{
  selectedNetworkNode: DetailNode;
  selectedNetworkNodeTitle: string;
  selectedNetworkRelationCounts: {
    incoming: number;
    outgoing: number;
  };
  relKey: string;
  getNodeTypeTitle: (type: string) => string;
}>();

const emit = defineEmits<{
  "view-detail": [];
  "open-detail-new-window": [];
  "open-as-root": [];
}>();

const { t } = useI18n();
</script>

<template>
  <div class="node-detail-title">
    <button type="button" class="node-detail-id" @click="emit('open-detail-new-window')">
      {{ selectedNetworkNode.id }}
    </button>
    <button type="button" class="node-detail-type" @click="emit('open-detail-new-window')">
      {{ getNodeTypeTitle(selectedNetworkNode.type) }}
    </button>
  </div>
  <button type="button" class="node-detail-name" @click="emit('open-detail-new-window')">
    {{ selectedNetworkNodeTitle }}
  </button>
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
</template>

<style scoped>
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
  padding: 0;
  border: 0;
  background: transparent;
  font-weight: 800;
  color: var(--break-text-primary);
  cursor: pointer;
}

.node-detail-id:hover {
  color: var(--el-color-primary);
}

.node-detail-type {
  padding: 2px 6px;
  border: 1px solid var(--break-border);
  border-radius: 999px;
  color: var(--break-text-secondary);
  font-size: 11px;
  background: transparent;
  cursor: pointer;
}

.node-detail-type:hover {
  color: var(--el-color-primary);
  border-color: color-mix(in srgb, var(--el-color-primary) 45%, var(--break-border));
}

.node-detail-name {
  display: block;
  width: 100%;
  margin-bottom: 8px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--break-text-secondary);
  font-size: 13px;
  text-align: left;
  overflow-wrap: anywhere;
  cursor: pointer;
}

.node-detail-name:hover {
  color: var(--el-color-primary);
}

.node-detail-counts {
  color: var(--break-text-muted);
  font-size: 12px;
}

.menu-action-with-icon {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
</style>
