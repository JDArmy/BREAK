<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import BREAK from "@/BREAK";
import KnowledgeSplitView from "@/components/KnowledgeSplitView.vue";
import ReferenceList from "@/components/ReferenceList.vue";
import { getMessageStringArray } from "@/utils/i18nMessage";
import { useBreakpoints } from "@/composables/useBreakpoints";
import { prefetchAllKnowledgeViews, prefetchRelationView } from "@/composables/useRoutePrefetch";

const route = useRoute();
const router = useRouter();
const { t, locale, messages } = useI18n();
const { isMobile } = useBreakpoints();

prefetchAllKnowledgeViews();
prefetchRelationView();

const threatActorKeys = Object.keys(BREAK.threatActors);
// 优先从路由参数获取，否则从 hash 获取，最后使用默认值
const getInitialKey = () => {
  const paramKey = typeof route.params.taKey === 'string' ? route.params.taKey : '';
  const hashKey = route.hash.replace("#", "");
  return paramKey || hashKey || threatActorKeys[0] || "";
};
const selectedThreatActorKey = ref(getInitialKey());

watch(
  () => route.hash,
  (hash) => {
    const key = hash.replace("#", "");
    if (key && BREAK.threatActors[key]) selectedThreatActorKey.value = key;
  },
  { immediate: true }
);

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
      ].join(" "),
    };
  })
);

const selectedThreatActor = computed(() => BREAK.threatActors[selectedThreatActorKey.value]);

const relatedTermKeys = computed(() =>
  Object.keys(BREAK.terms).filter((tKey) =>
    BREAK.terms[tKey].relatedThreatActors.includes(selectedThreatActorKey.value)
  )
);

const openRelationGraph = (taKey: string) => {
  router.push({
    name: "relation",
    params: { type: "threat-actor", key: taKey },
  });
};
</script>

<template>
  <KnowledgeSplitView
    :title="$t('threatActors')"
    route-name="threatActors"
    detail-route-name="threatActorsDetail"
    :items="threatActorItems"
    :selected-key="selectedThreatActorKey"
    :search-placeholder="$t('search.threatActorPlaceholder')"
    @select="selectedThreatActorKey = $event"
  >
    <article v-if="selectedThreatActor" class="detail-panel">
      <div class="detail-heading">
        <div>
          <div class="detail-id">{{ selectedThreatActorKey }}</div>
          <h2>{{ $t(`BREAK.threatActors.${selectedThreatActorKey}.title`) }}</h2>
        </div>
        <el-button type="primary" size="small" @click="openRelationGraph(selectedThreatActorKey)">
          {{ $t("openRelationGraph") }}
        </el-button>
      </div>

      <section class="detail-section">
        <h3>{{ $t("description") }}</h3>
        <p>{{ $t(`BREAK.threatActors.${selectedThreatActorKey}.description`) }}</p>
      </section>
      <section v-if="selectedThreatActor.keywords?.length" class="detail-section">
        <h3>{{ $t("keywords") }}</h3>
        <div class="keywords">
          <span v-for="(keyword, index) in selectedThreatActor.keywords" :key="index" class="keyword-tag">
            {{ keyword }}
          </span>
        </div>
      </section>
      <section v-if="selectedThreatActor.directCauseRisks.length" class="detail-section">
        <h3>{{ $t("relationLine.directCauseRisk") }}</h3>
        <div class="entity-links">
          <router-link
            v-for="rKey in selectedThreatActor.directCauseRisks"
            :key="rKey"
            :to="isMobile ? { name: 'risksDetail', params: { rKey } } : { name: 'risks', hash: `#${rKey}` }"
            class="entity-link"
          >
            {{ rKey }}: {{ $t(`BREAK.risks.${rKey}.title`) }}
          </router-link>
        </div>
      </section>
      <section v-if="selectedThreatActor.indirectSupportRisks.length" class="detail-section">
        <h3>{{ $t("relationLine.indirectSupportRisk") }}</h3>
        <div class="entity-links">
          <router-link
            v-for="rKey in selectedThreatActor.indirectSupportRisks"
            :key="rKey"
            :to="isMobile ? { name: 'risksDetail', params: { rKey } } : { name: 'risks', hash: `#${rKey}` }"
            class="entity-link"
          >
            {{ rKey }}: {{ $t(`BREAK.risks.${rKey}.title`) }}
          </router-link>
        </div>
      </section>
      <section v-if="selectedThreatActor.buildAttackTools.length" class="detail-section">
        <h3>{{ $t("buildAttackTools") }}</h3>
        <div class="entity-links">
          <router-link
            v-for="atKey in selectedThreatActor.buildAttackTools"
            :key="atKey"
            :to="isMobile ? { name: 'attackToolsDetail', params: { atKey } } : { name: 'attackTools', hash: `#${atKey}` }"
            class="entity-link"
          >
            {{ atKey }}: {{ $t(`BREAK.attackTools.${atKey}.title`) }}
          </router-link>
        </div>
      </section>
      <section v-if="selectedThreatActor.useAttackTools.length" class="detail-section">
        <h3>{{ $t("useAttackTools") }}</h3>
        <div class="entity-links">
          <router-link
            v-for="atKey in selectedThreatActor.useAttackTools"
            :key="atKey"
            :to="isMobile ? { name: 'attackToolsDetail', params: { atKey } } : { name: 'attackTools', hash: `#${atKey}` }"
            class="entity-link"
          >
            {{ atKey }}: {{ $t(`BREAK.attackTools.${atKey}.title`) }}
          </router-link>
        </div>
      </section>
      <section v-if="relatedTermKeys.length" class="detail-section">
        <h3>{{ $t("terms") }}</h3>
        <div class="entity-links">
          <router-link
            v-for="tKey in relatedTermKeys"
            :key="tKey"
            :to="isMobile ? { name: 'termsDetail', params: { tKey } } : { name: 'terms', hash: `#${tKey}` }"
            class="entity-link"
          >
            {{ tKey }}: {{ $t(`BREAK.terms.${tKey}.title`) }}
          </router-link>
        </div>
      </section>
      <section v-if="selectedThreatActor.references?.length" class="detail-section">
        <h3>{{ $t("references") }}</h3>
        <ReferenceList type="threatActors" :entity-key="selectedThreatActorKey" />
      </section>
      <section v-if="selectedThreatActor.updated" class="detail-section">
        <h3>{{ $t("lastUpdated") }}</h3>
        <p class="text-muted">{{ selectedThreatActor.updated }}</p>
      </section>
    </article>
  </KnowledgeSplitView>
</template>

<style scoped>
.keywords {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.keyword-tag {
  display: inline-block;
  padding: 4px 12px;
  background: var(--break-bg-secondary);
  border: 1px solid var(--break-border);
  border-radius: 4px;
  font-size: 0.9em;
  color: var(--break-text-secondary);
}

.text-muted {
  color: var(--break-text-muted);
  font-size: 0.9em;
}
</style>
