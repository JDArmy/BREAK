<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { Link } from "@element-plus/icons-vue";
import KnowledgeSplitView from "@/components/KnowledgeSplitView.vue";
import EntityLinkSection from "@/components/EntityLinkSection.vue";
import { useCases } from "@/composables/useCases";

const route = useRoute();
const { t } = useI18n();
const { cases, loaded, loadError, ensureCases } = useCases();

// ensureCases 失败时会设置 loadError 并 rethrow；此处捕获以避免未处理的 Promise 拒绝，
// 失败状态已通过 loadError 反映到 UI（失败提示 + 重试入口）。
const loadCasesQuietly = () => {
  ensureCases().catch(() => {
    /* 错误态已由 useCases 的 loadError 维护，UI 据此展示重试入口 */
  });
};

loadCasesQuietly();

const retryLoadCases = () => {
  // loadError 已在 ensureCases 内部重置，此处直接重新触发加载
  loadCasesQuietly();
};

// category 值规范化为 key（兼容历史中文值与新 key）
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

const CATEGORY_KEYS = [
  "criminal_verdict",
  "administrative_enforcement",
  "security_incident",
  "vulnerability_advisory",
  "academic_research",
  "news_report",
];
const selectedCategory = ref("");

const caseKeys = computed(() => Object.keys(cases.value));

const getInitialKey = () =>
  (typeof route.params.cKey === "string" ? route.params.cKey : "") || caseKeys.value[0] || "";

const selectedCaseKey = ref(getInitialKey());

watch(
  () => route.params.cKey,
  (cKey) => {
    if (cKey && typeof cKey === "string" && cases.value[cKey]) {
      selectedCaseKey.value = cKey;
    }
  }
);

const caseItems = computed(() =>
  caseKeys.value
    .filter((caseKey) => {
      const c = cases.value[caseKey];
      if (!c) return false;
      if (!selectedCategory.value) return true;
      const catKey = CATEGORY_ZH_TO_KEY[c.category] || c.category;
      return catKey === selectedCategory.value;
    })
    .map((caseKey) => {
      const c = cases.value[caseKey];
      if (!c) return { id: caseKey, title: "", subtitle: "", badge: "", searchText: "" };
      const category = c.category;
      const catKey = CATEGORY_ZH_TO_KEY[category] || category;
      const timePart = c.incidentTime || "";
      const summaryPart = c.summary.slice(0, 48);
      return {
        id: caseKey,
        title: c.title,
        subtitle: timePart ? `${timePart} · ${summaryPart}` : summaryPart,
        badge: categoryLabel(category),
        badgeType: `case-cat-${catKey}`,
        searchText: [c.title, ...(c.keywords || []), c.summary, category, timePart].filter(Boolean).join(" "),
      };
    })
);

const selectedCase = computed(() => cases.value[selectedCaseKey.value]);
const selectedKeywords = computed(() => (selectedCase.value?.keywords) || []);

// 案例数据懒加载：直接访问 /cases 时首屏 cases 尚未加载完成，
// selectedCaseKey 此前拿不到 caseKeys[0] 而为空。加载完成后补选第一个。
watch(caseKeys, (keys) => {
  if (!keys.length) return;
  if (cases.value[selectedCaseKey.value]) return;
  selectedCaseKey.value = keys[0];
});

// 切换分类筛选时，若当前选中项不在筛选结果中，选第一个
watch(selectedCategory, () => {
  if (selectedCategory.value && !caseItems.value.some((item) => item.id === selectedCaseKey.value)) {
    selectedCaseKey.value = caseItems.value[0]?.id || "";
  }
});
</script>

<template>
  <KnowledgeSplitView
    :title="$t('cases')"
    route-name="knowledgesCaseList"
    detail-route-name="knowledgesCaseDetail"
    param-key="cKey"
    :items="caseItems"
    :selected-key="selectedCaseKey"
    :search-placeholder="$t('search.casePlaceholder')"
    :loading="!loaded"
    :load-error="loadError"
    error-text-key="error.caseSyncFailed"
    virtual-list
    @select="selectedCaseKey = $event"
    @retry="retryLoadCases"
  >
    <template #filters>
      <el-select
        id="case-category-filter"
        v-model="selectedCategory"
        class="case-category-filter"
        name="case-category-filter"
        size="small"
        clearable
        :placeholder="$t('allCategories')"
      >
        <el-option
          v-for="key in CATEGORY_KEYS"
          :key="key"
          :label="$t(`caseCategory_${key}`)"
          :value="key"
        />
      </el-select>
    </template>
    <article v-if="selectedCase" class="detail-panel">
      <div class="detail-heading">
        <div>
          <div class="detail-id">{{ selectedCaseKey }}</div>
          <h2>{{ selectedCase.title }}</h2>
        </div>
      </div>

      <section class="detail-section">
        <h3>{{ $t("caseSummary") }}</h3>
        <p>{{ selectedCase.summary }}</p>
      </section>
      <section v-if="selectedCase.category" class="detail-section">
        <h3>{{ $t("caseCategory") }}</h3>
        <p>{{ categoryLabel(selectedCase.category) }}</p>
      </section>
      <section v-if="selectedCase.incidentTime" class="detail-section">
        <h3>{{ $t("incidentTime") }}</h3>
        <p class="text-muted">{{ selectedCase.incidentTime }}</p>
      </section>
      <section v-if="selectedKeywords.length" class="detail-section">
        <h3>{{ $t("keywords") }}</h3>
        <div class="keywords">
          <span v-for="keyword in selectedKeywords" :key="keyword" class="keyword-tag">
            {{ keyword }}
          </span>
        </div>
      </section>
      <EntityLinkSection
        :keys="selectedCase.relatedRisks"
        title="risks"
        route-name="knowledgesRiskList"
        detail-route-name="knowledgesRiskDetail"
        param-key="rKey"
        anchor="risks"
      />
      <EntityLinkSection
        :keys="selectedCase.relatedAttackTools"
        title="attackTools"
        route-name="knowledgesAttackToolList"
        detail-route-name="knowledgesAttackToolDetail"
        param-key="atKey"
        anchor="attack-tools"
      />
      <EntityLinkSection
        :keys="selectedCase.relatedThreatActors"
        title="threatActors"
        route-name="knowledgesThreatActorList"
        detail-route-name="knowledgesThreatActorDetail"
        param-key="taKey"
        anchor="threat-actors"
      />
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
  </KnowledgeSplitView>
</template>

<style scoped>
.case-category-filter {
  flex: 0 0 96px;
}

.keywords {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.keyword-tag {
  display: inline-block;
  padding: 4px 12px;
  background: var(--break-bg-secondary);
  border: 1px solid var(--break-border);
  border-radius: 4px;
  font-size: 0.9em;
  color: var(--break-text-secondary);
}

.text-muted {
  color: var(--break-text-muted);
  font-size: 0.9em;
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
</style>
