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
import { formatAttackToolRelationNote } from "@/utils/relationNote";

/**
 * 攻击工具详情 body（统一列表页 + 抽屉）。
 *
 * mode='list'：列表页纯文本 detail-id、FeedbackLink+文本关系图按钮、router-link relation-list、observer cases
 * mode='drawer'：抽屉 a detail-id+icon、icon关系图按钮+viewDetail、a@click relation-list、onMounted cases
 *
 * 导航回调通过 emit 传给调用方（抽屉开嵌套/新窗口，列表页不需要）。
 *
 * 与 Risk 差异：
 * - AttackTool 有 description（无 definition）
 * - AttackTool 有 relatedAttackTools relation-list（同类嵌套）
 * - AttackTool→Risk 走新窗口（不嵌套回主抽屉），directCauseRisks/indirectSupportRisks emit navigate-risk 由调用方开新窗口
 * - AttackTool 有 buildAttackTools/useAttackTools 反查 threatActor（嵌套）
 * - AttackTool 有 cases section（useRelatedCases 支持 attackTool）
 */
const props = defineProps<{
  atKey: string;
  mode: "list" | "drawer";
}>();

const emit = defineEmits<{
  /** 抽屉模式：点击关联攻击工具（同类嵌套） */
  (e: "navigate-attackTool", key: string): void;
  /** 抽屉模式：点击关联风险（新窗口） */
  (e: "navigate-risk", key: string): void;
  /** 抽屉模式：点击关联手段（嵌套） */
  (e: "navigate-avoidance", key: string): void;
  /** 抽屉模式：点击关联威胁行为者（嵌套，build+use） */
  (e: "navigate-threatActor", key: string): void;
  /** 抽屉模式：点击关联术语（嵌套） */
  (e: "navigate-term", key: string): void;
  /** 抽屉模式：点击关联案例（新窗口） */
  (e: "navigate-case", key: string): void;
}>();

const router = useRouter();
const { locale, messages, t } = useI18n();

const isDrawer = computed(() => props.mode === "drawer");

const selectedAttackTool = computed(() => BREAK.attackTools[props.atKey as keyof typeof BREAK.attackTools]);
const keywords = computed(() =>
  getMessageStringArray(messages.value[locale.value] as Record<string, unknown>, `BREAK.attackTools.${props.atKey}.keywords`),
);
const relatedAttackToolRelations = computed(() => selectedAttackTool.value?.relatedAttackTools ?? []);
const getAttackToolRelationNote = (relation: NonNullable<typeof relatedAttackToolRelations.value>[number]) =>
  formatAttackToolRelationNote(relation, locale.value, t);

// 反查：自建/使用该工具的威胁行为者，以及关联该工具的术语
const builderThreatActorKeys = useRelatedEntities(BREAK.threatActors, "buildAttackTools", () => props.atKey);
const userThreatActorKeys = useRelatedEntities(BREAK.threatActors, "useAttackTools", () => props.atKey);
const relatedTerms = useRelatedEntities(BREAK.terms, "relatedAttackTools", () => props.atKey);

// 相关案例
const { relatedCases, ensureCases, cases, loaded, sectionRef: casesSectionRef } = useRelatedCases("attackTool", () => props.atKey);
// 抽屉模式：onMounted 立即加载；列表页：observer 懒加载（sectionRef 绑在 loading section 上）
if (isDrawer.value) {
  onMounted(() => { ensureCases(); });
}

// 导航工具函数
const detailHref = (atKey: string) => entityDetailHref(router, atKey, "attackTool") ?? "";
const openRelationGraph = (atKey: string) => {
  const route = router.resolve({
    name: getEntityEntry("attackTool").relationPerspectiveRouteName,
    params: { entity: "attack-tool", id: atKey },
  });
  window.open(route.href, "_blank", "noopener,noreferrer");
};
const openDetail = (atKey: string) => {
  window.open(detailHref(atKey), "_blank", "noopener,noreferrer");
};

// 抽屉模式的 onNavigate 回调（emit 给调用方）
const onNavigate = (event: "navigate-attackTool" | "navigate-risk" | "navigate-avoidance" | "navigate-threatActor" | "navigate-term" | "navigate-case") => (key: string) => {
  emit(event, key);
};
</script>

<template>
  <article :class="['detail-panel', { 'drawer-detail-panel': isDrawer }]">
    <div class="detail-heading">
      <div>
        <div class="detail-id">{{ atKey }}</div>
        <h2>{{ $t(`BREAK.attackTools.${atKey}.title`) }}</h2>
      </div>
      <div class="detail-heading-actions">
        <!-- list: FeedbackLink + 文本关系图按钮 -->
        <template v-if="!isDrawer">
          <FeedbackLink :entity-id="atKey" :entity-title="$t(`BREAK.attackTools.${atKey}.title`)" />
          <el-button type="primary" size="small" @click="openRelationGraph(atKey)">
            {{ $t("openRelationGraph") }}
          </el-button>
        </template>
        <!-- drawer: icon 关系图按钮 + viewDetail 按钮 -->
        <template v-else>
          <el-button type="default" size="small" :title="$t('relationMap')" :aria-label="$t('relationMap')" class="relation-map-icon" @click="openRelationGraph(atKey)">
            <el-icon><icon-relation width="14px" height="14px" /></el-icon>
            {{ $t("relationMap") }}
          </el-button>
          <el-button type="primary" plain size="small" @click="openDetail(atKey)">
            {{ $t("viewDetail") }}
            <el-icon class="external-link-icon" aria-hidden="true"><TopRight /></el-icon>
          </el-button>
        </template>
      </div>
    </div>

    <section class="detail-section" data-detail-anchor="attack-tools">
      <h3>{{ $t("description") }}</h3>
      <p>{{ $t(`BREAK.attackTools.${atKey}.description`) }}</p>
    </section>
    <section v-if="keywords.length" class="detail-section">
      <h3>{{ $t("keywords") }}</h3>
      <div class="keywords">
        <span v-for="keyword in keywords" :key="keyword" class="keyword-tag">{{ keyword }}</span>
      </div>
    </section>

    <!-- AttackTool→Risk 走新窗口（不嵌套回主抽屉），emit navigate-risk 由调用方开新窗口 -->
    <EntityLinkSection
      :keys="selectedAttackTool?.directCauseRisks ?? []"
      title="relationLine.directCauseRisk"
      entity-type="risk"
      anchor="risks"
      :on-navigate="isDrawer ? onNavigate('navigate-risk') : undefined"
    />
    <EntityLinkSection
      :keys="selectedAttackTool?.indirectSupportRisks ?? []"
      title="relationLine.indirectSupportRisk"
      entity-type="risk"
      anchor="risks"
      :on-navigate="isDrawer ? onNavigate('navigate-risk') : undefined"
    />
    <EntityLinkSection
      :keys="selectedAttackTool?.avoidances ?? []"
      title="avoidance"
      entity-type="avoidance"
      anchor="avoidances"
      :on-navigate="isDrawer ? onNavigate('navigate-avoidance') : undefined"
    />

    <!-- 关联攻击工具 relation-list -->
    <section v-if="relatedAttackToolRelations.length" class="detail-section">
      <h3>{{ $t("attackToolRelatedAttackTools") }}</h3>
      <div class="attack-tool-relation-list">
        <!-- list: router-link / drawer: a @click.prevent emit -->
        <template v-for="relation in relatedAttackToolRelations" :key="`${relation.key}-${relation.relation}`">
          <router-link
            v-if="!isDrawer"
            class="attack-tool-relation-item"
            :to="{ name: 'knowledgesAttackToolDetail', params: { atKey: relation.key } }"
          >
            <span class="attack-tool-relation-title">{{ relation.key }}: {{ $t(`BREAK.attackTools.${relation.key}.title`) }}</span>
            <span class="attack-tool-relation-note">
              <span class="attack-tool-relation-type" :data-relation="relation.relation">{{ $t(`attackToolRelationType.${relation.relation}`) }}</span>
              <span v-if="relation.note" class="attack-tool-relation-note-text">{{ getAttackToolRelationNote(relation) }}</span>
            </span>
          </router-link>
          <a
            v-else
            class="attack-tool-relation-item"
            :href="detailHref(relation.key)"
            @click.prevent="$emit('navigate-attackTool', relation.key)"
          >
            <span class="attack-tool-relation-title">{{ relation.key }}: {{ $t(`BREAK.attackTools.${relation.key}.title`) }}</span>
            <span class="attack-tool-relation-note">
              <span class="attack-tool-relation-type" :data-relation="relation.relation">{{ $t(`attackToolRelationType.${relation.relation}`) }}</span>
              <span v-if="relation.note" class="attack-tool-relation-note-text">{{ getAttackToolRelationNote(relation) }}</span>
            </span>
          </a>
        </template>
      </div>
    </section>

    <!-- 关联实体表格（统一用 EntityLinkSection，抽屉传 onNavigate） -->
    <EntityLinkSection
      :keys="builderThreatActorKeys"
      title="buildAttackTools"
      entity-type="threatActor"
      anchor="threat-actors"
      :on-navigate="isDrawer ? onNavigate('navigate-threatActor') : undefined"
    />
    <EntityLinkSection
      :keys="userThreatActorKeys"
      title="useAttackTools"
      entity-type="threatActor"
      anchor="threat-actors"
      :on-navigate="isDrawer ? onNavigate('navigate-threatActor') : undefined"
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

    <section v-if="selectedAttackTool?.references?.length" class="detail-section" data-detail-anchor="references">
      <h3>{{ $t("references") }}</h3>
      <ReferenceList type="attackTools" :entity-key="atKey" />
    </section>
    <section v-if="selectedAttackTool?.updated" class="detail-section">
      <h3>{{ $t("lastUpdated") }}</h3>
      <p class="text-muted">{{ selectedAttackTool.updated }}</p>
    </section>
  </article>
</template>
