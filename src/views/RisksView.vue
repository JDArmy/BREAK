<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import BREAK from "@/BREAK";
import KnowledgeSplitView from "@/components/KnowledgeSplitView.vue";
import ReferenceList from "@/components/ReferenceList.vue";
import { getMessageStringArray } from "@/utils/i18nMessage";
import { useBreakpoints } from "@/composables/useBreakpoints";

const route = useRoute();
const router = useRouter();
const { t, locale, messages } = useI18n();
const { isMobile } = useBreakpoints();

const risks = Object.keys(BREAK.risks);
const selectedRiskKey = ref(
  (route.params.rKey as string) || route.hash.replace("#", "") || risks[0] || ""
);

const riskItems = computed(() =>
  risks.map((rKey) => {
    const title = t(`BREAK.risks.${rKey}.title`);
    const definition = t(`BREAK.risks.${rKey}.definition`);
    const description = t(`BREAK.risks.${rKey}.description`);
    const complexity = t(`BREAK.risks.${rKey}.complexity`);
    const influence = t(`BREAK.risks.${rKey}.influence`);
    const localeMessages = messages.value[locale.value] as Record<string, unknown>;
    const keywords = getMessageStringArray(localeMessages, `BREAK.risks.${rKey}.keywords`);

    return {
      id: rKey,
      title,
      subtitle: definition.slice(0, 56),
      searchText: [title, ...keywords, definition, description, complexity, influence]
        .filter(Boolean)
        .join(" "),
    };
  })
);

watch(
  () => route.hash,
  (hash) => {
    const key = hash.replace("#", "");
    if (key && BREAK.risks[key]) selectedRiskKey.value = key;
  },
  { immediate: true }
);

watch(
  () => route.params.rKey,
  (key) => {
    if (key && BREAK.risks[key as string]) selectedRiskKey.value = key as string;
  },
  { immediate: true }
);

const selectedRisk = computed(() => BREAK.risks[selectedRiskKey.value]);

const getRiskDescriptionTools = (rKey: string) =>
  Object.keys(BREAK.attackTools).filter((atKey) => {
    const at = BREAK.attackTools[atKey as keyof typeof BREAK.attackTools];
    return at.directCauseRisks.includes(rKey) || at.indirectSupportRisks.includes(rKey);
  });

const getRelatedTerms = (rKey: string) =>
  Object.keys(BREAK.terms).filter((tKey) =>
    BREAK.terms[tKey as keyof typeof BREAK.terms].relatedRisks.includes(rKey)
  );

const openRelationGraph = (rKey: string) => {
  router.push({
    name: "relation",
    params: { type: "risk", key: rKey },
  });
};
</script>

<template>
  <KnowledgeSplitView
    :title="$t('menu.risks')"
    route-name="risks"
    detail-route-name="risksDetail"
    :items="riskItems"
    :selected-key="selectedRiskKey"
    :search-placeholder="$t('search.riskPlaceholder')"
    @select="selectedRiskKey = $event"
  >
    <article v-if="selectedRisk" class="detail-panel">
      <div class="detail-heading">
        <div>
          <div class="detail-id">{{ selectedRiskKey }}</div>
          <h2>{{ $t(`BREAK.risks.${selectedRiskKey}.title`) }}</h2>
        </div>
        <el-button type="primary" size="small" @click="openRelationGraph(selectedRiskKey)">
          {{ $t("openRelationGraph") }}
        </el-button>
      </div>

      <section class="detail-section">
        <h3>{{ $t("riskDefinition") }}</h3>
        <p>{{ $t(`BREAK.risks.${selectedRiskKey}.definition`) }}</p>
      </section>
      <section class="detail-section">
        <h3>{{ $t("riskDescription") }}</h3>
        <p>{{ $t(`BREAK.risks.${selectedRiskKey}.description`) }}</p>
      </section>
      <section class="detail-grid">
        <div>
          <h3>{{ $t("riskComplexity") }}</h3>
          <p>{{ $t(`BREAK.risks.${selectedRiskKey}.complexity`) }}</p>
        </div>
        <div>
          <h3>{{ $t("riskInfluence") }}</h3>
          <p>{{ $t(`BREAK.risks.${selectedRiskKey}.influence`) }}</p>
        </div>
      </section>
      <section v-if="selectedRisk.keywords?.length" class="detail-section">
        <h3>{{ $t("keywords") }}</h3>
        <div class="keywords">
          <span v-for="(keyword, index) in selectedRisk.keywords" :key="index" class="keyword-tag">
            {{ keyword }}
          </span>
        </div>
      </section>
      <section class="detail-section">
        <h3>{{ $t("riskAvoidances") }}</h3>
        <div class="entity-links">
          <router-link
            v-for="aKey in selectedRisk.avoidances"
            :key="aKey"
            :to="isMobile ? { name: 'avoidancesDetail', params: { aKey } } : { name: 'avoidances', hash: `#${aKey}` }"
            class="entity-link"
          >
            {{ aKey }}: {{ $t(`BREAK.avoidances.${aKey}.title`) }}
          </router-link>
        </div>
      </section>
      <section v-if="getRiskDescriptionTools(selectedRiskKey).length" class="detail-section">
        <h3>{{ $t("attackTools") }}</h3>
        <div class="entity-links">
          <router-link
            v-for="atKey in getRiskDescriptionTools(selectedRiskKey)"
            :key="atKey"
            :to="isMobile ? { name: 'attackToolsDetail', params: { atKey } } : { name: 'attackTools', hash: `#${atKey}` }"
            class="entity-link"
          >
            {{ atKey }}: {{ $t(`BREAK.attackTools.${atKey}.title`) }}
          </router-link>
        </div>
      </section>
      <section v-if="getRelatedTerms(selectedRiskKey).length" class="detail-section">
        <h3>{{ $t("terms") }}</h3>
        <div class="entity-links">
          <router-link
            v-for="tKey in getRelatedTerms(selectedRiskKey)"
            :key="tKey"
            :to="isMobile ? { name: 'termsDetail', params: { tKey } } : { name: 'terms', hash: `#${tKey}` }"
            class="entity-link"
          >
            {{ tKey }}: {{ $t(`BREAK.terms.${tKey}.title`) }}
          </router-link>
        </div>
      </section>
      <section v-if="selectedRisk.references?.length" class="detail-section">
        <h3>{{ $t("riskReference") }}</h3>
        <ReferenceList type="risks" :entity-key="selectedRiskKey" />
      </section>
      <section v-if="selectedRisk.updated" class="detail-section">
        <h3>{{ $t("lastUpdated") }}</h3>
        <p class="text-muted">{{ selectedRisk.updated }}</p>
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
