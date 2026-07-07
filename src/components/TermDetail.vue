<script setup lang="ts">
import { computed } from "vue";
import BREAK from "@/BREAK";
import FeedbackLink from "@/components/FeedbackLink.vue";
import TermDetailBody from "@/components/TermDetailBody.vue";

import { ArrowLeft } from "@element-plus/icons-vue";

import { useDrawerWidth } from "@/composables/useDrawerWidth";
import { useEntityDrawerNavigation } from "@/composables/useEntityDrawerNavigation";

const props = defineProps<{
  drawer: boolean;
  tKey: string;
}>();
defineEmits(["drawerClose"]);

const { getInnerDrawerWidth } = useDrawerWidth();
const { openEntityDrawer } = useEntityDrawerNavigation();

const terms = BREAK.terms;
const isTermValid = computed(() => props.tKey && terms[props.tKey as keyof typeof terms]);

const onNavigateAvoidance = (key: string) => openEntityDrawer("avoidance", key);
const onNavigateAttackTool = (key: string) => openEntityDrawer("attackTool", key);
const onNavigateThreatActor = (key: string) => openEntityDrawer("threatActor", key);
const onNavigateRisk = (key: string) => openEntityDrawer("risk", key);
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

</template>

<style src="./drawer-detail-shared.css"></style>
