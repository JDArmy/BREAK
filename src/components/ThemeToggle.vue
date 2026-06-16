<script lang="ts" setup>
import "element-plus/es/components/dropdown/style/css";
import "element-plus/es/components/dropdown-menu/style/css";
import "element-plus/es/components/dropdown-item/style/css";

import { useTheme, type ThemeMode } from "@/composables/useTheme";
import { useI18n } from "vue-i18n";
import { ArrowDown } from "@element-plus/icons-vue";

const { theme, isDark, setTheme } = useTheme();
const { t } = useI18n();

/** 图标根据当前实际显示模式：暗色显示太阳（可切亮），亮色显示月亮（可切暗） */
const themeOptions: { mode: ThemeMode; labelKey: string; icon: "sun" | "moon" | "monitor" }[] = [
  { mode: "light", labelKey: "theme.light", icon: "sun" },
  { mode: "dark", labelKey: "theme.dark", icon: "moon" },
  { mode: "system", labelKey: "theme.system", icon: "monitor" },
];
</script>

<template>
  <el-dropdown
    class="theme-toggle"
    trigger="click"
    placement="bottom"
    @command="(m: ThemeMode) => setTheme(m)"
  >
    <span class="el-dropdown-link">
      <!-- 月亮图标：当前暗色时显示 -->
      <svg v-if="isDark" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
      <!-- 太阳图标：当前亮色时显示 -->
      <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      </svg>
      <el-icon><arrow-down /></el-icon>
    </span>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item
          v-for="opt in themeOptions"
          :key="opt.mode"
          :command="opt.mode"
          :class="{ 'is-active': theme === opt.mode }"
        >
          <!-- 太阳 -->
          <svg v-if="opt.icon === 'sun'" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 4px;">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
          <!-- 月亮 -->
          <svg v-else-if="opt.icon === 'moon'" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 4px;">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
          <!-- 显示器（跟随系统） -->
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 4px;">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
          </svg>
          {{ t(opt.labelKey) }}
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<style scoped>
.theme-toggle {
  color: var(--el-menu-text-color);
  height: var(--el-menu-item-height);
  line-height: var(--el-menu-item-height);
  padding: 0 10px;
  margin: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.theme-toggle .el-dropdown-link {
  display: flex;
  align-items: center;
  gap: 4px;
  height: var(--el-menu-item-height);
  line-height: var(--el-menu-item-height);
  color: var(--el-menu-text-color);
  cursor: pointer;
}
</style>
