<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import KnowledgeSplitView from "@/components/KnowledgeSplitView.vue";
import { useBreakpoints } from "@/composables/useBreakpoints";
import { useCases } from "@/composables/useCases";

const route = useRoute();
const { t } = useI18n();
const { isMobile } = useBreakpoints();
const { cases, ensureCases } = useCases();

void ensureCases();

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

const getInitialKey = () => {
  const paramKey = typeof route.params.cKey === "string" ? route.params.cKey : "";
  const hashKey = route.hash.replace("#", "");
  return paramKey || hashKey || caseKeys.value[0] || "";
};

const selectedCaseKey = ref(getInitialKey());

watch(
  () => route.hash,
  (hash) => {
    const key = hash.replace("#", "");
    if (key && cases.value[key]) selectedCaseKey.value = key;
  },
  { immediate: true }
);

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
      return {
        id: caseKey,
        title: c.title,
        subtitle: c.summary.slice(0, 48),
        badge: categoryLabel(category),
        searchText: [c.title, ...(c.keywords || []), c.summary, category].filter(Boolean).join(" "),
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
    route-name="cases"
    detail-route-name="casesDetail"
    :items="caseItems"
    :selected-key="selectedCaseKey"
    :search-placeholder="$t('search.casePlaceholder')"
    @select="selectedCaseKey = $event"
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
      <section v-if="selectedCase.relatedRisks.length" class="detail-section" data-detail-anchor="risks">
        <h3>{{ $t("risks") }}</h3>
        <div class="entity-links">
          <router-link
            v-for="rKey in selectedCase.relatedRisks"
            :key="rKey"
            :to="isMobile ? { name: 'risksDetail', params: { rKey } } : { name: 'risks', hash: `#${rKey}` }"
            class="entity-link"
          >
            {{ rKey }}: {{ $t(`BREAK.risks.${rKey}.title`) }}
          </router-link>
        </div>
      </section>
      <section v-if="selectedCase.relatedAttackTools.length" class="detail-section" data-detail-anchor="attack-tools">
        <h3>{{ $t("attackTools") }}</h3>
        <div class="entity-links">
          <router-link
            v-for="atKey in selectedCase.relatedAttackTools"
            :key="atKey"
            :to="isMobile ? { name: 'attackToolsDetail', params: { atKey } } : { name: 'attackTools', hash: `#${atKey}` }"
            class="entity-link"
          >
            {{ atKey }}: {{ $t(`BREAK.attackTools.${atKey}.title`) }}
          </router-link>
        </div>
      </section>
      <section v-if="selectedCase.relatedThreatActors.length" class="detail-section" data-detail-anchor="threat-actors">
        <h3>{{ $t("threatActors") }}</h3>
        <div class="entity-links">
          <router-link
            v-for="taKey in selectedCase.relatedThreatActors"
            :key="taKey"
            :to="isMobile ? { name: 'threatActorsDetail', params: { taKey } } : { name: 'threatActors', hash: `#${taKey}` }"
            class="entity-link"
          >
            {{ taKey }}: {{ $t(`BREAK.threatActors.${taKey}.title`) }}
          </router-link>
        </div>
      </section>
      <section v-if="selectedCase.references?.length" class="detail-section" data-detail-anchor="references">
        <h3>{{ $t("references") }}</h3>
        <div class="entity-links">
          <a
            v-for="(ref, i) in selectedCase.references"
            :key="i"
            :href="ref.link"
            target="_blank"
            rel="noopener noreferrer"
            class="entity-link"
          >
            {{ ref.title }}
          </a>
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
</style>
