<script setup lang="ts">
import { computed } from "vue";
import BREAK from "@/BREAK";
import FeedbackLink from "@/components/FeedbackLink.vue";
import AttackToolDetailBody from "@/components/AttackToolDetailBody.vue";

import { ArrowLeft } from "@element-plus/icons-vue";

import { useDrawerWidth } from "@/composables/useDrawerWidth";
import { useEntityDrawerNavigation } from "@/composables/useEntityDrawerNavigation";

const props = defineProps<{
  drawer: boolean;
  atKey: string;
}>();
defineEmits(["drawerClose"]);

const { getInnerDrawerWidth } = useDrawerWidth();
const { openEntityDrawer } = useEntityDrawerNavigation();

const isAttackToolValid = computed(() => props.atKey && BREAK.attackTools[props.atKey as keyof typeof BREAK.attackTools]);

const onNavigateAttackTool = (key: string) => openEntityDrawer("attackTool", key);
const onNavigateAvoidance = (key: string) => openEntityDrawer("avoidance", key);
const onNavigateThreatActor = (key: string) => openEntityDrawer("threatActor", key);
const onNavigateTerm = (key: string) => openEntityDrawer("term", key);
const onNavigateRisk = (key: string) => openEntityDrawer("risk", key);
const onNavigateCase = (key: string) => openEntityDrawer("case", key);
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

</template>

<style src="./drawer-detail-shared.css"></style>
