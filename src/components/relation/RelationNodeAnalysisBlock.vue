<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { NodeAnalysisSummary } from "@/components/relation/relationNodeDrawerInsightTypes";
import "@/components/relation/relationNodeDrawerInsights.css";

defineProps<{
  summary: NodeAnalysisSummary | null;
}>();

const { t } = useI18n();
</script>

<template>
  <div v-if="summary" class="node-explain-block">
    <h3>{{ t("relationView.nodeAnalysisTitle") }}</h3>
    <div class="node-insight-panel node-analysis-panel">
      <div class="node-analysis-summary">
        {{ summary.summary }}
      </div>
      <div v-if="summary.highlights.length" class="node-analysis-chip-list">
        <span
          v-for="highlight in summary.highlights"
          :key="highlight"
          class="node-analysis-chip"
        >
          {{ highlight }}
        </span>
      </div>
      <div v-if="summary.notices.length" class="node-analysis-notices">
        <div
          v-for="notice in summary.notices"
          :key="notice"
          class="node-analysis-notice"
        >
          {{ notice }}
        </div>
      </div>
    </div>
  </div>
</template>
