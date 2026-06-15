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
  "open-as-root": [];
}>();

const { t } = useI18n();
</script>

<template>
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

.menu-action-with-icon {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
</style>
