<script lang="ts" setup>
import { ref } from "vue";
import BREAK from "@/BREAK";
import { Link } from "@element-plus/icons-vue";
import RiskDetail from "@/components/RiskDetail.vue";
import AttackToolDetail from "@/components/AttackToolDetail.vue";
import { useRoute } from "vue-router";
import iconRelation from "@/components/icons/iconRelation.vue";

const route = useRoute();
// 攻击工具详情页
const attackToolDrawer = ref(false);
const attackToolKey = ref("");
// 风险详情页
const riskDrawer = ref(false);
const riskKey = ref("");

//
let threatActors = Object.keys(BREAK.threatActors).map((taKey) => ({
  taKey: taKey,
  ...BREAK.threatActors[taKey as keyof typeof BREAK.threatActors],
}));

//页内锚点
const getTableHeight = () =>
  route.hash.split("#")[1] ? "unset" : window.innerHeight - 200;
const tableRowClassName = ({ row }: { row: any }) => {
  if (route.hash.split("#")[1] === row.taKey) {
    return "anchor-row";
  }
  return "";
};
</script>

<template lang="">
  <h3>{{ $t("threatActors") }}</h3>
  <el-table
    :height="getTableHeight()"
    :scrollbar-always-on="true"
    :data="threatActors"
    :row-class-name="tableRowClassName"
    border
    stripe
  >
    <el-table-column prop="taKey" width="135" :label="$t('ID')">
      <template #default="scope">
        <a :id="scope.row.taKey" class="threat-actor-anchor"></a>
        {{ scope.row.taKey }}
        <router-link
          :title="$t('relationMap')"
          class="relation-map-icon"
          :to="{
            name: 'relation',
            params: { type: 'threat-actor', key: scope.row.taKey },
          }"
        >
          <icon-relation width="14px" height="14px" />
        </router-link>
      </template>
    </el-table-column>
    <el-table-column prop="title" width="150" :label="$t('title')" />
    <el-table-column prop="description" :label="$t('description')" />
    <el-table-column :label="$t('buildAttackTools')">
      <template #default="scope">
        <el-button
          size="small"
          v-for="atKey in scope.row.buildAttackTools"
          :key="atKey"
          @click="(attackToolKey = atKey) && (attackToolDrawer = true)"
          class="relational-link"
          round
          >{{
            atKey + ":&nbsp;" + $t(`BREAK.attackTools.${atKey}.title`)
          }}</el-button
        >
      </template></el-table-column
    >
    <el-table-column :label="$t('useAttackTools')">
      <template #default="scope">
        <el-button
          size="small"
          v-for="atKey in scope.row.useAttackTools"
          :key="atKey"
          @click="(attackToolKey = atKey) && (attackToolDrawer = true)"
          class="relational-link"
          round
          >{{
            atKey + ":&nbsp;" + $t(`BREAK.attackTools.${atKey}.title`)
          }}</el-button
        >
      </template></el-table-column
    >
    <el-table-column :label="$t('risksMaker')">
      <template #default="scope">
        <el-button
          size="small"
          v-for="rKey in scope.row.makeRisks"
          :key="rKey"
          @click="(riskKey = rKey) && (riskDrawer = true)"
          class="relational-link"
          round
          >{{ rKey + ":&nbsp;" + $t(`BREAK.risks.${rKey}.title`) }}</el-button
        >
      </template></el-table-column
    >
    <el-table-column width="250px" :label="$t('references')">
      <template #default="scope">
        <ul class="reference-list">
          <li v-for="(reference, refIdx) in scope.row.references" :key="refIdx">
            <a v-if="scope.row.taKey" :href="reference.link" target="_blank"
              ><el-icon><Link /></el-icon
              >{{
                $t(
                  `BREAK.threatActors.${scope.row.taKey}.references[${refIdx}].title`
                )
              }}
            </a>
          </li>
        </ul>
      </template>
    </el-table-column>
  </el-table>
  <!-- 风险详情页 -->
  <risk-detail
    v-on:drawer-close="(riskDrawer = false) && (riskKey = '')"
    :drawer="riskDrawer"
    :rKey="riskKey"
  />
  <!-- 攻击工具详情页 -->
  <AttackToolDetail
    v-on:drawer-close="attackToolDrawer = false"
    :drawer="attackToolDrawer"
    :atKey="attackToolKey"
  />
</template>

<style scoped>
.aLogo {
  text-align: center;
}
.aLogo img {
  height: 30px;
  max-width: 120px;
}

.commit-new-provider {
  text-align: center;
  color: grey;
  margin: 50px;
  font-size: 50%;
}

.provider-abilities {
  padding: 10px;
  display: inline-block;
}
.provider-abilities a:hover {
  color: brown;
}

.threat-actor-anchor {
  position: absolute;
  top: -1vh;
  left: 0px;
}
</style>
