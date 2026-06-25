<script setup lang="ts">
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { TopRight } from "@element-plus/icons-vue";
import type { NodeAnalysisSummary } from "@/components/relation/relationNodeDrawerInsightTypes";
import { RelationType } from "@/views/relation/relationTypes";
import {
  openDetailNodeRouteInNewWindow,
  type DetailNodeAnchor,
} from "@/views/relation/relationNodeRouting";
import "@/components/relation/relationNodeDrawerInsights.css";

defineProps<{
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

const isSupportedType = (type: string): type is RelationType =>
  type === RelationType.risk ||
  type === RelationType.avoidance ||
  type === RelationType.attackTool ||
  type === RelationType.threatActor ||
  type === RelationType.term;

// 点击关联类型 chip：新窗口打开该类型下首个关联实体的详情页
const openRelatedDetailInNewWindow = (relatedType: string, ids: string[]) => {
  if (!isSupportedType(relatedType) || ids.length === 0) {
    return;
  }
  const detailAnchor = detailAnchorByType[relatedType];
  openDetailNodeRouteInNewWindow(router, relatedType, ids[0]!, detailAnchor);
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
          :title="t('viewDetail')"
          @click="openRelatedDetailInNewWindow(highlight.type, highlight.ids)"
        >
          <span>{{ highlight.label }}</span>
          <el-icon class="node-analysis-chip-link-icon"><TopRight /></el-icon>
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
