<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import type { NodeSpecialInsightSummary } from "@/components/relation/relationNodeDrawerInsightTypes";
import "@/components/relation/relationNodeDrawerInsights.css";

defineProps<{
  summary: NodeSpecialInsightSummary | null;
  interactive?: boolean;
}>();

const emit = defineEmits<{
  "apply-filter": [payload: { type: string; id: string }];
}>();

const { t } = useI18n();
const insightPanelRef = ref<HTMLElement | null>(null);

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
            v-for="item in section.items"
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
