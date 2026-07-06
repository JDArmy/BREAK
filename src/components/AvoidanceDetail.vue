<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import BREAK from "@/BREAK";
import FeedbackLink from "@/components/FeedbackLink.vue";
import AvoidanceDetailBody from "@/components/AvoidanceDetailBody.vue";

import { ArrowLeft } from "@element-plus/icons-vue";

import { useDrawerWidth } from "@/composables/useDrawerWidth";
import { entityDetailHref } from "@/utils/entityRoute";
import { createRecoverableAsyncComponent } from "@/utils/chunkLoadRecovery";

const AttackToolDetail = createRecoverableAsyncComponent(() => import("@/components/AttackToolDetail.vue"), undefined, "AvoidanceAttackToolDetail");
const TermDetail = createRecoverableAsyncComponent(() => import("@/components/TermDetail.vue"), undefined, "AvoidanceTermDetail");
// 自引用：Avoidance→Related Avoidance 开嵌套抽屉
const AvoidanceDetail = createRecoverableAsyncComponent(() => import("@/components/AvoidanceDetail.vue"), undefined, "AvoidanceNestedAvoidanceDetail");

const props = defineProps<{
  drawer: boolean;
  aKey: string;
}>();
defineEmits(["drawerClose"]);

const router = useRouter();
const { getInnerDrawerWidth } = useDrawerWidth();

const isAvoidanceValid = computed(() => props.aKey && BREAK.avoidances[props.aKey as keyof typeof BREAK.avoidances]);

// 嵌套抽屉：attackTool/term/同类 avoidance 开嵌套抽屉
const attackToolDrawer = ref(false);
const attackToolKey = ref("");
const termDrawer = ref(false);
const termKey = ref("");
// 同类嵌套：Avoidance→Related Avoidance 开嵌套抽屉
const nestedAvoidanceDrawer = ref(false);
const nestedAvoidanceKey = ref("");

// AvoidanceDetailBody 的导航回调 → 开嵌套抽屉/新窗口
const onNavigateAvoidance = (key: string) => { nestedAvoidanceKey.value = key; nestedAvoidanceDrawer.value = true; };
const onNavigateAttackTool = (key: string) => { attackToolKey.value = key; attackToolDrawer.value = true; };
const onNavigateTerm = (key: string) => { termKey.value = key; termDrawer.value = true; };
// risk 走新窗口（避免从 Avoidance 嵌套回 Risk 主抽屉）
const onNavigateRisk = (rKey: string) => {
  const href = entityDetailHref(router, rKey, "risk");
  if (href) window.open(href, "_blank", "noopener,noreferrer");
};
</script>

<template>
  <!-- 手段详情页 -->
  <el-drawer
    v-if="isAvoidanceValid"
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
  <!-- 同类嵌套：关联手段开嵌套抽屉 -->
  <AvoidanceDetail
    v-if="nestedAvoidanceDrawer"
    v-on:drawer-close="nestedAvoidanceDrawer = false"
    :drawer="nestedAvoidanceDrawer"
    :aKey="nestedAvoidanceKey"
  />
</template>

<style src="./drawer-detail-shared.css"></style>
