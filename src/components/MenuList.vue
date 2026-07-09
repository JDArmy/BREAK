<script lang="ts" setup>
import "element-plus/theme-chalk/display.css";

import GithubPane from "@/components/GithubPane.vue";
import ThemeToggle from "@/components/ThemeToggle.vue";
import iconTranslate from "@/components/icons/iconTranslate.vue";
import { ArrowDown, Search, Menu as MenuIcon, Loading, TopRight } from "@element-plus/icons-vue";
import { useI18n } from "vue-i18n";
import { languages, setLocale } from "@/i18n";
import { useTheme } from "@/composables/useTheme";
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { preloadRelationView } from "@/router";
import { prefetchAllKnowledgeViews } from "@/composables/useRoutePrefetch";
import { useBreakpoints } from "@/composables/useBreakpoints";
import { scrollActiveContainerToTop } from "@/utils/dom";
import { createRecoverableAsyncComponent } from "@/utils/chunkLoadRecovery";
import { topLoadingState } from "@/utils/topLoading";
import { buildProjectFeedbackIssueUrl } from "@/utils/feedback";

const { isMobile, isDesktop } = useBreakpoints();
const topLoadingActive = topLoadingState.active;
const topLoadingProgress = topLoadingState.progress;

// 移动端：点击顶部 banner 标题区，把当前页面滚动容器平滑滚回顶部
const handleBannerClick = () => {
  if (!isMobile.value) return;
  scrollActiveContainerToTop();
};

const loadSearchDialog = () => import("@/components/SearchDialog.vue");
const SearchDialog = createRecoverableAsyncComponent(
  loadSearchDialog,
  undefined,
  "SearchDialog",
  { showLoading: false },
);

const { locale } = useI18n();
const router = useRouter();
const route = useRoute();
const searchOpen = ref(false);
const searchDialogEnabled = ref(false);
const mobileMenuOpen = ref(false);
const localeChanging = ref(false);
const shortcutHint =
  typeof navigator !== "undefined" && navigator.platform?.includes("Mac")
    ? "⌘K"
    : "Ctrl+K";
const localeGroupTitle = computed(() => (locale.value === "en" ? "Language" : "语言"));

const preloadSearchDialog = () => {
  void loadSearchDialog();
};

// 延迟 + idle 预加载，返回清理函数以便组件卸载时取消尚未触发的回调
const scheduleDelayedIdle = (callback: () => void, delay: number) => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let idleHandle: number | null = null;
  timer = setTimeout(() => {
    timer = null;
    if ("requestIdleCallback" in window) {
      idleHandle = window.requestIdleCallback(callback, { timeout: 3000 });
    } else {
      callback();
    }
  }, delay);
  return () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (idleHandle !== null && "cancelIdleCallback" in window) {
      window.cancelIdleCallback(idleHandle);
      idleHandle = null;
    }
  };
};

const pendingCleanups: Array<() => void> = [];

const openSearchDialog = () => {
  preloadSearchDialog();
  searchDialogEnabled.value = true;
  searchOpen.value = true;
};

const handleLocaleChange = async (lang: string) => {
  if (localeChanging.value) return;
  localeChanging.value = true;
  try {
    await setLocale(lang as keyof typeof languages);
  } finally {
    localeChanging.value = false;
  }
};

const knowledgeRoutes: Record<string, string> = {
  risks: "/knowledges/risk/list",
  avoidances: "/knowledges/avoidance/list",
  attackTools: "/knowledges/attack-tool/list",
  threatActors: "/knowledges/threat-actor/list",
  terms: "/knowledges/term/list",
  cases: "/knowledges/case/list",
};

const handleKnowledgeCommand = (command: string) => {
  prefetchAllKnowledgeViews();
  const path = knowledgeRoutes[command];
  if (path) {
    router.push(path);
    mobileMenuOpen.value = false;
  }
};

const openProjectFeedback = () => {
  window.open(
    buildProjectFeedbackIssueUrl(window.location.href, locale.value),
    "_blank",
    "noopener,noreferrer",
  );
  mobileMenuOpen.value = false;
};

const handleMoreCommand = (command: string) => {
  if (command === "changelog") {
    void router.push("/changelog");
    mobileMenuOpen.value = false;
    return;
  }
  if (command === "docs") {
    void router.push("/docs");
    mobileMenuOpen.value = false;
    return;
  }
  if (command === "feedback") {
    openProjectFeedback();
  }
};

const handleMobileNav = (path: string) => {
  if (path !== "/" && !path.startsWith("/relations/")) {
    prefetchAllKnowledgeViews();
  }
  if (path.startsWith("/relations/")) {
    preloadRelationView("sankey");
  }
  router.push(path);
  mobileMenuOpen.value = false;
};

const handleMobileMenuOpen = () => {
  mobileMenuOpen.value = true;
  window.setTimeout(prefetchAllKnowledgeViews, 1200);
};

const handleDesktopMenuSelect = (index: string) => {
  if (index.startsWith("/relations/")) {
    preloadRelationView("network");
  }
};

const handleKnowledgeMenuVisible = (visible: boolean) => {
  if (visible) {
    prefetchAllKnowledgeViews();
  }
};

const handleGlobalKeydown = (event: KeyboardEvent) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    if (searchOpen.value) {
      searchOpen.value = false;
    } else {
      openSearchDialog();
    }
  }
};

onMounted(() => {
  document.addEventListener("keydown", handleGlobalKeydown);
  if (desktopMenuRef.value && typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(() => scheduleRecalc());
    resizeObserver.observe(desktopMenuRef.value);
  }
  void nextTick(() => scheduleRecalc());

  if (isDesktop.value) {
    preloadSearchDialog();
    prefetchAllKnowledgeViews();
    preloadRelationView("network");
    return;
  }

  const preload = () => preloadRelationView("sankey");
  pendingCleanups.push(scheduleDelayedIdle(preload, 12000));
  pendingCleanups.push(scheduleDelayedIdle(preloadSearchDialog, 18000));
});

onUnmounted(() => {
  document.removeEventListener("keydown", handleGlobalKeydown);
  if (recalcFrame) cancelAnimationFrame(recalcFrame);
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  while (pendingCleanups.length > 0) {
    const cleanup = pendingCleanups.pop();
    cleanup?.();
  }
});

// 语言切换会改变菜单文案宽度，切换完成后重算收起数
watch(locale, () => {
  void nextTick(() => scheduleRecalc());
});

watch(isDesktop, (desktop) => {
  if (desktop) {
    void nextTick(() => scheduleRecalc());
    preloadSearchDialog();
    prefetchAllKnowledgeViews();
    preloadRelationView("network");
  } else {
    hiddenCount.value = 0;
  }
});

watch(
  () => route.fullPath,
  () => {
    void nextTick(() => scheduleRecalc());
  },
);

const isKnowledgeActive = (fullPath: string) => {
  const active = getActiveIndex(fullPath);
  return [
    "/knowledges/risk/list",
    "/knowledges/avoidance/list",
    "/knowledges/attack-tool/list",
    "/knowledges/threat-actor/list",
    "/knowledges/term/list",
    "/knowledges/case/list",
  ].includes(active);
};

const isMoreActive = (fullPath: string) => {
  const active = getActiveIndex(fullPath);
  return active === "/changelog" || active === "/docs";
};

const getActiveKnowledge = (fullPath: string) => {
  const path = getActiveIndex(fullPath);
  if (path === "/knowledges/risk/list") return "risks";
  if (path === "/knowledges/avoidance/list") return "avoidances";
  if (path === "/knowledges/attack-tool/list") return "attackTools";
  if (path === "/knowledges/threat-actor/list") return "threatActors";
  if (path === "/knowledges/term/list") return "terms";
  if (path === "/knowledges/case/list") return "cases";
  if (path === "/changelog") return "changelog";
  return "";
};

const getActiveIndex = (fullPath: string) => {
  // 知识库 list/detail 统一归一到 list 路径，便于菜单高亮
  const knowledgesMatch = fullPath.match(
    /^\/knowledges\/(risk|avoidance|attack-tool|threat-actor|term|case)\//
  );
  if (knowledgesMatch) return `/knowledges/${knowledgesMatch[1]}/list`;
  if (fullPath.startsWith("/changelog")) return "/changelog";
  if (fullPath.startsWith("/docs")) return "/docs";
  if (fullPath.match(/^\/business-domain\//)) return "/";
  if (fullPath.match(/^\/home\//)) return "/";
  if (fullPath.match(/^\/relations\//)) return "/relations/risk-relation/risk/R0001";

  return fullPath.split("#")[0];
};

// ============ 桌面端菜单响应式收起（从右往左收进汉堡） ============
// 可收起项按从左到右顺序排列；hiddenCount 表示从右往左收起几项。
// 屏幕变窄溢出时 hiddenCount++，变宽有余量时 hiddenCount--。
const { theme, setTheme } = useTheme();

// 可收起项配置：key 唯一标识，kind 决定汉堡内渲染方式
type CollapsibleKind = "link" | "knowledge" | "more" | "jdarmy" | "theme" | "locale" | "github";
const COLLAPSIBLE_ITEMS: { key: string; kind: CollapsibleKind }[] = [
  { key: "home", kind: "link" },
  { key: "relations", kind: "link" },
  { key: "knowledge", kind: "knowledge" },
  { key: "more", kind: "more" },
  { key: "jdarmy", kind: "jdarmy" },
  { key: "theme", kind: "theme" },
  { key: "locale", kind: "locale" },
  { key: "github", kind: "github" },
];
const COLLAPSIBLE_TOTAL = COLLAPSIBLE_ITEMS.length;

const desktopMenuRef = ref<HTMLElement | null>(null);
const hiddenCount = ref(0);
let resizeObserver: ResizeObserver | null = null;
let recalcFrame: number | undefined;
let isRecalculating = false;

/** 第 index（从左 0 起）项是否被收进汉堡：从右往左收，收起右侧 hiddenCount 项 */
const isItemHidden = (index: number) => index >= COLLAPSIBLE_TOTAL - hiddenCount.value;

/** 当前被收进汉堡的项配置（保持从左到右顺序，便于汉堡内分组展示） */
const hiddenItems = computed(() =>
  COLLAPSIBLE_ITEMS.filter((_, i) => isItemHidden(i)),
);

/** 汉堡按钮是否高亮：任一被收起项的 active 态命中当前路由 */
const isOverflowActive = computed(() => {
  const active = getActiveIndex(route.fullPath);
  return hiddenItems.value.some((item) => {
    if (item.key === "home") return active === "/";
    if (item.key === "relations") return active.startsWith("/relations/");
    if (item.key === "knowledge") return isKnowledgeActive(route.fullPath);
    if (item.key === "more") return isMoreActive(route.fullPath);
    return false; // theme/locale/github/jdarmy 无路由 active 态
  });
});

/**
 * 测量菜单是否溢出，调整 hiddenCount（单次调用内完整收敛，async 等待 DOM 更新）。
 * - 溢出：逐项收起最右未收起项，每收一项 await nextTick 再测，直到不溢出或全部收起
 * - 未溢出：逐项试探放回最左已收起项，放回后 await nextTick 再测，溢出则回退并停止
 * isRecalculating 标志 + 单次完整收敛，避免 ResizeObserver 重入与放回/收起抖动。
 */
const recalculateOverflow = async () => {
  // 测量 el-menu（ul.el-menu--horizontal）的溢出：它是 flex nowrap 容器，
  // 子项总宽超过自身宽度时 scrollWidth > clientWidth。nav 仅作为 ResizeObserver 触发器。
  const el = desktopMenuRef.value?.querySelector<HTMLElement>(".el-menu");
  if (!el) return;
  if (!isDesktop.value || el.clientWidth === 0) {
    hiddenCount.value = 0;
    return;
  }
  const overflowing = () => el.scrollWidth > el.clientWidth + 1;
  let guard = COLLAPSIBLE_TOTAL + 1;

  // 收起循环
  while (overflowing() && hiddenCount.value < COLLAPSIBLE_TOTAL && guard-- > 0) {
    hiddenCount.value++;
    await nextTick();
  }

  // 放回循环：试探性放回，放回后仍不溢出才保留
  while (hiddenCount.value > 0 && guard-- > 0) {
    const prev = hiddenCount.value;
    hiddenCount.value--;
    await nextTick();
    if (overflowing()) {
      hiddenCount.value = prev;
      break;
    }
  }
};

const scheduleRecalc = () => {
  if (isRecalculating) return;
  isRecalculating = true;
  if (recalcFrame) cancelAnimationFrame(recalcFrame);
  recalcFrame = requestAnimationFrame(async () => {
    try {
      await recalculateOverflow();
    } finally {
      isRecalculating = false;
    }
  });
};
</script>

<template>
  <!-- 移动端导航栏 -->
  <nav class="hidden-md-and-up mobile-nav" aria-label="Mobile navigation">
    <el-menu
      :default-active="getActiveIndex($route.fullPath)"
      mode="horizontal"
      :ellipsis="false"
      :router="false"
      class="mobile-menu"
      style="height: 100%"
      role="none"
    >
    <button class="mobile-logo-button" type="button" aria-label="JDArmy BREAK" @click="$router.push('/')">
      <img src="/logo.png" class="logo" width="50" alt="" />
    </button>
    <h3
      class="banner"
      :class="{ 'banner--clickable': isMobile }"
      :title="$t('backtop')"
      role="button"
      tabindex="0"
      style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%"
      @click="handleBannerClick"
      @keydown.enter="handleBannerClick"
    >
      {{ $t("BREAK.name") }}
    </h3>
    <div class="mobile-nav-right" role="none">
      <button class="mobile-search" type="button" :aria-label="$t('search.placeholder')" @click="openSearchDialog">
        <el-icon><Search /></el-icon>
      </button>
      <button class="mobile-hamburger" type="button" :aria-label="$t('menu.knowledge')" @click="handleMobileMenuOpen">
        <el-icon :size="20"><MenuIcon /></el-icon>
      </button>
    </div>
    <div
      v-show="topLoadingActive"
      class="top-loading-line"
      aria-hidden="true"
    >
      <div class="top-loading-line__bar" :style="{ width: `${topLoadingProgress}%` }"></div>
    </div>
    </el-menu>
  </nav>

  <!-- 移动端侧滑菜单 -->
  <el-drawer
    v-model="mobileMenuOpen"
    direction="ltr"
    :size="280"
    :show-close="false"
    class="mobile-nav-drawer"
  >
    <template #header>
      <div class="drawer-header">
        <img src="/logo.png" class="drawer-logo" alt="JDArmy BREAK" />
        <span class="drawer-title">{{ $t("BREAK.name") }}</span>
      </div>
    </template>
    <div class="mobile-nav-list">
      <div class="mobile-nav-item" :class="{ active: getActiveIndex(route.fullPath) === '/' }" @click="handleMobileNav('/')">
        <span>{{ $t("menu.home") }}</span>
      </div>

      <div class="mobile-nav-item" :class="{ active: route.fullPath.match(/^\/relations\//) }" @click="handleMobileNav('/relations/risk-relation/risk/R0001')">
        <span>{{ $t("relationMap") }}</span>
      </div>

      <div class="mobile-nav-group">
        <div class="mobile-nav-group-title">{{ $t("menu.knowledge") }}</div>
        <div class="mobile-nav-item" :class="{ active: getActiveIndex(route.fullPath) === '/knowledges/risk/list' }" @click="handleMobileNav('/knowledges/risk/list')">
          <span>{{ $t("menu.risks") }}</span>
        </div>
        <div class="mobile-nav-item" :class="{ active: getActiveIndex(route.fullPath) === '/knowledges/avoidance/list' }" @click="handleMobileNav('/knowledges/avoidance/list')">
          <span>{{ $t("menu.avoidances") }}</span>
        </div>
        <div class="mobile-nav-item" :class="{ active: getActiveIndex(route.fullPath) === '/knowledges/attack-tool/list' }" @click="handleMobileNav('/knowledges/attack-tool/list')">
          <span>{{ $t("attackTools") }}</span>
        </div>
        <div class="mobile-nav-item" :class="{ active: getActiveIndex(route.fullPath) === '/knowledges/threat-actor/list' }" @click="handleMobileNav('/knowledges/threat-actor/list')">
          <span>{{ $t("threatActors") }}</span>
        </div>
        <div class="mobile-nav-item" :class="{ active: getActiveIndex(route.fullPath) === '/knowledges/term/list' }" @click="handleMobileNav('/knowledges/term/list')">
          <span>{{ $t("terms") }}</span>
        </div>
        <div class="mobile-nav-item" :class="{ active: getActiveIndex(route.fullPath) === '/knowledges/case/list' }" @click="handleMobileNav('/knowledges/case/list')">
          <span>{{ $t("cases") }}</span>
        </div>
      </div>

      <div class="mobile-nav-group">
        <div class="mobile-nav-group-title">{{ $t("menu.more") }}</div>
        <div class="mobile-nav-item" :class="{ active: route.fullPath.startsWith('/docs') }" @click="handleMobileNav('/docs')">
          <span>{{ $t("menu.docs") }}</span>
        </div>
        <div class="mobile-nav-item" :class="{ active: route.fullPath.startsWith('/changelog') }" @click="handleMobileNav('/changelog')">
          <span>{{ $t("menu.changelog") }}</span>
        </div>
        <div class="mobile-nav-item mobile-nav-item--with-icon" @click="openProjectFeedback">
          <span>{{ $t("menu.feedback") }}</span>
          <el-icon><TopRight /></el-icon>
        </div>
      </div>

      <div class="mobile-nav-divider"></div>

      <div class="mobile-nav-group">
        <div class="mobile-nav-group-title">JDArmy</div>
        <a class="mobile-nav-item mobile-nav-link mobile-nav-item--with-icon" href="https://jd.army" target="_blank" rel="noopener noreferrer">
          <span>Webpage</span>
          <el-icon><TopRight /></el-icon>
        </a>
        <a class="mobile-nav-item mobile-nav-link mobile-nav-item--with-icon" href="https://blog.jd.army" target="_blank" rel="noopener noreferrer">
          <span>Blog</span>
          <el-icon><TopRight /></el-icon>
        </a>
        <a class="mobile-nav-item mobile-nav-link mobile-nav-item--with-icon" href="https://rtass.jd.army" target="_blank" rel="noopener noreferrer">
          <span>RTASS</span>
          <el-icon><TopRight /></el-icon>
        </a>
        <a class="mobile-nav-item mobile-nav-link mobile-nav-item--with-icon" href="https://dsre.jd.army" target="_blank" rel="noopener noreferrer">
          <span>DSRE</span>
          <el-icon><TopRight /></el-icon>
        </a>
        <a class="mobile-nav-item mobile-nav-link mobile-nav-item--with-icon" href="https://textwatermark.jd.army" target="_blank" rel="noopener noreferrer">
          <span>Text Watermark</span>
          <el-icon><TopRight /></el-icon>
        </a>
      </div>

      <div class="mobile-nav-divider"></div>

      <div class="mobile-nav-actions">
        <ThemeToggle />
        <el-dropdown trigger="click" :disabled="localeChanging" popper-class="mobile-locale-dropdown-menu" @command="handleLocaleChange">
          <span class="mobile-locale-toggle">
            <el-icon v-if="localeChanging" class="locale-loading-icon"><Loading /></el-icon>
            <icon-translate v-else />
            <span>{{ languages[locale as keyof typeof languages] }}</span>
            <el-icon><arrow-down /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                v-for="(label, lang) in languages"
                :key="lang"
                :command="lang"
                :class="{ 'is-active': locale === lang }"
              >{{ label }}</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>

      <div class="mobile-nav-footer">
        <a href="https://github.com/JDArmy/BREAK" target="_blank" rel="noopener noreferrer" class="mobile-github">
          <github-pane />
        </a>
      </div>
    </div>
  </el-drawer>

  <!-- 桌面端导航栏 -->
  <nav ref="desktopMenuRef" class="hidden-sm-and-down desktop-nav" aria-label="Main navigation">
    <el-menu
      :default-active="getActiveIndex($route.fullPath)"
      mode="horizontal"
      :ellipsis="false"
      :router="true"
      class="desktop-menu"
      role="none"
      @select="handleDesktopMenuSelect"
    >
    <div role="none" style="display: flex; align-items: center;">
      <button class="desktop-logo-button" type="button" aria-label="JDArmy BREAK" @click="$router.push('/')">
      <img src="/logo.png" class="logo" width="40" height="40" alt="JDArmy BREAK" />
      </button>
    </div>

    <div role="none" style="display: flex; align-items: center;">
      <h3 class="banner">
        {{ $t("BREAK.name") }}
      </h3>
    </div>

    <div class="flex-grow" role="none">
      <button
        class="search-trigger"
        type="button"
        @click="openSearchDialog"
      >
        <el-icon><Search /></el-icon>
        <span class="search-placeholder">{{ $t("search.placeholder") }}</span>
        <span class="search-shortcut">{{ shortcutHint }}</span>
      </button>
    </div>
    <el-menu-item v-if="!isItemHidden(0)" class="" index="/">{{ $t("menu.home") }}</el-menu-item>
    <el-menu-item v-if="!isItemHidden(1)" index="/relations/risk-relation/risk/R0001">{{
      $t("relationMap")
    }}</el-menu-item>
    <el-dropdown
      v-if="!isItemHidden(2)"
      class="knowledge-menu"
      :class="{ 'is-active': isKnowledgeActive($route.fullPath) }"
      @command="handleKnowledgeCommand"
      @visible-change="handleKnowledgeMenuVisible"
    >
      <span
        class="el-dropdown-link"
        :aria-label="$t('menu.knowledge')"
        role="button"
        tabindex="0"
        @mouseenter="prefetchAllKnowledgeViews"
        @focus="prefetchAllKnowledgeViews"
      >
        {{ $t("menu.knowledge") }}<el-icon><arrow-down /></el-icon>
      </span>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="risks" :class="{ 'is-active': getActiveKnowledge($route.fullPath) === 'risks' }">{{ $t("menu.risks") }}</el-dropdown-item>
          <el-dropdown-item command="avoidances" :class="{ 'is-active': getActiveKnowledge($route.fullPath) === 'avoidances' }">{{ $t("menu.avoidances") }}</el-dropdown-item>
          <el-dropdown-item command="attackTools" :class="{ 'is-active': getActiveKnowledge($route.fullPath) === 'attackTools' }">{{ $t("attackTools") }}</el-dropdown-item>
          <el-dropdown-item command="threatActors" :class="{ 'is-active': getActiveKnowledge($route.fullPath) === 'threatActors' }">{{ $t("threatActors") }}</el-dropdown-item>
          <el-dropdown-item command="terms" :class="{ 'is-active': getActiveKnowledge($route.fullPath) === 'terms' }">{{ $t("terms") }}</el-dropdown-item>
          <el-dropdown-item command="cases" :class="{ 'is-active': getActiveKnowledge($route.fullPath) === 'cases' }">{{ $t("cases") }}</el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>

    <el-dropdown
      v-if="!isItemHidden(3)"
      class="more-menu"
      :class="{ 'is-active': isMoreActive($route.fullPath) }"
      @command="handleMoreCommand"
    >
      <span
        class="el-dropdown-link"
        :aria-label="$t('menu.more')"
        role="button"
        tabindex="0"
      >
        {{ $t("menu.more") }}<el-icon><arrow-down /></el-icon>
      </span>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="docs" :class="{ 'is-active': getActiveIndex($route.fullPath) === '/docs' }">{{ $t("menu.docs") }}</el-dropdown-item>
          <el-dropdown-item command="changelog" :class="{ 'is-active': getActiveIndex($route.fullPath) === '/changelog' }">{{ $t("menu.changelog") }}</el-dropdown-item>
          <el-dropdown-item command="feedback" class="feedback-menu-item">{{ $t("menu.feedback") }}<el-icon><TopRight /></el-icon></el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>

    <el-dropdown v-if="!isItemHidden(4)" class="outside-link">
      <span class="el-dropdown-link" aria-label="JDArmy" role="button" tabindex="0"
        >JDArmy<el-icon>
          <arrow-down />
        </el-icon>
      </span>
      <template #dropdown>
        <el-dropdown-menu class="outside-link-menu">
          <el-dropdown-item
            ><a class="external-link-item" target="_blank" rel="noopener noreferrer" href="https://jd.army"
              ><span>Webpage</span><el-icon><TopRight /></el-icon></a
            ></el-dropdown-item
          >
          <el-dropdown-item
            ><a class="external-link-item" target="_blank" rel="noopener noreferrer" href="https://blog.jd.army"
              ><span>Blog</span><el-icon><TopRight /></el-icon></a
            ></el-dropdown-item
          >
          <el-dropdown-item divided
            ><a
              class="external-link-item"
              target="_blank" rel="noopener noreferrer"
              href="https://rtass.jd.army"
              title="Red Team Assessment Scoring System Open Source Framework"
              ><span>RTASS</span><el-icon><TopRight /></el-icon></a
            ></el-dropdown-item
          >
          <el-dropdown-item
            ><a
              class="external-link-item"
              target="_blank" rel="noopener noreferrer"
              href="https://dsre.jd.army"
              title="Data Security Risk Enumeration Open Source Framkework"
              ><span>DSRE</span><el-icon><TopRight /></el-icon></a
            ></el-dropdown-item
          >
          <el-dropdown-item divided
            ><a
              class="external-link-item"
              target="_blank" rel="noopener noreferrer"
              href="https://textwatermark.jd.army"
              title="A Open Source Library for Text Watermarking in python"
              ><span>Text Watermark</span><el-icon><TopRight /></el-icon></a
            ></el-dropdown-item
          >
        </el-dropdown-menu>
      </template>
    </el-dropdown>

    <ThemeToggle v-if="!isItemHidden(5)" />

    <el-dropdown v-if="!isItemHidden(6)" class="translate" trigger="click" :disabled="localeChanging" @command="handleLocaleChange">
      <span class="el-dropdown-link" :aria-label="languages[locale as keyof typeof languages]" role="button" tabindex="0">
        <el-icon v-if="localeChanging" class="locale-loading-icon"><Loading /></el-icon>
        <icon-translate v-else />
        <span class="locale-label">{{ languages[locale as keyof typeof languages] }}</span>
        <el-icon><arrow-down /></el-icon>
      </span>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item
            v-for="(label, lang) in languages"
            :key="lang"
            :command="lang"
            :class="{ 'is-active': locale === lang }"
          >{{ label }}</el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>

    <div v-if="!isItemHidden(7)" class="github" role="none">
      <github-pane />
    </div>

    <!-- 收起溢出项的汉堡菜单：仅当有项被收起时显示 -->
    <el-dropdown
      v-if="hiddenCount > 0"
      class="overflow-menu"
      :class="{ 'is-active': isOverflowActive }"
      trigger="click"
      placement="bottom-end"
    >
      <span class="el-dropdown-link" :aria-label="$t('menu.more')" role="button" tabindex="0">
        <el-icon><MenuIcon /></el-icon>
      </span>
      <template #dropdown>
        <el-dropdown-menu class="overflow-menu-list">
          <template v-for="item in hiddenItems" :key="item.key">
            <!-- 首页 / 关系图谱 -->
            <el-dropdown-item
              v-if="item.kind === 'link'"
              :class="{ 'is-active': item.key === 'home' ? getActiveIndex($route.fullPath) === '/' : getActiveIndex($route.fullPath).startsWith('/relations/') }"
              @click="item.key === 'home' ? $router.push('/') : $router.push('/relations/risk-relation/risk/R0001')"
            >{{ item.key === 'home' ? $t('menu.home') : $t('relationMap') }}</el-dropdown-item>

            <!-- 知识库：平铺 6 个子项 -->
            <template v-else-if="item.kind === 'knowledge'">
              <el-dropdown-item divided :disabled="true" class="overflow-group-title">{{ $t('menu.knowledge') }}</el-dropdown-item>
              <el-dropdown-item command="risks" @click="handleKnowledgeCommand('risks')">{{ $t('menu.risks') }}</el-dropdown-item>
              <el-dropdown-item command="avoidances" @click="handleKnowledgeCommand('avoidances')">{{ $t('menu.avoidances') }}</el-dropdown-item>
              <el-dropdown-item command="attackTools" @click="handleKnowledgeCommand('attackTools')">{{ $t('attackTools') }}</el-dropdown-item>
              <el-dropdown-item command="threatActors" @click="handleKnowledgeCommand('threatActors')">{{ $t('threatActors') }}</el-dropdown-item>
              <el-dropdown-item command="terms" @click="handleKnowledgeCommand('terms')">{{ $t('terms') }}</el-dropdown-item>
              <el-dropdown-item command="cases" @click="handleKnowledgeCommand('cases')">{{ $t('cases') }}</el-dropdown-item>
            </template>

            <!-- 更多：平铺 3 个子项 -->
            <template v-else-if="item.kind === 'more'">
              <el-dropdown-item divided :disabled="true" class="overflow-group-title">{{ $t('menu.more') }}</el-dropdown-item>
              <el-dropdown-item @click="handleMoreCommand('docs')">{{ $t('menu.docs') }}</el-dropdown-item>
              <el-dropdown-item @click="handleMoreCommand('changelog')">{{ $t('menu.changelog') }}</el-dropdown-item>
              <el-dropdown-item class="feedback-menu-item" @click="handleMoreCommand('feedback')">{{ $t('menu.feedback') }}<el-icon><TopRight /></el-icon></el-dropdown-item>
            </template>

            <!-- JDArmy：平铺外链子项 -->
            <template v-else-if="item.kind === 'jdarmy'">
              <el-dropdown-item divided :disabled="true" class="overflow-group-title">JDArmy</el-dropdown-item>
              <el-dropdown-item><a class="external-link-item" target="_blank" rel="noopener noreferrer" href="https://jd.army"><span>Webpage</span><el-icon><TopRight /></el-icon></a></el-dropdown-item>
              <el-dropdown-item><a class="external-link-item" target="_blank" rel="noopener noreferrer" href="https://blog.jd.army"><span>Blog</span><el-icon><TopRight /></el-icon></a></el-dropdown-item>
              <el-dropdown-item divided><a class="external-link-item" target="_blank" rel="noopener noreferrer" href="https://rtass.jd.army" title="Red Team Assessment Scoring System Open Source Framework"><span>RTASS</span><el-icon><TopRight /></el-icon></a></el-dropdown-item>
              <el-dropdown-item><a class="external-link-item" target="_blank" rel="noopener noreferrer" href="https://dsre.jd.army" title="Data Security Risk Enumeration Open Source Framkework"><span>DSRE</span><el-icon><TopRight /></el-icon></a></el-dropdown-item>
              <el-dropdown-item divided><a class="external-link-item" target="_blank" rel="noopener noreferrer" href="https://textwatermark.jd.army" title="A Open Source Library for Text Watermarking in python"><span>Text Watermark</span><el-icon><TopRight /></el-icon></a></el-dropdown-item>
            </template>

            <!-- 主题：平铺 3 个模式 -->
            <template v-else-if="item.kind === 'theme'">
              <el-dropdown-item divided :disabled="true" class="overflow-group-title">{{ $t('theme.current') }}</el-dropdown-item>
              <el-dropdown-item :class="{ 'is-active': theme === 'light' }" @click="setTheme('light')">{{ $t('theme.light') }}</el-dropdown-item>
              <el-dropdown-item :class="{ 'is-active': theme === 'dark' }" @click="setTheme('dark')">{{ $t('theme.dark') }}</el-dropdown-item>
              <el-dropdown-item :class="{ 'is-active': theme === 'system' }" @click="setTheme('system')">{{ $t('theme.system') }}</el-dropdown-item>
            </template>

            <!-- 语言：平铺语言选项 -->
            <template v-else-if="item.kind === 'locale'">
              <el-dropdown-item divided :disabled="true" class="overflow-group-title">{{ localeGroupTitle }}</el-dropdown-item>
              <el-dropdown-item
                v-for="(label, lang) in languages"
                :key="lang"
                :class="{ 'is-active': locale === lang }"
                @click="handleLocaleChange(lang as string)"
              >{{ label }}</el-dropdown-item>
            </template>

            <!-- GitHub -->
            <el-dropdown-item v-else-if="item.kind === 'github'" divided>
              <a target="_blank" rel="noopener noreferrer" href="https://github.com/JDArmy/BREAK">GitHub</a>
            </el-dropdown-item>
          </template>
        </el-dropdown-menu>
      </template>
    </el-dropdown>

    </el-menu>
    <div
      v-show="topLoadingActive"
      class="top-loading-line"
      aria-hidden="true"
    >
      <div class="top-loading-line__bar" :style="{ width: `${topLoadingProgress}%` }"></div>
    </div>
  </nav>

  <SearchDialog v-if="searchDialogEnabled && searchOpen" v-model="searchOpen" />
</template>

<style scoped>
.logo {
  background: var(--break-bg-secondary);
  border-radius: 10px;
  margin: 5px;
  width: 40px;
}

.mobile-nav,
.desktop-nav {
  height: 100%;
  position: relative;
}

.desktop-menu {
  flex-wrap: nowrap;
}

.desktop-menu :deep(.el-menu-item),
.desktop-menu :deep(.el-sub-menu__title),
.desktop-menu .knowledge-menu,
.desktop-menu .more-menu,
.desktop-menu .outside-link,
.desktop-menu .translate,
.desktop-menu .github,
.desktop-menu .overflow-menu {
  flex: 0 0 auto;
  white-space: nowrap;
}

.top-loading-line {
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  z-index: 10;
  height: 2px;
  overflow: hidden;
  background: transparent;
  pointer-events: none;
}

.top-loading-line__bar {
  height: 100%;
  width: 0;
  background: linear-gradient(90deg, var(--break-link), var(--sky-400), var(--cyan-400));
  box-shadow: 0 0 8px rgba(56, 189, 248, 0.72);
  transition: width 180ms ease;
}

.mobile-logo-button,
.desktop-logo-button,
.mobile-search,
.mobile-hamburger {
  border: 0;
  background: transparent;
  color: var(--break-text-primary);
  font: inherit;
  cursor: pointer;
}

.mobile-logo-button,
.desktop-logo-button {
  display: flex;
  align-items: center;
  padding: 0;
}

.mobile-logo-button {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
}

.desktop-logo-button {
  min-height: var(--el-menu-item-height);
}

.flex-grow {
  flex-grow: 1;
  min-width: 160px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0 8px;
}

.search-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  box-sizing: border-box;
  padding: 4px 12px;
  border: 0;
  border-radius: 6px;
  background: var(--break-bg-secondary);
  color: var(--break-text-primary);
  cursor: pointer;
  font-family: inherit;
  transition: background-color 0.2s;
  max-width: 260px;
  width: 100%;
}

.search-trigger:hover,
.search-trigger:active {
  background: var(--break-bg-card);
}

.search-trigger .el-icon {
  color: var(--break-text-secondary);
  font-size: 14px;
}

.search-placeholder {
  flex: 1;
  font-size: 13px;
  color: var(--break-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-shortcut {
  font-size: 11px;
  color: var(--break-text-secondary);
  padding: 2px 5px;
  border: 1px solid var(--break-border);
  border-radius: 3px;
  white-space: nowrap;
}

.mobile-nav-right {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
}

.mobile-search {
  font-size: 18px;
  display: flex;
  align-items: center;
  padding: 4px;
}

.mobile-hamburger {
  display: flex;
  align-items: center;
  padding: 4px;
}

.banner {
  color: var(--break-text-primary);
  padding-left: 10px;
  padding-bottom: 0px;
  margin: 0;
  text-align: center;
  font-weight: 600;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.banner--clickable {
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.sm-banner {
  text-align: center;
  width: 100%;
}

.description {
  color: var(--break-text-primary);
  margin: 0 0 5px 0;
  padding: 0 0 0 10px;
}

.translate,
.knowledge-menu,
.more-menu,
.github {
  color: var(--el-menu-text-color);
  height: var(--el-menu-item-height);
  line-height: var(--el-menu-item-height);
  padding: 0 var(--el-menu-base-level-padding);
  margin: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
}

.translate .el-dropdown-link,
.knowledge-menu .el-dropdown-link,
.more-menu .el-dropdown-link {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--el-menu-text-color);
  cursor: pointer;
  white-space: nowrap;
}

.locale-label {
  user-select: none;
}

/* 语言切换中：loading icon 替换 translate icon，旋转动画 */
.locale-loading-icon {
  animation: locale-loading-spin 1s linear infinite;
}

@keyframes locale-loading-spin {
  to {
    transform: rotate(360deg);
  }
}

.outside-link {
  height: var(--el-menu-item-height);
  line-height: var(--el-menu-item-height);
  color: var(--el-menu-text-color);
  padding: 0 var(--el-menu-base-level-padding);
  cursor: pointer;
}

.outside-link .el-dropdown-link {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--el-menu-text-color);
  cursor: pointer;
  white-space: nowrap;
}

.knowledge-menu.is-active .el-dropdown-link,
.more-menu.is-active .el-dropdown-link {
  color: var(--el-menu-active-color);
}

.knowledge-menu.is-active::after,
.more-menu.is-active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background-color: var(--el-menu-active-color);
}

.translate {
  padding: 0 10px;
}

.outside-link-menu a {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  width: 100%;
  height: 100%;
  text-align: center;
  color: var(--break-text-primary);
  text-decoration: none;
}

/* 桌面端溢出汉堡菜单 */
.overflow-menu {
  height: var(--el-menu-item-height);
  line-height: var(--el-menu-item-height);
  color: var(--el-menu-text-color);
  padding: 0 var(--el-menu-base-level-padding);
  cursor: pointer;
  display: flex;
  align-items: center;
}

.overflow-menu .el-dropdown-link {
  display: flex;
  align-items: center;
  color: var(--el-menu-text-color);
  cursor: pointer;
}

.overflow-menu.is-active .el-dropdown-link {
  color: var(--el-menu-active-color);
}

/* 汉堡内分组标题（不可点击的 disabled 项） */
.overflow-menu-list .overflow-group-title {
  font-size: 0.8em;
  color: var(--break-text-muted);
  cursor: default;
  pointer-events: none;
  user-select: none;
}

:global(.overflow-menu-list .overflow-group-title.el-dropdown-menu__item) {
  color: var(--break-text-muted) !important;
  background: transparent !important;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  opacity: 0.72;
  cursor: default;
}

:global(.overflow-menu-list .overflow-group-title.el-dropdown-menu__item:hover),
:global(.overflow-menu-list .overflow-group-title.el-dropdown-menu__item:focus) {
  color: var(--break-text-muted) !important;
  background: transparent !important;
}

:global(.feedback-menu-item.el-dropdown-menu__item) {
  display: flex;
  align-items: center;
  gap: 6px;
}

.overflow-menu-list a {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  width: 100%;
  color: inherit;
  text-decoration: none;
}

.external-link-item {
  min-width: 0;
}

/* 移动端侧滑菜单样式 */
.drawer-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.drawer-logo {
  width: 32px;
  border-radius: 6px;
  background: var(--break-bg-secondary);
}

.drawer-title {
  font-weight: 600;
  font-size: 16px;
  color: var(--break-text-primary);
}

.mobile-nav-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mobile-nav-item {
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--break-text-secondary);
  transition: background-color 0.15s, color 0.15s;
}

.mobile-nav-item:hover,
.mobile-nav-item:active {
  background: var(--break-bg-secondary);
  color: var(--break-text-primary);
}

.mobile-nav-item.active {
  background: var(--break-highlight-bg);
  color: var(--break-link);
}

.mobile-nav-item--with-icon {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.mobile-nav-link {
  text-decoration: none;
  display: block;
}

.mobile-nav-group {
  margin-left: 12px;
}

.mobile-nav-group-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--break-text-muted);
  padding: 10px 16px 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.mobile-nav-divider {
  height: 1px;
  background: var(--break-border);
  margin: 8px 16px;
}

.mobile-nav-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 16px;
}

.mobile-locale-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  color: var(--break-text-secondary);
  font-size: 14px;
}

.mobile-nav-footer {
  padding: 8px 16px 4px 16px;
  margin-top: auto;
}

.mobile-github {
  display: inline-flex;
  color: var(--break-text-muted);
}

/* 下拉菜单所有项的悬停效果 */
:deep(.el-dropdown-menu__item:not(.is-active):hover) {
  background-color: var(--el-fill-color-light) !important;
}

/* 下拉菜单激活项样式 */
:deep(.el-dropdown-menu__item.is-active) {
  color: var(--el-color-primary) !important;
  background-color: var(--el-color-primary-light-9) !important;
}

:deep(.el-dropdown-menu__item.is-active:hover) {
  background-color: var(--el-color-primary-light-7) !important;
  color: var(--el-color-primary) !important;
}
</style>

<style>
.mobile-locale-dropdown-menu .el-dropdown-menu__item.is-active {
  color: var(--el-color-primary) !important;
  background-color: var(--el-color-primary-light-9) !important;
}

.mobile-locale-dropdown-menu .el-dropdown-menu__item.is-active:hover,
.mobile-locale-dropdown-menu .el-dropdown-menu__item.is-active:focus {
  color: var(--el-color-primary) !important;
  background-color: var(--el-color-primary-light-7) !important;
}

/* 非 scoped：Drawer 样式覆盖 */
.mobile-nav-drawer .el-drawer__header {
  margin-bottom: 0;
  padding: 12px 16px;
  border-bottom: 1px solid var(--break-border);
}

.mobile-nav-drawer .el-drawer__body {
  padding: 8px 0 0 0;
}
</style>
