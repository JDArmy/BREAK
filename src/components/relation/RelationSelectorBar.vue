<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { RelationType } from "@/views/relation/relationTypes";

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

const entitySelectOptions = computed(() => {
  const currentMapping = props.RelationTypeMapping[props.relType];
  if (!currentMapping) return [];

  return Object.keys(props.getCurrentEntityOptions).map((key) => ({
    label: `${key}:${t(`BREAK.${currentMapping.BreakKey}.${key}.title`)}`,
    value: key,
  }));
});
</script>

<template>
  <div class="relation-selector">
    <el-select v-model="selectedType" class="relation-select">
      <el-option
        v-for="(item, key) in RelationTypeMapping"
        :key="key"
        :label="item.title"
        :value="key"
      />
    </el-select>
    <el-select-v2
      v-model="selectedKey"
      class="relation-key-select"
      filterable
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
