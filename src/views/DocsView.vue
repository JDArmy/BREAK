<script lang="ts" setup>
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import KnowledgeSplitView from "@/components/KnowledgeSplitView.vue";
import { useTheme } from "@/composables/useTheme";

interface DocEntry {
  slug: string;
  title: string;
  category: string;
  order: number;
  summary?: string;
  htmlPath: string;
}

const { t } = useI18n();
const { locale } = useI18n();
const route = useRoute();
const router = useRouter();
const { isDark } = useTheme();

const manifest = ref<Record<string, DocEntry[]>>({});
const docs = ref<DocEntry[]>([]);
const loading = ref(true);
const detailLoading = ref(false);
const manifestError = ref(false);
const detailError = ref(false);
const bodyHtml = ref("");
const docsBodyRef = ref<HTMLElement>();
const selectedSlug = ref("");
const SITE_TITLE = "JDArmy BREAK";
let manifestRequestSeq = 0;
let htmlRequestSeq = 0;
let mermaidRenderSeq = 0;

const docsLocale = computed(() => (locale.value === "en" ? "en" : "zh-CN"));

const routeSlug = computed(() => route.params.slug as string | undefined);

const selectFirstDoc = (data: DocEntry[], replace = true) => {
  const first = data.find((entry) => entry.slug === "index") || data[0];
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

const applyDocsForLocale = (lang: string) => {
  const data = manifest.value[lang] || [];
  docs.value = data;
  normalizeSelectedDoc(data);
};

const loadManifest = async () => {
  loading.value = true;
  manifestError.value = false;
  detailError.value = false;
  const requestId = ++manifestRequestSeq;
  try {
    const resp = await fetch(`${import.meta.env.BASE_URL}data/docs-manifest.json`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data: Record<string, DocEntry[]> = await resp.json();
    if (requestId !== manifestRequestSeq) return;
    manifest.value = data;
    applyDocsForLocale(docsLocale.value);
  } catch {
    if (requestId === manifestRequestSeq) {
      manifestError.value = true;
    }
  } finally {
    if (requestId === manifestRequestSeq) {
      loading.value = false;
    }
  }
};

const loadSelectedHtml = async (entry?: DocEntry) => {
  bodyHtml.value = "";
  detailError.value = false;
  if (!entry) return;
  detailLoading.value = true;
  const requestId = ++htmlRequestSeq;
  try {
    const resp = await fetch(`${import.meta.env.BASE_URL}${entry.htmlPath}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const html = await resp.text();
    if (requestId === htmlRequestSeq) {
      bodyHtml.value = html;
    }
  } catch {
    if (requestId === htmlRequestSeq) {
      detailError.value = true;
    }
  } finally {
    if (requestId === htmlRequestSeq) {
      detailLoading.value = false;
    }
  }
};

const renderMermaidDiagrams = async () => {
  await nextTick();
  const container = docsBodyRef.value;
  if (!container) return;

  const targets = [
    ...Array.from(container.querySelectorAll<HTMLElement>("pre > code.language-mermaid")).map((code) => ({
      source: code.textContent?.trim() || "",
      element: code.parentElement as HTMLElement,
    })),
    ...Array.from(container.querySelectorAll<HTMLElement>(".mermaid-diagram[data-mermaid-source]")).map((element) => ({
      source: element.dataset.mermaidSource || "",
      element,
    })),
  ].filter((target) => target.source);

  if (!targets.length) return;

  const renderId = ++mermaidRenderSeq;
  const { default: mermaid } = await import("mermaid");
  if (renderId !== mermaidRenderSeq) return;

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: isDark.value ? "dark" : "default",
    flowchart: { htmlLabels: true, curve: "linear" },
  });

  for (const [index, target] of targets.entries()) {
    if (renderId !== mermaidRenderSeq || !container.contains(target.element)) return;
    try {
      const { svg, bindFunctions } = await mermaid.render(`docs-mermaid-${renderId}-${index}`, target.source);
      if (renderId !== mermaidRenderSeq || !container.contains(target.element)) return;

      const diagram = document.createElement("div");
      diagram.className = "mermaid-diagram";
      diagram.dataset.mermaidSource = target.source;
      diagram.innerHTML = svg;
      target.element.replaceWith(diagram);
      bindFunctions?.(diagram);
    } catch {
      if (target.element.matches("pre")) {
        target.element.classList.add("mermaid-source-error");
        if (!target.element.previousElementSibling?.classList.contains("mermaid-error-message")) {
          const message = document.createElement("p");
          message.className = "mermaid-error-message";
          message.textContent = docsLocale.value === "en"
            ? "The diagram could not be rendered. Mermaid source is shown below."
            : "图表渲染失败，下面保留 Mermaid 源码。";
          target.element.before(message);
        }
      }
    }
  }
};

onMounted(() => loadManifest());

// 切换语言时重新加载对应语言的文档，并校正当前 slug。
watch(docsLocale, (lang) => {
  applyDocsForLocale(lang);
});

watch(routeSlug, () => {
  if (!loading.value && !manifestError.value) {
    normalizeSelectedDoc(docs.value);
  }
});

const retryLoad = () => {
  if (manifestError.value || Object.keys(manifest.value).length === 0) {
    void loadManifest();
    return;
  }
  void loadSelectedHtml(selectedEntry.value);
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
  selectedEntry,
  (entry) => {
    void loadSelectedHtml(entry);
  },
  { immediate: true },
);

watch(
  [selectedEntry, () => t("menu.docs")],
  ([entry, docsTitle]) => {
    document.title = `${entry?.title || docsTitle} | ${SITE_TITLE}`;
  },
  { immediate: true },
);

watch([bodyHtml, isDark, detailLoading], () => {
  if (detailLoading.value) return;
  void renderMermaidDiagrams();
}, { flush: "post" });

// KnowledgeSplitView 传了 detail-route-name，组件内部会自行 router.push 到
// docs-detail 路由，这里只更新本地选中态供 list 态兜底。
const handleSelect = (key: string) => {
  selectedSlug.value = key;
};

const handleDocsBodyClick = (event: MouseEvent) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const anchor = target.closest("a");
  if (!(anchor instanceof HTMLAnchorElement)) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button > 0) return;

  const rawHref = anchor.getAttribute("href") || "";
  const url = new URL(rawHref, window.location.href);
  if (url.origin !== window.location.origin) return;

  // Markdown 文档统一使用 /docs/<slug>。生产构建的 BASE_URL 为 "./"，
  // 因此不能用 BASE_URL 拼接前缀判断，否则 GitHub Pages 子目录部署会漏拦截。
  const match = url.pathname.match(/(?:^|\/)docs\/([^/]+)\/?$/);
  const slug = match?.[1] || "";
  if (!slug) return;

  event.preventDefault();
  void router.push({ name: "docs-detail", params: { slug }, hash: url.hash });
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
    :load-error="manifestError"
    @select="handleSelect"
    @retry="retryLoad"
  >
    <article v-if="selectedEntry" class="detail-panel docs-detail">
      <section class="detail-section">
        <div v-if="detailLoading" class="docs-loading">{{ t("loading") }}</div>
        <div v-else-if="detailError" class="docs-detail-error">
          <p>{{ t("error.dataLoadFailed") }}</p>
          <button type="button" class="docs-detail-retry" @click="retryLoad">{{ t("error.retry") }}</button>
        </div>
        <div ref="docsBodyRef" v-else class="docs-body" @click="handleDocsBodyClick" v-html="bodyHtml" />
      </section>
    </article>
  </KnowledgeSplitView>
</template>

<style scoped>
.docs-detail {
  max-width: 960px;
}

.docs-loading,
.docs-detail-error {
  padding: 24px 0;
  color: var(--break-text-secondary);
}

.docs-detail-error p {
  margin: 0 0 12px;
}

.docs-detail-retry {
  padding: 6px 12px;
  border: 1px solid var(--break-border);
  border-radius: 4px;
  background: var(--break-bg-primary);
  color: var(--break-link);
  cursor: pointer;
}

.docs-detail-retry:hover {
  border-color: var(--break-link);
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

.docs-body :deep(.mermaid-diagram) {
  width: 100%;
  margin: 16px 0;
  overflow-x: auto;
  text-align: center;
}

.docs-body :deep(.mermaid-diagram svg) {
  display: block;
  width: 100%;
  min-width: 560px;
  height: auto;
  margin: 0 auto;
}

.docs-body :deep(.mermaid-error-message) {
  color: var(--break-danger, #f56c6c);
}

.docs-body :deep(.mermaid-source-error) {
  border-color: var(--break-danger, #f56c6c);
}

@media (max-width: 640px) {
  .docs-body :deep(.mermaid-diagram svg) {
    min-width: 480px;
  }
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
