<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import BREAK from "@/BREAK";
import KnowledgeSplitView from "@/components/KnowledgeSplitView.vue";
import FeedbackLink from "@/components/FeedbackLink.vue";
import ReferenceList from "@/components/ReferenceList.vue";
import EntityLinkSection from "@/components/EntityLinkSection.vue";
import { getMessageStringArray } from "@/utils/i18nMessage";
import { formatRiskRelationNote } from "@/utils/relationNote";
import { useRelatedCases } from "@/composables/useRelatedCases";
import { useRelatedEntities } from "@/composables/useRelatedEntities";
import { useRelationGraph } from "@/composables/useRelationGraph";
import { useRiskRadarChart } from "@/composables/useRiskRadarChart";

const route = useRoute();
const { t, locale, messages } = useI18n();

const risks = Object.keys(BREAK.risks);
const selectedRiskKey = ref((route.params.rKey as string) || risks[0] || "");
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

// ── 风险分级雷达图 ──
const selectedAssessment = computed(() => selectedRisk.value?.riskAssessment);
// 可观测信号：英文 locale 下走 i18n 合并后的数组，中文走源数据
const observables = computed(() =>
  getMessageStringArray(localeMessages.value, `BREAK.risks.${selectedRiskKey.value}.riskAssessment.observables`)
);
// 选中风险的关键词（缓存 computed，避免模板 v-if + v-for 重复调用 getMessageStringArray）
const selectedRiskKeywords = computed(() =>
  getMessageStringArray(localeMessages.value, `BREAK.risks.${selectedRiskKey.value}.keywords`)
);
const priorityNote = computed(() =>
  selectedAssessment.value?.priorityNote
    ? t(`BREAK.risks.${selectedRiskKey.value}.riskAssessment.priorityNote`)
    : ""
);

const { radarChartRef } = useRiskRadarChart(selectedAssessment, locale, t);
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
    <article v-if="selectedRisk" class="detail-panel risk-detail-panel">
      <div class="detail-heading">
        <div>
          <div class="detail-id">{{ selectedRiskKey }}</div>
          <h2>{{ $t(`BREAK.risks.${selectedRiskKey}.title`) }}</h2>
        </div>
        <div class="detail-heading-actions">
          <FeedbackLink :entity-id="selectedRiskKey" :entity-title="$t(`BREAK.risks.${selectedRiskKey}.title`)" />
          <el-button type="primary" size="small" @click="openRelationGraph(selectedRiskKey)">
          {{ $t("openRelationGraph") }}
          </el-button>
        </div>
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
        <div v-if="selectedAssessment" class="risk-meta-card risk-meta-card--compact risk-meta-card--priority">
          <h3>{{ $t("riskPriority") }}</h3>
          <span class="knowledge-badge risk-priority-badge" :class="`risk-priority-${selectedAssessment.priority?.toLowerCase()}`">
            {{ selectedAssessment.priority }}
          </span>
          <p v-if="selectedAssessment.priorityOverride" class="priority-override-hint">{{ $t("riskPriorityOverridden") }}</p>
        </div>
        <div class="risk-meta-card risk-meta-card--compact">
          <h3>{{ $t("riskComplexity") }}</h3>
          <span class="knowledge-badge risk-complexity-badge" :class="`risk-${selectedRisk.complexity}`">
            {{ $t(`riskComplexityLevel.${selectedRisk.complexity}`) }}
          </span>
        </div>
        <div class="risk-meta-card risk-meta-card--impact">
          <h3>{{ $t("riskInfluence") }}</h3>
          <p>{{ $t(`BREAK.risks.${selectedRiskKey}.influence`) }}</p>
        </div>
      </section>
      <section v-if="selectedAssessment" class="detail-section">
        <h3>{{ $t("riskAssessmentDimensions") }}</h3>
        <div ref="radarChartRef" class="risk-radar-chart"></div>
      </section>
      <section v-if="observables.length" class="detail-section">
        <h3>{{ $t("riskObservables") }}</h3>
        <ul class="observables-list">
          <li v-for="(obs, i) in observables" :key="i">{{ obs }}</li>
        </ul>
      </section>
      <section v-if="priorityNote" class="detail-section">
        <h3>{{ $t("riskPriorityNote") }}</h3>
        <p>{{ priorityNote }}</p>
      </section>
      <section v-if="selectedRiskKeywords.length" class="detail-section">
        <h3>{{ $t("keywords") }}</h3>
        <div class="keywords">
          <span v-for="keyword in selectedRiskKeywords" :key="keyword" class="keyword-tag">
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
            :to="{ name: 'knowledgesRiskDetail', params: { rKey: relation.key } }"
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
        route-name="knowledgesAvoidanceList"
        detail-route-name="knowledgesAvoidanceDetail"
        param-key="aKey"
        anchor="avoidances"
      />
      <EntityLinkSection
        :keys="descriptionTools"
        title="attackTools"
        route-name="knowledgesAttackToolList"
        detail-route-name="knowledgesAttackToolDetail"
        param-key="atKey"
        anchor="attack-tools"
      />
      <EntityLinkSection
        :keys="riskThreatActors"
        title="threatActors"
        route-name="knowledgesThreatActorList"
        detail-route-name="knowledgesThreatActorDetail"
        param-key="taKey"
        anchor="threat-actors"
      />
      <EntityLinkSection
        :keys="relatedTerms"
        title="terms"
        route-name="knowledgesTermList"
        detail-route-name="knowledgesTermDetail"
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
        route-name="knowledgesCaseList"
        detail-route-name="knowledgesCaseDetail"
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
.complexity-filter {
  flex: 0 0 96px;
}

.risk-detail-panel {
  max-width: 1380px;
}
</style>
