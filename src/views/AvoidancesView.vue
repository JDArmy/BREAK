<script lang="ts" setup>
  import BREAK from "@/BREAK";
  import { ElIcon } from "element-plus";
  import { Link } from "@element-plus/icons-vue";

  import "element-plus/es/components/table/style/css";
  import "element-plus/es/components/table-column/style/css";
  import { ElTable, ElTableColumn } from "element-plus";
  import type { Avoidance, Avoidances } from "@/BREAK/avoidances";
  import { useRoute } from "vue-router";

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

  const filteredAvoidances = (avoidanceCategoryKey: string) => {
    let categoricalAvoidances: Avoidances = {};
    Object.keys(BREAK.avoidances).forEach((avoidanceKey) => {
      if (BREAK.avoidances[avoidanceKey].category === avoidanceCategoryKey) {
        categoricalAvoidances[avoidanceKey] = BREAK.avoidances[avoidanceKey];
      }
    });
    return categoricalAvoidances;
  };

  const route = useRoute();
  const tableRowClassName = ({ row }: { row: Avoidance }) => {
    if (route.hash.split("#")[1] === row.title) {
      return "anchor-row";
    }
    return "";
  };

  let totalAvoidancesRowSize = 24;
  let getAvoidanceRowSize = (avoidanceCategoryLength: number, avoidancesLength: number) => {
    let step = Math.round((avoidanceCategoryLength / avoidancesLength) * 24);

    totalAvoidancesRowSize = totalAvoidancesRowSize <= 0 ? 24 : totalAvoidancesRowSize;

    step = step > totalAvoidancesRowSize ? totalAvoidancesRowSize : step;
    totalAvoidancesRowSize -= step;

    return step;
  };
</script>

<template lang="">
  <h3>{{ $t("menu.avoidances") }}</h3>
  <el-row :gutter="20">
    <el-col
      v-for="(avoidanceCategory, avoidanceCategoryKey) in BREAK.avoidanceCategories"
      :md="
        getAvoidanceRowSize(
          Object.keys(avoidances[avoidanceCategoryKey]).length,
          Object.keys(BREAK.avoidances).length
        )
      "
      :key="avoidanceCategoryKey"
    >
      <h4>{{ $t(`BREAK.avoidanceCategories.${avoidanceCategoryKey}.title`) }}</h4>
      <div>
        <router-link
          v-for="(avoidance, avoidanceKey) in filteredAvoidances(avoidanceCategoryKey)"
          :key="avoidanceKey"
          :title="avoidanceKey + ':' + avoidance.title"
          class="router-link"
          :to="{ path: '/avoidances', hash: '#' + avoidance.title }"
        >
          <el-button size="small" round class="ml-2">
            {{ avoidanceKey }}:{{ $t(`BREAK.avoidances.${avoidanceKey}.title`) }}
          </el-button>
        </router-link>
      </div>
    </el-col>
  </el-row>

  <div v-for="(avoidance, avoidanceCategoryKey) in avoidances" :key="avoidanceCategoryKey">
    <div>
      <h4 class="avoidance-category-title">
        {{ $t(`BREAK.avoidanceCategories.${avoidanceCategoryKey}.title`) }} ({{
          BREAK.avoidanceCategories[avoidanceCategoryKey].keyword
        }})
      </h4>
      <div class="avoidance-category-description">
        {{ $t(`BREAK.avoidanceCategories.${avoidanceCategoryKey}.description`) }}
      </div>
    </div>
    <el-table
      :sheight="getWindowHeight() - 200"
      :data="avoidances[avoidanceCategoryKey]"
      :row-class-name="tableRowClassName"
      stripe
      border
    >
      <el-table-column prop="aKey" width="110px" :label="$t('ID')" />
      <el-table-column width="150px" :label="$t('title')">
        <template #header>{{ $t("title") }}</template>
        <template #default="scope">
          <a class="avoidance_anchor" :id="scope.row.title"></a>
          {{ scope.row.aKey ? $t(`BREAK.avoidances.${scope.row.aKey}.title`) : "" }}
        </template>
      </el-table-column>
      <el-table-column :label="$t('summary')">
        <template #default="scope">
          {{ scope.row.aKey ? $t(`BREAK.avoidances.${scope.row.aKey}.summary`) : "" }}
        </template>
      </el-table-column>
      <el-table-column :label="$t('description')">
        <template #default="scope">
          {{ scope.row.aKey ? $t(`BREAK.avoidances.${scope.row.aKey}.description`) : "" }}
        </template>
      </el-table-column>
      <el-table-column :label="$t('limitation')">
        <template #default="scope">
          {{ scope.row.aKey ? $t(`BREAK.avoidances.${scope.row.aKey}.limitation`) : "" }}
        </template>
      </el-table-column>
      <el-table-column width="250px" :label="$t('references')">
        <template #default="scope">
          <ul class="reference-list">
            <li v-for="(reference, refIdx) in scope.row.references" :key="refIdx">
              <a v-if="scope.row.aKey" :href="reference.link" target="_blank"
                ><el-icon><Link /></el-icon
                >{{ $t(`BREAK.avoidances.${scope.row.aKey}.references[${refIdx}].title`) }} </a
              >:
              {{ $t(`BREAK.avoidances.${scope.row.aKey}.references[${refIdx}].description`) }}
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

  .ml-2 {
    margin-left: 5px;
    margin-top: 5px;
  }

  .avoidance_anchor {
    position: relative;
    top: -30vh;
  }

  .router-link {
    color: inherit;
    text-decoration: none;
  }
</style>
<style>
  .anchor-row,
  .anchor-row .el-table__cell {
    background-color: var(--el-color-warning-light-7) !important;
  }
</style>
