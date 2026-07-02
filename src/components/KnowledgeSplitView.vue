<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useBreakpoints } from "@/composables/useBreakpoints";
import { ArrowLeft } from "@element-plus/icons-vue";

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
  /** 详情路由参数名（rKey/aKey/atKey/taKey/tKey/cKey） */
  paramKey: string;
  items: KnowledgeItem[];
  selectedKey: string;
  searchPlaceholder: string;
  virtualList?: boolean;
  /** 列表数据是否仍在加载（懒加载场景）。加载中且无匹配项时展示“加载中”而非“未找到匹配结果”。 */
  loading?: boolean;
  /** 列表数据加载失败。失败态优先于加载中与无结果，展示失败提示与重试入口。 */
  loadError?: boolean;
  /** 加载失败提示文案的 i18n key，默认 error.dataLoadFailed。cases 等专属场景可传 error.caseSyncFailed。 */
  errorTextKey?: string;
}>();

const emit = defineEmits<{
  select: [key: string];
  retry: [];
}>();

const route = useRoute();
const router = useRouter();
const { isMobile } = useBreakpoints();
const query = ref("");
const mobileListRef = ref<HTMLElement>();
const desktopListRef = ref<HTMLElement>();
const detailRef = ref<HTMLElement>();
const mobileListScrollTop = ref(0);
const listScrollTop = ref(0);
const listViewportHeight = ref(0);
const VIRTUAL_ITEM_HEIGHT = 64;
const VIRTUAL_OVERSCAN = 6;
const VIRTUAL_VIEWPORT_FALLBACK = 520;

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

// 懒加载场景（如 cases）：数据未加载完成时列表为空，此时应提示“加载中”而非“未找到匹配结果”。
// 加载态优先于“未找到”——数据未就绪时即便输入了查询词，也不能下“无匹配”结论。
// 失败态优先于加载态，故加载态需排除已失败的情况。
const isLoadingEmpty = computed(
  () => !!props.loading && !props.loadError && filteredItems.value.length === 0
);

// 加载失败态：最高优先级，展示失败提示与重试入口。
const isErrorEmpty = computed(
  () => !!props.loadError && filteredItems.value.length === 0
);

// 失败提示文案 i18n key：默认通用 dataLoadFailed，调用方可覆盖（如 cases 传 caseSyncFailed）。
const errorTextKey = computed(() => props.errorTextKey || "error.dataLoadFailed");

const virtualStartIndex = computed(() => {
  if (!props.virtualList) return 0;
  return Math.max(0, Math.floor(listScrollTop.value / VIRTUAL_ITEM_HEIGHT) - VIRTUAL_OVERSCAN);
});

const virtualEndIndex = computed(() => {
  if (!props.virtualList) return filteredItems.value.length;
  const viewport = listViewportHeight.value || VIRTUAL_VIEWPORT_FALLBACK;
  const visibleCount = Math.ceil(viewport / VIRTUAL_ITEM_HEIGHT) + VIRTUAL_OVERSCAN * 2;
  return Math.min(filteredItems.value.length, virtualStartIndex.value + visibleCount);
});

const renderedItems = computed(() =>
  filteredItems.value.slice(virtualStartIndex.value, virtualEndIndex.value).map((item, index) => ({
    item,
    index: virtualStartIndex.value + index,
  }))
);

const virtualTopSpacerHeight = computed(() =>
  props.virtualList ? virtualStartIndex.value * VIRTUAL_ITEM_HEIGHT : 0
);

const virtualBottomSpacerHeight = computed(() =>
  props.virtualList
    ? Math.max(0, (filteredItems.value.length - virtualEndIndex.value) * VIRTUAL_ITEM_HEIGHT)
    : 0
);

const currentListElement = () => (isMobile.value ? mobileListRef.value : desktopListRef.value);

const updateListViewport = () => {
  const list = currentListElement();
  if (!list) return;
  listViewportHeight.value = list.clientHeight;
  listScrollTop.value = list.scrollTop;
};

const resetListScrollTop = () => {
  nextTick(() => {
    requestAnimationFrame(() => {
      const list = currentListElement();
      if (list) list.scrollTop = 0;
      listScrollTop.value = 0;
      updateListViewport();
    });
  });
};

const onListScroll = (e: Event) => {
  const target = (e.currentTarget || e.target) as HTMLElement | null;
  if (!target) return;
  listScrollTop.value = target.scrollTop;
  listViewportHeight.value = target.clientHeight;
};

const scrollListToItem = (list: HTMLElement, key: string) => {
  if (!props.virtualList) {
    const selectedElement = list.querySelector<HTMLElement>(
      `[data-knowledge-key="${CSS.escape(key)}"]`
    );
    if (!selectedElement) return false;

    const listRect = list.getBoundingClientRect();
    const selectedRect = selectedElement.getBoundingClientRect();
    const selectedTop = selectedRect.top - listRect.top + list.scrollTop;
    const targetScrollTop = selectedTop - (list.clientHeight - selectedElement.offsetHeight) / 2;
    const maxScrollTop = list.scrollHeight - list.clientHeight;
    list.scrollTop = Math.max(0, Math.min(targetScrollTop, maxScrollTop));
    return true;
  }

  const index = filteredItems.value.findIndex((item) => item.id === key);
  if (index < 0) return false;
  const targetScrollTop = index * VIRTUAL_ITEM_HEIGHT - (list.clientHeight - VIRTUAL_ITEM_HEIGHT) / 2;
  const maxScrollTop = Math.max(0, filteredItems.value.length * VIRTUAL_ITEM_HEIGHT - list.clientHeight);
  list.scrollTop = Math.max(0, Math.min(targetScrollTop, maxScrollTop));
  listScrollTop.value = list.scrollTop;
  listViewportHeight.value = list.clientHeight;
  return true;
};

const selectItem = (key: string, updateRoute = true) => {
  if (!props.items.some((item) => item.id === key)) return;
  if (isMobile.value && mobileListRef.value) {
    mobileListScrollTop.value = mobileListRef.value.scrollTop;
  }
  emit("select", key);

  // PC 与移动端均跳 detail 路由（list/detail 同组件互跳）
  if (updateRoute && props.detailRouteName) {
    router.push({ name: props.detailRouteName, params: { [props.paramKey]: key } });
  }

  if (isMobile.value) {
    mobileView.value = "detail";
  }
};

const scrollSelectedItemToMobileListCenter = () => {
  const list = mobileListRef.value;
  if (!list) return false;
  if (!scrollListToItem(list, props.selectedKey)) return false;
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
    // 无独立详情路由（如业务场景）时仅切换移动端视图态
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
      const list = desktopListRef.value;
      if (!list) return;
      if (props.virtualList) {
        scrollListToItem(list, key);
        return;
      }
      list
        .querySelector(`[data-knowledge-key="${CSS.escape(key)}"]`)
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
      const list = desktopListRef.value;
      if (!list) return;
      if (props.virtualList) {
        scrollListToItem(list, props.selectedKey);
        return;
      }
      list
        .querySelector(`[data-knowledge-key="${CSS.escape(props.selectedKey)}"]`)
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

// 监听路由参数变化（detail 路由 paramKey → 激活该项；list 路由 → 移动端回列表态）
watch(
  () => route.params,
  (params) => {
    const key = params[props.paramKey] as string | undefined;
    if (key && props.items.some((item) => item.id === key)) {
      if (key !== props.selectedKey) {
        emit("select", key);
      }
      if (isMobile.value) {
        mobileView.value = "detail";
      }
    } else if (route.name === props.routeName) {
      // list 路由：移动端回列表态
      if (isMobile.value) {
        mobileView.value = "list";
        nextTick(() => {
          requestAnimationFrame(() => {
            if (!scrollSelectedItemToMobileListCenter() && mobileListRef.value) {
              mobileListRef.value.scrollTop = mobileListScrollTop.value;
            }
          });
        });
      }
    }
  },
  { immediate: true }
);

// 屏幕尺寸变化时重置视图状态
watch(isMobile, (mobile) => {
  if (!mobile) {
    mobileView.value = "list";
  } else if (route.params[props.paramKey] && selectedItem.value) {
    mobileView.value = "detail";
  }
  // 切到移动端时清理 PC 拖拽态，避免遗留 window 监听与 body 样式
  if (mobile) endDrag();
});

onMounted(() => {
  window.addEventListener("resize", onWindowResize);
  nextTick(() => {
    requestAnimationFrame(updateListViewport);
  });
  // PC 下访问 list?selected={id} 自动跳转到 detail 路由
  if (!isMobile.value && route.name === props.routeName && props.detailRouteName) {
    const selected = typeof route.query.selected === "string" ? route.query.selected : "";
    if (selected && props.items.some((item) => item.id === selected)) {
      router.replace({
        name: props.detailRouteName,
        params: { [props.paramKey]: selected },
      });
    }
  }
});

watch(
  () => [isMobile.value, mobileView.value, props.virtualList, filteredItems.value.length],
  () => {
    nextTick(() => {
      requestAnimationFrame(updateListViewport);
    });
  },
  { flush: "post" }
);

watch(
  () => [query.value, props.items],
  () => {
    resetListScrollTop();
  }
);

// cases 等懒加载场景：items 从空变满后，若仍在 list?selected 等待跳转则补跳 detail
watch(
  () => props.items.length,
  (len) => {
    if (!len || isMobile.value) return;
    if (route.name !== props.routeName || !props.detailRouteName) return;
    const selected = typeof route.query.selected === "string" ? route.query.selected : "";
    if (selected && props.items.some((item) => item.id === selected)) {
      router.replace({
        name: props.detailRouteName,
        params: { [props.paramKey]: selected },
      });
    }
  }
);

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
      <div
        ref="desktopListRef"
        class="knowledge-list"
        :class="{ 'knowledge-list-virtual': virtualList }"
        @scroll="onListScroll"
      >
        <div
          v-if="virtualList && virtualTopSpacerHeight > 0"
          class="knowledge-virtual-spacer"
          :style="{ height: virtualTopSpacerHeight + 'px' }"
        />
        <button
          v-for="{ item, index } in renderedItems"
          :key="item.id"
          class="knowledge-list-item"
          :class="{ active: item.id === selectedKey }"
          :data-knowledge-key="item.id"
          :data-virtual-index="index"
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
        <div
          v-if="virtualList && virtualBottomSpacerHeight > 0"
          class="knowledge-virtual-spacer"
          :style="{ height: virtualBottomSpacerHeight + 'px' }"
        />
        <div
          v-if="filteredItems.length === 0"
          class="knowledge-empty"
          :class="{ 'is-loading': isLoadingEmpty, 'is-error': isErrorEmpty }"
        >
          <span v-if="isLoadingEmpty" class="knowledge-empty-spinner" aria-hidden="true"></span>
          <template v-if="isErrorEmpty">
            <span class="knowledge-empty-text">{{ $t(errorTextKey) }}</span>
            <button type="button" class="knowledge-empty-retry" @click="emit('retry')">
              {{ $t("error.retry") }}
            </button>
          </template>
          <template v-else>
            {{ isLoadingEmpty ? $t("loading") : $t("search.noResults") }}
          </template>
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
        <div
          ref="mobileListRef"
          class="knowledge-list"
          :class="{ 'knowledge-list-virtual': virtualList }"
          @scroll="onListScroll"
        >
          <div
            v-if="virtualList && virtualTopSpacerHeight > 0"
            class="knowledge-virtual-spacer"
            :style="{ height: virtualTopSpacerHeight + 'px' }"
          />
          <button
            v-for="{ item, index } in renderedItems"
            :key="item.id"
            class="knowledge-list-item"
            :class="{ active: item.id === selectedKey }"
            :data-knowledge-key="item.id"
            :data-virtual-index="index"
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
          <div
            v-if="virtualList && virtualBottomSpacerHeight > 0"
            class="knowledge-virtual-spacer"
            :style="{ height: virtualBottomSpacerHeight + 'px' }"
          />
          <div
            v-if="filteredItems.length === 0"
            class="knowledge-empty"
            :class="{ 'is-loading': isLoadingEmpty, 'is-error': isErrorEmpty }"
          >
            <span v-if="isLoadingEmpty" class="knowledge-empty-spinner" aria-hidden="true"></span>
            <template v-if="isErrorEmpty">
              <span class="knowledge-empty-text">{{ $t(errorTextKey) }}</span>
              <button type="button" class="knowledge-empty-retry" @click="emit('retry')">
                {{ $t("error.retry") }}
              </button>
            </template>
            <template v-else>
              {{ isLoadingEmpty ? $t("loading") : $t("search.noResults") }}
            </template>
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
  height: 100%;
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

.knowledge-list-virtual {
  overflow-anchor: none;
}

.knowledge-virtual-spacer {
  flex: 0 0 auto;
  pointer-events: none;
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
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease,
    transform 0.15s ease, box-shadow 0.15s ease;
}

.knowledge-list-virtual .knowledge-list-item {
  height: 64px;
  min-height: 64px;
}

.knowledge-list-item:hover,
.knowledge-list-item:active {
  background: var(--break-highlight-bg);
  border-color: var(--break-highlight-border);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
  transform: translateX(2px);
}

.knowledge-list-item.active {
  background: var(--break-highlight-bg);
  color: var(--break-link);
  border-color: var(--break-highlight-border);
}

.knowledge-list-item.active:hover,
.knowledge-list-item.active:active {
  background: color-mix(in srgb, var(--break-highlight-bg) 78%, var(--break-link) 22%);
  border-color: var(--break-link);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.14);
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
  background: var(--break-badge-ac01-bg);
  border-color: var(--break-badge-ac01-border);
  color: var(--break-badge-ac01-text);
}

.knowledge-badge.ac02 {
  background: var(--break-badge-ac02-bg);
  border-color: var(--break-badge-ac02-border);
  color: var(--break-badge-ac02-text);
}

.knowledge-badge.ac03 {
  background: var(--break-badge-ac03-bg);
  border-color: var(--break-badge-ac03-border);
  color: var(--break-badge-ac03-text);
}

.knowledge-badge.ac04 {
  background: var(--break-badge-ac04-bg);
  border-color: var(--break-badge-ac04-border);
  color: var(--break-badge-ac04-text);
}

html.dark .knowledge-badge.ac01 {
  background: var(--break-badge-ac01-bg);
  border-color: var(--break-badge-ac01-border);
  color: var(--break-badge-ac01-text);
}

html.dark .knowledge-badge.ac02 {
  background: var(--break-badge-ac02-bg);
  border-color: var(--break-badge-ac02-border);
  color: var(--break-badge-ac02-text);
}

html.dark .knowledge-badge.ac03 {
  background: var(--break-badge-ac03-bg);
  border-color: var(--break-badge-ac03-border);
  color: var(--break-badge-ac03-text);
}

html.dark .knowledge-badge.ac04 {
  background: var(--break-badge-ac04-bg);
  border-color: var(--break-badge-ac04-border);
  color: var(--break-badge-ac04-text);
}

.knowledge-badge.risk-basic {
  background: var(--break-badge-risk-basic-bg);
  border-color: var(--break-badge-risk-basic-border);
  color: var(--break-badge-risk-basic-text);
}

.knowledge-badge.risk-intermediate {
  background: var(--break-badge-risk-intermediate-bg);
  border-color: var(--break-badge-risk-intermediate-border);
  color: var(--break-badge-risk-intermediate-text);
}

.knowledge-badge.risk-advanced {
  background: var(--break-badge-risk-advanced-bg);
  border-color: var(--break-badge-risk-advanced-border);
  color: var(--break-badge-risk-advanced-text);
}

.knowledge-badge.case-cat-criminal_verdict {
  background: var(--break-badge-case-criminal-bg);
  border-color: var(--break-badge-case-criminal-border);
  color: var(--break-badge-case-criminal-text);
}

.knowledge-badge.case-cat-administrative_enforcement {
  background: var(--break-badge-case-admin-bg);
  border-color: var(--break-badge-case-admin-border);
  color: var(--break-badge-case-admin-text);
}

.knowledge-badge.case-cat-security_incident {
  background: var(--break-badge-case-incident-bg);
  border-color: var(--break-badge-case-incident-border);
  color: var(--break-badge-case-incident-text);
}

.knowledge-badge.case-cat-vulnerability_advisory {
  background: var(--break-badge-case-vuln-bg);
  border-color: var(--break-badge-case-vuln-border);
  color: var(--break-badge-case-vuln-text);
}

.knowledge-badge.case-cat-academic_research {
  background: var(--break-badge-case-academic-bg);
  border-color: var(--break-badge-case-academic-border);
  color: var(--break-badge-case-academic-text);
}

.knowledge-badge.case-cat-news_report {
  background: var(--break-badge-case-news-bg);
  border-color: var(--break-badge-case-news-border);
  color: var(--break-badge-case-news-text);
}

.knowledge-badge.term-cat-0 {
  background: var(--break-badge-term-0-bg);
  border-color: var(--break-badge-term-0-border);
  color: var(--break-badge-term-0-text);
}

.knowledge-badge.term-cat-1 {
  background: var(--break-badge-term-1-bg);
  border-color: var(--break-badge-term-1-border);
  color: var(--break-badge-term-1-text);
}

.knowledge-badge.term-cat-2 {
  background: var(--break-badge-term-2-bg);
  border-color: var(--break-badge-term-2-border);
  color: var(--break-badge-term-2-text);
}

.knowledge-badge.term-cat-3 {
  background: var(--break-badge-term-3-bg);
  border-color: var(--break-badge-term-3-border);
  color: var(--break-badge-term-3-text);
}

.knowledge-badge.term-cat-4 {
  background: var(--break-badge-term-4-bg);
  border-color: var(--break-badge-term-4-border);
  color: var(--break-badge-term-4-text);
}

.knowledge-badge.term-cat-5 {
  background: var(--break-badge-term-5-bg);
  border-color: var(--break-badge-term-5-border);
  color: var(--break-badge-term-5-text);
}

.knowledge-badge.term-cat-6 {
  background: var(--break-badge-term-6-bg);
  border-color: var(--break-badge-term-6-border);
  color: var(--break-badge-term-6-text);
}

.knowledge-badge.term-cat-7 {
  background: var(--break-badge-term-7-bg);
  border-color: var(--break-badge-term-7-border);
  color: var(--break-badge-term-7-text);
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
  height: 100%;
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

.knowledge-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px 12px;
  color: var(--break-text-muted);
  font-size: 13px;
  text-align: center;
}

.knowledge-empty.is-error {
  color: var(--break-text-secondary);
}

.knowledge-empty-spinner {
  width: 14px;
  height: 14px;
  border: 1px solid var(--break-border);
  border-top-color: var(--break-link);
  border-radius: 50%;
  animation: knowledge-empty-spin 0.8s linear infinite;
  flex-shrink: 0;
}

.knowledge-empty-retry {
  flex-shrink: 0;
  padding: 2px 10px;
  border: 1px solid var(--break-border);
  border-radius: 4px;
  background: var(--break-bg-card);
  color: var(--break-link);
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.knowledge-empty-retry:hover,
.knowledge-empty-retry:active {
  background: var(--break-highlight-bg);
  border-color: var(--break-highlight-border);
}

@keyframes knowledge-empty-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
