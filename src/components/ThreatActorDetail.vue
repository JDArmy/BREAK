<script setup lang="ts">
import { ref, computed, type Ref } from "vue";
import BREAK from "@/BREAK";
import FeedbackLink from "@/components/FeedbackLink.vue";
import ThreatActorDetailBody from "@/components/ThreatActorDetailBody.vue";

import { ArrowLeft } from "@element-plus/icons-vue";

import { useDrawerWidth } from "@/composables/useDrawerWidth";
import { useEntityDrawerNavigation } from "@/composables/useEntityDrawerNavigation";
import { createRecoverableAsyncComponent } from "@/utils/chunkLoadRecovery";

const RiskDetail = createRecoverableAsyncComponent(() => import("@/components/RiskDetail.vue"), undefined, "ThreatActorRiskDetail");
const AttackToolDetail = createRecoverableAsyncComponent(() => import("@/components/AttackToolDetail.vue"), undefined, "ThreatActorAttackToolDetail");
const TermDetail = createRecoverableAsyncComponent(() => import("@/components/TermDetail.vue"), undefined, "ThreatActorTermDetail");
const CaseDetail = createRecoverableAsyncComponent(() => import("@/components/CaseDetail.vue"), undefined, "ThreatActorCaseDetail");
const ThreatActorDetail = createRecoverableAsyncComponent(() => import("@/components/ThreatActorDetail.vue"), undefined, "ThreatActorNestedThreatActorDetail");

const props = defineProps<{
  drawer: boolean;
  taKey: string;
}>();
defineEmits(["drawerClose"]);

const { getInnerDrawerWidth } = useDrawerWidth();
const { syncEntityDrawerUrl, restorePreviousUrl } = useEntityDrawerNavigation();

const isThreatActorValid = computed(() => props.taKey && BREAK.threatActors[props.taKey as keyof typeof BREAK.threatActors]);

const riskDrawer = ref(false);
const riskKey = ref("");
const attackToolDrawer = ref(false);
const attackToolKey = ref("");
const termDrawer = ref(false);
const termKey = ref("");
const caseDrawer = ref(false);
const caseKey = ref("");
const nestedThreatActorDrawer = ref(false);
const nestedThreatActorKey = ref("");

const openNestedDrawer = (type: Parameters<typeof syncEntityDrawerUrl>[0], key: string, keyRef: Ref<string>, drawerRef: Ref<boolean>) => {
  keyRef.value = key;
  drawerRef.value = true;
  syncEntityDrawerUrl(type, key);
};

const closeNestedDrawer = (drawerRef: Ref<boolean>) => {
  drawerRef.value = false;
  restorePreviousUrl();
};

const closeRiskDrawer = () => closeNestedDrawer(riskDrawer);
const closeAttackToolDrawer = () => closeNestedDrawer(attackToolDrawer);
const closeTermDrawer = () => closeNestedDrawer(termDrawer);
const closeCaseDrawer = () => closeNestedDrawer(caseDrawer);
const closeThreatActorDrawer = () => closeNestedDrawer(nestedThreatActorDrawer);

const onNavigateThreatActor = (key: string) => openNestedDrawer("threatActor", key, nestedThreatActorKey, nestedThreatActorDrawer);
const onNavigateAttackTool = (key: string) => openNestedDrawer("attackTool", key, attackToolKey, attackToolDrawer);
const onNavigateTerm = (key: string) => openNestedDrawer("term", key, termKey, termDrawer);
const onNavigateRisk = (key: string) => openNestedDrawer("risk", key, riskKey, riskDrawer);
const onNavigateCase = (key: string) => openNestedDrawer("case", key, caseKey, caseDrawer);
</script>

<template>
  <!-- 威胁行为者详情页 -->
  <el-drawer
    v-if="isThreatActorValid"
    class="home-entity-detail-drawer"
    :model-value="drawer"
    @closed="$emit('drawerClose')"
    :append-to-body="true"
    :size="getInnerDrawerWidth()"
  >
    <template #header>
      <div class="drawer-header-with-back">
        <el-button text size="small" @click="$emit('drawerClose')" class="drawer-back-btn">
          <el-icon><ArrowLeft /></el-icon>
          {{ $t("back") }}
        </el-button>
        <span class="drawer-header-title">{{ $t('threatActors') }}</span>
        <FeedbackLink :entity-id="taKey" :entity-title="$t(`BREAK.threatActors.${taKey}.title`)" style="margin-left: auto" />
      </div>
    </template>

    <ThreatActorDetailBody
      :ta-key="taKey"
      mode="drawer"
      @navigate-threatActor="onNavigateThreatActor"
      @navigate-risk="onNavigateRisk"
      @navigate-attackTool="onNavigateAttackTool"
      @navigate-term="onNavigateTerm"
      @navigate-case="onNavigateCase"
    />
  </el-drawer>

  <RiskDetail
    v-if="riskDrawer"
    v-on:drawer-close="closeRiskDrawer"
    :drawer="riskDrawer"
    :rKey="riskKey"
  />
  <AttackToolDetail
    v-if="attackToolDrawer"
    v-on:drawer-close="closeAttackToolDrawer"
    :drawer="attackToolDrawer"
    :atKey="attackToolKey"
  />
  <TermDetail
    v-if="termDrawer"
    v-on:drawer-close="closeTermDrawer"
    :drawer="termDrawer"
    :tKey="termKey"
  />
  <CaseDetail
    v-if="caseDrawer"
    v-on:drawer-close="closeCaseDrawer"
    :drawer="caseDrawer"
    :cKey="caseKey"
  />
  <ThreatActorDetail
    v-if="nestedThreatActorDrawer"
    v-on:drawer-close="closeThreatActorDrawer"
    :drawer="nestedThreatActorDrawer"
    :taKey="nestedThreatActorKey"
  />
</template>

<style src="./drawer-detail-shared.css"></style>
