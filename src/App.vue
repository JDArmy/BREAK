<script setup lang="ts">
import { RouterView } from "vue-router";
import MenuList from "./components/MenuList.vue";
import { createRecoverableAsyncComponent } from "@/utils/chunkLoadRecovery";

// 异步加载：避免 useEntityResolver → useCases 等依赖拉入入口 chunk
const EntityAutoLinker = createRecoverableAsyncComponent(
  () => import("./components/entity/EntityAutoLinker.vue"),
  undefined,
  "EntityAutoLinker",
  { showLoading: false },
);

import iconGithub from "@/components/icons/iconGithub.vue";
</script>

<template>
  <div class="common-layout">
    <EntityAutoLinker />
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
            <a
              href="https://github.com/JDArmy/BREAK"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="JDArmy BREAK GitHub"
            >
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
.common-layout {
  height: 100%;
}
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
  flex: 1;
  min-height: 0;
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
  color: var(--break-text-muted);
  font-size: 12px;
  line-height: 1.4;
}

@media (max-width: 767px) {
  .el-main {
    --el-main-padding: 10px;
  }

  .mobile-desktop-hint {
    display: block;
  }

  /* 移动端 footer 收敛为一行，节约空间 */
  .footer {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 6px;
  }
}
</style>
