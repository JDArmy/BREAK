<script setup lang="ts">
import BREAK from "@/BREAK";
import { useSafeI18n } from "@/composables/useSafeI18n";
import { computed } from "vue";

const { safeT } = useSafeI18n();

const props = defineProps<{
  /** 实体类型，如 "risks", "avoidances", "attackTools", "threatActors" */
  type: string;
  /** 实体 key，如 "R0001", "AT0001" */
  entityKey: string;
}>();

/**
 * 获取 ZH 源数据中的 references 数组
 * link 是结构数据，始终从中文源获取
 */
const references = computed(() => {
  const category = BREAK[props.type as keyof typeof BREAK] as Record<
    string,
    { references?: { link: string; title: string }[] }
  >;
  return category?.[props.entityKey]?.references ?? [];
});

/** 安全获取翻译后的 reference title（绕过 vue-i18n 管道符解析） */
function getRefTitle(index: number): string {
  return safeT(`BREAK.${props.type}.${props.entityKey}.references[${index}].title`);
}
</script>

<template>
  <div v-if="references.length > 0" class="reference-list">
    <div v-for="(ref, index) in references" :key="index" class="reference-item">
      <span class="reference-bullet">•</span>
      <a v-if="ref.link" :href="ref.link" target="_blank" rel="noopener noreferrer" class="reference-link">
        {{ getRefTitle(index) }}
      </a>
      <span v-else class="reference-text">{{ getRefTitle(index) }}</span>
    </div>
  </div>
</template>

<style scoped>
.reference-list {
  margin-top: 8px;
}

.reference-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 10px;
  line-height: 1.6;
}

.reference-bullet {
  color: var(--break-text-secondary);
  font-weight: 600;
  flex-shrink: 0;
  margin-top: 2px;
}

.reference-link {
  color: var(--break-link);
  text-decoration: none;
  font-size: 14px;
  transition: color 0.2s;
  flex: 1;
}

.reference-link:hover,
.reference-link:active {
  color: var(--break-link-hover);
  text-decoration: underline;
}

.reference-text {
  color: var(--break-text-primary);
  font-size: 14px;
  flex: 1;
}
</style>
