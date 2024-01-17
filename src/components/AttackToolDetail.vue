<script setup lang="ts">
import { ref } from "vue";
import BREAK from "@/BREAK";
import AvoidanceDetail from "@/components/AvoidanceDetail.vue";

import "element-plus/es/components/drawer/style/css";
import { ElDrawer, ElButton, ElIcon } from "element-plus";
import { Link } from "@element-plus/icons-vue";

defineProps<{
  drawer: boolean;
  atKey: string;
}>();
defineEmits(["drawerClose"]);

const avoidanceDrawer = ref(false);
const avoidanceKey = ref("");


const getInnerDrawerWidth = () => {
  return window.innerWidth > 600 ? 450 : "100%";
};

const getAttackToolReferences = (atKey: string) => {
  return BREAK.attackTools[atKey as keyof typeof BREAK.attackTools].references;
};

const getAttackToolAvoidances = (atKey: string) => {
  return BREAK.attackTools[atKey as keyof typeof BREAK.attackTools].avoidances;
};
</script>

<template>
  <!-- 攻击工具详情页 -->
  <el-drawer
    :model-value="drawer"
    @closed="$emit('drawerClose')"
    :title="$t('attackTools')"
    :append-to-body="true"
    :size="getInnerDrawerWidth()"
  >
    <div class="desc">
      <strong>{{ $t("ID") }}:&nbsp;</strong>
      {{ atKey }}
    </div>
    <div class="desc">
      <strong>{{ $t("title") }}:&nbsp;</strong>
      {{ $t(`BREAK.attackTools.${atKey}.title`) }}
    </div>
    <div class="desc">
      <strong>{{ $t("description") }}:&nbsp;</strong>
      {{ $t(`BREAK.attackTools.${atKey}.description`) }}
    </div>
    <div class="desc" v-if="getAttackToolAvoidances(atKey).length > 0">
      <strong>{{ $t("avoidance") }}:&nbsp;</strong>
      <el-button
        v-for="aKey in getAttackToolAvoidances(atKey)"
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
    </div>
    <div class="desc" v-if="getAttackToolReferences(atKey).length > 0">
      <strong>{{ $t("references") }}:&nbsp;</strong>
      <ul>
        <li
          v-for="(reference, refIdx) in getAttackToolReferences(atKey)"
          :key="refIdx"
        >
          <a :href="reference.link" target="_blank">
            <el-icon><Link /></el-icon
            >{{
              $t(`BREAK.attackTools.${atKey}.references[${refIdx}].title`)
            }}
          </a>
        </li>
      </ul>
    </div>
  </el-drawer>
  <!-- 手段详情页 -->
  <AvoidanceDetail
    v-on:drawer-close="avoidanceDrawer = false"
    :drawer="avoidanceDrawer"
    :aKey="avoidanceKey"
  />
</template>

<style scoped>
.desc {
  margin-bottom: 20px;
}
</style>

<style>
.el-drawer__header {
  margin-bottom: 0px;
}
</style>
