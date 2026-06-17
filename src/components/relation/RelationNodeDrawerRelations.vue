<script setup lang="ts">
import { computed } from "vue";
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
  evidenceLabel: string;
  explanation: string;
  impactHint: string;
  qualityFlags: string[];
}

const props = defineProps<{
  selectedNetworkRelations: RelationSummary[];
  isRelationOnSelectedPath: (relationKey: string) => boolean;
  copyFeedbackMessage: string;
  copyFeedbackType: "success" | "error";
}>();

const emit = defineEmits<{
  "copy-csv": [];
  "open-node-detail": [nodeId: string];
}>();

const { t } = useI18n();

const tableRows = computed(() =>
  props.selectedNetworkRelations.map((relation) => ({
    ...relation,
    relationSummary: `${relation.direction} ${relation.text}`,
    isActive: props.isRelationOnSelectedPath(relation.relationKey),
  }))
);

const relationRowClassName = ({ row }: { row: { isActive: boolean } }) =>
  row.isActive ? "node-relation-row-active" : "";
</script>

<template>
  <div class="node-explain-block">
    <div class="node-explain-header">
      <h3>{{ t("relationView.allRelations") }}</h3>
      <div class="node-explain-actions">
        <span
          v-if="copyFeedbackMessage"
          :class="['copy-feedback', `copy-feedback-${copyFeedbackType}`]"
        >
          {{ copyFeedbackMessage }}
        </span>
        <el-button size="small" plain @click="emit('copy-csv')">
          {{ t("relationView.copyCsv") }}
        </el-button>
      </div>
    </div>
  </div>

  <div class="node-relation-table-scroll">
    <el-table
      :data="tableRows"
      size="small"
      stripe
      table-layout="fixed"
      :row-class-name="relationRowClassName"
      class="node-relation-table"
    >
      <el-table-column prop="relationSummary" :label="t('relationView.allRelations')" min-width="26%" />
      <el-table-column :label="t('relationView.csvHeaderDirectness')" width="88">
        <template #default="{ row }">
          <div class="node-relation-badges">
            <span class="node-relation-badge">{{ row.directness }}</span>
            <span class="node-relation-badge">{{ row.evidenceLabel }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column :label="t('relationView.csvHeaderTargetTitle')" min-width="30%">
        <template #default="{ row }">
          <button
            type="button"
            class="node-relation-link"
            :title="row.otherNodeType"
            @click="emit('open-node-detail', row.otherNodeId)"
          >
            <span class="node-relation-link-id">{{ row.otherNodeId }}</span>
            <span>{{ row.otherNodeTitle }}</span>
          </button>
        </template>
      </el-table-column>
      <el-table-column :label="t('relationView.explanation')" min-width="34%">
        <template #default="{ row }">
          <div class="node-relation-explain">
            <div>{{ row.explanation }}</div>
            <div class="node-relation-impact">{{ row.impactHint }}</div>
            <div v-if="row.sourceFields.length" class="node-relation-fields">
              {{ t("relationView.sourceFields") }}: {{ row.sourceFields.join(", ") }}
            </div>
            <div v-if="row.qualityFlags.length" class="node-relation-fields">
              {{ row.qualityFlags.join(", ") }}
            </div>
          </div>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.node-explain-block {
  margin-top: 14px;
}

.node-explain-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.node-explain-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.node-explain-block h3 {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
}

.copy-feedback {
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  white-space: nowrap;
}

.copy-feedback-success {
  color: var(--el-color-success);
}

.copy-feedback-error {
  color: var(--el-color-danger);
}

.node-relation-table {
  width: 100%;
}

.node-relation-table-scroll {
  width: 100%;
}

.node-relation-table :deep(.el-table__cell) {
  vertical-align: top;
}

.node-relation-table :deep(.node-relation-row-active) {
  --el-table-tr-bg-color: color-mix(in srgb, var(--el-color-primary) 10%, transparent);
}

.node-relation-table :deep(.cell) {
  font-size: 12px;
  line-height: 1.4;
}

.node-relation-link {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--el-color-primary);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.node-relation-link:hover {
  text-decoration: underline;
}

.node-relation-link-id {
  font-weight: 600;
}

.node-relation-badges {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
}

.node-relation-badge {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 2px 6px;
  border: 1px solid var(--break-border);
  border-radius: 999px;
  color: var(--break-text-secondary);
  font-size: 11px;
  line-height: 1.2;
  white-space: normal;
}

.node-relation-explain {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: var(--break-text-primary);
}

.node-relation-impact,
.node-relation-fields {
  color: var(--break-text-muted);
  overflow-wrap: anywhere;
}

@media (max-width: 767px) {
  .node-explain-block {
    margin-top: 10px;
  }

  .node-explain-header {
    align-items: flex-start;
    gap: 6px;
    margin-bottom: 6px;
  }

  .node-explain-actions {
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 5px;
  }

  .copy-feedback {
    width: 100%;
    justify-content: flex-end;
    font-size: 11px;
  }

  .node-relation-table-scroll {
    width: 100%;
    overflow-x: hidden;
  }

  .node-relation-table {
    width: 100% !important;
  }

  .node-relation-table :deep(.el-table__cell) {
    padding: 5px 0;
  }

  .node-relation-table :deep(.cell) {
    padding: 0 5px;
    font-size: 11px;
    line-height: 1.35;
    overflow-wrap: anywhere;
  }

  .node-relation-link {
    gap: 3px;
  }
}
</style>
