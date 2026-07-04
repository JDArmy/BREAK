<script lang="ts" setup>
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import type { ECharts } from "echarts/core";
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
import { loadRiskRadarECharts } from "@/views/relation/relationECharts";

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
const radarChartRef = ref<HTMLElement | null>(null);
let radarChart: ECharts | null = null;

const RISK_DIMENSIONS = [
  "likelihood",
  "businessLoss",
  "attackCost",
  "detectionDifficulty",
  "defenseMaturity",
] as const;
const SEVERITY_VALUE: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };

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

async function renderRadar() {
  const a = selectedAssessment.value;
  if (!a || !radarChartRef.value) return;
  const initFn = await loadRiskRadarECharts();
  if (!radarChartRef.value) return; // 切换期间可能已卸载
  if (!radarChart) {
    radarChart = initFn(radarChartRef.value);
  }
  // echarts canvas 不支持 CSS 变量，从根元素读取实际颜色值
  const styles = getComputedStyle(document.documentElement);
  const textColor = styles.getPropertyValue("--break-text-secondary").trim() || "#666";
  const primaryColor = styles.getPropertyValue("--break-primary").trim() || "#409eff";
  radarChart.setOption({
    radar: {
      indicator: RISK_DIMENSIONS.map((dim) => ({ name: t(`riskDim.${dim}`), max: 4 })),
      radius: "60%",
      center: ["50%", "52%"],
      axisName: {
        color: textColor,
        fontSize: 12,
        fontWeight: 600,
        padding: [3, 5],
      },
      splitArea: { areaStyle: { color: ["var(--break-bg-secondary)", "transparent"] } },
    },
    series: [
      {
        type: "radar",
        data: [
          {
            value: RISK_DIMENSIONS.map((dim) => SEVERITY_VALUE[a[dim]] ?? 0),
            name: t("riskAssessmentDimensions"),
            areaStyle: { opacity: 0.2 },
            lineStyle: { width: 2 },
            label: {
              show: true,
              color: primaryColor,
              fontSize: 11,
              fontWeight: 700,
              formatter: (params: { value: number }) => params.value,
            },
          },
        ],
      },
    ],
  });
}

function disposeRadar() {
  if (radarChart) {
    radarChart.dispose();
    radarChart = null;
  }
}

watch(
  [selectedRiskKey, () => locale.value],
  () => {
    nextTick(() => {
      if (selectedAssessment.value) {
        renderRadar();
      } else {
        disposeRadar();
      }
    });
  },
  { immediate: true }
);

onMounted(() => {
  nextTick(() => selectedAssessment.value && renderRadar());
});
onBeforeUnmount(disposeRadar);
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

.risk-priority-badge {
  display: inline-block;
  width: fit-content;
  padding: 2px 12px;
  border-radius: 999px;
  font-size: 0.95rem;
  font-weight: 700;
  border: 1px solid var(--break-border);
}

.risk-priority-badge.risk-priority-p0 {
  background: var(--break-badge-risk-priority-p0-bg);
  border-color: var(--break-badge-risk-priority-p0-border);
  color: var(--break-badge-risk-priority-p0-text);
}
.risk-priority-badge.risk-priority-p1 {
  background: var(--break-badge-risk-priority-p1-bg);
  border-color: var(--break-badge-risk-priority-p1-border);
  color: var(--break-badge-risk-priority-p1-text);
}
.risk-priority-badge.risk-priority-p2 {
  background: var(--break-badge-risk-priority-p2-bg);
  border-color: var(--break-badge-risk-priority-p2-border);
  color: var(--break-badge-risk-priority-p2-text);
}
.risk-priority-badge.risk-priority-p3 {
  background: var(--break-badge-risk-priority-p3-bg);
  border-color: var(--break-badge-risk-priority-p3-border);
  color: var(--break-badge-risk-priority-p3-text);
}

.risk-complexity-badge {
  display: inline-block;
  width: fit-content;
  padding: 2px 12px;
  border-radius: 999px;
  font-size: 0.95rem;
  font-weight: 700;
  border: 1px solid var(--break-border);
}

.risk-complexity-badge.risk-basic {
  background: var(--break-badge-risk-basic-bg);
  border-color: var(--break-badge-risk-basic-border);
  color: var(--break-badge-risk-basic-text);
}
.risk-complexity-badge.risk-intermediate {
  background: var(--break-badge-risk-intermediate-bg);
  border-color: var(--break-badge-risk-intermediate-border);
  color: var(--break-badge-risk-intermediate-text);
}
.risk-complexity-badge.risk-advanced {
  background: var(--break-badge-risk-advanced-bg);
  border-color: var(--break-badge-risk-advanced-border);
  color: var(--break-badge-risk-advanced-text);
}

.priority-override-hint {
  margin-top: 6px;
  font-size: 0.78rem;
  color: var(--break-text-secondary);
}

.risk-radar-chart {
  width: 100%;
  max-width: 420px;
  height: 300px;
  margin: 0 auto;
}

.observables-list {
  margin: 0;
  padding-left: 20px;
  line-height: 1.7;
}

.observables-list li {
  margin-bottom: 4px;
}

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
  grid-template-columns: minmax(140px, 1fr) minmax(140px, 1fr) minmax(0, 2fr);
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

.risk-meta-card--impact {
  border-left: 3px solid var(--break-border);
}

/* 无优先级卡片时（未回填 assessment），影响卡片跨剩余列占满 */
.risk-meta-grid:not(:has(.risk-meta-card--priority)) > .risk-meta-card--impact {
  grid-column: 2 / -1;
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
