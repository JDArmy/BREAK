<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import BREAK from "@/BREAK";
import KnowledgeSplitView from "@/components/KnowledgeSplitView.vue";
import FeedbackLink from "@/components/FeedbackLink.vue";
import ReferenceList from "@/components/ReferenceList.vue";
import EntityLinkSection from "@/components/EntityLinkSection.vue";
import { getMessageStringArray, getNestedMessageValue } from "@/utils/i18nMessage";

const route = useRoute();
const { locale, messages } = useI18n();

const termKeys = Object.keys(BREAK.terms);
const selectedCategory = ref("");

// 动态提取所有分类值（去重排序）
const categoryOptions = computed(() => {
  const cats = new Set<string>();
  for (const term of Object.values(BREAK.terms)) {
    if (term.category) cats.add(term.category);
  }
  return [...cats].sort();
});

const getInitialKey = () => {
  const paramKey = typeof route.params.tKey === "string" ? route.params.tKey : "";
  return paramKey || termKeys[0] || "";
};

const selectedTermKey = ref(getInitialKey());

watch(
  () => route.params.tKey,
  (tKey) => {
    if (tKey && typeof tKey === 'string' && BREAK.terms[tKey]) {
      selectedTermKey.value = tKey;
    }
  }
);

// 筛选变化时，若当前选中项不在过滤结果中，自动选中第一个
watch(selectedCategory, () => {
  if (selectedCategory.value && !termItems.value.some((item) => item.id === selectedTermKey.value)) {
    selectedTermKey.value = termItems.value[0]?.id || "";
  }
});

const localeMessages = computed(() => messages.value[locale.value] as Record<string, unknown>);

const getTermString = (termKey: string, field: string) =>
  String(getNestedMessageValue(localeMessages.value, `BREAK.terms.${termKey}.${field}`) || "");

const getTermStringArray = (termKey: string, field: string) =>
  getMessageStringArray(localeMessages.value, `BREAK.terms.${termKey}.${field}`);

// 8 种调色板，35 个分类通过哈希映射循环取色
const TERM_BADGE_PALETTE_COUNT = 8;
const termCategoryColorIndex = (cat: string): number => {
  let hash = 0;
  for (let i = 0; i < cat.length; i++) {
    hash = ((hash << 5) - hash + cat.charCodeAt(i)) | 0;
  }
  return ((hash % TERM_BADGE_PALETTE_COUNT) + TERM_BADGE_PALETTE_COUNT) % TERM_BADGE_PALETTE_COUNT;
};

const termItems = computed(() =>
  termKeys
    .filter((termKey) => {
      if (!selectedCategory.value) return true;
      return BREAK.terms[termKey].category === selectedCategory.value;
    })
    .map((termKey) => {
    const aliases = getTermStringArray(termKey, "aliases");
    const category = getTermString(termKey, "category");
    const definition = getTermString(termKey, "definition");
    // 用源数据的 category（不随语言变化）做哈希，确保中英文颜色一致
    const rawCategory = BREAK.terms[termKey].category || "";

    return {
      id: termKey,
      title: getTermString(termKey, "title"),
      subtitle: aliases[0] ? `${aliases[0]} - ${definition.slice(0, 48)}` : definition.slice(0, 48),
      badge: category,
      badgeType: rawCategory ? `term-cat-${termCategoryColorIndex(rawCategory)}` : undefined,
      searchText: [
        getTermString(termKey, "title"),
        ...aliases,
        definition,
        getTermString(termKey, "description"),
        category,
      ]
        .filter(Boolean)
        .join(" "),
    };
  })
);

const selectedTerm = computed(() => BREAK.terms[selectedTermKey.value]);
const selectedTermAliases = computed(() => getTermStringArray(selectedTermKey.value, "aliases"));

/**
 * 对 usageExample 文本中出现的术语名（title + aliases）进行高亮标记
 */
const highlightedUsageExample = computed(() => {
  const text = getTermString(selectedTermKey.value, "usageExample");
  if (!text) return "";

  const title = getTermString(selectedTermKey.value, "title");
  const aliases = getTermStringArray(selectedTermKey.value, "aliases");
  const keywords = [title, ...aliases].filter(Boolean);
  if (!keywords.length) return escapeHtml(text);

  // 按长度降序排列，优先匹配更长的词
  keywords.sort((a, b) => b.length - a.length);
  const escaped = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
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
</script>

<template>
  <KnowledgeSplitView
    :title="$t('terms')"
    route-name="knowledgesTermList"
    detail-route-name="knowledgesTermDetail"
    param-key="tKey"
    :items="termItems"
    :selected-key="selectedTermKey"
    :search-placeholder="$t('search.termPlaceholder')"
    @select="selectedTermKey = $event"
  >
    <template #filters>
      <el-select
        v-model="selectedCategory"
        class="term-category-filter"
        size="small"
        clearable
        filterable
        :placeholder="$t('allCategories')"
      >
        <el-option
          v-for="cat in categoryOptions"
          :key="cat"
          :label="cat"
          :value="cat"
        />
      </el-select>
    </template>
    <article v-if="selectedTerm" class="detail-panel">
      <div class="detail-heading">
        <div>
          <div class="detail-id">{{ selectedTermKey }}</div>
          <h2>{{ $t(`BREAK.terms.${selectedTermKey}.title`) }}</h2>
        </div>
        <FeedbackLink :entity-id="selectedTermKey" :entity-title="$t(`BREAK.terms.${selectedTermKey}.title`)" />
      </div>

      <section class="detail-section" data-detail-anchor="terms">
        <h3>{{ $t("definition") }}</h3>
        <p>{{ $t(`BREAK.terms.${selectedTermKey}.definition`) }}</p>
      </section>
      <section class="detail-section">
        <h3>{{ $t("description") }}</h3>
        <p>{{ $t(`BREAK.terms.${selectedTermKey}.description`) }}</p>
      </section>
      <section v-if="selectedTerm.category" class="detail-section">
        <h3>{{ $t("termCategory") }}</h3>
        <p>{{ $t(`BREAK.terms.${selectedTermKey}.category`) }}</p>
      </section>
      <section v-if="selectedTermAliases.length" class="detail-section">
        <h3>{{ $t("aliases") }}</h3>
        <div class="keywords">
          <span v-for="alias in selectedTermAliases" :key="alias" class="keyword-tag">
            {{ alias }}
          </span>
        </div>
      </section>
      <section v-if="getTermStringArray(selectedTermKey, 'keywords').length" class="detail-section">
        <h3>{{ $t("keywords") }}</h3>
        <div class="keywords">
          <span v-for="keyword in getTermStringArray(selectedTermKey, 'keywords')" :key="keyword" class="keyword-tag">
            {{ keyword }}
          </span>
        </div>
      </section>
      <section v-if="selectedTerm.usageExample" class="detail-section">
        <h3>{{ $t("usageExample") }}</h3>
        <p v-html="highlightedUsageExample" />
      </section>
      <EntityLinkSection
        :keys="selectedTerm.relatedThreatActors"
        title="threatActors"
        route-name="knowledgesThreatActorList"
        detail-route-name="knowledgesThreatActorDetail"
        param-key="taKey"
        anchor="threat-actors"
      />
      <EntityLinkSection
        :keys="selectedTerm.relatedAttackTools"
        title="attackTools"
        route-name="knowledgesAttackToolList"
        detail-route-name="knowledgesAttackToolDetail"
        param-key="atKey"
        anchor="attack-tools"
      />
      <EntityLinkSection
        :keys="selectedTerm.relatedRisks"
        title="risks"
        route-name="knowledgesRiskList"
        detail-route-name="knowledgesRiskDetail"
        param-key="rKey"
        anchor="risks"
      />
      <EntityLinkSection
        :keys="selectedTerm.relatedAvoidances"
        title="riskAvoidances"
        route-name="knowledgesAvoidanceList"
        detail-route-name="knowledgesAvoidanceDetail"
        param-key="aKey"
        anchor="avoidances"
      />
      <EntityLinkSection
        :keys="selectedTerm.relatedBusinessScenes"
        title="businessScenes"
        route-name="businessScene"
        detail-route-name="businessScene"
        param-key="bsKey"
        anchor="business-scenes"
        i18n-entity-type="businessScenes"
      />
      <section v-if="selectedTerm.references?.length" class="detail-section" data-detail-anchor="references">
        <h3>{{ $t("references") }}</h3>
        <ReferenceList type="terms" :entity-key="selectedTermKey" />
      </section>
      <section v-if="selectedTerm.updated" class="detail-section">
        <h3>{{ $t("lastUpdated") }}</h3>
        <p class="text-muted">{{ selectedTerm.updated }}</p>
      </section>
    </article>
  </KnowledgeSplitView>
</template>

<style scoped>
.term-category-filter {
  flex: 0 0 120px;
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

:deep(.usage-highlight) {
  background: color-mix(in srgb, var(--break-link) 18%, transparent);
  color: var(--break-link);
  padding: 1px 3px;
  border-radius: 3px;
  font-weight: 600;
}
</style>
