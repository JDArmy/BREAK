<script lang="ts" setup>
import BREAK from "@/i18n/zh-CN/BREAK.json";

import "element-plus/es/components/table/style/css";
import "element-plus/es/components/table-column/style/css";
import { ElTable, ElTableColumn } from "element-plus";

let avoidanceCategories = Object.keys(BREAK.avoidanceCategories);
let avoidances = Object();

avoidanceCategories.forEach((acKey) => {
  avoidances[acKey] = Array();
  Object.keys(BREAK.avoidances).forEach((aKey) => {
    let avoidancesVal = BREAK.avoidances[aKey as keyof typeof BREAK.avoidances];
    if (acKey !== avoidancesVal.category) {
      return;
    }
    let avoidance = {
      ...avoidancesVal,
      aKey: aKey,
    };
    avoidances[acKey].push(avoidance);
  });
});

// console.log(avoidances);
</script>

<template lang="">
  <h3>{{ $t("menu.avoidances") }}</h3>
  <div v-for="(avoidance, avoidanceCategory) in avoidances">
    <h4 class="avoidance-category">
      {{ $t(`BREAK.avoidanceCategories.${avoidanceCategory}.title`) }} ({{
        BREAK.avoidanceCategories[avoidanceCategory].keyword
      }})
    </h4>
    <el-table :data="avoidances[avoidanceCategory]" stripe border>
      <el-table-column prop="aKey" width="100px" :label="$t('ID')" />
      <el-table-column width="150px" :label="$t('title')">
        <template #header>{{ $t("title") }}</template>
        <template #default="scope">
          {{
            scope.row.aKey ? $t(`BREAK.avoidances.${scope.row.aKey}.title`) : ""
          }}
        </template>
      </el-table-column>
      <el-table-column :label="$t('summary')">
        <template #default="scope">
          {{
            scope.row.aKey
              ? $t(`BREAK.avoidances.${scope.row.aKey}.summary`)
              : ""
          }}
        </template>
      </el-table-column>
      <el-table-column :label="$t('description')">
        <template #default="scope">
          {{
            scope.row.aKey
              ? $t(`BREAK.avoidances.${scope.row.aKey}.description`)
              : ""
          }}
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.avoidance-category {
  margin-top: 50px;
  text-align: center;
}
</style>
