<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import BREAK from "@/BREAK";
import ReferenceList from "@/components/ReferenceList.vue";
import FeedbackLink from "@/components/FeedbackLink.vue";
import EntityLinkSection from "@/components/EntityLinkSection.vue";

import { TopRight } from "@element-plus/icons-vue";

import iconRelation from "./icons/iconRelation.vue";
import { useRelatedEntities } from "@/composables/useRelatedEntities";
import { useRelatedCases } from "@/composables/useRelatedCases";
import { entityDetailHref } from "@/utils/entityRoute";
import { getEntityEntry } from "@/BREAK/entityRegistry";
import { getMessageStringArray } from "@/utils/i18nMessage";
import { formatThreatActorRelationNote } from "@/utils/relationNote";

/**
 * 威胁行为者详情 body（统一列表页 + 抽屉）。
 *
 * mode='list'：列表页纯文本 detail-id、FeedbackLink+文本关系图按钮、router-link relation-list、observer cases
 * mode='drawer'：抽屉 a detail-id+icon、icon关系图按钮+viewDetail、a@click relation-list、onMounted cases
 *
 * 导航回调通过 emit 传给调用方（抽屉开嵌套/新窗口，列表页不需要）。
 *
 * 与 Risk/Avoidance/AttackTool 差异：
 * - ThreatActor 只有 description（无 definition）
 * - ThreatActor 有 relatedThreatActors relation-list（同类嵌套）
 * - ThreatActor→directCauseRisks/indirectSupportRisks 是正向字段，走新窗口（不嵌套回 Risk 主抽屉）
 * - ThreatActor→buildAttackTools/useAttackTools 是正向字段，嵌套 AttackTool
 * - ThreatActor 有 cases section（useRelatedCases 支持 threatActor）
 */
const props = defineProps<{
  taKey: string;
  mode: "list" | "drawer";
}>();

const emit = defineEmits<{
  /** 抽屉模式：点击关联威胁行为者（同类嵌套） */
  (e: "navigate-threatActor", key: string): void;
  /** 抽屉模式：点击关联风险（新窗口） */
  (e: "navigate-risk", key: string): void;
  /** 抽屉模式：点击关联攻击工具（嵌套，build+use） */
  (e: "navigate-attackTool", key: string): void;
  /** 抽屉模式：点击关联术语（嵌套） */
  (e: "navigate-term", key: string): void;
  /** 抽屉模式：点击关联案例（新窗口） */
  (e: "navigate-case", key: string): void;
}>();

const router = useRouter();
const { locale, messages, t } = useI18n();

const isDrawer = computed(() => props.mode === "drawer");

const selectedThreatActor = computed(() => BREAK.threatActors[props.taKey as keyof typeof BREAK.threatActors]);
const keywords = computed(() =>
  getMessageStringArray(messages.value[locale.value] as Record<string, unknown>, `BREAK.threatActors.${props.taKey}.keywords`),
);
const relatedThreatActorRelations = computed(() => selectedThreatActor.value?.relatedThreatActors ?? []);
const getThreatActorRelationNote = (relation: NonNullable<typeof relatedThreatActorRelations.value>[number]) =>
  formatThreatActorRelationNote(relation, locale.value, t);

// 反查：关联该威胁行为者的术语（relatedThreatActors 是正向字段，relatedTerms 是反查）
const relatedTerms = useRelatedEntities(BREAK.terms, "relatedThreatActors", () => props.taKey);

// 相关案例
const { relatedCases, ensureCases, cases, loaded, sectionRef: casesSectionRef } = useRelatedCases("threatActor", () => props.taKey);
// 抽屉模式：onMounted 立即加载；列表页：observer 懒加载（sectionRef 绑在 loading section 上）
if (isDrawer.value) {
  onMounted(() => { ensureCases(); });
}

// 导航工具函数
const detailHref = (taKey: string) => entityDetailHref(router, taKey, "threatActor") ?? "";
const openRelationGraph = (taKey: string) => {
  const route = router.resolve({
    name: getEntityEntry("threatActor").relationPerspectiveRouteName,
    params: { entity: "threat-actor", id: taKey },
  });
  window.open(route.href, "_blank", "noopener,noreferrer");
};
const openDetail = (taKey: string) => {
  window.open(detailHref(taKey), "_blank", "noopener,noreferrer");
};

// 抽屉模式的 onNavigate 回调（emit 给调用方）
const onNavigate = (event: "navigate-threatActor" | "navigate-risk" | "navigate-attackTool" | "navigate-term" | "navigate-case") => (key: string) => {
  emit(event, key);
};
</script>

<template>
  <article :class="['detail-panel', { 'drawer-detail-panel': isDrawer }]">
    <div class="detail-heading">
      <div>
        <!-- list: 纯文本 / drawer: a 新窗口 + icon -->
        <div v-if="!isDrawer" class="detail-id">{{ taKey }}</div>
        <a v-else :href="detailHref(taKey)" target="_blank" rel="noopener" class="detail-id">
          {{ taKey }}
          <el-icon class="external-link-icon" aria-hidden="true"><TopRight /></el-icon>
        </a>
        <h2>{{ $t(`BREAK.threatActors.${taKey}.title`) }}</h2>
      </div>
      <div class="detail-heading-actions">
        <!-- list: FeedbackLink + 文本关系图按钮 -->
        <template v-if="!isDrawer">
          <FeedbackLink :entity-id="taKey" :entity-title="$t(`BREAK.threatActors.${taKey}.title`)" />
          <el-button type="primary" size="small" @click="openRelationGraph(taKey)">
            {{ $t("openRelationGraph") }}
          </el-button>
        </template>
        <!-- drawer: icon 关系图按钮 + viewDetail 按钮 -->
        <template v-else>
          <el-button type="default" size="small" :title="$t('relationMap')" :aria-label="$t('relationMap')" class="relation-map-icon" @click="openRelationGraph(taKey)">
            <el-icon><icon-relation width="14px" height="14px" /></el-icon>
          </el-button>
          <el-button type="primary" plain size="small" @click="openDetail(taKey)">
            {{ $t("viewDetail") }}
            <el-icon class="external-link-icon" aria-hidden="true"><TopRight /></el-icon>
          </el-button>
        </template>
      </div>
    </div>

    <section class="detail-section" data-detail-anchor="threat-actors">
      <h3>{{ $t("description") }}</h3>
      <p>{{ $t(`BREAK.threatActors.${taKey}.description`) }}</p>
    </section>
    <section v-if="keywords.length" class="detail-section">
      <h3>{{ $t("keywords") }}</h3>
      <div class="keywords">
        <span v-for="keyword in keywords" :key="keyword" class="keyword-tag">{{ keyword }}</span>
      </div>
    </section>

    <!-- 关联威胁行为者 relation-list（同类嵌套） -->
    <section v-if="relatedThreatActorRelations.length" class="detail-section">
      <h3>{{ $t("threatActorRelatedThreatActors") }}</h3>
      <div class="threat-actor-relation-list">
        <!-- list: router-link / drawer: a @click.prevent emit -->
        <template v-for="relation in relatedThreatActorRelations" :key="`${relation.key}-${relation.relation}`">
          <router-link
            v-if="!isDrawer"
            class="threat-actor-relation-item"
            :to="{ name: 'knowledgesThreatActorDetail', params: { taKey: relation.key } }"
          >
            <span class="threat-actor-relation-type">{{ $t(`threatActorRelationType.${relation.relation}`) }}</span>
            <span class="threat-actor-relation-title">{{ relation.key }}: {{ $t(`BREAK.threatActors.${relation.key}.title`) }}</span>
            <span v-if="relation.note" class="threat-actor-relation-note">{{ getThreatActorRelationNote(relation) }}</span>
          </router-link>
          <a
            v-else
            class="threat-actor-relation-item"
            :href="detailHref(relation.key)"
            @click.prevent="$emit('navigate-threatActor', relation.key)"
          >
            <span class="threat-actor-relation-type">{{ $t(`threatActorRelationType.${relation.relation}`) }}</span>
            <span class="threat-actor-relation-title">{{ relation.key }}: {{ $t(`BREAK.threatActors.${relation.key}.title`) }}</span>
            <span v-if="relation.note" class="threat-actor-relation-note">{{ getThreatActorRelationNote(relation) }}</span>
          </a>
        </template>
      </div>
    </section>

    <!-- 关联实体表格（统一用 EntityLinkSection，抽屉传 onNavigate） -->
    <!-- directCauseRisks/indirectSupportRisks 是正向字段，走新窗口（不嵌套回 Risk 主抽屉） -->
    <EntityLinkSection
      :keys="selectedThreatActor?.directCauseRisks ?? []"
      title="relationLine.directCauseRisk"
      entity-type="risk"
      anchor="risks"
      :on-navigate="isDrawer ? onNavigate('navigate-risk') : undefined"
    />
    <EntityLinkSection
      :keys="selectedThreatActor?.indirectSupportRisks ?? []"
      title="relationLine.indirectSupportRisk"
      entity-type="risk"
      anchor="risks"
      :on-navigate="isDrawer ? onNavigate('navigate-risk') : undefined"
    />
    <!-- buildAttackTools/useAttackTools 是正向字段，嵌套 AttackTool -->
    <EntityLinkSection
      :keys="selectedThreatActor?.buildAttackTools ?? []"
      title="buildAttackTools"
      entity-type="attackTool"
      anchor="attack-tools"
      :on-navigate="isDrawer ? onNavigate('navigate-attackTool') : undefined"
    />
    <EntityLinkSection
      :keys="selectedThreatActor?.useAttackTools ?? []"
      title="useAttackTools"
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

    <!-- 相关案例 -->
    <section
      v-if="!loaded"
      ref="casesSectionRef"
      class="detail-section"
      data-detail-anchor="cases"
    >
      <h3>{{ $t("relatedCases") }}</h3>
      <div v-if="!loaded" class="entity-links">
        <span class="text-muted">{{ $t("loadingRelatedCases") }}</span>
        <!-- 列表页兜底：自动加载意外未触发时，可手动加载 -->
        <button v-if="!isDrawer" class="entity-link" @click="ensureCases()">{{ $t("loadRelatedCases") }}</button>
      </div>
    </section>
    <EntityLinkSection
      v-else
      :keys="relatedCases"
      title="relatedCases"
      entity-type="case"
      anchor="cases"
      :entity-records="cases"
      :on-navigate="isDrawer ? onNavigate('navigate-case') : undefined"
    />

    <section v-if="selectedThreatActor?.references?.length" class="detail-section" data-detail-anchor="references">
      <h3>{{ $t("references") }}</h3>
      <ReferenceList type="threatActors" :entity-key="taKey" />
    </section>
    <section v-if="selectedThreatActor?.updated" class="detail-section">
      <h3>{{ $t("lastUpdated") }}</h3>
      <p class="text-muted">{{ selectedThreatActor.updated }}</p>
    </section>
  </article>
</template>
