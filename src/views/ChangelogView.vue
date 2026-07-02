<script lang="ts" setup>
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import KnowledgeSplitView from "@/components/KnowledgeSplitView.vue";

interface ChangelogEntry {
  version: string;
  summary: string;
  body: string;
}

const { t } = useI18n();
const entries = ref<ChangelogEntry[]>([]);
const loading = ref(true);
const error = ref(false);

const selectedVersion = ref("");

const loadChangelog = async () => {
  // 重试时重置状态，确保列表区重新展示加载中而非残留失败态
  loading.value = true;
  error.value = false;
  try {
    const resp = await fetch(`${import.meta.env.BASE_URL}data/changelog.json`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data: ChangelogEntry[] = await resp.json();
    entries.value = data;
    if (data.length > 0 && !selectedVersion.value) {
      selectedVersion.value = data[0].version;
    }
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
};

onMounted(loadChangelog);

const retryLoad = () => {
  void loadChangelog();
};

const items = computed(() =>
  entries.value.map((entry) => ({
    id: entry.version,
    title: entry.version,
    subtitle: entry.summary.replace(/:$/, ""),
    searchText: `${entry.version} ${entry.summary} ${entry.body}`,
  }))
);

const selectedEntry = computed(() =>
  entries.value.find((e) => e.version === selectedVersion.value)
);

/**
 * 简易 markdown → HTML 转换
 * 仅处理 CHANGELOG 中实际出现的语法，不引入外部依赖
 */
function renderMarkdown(md: string): string {
  const lines = md.split("\n");
  const html: string[] = [];
  let inList = false;

  for (const rawLine of lines) {
    const line = rawLine;

    // 空行：关闭列表
    if (!line.trim()) {
      if (inList) { html.push("</ul>"); inList = false; }
      continue;
    }

    // ### 子标题 → h4
    const h3Match = line.match(/^###\s+(.+)$/);
    if (h3Match) {
      if (inList) { html.push("</ul>"); inList = false; }
      html.push(`<h4>${escapeHtml(h3Match[1])}</h4>`);
      continue;
    }

    // - 列表项
    const liMatch = line.match(/^[-*]\s+(.+)$/);
    if (liMatch) {
      if (!inList) { html.push("<ul>"); inList = true; }
      html.push(`<li>${inlineFormat(liMatch[1])}</li>`);
      continue;
    }

    //   - 二级列表项（缩进）
    const subLiMatch = line.match(/^\s{2,}[-*]\s+(.+)$/);
    if (subLiMatch) {
      if (!inList) { html.push("<ul>"); inList = true; }
      html.push(`<li class="changelog-sub-item">${inlineFormat(subLiMatch[1])}</li>`);
      continue;
    }

    // 普通文本行 → p
    if (inList) { html.push("</ul>"); inList = false; }
    html.push(`<p>${inlineFormat(line)}</p>`);
  }

  if (inList) html.push("</ul>");
  return html.join("\n");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 行内格式：`code`、**bold**、链接 */
function inlineFormat(text: string): string {
  let result = escapeHtml(text);
  // `code`
  result = result.replace(/`([^`]+)`/g, "<code>$1</code>");
  // **bold**
  result = result.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // [text](url)
  result = result.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  return result;
}
</script>

<template>
  <KnowledgeSplitView
    :title="t('menu.changelog')"
    route-name="changelog"
    param-key="version"
    :items="items"
    :selected-key="selectedVersion"
    :search-placeholder="t('search.changelogPlaceholder')"
    :loading="loading"
    :load-error="error"
    @select="selectedVersion = $event"
    @retry="retryLoad"
  >
    <article v-if="selectedEntry" class="detail-panel changelog-detail">
      <div class="detail-heading">
        <div>
          <h2>v{{ selectedEntry.version }}</h2>
        </div>
      </div>

      <section class="detail-section">
        <div class="changelog-body" v-html="renderMarkdown(selectedEntry.body)" />
      </section>
    </article>
  </KnowledgeSplitView>
</template>

<style scoped>
.changelog-detail {
  max-width: 960px;
}

.changelog-body :deep(h4) {
  margin: 20px 0 8px;
  font-size: 1.05em;
  font-weight: 650;
  color: var(--break-text-primary);
}

.changelog-body :deep(p) {
  margin: 6px 0;
  line-height: 1.7;
  color: var(--break-text-secondary);
}

.changelog-body :deep(ul) {
  margin: 6px 0;
  padding-left: 20px;
}

.changelog-body :deep(li) {
  margin: 4px 0;
  line-height: 1.7;
  color: var(--break-text-primary);
}

.changelog-body :deep(.changelog-sub-item) {
  margin-left: 16px;
  color: var(--break-text-secondary);
  font-size: 0.95em;
}

.changelog-body :deep(code) {
  padding: 1px 6px;
  background: var(--break-bg-secondary);
  border: 1px solid var(--break-border);
  border-radius: 3px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.88em;
  color: var(--break-link);
}

.changelog-body :deep(strong) {
  font-weight: 650;
  color: var(--break-text-primary);
}

.changelog-body :deep(a) {
  color: var(--break-link);
  text-decoration: none;
}

.changelog-body :deep(a:hover) {
  text-decoration: underline;
}
</style>
