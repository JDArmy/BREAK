<script setup lang="ts">
import BREAK from "@/i18n/zh-CN/BREAK.json";
import RiskDetail from "@/components/RiskDetail.vue";
import { ref, watch } from "vue";
import { useRouter, useRoute } from "vue-router";

import "element-plus/es/components/row/style/css";
import "element-plus/es/components/col/style/css";
import { ElRow, ElCol } from "element-plus";

const router = useRouter();
const route = useRoute();

let getRisks = (rsKey: String) =>
    BREAK.riskScenes[rsKey as keyof typeof BREAK.riskScenes].risks;

let drawer = ref(false);
let riskKey = ref("");
let showRiskDetail = (riskKey1: string, drawer1: boolean) => {
    drawer.value = drawer1;
    riskKey.value = riskKey1;
};

if (route.name == "riskDetail") {
    showRiskDetail(route.params.rKey as string, true);
}
watch(
    () => route.params.rKey,
    async () => {
        if (route.name == "riskDetail") {
            showRiskDetail(route.params.rKey as string, true);
        }
    }
);

let riskDetailClose = () => {
    drawer.value = false;
    router.push({
        name: "home",
    });
};
</script>

<template>
    <el-row>
        <!-- 风险场景 -->
        <div
            class="risk-dimension"
            v-for="(rdVal, rdKey) in BREAK.riskDimensions"
            :key="rdKey"
            :style="
                'width:' +
                parseInt(
                    (
                        (rdVal.riskScenes.length /
                            Object.keys(BREAK.riskScenes).length) *
                        100
                    ).toString()
                ) +
                '%'
            "
        >
            <h3 class="risk-dimension-title" :title="rdKey">
                {{ $t(`BREAK.riskDimensions.${rdKey}.title`) }}
            </h3>

            <el-row>
                <!-- 风险维度 -->
                <el-col
                    class="risk-scene"
                    v-for="rsKey in rdVal.riskScenes"
                    :key="rsKey"
                    :title="rsKey"
                    :span="24 / rdVal.riskScenes.length"
                >
                    <h4 class="risk-scene-title">
                        <!-- <a :href="'/risk-demensions/' + rdKey"> -->
                        {{ $t(`BREAK.riskScenes.${rsKey}.title`) }}
                        <!-- </a> -->
                    </h4>
                    <ul>
                        <!-- 风险列表 -->
                        <li
                            class="risk"
                            v-for="rKey in getRisks(rsKey)"
                            :key="rKey"
                            :title="rKey"
                        >
                            <router-link :to="'/risk/' + rKey">{{
                                $t(`BREAK.risks.${rKey}.title`)
                            }}</router-link>
                        </li>
                    </ul>
                </el-col>
            </el-row>
        </div>
        <RiskDetail
            v-on:drawer-close="riskDetailClose"
            :drawer="drawer"
            :rKey="riskKey"
        />
    </el-row>
</template>

<style scoped>
.risk-dimension {
    border: 1px solid rgb(246, 245, 245);
    box-sizing: border-box;
    padding-bottom: 10px;
}

.risk-scene {
    padding: 3px;
}

.risk-scene-title,
.risk-dimension-title {
    margin-bottom: 5px;
    color: var(--el-text-color-primary);
    text-align: center;
}

.risk {
    font-size: 1em;
    padding: 3px 0;
    text-align: center;
}
.risk:hover {
    background-color: rgb(210, 212, 253);
}

a {
    color: #4f7cac;
    text-decoration: none;
    display: block;
}

a:hover {
    color: #002b58;
}

ul {
    list-style: none;
    margin: 0;
    padding: 0;
}

li {
    border: 1px solid lightgray;
}
</style>
