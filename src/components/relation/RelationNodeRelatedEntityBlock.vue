<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { NodeRelatedEntitySummary } from "@/components/relation/relationNodeDrawerInsightTypes";
import "@/components/relation/relationNodeDrawerInsights.css";

const props = defineProps<{
  summary: NodeRelatedEntitySummary | null;
}>();

const emit = defineEmits<{
  "focus-node": [nodeId: string];
  "open-node-as-root": [nodeId: string];
  "open-node-detail": [nodeId: string];
}>();

const { t } = useI18n();

const ITEM_LIMIT = 6;
const SHOW_MORE_STEP = 50;
const visibleItemLimit = ref(ITEM_LIMIT);
const visibleItems = computed(() => {
  const items = props.summary?.items ?? [];
  return items.slice(0, visibleItemLimit.value);
});
const hiddenItemCount = computed(() =>
  Math.max(0, (props.summary?.items.length ?? 0) - visibleItems.value.length)
);
const hasExpandedItems = computed(() => visibleItemLimit.value > ITEM_LIMIT);

const showMoreItems = () => {
  if (hiddenItemCount.value <= 0) {
    visibleItemLimit.value = ITEM_LIMIT;
    return;
  }

  visibleItemLimit.value += SHOW_MORE_STEP;
};

watch(
  () =>
    props.summary?.items
      .map((item) => `${item.type}:${item.id}:${item.relationKey}`)
      .join("|"),
  () => {
    visibleItemLimit.value = ITEM_LIMIT;
  }
);
</script>

<template>
  <div v-if="summary" class="node-explain-block">
    <h3>{{ t("relationView.relatedEntityBlockTitle") }}</h3>
    <div class="node-insight-panel node-related-entity-panel">
      <div class="node-related-entity-summary">
        <strong>{{ summary.title }}</strong>
        <span>{{ summary.summary }}</span>
      </div>
      <div class="node-related-entity-list">
        <div
          v-for="item in visibleItems"
          :key="`${item.type}:${item.id}:${item.relationKey}`"
          class="node-related-entity-item"
        >
          <button
            type="button"
            class="node-related-entity-main"
            @click="emit('focus-node', item.id)"
          >
            <span class="node-related-entity-title">{{ item.title }}</span>
            <span class="node-related-entity-id">{{ item.id }}</span>
          </button>
          <div class="node-related-entity-meta">
            <span>{{ item.direction }}</span>
            <span>{{ item.relationText }}</span>
          </div>
          <div v-if="item.sourceFields.length" class="node-relation-fields">
            {{ t("relationView.sourceFields") }}:
            {{ item.sourceFields.join(", ") }}
          </div>
          <div class="node-related-entity-actions">
            <button type="button" @click="emit('focus-node', item.id)">
              {{ t("relationView.focusNode") }}
            </button>
            <button type="button" @click="emit('open-node-as-root', item.id)">
              {{ t("openAsRoot") }}
            </button>
            <button type="button" @click="emit('open-node-detail', item.id)">
              {{ t("viewDetail") }}
            </button>
          </div>
        </div>
      </div>
      <button
        v-if="hiddenItemCount > 0 || hasExpandedItems"
        type="button"
        class="node-relation-more node-attack-path-more-button"
        @click="showMoreItems"
      >
        {{
          hiddenItemCount <= 0
            ? t("relationView.collapseRelatedEntityCount")
            : t("relationView.hiddenRelatedEntityCount", {
                count: hiddenItemCount,
              })
        }}
      </button>
    </div>
  </div>
</template>
