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

const getCategoryString = (kind: "groups" | "categories", key: string, field: string) =>
  String(getNestedMessageValue(localeMessages.value, `BREAK.termCategories.${kind}.${key}.${field}`) || key);

const categoryUsage = computed(() => {
  const counts = new Map<string, number>();
  for (const term of Object.values(BREAK.terms)) {
    counts.set(term.category, (counts.get(term.category) ?? 0) + 1);
  }
  return counts;
});

// 分类结构和顺序统一来自注册表；筛选值始终使用稳定语义 key。
const categoryGroups = computed(() =>
  Object.entries(BREAK.termCategories.groups)
    .sort(([, left], [, right]) => left.order - right.order)
    .map(([groupKey]) => ({
      key: groupKey,
      label: getCategoryString("groups", groupKey, "title"),
      categories: Object.entries(BREAK.termCategories.categories)
        .filter(([, category]) => category.group === groupKey)
        .filter(([categoryKey]) => categoryUsage.value.has(categoryKey))
        .sort(([, left], [, right]) => left.order - right.order)
        .map(([categoryKey]) => ({
          key: categoryKey,
          label: getCategoryString("categories", categoryKey, "title"),
          count: categoryUsage.value.get(categoryKey) ?? 0,
        })),
    }))
    .filter((group) => group.categories.length > 0),
);

// 8 种调色板，分类通过稳定语义 key 哈希映射循环取色
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
    const rawCategory = BREAK.terms[termKey].category || "";
    const category = getCategoryString("categories", rawCategory, "title");
    const groupKey = BREAK.termCategories.categories[rawCategory as keyof typeof BREAK.termCategories.categories]?.group || "";
    const categoryGroup = groupKey ? getCategoryString("groups", groupKey, "title") : "";
    const definition = getTermString(termKey, "definition");

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
        categoryGroup,
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
        <el-option-group
          v-for="group in categoryGroups"
          :key="group.key"
          :label="group.label"
        >
          <el-option
            v-for="category in group.categories"
            :key="category.key"
            :label="`${category.label} (${category.count})`"
            :value="category.key"
          />
        </el-option-group>
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
