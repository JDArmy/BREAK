<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { Close, InfoFilled } from "@element-plus/icons-vue";

interface RelationTypeItem {
  key: string;
  title: string;
  color: string;
}

interface RelationLegendItem {
  color: string;
  label: string;
  fields: string[];
}

const props = defineProps<{
  nodeFilterVisible: boolean;
  lineFilterVisible: boolean;
  relationTypeItems: RelationTypeItem[];
  filterRelationType: string[];
  filterSubNode: boolean;
  subNodeFilterColor?: string;
  filterLineType: string[];
  visibleRelationLegendItems: RelationLegendItem[];
  formatRelationFieldsTooltip: (fields: string[]) => string;
}>();

const emit = defineEmits<{
  "update:nodeFilterVisible": [value: boolean];
  "update:lineFilterVisible": [value: boolean];
  "update:filterRelationType": [value: string[]];
  "update:filterSubNode": [value: boolean];
  "update:filterLineType": [value: string[]];
  filter: [];
}>();

const { t } = useI18n();

const filterRelationTypeModel = computed({
  get: () => props.filterRelationType,
  set: (value: string[]) => emit("update:filterRelationType", value),
});

const filterSubNodeModel = computed({
  get: () => props.filterSubNode,
  set: (value: boolean) => emit("update:filterSubNode", value),
});

const filterLineTypeModel = computed({
  get: () => props.filterLineType,
  set: (value: string[]) => emit("update:filterLineType", value),
});
</script>

<template>
  <div v-if="nodeFilterVisible" class="filter-pane" id="node-filter-pane">
    <div class="filter-pane-header">
      <h2>{{ t("nodeFilter") }}</h2>
      <el-button circle text size="small" @click="emit('update:nodeFilterVisible', false)">
        <el-icon><Close /></el-icon>
      </el-button>
    </div>
    <el-checkbox-group v-model="filterRelationTypeModel" @change="emit('filter')">
      <el-checkbox
        v-for="item in relationTypeItems"
        :key="item.key"
        :name="item.key"
        class="filter-checkbox"
        :value="item.key"
      >
        <span class="filter-item-with-color">
          <span class="legend-node-color" :style="{ backgroundColor: item.color }"></span>
          <span>{{ item.title }}</span>
        </span>
      </el-checkbox>
    </el-checkbox-group>
    <el-checkbox v-model="filterSubNodeModel" class="filter-checkbox" @change="emit('filter')">
      <span class="filter-item-with-color">
        <span class="legend-node-color" :style="{ backgroundColor: subNodeFilterColor }"></span>
        <span>{{ t("subNodeFilter") }}</span>
      </span>
    </el-checkbox>
  </div>

  <div v-if="lineFilterVisible" class="filter-pane" id="line-filter-pane">
    <div class="filter-pane-header">
      <h2>{{ t("lineFilter") }}</h2>
      <el-button circle text size="small" @click="emit('update:lineFilterVisible', false)">
        <el-icon><Close /></el-icon>
      </el-button>
    </div>
    <el-checkbox-group v-model="filterLineTypeModel" @change="emit('filter')">
      <el-checkbox
        v-for="item in visibleRelationLegendItems"
        :key="item.label"
        :name="item.label"
        class="filter-checkbox"
        :value="item.label"
      >
        <span class="filter-line-item">
          <span class="legend-line-color" :style="{ backgroundColor: item.color }"></span>
          <span class="filter-line-label">{{ item.label }}</span>
          <el-tooltip :content="formatRelationFieldsTooltip(item.fields)" raw-content placement="top">
            <el-icon class="filter-line-help"><InfoFilled /></el-icon>
          </el-tooltip>
        </span>
      </el-checkbox>
    </el-checkbox-group>
  </div>
</template>

<style scoped>
.filter-pane {
  position: absolute;
  z-index: 700;
  top: 20px;
  padding: 10px 30px;
  border: var(--break-graph-border) solid 1px;
  color: var(--break-graph-text);
  border-radius: 10px;
  background-color: var(--break-graph-filter-bg);
}

.filter-pane-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.filter-pane-header :deep(.el-button) {
  width: 24px;
  height: 24px;
  color: var(--break-text-muted);
}

.filter-pane h2 {
  margin: 0;
  font-size: medium;
}

.filter-checkbox {
  display: block;
  font-size: xx-small;
}

.legend-node-color {
  width: 12px;
  height: 12px;
  flex: 0 0 auto;
  border: 1px solid var(--break-graph-border);
  border-radius: 50%;
}

.legend-line-color {
  width: 18px;
  height: 3px;
  flex: 0 0 auto;
  border-radius: 999px;
}

.filter-item-with-color,
.filter-line-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.filter-line-item {
  flex-wrap: wrap;
}

.filter-line-label {
  font-weight: 600;
}

.filter-line-help {
  color: var(--break-text-muted);
  font-size: 12px;
}

#node-filter-pane {
  left: 20px;
}

#line-filter-pane {
  right: 80px;
  padding-inline: 18px;
}

@media (max-width: 767px) {
  .filter-pane {
    position: static;
    flex: 0 0 auto;
    margin: 0 8px 6px;
    padding: 8px 10px;
    max-height: 86px;
    overflow-y: auto;
    border-radius: 8px;
  }

  #node-filter-pane {
    order: 1;
  }

  #line-filter-pane {
    order: 2;
    right: auto;
    padding-inline: 10px;
  }

  .filter-pane h2 {
    font-size: 14px;
  }

  .filter-pane :deep(.el-checkbox-group) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 4px 10px;
  }
}
</style>
