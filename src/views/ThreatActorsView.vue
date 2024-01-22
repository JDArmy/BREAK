<script lang="ts" setup>
  import { ref } from "vue";
  import BREAK from "@/BREAK";
  import { ElIcon } from "element-plus";
  import { Link } from "@element-plus/icons-vue";
  import RiskDetail from "@/components/RiskDetail.vue";
  import AttackToolDetail from "@/components/AttackToolDetail.vue";

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

  let getWindowHeight = () => window.innerHeight;
</script>

<template lang="">
  <h3>{{ $t("threatActors") }}</h3>
  <el-table
    :height="getWindowHeight() - 200"
    :scrollbar-always-on="true"
    :data="threatActors"
    border
    stripe
  >
    <el-table-column prop="taKey" width="120" :label="$t('ID')" />
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
          >{{ atKey + ":&nbsp;" + $t(`BREAK.attackTools.${atKey}.title`) }}</el-button
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
          >{{ atKey + ":&nbsp;" + $t(`BREAK.attackTools.${atKey}.title`) }}</el-button
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
              >{{ $t(`BREAK.threatActors.${scope.row.taKey}.references[${refIdx}].title`) }}
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
</style>
