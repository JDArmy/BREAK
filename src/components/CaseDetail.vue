<script setup lang="ts">
import { computed, ref, type Ref } from "vue";
import { ArrowLeft } from "@element-plus/icons-vue";
import FeedbackLink from "@/components/FeedbackLink.vue";
import CaseDetailBody from "@/components/CaseDetailBody.vue";
import { useCases } from "@/composables/useCases";
import { useDrawerWidth } from "@/composables/useDrawerWidth";
import { useEntityDrawerNavigation } from "@/composables/useEntityDrawerNavigation";
import { createRecoverableAsyncComponent } from "@/utils/chunkLoadRecovery";

const RiskDetail = createRecoverableAsyncComponent(() => import("@/components/RiskDetail.vue"), undefined, "CaseRiskDetail");
const AttackToolDetail = createRecoverableAsyncComponent(() => import("@/components/AttackToolDetail.vue"), undefined, "CaseAttackToolDetail");
const ThreatActorDetail = createRecoverableAsyncComponent(() => import("@/components/ThreatActorDetail.vue"), undefined, "CaseThreatActorDetail");

const props = defineProps<{
  drawer: boolean;
  cKey: string;
}>();
defineEmits(["drawerClose"]);

const { cases } = useCases();
const { getInnerDrawerWidth } = useDrawerWidth();
const { syncEntityDrawerUrl, restorePreviousUrl } = useEntityDrawerNavigation();

const selectedCase = computed(() => cases.value[props.cKey]);
const isCaseValid = computed(() => Boolean(props.cKey && selectedCase.value));

const riskDrawer = ref(false);
const riskKey = ref("");
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
const closeAttackToolDrawer = () => closeNestedDrawer(attackToolDrawer);
const closeThreatActorDrawer = () => closeNestedDrawer(threatActorDrawer);

const onNavigateRisk = (key: string) => openNestedDrawer("risk", key, riskKey, riskDrawer);
const onNavigateAttackTool = (key: string) => openNestedDrawer("attackTool", key, attackToolKey, attackToolDrawer);
const onNavigateThreatActor = (key: string) => openNestedDrawer("threatActor", key, threatActorKey, threatActorDrawer);
</script>

<template>
  <el-drawer
    v-if="isCaseValid"
    class="home-entity-detail-drawer"
    :model-value="drawer"
    @closed="$emit('drawerClose')"
    direction="rtl"
    :append-to-body="true"
    :size="getInnerDrawerWidth()"
  >
    <template #header>
      <div class="drawer-header-with-back">
        <el-button text size="small" @click="$emit('drawerClose')" class="drawer-back-btn">
          <el-icon><ArrowLeft /></el-icon>
          {{ $t("back") }}
        </el-button>
        <span class="drawer-header-title">{{ $t("case") }}</span>
        <FeedbackLink
          :entity-id="cKey"
          :entity-title="selectedCase?.title ?? cKey"
          style="margin-left: auto"
        />
      </div>
    </template>

    <CaseDetailBody
      :c-key="cKey"
      mode="drawer"
      @navigate-risk="onNavigateRisk"
      @navigate-attack-tool="onNavigateAttackTool"
      @navigate-threat-actor="onNavigateThreatActor"
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
  <ThreatActorDetail
    v-if="threatActorDrawer"
    v-on:drawer-close="closeThreatActorDrawer"
    :drawer="threatActorDrawer"
    :taKey="threatActorKey"
  />
</template>

<style src="./drawer-detail-shared.css"></style>
