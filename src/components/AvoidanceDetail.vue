<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import BREAK from "@/BREAK";
import ReferenceList from "@/components/ReferenceList.vue";
import FeedbackLink from "@/components/FeedbackLink.vue";

import { ArrowLeft, TopRight } from "@element-plus/icons-vue";
import iconRelation from "./icons/iconRelation.vue";
import { useDrawerWidth } from "@/composables/useDrawerWidth";
import { useRelatedEntities } from "@/composables/useRelatedEntities";
import { entityDetailHref } from "@/utils/entityRoute";
import { getEntityEntry } from "@/BREAK/entityRegistry";
import { createRecoverableAsyncComponent } from "@/utils/chunkLoadRecovery";

const TermDetail = createRecoverableAsyncComponent(() => import("@/components/TermDetail.vue"), undefined, "AvoidanceTermDetail");

const props = defineProps<{
  drawer: boolean;
  aKey: string;
}>();
defineEmits(["drawerClose"]);

const router = useRouter();
const { getInnerDrawerWidth } = useDrawerWidth();

const openRelationGraph = (aKey: string) => {
  const route = router.resolve({
    name: getEntityEntry("avoidance").relationPerspectiveRouteName,
    params: { entity: "avoidance", id: aKey },
  });
  window.open(route.href, "_blank", "noopener,noreferrer");
};

// 跳知识库详情页（新窗口）的 href
const detailHref = (aKey: string) => entityDetailHref(router, aKey, "avoidance");

// 新窗口打开知识库详情页
const openDetail = (aKey: string) => {
  window.open(detailHref(aKey)!, "_blank", "noopener,noreferrer");
};

// 反查：用 useRelatedEntities 统一工厂，避免手写全表 filter
const relatedTerms = useRelatedEntities(
  BREAK.terms as unknown as Record<string, Record<string, unknown>>,
  "relatedAvoidances",
  () => props.aKey,
);

const selectedAvoidance = computed(() => BREAK.avoidances[props.aKey as keyof typeof BREAK.avoidances]);
const relatedAvoidances = computed(() => selectedAvoidance.value?.relatedAvoidances ?? []);

const termDrawer = ref(false);
const termKey = ref("");
</script>

<template>
  <!-- 手段详情页 -->
  <el-drawer
    v-if="aKey && BREAK.avoidances[aKey as keyof typeof BREAK.avoidances]"
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
        <FeedbackLink :entity-id="aKey" :entity-title="$t(`BREAK.avoidances.${aKey}.title`)" style="margin-left: auto" />
      </div>
    </template>
    <div class="desc">
      <strong>{{ $t("ID") }}:&nbsp;</strong>
      <a :href="detailHref(aKey)" target="_blank" rel="noopener" class="id-link">
        {{ aKey }}
        <el-icon class="external-link-icon" aria-hidden="true"><TopRight /></el-icon>
      </a>
      <button :title="$t('relationMap')" :aria-label="$t('relationMap')" class="relation-map-icon" @click="openRelationGraph(aKey)">
        <icon-relation width="14px" height="14px" />
      </button>
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
    <div class="desc" v-if="selectedAvoidance?.effectiveness">
      <strong>{{ $t("avoidanceEffectiveness") }}:&nbsp;</strong>
      {{ $t(`relationView.avoidanceEffectiveness.${selectedAvoidance.effectiveness}`) }}
    </div>
    <div class="desc" v-if="relatedAvoidances.length > 0">
      <strong>{{ $t("avoidanceRelatedAvoidances") }}:&nbsp;</strong>
      <div class="entity-links">
        <a
          v-for="relation in relatedAvoidances"
          :key="`${relation.key}-${relation.relation}`"
          class="entity-link"
          :href="detailHref(relation.key)"
          target="_blank"
          rel="noopener"
        >
          {{ $t(`avoidanceRelationType.${relation.relation}`) }} ·
          {{ relation.key }}: {{ $t(`BREAK.avoidances.${relation.key}.title`) }}
          <el-icon class="external-link-icon" aria-hidden="true"><TopRight /></el-icon>
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
    <div class="desc" v-if="BREAK.avoidances[aKey as keyof typeof BREAK.avoidances].references?.length > 0">
      <strong>{{ $t("references") }}:&nbsp;</strong>
      <ReferenceList type="avoidances" :entityKey="aKey" />
    </div>
    <div class="desc">
      <el-button type="primary" plain size="small" @click="openDetail(aKey)">
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
