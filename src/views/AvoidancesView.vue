<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import BREAK from "@/BREAK";
import KnowledgeSplitView from "@/components/KnowledgeSplitView.vue";
import AvoidanceDetailBody from "@/components/AvoidanceDetailBody.vue";
import { getMessageStringArray } from "@/utils/i18nMessage";

const route = useRoute();
const { t, locale, messages } = useI18n();

const avoidanceKeys = Object.keys(BREAK.avoidances);
// 优先从路由参数获取，最后使用默认值
const getInitialKey = () => {
  const paramKey = typeof route.params.aKey === 'string' ? route.params.aKey : '';
  return paramKey || avoidanceKeys[0] || "";
};
const selectedAvoidanceKey = ref(getInitialKey());
const selectedCategory = ref("");
const avoidanceCategories = computed(() =>
  Object.entries(BREAK.avoidanceCategories).sort(
    ([, left], [, right]) => (left.order ?? 0) - (right.order ?? 0)
  )
);

watch(
  () => route.params.aKey,
  (key) => {
    if (key && typeof key === "string" && BREAK.avoidances[key]) selectedAvoidanceKey.value = key;
  }
);

const avoidanceItems = computed(() =>
  avoidanceKeys
    .filter(
      (aKey) =>
        !selectedCategory.value ||
        BREAK.avoidances[aKey].category === selectedCategory.value
    )
    .map((aKey) => {
      const category = BREAK.avoidances[aKey].category;
      const title = t(`BREAK.avoidances.${aKey}.title`);
      const definition = t(`BREAK.avoidances.${aKey}.definition`);
      const description = t(`BREAK.avoidances.${aKey}.description`);
      const limitation = BREAK.avoidances[aKey].limitation
        ? t(`BREAK.avoidances.${aKey}.limitation`)
        : "";
      const categoryTitle = t(`BREAK.avoidanceCategories.${category}.title`);
      const localeMessages = messages.value[locale.value] as Record<string, unknown>;
      const keywords = getMessageStringArray(
        localeMessages,
        `BREAK.avoidances.${aKey}.keywords`
      );

      return {
        id: aKey,
        title,
        badge: `${category}: ${categoryTitle}`,
        badgeType: category.toLowerCase(),
        subtitle: definition.slice(0, 50),
        searchText: [title, ...keywords, definition, description, limitation, category, categoryTitle]
          .filter(Boolean)
          .join(" "),
      };
    })
);

const selectedAvoidance = computed(() => BREAK.avoidances[selectedAvoidanceKey.value]);

watch(selectedCategory, () => {
  if (
    selectedCategory.value &&
    selectedAvoidance.value?.category !== selectedCategory.value
  ) {
    selectedAvoidanceKey.value = avoidanceItems.value[0]?.id || "";
  }
});
</script>

<template>
  <KnowledgeSplitView
    :title="$t('menu.avoidances')"
    param-key="aKey"
    route-name="knowledgesAvoidanceList"
    detail-route-name="knowledgesAvoidanceDetail"
    :items="avoidanceItems"
    :selected-key="selectedAvoidanceKey"
    :search-placeholder="$t('search.avoidancePlaceholder')"
    @select="selectedAvoidanceKey = $event"
  >
    <template #filters>
      <el-select
        id="avoidance-category-filter"
        v-model="selectedCategory"
        class="avoidance-category-filter"
        name="avoidance-category-filter"
        size="small"
        clearable
        :placeholder="$t('allCategories')"
      >
        <el-option
          v-for="entry in avoidanceCategories"
          :key="entry[0]"
          :label="$t(`BREAK.avoidanceCategories.${entry[0]}.title`)"
          :value="entry[0]"
        />
      </el-select>
    </template>

    <AvoidanceDetailBody v-if="selectedAvoidance" :a-key="selectedAvoidanceKey" mode="list" />
  </KnowledgeSplitView>
</template>

<style scoped>
.avoidance-category-filter {
  flex: 0 0 96px;
}
</style>
