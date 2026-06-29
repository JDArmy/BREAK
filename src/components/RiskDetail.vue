<script setup lang="ts">
import AsyncComponentError from "@/components/AsyncComponentError.vue";
import { defineAsyncComponent, ref, computed } from "vue";
import { useRouter } from "vue-router";
import BREAK from "@/BREAK";
import ReferenceList from "@/components/ReferenceList.vue";

import { ArrowLeft, TopRight } from "@element-plus/icons-vue";

import iconRelation from "./icons/iconRelation.vue";
import { useDrawerWidth } from "@/composables/useDrawerWidth";
import { entityDetailHref } from "@/utils/entityRoute";
import { getEntityEntry } from "@/BREAK/entityRegistry";

const AvoidanceDetail = defineAsyncComponent({ loader: () => import("@/components/AvoidanceDetail.vue"), errorComponent: AsyncComponentError });
const AttackToolDetail = defineAsyncComponent({ loader: () => import("@/components/AttackToolDetail.vue"), errorComponent: AsyncComponentError });
const ThreatActorDetail = defineAsyncComponent({ loader: () => import("@/components/ThreatActorDetail.vue"), errorComponent: AsyncComponentError });
const TermDetail = defineAsyncComponent({ loader: () => import("@/components/TermDetail.vue"), errorComponent: AsyncComponentError });

const props = defineProps<{
  drawer: boolean;
  rKey: string;
}>();
defineEmits(["drawerClose"]);

const router = useRouter();
const risks = BREAK.risks;
const avoidanceDrawer = ref(false);
const avoidanceKey = ref("");
const attackToolDrawer = ref(false);
const attackToolKey = ref("");
const threatActorDrawer = ref(false);
const threatActorKey = ref("");

const { getDrawerWidth } = useDrawerWidth();

// 全表遍历结果按当前 rKey 缓存，避免模板 v-if+v-for 重复扫描
const descriptionTools = computed(() => {
  const rKey = props.rKey;
  return Object.keys(BREAK.attackTools).filter((atKey) => {
    const at = BREAK.attackTools[atKey as keyof typeof BREAK.attackTools];
    return at.directCauseRisks.includes(rKey) || at.indirectSupportRisks.includes(rKey);
  });
});

const riskThreatActors = computed(() => {
  const rKey = props.rKey;
  return Object.keys(BREAK.threatActors).filter((taKey) => {
    const ta = BREAK.threatActors[taKey as keyof typeof BREAK.threatActors];
    return ta.directCauseRisks.includes(rKey) || ta.indirectSupportRisks.includes(rKey);
  });
});

const relatedTerms = computed(() => {
  const rKey = props.rKey;
  return Object.keys(BREAK.terms).filter((tKey) =>
    BREAK.terms[tKey].relatedRisks.includes(rKey)
  );
});

const relatedRiskRelations = computed(() => risks[props.rKey as keyof typeof risks]?.relatedRisks ?? []);

const termDrawer = ref(false);
const termKey = ref("");

const openRelationGraph = (rKey: string) => {
  const route = router.resolve({
    name: getEntityEntry("risk").relationPerspectiveRouteName,
    params: { entity: "risk", id: rKey },
  });
  window.open(route.href, "_blank", "noopener,noreferrer");
};

// 跳知识库详情页（新窗口）的 href
const detailHref = (rKey: string) => entityDetailHref(router, rKey, "risk") ?? "";

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
  >
    <template #header>
      <div class="drawer-header-with-back">
        <el-button text size="small" @click="$emit('drawerClose')" class="drawer-back-btn">
          <el-icon><ArrowLeft /></el-icon>
          {{ $t("back") }}
        </el-button>
        <span class="drawer-header-title">{{ $t('riskDetail') }}</span>
      </div>
    </template>
    <div class="desc">
      <strong>{{ $t("riskKey") }}:&nbsp;</strong>
      <a :href="detailHref(rKey)" target="_blank" rel="noopener" class="id-link">
        {{ rKey }}
        <el-icon class="external-link-icon" aria-hidden="true"><TopRight /></el-icon>
      </a>
      <button
        :title="$t('relationMap')"
        class="relation-map-icon"
        @click="openRelationGraph(rKey)"
      >
        <icon-relation width="14px" height="14px" />
      </button>
    </div>
    <div class="desc">
      <strong>{{ $t("riskTitle") }}:&nbsp;</strong>
      {{ $t(`BREAK.risks.${rKey}.title`) }}
    </div>
    <div class="desc">
      <strong>{{ $t("riskDefinition") }}:&nbsp;</strong>
      {{ $t(`BREAK.risks.${rKey}.definition`) }}
    </div>
    <div class="desc">
      <strong>{{ $t("riskDescription") }}:&nbsp;</strong>
      {{ $t(`BREAK.risks.${rKey}.description`) }}
    </div>
    <div class="desc">
      <strong>{{ $t("riskComplexity") }}:&nbsp;</strong>
      {{ $t(`riskComplexityLevel.${risks[rKey as keyof typeof risks].complexity}`) }}
    </div>
    <div class="desc">
      <strong>{{ $t("riskInfluence") }}:&nbsp;</strong>
      {{ $t(`BREAK.risks.${rKey}.influence`) }}
    </div>
    <div class="desc">
      <strong>{{ $t("riskAvoidances") }}:&nbsp;</strong>
      <div class="entity-links">
        <button
          v-for="aKey in risks[rKey as keyof typeof risks].avoidances"
          :key="aKey"
          class="entity-link"
          @click="avoidanceKey = aKey; avoidanceDrawer = true"
        >
          {{ aKey }}: {{ $t(`BREAK.avoidances.${aKey}.title`) }}
        </button>
      </div>
    </div>
    <div class="desc" v-if="relatedRiskRelations.length > 0">
      <strong>{{ $t("riskRelatedRisks") }}:&nbsp;</strong>
      <div class="entity-links">
        <a
          v-for="relation in relatedRiskRelations"
          :key="`${relation.key}-${relation.relation}`"
          class="entity-link"
          :href="detailHref(relation.key)"
          target="_blank"
          rel="noopener"
        >
          {{ $t(`riskRelationType.${relation.relation}`) }} ·
          {{ relation.key }}: {{ $t(`BREAK.risks.${relation.key}.title`) }}
          <el-icon class="external-link-icon" aria-hidden="true"><TopRight /></el-icon>
        </a>
      </div>
    </div>
    <div class="desc" v-if="relatedTerms.length > 0">
      <strong>{{ $t("terms") }}:&nbsp;</strong>
      <div class="entity-links">
        <button
          v-for="tKey in relatedTerms"
          :key="tKey"
          class="entity-link"
          @click="termKey = tKey; termDrawer = true"
        >
          {{ tKey }}: {{ $t(`BREAK.terms.${tKey}.title`) }}
        </button>
      </div>
    </div>
    <div class="desc" v-if="risks[rKey as keyof typeof risks].references?.length > 0">
      <strong>{{ $t("riskReference") }}:&nbsp;</strong>
      <ReferenceList type="risks" :entityKey="rKey" />
    </div>
    <div class="desc" v-if="descriptionTools.length > 0">
      <strong>{{ $t("attackTools") }}:&nbsp;</strong>
      <div class="entity-links">
        <button
          v-for="atKey in descriptionTools"
          :key="atKey"
          class="entity-link"
          @click="attackToolKey = atKey; attackToolDrawer = true"
        >
          {{ atKey }}: {{ $t(`BREAK.attackTools.${atKey}.title`) }}
        </button>
      </div>
    </div>
    <div class="desc" v-if="riskThreatActors.length > 0">
      <strong>{{ $t("threatActors") }}:&nbsp;</strong>
      <div class="entity-links">
        <button
          v-for="taKey in riskThreatActors"
          :key="taKey"
          class="entity-link"
          @click="threatActorKey = taKey; threatActorDrawer = true"
        >
          {{ taKey }}: {{ $t(`BREAK.threatActors.${taKey}.title`) }}
        </button>
      </div>
    </div>
    <!-- 关系图 -->
    <div class="desc">
      <strong>{{ $t("riskRelations") }}</strong>
      &nbsp;&nbsp;
      <el-button
        size="small"
        type="primary"
        plain
        @click="openRelationGraph(rKey)"
      >
        {{ $t("openRelationGraph") }}
      </el-button>
    </div>
    <div class="desc">
      <el-button type="primary" plain size="small" @click="openDetail(rKey)">
        {{ $t("viewDetail") }}
        <el-icon class="external-link-icon" aria-hidden="true"><TopRight /></el-icon>
      </el-button>
    </div>
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
</template>

<style src="./drawer-detail-shared.css" scoped></style>
