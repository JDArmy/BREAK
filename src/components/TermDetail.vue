<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import BREAK from "@/BREAK";
import FeedbackLink from "@/components/FeedbackLink.vue";
import TermDetailBody from "@/components/TermDetailBody.vue";

import { ArrowLeft } from "@element-plus/icons-vue";

import { useDrawerWidth } from "@/composables/useDrawerWidth";
import { entityDetailHref } from "@/utils/entityRoute";
import { createRecoverableAsyncComponent } from "@/utils/chunkLoadRecovery";

const AvoidanceDetail = createRecoverableAsyncComponent(() => import("@/components/AvoidanceDetail.vue"), undefined, "TermAvoidanceDetail");
const AttackToolDetail = createRecoverableAsyncComponent(() => import("@/components/AttackToolDetail.vue"), undefined, "TermAttackToolDetail");
const ThreatActorDetail = createRecoverableAsyncComponent(() => import("@/components/ThreatActorDetail.vue"), undefined, "TermThreatActorDetail");

const props = defineProps<{
  drawer: boolean;
  tKey: string;
}>();
defineEmits(["drawerClose"]);

const router = useRouter();
const { getInnerDrawerWidth } = useDrawerWidth();

const terms = BREAK.terms;
const isTermValid = computed(() => props.tKey && terms[props.tKey as keyof typeof terms]);

// 嵌套抽屉：avoidance/attackTool/threatActor 开嵌套抽屉；risk 走新窗口（避免从 Term 嵌套回 Risk 主抽屉）
const avoidanceDrawer = ref(false);
const avoidanceKey = ref("");
const attackToolDrawer = ref(false);
const attackToolKey = ref("");
const threatActorDrawer = ref(false);
const threatActorKey = ref("");

// TermDetailBody 的导航回调 → 开嵌套抽屉 / 开新窗口
const onNavigateAvoidance = (key: string) => { avoidanceKey.value = key; avoidanceDrawer.value = true; };
const onNavigateAttackTool = (key: string) => { attackToolKey.value = key; attackToolDrawer.value = true; };
const onNavigateThreatActor = (key: string) => { threatActorKey.value = key; threatActorDrawer.value = true; };
// risk 走新窗口（不嵌套回主抽屉）
const onNavigateRisk = (rKey: string) => {
  const href = entityDetailHref(router, rKey, "risk");
  if (href) window.open(href, "_blank", "noopener,noreferrer");
};
</script>

<template>
  <el-drawer
    v-if="isTermValid"
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
</template>

<style src="./drawer-detail-shared.css"></style>
