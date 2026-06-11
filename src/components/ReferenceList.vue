<script setup lang="ts">
import BREAK from "@/BREAK";
import { useSafeI18n } from "@/composables/useSafeI18n";

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
const references = (() => {
  const category = BREAK[props.type as keyof typeof BREAK] as Record<
    string,
    { references?: { link: string; title: string }[] }
  >;
  return category?.[props.entityKey]?.references ?? [];
})();

/** 安全获取翻译后的 reference title（绕过 vue-i18n 管道符解析） */
function getRefTitle(index: number): string {
  return safeT(`BREAK.${props.type}.${props.entityKey}.references[${index}].title`);
}
</script>

<template>
  <div v-if="references.length > 0" class="reference-list">
    <div v-for="(ref, index) in references" :key="index" class="reference-item">
      <a v-if="ref.link" :href="ref.link" target="_blank" rel="noopener noreferrer">
        {{ getRefTitle(index) }}
      </a>
      <span v-else>{{ getRefTitle(index) }}</span>
    </div>
  </div>
</template>

<style scoped>
.reference-list {
  margin-top: 10px;
}

.reference-item {
  margin-bottom: 8px;
  line-height: 1.8;
}

.reference-item a {
  color: #409eff;
  text-decoration: none;
}

.reference-item a:hover {
  text-decoration: underline;
}
</style>
