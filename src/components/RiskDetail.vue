<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import BREAK from "@/BREAK";
import FeedbackLink from "@/components/FeedbackLink.vue";
import RiskDetailBody from "@/components/RiskDetailBody.vue";

import { ArrowLeft } from "@element-plus/icons-vue";

import { useDrawerWidth } from "@/composables/useDrawerWidth";
import { entityDetailHref } from "@/utils/entityRoute";
import { createRecoverableAsyncComponent } from "@/utils/chunkLoadRecovery";

const AvoidanceDetail = createRecoverableAsyncComponent(() => import("@/components/AvoidanceDetail.vue"), undefined, "RiskAvoidanceDetail");
const AttackToolDetail = createRecoverableAsyncComponent(() => import("@/components/AttackToolDetail.vue"), undefined, "RiskAttackToolDetail");
const ThreatActorDetail = createRecoverableAsyncComponent(() => import("@/components/ThreatActorDetail.vue"), undefined, "RiskThreatActorDetail");
const TermDetail = createRecoverableAsyncComponent(() => import("@/components/TermDetail.vue"), undefined, "RiskTermDetail");
// 自引用：Risk→Related Risk 开嵌套抽屉
const RiskDetail = createRecoverableAsyncComponent(() => import("@/components/RiskDetail.vue"), undefined, "RiskNestedRiskDetail");

const props = defineProps<{
  drawer: boolean;
  rKey: string;
}>();
defineEmits(["drawerClose"]);

const router = useRouter();
const { getDrawerWidth } = useDrawerWidth();

const risks = BREAK.risks;
const isRiskValid = computed(() => props.rKey && risks[props.rKey as keyof typeof risks]);

// 嵌套抽屉状态
const avoidanceDrawer = ref(false);
const avoidanceKey = ref("");
const attackToolDrawer = ref(false);
const attackToolKey = ref("");
const threatActorDrawer = ref(false);
const threatActorKey = ref("");
const termDrawer = ref(false);
const termKey = ref("");
const nestedRiskDrawer = ref(false);
const nestedRiskKey = ref("");

// RiskDetailBody 的导航回调 → 开嵌套抽屉
const onNavigateRisk = (key: string) => { nestedRiskKey.value = key; nestedRiskDrawer.value = true; };
const onNavigateAvoidance = (key: string) => { avoidanceKey.value = key; avoidanceDrawer.value = true; };
const onNavigateAttackTool = (key: string) => { attackToolKey.value = key; attackToolDrawer.value = true; };
const onNavigateThreatActor = (key: string) => { threatActorKey.value = key; threatActorDrawer.value = true; };
const onNavigateTerm = (key: string) => { termKey.value = key; termDrawer.value = true; };
// case 走新窗口（无 case 嵌套抽屉）
const onNavigateCase = (cKey: string) => {
  const href = entityDetailHref(router, cKey, "case");
  if (href) window.open(href, "_blank", "noopener,noreferrer");
};
</script>

<template>
  <el-drawer
    v-if="isRiskValid"
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
    v-on:drawer-close="avoidanceDrawer = false"
    :drawer="avoidanceDrawer"
    :aKey="avoidanceKey"
  />
  <AttackToolDetail
    v-if="attackToolDrawer"
    v-on:drawer-close="attackToolDrawer = false"
    :drawer="attackToolDrawer"
    :atKey="attackToolKey"
  />
  <ThreatActorDetail
    v-if="threatActorDrawer"
    v-on:drawer-close="threatActorDrawer = false"
    :drawer="threatActorDrawer"
    :taKey="threatActorKey"
  />
  <TermDetail
    v-if="termDrawer"
    v-on:drawer-close="termDrawer = false"
    :drawer="termDrawer"
    :tKey="termKey"
  />
  <RiskDetail
    v-if="nestedRiskDrawer"
    v-on:drawer-close="nestedRiskDrawer = false"
    :drawer="nestedRiskDrawer"
    :rKey="nestedRiskKey"
  />
</template>

<style src="./drawer-detail-shared.css" scoped></style>
