<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import BREAK from "@/BREAK";
import KnowledgeSplitView from "@/components/KnowledgeSplitView.vue";
import RiskDetailBody from "@/components/RiskDetailBody.vue";
import { getMessageStringArray } from "@/utils/i18nMessage";

const route = useRoute();
const { t, locale, messages } = useI18n();

const risks = Object.keys(BREAK.risks);
const selectedRiskKey = ref((route.params.rKey as string) || risks[0] || "");
const selectedRisk = computed(() => BREAK.risks[selectedRiskKey.value as keyof typeof BREAK.risks]);
const selectedComplexity = ref("");

const COMPLEXITY_LEVELS = ["basic", "intermediate", "advanced"] as const;

const riskItems = computed(() =>
  risks
    .filter((rKey) => {
      if (!selectedComplexity.value) return true;
      return BREAK.risks[rKey].complexity === selectedComplexity.value;
    })
    .map((rKey) => {
    const title = t(`BREAK.risks.${rKey}.title`);
    const definition = t(`BREAK.risks.${rKey}.definition`);
    const description = t(`BREAK.risks.${rKey}.description`);
    const complexity = t(`riskComplexityLevel.${BREAK.risks[rKey].complexity}`);
    const influence = t(`BREAK.risks.${rKey}.influence`);
    const priority = BREAK.risks[rKey].riskAssessment?.priority;
    const localeMessages = messages.value[locale.value] as Record<string, unknown>;
    const keywords = getMessageStringArray(localeMessages, `BREAK.risks.${rKey}.keywords`);

    return {
      id: rKey,
      title,
      subtitle: definition.slice(0, 56),
      badge: complexity,
      badgeType: `risk-${BREAK.risks[rKey].complexity}`,
      searchText: [title, ...keywords, definition, description, complexity, influence, priority]
        .filter(Boolean)
        .join(" "),
    };
  })
);

watch(
  () => route.params.rKey,
  (key) => {
    if (key && typeof key === "string" && BREAK.risks[key]) selectedRiskKey.value = key;
  }
);

// 筛选变化时，若当前选中项不在过滤结果中，自动选中第一个
watch(selectedComplexity, () => {
  if (selectedComplexity.value && !riskItems.value.some((item) => item.id === selectedRiskKey.value)) {
    selectedRiskKey.value = riskItems.value[0]?.id || "";
  }
});
</script>

<template>
  <KnowledgeSplitView
    :title="$t('menu.risks')"
    route-name="knowledgesRiskList"
    detail-route-name="knowledgesRiskDetail"
    param-key="rKey"
    :items="riskItems"
    :selected-key="selectedRiskKey"
    :search-placeholder="$t('search.riskPlaceholder')"
    @select="selectedRiskKey = $event"
  >
    <template #filters>
      <el-select
        v-model="selectedComplexity"
        class="complexity-filter"
        size="small"
        clearable
        :placeholder="$t('allComplexityLevels')"
      >
        <el-option
          v-for="level in COMPLEXITY_LEVELS"
          :key="level"
          :label="$t(`riskComplexityLevel.${level}`)"
          :value="level"
        />
      </el-select>
    </template>
    <RiskDetailBody v-if="selectedRisk" :r-key="selectedRiskKey" mode="list" />
  </KnowledgeSplitView>
</template>

<style scoped>
.complexity-filter {
  flex: 0 0 96px;
}
</style>
