<script setup lang="ts">
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import BREAK from "@/BREAK";
import ReferenceList from "@/components/ReferenceList.vue";
import FeedbackLink from "@/components/FeedbackLink.vue";
import DrawerEntityLinkSection from "@/components/DrawerEntityLinkSection.vue";

import { ArrowLeft, TopRight } from "@element-plus/icons-vue";
import iconRelation from "./icons/iconRelation.vue";
import { useDrawerWidth } from "@/composables/useDrawerWidth";
import { useRelatedEntities } from "@/composables/useRelatedEntities";
import { entityDetailHref } from "@/utils/entityRoute";
import { getEntityEntry } from "@/BREAK/entityRegistry";
import { getMessageStringArray } from "@/utils/i18nMessage";
import { formatAvoidanceRelationNote } from "@/utils/relationNote";
import { createRecoverableAsyncComponent } from "@/utils/chunkLoadRecovery";

const AttackToolDetail = createRecoverableAsyncComponent(() => import("@/components/AttackToolDetail.vue"), undefined, "AvoidanceAttackToolDetail");
const TermDetail = createRecoverableAsyncComponent(() => import("@/components/TermDetail.vue"), undefined, "AvoidanceTermDetail");

const props = defineProps<{
  drawer: boolean;
  aKey: string;
}>();
defineEmits(["drawerClose"]);

const router = useRouter();
const { locale, messages, t } = useI18n();
const { getInnerDrawerWidth } = useDrawerWidth();

const localeMessages = computed(() => messages.value[locale.value] as Record<string, unknown>);

const openRelationGraph = (aKey: string) => {
  const route = router.resolve({
    name: getEntityEntry("avoidance").relationPerspectiveRouteName,
    params: { entity: "avoidance", id: aKey },
  });
  window.open(route.href, "_blank", "noopener,noreferrer");
};

// 跳知识库详情页（新窗口）的 href
const detailHref = (aKey: string) => entityDetailHref(router, aKey, "avoidance") ?? "";

// 新窗口打开知识库详情页
const openDetail = (aKey: string) => {
  window.open(detailHref(aKey), "_blank", "noopener,noreferrer");
};

const selectedAvoidance = computed(() => BREAK.avoidances[props.aKey as keyof typeof BREAK.avoidances]);
const relatedAvoidances = computed(() => selectedAvoidance.value?.relatedAvoidances ?? []);
const getAvoidanceRelationNote = (relation: NonNullable<typeof relatedAvoidances.value>[number]) =>
  formatAvoidanceRelationNote(relation, locale.value, t);

// 关键词（缓存 computed，避免模板 v-if + v-for 重复调用 getMessageStringArray）
const keywords = computed(() =>
  getMessageStringArray(localeMessages.value, `BREAK.avoidances.${props.aKey}.keywords`),
);

// 反查：用 useRelatedEntities 统一工厂，避免手写全表 filter
const relatedRiskKeys = useRelatedEntities(BREAK.risks, "avoidances", () => props.aKey);
const relatedAttackToolKeys = useRelatedEntities(BREAK.attackTools, "avoidances", () => props.aKey);
const relatedTerms = useRelatedEntities(BREAK.terms, "relatedAvoidances", () => props.aKey);

// risk 走新窗口（避免从 Avoidance 嵌套回 Risk 主抽屉）
const openRiskInNewWindow = (rKey: string) => {
  const href = entityDetailHref(router, rKey, "risk");
  if (href) window.open(href, "_blank", "noopener,noreferrer");
};

// 嵌套抽屉：attackTool/term 开嵌套抽屉；avoidance 不嵌套同类 avoidance，不嵌套 risk
const attackToolDrawer = ref(false);
const attackToolKey = ref("");
const termDrawer = ref(false);
const termKey = ref("");
</script>

<template>
  <!-- 手段详情页 -->
  <el-drawer
    v-if="aKey && BREAK.avoidances[aKey as keyof typeof BREAK.avoidances]"
    :model-value="drawer"
    @closed="$emit('drawerClose')"
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
    <article class="detail-panel drawer-detail-panel">
      <div class="detail-heading">
        <div>
          <a :href="detailHref(aKey)" target="_blank" rel="noopener" class="detail-id">
            {{ aKey }}
            <el-icon class="external-link-icon" aria-hidden="true"><TopRight /></el-icon>
          </a>
          <h2>{{ $t(`BREAK.avoidances.${aKey}.title`) }}</h2>
        </div>
        <div class="detail-heading-actions">
          <button :title="$t('relationMap')" :aria-label="$t('relationMap')" class="relation-map-icon" @click="openRelationGraph(aKey)">
            <icon-relation width="14px" height="14px" />
          </button>
          <el-button type="primary" plain size="small" @click="openDetail(aKey)">
            {{ $t("viewDetail") }}
            <el-icon class="external-link-icon" aria-hidden="true"><TopRight /></el-icon>
          </el-button>
        </div>
      </div>

      <section class="detail-section" data-detail-anchor="avoidances">
        <h3>{{ $t("definition") }}</h3>
        <p>{{ $t(`BREAK.avoidances.${aKey}.definition`) }}</p>
      </section>
      <section class="detail-section">
        <h3>{{ $t("description") }}</h3>
        <p>{{ $t(`BREAK.avoidances.${aKey}.description`) }}</p>
      </section>
      <section v-if="$t(`BREAK.avoidances.${aKey}.limitation`)" class="detail-section">
        <h3>{{ $t("limitation") }}</h3>
        <p>{{ $t(`BREAK.avoidances.${aKey}.limitation`) }}</p>
      </section>
      <section v-if="keywords.length" class="detail-section">
        <h3>{{ $t("keywords") }}</h3>
        <div class="keywords">
          <span v-for="keyword in keywords" :key="keyword" class="keyword-tag">{{ keyword }}</span>
        </div>
      </section>
      <section v-if="selectedAvoidance?.category" class="detail-section">
        <h3>{{ $t("menu.avoidances") }}</h3>
        <p>
          {{ selectedAvoidance.category }}:
          {{ $t(`BREAK.avoidanceCategories.${selectedAvoidance.category}.title`) }}
        </p>
      </section>
      <section v-if="selectedAvoidance?.effectiveness" class="detail-section">
        <h3>{{ $t("avoidanceEffectiveness") }}</h3>
        <p>{{ $t(`relationView.avoidanceEffectiveness.${selectedAvoidance.effectiveness}`) }}</p>
      </section>
      <section v-if="relatedAvoidances.length" class="detail-section">
        <h3>{{ $t("avoidanceRelatedAvoidances") }}</h3>
        <div class="avoidance-relation-list">
          <a
            v-for="relation in relatedAvoidances"
            :key="`${relation.key}-${relation.relation}`"
            class="avoidance-relation-item"
            :href="detailHref(relation.key)"
            target="_blank"
            rel="noopener"
          >
            <span class="avoidance-relation-type">{{ $t(`avoidanceRelationType.${relation.relation}`) }}</span>
            <span class="avoidance-relation-title">
              {{ relation.key }}: {{ $t(`BREAK.avoidances.${relation.key}.title`) }}
            </span>
            <span v-if="relation.note" class="avoidance-relation-note">{{ getAvoidanceRelationNote(relation) }}</span>
          </a>
        </div>
      </section>

      <DrawerEntityLinkSection
        :keys="relatedRiskKeys"
        title="risks"
        entity-type="risk"
        :on-navigate="openRiskInNewWindow"
      />
      <DrawerEntityLinkSection
        :keys="relatedAttackToolKeys"
        title="attackTools"
        entity-type="attackTool"
        :on-navigate="(k) => { attackToolKey = k; attackToolDrawer = true; }"
      />
      <DrawerEntityLinkSection
        :keys="relatedTerms"
        title="terms"
        entity-type="term"
        :on-navigate="(k) => { termKey = k; termDrawer = true; }"
      />

      <section v-if="BREAK.avoidances[aKey as keyof typeof BREAK.avoidances].references?.length > 0" class="detail-section" data-detail-anchor="references">
        <h3>{{ $t("references") }}</h3>
        <ReferenceList type="avoidances" :entityKey="aKey" />
      </section>
      <section v-if="selectedAvoidance?.updated" class="detail-section">
        <h3>{{ $t("lastUpdated") }}</h3>
        <p class="text-muted">{{ selectedAvoidance.updated }}</p>
      </section>
    </article>
  </el-drawer>

  <!-- 攻击工具详情页 -->
  <AttackToolDetail
    v-if="attackToolDrawer"
    v-on:drawer-close="attackToolDrawer = false"
    :drawer="attackToolDrawer"
    :atKey="attackToolKey"
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
