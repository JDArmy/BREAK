<script setup lang="ts">
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useIncrementalVisibleList } from "@/composables/useIncrementalVisibleList";
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
const SHOW_MORE_STEP = 50;
const {
  hiddenCount: hiddenItemCount,
  hasExpanded: hasExpandedCoverageItems,
  showMoreOrReset: showMoreCoverageItems,
  visibleItems,
} = useIncrementalVisibleList(() => props.summary?.items ?? [], {
  initialLimit: COVERAGE_ITEM_LIMIT,
  step: SHOW_MORE_STEP,
});

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
  <div class="node-explain-block">
    <h3>{{ t("relationView.nodeCoverageBlockTitle") }}</h3>
    <div
      v-if="summary"
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
        v-if="hiddenItemCount > 0 || hasExpandedCoverageItems"
        type="button"
        class="node-relation-more node-attack-path-more-button"
        @click="showMoreCoverageItems"
      >
        {{
          hiddenItemCount <= 0
            ? t("relationView.collapseCoverageItemCount")
            : t("relationView.hiddenCoverageItemCount", {
                count: hiddenItemCount,
              })
        }}
      </button>
    </div>
    <div v-else class="node-insight-panel node-coverage-panel node-coverage-panel-warning">
      <div class="node-coverage-header">
        <strong>{{ t("relationView.nodeCoverageEmptyTitle") }}</strong>
        <span>{{ t("relationView.nodeCoverageEmptySummary") }}</span>
      </div>
      <div class="node-analysis-notice">
        {{ t("relationView.nodeCoverageEmptyNotice") }}
      </div>
    </div>
  </div>
</template>
