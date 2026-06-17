<script setup lang="ts">
import { RouterView } from "vue-router";
import MenuList from "./components/MenuList.vue";

import "element-plus/es/components/container/style/css";
import "element-plus/es/components/header/style/css";
import "element-plus/es/components/main/style/css";
import "element-plus/es/components/footer/style/css";
import "element-plus/es/components/backtop/style/css";
import { ElContainer, ElHeader, ElMain, ElFooter, ElBacktop } from "element-plus";
import iconGithub from "@/components/icons/iconGithub.vue";
</script>

<template>
  <div class="common-layout">
    <el-container>
      <el-header>
        <MenuList />
      </el-header>

      <el-main>
        <RouterView />
      </el-main>

      <el-footer>
        <div class="footer">
          <div class="mobile-desktop-hint">{{ $t("mobileDesktopHint") }}</div>
          ©2024-2026 JD.Army
          <span class="github">
            <a href="https://github.com/JDArmy/BREAK" target="_blank" rel="noopener noreferrer">
              <icon-github />
            </a>
          </span>
        </div>
      </el-footer>
      <el-backtop />
    </el-container>
  </div>
</template>

<style scoped>
.el-container {
  height: 100%;
  padding: 0;
  margin: 0;
  width: 100%;
}
.el-header {
  padding: 0;
  margin: 0;
  width: 100%;
}
.el-main {
  margin-bottom: 0;
}
.el-footer {
  position: sticky;
  z-index: 100;
  text-align: center;
  width: 100%;
  height: auto;
  bottom: 0px;
  background-color: var(--break-footer-bg);
  color: var(--break-footer-text);
  font-size: 50%;
  padding: 5px 0 5px 0;
  border-top: 1px solid var(--break-footer-border);
}

.github {
  font-size: 150%;
}

.mobile-desktop-hint {
  display: none;
  margin-bottom: 4px;
  color: var(--break-text-muted);
  font-size: 12px;
  line-height: 1.4;
}

@media (max-width: 767px) {
  .mobile-desktop-hint {
    display: block;
  }
}
</style>
