<script lang="ts" setup>
import BREAK from "@/BREAK";
import { ElIcon } from "element-plus";
import { Link } from "@element-plus/icons-vue";

import "element-plus/es/components/table/style/css";
import "element-plus/es/components/table-column/style/css";
// import { ElTable, ElTableColumn } from "element-plus";

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

let getWindowHeight = () => window.innerHeight;
// console.log(avoidances);
</script>

<template lang="">
  <h3>{{ $t("menu.avoidances") }}</h3>
  <div
    v-for="(avoidance, avoidanceCategory) in avoidances"
    :key="avoidanceCategory"
  >
    <div>
      <h4 class="avoidance-category-title">
        {{ $t(`BREAK.avoidanceCategories.${avoidanceCategory}.title`) }} ({{
          BREAK.avoidanceCategories[avoidanceCategory].keyword
        }})
      </h4>
      <div class="avoidance-category-description">
        {{ $t(`BREAK.avoidanceCategories.${avoidanceCategory}.description`) }}
      </div>
    </div>
    <el-table
      :height="getWindowHeight() - 50"
      :data="avoidances[avoidanceCategory]"
      stripe
      border
    >
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
      <el-table-column :label="$t('limitation')">
        <template #default="scope">
          {{
            scope.row.aKey
              ? $t(`BREAK.avoidances.${scope.row.aKey}.limitation`)
              : ""
          }}
        </template>
      </el-table-column>
      <el-table-column width="250px" :label="$t('references')">
        <template #default="scope">
          <ul class="reference-list">
            <li
              v-for="(reference, refIdx) in scope.row.references"
              :key="refIdx"
            >
              <a v-if="scope.row.aKey" :href="reference.link" target="_blank"
                ><el-icon><Link /></el-icon
                >{{
                  $t(
                    `BREAK.avoidances.${scope.row.aKey}.references[${refIdx}].title`
                  )
                }} </a
              >:
              {{
                $t(
                  `BREAK.avoidances.${scope.row.aKey}.references[${refIdx}].description`
                )
              }}
            </li>
          </ul>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.avoidance-category-title {
  margin-top: 50px;
  margin-bottom: 5px;
  text-align: center;
}
.avoidance-category-description {
  text-align: center;
  margin-bottom: 20px;
  font-size: 50%;
  color: gray;
}

.reference-list {
  padding: 0;
  margin-left: 5px;
}
</style>
