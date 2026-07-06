<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import BREAK from "@/BREAK";
import FeedbackLink from "@/components/FeedbackLink.vue";
import ThreatActorDetailBody from "@/components/ThreatActorDetailBody.vue";

import { ArrowLeft } from "@element-plus/icons-vue";

import { useDrawerWidth } from "@/composables/useDrawerWidth";
import { entityDetailHref } from "@/utils/entityRoute";
import { createRecoverableAsyncComponent } from "@/utils/chunkLoadRecovery";

const AttackToolDetail = createRecoverableAsyncComponent(() => import("@/components/AttackToolDetail.vue"), undefined, "ThreatActorAttackToolDetail");
const TermDetail = createRecoverableAsyncComponent(() => import("@/components/TermDetail.vue"), undefined, "ThreatActorTermDetail");
// 自引用：ThreatActor→Related ThreatActor 开嵌套抽屉
const ThreatActorDetail = createRecoverableAsyncComponent(() => import("@/components/ThreatActorDetail.vue"), undefined, "ThreatActorNestedThreatActorDetail");

const props = defineProps<{
  drawer: boolean;
  taKey: string;
}>();
defineEmits(["drawerClose"]);

const router = useRouter();
const { getInnerDrawerWidth } = useDrawerWidth();

const isThreatActorValid = computed(() => props.taKey && BREAK.threatActors[props.taKey as keyof typeof BREAK.threatActors]);

// 嵌套抽屉：attackTool/term/同类 threatActor 开嵌套抽屉；risk/case 走新窗口
const attackToolDrawer = ref(false);
const attackToolKey = ref("");
const termDrawer = ref(false);
const termKey = ref("");
// 同类嵌套：ThreatActor→Related ThreatActor 开嵌套抽屉
const nestedThreatActorDrawer = ref(false);
const nestedThreatActorKey = ref("");

// ThreatActorDetailBody 的导航回调 → 开嵌套抽屉/新窗口
const onNavigateThreatActor = (key: string) => { nestedThreatActorKey.value = key; nestedThreatActorDrawer.value = true; };
const onNavigateAttackTool = (key: string) => { attackToolKey.value = key; attackToolDrawer.value = true; };
const onNavigateTerm = (key: string) => { termKey.value = key; termDrawer.value = true; };
// risk 走新窗口（避免从 ThreatActor 嵌套回 Risk 主抽屉）
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
  <!-- 威胁行为者详情页 -->
  <el-drawer
    v-if="isThreatActorValid"
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

  <!-- 攻击工具详情页 -->
  <AttackToolDetail
    v-if="attackToolDrawer"
    v-on:drawer-close="attackToolDrawer = false"
    :drawer="attackToolDrawer"
    :atKey="attackToolKey"
  />
  <!-- 术语详情页 -->
  <TermDetail
    v-if="termDrawer"
    v-on:drawer-close="termDrawer = false"
    :drawer="termDrawer"
    :tKey="termKey"
  />
  <!-- 同类嵌套：关联行为者开嵌套抽屉 -->
  <ThreatActorDetail
    v-if="nestedThreatActorDrawer"
    v-on:drawer-close="nestedThreatActorDrawer = false"
    :drawer="nestedThreatActorDrawer"
    :taKey="nestedThreatActorKey"
  />
</template>

<style src="./drawer-detail-shared.css" scoped></style>
