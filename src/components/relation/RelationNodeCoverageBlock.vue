<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { NodeCoverageSummary } from "@/components/relation/relationNodeDrawerInsightTypes";
import "@/components/relation/relationNodeDrawerInsights.css";

const props = defineProps<{
  summary: NodeCoverageSummary | null;
}>();

const { t } = useI18n();

const COVERAGE_ITEM_LIMIT = 8;
const visibleItems = computed(
  () => props.summary?.items.slice(0, COVERAGE_ITEM_LIMIT) ?? []
);
const hiddenItemCount = computed(() =>
  Math.max(0, (props.summary?.items.length ?? 0) - visibleItems.value.length)
);
</script>

<template>
  <div v-if="summary" class="node-explain-block">
    <h3>{{ t("relationView.nodeCoverageBlockTitle") }}</h3>
    <div
      :class="[
        'node-insight-panel',
        'node-coverage-panel',
        `node-coverage-panel-${summary.severity}`,
      ]"
    >
      <div class="node-coverage-header">
        <strong>{{ summary.title }}</strong>
        <span>{{ summary.summary }}</span>
      </div>
      <div class="node-coverage-metrics">
        <span
          v-for="metric in summary.metrics"
          :key="metric.label"
          class="node-analysis-chip"
        >
          {{ metric.label }} {{ metric.value }}
        </span>
      </div>
      <div v-if="summary.notice" class="node-analysis-notice">
        {{ summary.notice }}
      </div>
      <div v-if="visibleItems.length" class="node-coverage-list">
        <div
          v-for="item in visibleItems"
          :key="`${item.type}:${item.id}`"
          class="node-coverage-item"
        >
          <div class="node-coverage-item-main">
            <strong>{{ item.title }}</strong>
            <span>{{ item.id }}</span>
          </div>
          <div class="node-relation-fields">{{ item.meta }}</div>
          <div v-if="item.sourceFields.length" class="node-relation-fields">
            {{ t("relationView.sourceFields") }}:
            {{ item.sourceFields.join(", ") }}
          </div>
        </div>
      </div>
      <div v-if="hiddenItemCount > 0" class="node-relation-more">
        {{
          t("relationView.hiddenCoverageItemCount", {
            count: hiddenItemCount,
          })
        }}
      </div>
    </div>
  </div>
</template>
