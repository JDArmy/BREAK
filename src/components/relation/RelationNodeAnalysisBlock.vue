<script setup lang="ts">
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import type { NodeAnalysisSummary } from "@/components/relation/relationNodeDrawerInsightTypes";
import { RelationType } from "@/views/relation/relationTypes";
import {
  pushDetailNodeRouteWithAnchor,
  type DetailNodeAnchor,
} from "@/views/relation/relationNodeRouting";
import "@/components/relation/relationNodeDrawerInsights.css";

const props = defineProps<{
  summary: NodeAnalysisSummary | null;
  selectedNodeType: string;
  selectedNodeId: string;
}>();

const { t } = useI18n();
const router = useRouter();

const detailAnchorByType: Partial<Record<RelationType, DetailNodeAnchor>> = {
  [RelationType.risk]: "risks",
  [RelationType.avoidance]: "avoidances",
  [RelationType.attackTool]: "attack-tools",
  [RelationType.threatActor]: "threat-actors",
  [RelationType.term]: "terms",
};

const openSelectedNodeDetail = (relatedType: string) => {
  if (
    props.selectedNodeType !== RelationType.risk &&
    props.selectedNodeType !== RelationType.avoidance &&
    props.selectedNodeType !== RelationType.attackTool &&
    props.selectedNodeType !== RelationType.threatActor &&
    props.selectedNodeType !== RelationType.term
  ) {
    return;
  }
  const detailAnchor = detailAnchorByType[relatedType as RelationType];
  void pushDetailNodeRouteWithAnchor(
    router,
    props.selectedNodeType as RelationType,
    props.selectedNodeId,
    detailAnchor ?? "risks"
  );
};
</script>

<template>
  <div v-if="summary" class="node-explain-block">
    <h3>{{ t("relationView.nodeAnalysisTitle") }}</h3>
    <div class="node-insight-panel node-analysis-panel">
      <div class="node-analysis-summary">
        {{ summary.summary }}
      </div>
      <div v-if="summary.highlights.length" class="node-analysis-chip-list">
        <button
          v-for="highlight in summary.highlights"
          :key="`${highlight.type}:${highlight.ids.join(',')}`"
          type="button"
          class="node-analysis-chip node-analysis-chip-button"
          @click="openSelectedNodeDetail(highlight.type)"
        >
          {{ highlight.label }}
        </button>
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
