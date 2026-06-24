<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { AttackPathDetail } from "@/views/relation/relationTypes";

defineProps<{
  attackPathDetails: AttackPathDetail[];
  displayedAttackPathDetails: AttackPathDetail[];
  filteredAttackPathCount: number;
  hasExpandedAttackPaths: boolean;
  hiddenAttackPathCount: number;
  isMobile: boolean;
  selectedAttackPathDetail: AttackPathDetail | null;
}>();

const emit = defineEmits<{
  "select-attack-path": [pathId: string];
  "toggle-attack-paths": [];
}>();

const { t } = useI18n();
</script>

<template>
  <div
    v-if="selectedAttackPathDetail"
    class="node-explain-block relation-analysis-path-detail"
  >
    <h3>{{ t("relationView.pathDetail") }}</h3>
    <div class="node-insight-panel">
      <div class="relation-analysis-summary">
        {{
          t("relationView.filteredSimplePathCount", {
            count: filteredAttackPathCount,
          })
        }}
      </div>
      <div class="relation-analysis-path-chain">
        <span
          v-for="(node, index) in selectedAttackPathDetail.nodes"
          :key="`${node.type}:${node.key}`"
          class="relation-analysis-path-node"
        >
          <span>{{ node.label }}</span>
          <span
            v-if="index < selectedAttackPathDetail.nodes.length - 1"
            class="relation-analysis-path-arrow"
            >-></span
          >
        </span>
      </div>
      <div class="relation-analysis-segments">
        <div
          v-for="segment in selectedAttackPathDetail.segments"
          :key="`${segment.source.type}:${segment.source.key}->${segment.target.type}:${segment.target.key}`"
          class="relation-analysis-segment"
        >
          <div class="relation-analysis-segment-main">
            <strong>{{ segment.source.label }}</strong>
            <span>{{ segment.relation }}</span>
            <strong>{{ segment.target.label }}</strong>
          </div>
          <div class="relation-analysis-item-meta">
            {{ segment.reason }}
          </div>
          <div class="relation-analysis-item-meta">
            {{ t("relationView.sourceFields") }}:
            {{ segment.sourceFields.join(", ") }}
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="node-explain-block relation-analysis-all-paths">
    <h3>{{ t("relationView.allPaths") }}</h3>
    <div class="node-insight-panel">
      <div class="relation-analysis-summary">
        {{
          t("relationView.filteredSimplePathCount", {
            count: attackPathDetails.length,
          })
        }}
      </div>
      <div class="relation-analysis-path-list">
        <button
          v-for="path in displayedAttackPathDetails"
          :key="path.id"
          type="button"
          :class="[
            'relation-analysis-path-list-item',
            selectedAttackPathDetail?.id === path.id
              ? 'relation-analysis-path-list-item-active'
              : '',
          ]"
          @click="emit('select-attack-path', path.id)"
        >
          <span class="relation-analysis-path-list-title">
            {{ path.label }}
          </span>
          <span class="relation-analysis-item-meta">
            {{ path.segments.length }}
            {{ t("relationView.pathSegments") }}
          </span>
        </button>
      </div>
      <button
        v-if="isMobile && (hiddenAttackPathCount > 0 || hasExpandedAttackPaths)"
        type="button"
        class="node-relation-more node-attack-path-more-button"
        @click="emit('toggle-attack-paths')"
      >
        {{
          hiddenAttackPathCount <= 0
            ? t("relationView.collapseAnalysisPathCount")
            : t("relationView.hiddenAnalysisPathCount", {
                count: hiddenAttackPathCount,
              })
        }}
      </button>
    </div>
  </div>
</template>
