<script setup lang="ts">
import BREAK from "@/BREAK";
import ReferenceList from "@/components/ReferenceList.vue";

import "element-plus/es/components/drawer/style/css";
import "element-plus/es/components/button/style/css";
import { ArrowLeft } from "@element-plus/icons-vue";
import iconRelation from "./icons/iconRelation.vue";
import { useDrawerWidth } from "@/composables/useDrawerWidth";

defineProps<{
  drawer: boolean;
  aKey: string;
}>();
defineEmits(["drawerClose"]);

const { getInnerDrawerWidth } = useDrawerWidth();

const getRelatedTerms = (aKey: string) =>
  Object.keys(BREAK.terms).filter((tKey) =>
    BREAK.terms[tKey].relatedAvoidances.includes(aKey)
  );
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
    <template #header>
      <div class="drawer-header-with-back">
        <el-button text size="small" @click="$emit('drawerClose')" class="drawer-back-btn">
          <el-icon><ArrowLeft /></el-icon>
          {{ $t("back") }}
        </el-button>
        <span class="drawer-header-title">{{ $t('avoidance') }}</span>
      </div>
    </template>
    <div class="desc">
      <strong>{{ $t("ID") }}:&nbsp;</strong>
      <router-link :to="{ name: 'avoidances', hash: `#${aKey}` }" class="id-link">
        {{ aKey }}
      </router-link>
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
    <div class="desc" v-if="getRelatedTerms(aKey).length > 0">
      <strong>{{ $t("terms") }}:&nbsp;</strong>
      <div class="entity-links">
        <router-link
          v-for="tKey in getRelatedTerms(aKey)"
          :key="tKey"
          :to="{ name: 'terms', hash: `#${tKey}` }"
          class="entity-link"
        >
          {{ tKey }}: {{ $t(`BREAK.terms.${tKey}.title`) }}
        </router-link>
      </div>
    </div>
    <div class="desc" v-if="BREAK.avoidances[aKey as keyof typeof BREAK.avoidances].references?.length > 0">
      <strong>{{ $t("references") }}:&nbsp;</strong>
      <ReferenceList type="avoidances" :entityKey="aKey" />
    </div>
    <div class="desc">
      <el-button type="primary" plain size="small" @click="$router.push('/avoidances#' + aKey)">
        {{ $t("viewDetail") }}
      </el-button>
    </div>
  </el-drawer>
</template>

<style scoped>
.desc {
  margin-bottom: 20px;
}

.desc strong {
  display: block;
  margin-bottom: 8px;
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
</style>
