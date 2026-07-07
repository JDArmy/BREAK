<script setup lang="ts">
import { ref, computed, type Ref } from "vue";
import BREAK from "@/BREAK";
import FeedbackLink from "@/components/FeedbackLink.vue";
import AttackToolDetailBody from "@/components/AttackToolDetailBody.vue";

import { ArrowLeft } from "@element-plus/icons-vue";

import { useDrawerWidth } from "@/composables/useDrawerWidth";
import { useEntityDrawerNavigation } from "@/composables/useEntityDrawerNavigation";
import { createRecoverableAsyncComponent } from "@/utils/chunkLoadRecovery";

const RiskDetail = createRecoverableAsyncComponent(() => import("@/components/RiskDetail.vue"), undefined, "AttackToolRiskDetail");
const AvoidanceDetail = createRecoverableAsyncComponent(() => import("@/components/AvoidanceDetail.vue"), undefined, "AttackToolAvoidanceDetail");
const ThreatActorDetail = createRecoverableAsyncComponent(() => import("@/components/ThreatActorDetail.vue"), undefined, "AttackToolThreatActorDetail");
const TermDetail = createRecoverableAsyncComponent(() => import("@/components/TermDetail.vue"), undefined, "AttackToolTermDetail");
const CaseDetail = createRecoverableAsyncComponent(() => import("@/components/CaseDetail.vue"), undefined, "AttackToolCaseDetail");
const AttackToolDetail = createRecoverableAsyncComponent(() => import("@/components/AttackToolDetail.vue"), undefined, "AttackToolNestedAttackToolDetail");

const props = defineProps<{
  drawer: boolean;
  atKey: string;
}>();
defineEmits(["drawerClose"]);

const { getInnerDrawerWidth } = useDrawerWidth();
const { syncEntityDrawerUrl, restorePreviousUrl } = useEntityDrawerNavigation();

const isAttackToolValid = computed(() => props.atKey && BREAK.attackTools[props.atKey as keyof typeof BREAK.attackTools]);

const riskDrawer = ref(false);
const riskKey = ref("");
const avoidanceDrawer = ref(false);
const avoidanceKey = ref("");
const threatActorDrawer = ref(false);
const threatActorKey = ref("");
const termDrawer = ref(false);
const termKey = ref("");
const caseDrawer = ref(false);
const caseKey = ref("");
const nestedAttackToolDrawer = ref(false);
const nestedAttackToolKey = ref("");

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
const closeAvoidanceDrawer = () => closeNestedDrawer(avoidanceDrawer);
const closeThreatActorDrawer = () => closeNestedDrawer(threatActorDrawer);
const closeTermDrawer = () => closeNestedDrawer(termDrawer);
const closeCaseDrawer = () => closeNestedDrawer(caseDrawer);
const closeAttackToolDrawer = () => closeNestedDrawer(nestedAttackToolDrawer);

const onNavigateAttackTool = (key: string) => openNestedDrawer("attackTool", key, nestedAttackToolKey, nestedAttackToolDrawer);
const onNavigateAvoidance = (key: string) => openNestedDrawer("avoidance", key, avoidanceKey, avoidanceDrawer);
const onNavigateThreatActor = (key: string) => openNestedDrawer("threatActor", key, threatActorKey, threatActorDrawer);
const onNavigateTerm = (key: string) => openNestedDrawer("term", key, termKey, termDrawer);
const onNavigateRisk = (key: string) => openNestedDrawer("risk", key, riskKey, riskDrawer);
const onNavigateCase = (key: string) => openNestedDrawer("case", key, caseKey, caseDrawer);
</script>

<template>
  <!-- 攻击工具详情页 -->
  <el-drawer
    v-if="isAttackToolValid"
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
        <span class="drawer-header-title">{{ $t('attackTools') }}</span>
        <FeedbackLink :entity-id="atKey" :entity-title="$t(`BREAK.attackTools.${atKey}.title`)" style="margin-left: auto" />
      </div>
    </template>

    <AttackToolDetailBody
      :at-key="atKey"
      mode="drawer"
      @navigate-attack-tool="onNavigateAttackTool"
      @navigate-risk="onNavigateRisk"
      @navigate-avoidance="onNavigateAvoidance"
      @navigate-threat-actor="onNavigateThreatActor"
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
  <AvoidanceDetail
    v-if="avoidanceDrawer"
    v-on:drawer-close="closeAvoidanceDrawer"
    :drawer="avoidanceDrawer"
    :aKey="avoidanceKey"
  />
  <ThreatActorDetail
    v-if="threatActorDrawer"
    v-on:drawer-close="closeThreatActorDrawer"
    :drawer="threatActorDrawer"
    :taKey="threatActorKey"
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
  <AttackToolDetail
    v-if="nestedAttackToolDrawer"
    v-on:drawer-close="closeAttackToolDrawer"
    :drawer="nestedAttackToolDrawer"
    :atKey="nestedAttackToolKey"
  />
</template>

<style src="./drawer-detail-shared.css"></style>
