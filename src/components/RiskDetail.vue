<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import BREAK from "@/BREAK";
import ReferenceList from "@/components/ReferenceList.vue";
import FeedbackLink from "@/components/FeedbackLink.vue";
import DrawerEntityLinkSection from "@/components/DrawerEntityLinkSection.vue";

import { ArrowLeft, TopRight } from "@element-plus/icons-vue";

import iconRelation from "./icons/iconRelation.vue";
import { useDrawerWidth } from "@/composables/useDrawerWidth";
import { useRelatedEntities } from "@/composables/useRelatedEntities";
import { useRelatedCases } from "@/composables/useRelatedCases";
import { useRiskRadarChart } from "@/composables/useRiskRadarChart";
import { entityDetailHref } from "@/utils/entityRoute";
import { getEntityEntry } from "@/BREAK/entityRegistry";
import { getMessageStringArray } from "@/utils/i18nMessage";
import { formatRiskRelationNote } from "@/utils/relationNote";
import { createRecoverableAsyncComponent } from "@/utils/chunkLoadRecovery";

const AvoidanceDetail = createRecoverableAsyncComponent(() => import("@/components/AvoidanceDetail.vue"), undefined, "RiskAvoidanceDetail");
const AttackToolDetail = createRecoverableAsyncComponent(() => import("@/components/AttackToolDetail.vue"), undefined, "RiskAttackToolDetail");
const ThreatActorDetail = createRecoverableAsyncComponent(() => import("@/components/ThreatActorDetail.vue"), undefined, "RiskThreatActorDetail");
const TermDetail = createRecoverableAsyncComponent(() => import("@/components/TermDetail.vue"), undefined, "RiskTermDetail");
// 自引用：Risk→Related Risk 开嵌套抽屉（动态 import 惰性求值，不构成 module 循环依赖）
const RiskDetail = createRecoverableAsyncComponent(() => import("@/components/RiskDetail.vue"), undefined, "RiskNestedRiskDetail");

const props = defineProps<{
  drawer: boolean;
  rKey: string;
}>();
defineEmits(["drawerClose"]);

const router = useRouter();
const { locale, messages, t } = useI18n();
const risks = BREAK.risks;
const { getDrawerWidth } = useDrawerWidth();

const localeMessages = computed(() => messages.value[locale.value] as Record<string, unknown>);

const selectedRisk = computed(() => risks[props.rKey as keyof typeof risks]);
const selectedAssessment = computed(() => selectedRisk.value?.riskAssessment);
// 可观测信号：英文 locale 下走 i18n 合并后的数组，中文走源数据
const observables = computed(() =>
  getMessageStringArray(localeMessages.value, `BREAK.risks.${props.rKey}.riskAssessment.observables`),
);
// 关键词（缓存 computed，避免模板 v-if + v-for 重复调用 getMessageStringArray）
const keywords = computed(() =>
  getMessageStringArray(localeMessages.value, `BREAK.risks.${props.rKey}.keywords`),
);
const priorityNote = computed(() =>
  selectedAssessment.value?.priorityNote
    ? t(`BREAK.risks.${props.rKey}.riskAssessment.priorityNote`)
    : "",
);
const relatedRiskRelations = computed(() => selectedRisk.value?.relatedRisks ?? []);
const getRiskRelationNote = (relation: NonNullable<typeof relatedRiskRelations.value>[number]) =>
  formatRiskRelationNote(relation, props.rKey, locale.value, t);

// 反查：用 useRelatedEntities 统一工厂（与 RisksView 一致），避免手写全表 filter
const descriptionTools = useRelatedEntities(
  BREAK.attackTools,
  ["directCauseRisks", "indirectSupportRisks"],
  () => props.rKey,
);
const riskThreatActors = useRelatedEntities(
  BREAK.threatActors,
  ["directCauseRisks", "indirectSupportRisks"],
  () => props.rKey,
);
const relatedTerms = useRelatedEntities(
  BREAK.terms,
  "relatedRisks",
  () => props.rKey,
);

// 相关案例（懒加载）：挂载时触发，不靠 observer（抽屉内无 .knowledge-detail 滚动容器）
const { relatedCases, ensureCases, cases, loaded } = useRelatedCases("risk", () => props.rKey);
onMounted(() => {
  ensureCases();
});

// 风险分级雷达图（与 RisksView 共用 composable）
const { radarChartRef } = useRiskRadarChart(selectedAssessment, locale, t);

// 嵌套抽屉：avoidance/attackTool/threatActor/term 开嵌套抽屉
const avoidanceDrawer = ref(false);
const avoidanceKey = ref("");
const attackToolDrawer = ref(false);
const attackToolKey = ref("");
const threatActorDrawer = ref(false);
const threatActorKey = ref("");
const termDrawer = ref(false);
const termKey = ref("");
// 同类嵌套：Risk→Related Risk 开嵌套抽屉（不开新窗口）
const nestedRiskDrawer = ref(false);
const nestedRiskKey = ref("");

const openRelationGraph = (rKey: string) => {
  const route = router.resolve({
    name: getEntityEntry("risk").relationPerspectiveRouteName,
    params: { entity: "risk", id: rKey },
  });
  window.open(route.href, "_blank", "noopener,noreferrer");
};

// 跳知识库详情页（新窗口）的 href
const detailHref = (rKey: string) => entityDetailHref(router, rKey, "risk") ?? "";
// case 走新窗口（无 case 嵌套抽屉）
const openCaseInNewWindow = (cKey: string) => {
  const href = entityDetailHref(router, cKey, "case");
  if (href) window.open(href, "_blank", "noopener,noreferrer");
};
// 新窗口打开知识库详情页
const openDetail = (rKey: string) => {
  window.open(detailHref(rKey), "_blank", "noopener,noreferrer");
};
</script>

<template>
  <!-- 风险详情页 -->
  <el-drawer
    v-if="rKey && risks[rKey as keyof typeof risks]"
    :model-value="drawer"
    @closed="$emit('drawerClose')"
    direction="rtl"
    :size="getDrawerWidth()"
    :append-to-body="true"
  >
    <template #header>
      <div class="drawer-header-with-back">
        <el-button text size="small" @click="$emit('drawerClose')" class="drawer-back-btn">
          <el-icon><ArrowLeft /></el-icon>
          {{ $t("back") }}
        </el-button>
        <span class="drawer-header-title">{{ $t('riskDetail') }}</span>
        <FeedbackLink :entity-id="rKey" :entity-title="$t(`BREAK.risks.${rKey}.title`)" style="margin-left: auto" />
      </div>
    </template>
    <article class="detail-panel drawer-detail-panel">
      <div class="detail-heading">
        <div>
          <a :href="detailHref(rKey)" target="_blank" rel="noopener" class="detail-id">
            {{ rKey }}
            <el-icon class="external-link-icon" aria-hidden="true"><TopRight /></el-icon>
          </a>
          <h2>{{ $t(`BREAK.risks.${rKey}.title`) }}</h2>
        </div>
        <div class="detail-heading-actions">
          <el-button type="default" size="small" :title="$t('relationMap')" :aria-label="$t('relationMap')" class="relation-map-icon" @click="openRelationGraph(rKey)">
            <el-icon><icon-relation width="14px" height="14px" /></el-icon>
          </el-button>
          <el-button type="primary" plain size="small" @click="openDetail(rKey)">
            {{ $t("viewDetail") }}
            <el-icon class="external-link-icon" aria-hidden="true"><TopRight /></el-icon>
          </el-button>
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
      <section v-if="relatedRiskRelations.length" class="detail-section">
        <h3>{{ $t("riskRelatedRisks") }}</h3>
        <div class="risk-relation-list">
          <a
            v-for="relation in relatedRiskRelations"
            :key="`${relation.key}-${relation.relation}`"
            class="risk-relation-item"
            :href="detailHref(relation.key)"
            @click.prevent="nestedRiskKey = relation.key; nestedRiskDrawer = true"
          >
            <span class="risk-relation-type">{{ $t(`riskRelationType.${relation.relation}`) }}</span>
            <span class="risk-relation-title">
              {{ relation.key }}: {{ $t(`BREAK.risks.${relation.key}.title`) }}
            </span>
            <span v-if="relation.note" class="risk-relation-note">{{ getRiskRelationNote(relation) }}</span>
          </a>
        </div>
      </section>

      <DrawerEntityLinkSection
        v-if="descriptionTools.length"
        :keys="descriptionTools"
        title="attackTools"
        entity-type="attackTool"
        :on-navigate="(k) => { attackToolKey = k; attackToolDrawer = true; }"
      />
      <DrawerEntityLinkSection
        v-if="riskThreatActors.length"
        :keys="riskThreatActors"
        title="threatActors"
        entity-type="threatActor"
        :on-navigate="(k) => { threatActorKey = k; threatActorDrawer = true; }"
      />
      <DrawerEntityLinkSection
        v-if="selectedRisk?.avoidances?.length"
        :keys="selectedRisk.avoidances"
        title="riskAvoidances"
        entity-type="avoidance"
        :on-navigate="(k) => { avoidanceKey = k; avoidanceDrawer = true; }"
      />
      <DrawerEntityLinkSection
        v-if="relatedTerms.length"
        :keys="relatedTerms"
        title="terms"
        entity-type="term"
        :on-navigate="(k) => { termKey = k; termDrawer = true; }"
      />

      <section v-if="!loaded" class="detail-section" data-detail-anchor="cases">
        <h3>{{ $t("relatedCases") }}</h3>
        <span class="text-muted">{{ $t("loadingRelatedCases") }}</span>
      </section>
      <DrawerEntityLinkSection
        v-else
        :keys="relatedCases"
        title="relatedCases"
        entity-type="case"
        :entity-records="cases"
        :on-navigate="openCaseInNewWindow"
      />

      <section v-if="selectedRisk?.references?.length > 0" class="detail-section" data-detail-anchor="references">
        <h3>{{ $t("riskReference") }}</h3>
        <ReferenceList type="risks" :entityKey="rKey" />
      </section>
      <section v-if="selectedRisk?.updated" class="detail-section">
        <h3>{{ $t("lastUpdated") }}</h3>
        <p class="text-muted">{{ selectedRisk.updated }}</p>
      </section>
    </article>
  </el-drawer>

  <!-- 手段详情页 -->
  <AvoidanceDetail
    v-if="avoidanceDrawer"
    v-on:drawer-close="avoidanceDrawer = false"
    :drawer="avoidanceDrawer"
    :aKey="avoidanceKey"
  />

  <!-- 攻击工具详情页 -->
  <AttackToolDetail
    v-if="attackToolDrawer"
    v-on:drawer-close="attackToolDrawer = false"
    :drawer="attackToolDrawer"
    :atKey="attackToolKey"
  />

  <!-- 威胁行为者详情页 -->
  <ThreatActorDetail
    v-if="threatActorDrawer"
    v-on:drawer-close="threatActorDrawer = false"
    :drawer="threatActorDrawer"
    :taKey="threatActorKey"
  />

  <!-- 术语详情页 -->
  <TermDetail
    v-if="termDrawer"
    v-on:drawer-close="termDrawer = false"
    :drawer="termDrawer"
    :tKey="termKey"
  />

  <!-- 同类嵌套：关联风险开嵌套抽屉 -->
  <RiskDetail
    v-if="nestedRiskDrawer"
    v-on:drawer-close="nestedRiskDrawer = false"
    :drawer="nestedRiskDrawer"
    :rKey="nestedRiskKey"
  />
</template>

<style src="./drawer-detail-shared.css" scoped></style>
