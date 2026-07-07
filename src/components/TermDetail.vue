<script setup lang="ts">
import { ref, computed, type Ref } from "vue";
import BREAK from "@/BREAK";
import FeedbackLink from "@/components/FeedbackLink.vue";
import TermDetailBody from "@/components/TermDetailBody.vue";

import { ArrowLeft } from "@element-plus/icons-vue";

import { useDrawerWidth } from "@/composables/useDrawerWidth";
import { useEntityDrawerNavigation } from "@/composables/useEntityDrawerNavigation";
import { createRecoverableAsyncComponent } from "@/utils/chunkLoadRecovery";

const RiskDetail = createRecoverableAsyncComponent(() => import("@/components/RiskDetail.vue"), undefined, "TermRiskDetail");
const AvoidanceDetail = createRecoverableAsyncComponent(() => import("@/components/AvoidanceDetail.vue"), undefined, "TermAvoidanceDetail");
const AttackToolDetail = createRecoverableAsyncComponent(() => import("@/components/AttackToolDetail.vue"), undefined, "TermAttackToolDetail");
const ThreatActorDetail = createRecoverableAsyncComponent(() => import("@/components/ThreatActorDetail.vue"), undefined, "TermThreatActorDetail");

const props = defineProps<{
  drawer: boolean;
  tKey: string;
}>();
defineEmits(["drawerClose"]);

const { getInnerDrawerWidth } = useDrawerWidth();
const { syncEntityDrawerUrl, restorePreviousUrl } = useEntityDrawerNavigation();

const terms = BREAK.terms;
const isTermValid = computed(() => props.tKey && terms[props.tKey as keyof typeof terms]);

const riskDrawer = ref(false);
const riskKey = ref("");
const avoidanceDrawer = ref(false);
const avoidanceKey = ref("");
const attackToolDrawer = ref(false);
const attackToolKey = ref("");
const threatActorDrawer = ref(false);
const threatActorKey = ref("");

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
const closeAttackToolDrawer = () => closeNestedDrawer(attackToolDrawer);
const closeThreatActorDrawer = () => closeNestedDrawer(threatActorDrawer);

const onNavigateAvoidance = (key: string) => openNestedDrawer("avoidance", key, avoidanceKey, avoidanceDrawer);
const onNavigateAttackTool = (key: string) => openNestedDrawer("attackTool", key, attackToolKey, attackToolDrawer);
const onNavigateThreatActor = (key: string) => openNestedDrawer("threatActor", key, threatActorKey, threatActorDrawer);
const onNavigateRisk = (key: string) => openNestedDrawer("risk", key, riskKey, riskDrawer);
</script>

<template>
  <el-drawer
    v-if="isTermValid"
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
        <span class="drawer-header-title">{{ $t("termDetail") }}</span>
        <FeedbackLink :entity-id="tKey" :entity-title="$t(`BREAK.terms.${tKey}.title`)" style="margin-left: auto" />
      </div>
    </template>

    <TermDetailBody
      :t-key="tKey"
      mode="drawer"
      @navigate-avoidance="onNavigateAvoidance"
      @navigate-attack-tool="onNavigateAttackTool"
      @navigate-threat-actor="onNavigateThreatActor"
      @navigate-risk="onNavigateRisk"
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
  <AttackToolDetail
    v-if="attackToolDrawer"
    v-on:drawer-close="closeAttackToolDrawer"
    :drawer="attackToolDrawer"
    :atKey="attackToolKey"
  />
  <ThreatActorDetail
    v-if="threatActorDrawer"
    v-on:drawer-close="closeThreatActorDrawer"
    :drawer="threatActorDrawer"
    :taKey="threatActorKey"
  />
</template>

<style src="./drawer-detail-shared.css"></style>
