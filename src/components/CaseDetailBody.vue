<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import FeedbackLink from "@/components/FeedbackLink.vue";
import EntityLinkSection from "@/components/EntityLinkSection.vue";
import { Link, TopRight } from "@element-plus/icons-vue";
import { useCases } from "@/composables/useCases";
import { entityDetailHref } from "@/utils/entityRoute";

/**
 * 案例详情 body（统一列表页 + 抽屉）。
 *
 * Case 特殊：references 手写 inline（case 数据不进 BREAK 索引，无法用 ReferenceList）。
 * cases 数据来自 useCases（异步懒加载），body 自包含取数。
 */
const props = defineProps<{
  cKey: string;
  mode: "list" | "drawer";
}>();

const emit = defineEmits<{
  /** 抽屉模式：点击关联风险 */
  (e: "navigate-risk", key: string): void;
  /** 抽屉模式：点击关联攻击工具 */
  (e: "navigate-attackTool", key: string): void;
  /** 抽屉模式：点击关联威胁行为者 */
  (e: "navigate-threatActor", key: string): void;
}>();

const { t } = useI18n();
const router = useRouter();
const { cases } = useCases();

const isDrawer = computed(() => props.mode === "drawer");
const selectedCase = computed(() => cases.value[props.cKey]);

const selectedKeywords = computed(() => selectedCase.value?.keywords || []);

const CATEGORY_ZH_TO_KEY: Record<string, string> = {
  刑事判决: "criminal_verdict",
  行政查处: "administrative_enforcement",
  安全事件: "security_incident",
  漏洞通报: "vulnerability_advisory",
  学术研究: "academic_research",
  新闻报道: "news_report",
};
const categoryLabel = (category: string) => {
  if (!category) return "";
  const key = CATEGORY_ZH_TO_KEY[category] || category;
  return t(`caseCategory_${key}`);
};
const detailHref = (cKey: string) => entityDetailHref(router, cKey, "case") ?? "";
const openDetail = (cKey: string) => {
  window.open(detailHref(cKey), "_blank", "noopener,noreferrer");
};
const onNavigate = (event: "navigate-risk" | "navigate-attackTool" | "navigate-threatActor") => (key: string) => {
  emit(event, key);
};
</script>

<template>
  <article v-if="selectedCase" class="detail-panel">
    <div class="detail-heading" :class="{ 'case-drawer-heading': isDrawer }">
      <template v-if="isDrawer">
        <div class="case-drawer-meta-row">
          <div class="detail-id">{{ cKey }}</div>
          <div class="detail-heading-actions">
            <el-button type="primary" plain size="small" @click="openDetail(cKey)">
              {{ $t("viewDetail") }}
              <el-icon class="external-link-icon" aria-hidden="true"><TopRight /></el-icon>
            </el-button>
          </div>
        </div>
        <h2 class="case-drawer-title">
          <a :href="detailHref(cKey)" target="_blank" rel="noopener noreferrer" class="drawer-title-link">
            {{ selectedCase.title }}
            <el-icon class="external-link-icon" aria-hidden="true"><TopRight /></el-icon>
          </a>
        </h2>
      </template>
      <template v-else>
        <div>
          <div class="detail-id">{{ cKey }}</div>
          <h2>{{ selectedCase.title }}</h2>
        </div>
        <div class="detail-heading-actions">
          <FeedbackLink :entity-id="cKey" :entity-title="selectedCase.title" />
        </div>
      </template>
    </div>

    <section class="detail-section">
      <h3>{{ $t("caseSummary") }}</h3>
      <p>{{ selectedCase.summary }}</p>
    </section>
    <div v-if="isDrawer && (selectedCase.category || selectedCase.incidentTime)" class="case-drawer-info-row">
      <section v-if="selectedCase.category" class="detail-section case-drawer-category">
        <h3>{{ $t("caseCategory") }}</h3>
        <p>{{ categoryLabel(selectedCase.category) }}</p>
      </section>
      <section v-if="selectedCase.incidentTime" class="detail-section case-drawer-time">
        <h3>{{ $t("incidentTime") }}</h3>
        <p class="text-muted">{{ selectedCase.incidentTime }}</p>
      </section>
    </div>
    <template v-else>
      <section v-if="selectedCase.category" class="detail-section">
        <h3>{{ $t("caseCategory") }}</h3>
        <p>{{ categoryLabel(selectedCase.category) }}</p>
      </section>
      <section v-if="selectedCase.incidentTime" class="detail-section">
        <h3>{{ $t("incidentTime") }}</h3>
        <p class="text-muted">{{ selectedCase.incidentTime }}</p>
      </section>
    </template>
    <section v-if="selectedKeywords.length" class="detail-section">
      <h3>{{ $t("keywords") }}</h3>
      <div class="keywords">
        <span v-for="keyword in selectedKeywords" :key="keyword" class="keyword-tag">{{ keyword }}</span>
      </div>
    </section>
    <EntityLinkSection
      :keys="selectedCase.relatedRisks ?? []"
      title="risks"
      entity-type="risk"
      anchor="risks"
      :on-navigate="isDrawer ? onNavigate('navigate-risk') : undefined"
    />
    <EntityLinkSection
      :keys="selectedCase.relatedAttackTools ?? []"
      title="attackTools"
      entity-type="attackTool"
      anchor="attack-tools"
      :on-navigate="isDrawer ? onNavigate('navigate-attackTool') : undefined"
    />
    <EntityLinkSection
      :keys="selectedCase.relatedThreatActors ?? []"
      title="threatActors"
      entity-type="threatActor"
      anchor="threat-actors"
      :on-navigate="isDrawer ? onNavigate('navigate-threatActor') : undefined"
    />
    <!-- Case references 手写 inline（case 数据不进 BREAK 索引，无法用 ReferenceList） -->
    <section v-if="selectedCase.references?.length" class="detail-section" data-detail-anchor="references">
      <h3>{{ $t("references") }}</h3>
      <div class="reference-list">
        <div v-for="(ref, i) in selectedCase.references" :key="i" class="reference-item">
          <span class="reference-bullet">•</span>
          <a
            v-if="ref.link"
            :href="ref.link"
            target="_blank"
            rel="noopener noreferrer"
            class="reference-link"
          >
            <el-icon class="reference-link-icon" aria-hidden="true"><Link /></el-icon>
            <span class="reference-link-text">{{ ref.title }}</span>
          </a>
          <span v-else class="reference-text">{{ ref.title }}</span>
        </div>
      </div>
    </section>
    <section v-if="selectedCase.updated" class="detail-section">
      <h3>{{ $t("lastUpdated") }}</h3>
      <p class="text-muted">{{ selectedCase.updated }}</p>
    </section>
  </article>
</template>

<style scoped>
.case-drawer-heading {
  display: block;
}

.case-drawer-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.detail-heading .case-drawer-title {
  margin-top: 14px;
}

.case-drawer-meta-row .detail-heading-actions {
  flex-shrink: 0;
}

.case-drawer-info-row {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(120px, 0.8fr);
  gap: 14px;
  margin-bottom: 24px;
}

.case-drawer-info-row .detail-section {
  min-width: 0;
  margin-bottom: 0;
  padding: 14px 16px;
  border: 1px solid var(--break-border);
  border-radius: 8px;
  background: var(--break-bg-secondary);
}

.reference-list {
  margin-top: 8px;
}

.reference-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 10px;
  line-height: 1.6;
}

.reference-bullet {
  color: var(--break-text-secondary);
  font-weight: 600;
  flex-shrink: 0;
  margin-top: 2px;
}

.reference-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--break-link);
  text-decoration: none;
  font-size: 14px;
  transition: color 0.2s;
  flex: 1;
}

.reference-link-icon {
  font-size: 12px;
  flex-shrink: 0;
  opacity: 0.7;
}

.reference-link:hover,
.reference-link:active {
  color: var(--break-link-hover);
  text-decoration: underline;
}

.reference-link:hover .reference-link-icon,
.reference-link:active .reference-link-icon {
  opacity: 1;
}

.reference-text {
  color: var(--break-text-primary);
  font-size: 14px;
  flex: 1;
}

@media (max-width: 520px) {
  .case-drawer-meta-row {
    align-items: flex-start;
  }

  .case-drawer-info-row {
    grid-template-columns: 1fr;
  }
}
</style>
