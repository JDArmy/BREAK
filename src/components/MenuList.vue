<script lang="ts" setup>
import "element-plus/theme-chalk/display.css";

import GithubPane from "@/components/GithubPane.vue";
import ThemeToggle from "@/components/ThemeToggle.vue";
import iconTranslate from "@/components/icons/iconTranslate.vue";
import { ArrowDown, Search, Menu as MenuIcon } from "@element-plus/icons-vue";
import { useI18n } from "vue-i18n";
import { languages, setLocale } from "@/i18n";
import { defineAsyncComponent, onMounted, onUnmounted, ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { preloadRelationView } from "@/router";
import { prefetchAllKnowledgeViews } from "@/composables/useRoutePrefetch";
import AsyncComponentError from "@/components/AsyncComponentError.vue";

const loadSearchDialog = () => import("@/components/SearchDialog.vue");
const SearchDialog = defineAsyncComponent({ loader: loadSearchDialog, errorComponent: AsyncComponentError });

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

const preloadSearchDialog = () => {
  searchDialogEnabled.value = true;
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
  changelog: "/changelog",
};

const handleKnowledgeCommand = (command: string) => {
  prefetchAllKnowledgeViews();
  const path = knowledgeRoutes[command];
  if (path) {
    router.push(path);
    mobileMenuOpen.value = false;
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
  if (window.innerWidth >= 768) {
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
  while (pendingCleanups.length > 0) {
    const cleanup = pendingCleanups.pop();
    cleanup?.();
  }
});

const isKnowledgeActive = (fullPath: string) => {
  const active = getActiveIndex(fullPath);
  return [
    "/knowledges/risk/list",
    "/knowledges/avoidance/list",
    "/knowledges/attack-tool/list",
    "/knowledges/threat-actor/list",
    "/knowledges/term/list",
    "/knowledges/case/list",
    "/changelog",
  ].includes(active);
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
  if (fullPath.match(/^\/business-scene\//)) return "/";
  if (fullPath.match(/^\/home\//)) return "/";
  if (fullPath.match(/^\/relations\//)) return "/relations/risk-relation/risk/R0001";

  return fullPath.split("#")[0];
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
    <h3 class="banner" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%">
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
        <div class="mobile-nav-item" :class="{ active: route.fullPath.startsWith('/changelog') }" @click="handleMobileNav('/changelog')">
          <span>{{ $t("menu.changelog") }}</span>
        </div>
      </div>

      <div class="mobile-nav-divider"></div>

      <div class="mobile-nav-group">
        <div class="mobile-nav-group-title">JDArmy</div>
        <a class="mobile-nav-item mobile-nav-link" href="https://jd.army" target="_blank" rel="noopener noreferrer">
          <span>Webpage</span>
        </a>
        <a class="mobile-nav-item mobile-nav-link" href="https://blog.jd.army" target="_blank" rel="noopener noreferrer">
          <span>Blog</span>
        </a>
        <a class="mobile-nav-item mobile-nav-link" href="https://rtass.jd.army" target="_blank" rel="noopener noreferrer">
          <span>RTASS</span>
        </a>
        <a class="mobile-nav-item mobile-nav-link" href="https://break.jd.army" target="_blank" rel="noopener noreferrer">
          <span>BREAK</span>
        </a>
        <a class="mobile-nav-item mobile-nav-link" href="https://dsre.jd.army" target="_blank" rel="noopener noreferrer">
          <span>DSRE</span>
        </a>
        <a class="mobile-nav-item mobile-nav-link" href="https://textwatermark.jd.army" target="_blank" rel="noopener noreferrer">
          <span>Text Watermark</span>
        </a>
      </div>

      <div class="mobile-nav-divider"></div>

      <div class="mobile-nav-actions">
        <ThemeToggle />
        <el-dropdown trigger="click" :disabled="localeChanging" @command="handleLocaleChange">
          <span class="mobile-locale-toggle">
            <icon-translate />
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
  <nav class="hidden-sm-and-down desktop-nav" aria-label="Main navigation">
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
    <el-menu-item class="" index="/">{{ $t("menu.home") }}</el-menu-item>
    <el-menu-item index="/relations/risk-relation/risk/R0001">{{
      $t("relationMap")
    }}</el-menu-item>
    <el-dropdown
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
          <el-dropdown-item divided command="changelog" :class="{ 'is-active': getActiveKnowledge($route.fullPath) === 'changelog' }">{{ $t("menu.changelog") }}</el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>

    <el-dropdown class="outside-link">
      <span class="el-dropdown-link" aria-label="JDArmy" role="button" tabindex="0"
        >JDArmy<el-icon>
          <arrow-down />
        </el-icon>
      </span>
      <template #dropdown>
        <el-dropdown-menu class="outside-link-menu">
          <el-dropdown-item
            ><a target="_blank" rel="noopener noreferrer" href="https://jd.army"
              >Webpage</a
            ></el-dropdown-item
          >
          <el-dropdown-item
            ><a target="_blank" rel="noopener noreferrer" href="https://blog.jd.army"
              >Blog</a
            ></el-dropdown-item
          >
          <el-dropdown-item divided
            ><a
              target="_blank" rel="noopener noreferrer"
              href="https://rtass.jd.army"
              title="Red Team Assessment Scoring System Open Source Framework"
              >RTASS</a
            ></el-dropdown-item
          >
          <el-dropdown-item
            ><a
              target="_blank" rel="noopener noreferrer"
              href="https://break.jd.army"
              title="Business Risk Enumeration & Avoidance Kownledge Open Source Framework"
              >BREAK</a
            ></el-dropdown-item
          >
          <el-dropdown-item
            ><a
              target="_blank" rel="noopener noreferrer"
              href="https://dsre.jd.army"
              title="Data Security Risk Enumeration Open Source Framkework"
              >DSRE</a
            ></el-dropdown-item
          >
          <el-dropdown-item divided
            ><a
              target="_blank" rel="noopener noreferrer"
              href="https://textwatermark.jd.army"
              title="A Open Source Library for Text Watermarking in python"
              >Text Watermark</a
            ></el-dropdown-item
          >
        </el-dropdown-menu>
      </template>
    </el-dropdown>

    <ThemeToggle />

    <el-dropdown class="translate" trigger="click" :disabled="localeChanging" @command="handleLocaleChange">
      <span class="el-dropdown-link" :aria-label="languages[locale as keyof typeof languages]" role="button" tabindex="0">
        <icon-translate />
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

    <div class="github" role="none">
      <github-pane />
    </div>

    </el-menu>
  </nav>

  <SearchDialog v-if="searchDialogEnabled" v-model="searchOpen" />
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
.knowledge-menu .el-dropdown-link {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--el-menu-text-color);
  cursor: pointer;
}

.locale-label {
  user-select: none;
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
}

.knowledge-menu.is-active .el-dropdown-link {
  color: var(--el-menu-active-color);
}

.knowledge-menu.is-active::after {
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
  display: inline-block;
  width: 100%;
  height: 100%;
  text-align: center;
  color: var(--break-text-primary);
  text-decoration: none;
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
