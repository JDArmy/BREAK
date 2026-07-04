<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { RelationType } from "@/views/relation/relationTypes";
import { inject } from "vue";
import { RELATION_VIEW_MODEL_KEY } from "@/views/relation/relationViewModelKey";

// inject viewModel（RelationView provide），取代 props 钻取
const vm = inject(RELATION_VIEW_MODEL_KEY)!;
// 解构 ref/computed：ref 解构保留响应性，模板内自动 unwrap
const { relType, relKey, getCurrentEntityOptions } = vm;
// RelationTypeMapping 是普通对象（非 ref），直接取
const RelationTypeMapping = vm.RelationTypeMapping;

const { t } = useI18n();

// el-select v-model 直接绑定 ref（relType/relKey 是 vm 的 ref，写回 .value 即同步到 viewModel）
const selectedType = relType;
const selectedKey = relKey;

const selectableRelationTypes = computed(() =>
  Object.entries(RelationTypeMapping).filter(
    ([key]) => key !== RelationType.term
  )
);

const entitySelectOptionsReady = ref(false);

const buildEntitySelectOptions = () => {
  const currentMapping = RelationTypeMapping[relType.value];
  if (!currentMapping) return [];

  return Object.keys(getCurrentEntityOptions.value).map((key) => ({
    label: `${key}:${t(`BREAK.${currentMapping.BreakKey}.${key}.title`)}`,
    value: key,
  }));
};

const currentEntityOption = computed(() => {
  const currentMapping = RelationTypeMapping[relType.value];
  if (!currentMapping || !relKey.value) return [];
  return [
    {
      label: `${relKey.value}:${t(`BREAK.${currentMapping.BreakKey}.${relKey.value}.title`)}`,
      value: relKey.value,
    },
  ];
});

const entitySelectOptions = computed(() => {
  if (!entitySelectOptionsReady.value) {
    return currentEntityOption.value;
  }
  return buildEntitySelectOptions();
});

let readyTimer: ReturnType<typeof setTimeout> | null = null;
let readyIdleHandle: number | null = null;

onMounted(() => {
  const markReady = () => {
    readyIdleHandle = null;
    entitySelectOptionsReady.value = true;
  };
  if ("requestIdleCallback" in window) {
    readyIdleHandle = window.requestIdleCallback(markReady, { timeout: 800 });
  } else {
    readyTimer = window.setTimeout(markReady, 200);
  }
});

onUnmounted(() => {
  if (readyTimer !== null) {
    clearTimeout(readyTimer);
    readyTimer = null;
  }
  if (readyIdleHandle !== null && "cancelIdleCallback" in window) {
    window.cancelIdleCallback(readyIdleHandle);
    readyIdleHandle = null;
  }
});

watch(
  relType,
  () => {
    entitySelectOptionsReady.value = true;
  }
);
</script>

<template>
  <div class="relation-selector">
    <el-select
      id="relation-selector-type"
      v-model="selectedType"
      class="relation-select"
      name="relation-selector-type"
      :aria-label="t('relationView.relationType')"
    >
      <el-option
        v-for="[key, item] in selectableRelationTypes"
        :key="key"
        :label="item.title"
        :value="key"
      />
    </el-select>
    <el-select-v2
      id="relation-selector-key"
      v-model="selectedKey"
      class="relation-key-select"
      filterable
      name="relation-selector-key"
      :aria-label="t('relationView.currentEntity')"
      :height="320"
      :item-height="34"
      :options="entitySelectOptions"
    />
  </div>
</template>

<style scoped>
.relation-selector {
  position: absolute;
  z-index: 20;
  top: 0;
  right: 12px;
  left: 460px;
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  min-width: 0;
  padding-bottom: 4px;
}

.relation-select {
  flex: 0 0 150px;
  width: 160px;
}

.relation-key-select {
  flex: 1 1 240px;
  min-width: 180px;
  max-width: 420px;
  width: auto;
}

@media (max-width: 1180px) {
  .relation-selector {
    left: 320px;
  }
}

@media (max-width: 980px) {
  .relation-selector {
    left: 0;
    position: static;
    width: 100%;
    justify-content: flex-start;
    margin-bottom: 8px;
  }
}

@media (max-width: 767px) {
  .relation-selector {
    position: static;
    width: 100%;
    flex-wrap: wrap;
    justify-content: flex-start;
    margin-bottom: 8px;
  }

  .relation-select,
  .relation-key-select {
    width: 100%;
  }
}
</style>
