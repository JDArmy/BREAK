<script setup lang="ts">
import { ref, computed, type Ref } from "vue";
import BREAK from "@/BREAK";
import FeedbackLink from "@/components/FeedbackLink.vue";
import RiskDetailBody from "@/components/RiskDetailBody.vue";

import { ArrowLeft } from "@element-plus/icons-vue";

import { useDrawerWidth } from "@/composables/useDrawerWidth";
import { useEntityDrawerNavigation } from "@/composables/useEntityDrawerNavigation";
import { createRecoverableAsyncComponent } from "@/utils/chunkLoadRecovery";

const AvoidanceDetail = createRecoverableAsyncComponent(() => import("@/components/AvoidanceDetail.vue"), undefined, "RiskAvoidanceDetail");
const AttackToolDetail = createRecoverableAsyncComponent(() => import("@/components/AttackToolDetail.vue"), undefined, "RiskAttackToolDetail");
const ThreatActorDetail = createRecoverableAsyncComponent(() => import("@/components/ThreatActorDetail.vue"), undefined, "RiskThreatActorDetail");
const TermDetail = createRecoverableAsyncComponent(() => import("@/components/TermDetail.vue"), undefined, "RiskTermDetail");
const CaseDetail = createRecoverableAsyncComponent(() => import("@/components/CaseDetail.vue"), undefined, "RiskCaseDetail");
const RiskDetail = createRecoverableAsyncComponent(() => import("@/components/RiskDetail.vue"), undefined, "RiskNestedRiskDetail");

const props = defineProps<{
  drawer: boolean;
  rKey: string;
}>();
defineEmits(["drawerClose"]);

const { getDrawerWidth } = useDrawerWidth();
const { syncEntityDrawerUrl, restorePreviousUrl } = useEntityDrawerNavigation();

const risks = BREAK.risks;
const isRiskValid = computed(() => props.rKey && risks[props.rKey as keyof typeof risks]);

const avoidanceDrawer = ref(false);
const avoidanceKey = ref("");
const attackToolDrawer = ref(false);
const attackToolKey = ref("");
const threatActorDrawer = ref(false);
const threatActorKey = ref("");
const termDrawer = ref(false);
const termKey = ref("");
const caseDrawer = ref(false);
const caseKey = ref("");
const nestedRiskDrawer = ref(false);
const nestedRiskKey = ref("");

const openNestedDrawer = (type: Parameters<typeof syncEntityDrawerUrl>[0], key: string, keyRef: Ref<string>, drawerRef: Ref<boolean>) => {
  keyRef.value = key;
  drawerRef.value = true;
  syncEntityDrawerUrl(type, key);
};

const closeNestedDrawer = (drawerRef: Ref<boolean>) => {
  drawerRef.value = false;
  restorePreviousUrl();
};

const onNavigateRisk = (key: string) => openNestedDrawer("risk", key, nestedRiskKey, nestedRiskDrawer);
const onNavigateAvoidance = (key: string) => openNestedDrawer("avoidance", key, avoidanceKey, avoidanceDrawer);
const onNavigateAttackTool = (key: string) => openNestedDrawer("attackTool", key, attackToolKey, attackToolDrawer);
const onNavigateThreatActor = (key: string) => openNestedDrawer("threatActor", key, threatActorKey, threatActorDrawer);
const onNavigateTerm = (key: string) => openNestedDrawer("term", key, termKey, termDrawer);
const onNavigateCase = (key: string) => openNestedDrawer("case", key, caseKey, caseDrawer);
</script>

<template>
  <el-drawer
    v-if="isRiskValid"
    class="home-entity-detail-drawer"
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

    <RiskDetailBody
      :r-key="rKey"
      mode="drawer"
      @navigate-risk="onNavigateRisk"
      @navigate-avoidance="onNavigateAvoidance"
      @navigate-attack-tool="onNavigateAttackTool"
      @navigate-threat-actor="onNavigateThreatActor"
      @navigate-term="onNavigateTerm"
      @navigate-case="onNavigateCase"
    />
  </el-drawer>

  <AvoidanceDetail
    v-if="avoidanceDrawer"
    v-on:drawer-close="closeNestedDrawer(avoidanceDrawer)"
    :drawer="avoidanceDrawer"
    :aKey="avoidanceKey"
  />
  <AttackToolDetail
    v-if="attackToolDrawer"
    v-on:drawer-close="closeNestedDrawer(attackToolDrawer)"
    :drawer="attackToolDrawer"
    :atKey="attackToolKey"
  />
  <ThreatActorDetail
    v-if="threatActorDrawer"
    v-on:drawer-close="closeNestedDrawer(threatActorDrawer)"
    :drawer="threatActorDrawer"
    :taKey="threatActorKey"
  />
  <TermDetail
    v-if="termDrawer"
    v-on:drawer-close="closeNestedDrawer(termDrawer)"
    :drawer="termDrawer"
    :tKey="termKey"
  />
  <CaseDetail
    v-if="caseDrawer"
    v-on:drawer-close="closeNestedDrawer(caseDrawer)"
    :drawer="caseDrawer"
    :cKey="caseKey"
  />
  <RiskDetail
    v-if="nestedRiskDrawer"
    v-on:drawer-close="closeNestedDrawer(nestedRiskDrawer)"
    :drawer="nestedRiskDrawer"
    :rKey="nestedRiskKey"
  />
</template>

<style src="./drawer-detail-shared.css"></style>
