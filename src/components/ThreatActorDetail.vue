<script setup lang="ts">
import BREAK from "@/BREAK";
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import ReferenceList from "@/components/ReferenceList.vue";
import FeedbackLink from "@/components/FeedbackLink.vue";

import { ArrowLeft, TopRight } from "@element-plus/icons-vue";
import iconRelation from "./icons/iconRelation.vue";
import { useDrawerWidth } from "@/composables/useDrawerWidth";
import { useRelatedEntities } from "@/composables/useRelatedEntities";
import { entityDetailHref } from "@/utils/entityRoute";
import { getEntityEntry } from "@/BREAK/entityRegistry";
import { createRecoverableAsyncComponent } from "@/utils/chunkLoadRecovery";

const TermDetail = createRecoverableAsyncComponent(() => import("@/components/TermDetail.vue"), undefined, "ThreatActorTermDetail");

const props = defineProps<{
  drawer: boolean;
  taKey: string;
}>();
defineEmits(["drawerClose"]);

const router = useRouter();
const { getInnerDrawerWidth } = useDrawerWidth();
const selectedThreatActor = computed(() => BREAK.threatActors[props.taKey as keyof typeof BREAK.threatActors]);
const relatedThreatActors = computed(() => selectedThreatActor.value?.relatedThreatActors ?? []);

// 反查：用 useRelatedEntities 统一工厂，避免手写全表 filter
const relatedTerms = useRelatedEntities(
  BREAK.terms,
  "relatedThreatActors",
  () => props.taKey,
);

const termDrawer = ref(false);
const termKey = ref("");

const openRelationGraph = (taKey: string) => {
  const route = router.resolve({
    name: getEntityEntry("threatActor").relationPerspectiveRouteName,
    params: { entity: "threat-actor", id: taKey },
  });
  window.open(route.href, "_blank", "noopener,noreferrer");
};

// 跳知识库详情页（新窗口）的 href
const detailHref = (taKey: string) => entityDetailHref(router, taKey, "threatActor");

// 新窗口打开知识库详情页
const openDetail = (taKey: string) => {
  window.open(detailHref(taKey)!, "_blank", "noopener,noreferrer");
};
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
        <FeedbackLink :entity-id="taKey" :entity-title="$t(`BREAK.threatActors.${taKey}.title`)" style="margin-left: auto" />
      </div>
    </template>
    <div class="desc">
      <strong>{{ $t("ID") }}:&nbsp;</strong>
      <a :href="detailHref(taKey)" target="_blank" rel="noopener" class="id-link">
        {{ taKey }}
        <el-icon class="external-link-icon" aria-hidden="true"><TopRight /></el-icon>
      </a>
      <button
        :title="$t('relationMap')"
        :aria-label="$t('relationMap')"
        class="relation-map-icon"
        @click="openRelationGraph(taKey)"
      >
        <icon-relation width="14px" height="14px" />
      </button>
    </div>
    <div class="desc">
      <strong>{{ $t("title") }}:&nbsp;</strong>
      {{ $t(`BREAK.threatActors.${taKey}.title`) }}
    </div>
    <div class="desc">
      <strong>{{ $t("description") }}:&nbsp;</strong>
      {{ $t(`BREAK.threatActors.${taKey}.description`) }}
    </div>
    <div class="desc" v-if="relatedThreatActors.length > 0">
      <strong>{{ $t("threatActorRelatedThreatActors") }}:&nbsp;</strong>
      <div class="entity-links">
        <a
          v-for="relation in relatedThreatActors"
          :key="`${relation.key}-${relation.relation}`"
          class="entity-link"
          :href="detailHref(relation.key)"
          target="_blank"
          rel="noopener"
        >
          {{ $t(`threatActorRelationType.${relation.relation}`) }} ·
          {{ relation.key }}: {{ $t(`BREAK.threatActors.${relation.key}.title`) }}
          <el-icon class="external-link-icon"><TopRight /></el-icon>
        </a>
      </div>
    </div>
    <div class="desc" v-if="relatedTerms.length > 0">
      <strong>{{ $t("terms") }}:&nbsp;</strong>
      <div class="entity-links">
        <button
          v-for="tKey in relatedTerms"
          :key="tKey"
          class="entity-link"
          @click="termKey = tKey; termDrawer = true"
        >
          {{ tKey }}: {{ $t(`BREAK.terms.${tKey}.title`) }}
        </button>
      </div>
    </div>
    <div class="desc" v-if="BREAK.threatActors[taKey as keyof typeof BREAK.threatActors].references?.length > 0">
      <strong>{{ $t("references") }}:&nbsp;</strong>
      <ReferenceList type="threatActors" :entityKey="taKey" />
    </div>
    <div class="desc">
      <el-button type="primary" plain size="small" @click="openDetail(taKey)">
        {{ $t("viewDetail") }}
        <el-icon class="external-link-icon" aria-hidden="true"><TopRight /></el-icon>
      </el-button>
    </div>
  </el-drawer>

  <!-- 术语详情页 -->
  <TermDetail
    v-if="termDrawer"
    v-on:drawer-close="termDrawer = false"
    :drawer="termDrawer"
    :tKey="termKey"
  />
</template>

<style src="./drawer-detail-shared.css" scoped></style>
