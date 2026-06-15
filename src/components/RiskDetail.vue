<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import BREAK from "@/BREAK";
import AvoidanceDetail from "@/components/AvoidanceDetail.vue";
import AttackToolDetail from "@/components/AttackToolDetail.vue";
import ThreatActorDetail from "@/components/ThreatActorDetail.vue";
import ReferenceList from "@/components/ReferenceList.vue";

import "element-plus/es/components/drawer/style/css";
import "element-plus/es/components/button/style/css";
import { ArrowLeft } from "@element-plus/icons-vue";

import iconRelation from "./icons/iconRelation.vue";
import { useDrawerWidth } from "@/composables/useDrawerWidth";

defineProps<{
  drawer: boolean;
  rKey: string;
}>();
defineEmits(["drawerClose"]);

const router = useRouter();
const risks = BREAK.risks;
const avoidanceDrawer = ref(false);
const avoidanceKey = ref("");
const attackToolDrawer = ref(false);
const attackToolKey = ref("");
const threatActorDrawer = ref(false);
const threatActorKey = ref("");

const { getDrawerWidth } = useDrawerWidth();

const getRiskDescriptionTools = (rKey: string) => {
  return Object.keys(BREAK.attackTools).filter((atKey) => {
    const at = BREAK.attackTools[atKey as keyof typeof BREAK.attackTools];
    return at.directCauseRisks.includes(rKey) || at.indirectSupportRisks.includes(rKey);
  });
};

const getRiskThreatActors = (rKey: string) => {
  return Object.keys(BREAK.threatActors).filter((taKey) => {
    const ta = BREAK.threatActors[taKey as keyof typeof BREAK.threatActors];
    return ta.directCauseRisks.includes(rKey) || ta.indirectSupportRisks.includes(rKey);
  });
};

const openRelationGraph = (rKey: string) => {
  const route = router.resolve({
    name: "relation",
    params: { type: "risk", key: rKey },
  });
  window.open(route.href, "_blank", "noopener,noreferrer");
};
</script>

<template>
  <!-- 风险详情页 -->
  <el-drawer
    v-if="rKey && risks[rKey as keyof typeof risks]"
    :model-value="drawer"
    @closed="$emit('drawerClose')"
    direction="rtl"
    :size="getDrawerWidth()"
  >
    <template #header>
      <div class="drawer-header-with-back">
        <el-button text size="small" @click="$emit('drawerClose')" class="drawer-back-btn">
          <el-icon><ArrowLeft /></el-icon>
          {{ $t("back") }}
        </el-button>
        <span class="drawer-header-title">{{ $t('riskDetail') }}</span>
      </div>
    </template>
    <div class="desc">
      <strong>{{ $t("riskKey") }}:&nbsp;</strong>
      {{ rKey }}
      <router-link
        :title="$t('relationMap')"
        class="relation-map-icon"
        :to="{
          name: 'relation',
          params: { type: 'risk', key: rKey },
        }"
      >
        <icon-relation width="14px" height="14px" />
      </router-link>
    </div>
    <div class="desc">
      <strong>{{ $t("riskTitle") }}:&nbsp;</strong>
      {{ $t(`BREAK.risks.${rKey}.title`) }}
    </div>
    <div class="desc">
      <strong>{{ $t("riskDefinition") }}:&nbsp;</strong>
      {{ $t(`BREAK.risks.${rKey}.definition`) }}
    </div>
    <div class="desc">
      <strong>{{ $t("riskDescription") }}:&nbsp;</strong>
      {{ $t(`BREAK.risks.${rKey}.description`) }}
    </div>
    <div class="desc">
      <strong>{{ $t("riskComplexity") }}:&nbsp;</strong>
      {{ $t(`BREAK.risks.${rKey}.complexity`) }}
    </div>
    <div class="desc">
      <strong>{{ $t("riskInfluence") }}:&nbsp;</strong>
      {{ $t(`BREAK.risks.${rKey}.influence`) }}
    </div>
    <div class="desc">
      <strong>{{ $t("riskAvoidances") }}:&nbsp;</strong>
      <div class="entity-links">
        <button
          v-for="aKey in risks[rKey as keyof typeof risks].avoidances"
          :key="aKey"
          class="entity-link"
          @click="avoidanceKey = aKey; avoidanceDrawer = true"
        >
          {{ aKey }}: {{ $t(`BREAK.avoidances.${aKey}.title`) }}
        </button>
      </div>
    </div>
    <div class="desc" v-if="risks[rKey as keyof typeof risks].references?.length > 0">
      <strong>{{ $t("riskReference") }}:&nbsp;</strong>
      <ReferenceList type="risks" :entityKey="rKey" />
    </div>
    <div class="desc" v-if="getRiskDescriptionTools(rKey).length > 0">
      <strong>{{ $t("attackTools") }}:&nbsp;</strong>
      <div class="entity-links">
        <button
          v-for="atKey in getRiskDescriptionTools(rKey)"
          :key="atKey"
          class="entity-link"
          @click="attackToolKey = atKey; attackToolDrawer = true"
        >
          {{ atKey }}: {{ $t(`BREAK.attackTools.${atKey}.title`) }}
        </button>
      </div>
    </div>
    <div class="desc" v-if="getRiskThreatActors(rKey).length > 0">
      <strong>{{ $t("threatActors") }}:&nbsp;</strong>
      <div class="entity-links">
        <button
          v-for="taKey in getRiskThreatActors(rKey)"
          :key="taKey"
          class="entity-link"
          @click="threatActorKey = taKey; threatActorDrawer = true"
        >
          {{ taKey }}: {{ $t(`BREAK.threatActors.${taKey}.title`) }}
        </button>
      </div>
    </div>
    <!-- 关系图 -->
    <div class="desc">
      <strong>{{ $t("riskRelations") }}</strong>
      &nbsp;&nbsp;
      <el-button
        size="small"
        type="primary"
        @click="openRelationGraph(rKey)"
      >
        {{ $t("openRelationGraph") }}
      </el-button>
    </div>
    <div class="desc">
      <el-button type="primary" size="small" @click="$router.push('/risks#' + rKey)">
        {{ $t("viewDetail") }}
      </el-button>
    </div>
  </el-drawer>
  <!-- 手段详情页 -->
  <AvoidanceDetail
    v-on:drawer-close="avoidanceDrawer = false"
    :drawer="avoidanceDrawer"
    :aKey="avoidanceKey"
  />

  <!-- 攻击工具详情页 -->
  <AttackToolDetail
    v-on:drawer-close="attackToolDrawer = false"
    :drawer="attackToolDrawer"
    :atKey="attackToolKey"
  />

  <!-- 威胁行为者详情页 -->
  <ThreatActorDetail
    v-on:drawer-close="threatActorDrawer = false"
    :drawer="threatActorDrawer"
    :taKey="threatActorKey"
  />
</template>

<style scoped>
.desc {
  margin-bottom: 20px;
}

.drawer-header-with-back {
  display: flex;
  align-items: center;
  gap: 8px;
}

.drawer-back-btn {
  padding: 4px 8px;
  color: var(--break-text-muted);
}

.drawer-header-title {
  font-weight: 600;
  color: var(--break-text-primary);
}

button.entity-link {
  cursor: pointer;
  font-family: inherit;
}
</style>
