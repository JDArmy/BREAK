<script lang="ts" setup>
import "element-plus/es/components/menu/style/css";
import "element-plus/es/components/menu-item/style/css";
import "element-plus/es/components/dropdown/style/css";
import "element-plus/es/components/dropdown-menu/style/css";
import "element-plus/es/components/dropdown-item/style/css";
import "element-plus/theme-chalk/display.css";

import iconTranslate from "@/components/icons/iconTranslate.vue";
import iconGithub from "@/components/icons/iconGithub.vue";
import { ArrowDown } from "@element-plus/icons-vue";

import {
  ElMenu,
  ElIcon,
  ElMenuItem,
  ElDropdown,
  ElDropdownMenu,
  ElDropdownItem,
} from "element-plus";

import { i18n, languages } from "@/i18n";

const lang = localStorage.getItem("locale");
if (
  lang &&
  lang !== i18n.global.locale &&
  Object.keys(languages).includes(lang)
) {
  i18n.global.locale = lang as keyof typeof languages;
}

const handleCommand = (command: keyof typeof languages) => {
  i18n.global.locale = command;
  localStorage.setItem("locale", command);
};
</script>

<template>
  <el-menu
    :default-active="$route.fullPath"
    mode="horizontal"
    :ellipsis="false"
    background-color="#545c64"
    text-color="#fff"
    active-text-color="#ffd04b"
    :router="true"
    class="hidden-md-and-up"
    style="height: 100%"
  >
    <div style="position: absolute; left: 0; top: 0">
      <img src="/logo.png" class="logo" width="50" alt="" />
    </div>
    <h3 class="banner" style="text-align: center; width: 100%; height: 100%">
      {{ $t("BREAK.name") }}
    </h3>
  </el-menu>

  <el-menu
    :default-active="$route.fullPath"
    mode="horizontal"
    background-color="#545c64"
    text-color="#fff"
    active-text-color="#ffd04b"
    :ellipsis="false"
    :router="true"
    class="hidden-sm-and-down"
  >
    <div>
      <img src="/logo.png" class="logo" alt="JDArmy BREAK" />
    </div>

    <div>
      <h3 class="banner">
        {{ $t("BREAK.name") }}
      </h3>
    </div>

    <div class="flex-grow" />
    <el-menu-item class="" index="/">{{ $t("menu.home") }}</el-menu-item>
    <el-menu-item class="" index="/risks">{{ $t("menu.risks") }}</el-menu-item>
    <el-menu-item class="" index="/avoidances">{{
      $t("menu.avoidances")
    }}</el-menu-item>
    <el-menu-item index="/attack-tools">{{
      $t("menu.attackTools")
    }}</el-menu-item>

    <el-menu-item class="" index="/ability-providers" key="">{{
      $t("abilityProviders")
    }}</el-menu-item>

    <el-dropdown class="outside-link">
      <span class="el-dropdown-link"
        >JDArmy<el-icon>
          <arrow-down />
        </el-icon>
      </span>
      <template #dropdown>
        <el-dropdown-menu class="outside-link-menu">
          <el-dropdown-item
            ><a target="_blank" href="https://jd.army"
              >Webpage</a
            ></el-dropdown-item
          >
          <el-dropdown-item
            ><a target="_blank" href="https://blog.jd.army"
              >Blog</a
            ></el-dropdown-item
          >
          <el-dropdown-item divided
            ><a target="_blank" href="https://rtass.jd.army"
              >RTASS</a
            ></el-dropdown-item
          >
          <el-dropdown-item
            ><a target="_blank" href="https://break.jd.army"
              >BREAK</a
            ></el-dropdown-item
          >
          <el-dropdown-item
            ><a target="_blank" href="https://dsre.jd.army"
              >DSRE</a
            ></el-dropdown-item
          >
        </el-dropdown-menu>
      </template>
    </el-dropdown>

    <div class="github">
      <a href="https://github.com/JDArmy/BREAK" target="_blank">
        <icon-github />
      </a>
    </div>

    <!-- <el-dropdown class="translate" @command="handleCommand">
      <span class="el-dropdown-link">
        <icon-translate />
      </span>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item
            v-for="(langName, langKey) in languages"
            :key="langKey"
            :command="langKey"
            :disabled="i18n.global.locale == langKey"
          >
            {{ langName }}
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown> -->
  </el-menu>
</template>

<style scoped>
.logo {
  background: #b0afaf;
  border-radius: 20px;
  margin: 5px;
  width: 40px;
}
.version {
  color: var(--el-color-info);
  font-size: 50%;
}

.flex-grow {
  flex-grow: 1;
}

.banner {
  color: #fff;
  padding-left: 10px;
  padding-bottom: 0px;
  margin-bottom: 0px;
  text-align: center;
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
.github {
  color: var(--el-menu-text-color);
  margin: auto 10px;
  cursor: pointer;
}

.outside-link {
  line-height: var(--el-menu-item-height);
  color: var(--el-menu-text-color);
  padding: 0 var(--el-menu-base-level-padding);
  cursor: pointer;
}

.outside-link-menu a {
  display: inline-block;
  width: 100%;
  height: 100%;
  text-align: center;
  color: #000;
  text-decoration: none;
}
</style>
