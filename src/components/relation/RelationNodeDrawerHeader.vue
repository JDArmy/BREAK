<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { TopRight } from "@element-plus/icons-vue";
import "@/components/relation/relationNodeDrawerInsights.css";

interface DetailNode {
  id: string;
  type: string;
}

withDefaults(defineProps<{
  selectedNetworkNode: DetailNode;
  selectedNetworkNodeTitle: string;
  selectedNetworkRelationCounts: {
    incoming: number;
    outgoing: number;
  };
  relKey: string;
  getNodeTypeTitle: (type: string) => string;
  showOpenAsRootAction?: boolean;
}>(), {
  showOpenAsRootAction: true,
});

const emit = defineEmits<{
  "view-detail": [];
  "open-detail-new-window": [];
  "open-as-root": [];
  "filter-relations-by-direction": [direction: "incoming" | "outgoing"];
}>();

const { t } = useI18n();
</script>

<template>
  <div class="node-insight-panel node-detail-panel">
    <button type="button" class="node-detail-title" @click="emit('open-detail-new-window')">
      <span class="node-detail-id">{{ selectedNetworkNode.id }}</span>
      <span class="node-detail-name">{{ selectedNetworkNodeTitle }}</span>
    </button>
    <div class="node-detail-meta">
      <span class="node-detail-type">
        {{ getNodeTypeTitle(selectedNetworkNode.type) }}
      </span>
      <button
        type="button"
        class="node-detail-meta-action"
        @click="emit('filter-relations-by-direction', 'incoming')"
      >
        {{ t("relationView.incoming") }}: {{ selectedNetworkRelationCounts.incoming }}
      </button>
      <button
        type="button"
        class="node-detail-meta-action"
        @click="emit('filter-relations-by-direction', 'outgoing')"
      >
        {{ t("relationView.outgoing") }}: {{ selectedNetworkRelationCounts.outgoing }}
      </button>
    </div>
    <div class="node-detail-actions">
      <el-button size="small" @click="emit('view-detail')">
        <span class="menu-action-with-icon">
          <el-icon><TopRight /></el-icon>
          <span>{{ t("viewDetail") }}</span>
        </span>
      </el-button>
      <el-button
        v-if="showOpenAsRootAction"
        size="small"
        :disabled="selectedNetworkNode.id === relKey"
        @click="emit('open-as-root')"
      >
        {{ t("openAsRoot") }}
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.node-detail-title {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
  width: 100%;
  margin-bottom: 8px;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.node-detail-panel {
  gap: 8px;
}

.node-detail-title:hover .node-detail-id,
.node-detail-title:hover .node-detail-name {
  color: var(--el-color-primary);
}

.node-detail-id {
  font-weight: 800;
  color: var(--break-text-primary);
}

.node-detail-name {
  color: var(--break-text-secondary);
  font-size: 13px;
  overflow-wrap: anywhere;
}

.node-detail-meta,
.node-detail-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
}

.node-detail-meta {
  color: var(--break-text-muted);
  font-size: 12px;
}

.node-detail-type {
  color: var(--break-text-secondary);
  font-weight: 700;
}

.node-detail-meta-action {
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.node-detail-meta-action:hover {
  color: var(--el-color-primary);
}

.menu-action-with-icon {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

@media (max-width: 767px) {
  .node-detail-title {
    gap: 4px 8px;
    margin-bottom: 6px;
  }

  .node-detail-id {
    font-size: 14px;
  }

  .node-detail-name {
    width: 100%;
    font-size: 12px;
    line-height: 1.45;
  }

  .node-detail-meta,
  .node-detail-actions {
    gap: 5px;
  }

  .node-detail-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    width: 100%;
  }

  .node-detail-actions :deep(.el-button) {
    width: 100%;
    margin-left: 0;
  }
}
</style>
