<script setup lang="ts">
import { RouterView } from "vue-router";
import MenuList from "./components/MenuList.vue";

import "element-plus/es/components/container/style/css";
import "element-plus/es/components/header/style/css";
import "element-plus/es/components/main/style/css";
import "element-plus/es/components/footer/style/css";
import { ElContainer, ElHeader, ElMain, ElFooter } from "element-plus";
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
                <div class="footer">©2022 JD.Army</div>
            </el-footer>
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
    margin-bottom: 50px;
}
.el-footer {
    position: fixed;
    z-index: 100;
    text-align: center;
    width: 100%;
    height: auto;
    left: 0px;
    bottom: 0px;
    background-color: white;
    color: gray;
    font-size: 50%;
    padding: 5px 0 10px 0;
    border-top: 1px solid rgb(213, 213, 213);
}
</style>
