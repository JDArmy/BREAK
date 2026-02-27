<script setup lang="ts">
import { ref } from "vue";
import BREAK from "@/BREAK";
import AvoidanceDetail from "@/components/AvoidanceDetail.vue";
import AttackToolDetail from "@/components/AttackToolDetail.vue";

import "element-plus/es/components/drawer/style/css";
import { Link } from "@element-plus/icons-vue";

import RiskRelation from "@/components/RiskRelation.vue";
import iconRelation from "./icons/iconRelation.vue";
import { useDrawerWidth } from "@/composables/useDrawerWidth";

defineProps<{
  drawer: boolean;
  rKey: string;
}>();
defineEmits(["drawerClose"]);

const risks = BREAK.risks;
const avoidanceDrawer = ref(false);
const avoidanceKey = ref("");
const attackToolDrawer = ref(false);
const attackToolKey = ref("");

const { getDrawerWidth } = useDrawerWidth();

const getReferences = (rKey: string) =>
  risks[rKey as keyof typeof risks].references;

const getRiskDescriptionTools = (rKey: string) => {
  return Object.keys(BREAK.attackTools).filter((atKey) =>
    BREAK.attackTools[
      atKey as keyof typeof BREAK.attackTools
    ].couseRisks.includes(rKey as never)
  );
};
</script>

<template>
  <!-- 风险详情页 -->
  <el-drawer
    :model-value="drawer"
    @closed="$emit('drawerClose')"
    :title="$t('riskDetail')"
    direction="rtl"
    :size="getDrawerWidth()"
  >
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
      <el-button
        v-for="aKey in risks[rKey as keyof typeof risks].avoidances"
        :key="aKey"
        size="small"
        class="relational-link"
        @click="avoidanceKey = aKey; avoidanceDrawer = true"
        round
        >{{
          aKey + ":&nbsp;" + $t(`BREAK.avoidances.${aKey}.title`)
        }}</el-button
      >
    </div>
    <div class="desc" v-if="getReferences(rKey).length > 0">
      <strong>{{ $t("riskReference") }}:&nbsp;</strong>
      <ul>
        <li v-for="(reference, refIdx) in getReferences(rKey)" :key="refIdx">
          <a :href="reference.link" v-if="reference.link" target="_blank" rel="noopener noreferrer"
            ><el-icon><Link /></el-icon
            >{{ $t(`BREAK.risks.${rKey}.references[${refIdx}].title`) }}</a
          >
          <span v-else>
            {{ $t(`BREAK.risks.${rKey}.references[${refIdx}].title`) }}
          </span>
        </li>
      </ul>
    </div>
    <div class="desc" v-if="getRiskDescriptionTools(rKey).length > 0">
      <strong>{{ $t("attackTools") }}:&nbsp;</strong>
      <el-button
        v-for="atKey in getRiskDescriptionTools(rKey)"
        :key="atKey"
        size="small"
        class="relational-link"
        @click="attackToolKey = atKey; attackToolDrawer = true"
        round
        >{{
          atKey + ":&nbsp;" + $t(`BREAK.attackTools.${atKey}.title`)
        }}</el-button
      >
    </div>
    <!-- 关系图 -->
    <div class="desc">
      <strong>{{ $t("riskRelations") }}</strong>
      &nbsp;&nbsp;
      <el-text size="small" type="info">{{ $t("more") }}</el-text>
      <risk-relation :rKey="rKey" />
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
</template>

<style scoped>
.desc {
  margin-bottom: 20px;
}
</style>
