<script lang="ts" setup>
import "element-plus/es/components/menu/style/css";
import "element-plus/es/components/menu-item/style/css";
import "element-plus/es/components/dropdown/style/css";
import "element-plus/es/components/dropdown-menu/style/css";
import "element-plus/es/components/dropdown-item/style/css";
import "element-plus/es/components/drawer/style/css";
import "element-plus/theme-chalk/display.css";

import GithubPane from "@/components/GithubPane.vue";
import SearchDialog from "@/components/SearchDialog.vue";
import ThemeToggle from "@/components/ThemeToggle.vue";
import iconTranslate from "@/components/icons/iconTranslate.vue";
import { ArrowDown, Search, Menu as MenuIcon } from "@element-plus/icons-vue";
import { useI18n } from "vue-i18n";
import { languages, setLocale } from "@/i18n";
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";

const { locale } = useI18n();
const router = useRouter();
const route = useRoute();
const searchOpen = ref(false);
const mobileMenuOpen = ref(false);
const shortcutHint =
  typeof navigator !== "undefined" && navigator.platform?.includes("Mac")
    ? "⌘K"
    : "Ctrl+K";

const handleLocaleChange = (lang: string) => {
  setLocale(lang);
};

const knowledgeRoutes: Record<string, string> = {
  risks: "/risks",
  avoidances: "/avoidances",
  attackTools: "/attack-tools",
  threatActors: "/threat-actors",
};

const handleKnowledgeCommand = (command: string) => {
  const path = knowledgeRoutes[command];
  if (path) {
    router.push(path);
    mobileMenuOpen.value = false;
  }
};

const handleMobileNav = (path: string) => {
  router.push(path);
  mobileMenuOpen.value = false;
};

const isKnowledgeActive = (fullPath: string) =>
  ["/risks", "/avoidances", "/attack-tools", "/threat-actors"].includes(
    getActiveIndex(fullPath)
  );

const getActiveIndex = (fullPath: string) => {
  if (fullPath.match(/^\/business-scene\//)) return "/";
  if (fullPath.match(/^\/relation\//)) return "/relation/risk/R0001";

  return fullPath.split("#")[0];
};
</script>

<template>
  <!-- 移动端导航栏 -->
  <el-menu
    :default-active="getActiveIndex($route.fullPath)"
    mode="horizontal"
    :ellipsis="false"
    background-color="#0f172a"
    text-color="#cbd5e1"
    active-text-color="#60a5fa"
    :router="false"
    class="hidden-md-and-up"
    style="height: 100%"
  >
    <div style="position: absolute; left: 0; top: 0">
      <img src="/logo.png" class="logo" width="50" alt="" />
    </div>
    <h3 class="banner" style="text-align: center; width: 100%; height: 100%">
      {{ $t("BREAK.name") }}
    </h3>
    <div class="mobile-nav-right">
      <div class="mobile-search" @click="searchOpen = true">
        <el-icon><Search /></el-icon>
      </div>
      <div class="mobile-hamburger" @click="mobileMenuOpen = true">
        <el-icon :size="20"><MenuIcon /></el-icon>
      </div>
    </div>
  </el-menu>

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

      <div class="mobile-nav-item" :class="{ active: route.fullPath.match(/^\/relation\//) }" @click="handleMobileNav('/relation/risk/R0001')">
        <span>{{ $t("relationMap") }}</span>
      </div>

      <div class="mobile-nav-group">
        <div class="mobile-nav-group-title">{{ $t("menu.knowledge") }}</div>
        <div class="mobile-nav-item" :class="{ active: getActiveIndex(route.fullPath) === '/risks' }" @click="handleMobileNav('/risks')">
          <span>{{ $t("menu.risks") }}</span>
        </div>
        <div class="mobile-nav-item" :class="{ active: getActiveIndex(route.fullPath) === '/avoidances' }" @click="handleMobileNav('/avoidances')">
          <span>{{ $t("menu.avoidances") }}</span>
        </div>
        <div class="mobile-nav-item" :class="{ active: getActiveIndex(route.fullPath) === '/attack-tools' }" @click="handleMobileNav('/attack-tools')">
          <span>{{ $t("attackTools") }}</span>
        </div>
        <div class="mobile-nav-item" :class="{ active: getActiveIndex(route.fullPath) === '/threat-actors' }" @click="handleMobileNav('/threat-actors')">
          <span>{{ $t("threatActors") }}</span>
        </div>
      </div>

      <div class="mobile-nav-item" :class="{ active: getActiveIndex(route.fullPath) === '/dashboard' }" @click="handleMobileNav('/dashboard')">
        <span>{{ $t("menu.dashboard") }}</span>
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
        <el-dropdown trigger="click" @command="handleLocaleChange">
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
  <el-menu
    :default-active="getActiveIndex($route.fullPath)"
    mode="horizontal"
    background-color="#0f172a"
    text-color="#cbd5e1"
    active-text-color="#60a5fa"
    :ellipsis="false"
    :router="true"
    class="hidden-sm-and-down"
  >
    <div style="display: flex; align-items: center;">
      <img src="/logo.png" class="logo" alt="JDArmy BREAK" />
    </div>

    <div style="display: flex; align-items: center;">
      <h3 class="banner">
        {{ $t("BREAK.name") }}
      </h3>
    </div>

    <div class="flex-grow">
      <div class="search-trigger" @click="searchOpen = true">
        <el-icon><Search /></el-icon>
        <span class="search-placeholder">{{ $t("search.placeholder") }}</span>
        <span class="search-shortcut">{{ shortcutHint }}</span>
      </div>
    </div>
    <el-menu-item class="" index="/">{{ $t("menu.home") }}</el-menu-item>
    <el-menu-item index="/relation/risk/R0001">{{
      $t("relationMap")
    }}</el-menu-item>
    <el-dropdown
      class="knowledge-menu"
      :class="{ 'is-active': isKnowledgeActive($route.fullPath) }"
      @command="handleKnowledgeCommand"
    >
      <span class="el-dropdown-link">
        {{ $t("menu.knowledge") }}<el-icon><arrow-down /></el-icon>
      </span>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="risks">{{ $t("menu.risks") }}</el-dropdown-item>
          <el-dropdown-item command="avoidances">{{ $t("menu.avoidances") }}</el-dropdown-item>
          <el-dropdown-item command="attackTools">{{ $t("attackTools") }}</el-dropdown-item>
          <el-dropdown-item command="threatActors">{{ $t("threatActors") }}</el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
    <el-menu-item index="/dashboard">{{ $t("menu.dashboard") }}</el-menu-item>

    <el-dropdown class="outside-link">
      <span class="el-dropdown-link"
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

    <el-dropdown class="translate" trigger="click" @command="handleLocaleChange">
      <span class="el-dropdown-link">
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

    <div class="github">
      <github-pane />
    </div>

  </el-menu>

  <SearchDialog v-model="searchOpen" />
</template>

<style scoped>
.logo {
  background: rgba(255,255,255,0.08);
  border-radius: 10px;
  margin: 5px;
  width: 40px;
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
  padding: 4px 12px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  cursor: pointer;
  transition: background-color 0.2s;
  max-width: 260px;
  width: 100%;
}

.search-trigger:hover,
.search-trigger:active {
  background: rgba(255, 255, 255, 0.15);
}

.search-trigger .el-icon {
  color: #94a3b8;
  font-size: 14px;
}

.search-placeholder {
  flex: 1;
  font-size: 13px;
  color: #64748b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-shortcut {
  font-size: 11px;
  color: #64748b;
  padding: 2px 5px;
  border: 1px solid rgba(255, 255, 255, 0.15);
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
  cursor: pointer;
  color: #cbd5e1;
  font-size: 18px;
}

.mobile-hamburger {
  cursor: pointer;
  color: #cbd5e1;
  display: flex;
  align-items: center;
  padding: 4px;
}

.banner {
  color: #f1f5f9;
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
  color: #fff;
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

.translate {
  padding: 0 10px;
}

.outside-link-menu a {
  display: inline-block;
  width: 100%;
  height: 100%;
  text-align: center;
  color: #000;
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
  background: rgba(255, 255, 255, 0.08);
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
  padding: 8px 16px;
  margin-top: auto;
}

.mobile-github {
  display: inline-flex;
  color: var(--break-text-muted);
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
  padding: 8px 0;
}
</style>
