<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { RelationType } from "@/views/relation/relationTypes";

const props = defineProps<{
  relType: RelationType;
  relKey: string;
  RelationTypeMapping: Record<string, { title: string; BreakKey: string }>;
  getCurrentEntityOptions: Record<string, unknown>;
}>();

const emit = defineEmits<{
  "update:relType": [value: RelationType];
  "update:relKey": [value: string];
}>();

const { t } = useI18n();

const selectedType = computed({
  get: () => props.relType,
  set: (value: RelationType) => emit("update:relType", value),
});

const selectedKey = computed({
  get: () => props.relKey,
  set: (value: string) => emit("update:relKey", value),
});

const selectableRelationTypes = computed(() =>
  Object.entries(props.RelationTypeMapping).filter(
    ([key]) => key !== RelationType.term
  )
);

const entitySelectOptionsReady = ref(false);

const buildEntitySelectOptions = () => {
  const currentMapping = props.RelationTypeMapping[props.relType];
  if (!currentMapping) return [];

  return Object.keys(props.getCurrentEntityOptions).map((key) => ({
    label: `${key}:${t(`BREAK.${currentMapping.BreakKey}.${key}.title`)}`,
    value: key,
  }));
};

const currentEntityOption = computed(() => {
  const currentMapping = props.RelationTypeMapping[props.relType];
  if (!currentMapping || !props.relKey) return [];
  return [
    {
      label: `${props.relKey}:${t(`BREAK.${currentMapping.BreakKey}.${props.relKey}.title`)}`,
      value: props.relKey,
    },
  ];
});

const entitySelectOptions = computed(() => {
  if (!entitySelectOptionsReady.value) {
    return currentEntityOption.value;
  }
  return buildEntitySelectOptions();
});

onMounted(() => {
  const markReady = () => {
    entitySelectOptionsReady.value = true;
  };
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(markReady, { timeout: 800 });
  } else {
    window.setTimeout(markReady, 200);
  }
});

watch(
  () => props.relType,
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
  display: flex;
  gap: 8px;
  align-items: center;
  padding-bottom: 4px;
}

.relation-select {
  width: 160px;
}

.relation-key-select {
  width: min(520px, calc(100vw - 420px));
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
