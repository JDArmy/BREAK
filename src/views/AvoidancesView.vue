<script lang="ts" setup>
import BREAK from "@/i18n/zh-CN/BREAK.json";

import "element-plus/es/components/table/style/css";
import "element-plus/es/components/table-column/style/css";
import { ElTable, ElTableColumn } from "element-plus";

let avoidances = Array();
Object.keys(BREAK.avoidances).forEach((aKey) => {
    let avoidancesVal = BREAK.avoidances[aKey as keyof typeof BREAK.avoidances];
    let avoidance = {
        ...avoidancesVal,
        aKey: aKey,
    };
    avoidances.push(avoidance);
});

// console.log(avoidances);
</script>

<template lang="">
    <h3>{{ $t("menu.avoidances") }}</h3>
    <el-table :data="avoidances" stripe border>
        <el-table-column prop="aKey" width="80px" :label="$t('ID')" />
        <el-table-column width="100px" :label="$t('title')">
            <template #header>{{ $t("title") }}</template>
            <template #default="scope">
                {{
                    scope.row.aKey
                        ? $t(`BREAK.avoidances.${scope.row.aKey}.title`)
                        : ""
                }}
            </template>
        </el-table-column>
        <el-table-column :label="$t('summary')">
            <template #default="scope">
                {{
                    scope.row.aKey
                        ? $t(`BREAK.avoidances.${scope.row.aKey}.summary`)
                        : ""
                }}
            </template>
        </el-table-column>
        <el-table-column :label="$t('description')">
            <template #default="scope">
                {{
                    scope.row.aKey
                        ? $t(`BREAK.avoidances.${scope.row.aKey}.description`)
                        : ""
                }}
            </template>
        </el-table-column>
    </el-table>
</template>

<style lang=""></style>
