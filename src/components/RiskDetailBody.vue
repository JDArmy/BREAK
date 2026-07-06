<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import BREAK from "@/BREAK";
import ReferenceList from "@/components/ReferenceList.vue";
import FeedbackLink from "@/components/FeedbackLink.vue";
import EntityLinkSection from "@/components/EntityLinkSection.vue";

import { TopRight } from "@element-plus/icons-vue";

import iconRelation from "./icons/iconRelation.vue";
import { useRelatedEntities } from "@/composables/useRelatedEntities";
import { useRelatedCases } from "@/composables/useRelatedCases";
import { useRiskRadarChart } from "@/composables/useRiskRadarChart";
import { entityDetailHref } from "@/utils/entityRoute";
import { getEntityEntry } from "@/BREAK/entityRegistry";
import { getMessageStringArray } from "@/utils/i18nMessage";
import { formatRiskRelationNote } from "@/utils/relationNote";

/**
 * 风险详情 body（统一列表页 + 抽屉）。
 *
 * mode='list'：列表页纯文本 detail-id、FeedbackLink+文本关系图按钮、router-link relation-list、observer cases
 * mode='drawer'：抽屉 a detail-id+icon、icon关系图按钮+viewDetail、a@click relation-list、onMounted cases
 *
 * 导航回调通过 emit 传给调用方（抽屉开嵌套/新窗口，列表页不需要）。
 */
const props = defineProps<{
  rKey: string;
  mode: "list" | "drawer";
}>();

const emit = defineEmits<{
  /** 抽屉模式：点击关联风险（同类嵌套） */
  (e: "navigate-risk", key: string): void;
  /** 抽屉模式：点击关联手段 */
  (e: "navigate-avoidance", key: string): void;
  /** 抽屉模式：点击关联攻击工具 */
  (e: "navigate-attackTool", key: string): void;
  /** 抽屉模式：点击关联威胁行为者 */
  (e: "navigate-threatActor", key: string): void;
  /** 抽屉模式：点击关联术语 */
  (e: "navigate-term", key: string): void;
  /** 抽屉模式：点击关联案例（新窗口） */
  (e: "navigate-case", key: string): void;
}>();

const router = useRouter();
const { locale, messages, t } = useI18n();

const isDrawer = computed(() => props.mode === "drawer");

const selectedRisk = computed(() => BREAK.risks[props.rKey as keyof typeof BREAK.risks]);
const selectedAssessment = computed(() => selectedRisk.value?.riskAssessment);
const observables = computed(() =>
  getMessageStringArray(messages.value[locale.value] as Record<string, unknown>, `BREAK.risks.${props.rKey}.riskAssessment.observables`),
);
const keywords = computed(() =>
  getMessageStringArray(messages.value[locale.value] as Record<string, unknown>, `BREAK.risks.${props.rKey}.keywords`),
);
const priorityNote = computed(() =>
  selectedAssessment.value?.priorityNote
    ? t(`BREAK.risks.${props.rKey}.riskAssessment.priorityNote`)
    : "",
);
const relatedRiskRelations = computed(() => selectedRisk.value?.relatedRisks ?? []);
const getRiskRelationNote = (relation: NonNullable<typeof relatedRiskRelations.value>[number]) =>
  formatRiskRelationNote(relation, props.rKey, locale.value, t);

// 反查
const descriptionTools = useRelatedEntities(BREAK.attackTools, ["directCauseRisks", "indirectSupportRisks"], () => props.rKey);
const riskThreatActors = useRelatedEntities(BREAK.threatActors, ["directCauseRisks", "indirectSupportRisks"], () => props.rKey);
const relatedTerms = useRelatedEntities(BREAK.terms, "relatedRisks", () => props.rKey);

// 相关案例
const { relatedCases, ensureCases, cases, loaded, sectionRef: casesSectionRef } = useRelatedCases("risk", () => props.rKey);
// 抽屉模式：onMounted 立即加载；列表页：observer 懒加载（sectionRef 绑在 loading section 上）
if (isDrawer.value) {
  onMounted(() => { ensureCases(); });
}

// 雷达图
const { radarChartRef } = useRiskRadarChart(selectedAssessment, locale, t);

// 导航工具函数
const detailHref = (rKey: string) => entityDetailHref(router, rKey, "risk") ?? "";
const openRelationGraph = (rKey: string) => {
  const route = router.resolve({
    name: getEntityEntry("risk").relationPerspectiveRouteName,
    params: { entity: "risk", id: rKey },
  });
  window.open(route.href, "_blank", "noopener,noreferrer");
};
const openDetail = (rKey: string) => {
  window.open(detailHref(rKey), "_blank", "noopener,noreferrer");
};

// 抽屉模式的 onNavigate 回调（emit 给调用方）
const onNavigate = (event: "navigate-risk" | "navigate-avoidance" | "navigate-attackTool" | "navigate-threatActor" | "navigate-term" | "navigate-case") => (key: string) => {
  emit(event, key);
};
</script>

<template>
  <article :class="['detail-panel', { 'drawer-detail-panel': isDrawer, 'risk-detail-panel': !isDrawer }]">
    <div class="detail-heading">
      <div>
        <!-- list: 纯文本 / drawer: a 新窗口 + icon -->
        <div v-if="!isDrawer" class="detail-id">{{ rKey }}</div>
        <a v-else :href="detailHref(rKey)" target="_blank" rel="noopener" class="detail-id">
          {{ rKey }}
          <el-icon class="external-link-icon" aria-hidden="true"><TopRight /></el-icon>
        </a>
        <h2>{{ $t(`BREAK.risks.${rKey}.title`) }}</h2>
      </div>
      <div class="detail-heading-actions">
        <!-- list: FeedbackLink + 文本关系图按钮 -->
        <template v-if="!isDrawer">
          <FeedbackLink :entity-id="rKey" :entity-title="$t(`BREAK.risks.${rKey}.title`)" />
          <el-button type="primary" size="small" @click="openRelationGraph(rKey)">
            {{ $t("openRelationGraph") }}
          </el-button>
        </template>
        <!-- drawer: icon 关系图按钮 + viewDetail 按钮 -->
        <template v-else>
          <el-button type="default" size="small" :title="$t('relationMap')" :aria-label="$t('relationMap')" class="relation-map-icon" @click="openRelationGraph(rKey)">
            <el-icon><icon-relation width="14px" height="14px" /></el-icon>
          </el-button>
          <el-button type="primary" plain size="small" @click="openDetail(rKey)">
            {{ $t("viewDetail") }}
            <el-icon class="external-link-icon" aria-hidden="true"><TopRight /></el-icon>
          </el-button>
        </template>
      </div>
    </div>

    <section class="detail-section" data-detail-anchor="risks">
      <h3>{{ $t("riskDefinition") }}</h3>
      <p>{{ $t(`BREAK.risks.${rKey}.definition`) }}</p>
    </section>
    <section class="detail-section">
      <h3>{{ $t("riskDescription") }}</h3>
      <p>{{ $t(`BREAK.risks.${rKey}.description`) }}</p>
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
        <span class="knowledge-badge risk-complexity-badge" :class="`risk-${selectedRisk?.complexity}`">
          {{ $t(`riskComplexityLevel.${selectedRisk?.complexity}`) }}
        </span>
      </div>
      <div class="risk-meta-card risk-meta-card--impact">
        <h3>{{ $t("riskInfluence") }}</h3>
        <p>{{ $t(`BREAK.risks.${rKey}.influence`) }}</p>
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
    <section v-if="keywords.length" class="detail-section">
      <h3>{{ $t("keywords") }}</h3>
      <div class="keywords">
        <span v-for="keyword in keywords" :key="keyword" class="keyword-tag">{{ keyword }}</span>
      </div>
    </section>

    <!-- 关联风险 relation-list -->
    <section v-if="relatedRiskRelations.length" class="detail-section">
      <h3>{{ $t("riskRelatedRisks") }}</h3>
      <div class="risk-relation-list">
        <!-- list: router-link / drawer: a @click.prevent emit -->
        <template v-for="relation in relatedRiskRelations" :key="`${relation.key}-${relation.relation}`">
          <router-link
            v-if="!isDrawer"
            class="risk-relation-item"
            :to="{ name: 'knowledgesRiskDetail', params: { rKey: relation.key } }"
          >
            <span class="risk-relation-type">{{ $t(`riskRelationType.${relation.relation}`) }}</span>
            <span class="risk-relation-title">{{ relation.key }}: {{ $t(`BREAK.risks.${relation.key}.title`) }}</span>
            <span v-if="relation.note" class="risk-relation-note">{{ getRiskRelationNote(relation) }}</span>
          </router-link>
          <a
            v-else
            class="risk-relation-item"
            :href="detailHref(relation.key)"
            @click.prevent="$emit('navigate-risk', relation.key)"
          >
            <span class="risk-relation-type">{{ $t(`riskRelationType.${relation.relation}`) }}</span>
            <span class="risk-relation-title">{{ relation.key }}: {{ $t(`BREAK.risks.${relation.key}.title`) }}</span>
            <span v-if="relation.note" class="risk-relation-note">{{ getRiskRelationNote(relation) }}</span>
          </a>
        </template>
      </div>
    </section>

    <!-- 关联实体表格（统一用 EntityLinkSection，抽屉传 onNavigate） -->
    <EntityLinkSection
      :keys="selectedRisk?.avoidances ?? []"
      title="riskAvoidances"
      entity-type="avoidance"
      anchor="avoidances"
      :on-navigate="isDrawer ? onNavigate('navigate-avoidance') : undefined"
    />
    <EntityLinkSection
      :keys="descriptionTools"
      title="attackTools"
      entity-type="attackTool"
      anchor="attack-tools"
      :on-navigate="isDrawer ? onNavigate('navigate-attackTool') : undefined"
    />
    <EntityLinkSection
      :keys="riskThreatActors"
      title="threatActors"
      entity-type="threatActor"
      anchor="threat-actors"
      :on-navigate="isDrawer ? onNavigate('navigate-threatActor') : undefined"
    />
    <EntityLinkSection
      :keys="relatedTerms"
      title="terms"
      entity-type="term"
      anchor="terms"
      :on-navigate="isDrawer ? onNavigate('navigate-term') : undefined"
    />

    <!-- 相关案例 -->
    <section
      v-if="!loaded"
      ref="casesSectionRef"
      class="detail-section"
      data-detail-anchor="cases"
    >
      <h3>{{ $t("relatedCases") }}</h3>
      <div v-if="!loaded" class="entity-links">
        <span class="text-muted">{{ $t("loadingRelatedCases") }}</span>
        <!-- 列表页兜底：自动加载意外未触发时，可手动加载 -->
        <button v-if="!isDrawer" class="entity-link" @click="ensureCases()">{{ $t("loadRelatedCases") }}</button>
      </div>
    </section>
    <EntityLinkSection
      v-else
      :keys="relatedCases"
      title="relatedCases"
      entity-type="case"
      anchor="cases"
      :entity-records="cases"
      :on-navigate="isDrawer ? onNavigate('navigate-case') : undefined"
    />

    <section v-if="selectedRisk?.references?.length" class="detail-section" data-detail-anchor="references">
      <h3>{{ $t("riskReference") }}</h3>
      <ReferenceList type="risks" :entity-key="rKey" />
    </section>
    <section v-if="selectedRisk?.updated" class="detail-section">
      <h3>{{ $t("lastUpdated") }}</h3>
      <p class="text-muted">{{ selectedRisk.updated }}</p>
    </section>
  </article>
</template>
