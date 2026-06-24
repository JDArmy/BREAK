<script setup lang="ts">
import { useI18n } from "vue-i18n";
import RelationNodeSpecialInsightBlock from "@/components/relation/RelationNodeSpecialInsightBlock.vue";
import { RelationType, type AttackPathFilters, type RiskAvoidanceCoverageItem } from "@/views/relation/relationTypes";
import type { NodeSpecialInsightSummary } from "@/components/relation/relationNodeDrawerInsightTypes";

defineProps<{
  attackPathFilters: AttackPathFilters;
  displayedCoverageItems: RiskAvoidanceCoverageItem[];
  hasExpandedCoverageItems: boolean;
  hiddenCoverageItemCount: number;
  isMobile: boolean;
  riskAvoidanceCoverage: {
    totalCount: number;
    directCount: number;
    attackToolCount: number;
    overlapCount: number;
  } | null;
  selectedNodeSpecialInsightSummary: NodeSpecialInsightSummary | null;
}>();

const emit = defineEmits<{
  "apply-avoidance-filter": [avoidanceKey: string];
  "apply-special-insight-filter": [payload: { type: string; id: string }];
  "toggle-coverage-items": [];
}>();

const { t } = useI18n();
</script>

<template>
  <div
    v-if="riskAvoidanceCoverage"
    class="node-explain-block relation-analysis-coverage"
  >
    <h3>{{ t("relationView.coverageMode") }}</h3>
    <div class="node-insight-panel">
      <div class="relation-analysis-summary">
        {{
          t("relationView.coverageModeSummary", {
            total: riskAvoidanceCoverage.totalCount,
            direct: riskAvoidanceCoverage.directCount,
            tool: riskAvoidanceCoverage.attackToolCount,
            overlap: riskAvoidanceCoverage.overlapCount,
          })
        }}
      </div>
      <div class="relation-analysis-coverage-list">
        <button
          v-for="item in displayedCoverageItems"
          :key="item.avoidanceKey"
          type="button"
          :class="[
            'relation-analysis-coverage-item',
            `relation-analysis-coverage-item-${item.source}`,
            attackPathFilters[RelationType.avoidance] === item.avoidanceKey
              ? 'relation-analysis-coverage-item-active'
              : '',
          ]"
          @click="emit('apply-avoidance-filter', item.avoidanceKey)"
        >
          <span class="relation-analysis-item-title">
            <strong>{{ item.avoidanceTitle }}</strong>
            <span>{{ item.avoidanceKey }}</span>
          </span>
          <span class="relation-analysis-item-meta">
            {{ item.sourceLabel }} /
            {{
              t("relationView.coveragePathCount", {
                count: item.pathCount,
              })
            }}
          </span>
          <span
            v-if="item.attackToolLabels.length"
            class="relation-analysis-item-meta"
          >
            {{ t("relationView.coverageToolSources") }}:
            {{ item.attackToolLabels.join(", ") }}
          </span>
        </button>
      </div>
      <button
        v-if="
          isMobile && (hiddenCoverageItemCount > 0 || hasExpandedCoverageItems)
        "
        type="button"
        class="node-relation-more node-attack-path-more-button"
        @click="emit('toggle-coverage-items')"
      >
        {{
          hiddenCoverageItemCount <= 0
            ? t("relationView.collapseAnalysisCoverageCount")
            : t("relationView.hiddenAnalysisCoverageCount", {
                count: hiddenCoverageItemCount,
              })
        }}
      </button>
    </div>
  </div>
  <RelationNodeSpecialInsightBlock
    v-else
    :summary="selectedNodeSpecialInsightSummary"
    :interactive="true"
    @apply-filter="emit('apply-special-insight-filter', $event)"
  />
</template>
