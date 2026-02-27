<script lang="ts" setup>
import { ref } from "vue";
import BREAK from "@/BREAK";
import { Link } from "@element-plus/icons-vue";
import RiskDetail from "@/components/RiskDetail.vue";
import AttackToolDetail from "@/components/AttackToolDetail.vue";
import iconRelation from "@/components/icons/iconRelation.vue";
import { useAnchorTable } from "@/composables/useAnchorTable";

// 攻击工具详情页
const attackToolDrawer = ref(false);
const attackToolKey = ref("");
// 风险详情页
const riskDrawer = ref(false);
const riskKey = ref("");

const threatActors = Object.keys(BREAK.threatActors).map((taKey) => ({
  taKey: taKey,
  ...BREAK.threatActors[taKey as keyof typeof BREAK.threatActors],
}));

const { getTableHeight, tableRowClassName } = useAnchorTable("taKey");
</script>

<template lang="">
  <h3>{{ $t("threatActors") }}</h3>
  <div id="threat-actors-list">
    <router-link
      v-for="threatActor in threatActors"
      :key="threatActor.taKey"
      :title="threatActor.definition"
      class="router-link ml-2"
      :to="{ name: 'threatActors', hash: '#' + threatActor.taKey }"
    >
      <el-button size="small" round class="ml-2">
        {{ threatActor.taKey }}:{{
          $t(`BREAK.threatActors.${threatActor.taKey}.title`)
        }}
      </el-button>
    </router-link>
  </div>
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
        <a :id="scope.row.taKey" class="anchor-position"></a>
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
          @click="attackToolKey = atKey; attackToolDrawer = true"
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
          @click="attackToolKey = atKey; attackToolDrawer = true"
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
          v-for="rKey in scope.row.couseRisks"
          :key="rKey"
          @click="riskKey = rKey; riskDrawer = true"
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
            <a v-if="scope.row.taKey" :href="reference.link" target="_blank" rel="noopener noreferrer"
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
    v-on:drawer-close="riskDrawer = false; riskKey = ''"
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
#threat-actors-list {
  margin-bottom: 40px;
}
</style>
