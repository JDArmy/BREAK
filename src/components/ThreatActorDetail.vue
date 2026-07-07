<script setup lang="ts">
import { computed } from "vue";
import BREAK from "@/BREAK";
import FeedbackLink from "@/components/FeedbackLink.vue";
import ThreatActorDetailBody from "@/components/ThreatActorDetailBody.vue";

import { ArrowLeft } from "@element-plus/icons-vue";

import { useDrawerWidth } from "@/composables/useDrawerWidth";
import { useEntityDrawerNavigation } from "@/composables/useEntityDrawerNavigation";

const props = defineProps<{
  drawer: boolean;
  taKey: string;
}>();
defineEmits(["drawerClose"]);

const { getInnerDrawerWidth } = useDrawerWidth();
const { openEntityDrawer } = useEntityDrawerNavigation();

const isThreatActorValid = computed(() => props.taKey && BREAK.threatActors[props.taKey as keyof typeof BREAK.threatActors]);

const onNavigateThreatActor = (key: string) => openEntityDrawer("threatActor", key);
const onNavigateAttackTool = (key: string) => openEntityDrawer("attackTool", key);
const onNavigateTerm = (key: string) => openEntityDrawer("term", key);
const onNavigateRisk = (key: string) => openEntityDrawer("risk", key);
const onNavigateCase = (key: string) => openEntityDrawer("case", key);
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

</template>

<style src="./drawer-detail-shared.css"></style>
