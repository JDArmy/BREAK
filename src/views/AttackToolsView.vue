<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import BREAK from "@/BREAK";
import KnowledgeSplitView from "@/components/KnowledgeSplitView.vue";
import AttackToolDetailBody from "@/components/AttackToolDetailBody.vue";
import { getMessageStringArray } from "@/utils/i18nMessage";

const route = useRoute();
const { t, locale, messages } = useI18n();

const attackToolKeys = Object.keys(BREAK.attackTools);
// 优先从路由参数获取，最后使用默认值
const getInitialKey = () => {
  const paramKey = typeof route.params.atKey === 'string' ? route.params.atKey : '';
  return paramKey || attackToolKeys[0] || "";
};
const selectedAttackToolKey = ref(getInitialKey());

watch(
  () => route.params.atKey,
  (atKey) => {
    if (atKey && typeof atKey === 'string' && BREAK.attackTools[atKey]) {
      selectedAttackToolKey.value = atKey;
    }
  }
);

const attackToolItems = computed(() =>
  attackToolKeys.map((atKey) => {
    const attackTool = BREAK.attackTools[atKey];
    const title = t(`BREAK.attackTools.${atKey}.title`);
    const description = t(`BREAK.attackTools.${atKey}.description`);
    const localeMessages = messages.value[locale.value] as Record<string, unknown>;
    const keywords = getMessageStringArray(
      localeMessages,
      `BREAK.attackTools.${atKey}.keywords`
    );

    return {
      id: atKey,
      title,
      subtitle: description.slice(0, 56),
      searchText: [
        title,
        ...keywords,
        description,
        ...attackTool.avoidances,
        ...attackTool.directCauseRisks,
        ...attackTool.indirectSupportRisks,
        ...(attackTool.relatedAttackTools ?? []).map((relation) => relation.key),
      ].join(" "),
    };
  })
);

const selectedAttackTool = computed(() => BREAK.attackTools[selectedAttackToolKey.value]);
</script>

<template>
  <KnowledgeSplitView
    :title="$t('attackTools')"
    route-name="knowledgesAttackToolList"
    detail-route-name="knowledgesAttackToolDetail"
    param-key="atKey"
    :items="attackToolItems"
    :selected-key="selectedAttackToolKey"
    :search-placeholder="$t('search.attackToolPlaceholder')"
    @select="selectedAttackToolKey = $event"
  >
    <AttackToolDetailBody v-if="selectedAttackTool" :at-key="selectedAttackToolKey" mode="list" />
  </KnowledgeSplitView>
</template>

<style scoped>
</style>
