<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import BREAK from "@/BREAK";
import KnowledgeSplitView from "@/components/KnowledgeSplitView.vue";
import ReferenceList from "@/components/ReferenceList.vue";
import EntityLinkSection from "@/components/EntityLinkSection.vue";
import { getMessageStringArray } from "@/utils/i18nMessage";
import { formatRiskRelationNote } from "@/utils/relationNote";
import { useRelatedCases } from "@/composables/useRelatedCases";
import { useRelatedEntities } from "@/composables/useRelatedEntities";
import { useRelationGraph } from "@/composables/useRelationGraph";

const route = useRoute();
const { t, locale, messages } = useI18n();

const risks = Object.keys(BREAK.risks);
const selectedRiskKey = ref(
  (route.params.rKey as string) || route.hash.replace("#", "") || risks[0] || ""
);

const riskItems = computed(() =>
  risks.map((rKey) => {
    const title = t(`BREAK.risks.${rKey}.title`);
    const definition = t(`BREAK.risks.${rKey}.definition`);
    const description = t(`BREAK.risks.${rKey}.description`);
    const complexity = t(`riskComplexityLevel.${BREAK.risks[rKey].complexity}`);
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
    if (key && typeof key === "string" && BREAK.risks[key]) selectedRiskKey.value = key;
  }
);

const selectedRisk = computed(() => BREAK.risks[selectedRiskKey.value]);
const localeMessages = computed(() => messages.value[locale.value] as Record<string, unknown>);
const relatedRiskRelations = computed(() => selectedRisk.value?.relatedRisks ?? []);
const getRiskRelationNote = (relation: NonNullable<typeof relatedRiskRelations.value>[number]) =>
  formatRiskRelationNote(relation, selectedRiskKey.value, locale.value, t);

const { relatedCases, ensureCases, cases, loaded, sectionRef: casesSectionRef } = useRelatedCases(
  "risk",
  selectedRiskKey,
);

// 反查：造成/支持该风险的攻击工具、威胁行为者，以及关联该风险的术语
const descriptionTools = useRelatedEntities(
  BREAK.attackTools,
  ["directCauseRisks", "indirectSupportRisks"],
  selectedRiskKey,
);
const riskThreatActors = useRelatedEntities(
  BREAK.threatActors,
  ["directCauseRisks", "indirectSupportRisks"],
  selectedRiskKey,
);
const relatedTerms = useRelatedEntities(BREAK.terms, "relatedRisks", selectedRiskKey);

const { openRelationGraph } = useRelationGraph("risk");
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
    <article v-if="selectedRisk" class="detail-panel risk-detail-panel">
      <div class="detail-heading">
        <div>
          <div class="detail-id">{{ selectedRiskKey }}</div>
          <h2>{{ $t(`BREAK.risks.${selectedRiskKey}.title`) }}</h2>
        </div>
        <el-button type="primary" size="small" @click="openRelationGraph(selectedRiskKey)">
          {{ $t("openRelationGraph") }}
        </el-button>
      </div>

      <section class="detail-section" data-detail-anchor="risks">
        <h3>{{ $t("riskDefinition") }}</h3>
        <p>{{ $t(`BREAK.risks.${selectedRiskKey}.definition`) }}</p>
      </section>
      <section class="detail-section">
        <h3>{{ $t("riskDescription") }}</h3>
        <p>{{ $t(`BREAK.risks.${selectedRiskKey}.description`) }}</p>
      </section>
      <section class="detail-grid risk-meta-grid">
        <div class="risk-meta-card risk-meta-card--compact">
          <h3>{{ $t("riskComplexity") }}</h3>
          <p class="risk-complexity-value">{{ $t(`riskComplexityLevel.${selectedRisk.complexity}`) }}</p>
        </div>
        <div class="risk-meta-card risk-meta-card--impact">
          <h3>{{ $t("riskInfluence") }}</h3>
          <p>{{ $t(`BREAK.risks.${selectedRiskKey}.influence`) }}</p>
        </div>
      </section>
      <section v-if="getMessageStringArray(localeMessages, `BREAK.risks.${selectedRiskKey}.keywords`).length" class="detail-section">
        <h3>{{ $t("keywords") }}</h3>
        <div class="keywords">
          <span v-for="keyword in getMessageStringArray(localeMessages, `BREAK.risks.${selectedRiskKey}.keywords`)" :key="keyword" class="keyword-tag">
            {{ keyword }}
          </span>
        </div>
      </section>
      <section v-if="relatedRiskRelations.length" class="detail-section">
        <h3>{{ $t("riskRelatedRisks") }}</h3>
        <div class="risk-relation-list">
          <router-link
            v-for="relation in relatedRiskRelations"
            :key="`${relation.key}-${relation.relation}`"
            class="risk-relation-item"
            :to="{ name: 'risksDetail', params: { rKey: relation.key } }"
          >
            <span class="risk-relation-type">{{ $t(`riskRelationType.${relation.relation}`) }}</span>
            <span class="risk-relation-title">
              {{ relation.key }}: {{ $t(`BREAK.risks.${relation.key}.title`) }}
            </span>
            <span v-if="relation.note" class="risk-relation-note">{{ getRiskRelationNote(relation) }}</span>
          </router-link>
        </div>
      </section>
      <EntityLinkSection
        :keys="selectedRisk.avoidances"
        title="riskAvoidances"
        route-name="avoidances"
        detail-route-name="avoidancesDetail"
        param-key="aKey"
        anchor="avoidances"
      />
      <EntityLinkSection
        :keys="descriptionTools"
        title="attackTools"
        route-name="attackTools"
        detail-route-name="attackToolsDetail"
        param-key="atKey"
        anchor="attack-tools"
      />
      <EntityLinkSection
        :keys="riskThreatActors"
        title="threatActors"
        route-name="threatActors"
        detail-route-name="threatActorsDetail"
        param-key="taKey"
        anchor="threat-actors"
      />
      <EntityLinkSection
        :keys="relatedTerms"
        title="terms"
        route-name="terms"
        detail-route-name="termsDetail"
        param-key="tKey"
        anchor="terms"
      />
      <section
        v-if="!loaded"
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
      </section>
      <EntityLinkSection
        v-else
        :keys="relatedCases"
        title="relatedCases"
        route-name="cases"
        detail-route-name="casesDetail"
        param-key="cKey"
        anchor="cases"
        :entity-records="cases"
      />
      <section v-if="selectedRisk.references?.length" class="detail-section" data-detail-anchor="references">
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

.risk-detail-panel {
  max-width: 1380px;
}

.risk-meta-grid {
  grid-template-columns: minmax(150px, 220px) minmax(0, 1fr);
  gap: 10px;
  align-items: stretch;
}

.risk-meta-grid > .risk-meta-card {
  padding: 10px 12px;
  border-radius: 6px;
  background: transparent;
}

.risk-meta-card h3 {
  margin-bottom: 6px;
}

.risk-meta-card p {
  line-height: 1.65;
}

.risk-meta-card--compact {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.risk-complexity-value {
  width: fit-content;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--break-bg-secondary);
  border: 1px solid var(--break-border);
  font-size: 0.9rem;
  font-weight: 650;
}

.risk-meta-card--impact {
  border-left: 3px solid var(--break-border);
}

.risk-relation-list {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.risk-relation-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  grid-template-areas:
    "type title"
    "type note";
  column-gap: 8px;
  row-gap: 2px;
  align-items: center;
  min-width: 0;
  min-height: 62px;
  padding: 8px 10px;
  color: inherit;
  text-decoration: none;
  background: var(--break-bg-secondary);
  border: 1px solid var(--break-border);
  border-radius: 6px;
}

.risk-relation-item:hover {
  color: var(--break-primary);
  border-color: var(--break-primary);
}

.risk-relation-type {
  grid-area: type;
  flex: 0 0 auto;
  min-width: 44px;
  padding: 1px 6px;
  font-size: 0.78rem;
  line-height: 1.5;
  text-align: center;
  color: var(--break-primary);
  border: 1px solid var(--break-primary);
  border-radius: 4px;
}

.risk-relation-title {
  grid-area: title;
  min-width: 0;
  overflow: hidden;
  font-weight: 600;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.risk-relation-note {
  grid-area: note;
  min-width: 0;
  overflow: hidden;
  color: var(--break-text-muted);
  font-size: 0.84em;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 720px) {
  .risk-meta-grid {
    grid-template-columns: 1fr;
  }

  .risk-relation-list {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 721px) and (max-width: 1180px) {
  .risk-relation-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1181px) and (max-width: 1599px) {
  .risk-relation-list {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
