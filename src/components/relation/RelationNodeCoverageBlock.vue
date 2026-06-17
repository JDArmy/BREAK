<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import type { NodeCoverageSummary } from "@/components/relation/relationNodeDrawerInsightTypes";
import { RelationType } from "@/views/relation/relationTypes";
import { pushDetailNodeRoute } from "@/views/relation/relationNodeRouting";
import "@/components/relation/relationNodeDrawerInsights.css";

const props = defineProps<{
  summary: NodeCoverageSummary | null;
}>();

const { t } = useI18n();
const router = useRouter();

const COVERAGE_ITEM_LIMIT = 5;
const showAllCoverageItems = ref(false);
const visibleItems = computed(() => {
  const items = props.summary?.items ?? [];
  return showAllCoverageItems.value
    ? items
    : items.slice(0, COVERAGE_ITEM_LIMIT);
});
const hiddenItemCount = computed(() =>
  Math.max(0, (props.summary?.items.length ?? 0) - visibleItems.value.length)
);

const toggleShowAllCoverageItems = () => {
  showAllCoverageItems.value = !showAllCoverageItems.value;
};

const openCoverageEntityDetail = (item: { type: string; id: string }) => {
  if (
    item.type !== RelationType.risk &&
    item.type !== RelationType.avoidance &&
    item.type !== RelationType.attackTool &&
    item.type !== RelationType.threatActor &&
    item.type !== RelationType.term
  ) {
    return;
  }
  void pushDetailNodeRoute(router, item.type as RelationType, item.id);
};
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
          role="button"
          tabindex="0"
          @click="openCoverageEntityDetail(item)"
          @keydown.enter.prevent="openCoverageEntityDetail(item)"
          @keydown.space.prevent="openCoverageEntityDetail(item)"
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
      <button
        v-if="hiddenItemCount > 0 || showAllCoverageItems"
        type="button"
        class="node-relation-more node-attack-path-more-button"
        @click="toggleShowAllCoverageItems"
      >
        {{
          showAllCoverageItems
            ? t("relationView.collapseCoverageItemCount")
            : t("relationView.hiddenCoverageItemCount", {
                count: hiddenItemCount,
              })
        }}
      </button>
    </div>
  </div>
</template>
