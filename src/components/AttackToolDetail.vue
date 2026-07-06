<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
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
import { useRelatedCases } from "@/composables/useRelatedCases";
import { entityDetailHref } from "@/utils/entityRoute";
import { getEntityEntry } from "@/BREAK/entityRegistry";
import { getMessageStringArray } from "@/utils/i18nMessage";
import { formatAttackToolRelationNote } from "@/utils/relationNote";
import { createRecoverableAsyncComponent } from "@/utils/chunkLoadRecovery";

const AvoidanceDetail = createRecoverableAsyncComponent(() => import("@/components/AvoidanceDetail.vue"), undefined, "AttackToolAvoidanceDetail");
const ThreatActorDetail = createRecoverableAsyncComponent(() => import("@/components/ThreatActorDetail.vue"), undefined, "AttackToolThreatActorDetail");
const TermDetail = createRecoverableAsyncComponent(() => import("@/components/TermDetail.vue"), undefined, "AttackToolTermDetail");

const props = defineProps<{
  drawer: boolean;
  atKey: string;
}>();
defineEmits(["drawerClose"]);

const router = useRouter();
const { locale, messages, t } = useI18n();
const { getInnerDrawerWidth } = useDrawerWidth();

const localeMessages = computed(() => messages.value[locale.value] as Record<string, unknown>);

const selectedAttackTool = computed(() => BREAK.attackTools[props.atKey as keyof typeof BREAK.attackTools]);

// 缓存到当前 atKey，避免模板 v-if+v-for 重复取值/全表遍历
const relatedAttackTools = computed(() => selectedAttackTool.value?.relatedAttackTools ?? []);
const getAttackToolRelationNote = (relation: NonNullable<typeof relatedAttackTools.value>[number]) =>
  formatAttackToolRelationNote(relation, locale.value, t);

// 关键词（缓存 computed，避免模板 v-if + v-for 重复调用 getMessageStringArray）
const keywords = computed(() =>
  getMessageStringArray(localeMessages.value, `BREAK.attackTools.${props.atKey}.keywords`),
);

// 反查：自建/使用该工具的威胁行为者，以及关联该工具的术语
const builderThreatActorKeys = useRelatedEntities(BREAK.threatActors, "buildAttackTools", () => props.atKey);
const userThreatActorKeys = useRelatedEntities(BREAK.threatActors, "useAttackTools", () => props.atKey);
const relatedTerms = useRelatedEntities(BREAK.terms, "relatedAttackTools", () => props.atKey);

// 相关案例（懒加载）：挂载时触发，不靠 observer（抽屉内无 .knowledge-detail 滚动容器）
const { relatedCases, ensureCases, cases, loaded } = useRelatedCases("attackTool", () => props.atKey);
onMounted(() => {
  ensureCases();
});

const openRelationGraph = (atKey: string) => {
  const entry = getEntityEntry("attackTool");
  const route = router.resolve({
    name: entry.relationPerspectiveRouteName,
    params: { entity: entry.relationKey, id: atKey },
  });
  window.open(route.href, "_blank", "noopener,noreferrer");
};

// 跳知识库详情页（新窗口）的 href
const detailHref = (atKey: string) => entityDetailHref(router, atKey, "attackTool") ?? "";

// 新窗口打开知识库详情页
const openDetail = (atKey: string) => {
  window.open(detailHref(atKey), "_blank", "noopener,noreferrer");
};

// risk 走新窗口（避免从 AttackTool 嵌套回 Risk 主抽屉）
const openRiskInNewWindow = (rKey: string) => {
  const href = entityDetailHref(router, rKey, "risk");
  if (href) window.open(href, "_blank", "noopener,noreferrer");
};
// case 走新窗口（无 case 嵌套抽屉）
const openCaseInNewWindow = (cKey: string) => {
  const href = entityDetailHref(router, cKey, "case");
  if (href) window.open(href, "_blank", "noopener,noreferrer");
};

// 嵌套抽屉：avoidance/threatActor/term 开嵌套抽屉；risk/case 走新窗口
const avoidanceDrawer = ref(false);
const avoidanceKey = ref("");
const threatActorDrawer = ref(false);
const threatActorKey = ref("");
const termDrawer = ref(false);
const termKey = ref("");
</script>

<template>
  <!-- 攻击工具详情页 -->
  <el-drawer
    v-if="atKey && BREAK.attackTools[atKey as keyof typeof BREAK.attackTools]"
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
        <span class="drawer-header-title">{{ $t('attackTools') }}</span>
        <FeedbackLink :entity-id="atKey" :entity-title="$t(`BREAK.attackTools.${atKey}.title`)" style="margin-left: auto" />
      </div>
    </template>
    <article class="detail-panel drawer-detail-panel">
      <div class="detail-heading">
        <div>
          <a :href="detailHref(atKey)" target="_blank" rel="noopener" class="detail-id">
            {{ atKey }}
            <el-icon class="external-link-icon" aria-hidden="true"><TopRight /></el-icon>
          </a>
          <h2>{{ $t(`BREAK.attackTools.${atKey}.title`) }}</h2>
        </div>
        <div class="detail-heading-actions">
          <button :title="$t('relationMap')" :aria-label="$t('relationMap')" class="relation-map-icon" @click="openRelationGraph(atKey)">
            <icon-relation width="14px" height="14px" />
          </button>
          <el-button type="primary" plain size="small" @click="openDetail(atKey)">
            {{ $t("viewDetail") }}
            <el-icon class="external-link-icon" aria-hidden="true"><TopRight /></el-icon>
          </el-button>
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
      <DrawerEntityLinkSection
        v-if="selectedAttackTool?.directCauseRisks?.length"
        :keys="selectedAttackTool.directCauseRisks"
        title="relationLine.directCauseRisk"
        entity-type="risk"
        :on-navigate="openRiskInNewWindow"
      />
      <DrawerEntityLinkSection
        v-if="selectedAttackTool?.indirectSupportRisks?.length"
        :keys="selectedAttackTool.indirectSupportRisks"
        title="relationLine.indirectSupportRisk"
        entity-type="risk"
        :on-navigate="openRiskInNewWindow"
      />
      <DrawerEntityLinkSection
        v-if="selectedAttackTool?.avoidances?.length"
        :keys="selectedAttackTool.avoidances"
        title="avoidance"
        entity-type="avoidance"
        :on-navigate="(k) => { avoidanceKey = k; avoidanceDrawer = true; }"
      />
      <section v-if="relatedAttackTools.length" class="detail-section">
        <h3>{{ $t("attackToolRelatedAttackTools") }}</h3>
        <div class="attack-tool-relation-list">
          <a
            v-for="relation in relatedAttackTools"
            :key="`${relation.key}-${relation.relation}`"
            class="attack-tool-relation-item"
            :href="detailHref(relation.key)"
            target="_blank"
            rel="noopener"
          >
            <span class="attack-tool-relation-type">{{ $t(`attackToolRelationType.${relation.relation}`) }}</span>
            <span class="attack-tool-relation-title">
              {{ relation.key }}: {{ $t(`BREAK.attackTools.${relation.key}.title`) }}
            </span>
            <span v-if="relation.note" class="attack-tool-relation-note">{{ getAttackToolRelationNote(relation) }}</span>
          </a>
        </div>
      </section>
      <DrawerEntityLinkSection
        :keys="builderThreatActorKeys"
        title="buildAttackTools"
        entity-type="threatActor"
        :on-navigate="(k) => { threatActorKey = k; threatActorDrawer = true; }"
      />
      <DrawerEntityLinkSection
        :keys="userThreatActorKeys"
        title="useAttackTools"
        entity-type="threatActor"
        :on-navigate="(k) => { threatActorKey = k; threatActorDrawer = true; }"
      />
      <DrawerEntityLinkSection
        :keys="relatedTerms"
        title="terms"
        entity-type="term"
        :on-navigate="(k) => { termKey = k; termDrawer = true; }"
      />
      <section v-if="!loaded" class="detail-section" data-detail-anchor="cases">
        <h3>{{ $t("relatedCases") }}</h3>
        <span class="text-muted">{{ $t("loadingRelatedCases") }}</span>
      </section>
      <DrawerEntityLinkSection
        v-else
        :keys="relatedCases"
        title="relatedCases"
        entity-type="case"
        :entity-records="cases"
        :on-navigate="openCaseInNewWindow"
      />

      <section v-if="BREAK.attackTools[atKey as keyof typeof BREAK.attackTools].references?.length > 0" class="detail-section" data-detail-anchor="references">
        <h3>{{ $t("references") }}</h3>
        <ReferenceList type="attackTools" :entityKey="atKey" />
      </section>
      <section v-if="selectedAttackTool?.updated" class="detail-section">
        <h3>{{ $t("lastUpdated") }}</h3>
        <p class="text-muted">{{ selectedAttackTool.updated }}</p>
      </section>
    </article>
  </el-drawer>

  <!-- 手段详情页 -->
  <AvoidanceDetail
    v-if="avoidanceDrawer"
    v-on:drawer-close="avoidanceDrawer = false"
    :drawer="avoidanceDrawer"
    :aKey="avoidanceKey"
  />
  <!-- 威胁行为者详情页 -->
  <ThreatActorDetail
    v-if="threatActorDrawer"
    v-on:drawer-close="threatActorDrawer = false"
    :drawer="threatActorDrawer"
    :taKey="threatActorKey"
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
