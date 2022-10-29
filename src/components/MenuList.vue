<script lang="ts" setup>
import "element-plus/es/components/menu/style/css";
import "element-plus/es/components/menu-item/style/css";
import "element-plus/es/components/dropdown/style/css";
import "element-plus/es/components/dropdown-menu/style/css";
import "element-plus/es/components/dropdown-item/style/css";

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
        <div>
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
        <el-dropdown @command="handleCommand">
            <span class="el-dropdown-link">
                <svg
                    preserveAspectRatio="xMidYMid meet"
                    viewBox="0 0 24 24"
                    width="1.2em"
                    height="1.2em"
                    data-v-7b5f8a18=""
                >
                    <path
                        fill="currentColor"
                        d="m18.5 10l4.4 11h-2.155l-1.201-3h-4.09l-1.199 3h-2.154L16.5 10h2zM10 2v2h6v2h-1.968a18.222 18.222 0 0 1-3.62 6.301a14.864 14.864 0 0 0 2.336 1.707l-.751 1.878A17.015 17.015 0 0 1 9 13.725a16.676 16.676 0 0 1-6.201 3.548l-.536-1.929a14.7 14.7 0 0 0 5.327-3.042A18.078 18.078 0 0 1 4.767 8h2.24A16.032 16.032 0 0 0 9 10.877a16.165 16.165 0 0 0 2.91-4.876L2 6V4h6V2h2zm7.5 10.885L16.253 16h2.492L17.5 12.885z"
                    ></path>
                </svg>
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
.el-dropdown-link {
    color: rgb(218, 216, 216);
    margin: auto 15px;
    cursor: pointer;
}
</style>
