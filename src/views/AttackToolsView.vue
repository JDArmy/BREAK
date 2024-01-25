<script lang="ts" setup>
import { ref } from "vue";
import BREAK from "@/BREAK";
import AvoidanceDetail from "@/components/AvoidanceDetail.vue";
import RiskDetail from "@/components/RiskDetail.vue";
import { Link } from "@element-plus/icons-vue";
import { useRoute } from "vue-router";

const route = useRoute();

const avoidanceDrawer = ref(false);
const avoidanceKey = ref("");

const attackTools = Object.keys(BREAK.attackTools).map((atKey) => ({
  atKey: atKey,
  ...BREAK.attackTools[atKey as keyof typeof BREAK.attackTools],
}));

// 风险详情页
const riskDrawer = ref(false);
const riskKey = ref("");

//页内锚点
const getTableHeight = () => (route.hash.split("#")[1] ? "unset" : window.innerHeight - 200);
const tableRowClassName = ({ row }: { row: any }) => {
  if (route.hash.split("#")[1] === row.atKey) {
    return "anchor-row";
  }
  return "";
};
</script>
<template lang="">
  <h3>{{ $t("attackTools") }}</h3>
  <el-table
    :height="getTableHeight()"
    :scrollbar-always-on="true"
    :data="attackTools"
    :row-class-name="tableRowClassName"
    border
    stripe
  >
    <el-table-column prop="atKey" label="ID" :width="120">
      <template #default="scope">
        <a :id="scope.row.atKey" class="attack-tool-anchor"></a>
        {{ scope.row.atKey }}
      </template>
    </el-table-column>
    <el-table-column prop="title" :label="$t('title')" :width="150" />
    <el-table-column prop="description" :label="$t('description')" />
    <el-table-column :label="$t('references')" :width="300">
      <template #default="scope">
        <ul>
          <li v-for="(reference, refIdx) in scope.row.references" :key="refIdx">
            <a :href="reference.link" target="_blank"
              ><el-icon><Link /></el-icon
              >{{ $t(`BREAK.attackTools.${scope.row.atKey}.references[${refIdx}].title`) }}</a
            >
          </li>
        </ul>
      </template>
    </el-table-column>
    <el-table-column :label="$t('risk')">
      <template #default="scope">
        <el-button
          size="small"
          v-for="rKey in scope.row.risks"
          :key="rKey"
          @click="(riskKey = rKey) && (riskDrawer = true)"
          class="relational-link"
          round
          >{{ rKey + ":&nbsp;" + $t(`BREAK.risks.${rKey}.title`) }}</el-button
        >
      </template></el-table-column
    >
    <el-table-column :label="$t('avoidance')">
      <template #default="scope">
        <el-button
          size="small"
          v-for="aKey in scope.row.avoidances"
          :key="aKey"
          class="relational-link"
          @click="
            avoidanceKey = aKey;
            avoidanceDrawer = true;
          "
          round
          >{{ aKey + ":&nbsp;" + $t(`BREAK.avoidances.${aKey}.title`) }}</el-button
        >
      </template>
    </el-table-column>
  </el-table>
  <!-- 手段详情页 -->
  <AvoidanceDetail
    v-on:drawer-close="avoidanceDrawer = false"
    :drawer="avoidanceDrawer"
    :aKey="avoidanceKey"
  />
  <!-- 风险详情页 -->
  <risk-detail
    v-on:drawer-close="(riskDrawer = false) && (riskKey = '')"
    :drawer="riskDrawer"
    :rKey="riskKey"
  />
</template>
<style scoped>
ul {
  padding: 0px;
  margin-left: 5px;
}

.attack-tool-anchor {
  position: absolute;
  top: -1vh;
  left: 0px;
}
</style>
