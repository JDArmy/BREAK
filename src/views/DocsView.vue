<script lang="ts" setup>
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import KnowledgeSplitView from "@/components/KnowledgeSplitView.vue";

interface DocEntry {
  slug: string;
  title: string;
  category: string;
  order: number;
  summary?: string;
  bodyHtml: string;
}

const { t } = useI18n();
const { locale } = useI18n();
const route = useRoute();
const router = useRouter();

const docs = ref<DocEntry[]>([]);
const loading = ref(true);
const error = ref(false);
const selectedSlug = ref("");
const SITE_TITLE = "JDArmy BREAK";

const docsLocale = computed(() => (locale.value === "en" ? "en" : "zh-CN"));

const routeSlug = computed(() => route.params.slug as string | undefined);

const selectFirstDoc = (data: DocEntry[], replace = true) => {
  const first = data[0];
  if (!first) return;
  selectedSlug.value = first.slug;
  const location = { name: "docs-detail", params: { slug: first.slug } };
  if (replace) {
    void router.replace(location);
  } else {
    void router.push(location);
  }
};

const normalizeSelectedDoc = (data: DocEntry[]) => {
  if (!data.length) {
    selectedSlug.value = "";
    return;
  }

  const slug = routeSlug.value;
  if (slug && data.some((entry) => entry.slug === slug)) {
    selectedSlug.value = slug;
    return;
  }

  selectFirstDoc(data);
};

const loadDocs = async (lang: string) => {
  // 重试时重置状态，确保列表区重新展示加载中而非残留失败态
  loading.value = true;
  error.value = false;
  try {
    const resp = await fetch(`${import.meta.env.BASE_URL}data/docs-${lang}.json`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data: DocEntry[] = await resp.json();
    docs.value = data;
    normalizeSelectedDoc(data);
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
};

onMounted(() => loadDocs(docsLocale.value));

// 切换语言时重新加载对应语言的文档，并校正当前 slug。
watch(docsLocale, (lang) => {
  void loadDocs(lang);
});

watch(routeSlug, () => {
  if (!loading.value && !error.value) {
    normalizeSelectedDoc(docs.value);
  }
});

const retryLoad = () => {
  void loadDocs(docsLocale.value);
};

const items = computed(() =>
  docs.value.map((entry) => ({
    id: entry.slug,
    displayId: String(entry.order).padStart(2, "0"),
    title: entry.title,
    subtitle: entry.summary || entry.category,
    searchText: `${entry.title} ${entry.category} ${entry.summary || ""}`,
  })),
);

// 选中态由 detail 路由的 slug 参数驱动：KnowledgeSplitView 监听 route.params
// 变化时会 emit select 同步选中项，这里以 route.params.slug 作为权威选中键。
const effectiveSelectedKey = computed(() => {
  const paramSlug = routeSlug.value;
  if (paramSlug && docs.value.some((e) => e.slug === paramSlug)) {
    return paramSlug;
  }
  return selectedSlug.value;
});

// 右栏渲染同样以 route.params.slug 为权威键，避免初始跳转时 emit select
// 时序导致的首屏空白；selectedSlug 作为 list 态（无 slug 参数）的兜底。
const selectedEntry = computed(() => {
  const paramSlug = routeSlug.value;
  const key = paramSlug && docs.value.some((e) => e.slug === paramSlug) ? paramSlug : selectedSlug.value;
  return docs.value.find((e) => e.slug === key);
});

watch(
  [selectedEntry, () => t("menu.docs")],
  ([entry, docsTitle]) => {
    document.title = `${entry?.title || docsTitle} | ${SITE_TITLE}`;
  },
  { immediate: true },
);

// KnowledgeSplitView 传了 detail-route-name，组件内部会自行 router.push 到
// docs-detail 路由，这里只更新本地选中态供 list 态兜底。
const handleSelect = (key: string) => {
  selectedSlug.value = key;
};
</script>

<template>
  <KnowledgeSplitView
    :title="t('menu.docs')"
    route-name="docs"
    detail-route-name="docs-detail"
    param-key="slug"
    :items="items"
    :selected-key="effectiveSelectedKey"
    :search-placeholder="t('search.docsPlaceholder')"
    :loading="loading"
    :load-error="error"
    @select="handleSelect"
    @retry="retryLoad"
  >
    <article v-if="selectedEntry" class="detail-panel docs-detail">
      <section class="detail-section">
        <div class="docs-body" v-html="selectedEntry.bodyHtml" />
      </section>
    </article>
  </KnowledgeSplitView>
</template>

<style scoped>
.docs-detail {
  max-width: 960px;
}

.docs-body :deep(h1) {
  margin: 8px 0 16px;
  font-size: 1.6em;
  font-weight: 700;
  color: var(--break-text-primary);
  line-height: 1.3;
}

.docs-body :deep(h2) {
  margin: 28px 0 12px;
  font-size: 1.25em;
  font-weight: 650;
  color: var(--break-text-primary);
  line-height: 1.35;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--break-border);
}

.docs-body :deep(h3) {
  margin: 22px 0 8px;
  font-size: 1.08em;
  font-weight: 650;
  color: var(--break-text-primary);
}

.docs-body :deep(h4) {
  margin: 18px 0 6px;
  font-size: 1em;
  font-weight: 650;
  color: var(--break-text-primary);
}

.docs-body :deep(p) {
  margin: 8px 0;
  line-height: 1.75;
  color: var(--break-text-secondary);
}

.docs-body :deep(ul),
.docs-body :deep(ol) {
  margin: 8px 0;
  padding-left: 24px;
}

.docs-body :deep(li) {
  margin: 4px 0;
  line-height: 1.75;
  color: var(--break-text-primary);
}

.docs-body :deep(li input[type="checkbox"]) {
  margin-right: 6px;
  vertical-align: middle;
}

.docs-body :deep(code) {
  padding: 1px 6px;
  background: var(--break-bg-secondary);
  border: 1px solid var(--break-border);
  border-radius: 3px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.88em;
  color: var(--break-link);
}

.docs-body :deep(pre) {
  margin: 12px 0;
  padding: 14px 16px;
  background: var(--break-bg-secondary);
  border: 1px solid var(--break-border);
  border-radius: 6px;
  overflow-x: auto;
}

.docs-body :deep(pre code) {
  padding: 0;
  background: transparent;
  border: none;
  color: var(--break-text-primary);
  font-size: 0.86em;
  line-height: 1.6;
}

.docs-body :deep(blockquote) {
  margin: 12px 0;
  padding: 8px 16px;
  border-left: 3px solid var(--break-link);
  background: var(--break-bg-secondary);
  color: var(--break-text-secondary);
  border-radius: 0 4px 4px 0;
}

.docs-body :deep(table) {
  width: 100%;
  margin: 14px 0;
  border-collapse: collapse;
  font-size: 0.92em;
}

.docs-body :deep(th),
.docs-body :deep(td) {
  padding: 8px 12px;
  border: 1px solid var(--break-border);
  text-align: left;
  color: var(--break-text-primary);
}

.docs-body :deep(th) {
  background: var(--break-bg-secondary);
  font-weight: 650;
}

.docs-body :deep(a) {
  color: var(--break-link);
  text-decoration: none;
}

.docs-body :deep(a:hover) {
  text-decoration: underline;
}

.docs-body :deep(strong) {
  font-weight: 650;
  color: var(--break-text-primary);
}

.docs-body :deep(hr) {
  margin: 24px 0;
  border: none;
  border-top: 1px solid var(--break-border);
}

.docs-body :deep(img) {
  max-width: 100%;
  border-radius: 6px;
}
</style>
