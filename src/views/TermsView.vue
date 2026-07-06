<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import BREAK from "@/BREAK";
import KnowledgeSplitView from "@/components/KnowledgeSplitView.vue";
import TermDetailBody from "@/components/TermDetailBody.vue";
import { getMessageStringArray, getNestedMessageValue } from "@/utils/i18nMessage";

const route = useRoute();
const { locale, messages } = useI18n();

const termKeys = Object.keys(BREAK.terms);
const selectedCategory = ref("");

// 动态提取所有分类值（去重排序）
const categoryOptions = computed(() => {
  const cats = new Set<string>();
  for (const term of Object.values(BREAK.terms)) {
    if (term.category) cats.add(term.category);
  }
  return [...cats].sort();
});

const getInitialKey = () => {
  const paramKey = typeof route.params.tKey === "string" ? route.params.tKey : "";
  return paramKey || termKeys[0] || "";
};

const selectedTermKey = ref(getInitialKey());
const selectedTerm = computed(() => BREAK.terms[selectedTermKey.value as keyof typeof BREAK.terms]);

watch(
  () => route.params.tKey,
  (tKey) => {
    if (tKey && typeof tKey === 'string' && BREAK.terms[tKey]) {
      selectedTermKey.value = tKey;
    }
  }
);

// 筛选变化时，若当前选中项不在过滤结果中，自动选中第一个
watch(selectedCategory, () => {
  if (selectedCategory.value && !termItems.value.some((item) => item.id === selectedTermKey.value)) {
    selectedTermKey.value = termItems.value[0]?.id || "";
  }
});

const localeMessages = computed(() => messages.value[locale.value] as Record<string, unknown>);

const getTermString = (termKey: string, field: string) =>
  String(getNestedMessageValue(localeMessages.value, `BREAK.terms.${termKey}.${field}`) || "");

const getTermStringArray = (termKey: string, field: string) =>
  getMessageStringArray(localeMessages.value, `BREAK.terms.${termKey}.${field}`);

// 8 种调色板，35 个分类通过哈希映射循环取色
const TERM_BADGE_PALETTE_COUNT = 8;
const termCategoryColorIndex = (cat: string): number => {
  let hash = 0;
  for (let i = 0; i < cat.length; i++) {
    hash = ((hash << 5) - hash + cat.charCodeAt(i)) | 0;
  }
  return ((hash % TERM_BADGE_PALETTE_COUNT) + TERM_BADGE_PALETTE_COUNT) % TERM_BADGE_PALETTE_COUNT;
};

const termItems = computed(() =>
  termKeys
    .filter((termKey) => {
      if (!selectedCategory.value) return true;
      return BREAK.terms[termKey].category === selectedCategory.value;
    })
    .map((termKey) => {
    const aliases = getTermStringArray(termKey, "aliases");
    const category = getTermString(termKey, "category");
    const definition = getTermString(termKey, "definition");
    // 用源数据的 category（不随语言变化）做哈希，确保中英文颜色一致
    const rawCategory = BREAK.terms[termKey].category || "";

    return {
      id: termKey,
      title: getTermString(termKey, "title"),
      subtitle: aliases[0] ? `${aliases[0]} - ${definition.slice(0, 48)}` : definition.slice(0, 48),
      badge: category,
      badgeType: rawCategory ? `term-cat-${termCategoryColorIndex(rawCategory)}` : undefined,
      searchText: [
        getTermString(termKey, "title"),
        ...aliases,
        definition,
        getTermString(termKey, "description"),
        category,
      ]
        .filter(Boolean)
        .join(" "),
    };
  })
);
</script>

<template>
  <KnowledgeSplitView
    :title="$t('terms')"
    route-name="knowledgesTermList"
    detail-route-name="knowledgesTermDetail"
    param-key="tKey"
    :items="termItems"
    :selected-key="selectedTermKey"
    :search-placeholder="$t('search.termPlaceholder')"
    @select="selectedTermKey = $event"
  >
    <template #filters>
      <el-select
        v-model="selectedCategory"
        class="term-category-filter"
        size="small"
        clearable
        filterable
        :placeholder="$t('allCategories')"
      >
        <el-option
          v-for="cat in categoryOptions"
          :key="cat"
          :label="cat"
          :value="cat"
        />
      </el-select>
    </template>
    <TermDetailBody v-if="selectedTerm" :t-key="selectedTermKey" mode="list" />
  </KnowledgeSplitView>
</template>

<style scoped>
.term-category-filter {
  flex: 0 0 120px;
}
</style>
