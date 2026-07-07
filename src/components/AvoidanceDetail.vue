<script setup lang="ts">
import { computed } from "vue";
import BREAK from "@/BREAK";
import FeedbackLink from "@/components/FeedbackLink.vue";
import AvoidanceDetailBody from "@/components/AvoidanceDetailBody.vue";

import { ArrowLeft } from "@element-plus/icons-vue";

import { useDrawerWidth } from "@/composables/useDrawerWidth";
import { useEntityDrawerNavigation } from "@/composables/useEntityDrawerNavigation";

const props = defineProps<{
  drawer: boolean;
  aKey: string;
}>();
defineEmits(["drawerClose"]);

const { getInnerDrawerWidth } = useDrawerWidth();
const { openEntityDrawer } = useEntityDrawerNavigation();

const isAvoidanceValid = computed(() => props.aKey && BREAK.avoidances[props.aKey as keyof typeof BREAK.avoidances]);

const onNavigateAvoidance = (key: string) => openEntityDrawer("avoidance", key);
const onNavigateAttackTool = (key: string) => openEntityDrawer("attackTool", key);
const onNavigateTerm = (key: string) => openEntityDrawer("term", key);
const onNavigateRisk = (key: string) => openEntityDrawer("risk", key);
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

</template>

<style src="./drawer-detail-shared.css"></style>
