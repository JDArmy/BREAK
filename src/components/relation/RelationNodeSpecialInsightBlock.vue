<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { NodeSpecialInsightSummary } from "@/components/relation/relationNodeDrawerInsightTypes";
import "@/components/relation/relationNodeDrawerInsights.css";

const INITIAL_LIMIT = 8;
const SHOW_MORE_STEP = 50;

const props = defineProps<{
  summary: NodeSpecialInsightSummary | null;
  interactive?: boolean;
}>();

const emit = defineEmits<{
  "apply-filter": [payload: { type: string; id: string }];
}>();

const { t } = useI18n();
const insightPanelRef = ref<HTMLElement | null>(null);

// 每个 section 独立管理可见数量
const sectionLimits = reactive<Record<number, number>>({});

const getLimit = (index: number) => sectionLimits[index] ?? INITIAL_LIMIT;

const getVisibleItems = (index: number) => {
  const items = props.summary?.sections[index]?.items ?? [];
  return items.slice(0, getLimit(index));
};

const getHiddenCount = (index: number) => {
  const total = props.summary?.sections[index]?.items.length ?? 0;
  return Math.max(0, total - getLimit(index));
};

const hasExpanded = (index: number) => getLimit(index) > INITIAL_LIMIT;

const showMoreOrReset = (index: number) => {
  if (getHiddenCount(index) <= 0) {
    sectionLimits[index] = INITIAL_LIMIT;
  } else {
    sectionLimits[index] = getLimit(index) + SHOW_MORE_STEP;
  }
};

// summary 变化时重置所有 section 的展开状态
watch(
  () => props.summary,
  () => {
    Object.keys(sectionLimits).forEach((k) => delete sectionLimits[Number(k)]);
  },
);

const scrollToSection = (index: number) => {
  const section = insightPanelRef.value?.querySelector<HTMLElement>(
    `[data-special-insight-section="${index}"]`
  );
  section?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
};
</script>

<template>
  <div v-if="summary" class="node-explain-block">
    <h3>{{ summary.title }}</h3>
    <div ref="insightPanelRef" class="node-insight-panel node-special-insight-panel">
      <div class="node-special-insight-summary">
        {{ summary.summary }}
      </div>
      <div v-if="summary.sections.length > 1" class="node-special-insight-anchor-list">
        <button
          v-for="(section, index) in summary.sections"
          :key="section.title"
          type="button"
          class="node-special-insight-anchor"
          @click="scrollToSection(index)"
        >
          {{ section.title }}
        </button>
      </div>
      <div
        v-for="(section, index) in summary.sections"
        :key="section.title"
        class="node-special-insight-section"
        :data-special-insight-section="index"
      >
        <div class="node-special-insight-section-head">
          <strong>{{ section.title }}</strong>
          <span>{{ section.summary }}</span>
        </div>
        <div class="node-analysis-chip-list">
          <span
            v-for="metric in section.metrics"
            :key="metric.label"
            class="node-analysis-chip"
          >
            {{ metric.label }} {{ metric.value }}
          </span>
        </div>
        <div v-if="section.items.length" class="node-coverage-list">
          <component
            v-for="item in getVisibleItems(index)"
            :is="interactive ? 'button' : 'div'"
            :key="`${item.type}:${item.id}`"
            :type="interactive ? 'button' : undefined"
            :class="[
              'node-coverage-item',
              interactive ? 'node-special-insight-item' : '',
            ]"
            @click="interactive && emit('apply-filter', { type: item.type, id: item.id })"
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
          </component>
          <button
            v-if="getHiddenCount(index) > 0 || hasExpanded(index)"
            type="button"
            class="node-relation-more node-attack-path-more-button"
            @click="showMoreOrReset(index)"
          >
            {{
              getHiddenCount(index) <= 0
                ? t("relationView.collapseInsightItemCount", { count: INITIAL_LIMIT })
                : t("relationView.hiddenInsightItemCount", { count: getHiddenCount(index) })
            }}
          </button>
        </div>
        <div v-if="section.notice" class="node-analysis-notice">
          {{ section.notice }}
        </div>
      </div>
      <div v-if="summary.recommendation" class="node-analysis-notice">
        {{ summary.recommendation }}
      </div>
    </div>
  </div>
</template>
