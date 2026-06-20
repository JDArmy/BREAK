<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import BREAK from "@/BREAK";
import KnowledgeSplitView from "@/components/KnowledgeSplitView.vue";
import ReferenceList from "@/components/ReferenceList.vue";
import EntityLinkSection from "@/components/EntityLinkSection.vue";
import { getMessageStringArray } from "@/utils/i18nMessage";
import { useBreakpoints } from "@/composables/useBreakpoints";
import { useRelatedCases } from "@/composables/useRelatedCases";
import { useRelatedEntities } from "@/composables/useRelatedEntities";
import { useRelationGraph } from "@/composables/useRelationGraph";

const route = useRoute();
const { t, locale, messages } = useI18n();
const { isMobile } = useBreakpoints();

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
const localeMessages = computed(() => messages.value[locale.value] as Record<string, unknown>);

const { relatedCases, ensureCases, cases, loaded, sectionRef: casesSectionRef } = useRelatedCases(
  "threatActor",
  selectedThreatActorKey,
);

// 反查：关联该威胁行为者的术语
const relatedTermKeys = useRelatedEntities(
  BREAK.terms,
  "relatedThreatActors",
  selectedThreatActorKey,
);

const { openRelationGraph } = useRelationGraph("threat-actor");
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

      <section class="detail-section" data-detail-anchor="threat-actors">
        <h3>{{ $t("description") }}</h3>
        <p>{{ $t(`BREAK.threatActors.${selectedThreatActorKey}.description`) }}</p>
      </section>
      <section v-if="getMessageStringArray(localeMessages, `BREAK.threatActors.${selectedThreatActorKey}.keywords`).length" class="detail-section">
        <h3>{{ $t("keywords") }}</h3>
        <div class="keywords">
          <span v-for="keyword in getMessageStringArray(localeMessages, `BREAK.threatActors.${selectedThreatActorKey}.keywords`)" :key="keyword" class="keyword-tag">
            {{ keyword }}
          </span>
        </div>
      </section>
      <EntityLinkSection
        :keys="selectedThreatActor.directCauseRisks"
        title="relationLine.directCauseRisk"
        route-name="risks"
        detail-route-name="risksDetail"
        param-key="rKey"
        anchor="risks"
      />
      <EntityLinkSection
        :keys="selectedThreatActor.indirectSupportRisks"
        title="relationLine.indirectSupportRisk"
        route-name="risks"
        detail-route-name="risksDetail"
        param-key="rKey"
        anchor="risks"
      />
      <EntityLinkSection
        :keys="selectedThreatActor.buildAttackTools"
        title="buildAttackTools"
        route-name="attackTools"
        detail-route-name="attackToolsDetail"
        param-key="atKey"
        anchor="attack-tools"
      />
      <EntityLinkSection
        :keys="selectedThreatActor.useAttackTools"
        title="useAttackTools"
        route-name="attackTools"
        detail-route-name="attackToolsDetail"
        param-key="atKey"
        anchor="attack-tools"
      />
      <EntityLinkSection
        :keys="relatedTermKeys"
        title="terms"
        route-name="terms"
        detail-route-name="termsDetail"
        param-key="tKey"
        anchor="terms"
      />
      <section
        v-if="!loaded || relatedCases.length"
        ref="casesSectionRef"
        class="detail-section"
        data-detail-anchor="cases"
      >
        <h3>{{ $t("relatedCases") }}</h3>
        <div v-if="!loaded" class="entity-links">
          <span class="text-muted">{{ $t("loadingRelatedCases") }}</span>
          <!-- 兜底：自动加载意外未触发时，可手动加载 -->
          <button class="entity-link" @click="ensureCases()">{{ $t("loadRelatedCases") }}</button>
        </div>
        <div v-else class="entity-links">
          <router-link
            v-for="cKey in relatedCases"
            :key="cKey"
            :to="isMobile ? { name: 'casesDetail', params: { cKey } } : { name: 'cases', hash: `#${cKey}` }"
            class="entity-link"
          >
            {{ cKey }}: {{ cases[cKey]?.title }}
          </router-link>
        </div>
      </section>
      <section v-if="selectedThreatActor.references?.length" class="detail-section" data-detail-anchor="references">
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
