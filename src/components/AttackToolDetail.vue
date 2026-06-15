<script setup lang="ts">
import { ref } from "vue";
import BREAK from "@/BREAK";
import AvoidanceDetail from "@/components/AvoidanceDetail.vue";
import ReferenceList from "@/components/ReferenceList.vue";

import "element-plus/es/components/drawer/style/css";
import "element-plus/es/components/button/style/css";
import { ArrowLeft } from "@element-plus/icons-vue";
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
    <template #header>
      <div class="drawer-header-with-back">
        <el-button text size="small" @click="$emit('drawerClose')" class="drawer-back-btn">
          <el-icon><ArrowLeft /></el-icon>
          {{ $t("back") }}
        </el-button>
        <span class="drawer-header-title">{{ $t('attackTools') }}</span>
      </div>
    </template>
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
    <div class="desc" v-if="BREAK.attackTools[atKey as keyof typeof BREAK.attackTools].references?.length > 0">
      <strong>{{ $t("references") }}:&nbsp;</strong>
      <ReferenceList type="attackTools" :entityKey="atKey" />
    </div>
    <div class="desc">
      <el-button type="primary" @click="$router.push('/attack-tools#' + atKey)">
        {{ $t("viewDetail") }}
      </el-button>
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

.drawer-header-with-back {
  display: flex;
  align-items: center;
  gap: 8px;
}

.drawer-back-btn {
  padding: 4px 8px;
  color: var(--break-text-muted);
}

.drawer-header-title {
  font-weight: 600;
  color: var(--break-text-primary);
}

.relational-link {
  margin: 4px 4px 4px 0;
  border-color: var(--el-border-color);
  color: var(--break-link);
}

.relational-link:hover,
.relational-link:active {
  border-color: var(--break-link);
  color: var(--break-link-hover);
}
</style>
