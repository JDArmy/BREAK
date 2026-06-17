<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { NodeBusinessSceneImpactSummary } from "@/components/relation/relationNodeDrawerInsightTypes";
import "@/components/relation/relationNodeDrawerInsights.css";

const props = defineProps<{
  summary: NodeBusinessSceneImpactSummary | null;
}>();

const { t } = useI18n();

const ITEM_LIMIT = 18;
const visibleItems = computed(
  () => props.summary?.items.slice(0, ITEM_LIMIT) ?? []
);
const hiddenItemCount = computed(
  () => Math.max(0, (props.summary?.items.length ?? 0) - visibleItems.value.length)
);
</script>

<template>
  <div v-if="summary" class="node-explain-block">
    <h3>{{ t("relationView.businessSceneImpactBlockTitle") }}</h3>
    <div class="node-insight-panel node-business-scene-panel">
      <div class="node-business-scene-summary">
        {{ summary.summary }}
      </div>
      <div v-if="summary.notice" class="node-analysis-notice">
        {{ summary.notice }}
      </div>
      <div v-if="visibleItems.length" class="node-business-scene-table">
        <div class="node-business-scene-table-head">
          <span>{{ t("relationView.businessSceneImpactScene") }}</span>
          <span>{{ t("relationView.businessSceneImpactDimensions") }}</span>
        </div>
        <div class="node-business-scene-table-body">
          <div
            v-for="item in visibleItems"
            :key="item.id"
            class="node-business-scene-row"
          >
            <div class="node-business-scene-name">
              <strong>{{ item.title }}</strong>
              <span>{{ item.id }}</span>
            </div>
            <div class="node-business-scene-dimensions">
              {{ item.dimensionTitles.join(" / ") || "-" }}
            </div>
          </div>
        </div>
      </div>
      <div v-if="hiddenItemCount > 0" class="node-relation-more">
        {{ t("relationView.hiddenBusinessSceneImpactCount", { count: hiddenItemCount }) }}
      </div>
    </div>
  </div>
</template>
