<script lang="ts" setup>
import { ref } from "vue";
import BREAK from "@/BREAK";
import AvoidanceDetail from "@/components/AvoidanceDetail.vue";
import RiskDetail from "@/components/RiskDetail.vue";
import iconRelation from "@/components/icons/iconRelation.vue";
import { useAnchorTable } from "@/composables/useAnchorTable";

const avoidanceDrawer = ref(false);
const avoidanceKey = ref("");

const risks = Object.keys(BREAK.risks).map((rKey) => ({
  ...BREAK.risks[rKey as keyof typeof BREAK.risks],
  rKey: rKey,
}));

const riskDrawer = ref(false);
const riskKey = ref("");

const { getTableHeight, tableRowClassName } = useAnchorTable("rKey");
</script>

<template lang="">
  <h3>{{ $t("menu.risks") }}</h3>
  <div id="risks-list">
    <router-link
      v-for="risk in risks"
      :key="risk.rKey"
      :title="risk.definition"
      class="router-link ml-2"
      :to="{ name: 'risks', hash: '#' + risk.rKey }"
    >
      <el-button size="small" round class="ml-2">
        {{ risk.rKey }}:{{ $t(`BREAK.risks.${risk.rKey}.title`) }}
      </el-button>
    </router-link>
  </div>
  <el-table
    :height="getTableHeight()"
    :scrollbar-always-on="true"
    :data="risks"
    :row-class-name="tableRowClassName"
    stripe
    border
  >
    <el-table-column prop="rKey" width="135px" :label="$t('riskKey')">
      <template v-slot="scope">
        <a :id="scope.row.rKey" class="anchor-position"></a>
        <a
          @click="riskKey = scope.row.rKey; riskDrawer = true"
          href="javascript:void(0);"
          >{{ scope.row.rKey }}</a
        >
        <router-link
          :title="$t('relationMap')"
          class="relation-map-icon"
          :to="{
            name: 'relation',
            params: { type: 'risk', key: scope.row.rKey },
          }"
        >
          <icon-relation width="14px" height="14px" />
        </router-link>
      </template>
    </el-table-column>
    <el-table-column prop="title" width="150px" :label="$t('riskTitle')">
      <template #default="scope">
        {{ scope.row.rKey ? $t(`BREAK.risks.${scope.row.rKey}.title`) : "" }}
      </template>
    </el-table-column>
    <el-table-column prop="definition" :label="$t('riskDefinition')"
      ><template #default="scope">
        {{
          scope.row.rKey ? $t(`BREAK.risks.${scope.row.rKey}.definition`) : ""
        }}
      </template></el-table-column
    >
    <el-table-column prop="description" :label="$t('riskDescription')"
      ><template #default="scope">
        {{
          scope.row.rKey ? $t(`BREAK.risks.${scope.row.rKey}.description`) : ""
        }}
      </template></el-table-column
    >
    <el-table-column
      prop="complexity"
      width="100px"
      :label="$t('riskComplexity')"
      ><template #default="scope">
        {{
          scope.row.rKey ? $t(`BREAK.risks.${scope.row.rKey}.complexity`) : ""
        }}
      </template></el-table-column
    >
    <el-table-column prop="influence" :label="$t('riskInfluence')"
      ><template #default="scope">
        {{
          scope.row.rKey ? $t(`BREAK.risks.${scope.row.rKey}.influence`) : ""
        }}
      </template></el-table-column
    >
    <!-- <el-table-column :label="$t('avoidance')">
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
    </el-table-column> -->
  </el-table>
  <!-- 手段详情页 -->
  <AvoidanceDetail
    v-on:drawer-close="avoidanceDrawer = false"
    :drawer="avoidanceDrawer"
    :aKey="avoidanceKey"
  />
  <!-- 风险详情页 -->
  <risk-detail
    v-on:drawer-close="riskDrawer = false; riskKey = ''"
    :drawer="riskDrawer"
    :rKey="riskKey"
  />
</template>

<style scoped>
#risks-list {
  margin-bottom: 40px;
}
</style>
