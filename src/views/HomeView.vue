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

  // console.log(
  //   Object.keys(BREAK.avoidances).map((rKey) => {
  //     console.log(rKey + ":" + BREAK.avoidances[rKey as keyof typeof BREAK.avoidances].title);
  //   })
  // );

  //分商业场景查看风险
  interface SceneBREAK {
    riskDimensions: {
      [key: string]: {
        title: string;
        riskScenes: string[];
      };
    };
    riskScenes: {
      [key: string]: {
        title: string;
        risks: string[];
      };
    };
  }
  //url params init
  const bsKeySelected = ref(route.params.bsKey as string);
  const sceneBREAK = ref({
    riskDimensions: BREAK.riskDimensions,
    riskScenes: BREAK.riskScenes,
  } as SceneBREAK);
  if (bsKeySelected.value && bsKeySelected.value.match(/BS[0-9]{2}/)) {
    sceneBREAK.value = {
      riskDimensions: BREAK.businessScenes[bsKeySelected.value].riskDimensions,
      riskScenes: BREAK.businessScenes[bsKeySelected.value].riskScenes,
    };
  }
  //bsKeySelected event
  watch(bsKeySelected, () => {
    if (!bsKeySelected.value.match(/BS[0-9]{2}/)) {
      bsKeySelected.value = "";
      sceneBREAK.value = {
        riskDimensions: BREAK.riskDimensions,
        riskScenes: BREAK.riskScenes,
      };
      router.push({
        name: "home",
      });
    } else {
      sceneBREAK.value = {
        riskDimensions: BREAK.businessScenes[bsKeySelected.value].riskDimensions,
        riskScenes: BREAK.businessScenes[bsKeySelected.value].riskScenes,
      };
      router.push({
        name: "businessScene",
        params: {
          bsKey: bsKeySelected.value,
        },
      });
    }
    // 重置风险维度和风险场景的 col 总大小，以便重新计算
    totalRowSize = 24;
    totalDimensionRowSize = 24;
  });

  let getRisks = (riskScenes: typeof sceneBREAK.value.riskScenes, rsKey: string) => {
    return riskScenes[rsKey as keyof typeof sceneBREAK.value.riskScenes].risks;
  };

  /*-----子风险筛选-----*/
  const getSubRisks = (prKey: string) => {
    return Object.keys(BREAK.risks).filter(
      (rKey) => rKey.includes("-") && rKey.split("-")[0] == prKey
    );
  };

  // 以父风险为key，将子风险放到value的对象中
  let subRisks = ref(Object());
  Object.keys(BREAK.risks).forEach((prKey) => {
    if (prKey.includes("-")) return;
    let srKeys = getSubRisks(prKey);
    if (srKeys.length > 0) {
      subRisks.value[prKey] = srKeys;
    }
  });
  // console.log(subRisks.value);
  //subrisk end.

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

  // 通过动态计算每个风险维度中风险场景的数量，来分配每个风险维度的Col大小，主要解决24不能被整除问题
  let totalRowSize = 24;
  let getDimensionRowSize = (dimensionScenesLength: number, totalSceneslength: number) => {
    let step = Math.round((dimensionScenesLength / totalSceneslength) * 24);

    totalRowSize = totalRowSize <= 0 ? 24 : totalRowSize;

    step = step > totalRowSize ? totalRowSize : step;
    totalRowSize -= step;

    return step;
  };
  // 通过通过动态计算每个风险维度中风险场景的数量，来分配每个风险场景的Col大小，主要解决24不能被整除问题
  let totalDimensionRowSize = 24;
  let getSceneRowSize = (sceneLength: number) => {
    let step = Math.round(24 / sceneLength);

    totalDimensionRowSize = totalDimensionRowSize <= 0 ? 24 : totalDimensionRowSize;

    step = step > totalDimensionRowSize ? totalDimensionRowSize : step;
    totalDimensionRowSize -= step;

    return step;
  };
</script>

<template>
  <el-row class="header">
    <el-col :span="24" :offset="0" style="text-align: center">
      <h3 style="margin-bottom: 0">{{ $t("BREAK.title") }} v{{ BREAK.version }}</h3>
      <h6 style="color: gray">{{ $t("BREAK.description") }}</h6>
    </el-col>

    <el-col id="scene-selector">
      <el-select v-model="bsKeySelected" :placeholder="$t('allScenes')">
        <el-option key="" :label="$t('allScenes')" value=""></el-option>
        <el-option
          v-for="(bsVal, bsKey) in BREAK.businessScenes"
          :key="bsKey"
          :label="bsKey + ':&nbsp;&nbsp;' + bsVal.title"
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
      :md="getDimensionRowSize(rdVal.riskScenes.length, Object.keys(sceneBREAK.riskScenes).length)"
    >
      <h3 class="risk-dimension-title" :title="rdKey.toString()">
        {{ $t(`BREAK.riskDimensions.${rdKey}.title`) }}
      </h3>

      <el-row justify="center">
        <!-- 风险维度 -->
        <el-col
          class="risk-scene"
          v-for="rsKey in rdVal.riskScenes"
          :key="rsKey"
          :md="getSceneRowSize(rdVal.riskScenes.length)"
        >
          <h4 class="risk-scene-title" :title="rsKey">
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
              :title="rKey + ': ' + $t(`BREAK.risks.${rKey}.definition`)"
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
                    style="color: #fff; background-color: lightgray; border-radius: 0 0 0 20px"
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
                  :title="srKey + ': ' + $t(`BREAK.risks.${srKey}.definition`)"
                  v-for="srKey in subRisks[rKey]"
                >
                  <td class="sidebar" style="border-right: 1px solid lightgray"></td>
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
  </el-row>
  <RiskDetail v-on:drawer-close="riskDetailClose" :drawer="drawer" :rKey="riskKey" />
</template>

<style scoped>
  .header {
    margin-bottom: 10px;
  }

  #scene-selector {
    position: absolute;
    bottom: 10px;
    width: 200px;
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

  .parent-risk-link {
    font-weight: 500;
  }
</style>
