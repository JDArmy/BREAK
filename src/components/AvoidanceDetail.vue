<script setup lang="ts">
import BREAK from "@/BREAK";

import "element-plus/es/components/drawer/style/css";
import { Link } from "@element-plus/icons-vue";

defineProps<{
  drawer: boolean;
  aKey: string;
}>();
defineEmits(["drawerClose"]);

const getInnerDrawerWidth = () => {
  return window.innerWidth > 600 ? 450 : "100%";
};

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
    </div>
    <div class="desc">
      <strong>{{ $t("title") }}:&nbsp;</strong>
      {{ $t(`BREAK.avoidances.${aKey}.title`) }}
    </div>
    <div class="desc">
      <strong>{{ $t("summary") }}:&nbsp;</strong>
      {{ $t(`BREAK.avoidances.${aKey}.summary`) }}
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
          <a :href="reference.link" target="_blank">
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
