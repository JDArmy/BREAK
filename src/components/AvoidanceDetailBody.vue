<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import BREAK from "@/BREAK";
import ReferenceList from "@/components/ReferenceList.vue";
import FeedbackLink from "@/components/FeedbackLink.vue";
import EntityLinkSection from "@/components/EntityLinkSection.vue";

import { TopRight } from "@element-plus/icons-vue";

import iconRelation from "./icons/iconRelation.vue";
import { useRelatedEntities } from "@/composables/useRelatedEntities";
import { entityDetailHref } from "@/utils/entityRoute";
import { getEntityEntry } from "@/BREAK/entityRegistry";
import { getMessageStringArray } from "@/utils/i18nMessage";
import { formatAvoidanceRelationNote } from "@/utils/relationNote";

/**
 * 规避手段详情 body（统一列表页 + 抽屉）。
 *
 * mode='list'：列表页纯文本 detail-id、FeedbackLink+文本关系图按钮、router-link relation-list、observer cases（avoidance 无 cases section）
 * mode='drawer'：抽屉 a detail-id+icon、icon关系图按钮+viewDetail、a@click relation-list、onMounted cases（avoidance 无 cases section）
 *
 * 导航回调通过 emit 传给调用方（抽屉开嵌套/新窗口，列表页不需要）。
 *
 * 与 Risk 差异：
 * - Avoidance 有 category/effectiveness/limitation 字段
 * - Avoidance 有 relatedAvoidances relation-list（同类嵌套）
 * - Avoidance→Risk 走新窗口（不嵌套回主抽屉），emit navigate-risk 由调用方开新窗口
 * - Avoidance 无 cases section（useRelatedCases 不支持 avoidance）
 * - Avoidance 无雷达图
 */
const props = defineProps<{
  aKey: string;
  mode: "list" | "drawer";
}>();

const emit = defineEmits<{
  /** 抽屉模式：点击关联规避手段（同类嵌套） */
  (e: "navigate-avoidance", key: string): void;
  /** 抽屉模式：点击关联风险（新窗口） */
  (e: "navigate-risk", key: string): void;
  /** 抽屉模式：点击关联攻击工具 */
  (e: "navigate-attackTool", key: string): void;
  /** 抽屉模式：点击关联术语 */
  (e: "navigate-term", key: string): void;
}>();

const router = useRouter();
const { locale, messages, t } = useI18n();

const isDrawer = computed(() => props.mode === "drawer");

const selectedAvoidance = computed(() => BREAK.avoidances[props.aKey as keyof typeof BREAK.avoidances]);
const selectedEffectiveness = computed(() => selectedAvoidance.value?.effectiveness);
const keywords = computed(() =>
  getMessageStringArray(messages.value[locale.value] as Record<string, unknown>, `BREAK.avoidances.${props.aKey}.keywords`),
);
const relatedAvoidanceRelations = computed(() => selectedAvoidance.value?.relatedAvoidances ?? []);
const getAvoidanceRelationNote = (relation: NonNullable<typeof relatedAvoidanceRelations.value>[number]) =>
  formatAvoidanceRelationNote(relation, locale.value, t);

// 反查：引用该规避手段的风险、攻击工具，以及关联该规避手段的术语
const relatedRiskKeys = useRelatedEntities(BREAK.risks, "avoidances", () => props.aKey);
const relatedAttackToolKeys = useRelatedEntities(BREAK.attackTools, "avoidances", () => props.aKey);
const relatedTerms = useRelatedEntities(BREAK.terms, "relatedAvoidances", () => props.aKey);

// 导航工具函数
const detailHref = (aKey: string) => entityDetailHref(router, aKey, "avoidance") ?? "";
const openRelationGraph = (aKey: string) => {
  const route = router.resolve({
    name: getEntityEntry("avoidance").relationPerspectiveRouteName,
    params: { entity: "avoidance", id: aKey },
  });
  window.open(route.href, "_blank", "noopener,noreferrer");
};
const openDetail = (aKey: string) => {
  window.open(detailHref(aKey), "_blank", "noopener,noreferrer");
};

// 抽屉模式的 onNavigate 回调（emit 给调用方）
const onNavigate = (event: "navigate-avoidance" | "navigate-risk" | "navigate-attackTool" | "navigate-term") => (key: string) => {
  emit(event, key);
};
</script>

<template>
  <article :class="['detail-panel', { 'drawer-detail-panel': isDrawer }]">
    <div class="detail-heading">
      <div>
        <div class="detail-id">{{ aKey }}</div>
        <h2>{{ $t(`BREAK.avoidances.${aKey}.title`) }}</h2>
      </div>
      <div class="detail-heading-actions">
        <!-- list: FeedbackLink + 文本关系图按钮 -->
        <template v-if="!isDrawer">
          <FeedbackLink :entity-id="aKey" :entity-title="$t(`BREAK.avoidances.${aKey}.title`)" />
          <el-button type="primary" size="small" @click="openRelationGraph(aKey)">
            {{ $t("openRelationGraph") }}
          </el-button>
        </template>
        <!-- drawer: icon 关系图按钮 + viewDetail 按钮 -->
        <template v-else>
          <el-button type="default" size="small" :title="$t('relationMap')" :aria-label="$t('relationMap')" class="relation-map-icon" @click="openRelationGraph(aKey)">
            <el-icon><icon-relation width="14px" height="14px" /></el-icon>
            {{ $t("relationMap") }}
          </el-button>
          <el-button type="primary" plain size="small" @click="openDetail(aKey)">
            {{ $t("viewDetail") }}
            <el-icon class="external-link-icon" aria-hidden="true"><TopRight /></el-icon>
          </el-button>
        </template>
      </div>
    </div>

    <section class="detail-grid avoidance-meta-grid" data-detail-anchor="avoidances">
      <div class="risk-meta-card avoidance-meta-card--definition">
        <h3>{{ $t("definition") }}</h3>
        <p>{{ $t(`BREAK.avoidances.${aKey}.definition`) }}</p>
      </div>
      <div v-if="selectedAvoidance?.category" class="risk-meta-card risk-meta-card--compact avoidance-meta-card--category">
        <h3>{{ $t("avoidanceCategory") }}</h3>
        <span class="knowledge-badge avoidance-category-badge" :class="`avoidance-category-${selectedAvoidance.category}`">
          {{ $t(`BREAK.avoidanceCategories.${selectedAvoidance.category}.title`) }}
        </span>
      </div>
      <div v-if="selectedEffectiveness" class="risk-meta-card risk-meta-card--compact avoidance-meta-card--effectiveness">
        <h3>{{ $t("avoidanceEffectiveness") }}</h3>
        <span class="knowledge-badge avoidance-effectiveness-badge" :class="`effectiveness-${selectedEffectiveness}`">
          {{ $t(`relationView.avoidanceEffectiveness.${selectedEffectiveness}`) }}
        </span>
      </div>
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

    <!-- 关联规避手段 relation-list -->
    <section v-if="relatedAvoidanceRelations.length" class="detail-section">
      <h3>{{ $t("avoidanceRelatedAvoidances") }}</h3>
      <div class="avoidance-relation-list">
        <!-- list: router-link / drawer: a @click.prevent emit -->
        <template v-for="relation in relatedAvoidanceRelations" :key="`${relation.key}-${relation.relation}`">
          <router-link
            v-if="!isDrawer"
            class="avoidance-relation-item"
            :to="{ name: 'knowledgesAvoidanceDetail', params: { aKey: relation.key } }"
          >
            <span class="avoidance-relation-title">{{ relation.key }}: {{ $t(`BREAK.avoidances.${relation.key}.title`) }}</span>
            <span class="avoidance-relation-note">
              <span class="avoidance-relation-type" :data-relation="relation.relation">{{ $t(`avoidanceRelationType.${relation.relation}`) }}</span>
              <span v-if="relation.note" class="avoidance-relation-note-text">{{ getAvoidanceRelationNote(relation) }}</span>
            </span>
          </router-link>
          <a
            v-else
            class="avoidance-relation-item"
            :href="detailHref(relation.key)"
            @click.prevent="$emit('navigate-avoidance', relation.key)"
          >
            <span class="avoidance-relation-title">{{ relation.key }}: {{ $t(`BREAK.avoidances.${relation.key}.title`) }}</span>
            <span class="avoidance-relation-note">
              <span class="avoidance-relation-type" :data-relation="relation.relation">{{ $t(`avoidanceRelationType.${relation.relation}`) }}</span>
              <span v-if="relation.note" class="avoidance-relation-note-text">{{ getAvoidanceRelationNote(relation) }}</span>
            </span>
          </a>
        </template>
      </div>
    </section>

    <!-- 关联实体表格（统一用 EntityLinkSection，抽屉传 onNavigate） -->
    <!-- Avoidance→Risk 走新窗口（不嵌套回主抽屉），emit navigate-risk 由调用方开新窗口 -->
    <EntityLinkSection
      :keys="relatedRiskKeys"
      title="risks"
      entity-type="risk"
      anchor="risks"
      :on-navigate="isDrawer ? onNavigate('navigate-risk') : undefined"
    />
    <EntityLinkSection
      :keys="relatedAttackToolKeys"
      title="attackTools"
      entity-type="attackTool"
      anchor="attack-tools"
      :on-navigate="isDrawer ? onNavigate('navigate-attackTool') : undefined"
    />
    <EntityLinkSection
      :keys="relatedTerms"
      title="terms"
      entity-type="term"
      anchor="terms"
      :on-navigate="isDrawer ? onNavigate('navigate-term') : undefined"
    />

    <section v-if="selectedAvoidance?.references?.length" class="detail-section" data-detail-anchor="references">
      <h3>{{ $t("references") }}</h3>
      <ReferenceList type="avoidances" :entity-key="aKey" />
    </section>
    <section v-if="selectedAvoidance?.updated" class="detail-section">
      <h3>{{ $t("lastUpdated") }}</h3>
      <p class="text-muted">{{ selectedAvoidance.updated }}</p>
    </section>
  </article>
</template>
