<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import BREAK from "@/BREAK";
import ReferenceList from "@/components/ReferenceList.vue";
import FeedbackLink from "@/components/FeedbackLink.vue";
import EntityLinkSection from "@/components/EntityLinkSection.vue";
import { getMessageStringArray, getNestedMessageValue } from "@/utils/i18nMessage";
import { entityDetailHref } from "@/utils/entityRoute";
import { createRecoverableAsyncComponent } from "@/utils/chunkLoadRecovery";

import { ArrowLeft, TopRight } from "@element-plus/icons-vue";
import { useDrawerWidth } from "@/composables/useDrawerWidth";

const AvoidanceDetail = createRecoverableAsyncComponent(() => import("@/components/AvoidanceDetail.vue"), undefined, "TermAvoidanceDetail");
const AttackToolDetail = createRecoverableAsyncComponent(() => import("@/components/AttackToolDetail.vue"), undefined, "TermAttackToolDetail");
const ThreatActorDetail = createRecoverableAsyncComponent(() => import("@/components/ThreatActorDetail.vue"), undefined, "TermThreatActorDetail");

const props = defineProps<{
  drawer: boolean;
  tKey: string;
}>();
defineEmits(["drawerClose"]);

const { locale, messages } = useI18n();
const { getInnerDrawerWidth } = useDrawerWidth();
const router = useRouter();

const localeMessages = computed(() => messages.value[locale.value] as Record<string, unknown>);
const getTermString = (termKey: string, field: string) =>
  getNestedMessageValue(localeMessages.value, `BREAK.terms.${termKey}.${field}`) as string | undefined;

const aliases = computed(() =>
  getMessageStringArray(localeMessages.value, `BREAK.terms.${props.tKey}.aliases`)
);
const keywords = computed(() =>
  getMessageStringArray(localeMessages.value, `BREAK.terms.${props.tKey}.keywords`)
);

const selectedTerm = computed(() => BREAK.terms[props.tKey as keyof typeof BREAK.terms]);

/**
 * 对 usageExample 文本中出现的术语名（title + aliases）进行高亮标记
 */
const highlightedUsageExample = computed(() => {
  const text = getTermString(props.tKey, "usageExample");
  if (!text) return "";

  const title = getTermString(props.tKey, "title");
  const highlightKeywords = [title, ...aliases.value].filter(Boolean) as string[];
  if (!highlightKeywords.length) return escapeHtml(text);

  highlightKeywords.sort((a, b) => b.length - a.length);
  const escaped = highlightKeywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`(${escaped.join("|")})`, "g");

  return escapeHtml(text).replace(regex, '<mark class="usage-highlight">$1</mark>');
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// 跳知识库详情页（新窗口）
const detailHref = computed(() => entityDetailHref(router, props.tKey, "term"));
const openDetail = () => {
  if (detailHref.value) window.open(detailHref.value, "_blank", "noopener,noreferrer");
};

// 嵌套抽屉：avoidance/attackTool/threatActor 开嵌套抽屉；risk 走新窗口（避免从 Term 嵌套回 Risk 主抽屉）
const avoidanceDrawer = ref(false);
const avoidanceKey = ref("");
const attackToolDrawer = ref(false);
const attackToolKey = ref("");
const threatActorDrawer = ref(false);
const threatActorKey = ref("");

const openRiskInNewWindow = (rKey: string) => {
  const href = entityDetailHref(router, rKey, "risk");
  if (href) window.open(href, "_blank", "noopener,noreferrer");
};
</script>

<template>
  <el-drawer
    v-if="tKey && BREAK.terms[tKey as keyof typeof BREAK.terms]"
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
        <span class="drawer-header-title">{{ $t("termDetail") }}</span>
        <FeedbackLink :entity-id="tKey" :entity-title="$t(`BREAK.terms.${tKey}.title`)" style="margin-left: auto" />
      </div>
    </template>
    <article class="detail-panel drawer-detail-panel">
      <div class="detail-heading">
        <div>
          <a :href="detailHref" target="_blank" rel="noopener" class="detail-id">
            {{ tKey }}
            <el-icon class="external-link-icon" aria-hidden="true"><TopRight /></el-icon>
          </a>
          <h2>{{ $t(`BREAK.terms.${tKey}.title`) }}</h2>
        </div>
        <div class="detail-heading-actions">
          <el-button type="primary" plain size="small" @click="openDetail()">
            {{ $t("viewDetail") }}
            <el-icon class="external-link-icon" aria-hidden="true"><TopRight /></el-icon>
          </el-button>
        </div>
      </div>

      <section v-if="selectedTerm?.category" class="detail-section">
        <h3>{{ $t("termCategory") }}</h3>
        <p>{{ $t(`BREAK.terms.${tKey}.category`) }}</p>
      </section>
      <section class="detail-section">
        <h3>{{ $t("definition") }}</h3>
        <p>{{ $t(`BREAK.terms.${tKey}.definition`) }}</p>
      </section>
      <section class="detail-section">
        <h3>{{ $t("description") }}</h3>
        <p>{{ $t(`BREAK.terms.${tKey}.description`) }}</p>
      </section>
      <section v-if="aliases.length" class="detail-section">
        <h3>{{ $t("aliases") }}</h3>
        <div class="keywords">
          <span v-for="alias in aliases" :key="alias" class="keyword-tag">{{ alias }}</span>
        </div>
      </section>
      <section v-if="keywords.length" class="detail-section">
        <h3>{{ $t("keywords") }}</h3>
        <div class="keywords">
          <span v-for="keyword in keywords" :key="keyword" class="keyword-tag">{{ keyword }}</span>
        </div>
      </section>
      <section v-if="selectedTerm?.usageExample" class="detail-section">
        <h3>{{ $t("usageExample") }}</h3>
        <p v-html="highlightedUsageExample" />
      </section>

      <EntityLinkSection
        v-if="selectedTerm?.relatedThreatActors?.length"
        :keys="selectedTerm.relatedThreatActors"
        title="threatActors"
        entity-type="threatActor"
        :on-navigate="(k) => { threatActorKey = k; threatActorDrawer = true; }"
      />
      <EntityLinkSection
        v-if="selectedTerm?.relatedAttackTools?.length"
        :keys="selectedTerm.relatedAttackTools"
        title="attackTools"
        entity-type="attackTool"
        :on-navigate="(k) => { attackToolKey = k; attackToolDrawer = true; }"
      />
      <EntityLinkSection
        v-if="selectedTerm?.relatedRisks?.length"
        :keys="selectedTerm.relatedRisks"
        title="risks"
        entity-type="risk"
        :on-navigate="openRiskInNewWindow"
      />
      <EntityLinkSection
        v-if="selectedTerm?.relatedAvoidances?.length"
        :keys="selectedTerm.relatedAvoidances"
        title="avoidances"
        entity-type="avoidance"
        :on-navigate="(k) => { avoidanceKey = k; avoidanceDrawer = true; }"
      />

      <section v-if="selectedTerm?.relatedBusinessScenes?.length" class="detail-section">
        <h3>{{ $t("businessScenes") }}</h3>
        <div class="entity-links">
          <router-link
            v-for="sceneKey in selectedTerm.relatedBusinessScenes"
            :key="sceneKey"
            :to="{ name: 'businessScene', params: { bsKey: sceneKey } }"
            class="entity-link"
          >
            {{ sceneKey }}: {{ $t(`BREAK.businessScenes.${sceneKey}.title`) }}
          </router-link>
        </div>
      </section>

      <section v-if="selectedTerm?.references?.length > 0" class="detail-section">
        <h3>{{ $t("references") }}</h3>
        <ReferenceList type="terms" :entity-key="tKey" />
      </section>
      <section v-if="selectedTerm?.updated" class="detail-section">
        <h3>{{ $t("lastUpdated") }}</h3>
        <p class="text-muted">{{ selectedTerm.updated }}</p>
      </section>
    </article>
  </el-drawer>

  <AvoidanceDetail
    v-if="avoidanceDrawer"
    v-on:drawer-close="avoidanceDrawer = false"
    :drawer="avoidanceDrawer"
    :aKey="avoidanceKey"
  />
  <AttackToolDetail
    v-if="attackToolDrawer"
    v-on:drawer-close="attackToolDrawer = false"
    :drawer="attackToolDrawer"
    :atKey="attackToolKey"
  />
  <ThreatActorDetail
    v-if="threatActorDrawer"
    v-on:drawer-close="threatActorDrawer = false"
    :drawer="threatActorDrawer"
    :taKey="threatActorKey"
  />
</template>

<style src="./drawer-detail-shared.css" scoped></style>

<style scoped>
:deep(.usage-highlight) {
  background: var(--break-bg-highlight, rgba(255, 213, 79, 0.4));
  color: inherit;
  padding: 0 2px;
  border-radius: 2px;
}
</style>
