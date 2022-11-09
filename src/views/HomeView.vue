<script setup lang="ts">
import BREAK from "@/BREAK";

import RiskDetail from "@/components/RiskDetail.vue";
import { ref, watch } from "vue";
import { useRouter, useRoute } from "vue-router";

import "element-plus/es/components/row/style/css";
import "element-plus/es/components/col/style/css";
import { ElRow, ElCol } from "element-plus";

const router = useRouter();
const route = useRoute();

//分场景查看风险
let sceneBREAK = ref(BREAK);
const bsKeySelected = ref("");
watch(bsKeySelected, async () => {
  if (!bsKeySelected.value.match(/BS[0-9]{2}/)) {
    bsKeySelected.value = "";
    sceneBREAK.value = BREAK;
  } else {
    const exJson =
      BREAK.businessScenes[
        bsKeySelected.value as keyof typeof BREAK.businessScenes
      ].exJson;
    sceneBREAK.value = await import(`@/scenes/${exJson}.json`);
    // sceneBREAK.value = await import(`@/scenes/${bsKeySelected.value}.json`);
  }
});

let getRisks = (
  riskScenes: typeof sceneBREAK.value.riskScenes,
  rsKey: string
) => {
  return riskScenes[rsKey as keyof typeof sceneBREAK.value.riskScenes].risks;
};

//子风险筛选
const getSubRisks = (prKey: string) => {
  return Object.keys(BREAK.risks).filter(
    (rKey) => rKey.includes("-") && rKey.split("-")[0] == prKey
  );
};

let subRisks = ref(Object());
Object.keys(BREAK.risks).forEach((prKey) => {
  if (prKey.includes("-")) return;
  let srKeys = getSubRisks(prKey);
  if (srKeys.length > 0) {
    subRisks.value[prKey] = srKeys;
  }
});
// console.log(subRisks.value);

/////////////////////////////////////////////////////////////////////
//start: 查看风险细节
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
//end.
</script>

<template>
  <el-row class="header">
    <el-col :span="24" :offset="0" style="text-align: center">
      <h3 style="margin-bottom: 0">
        {{ $t("BREAK.title") }} v{{ BREAK.version }}
      </h3>
      <h6 style="color: gray">{{ $t("BREAK.description") }}</h6>
    </el-col>

    <el-col>
      <el-select v-model="bsKeySelected" :placeholder="$t('allScenes')">
        <el-option key="" :label="$t('allScenes')" value=""></el-option>
        <el-option
          v-for="(bsVal, bsKey) in BREAK.businessScenes"
          :key="bsKey"
          :label="bsVal.title"
          :value="bsKey"
        />
      </el-select>
    </el-col>
  </el-row>

  <el-row>
    <!-- 风险场景 -->
    <el-col
      class="risk-dimension"
      v-for="(rdVal, rdKey) in sceneBREAK.riskDimensions"
      :key="rdKey"
      :md="
        Math.round(
          (rdVal.riskScenes.length /
            Object.keys(sceneBREAK.riskScenes).length) *
            24
        )
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
          :md="24 / rdVal.riskScenes.length"
        >
          <h4 :title="rsKey" class="risk-scene-title">
            <!-- <a :href="'/risk-demensions/' + rdKey"> -->
            {{ $t(`BREAK.riskScenes.${rsKey}.title`) }}
            <!-- </a> -->
          </h4>
          <ul class="risk-list">
            <!-- 风险列表 -->
            <li
              :class="subRisks[rKey] ? 's-risk' : 'risk'"
              v-for="rKey in getRisks(sceneBREAK.riskScenes, rsKey)"
              :key="rKey"
              :title="rKey"
            >
              <!-- 子风险列表 -->
              <table
                class="risk-with-sub"
                style="width: 100%; border-spacing: 0px"
                v-if="subRisks[rKey]"
              >
                <tr>
                  <td
                    class="sidebar"
                    style="
                      color: #fff;
                      background-color: lightgray;
                      border-radius: 0 0 0 20px;
                    "
                  >
                    ⩦
                  </td>
                  <td class="parent-risk-link">
                    <router-link class="link" :to="'/risk/' + rKey">{{
                      $t(`BREAK.risks.${rKey}.title`)
                    }}</router-link>
                  </td>
                  <td style="width: 1px"></td>
                </tr>
                <tr
                  class="sub-risk"
                  :key="srKey"
                  :title="srKey"
                  v-for="srKey in subRisks[rKey]"
                >
                  <td
                    class="sidebar"
                    style="border-right: 1px solid lightgray"
                  ></td>
                  <td class="sub-risk-link">
                    <router-link class="link" :to="'/risk/' + srKey">{{
                      $t(`BREAK.risks.${srKey}.title`)
                    }}</router-link>
                  </td>
                  <td style="width: 1px"></td>
                </tr>
              </table>
              <!-- 无子风险时 -->
              <router-link class="link" v-else :to="'/risk/' + rKey">{{
                $t(`BREAK.risks.${rKey}.title`)
              }}</router-link>
            </li>
          </ul>
        </el-col>
      </el-row>
    </el-col>
    <RiskDetail
      v-on:drawer-close="riskDetailClose"
      :drawer="drawer"
      :rKey="riskKey"
    />
  </el-row>
</template>

<style scoped>
.header {
  margin-bottom: 10px;
}
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

.risk-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.risk,
.sub-risk-link {
  padding: 3px 0 3px 0;
}

.s-risk {
  padding: 0 0 3px 0;
}

.risk,
.s-risk,
.sub-risk-link {
  font-size: 1em;
  text-align: center;
  border: 1px solid lightgray;
}

.risk:hover,
.s-risk:hover {
  background-color: rgb(245, 246, 252);
}

.sub-risk-link:hover {
  background-color: rgb(228, 230, 241);
}

.risk a,
.s-risk a,
.sub-risk a {
  color: #294e76;
  text-decoration: none;
  display: inline-block;
}

.risk a:hover,
.s-risk a:hover,
.sub-risk a:hover {
  color: #002b58;
}

.sidebar {
  width: 5px;
}

.link {
  display: block;
  height: 100%;
  width: 100%;
  font-size: 90%;
}
</style>
