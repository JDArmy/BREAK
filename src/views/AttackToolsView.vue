<script lang="ts" setup>
import { ref } from "vue";
import BREAK from "@/BREAK";
import AvoidanceDetail from "@/components/AvoidanceDetail.vue";
import RiskDetail from "@/components/RiskDetail.vue";
import { Link } from "@element-plus/icons-vue";
import { useRoute } from "vue-router";
import iconRelation from "@/components/icons/iconRelation.vue";

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
const getTableHeight = () =>
  route.hash.split("#")[1] ? "unset" : window.innerHeight - 100;
const tableRowClassName = ({ row }: { row: any }) => {
  if (route.hash.split("#")[1] === row.atKey) {
    return "anchor-row";
  }
  return "";
};
</script>
<template lang="">
  <h3>{{ $t("attackTools") }}</h3>
  <div id="attack-tools-list">
    <router-link
      v-for="attackTool in attackTools"
      :key="attackTool.atKey"
      :title="attackTool.summary"
      class="router-link ml-2"
      :to="{ name: 'attackTools', hash: '#' + attackTool.atKey }"
    >
      <el-button size="small" round class="ml-2">
        {{ attackTool.atKey }}:{{
          $t(`BREAK.attackTools.${attackTool.atKey}.title`)
        }}
      </el-button>
    </router-link>
  </div>
  <el-table
    :height="getTableHeight()"
    :scrollbar-always-on="true"
    :data="attackTools"
    :row-class-name="tableRowClassName"
    border
    stripe
  >
    <el-table-column prop="atKey" label="ID" :width="135">
      <template #default="scope">
        <a :id="scope.row.atKey" class="anchor-position"></a>
        {{ scope.row.atKey }}
        <router-link
          :title="$t('relationMap')"
          class="relation-map-icon"
          :to="{
            name: 'relation',
            params: { type: 'attack-tool', key: scope.row.atKey },
          }"
        >
          <icon-relation width="14px" height="14px" />
        </router-link>
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
              >{{
                $t(
                  `BREAK.attackTools.${scope.row.atKey}.references[${refIdx}].title`
                )
              }}</a
            >
          </li>
        </ul>
      </template>
    </el-table-column>
    <el-table-column :label="$t('risk')">
      <template #default="scope">
        <el-button
          size="small"
          v-for="rKey in scope.row.couseRisks"
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
          >{{
            aKey + ":&nbsp;" + $t(`BREAK.avoidances.${aKey}.title`)
          }}</el-button
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

#attack-tools-list {
  margin-bottom: 40px;
}
</style>
