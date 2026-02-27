<script setup lang="ts">
import { ref } from "vue";
import BREAK from "@/BREAK";
import AvoidanceDetail from "@/components/AvoidanceDetail.vue";

import "element-plus/es/components/drawer/style/css";
import { Link } from "@element-plus/icons-vue";
import iconRelation from "./icons/iconRelation.vue";
import { useDrawerWidth } from "@/composables/useDrawerWidth";

defineProps<{
  drawer: boolean;
  atKey: string;
}>();
defineEmits(["drawerClose"]);

const avoidanceDrawer = ref(false);
const avoidanceKey = ref("");

const { getInnerDrawerWidth } = useDrawerWidth();

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
      <router-link
        :title="$t('relationMap')"
        class="relation-map-icon"
        :to="{
          name: 'relation',
          params: { type: 'attack-tool', key: atKey },
        }"
      >
        <icon-relation width="14px" height="14px" />
      </router-link>
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
        size="small"
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
          <a :href="reference.link" target="_blank" rel="noopener noreferrer">
            <el-icon><Link /></el-icon
            >{{ $t(`BREAK.attackTools.${atKey}.references[${refIdx}].title`) }}
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
