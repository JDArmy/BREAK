<script setup lang="ts">
import BREAK from "@/BREAK";

import "element-plus/es/components/drawer/style/css";
import { Link } from "@element-plus/icons-vue";
import iconRelation from "./icons/iconRelation.vue";
import { useDrawerWidth } from "@/composables/useDrawerWidth";

defineProps<{
  drawer: boolean;
  aKey: string;
}>();
defineEmits(["drawerClose"]);

const { getInnerDrawerWidth } = useDrawerWidth();

const getAvoidanceReferences = (aKey: string) => {
  return BREAK.avoidances[aKey as keyof typeof BREAK.avoidances].references;
};
</script>

<template>
  <!-- 手段详情页 -->
  <el-drawer
    :model-value="drawer"
    @closed="$emit('drawerClose')"
    :title="$t('avoidance')"
    :append-to-body="true"
    :size="getInnerDrawerWidth()"
  >
    <div class="desc">
      <strong>{{ $t("ID") }}:&nbsp;</strong>
      {{ aKey }}
      <router-link
        :title="$t('relationMap')"
        class="relation-map-icon"
        :to="{
          name: 'relation',
          params: { type: 'avoidance', key: aKey },
        }"
      >
        <icon-relation width="14px" height="14px" />
      </router-link>
    </div>
    <div class="desc">
      <strong>{{ $t("title") }}:&nbsp;</strong>
      {{ $t(`BREAK.avoidances.${aKey}.title`) }}
    </div>
    <div class="desc">
      <strong>{{ $t("definition") }}:&nbsp;</strong>
      {{ $t(`BREAK.avoidances.${aKey}.definition`) }}
    </div>
    <div class="desc">
      <strong>{{ $t("description") }}:&nbsp;</strong>
      {{ $t(`BREAK.avoidances.${aKey}.description`) }}
    </div>
    <div class="desc" v-if="$t(`BREAK.avoidances.${aKey}.limitation`)">
      <strong>{{ $t("limitation") }}:&nbsp;</strong>
      {{ $t(`BREAK.avoidances.${aKey}.limitation`) }}
    </div>
    <div class="desc" v-if="getAvoidanceReferences(aKey).length > 0">
      <strong>{{ $t("references") }}:&nbsp;</strong>
      <ul>
        <li
          v-for="(reference, refIdx) in getAvoidanceReferences(aKey)"
          :key="refIdx"
        >
          <a :href="reference.link" target="_blank" rel="noopener noreferrer">
            <el-icon><Link /></el-icon
            >{{ $t(`BREAK.avoidances.${aKey}.references[${refIdx}].title`) }}
          </a>
        </li>
      </ul>
    </div>
  </el-drawer>
</template>

<style scoped>
.desc {
  margin-bottom: 20px;
}
</style>
