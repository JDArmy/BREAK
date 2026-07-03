<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import BREAK from "@/BREAK";
import ReferenceList from "@/components/ReferenceList.vue";
import FeedbackLink from "@/components/FeedbackLink.vue";

import { ArrowLeft, TopRight } from "@element-plus/icons-vue";
import iconRelation from "./icons/iconRelation.vue";
import { useDrawerWidth } from "@/composables/useDrawerWidth";
import { entityDetailHref } from "@/utils/entityRoute";
import { getEntityEntry } from "@/BREAK/entityRegistry";
import { createRecoverableAsyncComponent } from "@/utils/chunkLoadRecovery";

const TermDetail = createRecoverableAsyncComponent(() => import("@/components/TermDetail.vue"), undefined, "AttackToolTermDetail");
const AvoidanceDetail = createRecoverableAsyncComponent(() => import("@/components/AvoidanceDetail.vue"), undefined, "AttackToolAvoidanceDetail");

const props = defineProps<{
  drawer: boolean;
  atKey: string;
}>();
defineEmits(["drawerClose"]);

const avoidanceDrawer = ref(false);
const avoidanceKey = ref("");
const termDrawer = ref(false);
const termKey = ref("");

const { getInnerDrawerWidth } = useDrawerWidth();

const selectedAttackTool = computed(() => BREAK.attackTools[props.atKey as keyof typeof BREAK.attackTools]);

// 缓存到当前 atKey，避免模板 v-if+v-for 重复取值/全表遍历
const attackToolAvoidances = computed(
  () => selectedAttackTool.value?.avoidances ?? []
);
const relatedAttackTools = computed(() => selectedAttackTool.value?.relatedAttackTools ?? []);

const relatedTerms = computed(() => {
  const atKey = props.atKey;
  return Object.keys(BREAK.terms).filter((tKey) =>
    BREAK.terms[tKey].relatedAttackTools.includes(atKey)
  );
});

const router = useRouter();

const openRelationGraph = (atKey: string) => {
  const entry = getEntityEntry("attackTool");
  const route = router.resolve({
    name: entry.relationPerspectiveRouteName,
    params: { entity: entry.relationKey, id: atKey },
  });
  window.open(route.href, "_blank", "noopener,noreferrer");
};

// 跳知识库详情页（新窗口）的 href
const detailHref = computed(() => entityDetailHref(router, props.atKey, "attackTool") ?? "");

// 新窗口打开知识库详情页
const openDetail = () => {
  if (detailHref.value) window.open(detailHref.value, "_blank", "noopener,noreferrer");
};
</script>

<template>
  <!-- 攻击工具详情页 -->
  <el-drawer
    v-if="atKey && BREAK.attackTools[atKey as keyof typeof BREAK.attackTools]"
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
        <FeedbackLink :entity-id="atKey" :entity-title="$t(`BREAK.attackTools.${atKey}.title`)" style="margin-left: auto" />
      </div>
    </template>
    <div class="desc">
      <strong>{{ $t("ID") }}:&nbsp;</strong>
      <a :href="detailHref" target="_blank" rel="noopener" class="id-link">
        {{ atKey }}
        <el-icon class="external-link-icon" aria-hidden="true"><TopRight /></el-icon>
      </a>
      <button :title="$t('relationMap')" :aria-label="$t('relationMap')" class="relation-map-icon" @click="openRelationGraph(atKey)">
        <icon-relation width="14px" height="14px" />
      </button>
    </div>
    <div class="desc">
      <strong>{{ $t("title") }}:&nbsp;</strong>
      {{ $t(`BREAK.attackTools.${atKey}.title`) }}
    </div>
    <div class="desc">
      <strong>{{ $t("description") }}:&nbsp;</strong>
      {{ $t(`BREAK.attackTools.${atKey}.description`) }}
    </div>
    <div class="desc" v-if="attackToolAvoidances.length > 0">
      <strong>{{ $t("avoidance") }}:&nbsp;</strong>
      <div class="entity-links">
        <button
          v-for="aKey in attackToolAvoidances"
          :key="aKey"
          class="entity-link"
          @click="avoidanceKey = aKey; avoidanceDrawer = true"
        >
          {{ aKey }}: {{ $t(`BREAK.avoidances.${aKey}.title`) }}
        </button>
      </div>
    </div>
    <div class="desc" v-if="relatedAttackTools.length > 0">
      <strong>{{ $t("attackToolRelatedAttackTools") }}:&nbsp;</strong>
      <div class="entity-links">
        <a
          v-for="relation in relatedAttackTools"
          :key="`${relation.key}-${relation.relation}`"
          class="entity-link"
          :href="entityDetailHref(router, relation.key, 'attackTool') ?? ''"
          target="_blank"
          rel="noopener"
        >
          {{ $t(`attackToolRelationType.${relation.relation}`) }} ·
          {{ relation.key }}: {{ $t(`BREAK.attackTools.${relation.key}.title`) }}
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
    <div class="desc" v-if="BREAK.attackTools[atKey as keyof typeof BREAK.attackTools].references?.length > 0">
      <strong>{{ $t("references") }}:&nbsp;</strong>
      <ReferenceList type="attackTools" :entityKey="atKey" />
    </div>
    <div class="desc">
      <el-button type="primary" plain size="small" @click="openDetail()">
        {{ $t("viewDetail") }}
        <el-icon class="external-link-icon" aria-hidden="true"><TopRight /></el-icon>
      </el-button>
    </div>
  </el-drawer>
  <!-- 手段详情页 -->
  <AvoidanceDetail
    v-if="avoidanceDrawer"
    v-on:drawer-close="avoidanceDrawer = false"
    :drawer="avoidanceDrawer"
    :aKey="avoidanceKey"
  />
  <!-- 术语详情页 -->
  <TermDetail
    v-if="termDrawer"
    v-on:drawer-close="termDrawer = false"
    :drawer="termDrawer"
    :tKey="termKey"
  />
</template>

<style src="./drawer-detail-shared.css" scoped></style>
