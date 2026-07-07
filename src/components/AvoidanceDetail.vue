<script setup lang="ts">
import { ref, computed, type Ref } from "vue";
import BREAK from "@/BREAK";
import FeedbackLink from "@/components/FeedbackLink.vue";
import AvoidanceDetailBody from "@/components/AvoidanceDetailBody.vue";

import { ArrowLeft } from "@element-plus/icons-vue";

import { useDrawerWidth } from "@/composables/useDrawerWidth";
import { useEntityDrawerNavigation } from "@/composables/useEntityDrawerNavigation";
import { createRecoverableAsyncComponent } from "@/utils/chunkLoadRecovery";

const RiskDetail = createRecoverableAsyncComponent(() => import("@/components/RiskDetail.vue"), undefined, "AvoidanceRiskDetail");
const AttackToolDetail = createRecoverableAsyncComponent(() => import("@/components/AttackToolDetail.vue"), undefined, "AvoidanceAttackToolDetail");
const TermDetail = createRecoverableAsyncComponent(() => import("@/components/TermDetail.vue"), undefined, "AvoidanceTermDetail");
const AvoidanceDetail = createRecoverableAsyncComponent(() => import("@/components/AvoidanceDetail.vue"), undefined, "AvoidanceNestedAvoidanceDetail");

const props = defineProps<{
  drawer: boolean;
  aKey: string;
}>();
defineEmits(["drawerClose"]);

const { getInnerDrawerWidth } = useDrawerWidth();
const { syncEntityDrawerUrl, restorePreviousUrl } = useEntityDrawerNavigation();

const isAvoidanceValid = computed(() => props.aKey && BREAK.avoidances[props.aKey as keyof typeof BREAK.avoidances]);

const riskDrawer = ref(false);
const riskKey = ref("");
const attackToolDrawer = ref(false);
const attackToolKey = ref("");
const termDrawer = ref(false);
const termKey = ref("");
const nestedAvoidanceDrawer = ref(false);
const nestedAvoidanceKey = ref("");

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
const closeAvoidanceDrawer = () => closeNestedDrawer(nestedAvoidanceDrawer);

const onNavigateAvoidance = (key: string) => openNestedDrawer("avoidance", key, nestedAvoidanceKey, nestedAvoidanceDrawer);
const onNavigateAttackTool = (key: string) => openNestedDrawer("attackTool", key, attackToolKey, attackToolDrawer);
const onNavigateTerm = (key: string) => openNestedDrawer("term", key, termKey, termDrawer);
const onNavigateRisk = (key: string) => openNestedDrawer("risk", key, riskKey, riskDrawer);
</script>

<template>
  <!-- 手段详情页 -->
  <el-drawer
    v-if="isAvoidanceValid"
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
        <span class="drawer-header-title">{{ $t('avoidance') }}</span>
        <FeedbackLink :entity-id="aKey" :entity-title="$t(`BREAK.avoidances.${aKey}.title`)" style="margin-left: auto" />
      </div>
    </template>

    <AvoidanceDetailBody
      :a-key="aKey"
      mode="drawer"
      @navigate-avoidance="onNavigateAvoidance"
      @navigate-risk="onNavigateRisk"
      @navigate-attack-tool="onNavigateAttackTool"
      @navigate-term="onNavigateTerm"
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
  <AvoidanceDetail
    v-if="nestedAvoidanceDrawer"
    v-on:drawer-close="closeAvoidanceDrawer"
    :drawer="nestedAvoidanceDrawer"
    :aKey="nestedAvoidanceKey"
  />
</template>

<style src="./drawer-detail-shared.css"></style>
