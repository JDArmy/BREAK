<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useBreakpoints } from "@/composables/useBreakpoints";
import { ArrowLeft } from "@element-plus/icons-vue";

import "element-plus/es/components/button/style/css";

interface KnowledgeItem {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeType?: string;
  searchText?: string;
}

const props = defineProps<{
  title: string;
  routeName: string;
  detailRouteName?: string;
  items: KnowledgeItem[];
  selectedKey: string;
  searchPlaceholder: string;
}>();

const emit = defineEmits<{
  select: [key: string];
}>();

const route = useRoute();
const router = useRouter();
const { isMobile } = useBreakpoints();
const query = ref("");
const mobileListRef = ref<HTMLElement>();
const desktopListRef = ref<HTMLElement>();
const detailRef = ref<HTMLElement>();
const mobileListScrollTop = ref(0);

// 移动端两态：list / detail
const mobileView = ref<"list" | "detail">("list");

// PC 端侧栏拖拽调宽：拖到极值收起（宽度=0），从收起态拖出恢复，宽度持久化到 localStorage。
// sidebar 收起时宽度塌成 0 但元素始终在 DOM（不 display:none），分隔条始终可命中，
// 单一 splitter 交互同时覆盖收起与展开。
const SIDEBAR_WIDTH_KEY = "break-knowledge-sidebar-width";
const DEFAULT_SIDEBAR_WIDTH = 320;
const MIN_EXPANDED_WIDTH = 240;
const COLLAPSE_THRESHOLD = 180;
const COLLAPSED_WIDTH = 0;
const SIDEBAR_HARD_MAX = 560;

const maxSidebarWidth = () => {
  if (typeof window === "undefined") return SIDEBAR_HARD_MAX;
  return Math.min(SIDEBAR_HARD_MAX, Math.floor(window.innerWidth * 0.6));
};

const clampSidebarWidth = (px: number) => {
  const max = maxSidebarWidth();
  if (px <= COLLAPSED_WIDTH) return COLLAPSED_WIDTH;
  if (px >= max) return max;
  return Math.round(px);
};

const readStoredSidebarWidth = () => {
  if (typeof localStorage === "undefined") return DEFAULT_SIDEBAR_WIDTH;
  const raw = localStorage.getItem(SIDEBAR_WIDTH_KEY);
  if (raw == null) return DEFAULT_SIDEBAR_WIDTH;
  const num = Number(raw);
  if (!Number.isFinite(num) || num < COLLAPSED_WIDTH) return DEFAULT_SIDEBAR_WIDTH;
  return clampSidebarWidth(num);
};

const persistSidebarWidth = () => {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth.value));
};

const sidebarWidth = ref(readStoredSidebarWidth());
const isCollapsed = computed(() => sidebarWidth.value === COLLAPSED_WIDTH);
const dragging = ref(false);
const splitterRef = ref<HTMLElement>();
let dragStartX = 0;
let dragStartWidth = 0;
let resizeTimer: ReturnType<typeof setTimeout> | undefined;

const onSplitterPointerMove = (e: PointerEvent) => {
  if (!dragging.value) return;
  const delta = e.clientX - dragStartX;
  sidebarWidth.value = clampSidebarWidth(dragStartWidth + delta);
};

const endDrag = () => {
  if (!dragging.value) return;
  dragging.value = false;
  window.removeEventListener("pointermove", onSplitterPointerMove);
  window.removeEventListener("pointerup", onSplitterPointerUp);
  document.body.style.userSelect = "";
  document.body.style.cursor = "";
};

const onSplitterPointerUp = () => {
  // 松手吸附：小于阈值收起，否则吸附到最小展开宽度
  sidebarWidth.value =
    sidebarWidth.value < COLLAPSE_THRESHOLD
      ? COLLAPSED_WIDTH
      : clampSidebarWidth(Math.max(MIN_EXPANDED_WIDTH, sidebarWidth.value));
  persistSidebarWidth();
  endDrag();
};

const onSplitterPointerDown = (e: PointerEvent) => {
  if (isMobile.value) return;
  e.preventDefault();
  dragging.value = true;
  dragStartX = e.clientX;
  dragStartWidth = sidebarWidth.value;
  document.body.style.userSelect = "none";
  document.body.style.cursor = "col-resize";
  window.addEventListener("pointermove", onSplitterPointerMove);
  window.addEventListener("pointerup", onSplitterPointerUp);
};

const onWindowResize = () => {
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (sidebarWidth.value !== COLLAPSED_WIDTH && sidebarWidth.value > maxSidebarWidth()) {
      sidebarWidth.value = clampSidebarWidth(sidebarWidth.value);
    }
  }, 200);
};

const selectedItem = computed(() =>
  props.items.find((item) => item.id === props.selectedKey)
);

const filteredItems = computed(() => {
  const keyword = query.value.trim().toLowerCase();
  if (!keyword) return props.items;

  return props.items.filter((item) =>
    [item.id, item.title, item.subtitle, item.searchText]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(keyword))
  );
});

const selectItem = (key: string, updateRoute = true) => {
  if (!props.items.some((item) => item.id === key)) return;
  if (isMobile.value && mobileListRef.value) {
    mobileListScrollTop.value = mobileListRef.value.scrollTop;
  }
  emit("select", key);

  if (updateRoute) {
    if (isMobile.value && props.detailRouteName) {
      // 移动端使用独立的详情路由
      router.push({ name: props.detailRouteName, params: { [getParamKey()]: key } });
    } else {
      // PC端使用 hash
      router.replace({ name: props.routeName, hash: `#${key}` });
    }
  }

  if (isMobile.value) {
    mobileView.value = "detail";
  }
};

const getParamKey = () => {
  if (props.routeName === "risks") return "rKey";
  if (props.routeName === "avoidances") return "aKey";
  if (props.routeName === "attackTools") return "atKey";
  if (props.routeName === "threatActors") return "taKey";
  if (props.routeName === "terms") return "tKey";
  if (props.routeName === "cases") return "cKey";
  return "key";
};

const scrollSelectedItemToMobileListCenter = () => {
  const list = mobileListRef.value;
  if (!list) return false;

  const selectedElement = list.querySelector<HTMLElement>(
    `[data-knowledge-key="${CSS.escape(props.selectedKey)}"]`
  );
  if (!selectedElement) return false;

  const listRect = list.getBoundingClientRect();
  const selectedRect = selectedElement.getBoundingClientRect();
  const selectedTop = selectedRect.top - listRect.top + list.scrollTop;
  const targetScrollTop = selectedTop - (list.clientHeight - selectedElement.offsetHeight) / 2;
  const maxScrollTop = list.scrollHeight - list.clientHeight;
  list.scrollTop = Math.max(0, Math.min(targetScrollTop, maxScrollTop));
  mobileListScrollTop.value = list.scrollTop;
  return true;
};

const scrollDetailAnchorIntoView = () => {
  const detailAnchor = route.query.detailAnchor;
  if (typeof detailAnchor !== "string" || !detailAnchor) return;

  nextTick(() => {
    requestAnimationFrame(() => {
      const detail = detailRef.value;
      if (!detail) return;

      const target = detail.querySelector<HTMLElement>(
        `[data-detail-anchor="${CSS.escape(detailAnchor)}"]`
      );
      if (!target) return;

      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  });
};

const resetDetailScroll = () => {
  if (typeof route.query.detailAnchor === "string" && route.query.detailAnchor)
    return;

  nextTick(() => {
    requestAnimationFrame(() => {
      if (!detailRef.value) return;
      detailRef.value.scrollTop = 0;
    });
  });
};

const backToList = () => {
  if (isMobile.value && props.detailRouteName) {
    router.push({ name: props.routeName });
  } else {
    mobileView.value = "list";
  }
  nextTick(() => {
    requestAnimationFrame(() => {
      if (!scrollSelectedItemToMobileListCenter() && mobileListRef.value) {
        mobileListRef.value.scrollTop = mobileListScrollTop.value;
      }
    });
  });
};

watch(
  () => props.selectedKey,
  (key) => {
    if (!key) return;
    resetDetailScroll();
    if (isMobile.value) return;
    nextTick(() => {
      desktopListRef.value
        ?.querySelector(`[data-knowledge-key="${CSS.escape(key)}"]`)
        ?.scrollIntoView({ block: "nearest" });
    });
  },
  { immediate: true }
);

// 列表项变化时（如 cases 懒加载后从空变满），若选中项已可访问则滚动到该项
watch(
  () => props.items.length,
  (len) => {
    if (!len || !props.selectedKey || isMobile.value) return;
    if (!props.items.some((item) => item.id === props.selectedKey)) return;
    nextTick(() => {
      desktopListRef.value
        ?.querySelector(`[data-knowledge-key="${CSS.escape(props.selectedKey)}"]`)
        ?.scrollIntoView({ block: "nearest" });
    });
  }
);

watch(
  () => [props.selectedKey, route.query.detailAnchor, mobileView.value],
  () => {
    scrollDetailAnchorIntoView();
  },
  { immediate: true, flush: "post" }
);

watch(
  () => route.hash,
  (hash) => {
    const key = hash.replace("#", "");
    if (
      key &&
      props.items.some((item) => item.id === key)
    ) {
      if (key !== props.selectedKey) {
        emit("select", key);
      }
      if (isMobile.value) {
        mobileView.value = "detail";
      }
    }
  },
  { immediate: true }
);

// 移动端监听路由参数变化
watch(
  () => route.params,
  (params) => {
    if (!isMobile.value) return;
    const paramKey = getParamKey();
    const key = params[paramKey] as string | undefined;
    if (key && props.items.some((item) => item.id === key)) {
      if (key !== props.selectedKey) {
        emit("select", key);
      }
      mobileView.value = "detail";
    } else if (route.name === props.routeName) {
      mobileView.value = "list";
      nextTick(() => {
        requestAnimationFrame(() => {
          if (!scrollSelectedItemToMobileListCenter() && mobileListRef.value) {
            mobileListRef.value.scrollTop = mobileListScrollTop.value;
          }
        });
      });
    }
  },
  { immediate: true }
);

// 屏幕尺寸变化时重置视图状态
watch(isMobile, (mobile) => {
  if (!mobile) {
    mobileView.value = "list";
  } else if (route.params[getParamKey()] && selectedItem.value) {
    mobileView.value = "detail";
  } else if (route.hash && selectedItem.value) {
    mobileView.value = "detail";
  }
  // 切到移动端时清理 PC 拖拽态，避免遗留 window 监听与 body 样式
  if (mobile) endDrag();
});

onMounted(() => {
  window.addEventListener("resize", onWindowResize);
});

onBeforeUnmount(() => {
  if (resizeTimer) clearTimeout(resizeTimer);
  window.removeEventListener("resize", onWindowResize);
  endDrag();
});
</script>

<template>
  <!-- 桌面端：双栏布局 -->
  <section
    v-if="!isMobile"
    class="knowledge-page"
    :class="{ 'is-dragging': dragging, 'is-collapsed': isCollapsed }"
  >
    <aside class="knowledge-sidebar" :style="{ width: sidebarWidth + 'px' }">
      <div class="knowledge-header">
        <h3 class="knowledge-title">{{ title }}</h3>
        <slot name="filters" />
        <el-input
          id="knowledge-search"
          v-model="query"
          class="knowledge-search"
          name="knowledge-search"
          size="small"
          clearable
          :placeholder="searchPlaceholder"
        />
      </div>
      <div ref="desktopListRef" class="knowledge-list">
        <button
          v-for="item in filteredItems"
          :key="item.id"
          class="knowledge-list-item"
          :class="{ active: item.id === selectedKey }"
          :data-knowledge-key="item.id"
          type="button"
          @click="selectItem(item.id)"
        >
          <span class="knowledge-id">{{ item.id }}</span>
          <span class="knowledge-name">{{ item.title }}</span>
          <span v-if="item.subtitle || item.badge" class="knowledge-subtitle">
            <span v-if="item.subtitle" class="knowledge-subtitle-text">{{ item.subtitle }}</span>
            <span v-if="item.badge" class="knowledge-badge" :class="item.badgeType">{{ item.badge }}</span>
          </span>
        </button>
        <div v-if="filteredItems.length === 0" class="knowledge-empty">
          {{ $t("search.noResults") }}
        </div>
      </div>
    </aside>

    <div
      ref="splitterRef"
      class="knowledge-splitter"
      role="separator"
      aria-orientation="vertical"
      :aria-label="isCollapsed ? $t('knowledgeSidebarCollapsed') : $t('knowledgeSplitter')"
      :title="isCollapsed ? $t('knowledgeSidebarCollapsed') : $t('knowledgeSplitter')"
      @pointerdown="onSplitterPointerDown"
    />

    <main ref="detailRef" class="knowledge-detail">
      <template v-if="selectedItem">
        <slot :selected-key="selectedKey" />
      </template>
    </main>
  </section>

  <!-- 移动端：两态切换 -->
  <section v-else class="knowledge-mobile">
    <!-- 列表态 -->
    <template v-if="mobileView === 'list'">
      <aside class="knowledge-sidebar knowledge-mobile-sidebar">
        <div class="knowledge-header">
          <h3 class="knowledge-title">{{ title }}</h3>
          <slot name="filters" />
          <el-input
            id="knowledge-mobile-search"
            v-model="query"
            class="knowledge-search"
            name="knowledge-mobile-search"
            size="small"
            clearable
            :placeholder="searchPlaceholder"
          />
        </div>
        <div ref="mobileListRef" class="knowledge-list">
          <button
            v-for="item in filteredItems"
            :key="item.id"
            class="knowledge-list-item"
            :class="{ active: item.id === selectedKey }"
            :data-knowledge-key="item.id"
            type="button"
            @click="selectItem(item.id)"
          >
            <span class="knowledge-id">{{ item.id }}</span>
            <span class="knowledge-name">{{ item.title }}</span>
            <span v-if="item.subtitle || item.badge" class="knowledge-subtitle">
              <span v-if="item.subtitle" class="knowledge-subtitle-text">{{ item.subtitle }}</span>
              <span v-if="item.badge" class="knowledge-badge" :class="item.badgeType">{{ item.badge }}</span>
            </span>
          </button>
          <div v-if="filteredItems.length === 0" class="knowledge-empty">
            {{ $t("search.noResults") }}
          </div>
        </div>
      </aside>
    </template>

    <!-- 详情态 -->
    <template v-else>
      <div class="knowledge-mobile-detail-header">
        <el-button text @click="backToList" class="back-button">
          <el-icon><ArrowLeft /></el-icon>
          {{ $t("back") }}
        </el-button>
        <span v-if="selectedItem" class="mobile-detail-title">
          <span class="knowledge-id">{{ selectedItem.id }}</span>
          <span class="knowledge-name">{{ selectedItem.title }}</span>
        </span>
      </div>
      <main ref="detailRef" class="knowledge-detail knowledge-mobile-detail">
        <template v-if="selectedItem">
          <slot :selected-key="selectedKey" />
        </template>
      </main>
    </template>
  </section>
</template>

<style scoped>
.knowledge-page {
  display: flex;
  gap: 0;
  height: calc(100dvh - 150px);
  min-height: 520px;
}

.knowledge-page.is-dragging {
  cursor: col-resize;
  user-select: none;
}

.knowledge-sidebar,
.knowledge-detail {
  min-height: 0;
  border: 1px solid var(--break-border);
  background: var(--break-bg-card);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
}

.knowledge-sidebar {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: width 0.15s ease;
}

.knowledge-page.is-dragging .knowledge-sidebar {
  transition: none;
}

/* 收起态：宽度=0，隐藏边框与阴影，避免残留视觉边 */
.knowledge-page.is-collapsed .knowledge-sidebar {
  border-color: transparent;
  box-shadow: none;
}

.knowledge-splitter {
  flex: 0 0 8px;
  position: relative;
  cursor: col-resize;
  z-index: 1;
}

.knowledge-splitter::before {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
  transform: translateX(-50%);
  background: var(--break-border);
  transition: background 0.15s ease, width 0.15s ease;
}

.knowledge-splitter:hover::before,
.knowledge-page.is-dragging .knowledge-splitter::before,
.knowledge-page.is-collapsed .knowledge-splitter::before {
  background: var(--break-link);
  width: 2px;
}

.knowledge-detail {
  flex: 1 1 auto;
  min-width: 0;
}

.knowledge-header {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
  padding: 16px 18px 14px;
  border-bottom: 1px solid var(--break-border);
}

.knowledge-title {
  flex: 0 0 auto;
  margin: 0;
  color: var(--break-text-primary);
  font-size: 17px;
  font-weight: 650;
}

.knowledge-search {
  flex: 1 1 120px;
  min-width: 0;
}

.knowledge-list {
  min-height: 0;
  overflow-y: auto;
  padding: 10px;
}

.knowledge-list-item {
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 74px minmax(0, 1fr);
  gap: 6px 10px;
  width: 100%;
  min-height: 42px;
  padding: 9px 12px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--break-text-primary);
  text-align: left;
  cursor: pointer;
}

.knowledge-list-item:hover,
.knowledge-list-item:active {
  background: var(--break-bg-secondary);
  border-color: var(--break-border-light);
}

.knowledge-list-item.active {
  background: var(--break-highlight-bg);
  color: var(--break-link);
  border-color: var(--break-highlight-border);
}

.knowledge-id {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.25;
  color: var(--break-text-secondary);
}

.knowledge-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
  line-height: 1.25;
}

.knowledge-badge {
  display: inline-block;
  padding: 2px 8px;
  background: var(--break-bg-secondary);
  border: 1px solid var(--break-border);
  border-radius: 4px;
  font-size: 11px;
  font-weight: 400;
  color: var(--break-text-secondary);
  white-space: nowrap;
  flex-shrink: 0;
}

.knowledge-badge.ac01 {
  background: #f6e7bd;
  border-color: #d6a84a;
  color: #6f3f12;
}

.knowledge-badge.ac02 {
  background: #cdeedb;
  border-color: #6ab889;
  color: #164c2d;
}

.knowledge-badge.ac03 {
  background: #d4e1f3;
  border-color: #7fa8d8;
  color: #243f78;
}

.knowledge-badge.ac04 {
  background: #efd2e2;
  border-color: #c2749d;
  color: #762044;
}

html.dark .knowledge-badge.ac01 {
  background: rgba(120, 53, 15, 0.42);
  border-color: #9a671d;
  color: #efd59d;
}

html.dark .knowledge-badge.ac02 {
  background: rgba(20, 83, 45, 0.42);
  border-color: #2f8452;
  color: #b7dfc5;
}

html.dark .knowledge-badge.ac03 {
  background: rgba(30, 58, 138, 0.42);
  border-color: #426aa8;
  color: #c1d1ec;
}

html.dark .knowledge-badge.ac04 {
  background: rgba(131, 24, 67, 0.42);
  border-color: #9b3a68;
  color: #e7bfd2;
}

.knowledge-subtitle {
  display: flex;
  align-items: center;
  gap: 8px;
  grid-column: 2;
  min-width: 0;
  font-size: 12px;
  color: var(--break-text-secondary);
}

.knowledge-subtitle-text {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.knowledge-detail {
  overflow-y: auto;
  padding: 26px 30px 32px;
}

/* 移动端两态布局 */
.knowledge-mobile {
  display: flex;
  flex-direction: column;
  height: calc(100dvh - 150px);
  min-height: 420px;
}

.knowledge-mobile-sidebar {
  flex: 1;
  max-height: none;
  border-radius: 8px;
}

.knowledge-mobile-detail-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--break-border);
  background: var(--break-bg-card);
  border-radius: 8px 8px 0 0;
}

.back-button {
  flex: 0 0 auto;
  padding: 4px 8px;
}

.mobile-detail-title {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.mobile-detail-title .knowledge-name {
  color: var(--break-text-primary);
  font-weight: 600;
}

.knowledge-mobile-detail {
  flex: 1;
  border-radius: 0 0 8px 8px;
  border-top: none;
  padding: 16px 18px 24px;
}
</style>
