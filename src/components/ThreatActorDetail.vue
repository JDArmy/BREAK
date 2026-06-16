<script setup lang="ts">
import BREAK from "@/BREAK";
import { ref } from "vue";
import TermDetail from "@/components/TermDetail.vue";
import ReferenceList from "@/components/ReferenceList.vue";

import "element-plus/es/components/drawer/style/css";
import "element-plus/es/components/button/style/css";
import { ArrowLeft } from "@element-plus/icons-vue";
import iconRelation from "./icons/iconRelation.vue";
import { useDrawerWidth } from "@/composables/useDrawerWidth";

defineProps<{
  drawer: boolean;
  taKey: string;
}>();
defineEmits(["drawerClose"]);

const { getInnerDrawerWidth } = useDrawerWidth();

const getRelatedTerms = (taKey: string) =>
  Object.keys(BREAK.terms).filter((tKey) =>
    BREAK.terms[tKey].relatedThreatActors.includes(taKey)
  );

const termDrawer = ref(false);
const termKey = ref("");
</script>

<template>
  <!-- 威胁行为者详情页 -->
  <el-drawer
    v-if="taKey && BREAK.threatActors[taKey as keyof typeof BREAK.threatActors]"
    :model-value="drawer"
    @closed="$emit('drawerClose')"
    :title="$t('threatActors')"
    :append-to-body="true"
    :size="getInnerDrawerWidth()"
  >
    <template #header>
      <div class="drawer-header-with-back">
        <el-button text size="small" @click="$emit('drawerClose')" class="drawer-back-btn">
          <el-icon><ArrowLeft /></el-icon>
          {{ $t("back") }}
        </el-button>
        <span class="drawer-header-title">{{ $t('threatActors') }}</span>
      </div>
    </template>
    <div class="desc">
      <strong>{{ $t("ID") }}:&nbsp;</strong>
      <router-link :to="{ name: 'threatActors', hash: `#${taKey}` }" class="id-link">
        {{ taKey }}
      </router-link>
      <router-link
        :title="$t('relationMap')"
        class="relation-map-icon"
        :to="{
          name: 'relation',
          params: { type: 'threat-actor', key: taKey },
        }"
      >
        <icon-relation width="14px" height="14px" />
      </router-link>
    </div>
    <div class="desc">
      <strong>{{ $t("title") }}:&nbsp;</strong>
      {{ $t(`BREAK.threatActors.${taKey}.title`) }}
    </div>
    <div class="desc">
      <strong>{{ $t("description") }}:&nbsp;</strong>
      {{ $t(`BREAK.threatActors.${taKey}.description`) }}
    </div>
    <div class="desc" v-if="getRelatedTerms(taKey).length > 0">
      <strong>{{ $t("terms") }}:&nbsp;</strong>
      <div class="entity-links">
        <button
          v-for="tKey in getRelatedTerms(taKey)"
          :key="tKey"
          class="entity-link"
          @click="termKey = tKey; termDrawer = true"
        >
          {{ tKey }}: {{ $t(`BREAK.terms.${tKey}.title`) }}
        </button>
      </div>
    </div>
    <div class="desc" v-if="BREAK.threatActors[taKey as keyof typeof BREAK.threatActors].references?.length > 0">
      <strong>{{ $t("riskReference") }}:&nbsp;</strong>
      <ReferenceList type="threatActors" :entityKey="taKey" />
    </div>
    <div class="desc">
      <el-button type="primary" plain size="small" @click="$router.push('/threat-actors#' + taKey)">
        {{ $t("viewDetail") }}
      </el-button>
    </div>
  </el-drawer>

  <!-- 术语详情页 -->
  <TermDetail
    v-on:drawer-close="termDrawer = false"
    :drawer="termDrawer"
    :tKey="termKey"
  />
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
