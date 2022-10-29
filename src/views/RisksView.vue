<script lang="ts" setup>
import { ref } from "vue";
import BREAK from "@/i18n/zh-CN/BREAK.json";

import "element-plus/es/components/table/style/css";
import "element-plus/es/components/table-column/style/css";
import { ElTable, ElTableColumn } from "element-plus";

let risks = Array();
Object.keys(BREAK.risks).forEach((rKey) => {
    let riskVal = BREAK.risks[rKey as keyof typeof BREAK.risks];
    let risk = {
        ...riskVal,
        rKey: rKey,
    };
    risks.push(risk);
});

let drawer = ref(false);
let riskKey = ref("");
let showRiskDetail = (riskKey1: string, drawer1: boolean) => {
    drawer.value = drawer1;
    riskKey.value = riskKey1;
    // console.log(riskKey.value, drawer.value);
};

let riskDetailClose = () => {
    drawer.value = false;
    // console.log("close");
};

// interface Risks {
//   rKey: string;
// }

// const rKeyFormatter = (row: Risks) => {
//   return "<a href='/risk/" + row.rKey + "'>" + row.rKey + "</a>";
// };
</script>

<template lang="">
    <h3>{{ $t("menu.risks") }}</h3>
    <el-table :data="risks" stripe border>
        <el-table-column prop="rKey" width="100" :label="$t('riskKey')">
            <template v-slot="scope">
                <a @click="showRiskDetail(scope.row.rKey, true)" href="#">{{
                    scope.row.rKey
                }}</a>
            </template>
        </el-table-column>
        <el-table-column prop="title" width="200" :label="$t('riskTitle')">
            <template #default="scope">
                {{
                    scope.row.rKey
                        ? $t(`BREAK.risks.${scope.row.rKey}.title`)
                        : ""
                }}
            </template>
        </el-table-column>
        <el-table-column prop="description" :label="$t('riskDescription')"
            ><template #default="scope">
                {{
                    scope.row.rKey
                        ? $t(`BREAK.risks.${scope.row.rKey}.description`)
                        : ""
                }}
            </template></el-table-column
        >
        <el-table-column prop="influence" :label="$t('riskInfluence')"
            ><template #default="scope">
                {{
                    scope.row.rKey
                        ? $t(`BREAK.risks.${scope.row.rKey}.influence`)
                        : ""
                }}
            </template></el-table-column
        >
    </el-table>
    <RiskDetail
        v-on:drawer-close="riskDetailClose"
        :drawer="drawer"
        :rKey="riskKey"
    />
</template>

<style lang=""></style>
