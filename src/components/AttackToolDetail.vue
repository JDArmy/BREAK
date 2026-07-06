<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import BREAK from "@/BREAK";
import FeedbackLink from "@/components/FeedbackLink.vue";
import AttackToolDetailBody from "@/components/AttackToolDetailBody.vue";

import { ArrowLeft } from "@element-plus/icons-vue";

import { useDrawerWidth } from "@/composables/useDrawerWidth";
import { entityDetailHref } from "@/utils/entityRoute";
import { createRecoverableAsyncComponent } from "@/utils/chunkLoadRecovery";

const AvoidanceDetail = createRecoverableAsyncComponent(() => import("@/components/AvoidanceDetail.vue"), undefined, "AttackToolAvoidanceDetail");
const ThreatActorDetail = createRecoverableAsyncComponent(() => import("@/components/ThreatActorDetail.vue"), undefined, "AttackToolThreatActorDetail");
const TermDetail = createRecoverableAsyncComponent(() => import("@/components/TermDetail.vue"), undefined, "AttackToolTermDetail");
// 自引用：AttackTool→Related AttackTool 开嵌套抽屉
const AttackToolDetail = createRecoverableAsyncComponent(() => import("@/components/AttackToolDetail.vue"), undefined, "AttackToolNestedAttackToolDetail");

const props = defineProps<{
  drawer: boolean;
  atKey: string;
}>();
defineEmits(["drawerClose"]);

const router = useRouter();
const { getInnerDrawerWidth } = useDrawerWidth();

const isAttackToolValid = computed(() => props.atKey && BREAK.attackTools[props.atKey as keyof typeof BREAK.attackTools]);

// 嵌套抽屉：avoidance/threatActor/term/同类 attackTool 开嵌套抽屉；risk/case 走新窗口
const avoidanceDrawer = ref(false);
const avoidanceKey = ref("");
const threatActorDrawer = ref(false);
const threatActorKey = ref("");
const termDrawer = ref(false);
const termKey = ref("");
// 同类嵌套：AttackTool→Related AttackTool 开嵌套抽屉
const nestedAttackToolDrawer = ref(false);
const nestedAttackToolKey = ref("");

// AttackToolDetailBody 的导航回调 → 开嵌套抽屉/新窗口
const onNavigateAttackTool = (key: string) => { nestedAttackToolKey.value = key; nestedAttackToolDrawer.value = true; };
const onNavigateAvoidance = (key: string) => { avoidanceKey.value = key; avoidanceDrawer.value = true; };
const onNavigateThreatActor = (key: string) => { threatActorKey.value = key; threatActorDrawer.value = true; };
const onNavigateTerm = (key: string) => { termKey.value = key; termDrawer.value = true; };
// risk 走新窗口（避免从 AttackTool 嵌套回 Risk 主抽屉）
const onNavigateRisk = (rKey: string) => {
  const href = entityDetailHref(router, rKey, "risk");
  if (href) window.open(href, "_blank", "noopener,noreferrer");
};
// case 走新窗口（无 case 嵌套抽屉）
const onNavigateCase = (cKey: string) => {
  const href = entityDetailHref(router, cKey, "case");
  if (href) window.open(href, "_blank", "noopener,noreferrer");
};
</script>

<template>
  <!-- 攻击工具详情页 -->
  <el-drawer
    v-if="isAttackToolValid"
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

  <!-- 手段详情页 -->
  <AvoidanceDetail
    v-if="avoidanceDrawer"
    v-on:drawer-close="avoidanceDrawer = false"
    :drawer="avoidanceDrawer"
    :aKey="avoidanceKey"
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
  <!-- 同类嵌套：关联攻击工具开嵌套抽屉 -->
  <AttackToolDetail
    v-if="nestedAttackToolDrawer"
    v-on:drawer-close="nestedAttackToolDrawer = false"
    :drawer="nestedAttackToolDrawer"
    :atKey="nestedAttackToolKey"
  />
</template>

<style src="./drawer-detail-shared.css"></style>
