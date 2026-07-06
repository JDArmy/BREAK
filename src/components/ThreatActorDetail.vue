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
import { formatThreatActorRelationNote } from "@/utils/relationNote";
import { createRecoverableAsyncComponent } from "@/utils/chunkLoadRecovery";

const AttackToolDetail = createRecoverableAsyncComponent(() => import("@/components/AttackToolDetail.vue"), undefined, "ThreatActorAttackToolDetail");
const TermDetail = createRecoverableAsyncComponent(() => import("@/components/TermDetail.vue"), undefined, "ThreatActorTermDetail");
// 自引用：ThreatActor→Related ThreatActor 开嵌套抽屉
const ThreatActorDetail = createRecoverableAsyncComponent(() => import("@/components/ThreatActorDetail.vue"), undefined, "ThreatActorNestedThreatActorDetail");

const props = defineProps<{
  drawer: boolean;
  taKey: string;
}>();
defineEmits(["drawerClose"]);

const router = useRouter();
const { locale, messages, t } = useI18n();
const { getInnerDrawerWidth } = useDrawerWidth();

const localeMessages = computed(() => messages.value[locale.value] as Record<string, unknown>);

const selectedThreatActor = computed(() => BREAK.threatActors[props.taKey as keyof typeof BREAK.threatActors]);
const relatedThreatActors = computed(() => selectedThreatActor.value?.relatedThreatActors ?? []);
const getThreatActorRelationNote = (relation: NonNullable<typeof relatedThreatActors.value>[number]) =>
  formatThreatActorRelationNote(relation, locale.value, t);

// 关键词（缓存 computed，避免模板 v-if + v-for 重复调用 getMessageStringArray）
const keywords = computed(() =>
  getMessageStringArray(localeMessages.value, `BREAK.threatActors.${props.taKey}.keywords`),
);

// 反查：关联该威胁行为者的术语
const relatedTerms = useRelatedEntities(BREAK.terms, "relatedThreatActors", () => props.taKey);

// 相关案例（懒加载）：挂载时触发，不靠 observer（抽屉内无 .knowledge-detail 滚动容器）
const { relatedCases, ensureCases, cases, loaded } = useRelatedCases("threatActor", () => props.taKey);
onMounted(() => {
  ensureCases();
});

const openRelationGraph = (taKey: string) => {
  const route = router.resolve({
    name: getEntityEntry("threatActor").relationPerspectiveRouteName,
    params: { entity: "threat-actor", id: taKey },
  });
  window.open(route.href, "_blank", "noopener,noreferrer");
};

// 跳知识库详情页（新窗口）的 href
const detailHref = (taKey: string) => entityDetailHref(router, taKey, "threatActor") ?? "";

// 新窗口打开知识库详情页
const openDetail = (taKey: string) => {
  window.open(detailHref(taKey), "_blank", "noopener,noreferrer");
};

// risk 走新窗口（避免从 ThreatActor 嵌套回 Risk 主抽屉）
const openRiskInNewWindow = (rKey: string) => {
  const href = entityDetailHref(router, rKey, "risk");
  if (href) window.open(href, "_blank", "noopener,noreferrer");
};
// case 走新窗口（无 case 嵌套抽屉）
const openCaseInNewWindow = (cKey: string) => {
  const href = entityDetailHref(router, cKey, "case");
  if (href) window.open(href, "_blank", "noopener,noreferrer");
};

// 嵌套抽屉：attackTool/term/同类 threatActor 开嵌套抽屉；risk/case 走新窗口
const attackToolDrawer = ref(false);
const attackToolKey = ref("");
const termDrawer = ref(false);
const termKey = ref("");
// 同类嵌套：ThreatActor→Related ThreatActor 开嵌套抽屉
const nestedThreatActorDrawer = ref(false);
const nestedThreatActorKey = ref("");
</script>

<template>
  <!-- 威胁行为者详情页 -->
  <el-drawer
    v-if="taKey && BREAK.threatActors[taKey as keyof typeof BREAK.threatActors]"
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
        <span class="drawer-header-title">{{ $t('threatActors') }}</span>
        <FeedbackLink :entity-id="taKey" :entity-title="$t(`BREAK.threatActors.${taKey}.title`)" style="margin-left: auto" />
      </div>
    </template>
    <article class="detail-panel drawer-detail-panel">
      <div class="detail-heading">
        <div>
          <a :href="detailHref(taKey)" target="_blank" rel="noopener" class="detail-id">
            {{ taKey }}
            <el-icon class="external-link-icon" aria-hidden="true"><TopRight /></el-icon>
          </a>
          <h2>{{ $t(`BREAK.threatActors.${taKey}.title`) }}</h2>
        </div>
        <div class="detail-heading-actions">
          <button :title="$t('relationMap')" :aria-label="$t('relationMap')" class="relation-map-icon" @click="openRelationGraph(taKey)">
            <icon-relation width="14px" height="14px" />
          </button>
          <el-button type="primary" plain size="small" @click="openDetail(taKey)">
            {{ $t("viewDetail") }}
            <el-icon class="external-link-icon" aria-hidden="true"><TopRight /></el-icon>
          </el-button>
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
      <DrawerEntityLinkSection
        v-if="selectedThreatActor?.directCauseRisks?.length"
        :keys="selectedThreatActor.directCauseRisks"
        title="relationLine.directCauseRisk"
        entity-type="risk"
        :on-navigate="openRiskInNewWindow"
      />
      <DrawerEntityLinkSection
        v-if="selectedThreatActor?.indirectSupportRisks?.length"
        :keys="selectedThreatActor.indirectSupportRisks"
        title="relationLine.indirectSupportRisk"
        entity-type="risk"
        :on-navigate="openRiskInNewWindow"
      />
      <DrawerEntityLinkSection
        v-if="selectedThreatActor?.buildAttackTools?.length"
        :keys="selectedThreatActor.buildAttackTools"
        title="buildAttackTools"
        entity-type="attackTool"
        :on-navigate="(k) => { attackToolKey = k; attackToolDrawer = true; }"
      />
      <DrawerEntityLinkSection
        v-if="selectedThreatActor?.useAttackTools?.length"
        :keys="selectedThreatActor.useAttackTools"
        title="useAttackTools"
        entity-type="attackTool"
        :on-navigate="(k) => { attackToolKey = k; attackToolDrawer = true; }"
      />
      <section v-if="relatedThreatActors.length" class="detail-section">
        <h3>{{ $t("threatActorRelatedThreatActors") }}</h3>
        <div class="threat-actor-relation-list">
          <a
            v-for="relation in relatedThreatActors"
            :key="`${relation.key}-${relation.relation}`"
            class="threat-actor-relation-item"
            :href="detailHref(relation.key)"
            @click.prevent="nestedThreatActorKey = relation.key; nestedThreatActorDrawer = true"
          >
            <span class="threat-actor-relation-type">{{ $t(`threatActorRelationType.${relation.relation}`) }}</span>
            <span class="threat-actor-relation-title">
              {{ relation.key }}: {{ $t(`BREAK.threatActors.${relation.key}.title`) }}
            </span>
            <span v-if="relation.note" class="threat-actor-relation-note">{{ getThreatActorRelationNote(relation) }}</span>
          </a>
        </div>
      </section>
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

      <section v-if="BREAK.threatActors[taKey as keyof typeof BREAK.threatActors].references?.length > 0" class="detail-section" data-detail-anchor="references">
        <h3>{{ $t("references") }}</h3>
        <ReferenceList type="threatActors" :entityKey="taKey" />
      </section>
      <section v-if="selectedThreatActor?.updated" class="detail-section">
        <h3>{{ $t("lastUpdated") }}</h3>
        <p class="text-muted">{{ selectedThreatActor.updated }}</p>
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
  <!-- 同类嵌套：关联行为者开嵌套抽屉 -->
  <ThreatActorDetail
    v-if="nestedThreatActorDrawer"
    v-on:drawer-close="nestedThreatActorDrawer = false"
    :drawer="nestedThreatActorDrawer"
    :taKey="nestedThreatActorKey"
  />
</template>

<style src="./drawer-detail-shared.css" scoped></style>
