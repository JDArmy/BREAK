<script lang="ts" setup>
  import { ref } from "vue";
  import BREAK from "@/BREAK";
  import AvoidanceDetail from "@/components/AvoidanceDetail.vue";
  import RiskDetail from "@/components/RiskDetail.vue";
  import { ElIcon } from "element-plus";
  import { Link } from "@element-plus/icons-vue";

  const avoidanceDrawer = ref(false);
  const avoidanceKey = ref("");

  const attackTools = Object.keys(BREAK.attackTools).map((atKey) => ({
    atKey: atKey,
    ...BREAK.attackTools[atKey as keyof typeof BREAK.attackTools],
  }));

  const getWindowHeight = () => window.innerHeight;

  // 风险详情页
  const riskDrawer = ref(false);
  const riskKey = ref("");
</script>
<template lang="">
  <h3>{{ $t("attackTools") }}</h3>
  <el-table
    :height="getWindowHeight() - 200"
    :scrollbar-always-on="true"
    :data="attackTools"
    border
    stripe
  >
    <el-table-column prop="atKey" label="ID" :width="120" />
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
</style>
