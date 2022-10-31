<script lang="ts" setup>
import "element-plus/es/components/menu/style/css";
import "element-plus/es/components/menu-item/style/css";
import "element-plus/es/components/dropdown/style/css";
import "element-plus/es/components/dropdown-menu/style/css";
import "element-plus/es/components/dropdown-item/style/css";
import "element-plus/theme-chalk/display.css";

import iconTranslate from "@/components/icons/iconTranslate.vue";
import iconGithub from "@/components/icons/iconGithub.vue";

import {
    ElMenu,
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
        background-color="#545c64"
        text-color="#fff"
        active-text-color="#ffd04b"
        :ellipsis="false"
        :router="true"
    >
        <div class="hidden-md-and-up">
            <h3 class="banner">BREAK</h3>
        </div>
        <div class="hidden-sm-and-down">
            <h3 class="banner">
                {{ $t("BREAK.title") }}
                <span class="version">v{{ $t("BREAK.version") }}</span>
            </h3>
            <h6 class="description">{{ $t("BREAK.description") }}</h6>
        </div>
        <div class="flex-grow" />
        <el-menu-item index="/">{{ $t("menu.home") }}</el-menu-item>
        <el-menu-item index="/risks">{{ $t("menu.risks") }}</el-menu-item>
        <el-menu-item index="/avoidances">{{
            $t("menu.avoidances")
        }}</el-menu-item>
        <span class="github hidden-sm-and-down">
            <a href="https://github.com/JDArmy/BREAK" target="_blank">
                <icon-github />
            </a>
        </span>
        <el-dropdown class="hidden-sm-and-down" @command="handleCommand">
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
        </el-dropdown>
    </el-menu>
</template>

<style>
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
}

.description {
    color: #fff;
    margin: 0 0 5px 0;
    padding: 0 0 0 10px;
}

.el-dropdown-link,
.github {
    color: rgb(218, 216, 216);
    margin: auto 10px;
    cursor: pointer;
}
</style>
