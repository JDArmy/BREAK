<script setup lang="ts">
import { computed } from "vue";
import { ArrowLeft } from "@element-plus/icons-vue";
import FeedbackLink from "@/components/FeedbackLink.vue";
import CaseDetailBody from "@/components/CaseDetailBody.vue";
import { useCases } from "@/composables/useCases";
import { useDrawerWidth } from "@/composables/useDrawerWidth";
import { useEntityDrawerNavigation } from "@/composables/useEntityDrawerNavigation";

const props = defineProps<{
  drawer: boolean;
  cKey: string;
}>();
defineEmits(["drawerClose"]);

const { cases } = useCases();
const { getInnerDrawerWidth } = useDrawerWidth();
const { openEntityDrawer } = useEntityDrawerNavigation();

const selectedCase = computed(() => cases.value[props.cKey]);
const isCaseValid = computed(() => Boolean(props.cKey && selectedCase.value));

const onNavigateRisk = (key: string) => openEntityDrawer("risk", key);
const onNavigateAttackTool = (key: string) => openEntityDrawer("attackTool", key);
const onNavigateThreatActor = (key: string) => openEntityDrawer("threatActor", key);
</script>

<template>
  <el-drawer
    v-if="isCaseValid"
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

</template>

<style src="./drawer-detail-shared.css"></style>
