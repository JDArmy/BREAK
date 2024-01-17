<script lang="ts" setup>
  import { ref } from "vue";
  import BREAK from "@/BREAK";
  import RiskDetail from "@/components/RiskDetail.vue";

  import "element-plus/es/components/table/style/css";
  import "element-plus/es/components/table-column/style/css";

  let risks = Object.keys(BREAK.risks).map((rKey) => ({
    ...BREAK.risks[rKey as keyof typeof BREAK.risks],
    rKey: rKey,
  }));

  let drawer = ref(false);
  let riskKey = ref("");
  let showRiskDetail = (riskKey1: string, drawer1: boolean) => {
    drawer.value = drawer1;
    riskKey.value = riskKey1;
    // console.log(riskKey.value, drawer.value);
  };

  let riskDetailClose = () => {
    drawer.value = false;
    // console.log("close");
  };

  let getWindowHeight = () => window.innerHeight;
</script>

<template lang="">
  <h3>{{ $t("menu.risks") }}</h3>
  <el-table :height="getWindowHeight() - 200" :data="risks" stripe border>
    <el-table-column prop="rKey" width="120px" :label="$t('riskKey')">
      <template v-slot="scope">
        <a @click="showRiskDetail(scope.row.rKey, true)" href="javascript:void(0);">{{
          scope.row.rKey
        }}</a>
      </template>
    </el-table-column>
    <el-table-column prop="title" width="150px" :label="$t('riskTitle')">
      <template #default="scope">
        {{ scope.row.rKey ? $t(`BREAK.risks.${scope.row.rKey}.title`) : "" }}
      </template>
    </el-table-column>
    <el-table-column prop="definition" :label="$t('riskDefinition')"
      ><template #default="scope">
        {{ scope.row.rKey ? $t(`BREAK.risks.${scope.row.rKey}.definition`) : "" }}
      </template></el-table-column
    >
    <el-table-column prop="influence" :label="$t('riskInfluence')"
      ><template #default="scope">
        {{ scope.row.rKey ? $t(`BREAK.risks.${scope.row.rKey}.influence`) : "" }}
      </template></el-table-column
    >
  </el-table>
  <risk-detail v-on:drawer-close="riskDetailClose" :drawer="drawer" :rKey="riskKey" />
</template>

<style lang=""></style>
