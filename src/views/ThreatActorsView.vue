<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import BREAK from "@/BREAK";
import KnowledgeSplitView from "@/components/KnowledgeSplitView.vue";
import ThreatActorDetailBody from "@/components/ThreatActorDetailBody.vue";
import { getMessageStringArray } from "@/utils/i18nMessage";

const route = useRoute();
const { t, locale, messages } = useI18n();

const threatActorKeys = Object.keys(BREAK.threatActors);
// 优先从路由参数获取，否则使用默认值
const getInitialKey = () => {
  const paramKey = typeof route.params.taKey === 'string' ? route.params.taKey : '';
  return paramKey || threatActorKeys[0] || "";
};
const selectedThreatActorKey = ref(getInitialKey());

watch(
  () => route.params.taKey,
  (taKey) => {
    if (taKey && typeof taKey === 'string' && BREAK.threatActors[taKey]) {
      selectedThreatActorKey.value = taKey;
    }
  }
);

const threatActorItems = computed(() =>
  threatActorKeys.map((taKey) => {
    const threatActor = BREAK.threatActors[taKey];
    const title = t(`BREAK.threatActors.${taKey}.title`);
    const description = t(`BREAK.threatActors.${taKey}.description`);
    const localeMessages = messages.value[locale.value] as Record<string, unknown>;
    const keywords = getMessageStringArray(
      localeMessages,
      `BREAK.threatActors.${taKey}.keywords`
    );

    return {
      id: taKey,
      title,
      subtitle: description.slice(0, 56),
      searchText: [
        title,
        ...keywords,
        description,
        ...threatActor.directCauseRisks,
        ...threatActor.indirectSupportRisks,
        ...threatActor.buildAttackTools,
        ...threatActor.useAttackTools,
        ...(threatActor.relatedThreatActors ?? []).map((relation) => relation.key),
      ].join(" "),
    };
  })
);

const selectedThreatActor = computed(() => BREAK.threatActors[selectedThreatActorKey.value]);
</script>

<template>
  <KnowledgeSplitView
    :title="$t('threatActors')"
    route-name="knowledgesThreatActorList"
    detail-route-name="knowledgesThreatActorDetail"
    param-key="taKey"
    :items="threatActorItems"
    :selected-key="selectedThreatActorKey"
    :search-placeholder="$t('search.threatActorPlaceholder')"
    @select="selectedThreatActorKey = $event"
  >
    <ThreatActorDetailBody v-if="selectedThreatActor" :ta-key="selectedThreatActorKey" mode="list" />
  </KnowledgeSplitView>
</template>

<style scoped>
</style>
