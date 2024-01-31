<script setup lang="ts">
import BREAK from "@/BREAK";

import RiskDetail from "@/components/RiskDetail.vue";
import { ref, watch, computed } from "vue";
import { useRouter, useRoute } from "vue-router";

import "element-plus/es/components/row/style/css";
import "element-plus/es/components/col/style/css";
import { ElRow, ElCol } from "element-plus";

const router = useRouter();
const route = useRoute();

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
const bsKeySelected = ref((route.params.bsKey as string) || "BS00");
watch(
  () => route.params.bsKey,
  () => {
    bsKeySelected.value = (route.params.bsKey as string) || "BS00";
  }
);
const sceneBREAK = computed(
  () =>
    ({
      riskDimensions: BREAK.businessScenes[bsKeySelected.value].riskDimensions,
      riskScenes: BREAK.businessScenes[bsKeySelected.value].riskScenes,
    }) as SceneBREAK
);

//bsKeySelected event
watch(bsKeySelected, () => {
  if (
    bsKeySelected.value.match(/BS[0-9]{2}/) &&
    bsKeySelected.value !== "BS00"
  ) {
    router.push({
      name: "businessScene",
      params: {
        bsKey: bsKeySelected.value,
      },
    });
  } else {
    bsKeySelected.value = "BS00";
    router.push({
      name: "home",
    });
  }
  // 重置风险维度和风险场景的 col 总大小，以便重新计算
  totalRowSize = 24;
  totalDimensionRowSize = 24;
});

let getRisks = (
  riskScenes: typeof sceneBREAK.value.riskScenes,
  rsKey: string
) => {
  return riskScenes[rsKey as keyof typeof sceneBREAK.value.riskScenes].risks;
};

/*-----子风险筛选-----*/
const getSubRisks = (prKey: string) => {
  return Object.keys(BREAK.risks).filter(
    (rKey) => rKey.includes("-") && rKey.split("-")[0] == prKey
  );
};

// 以父风险为key，将子风险放到value的对象中
const subRisks = ref(Object());
const hideSubRisks = ref(Object());
Object.keys(BREAK.risks).forEach((prKey) => {
  if (prKey.includes("-")) return;
  let srKeys = getSubRisks(prKey);
  if (srKeys.length > 0) {
    subRisks.value[prKey] = srKeys;
    hideSubRisks.value[prKey] = false;
  }
});
const hideAllSubRisks = ref(false);
watch(
  () => hideAllSubRisks.value,
  () => {
    Object.keys(hideSubRisks.value).forEach((prKey) => {
      hideSubRisks.value[prKey] = hideAllSubRisks.value;
    });
  }
);
//subrisk end.

/////////////////////////////////////////////////////////////////////
//start: 查看风险细节
const riskDrawer = ref(false);
const riskKey = ref("");
const showRiskDetail = (riskKey1: string, drawer1: boolean) => {
  riskDrawer.value = drawer1;
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

const riskDetailClose = () => {
  riskDrawer.value = false;
  router.push({
    name: "home",
  });
};
//end.

// 通过动态计算每个风险维度中风险场景的数量，来分配每个风险维度的Col大小，主要解决24不能被整除问题
let totalRowSize = 24;
let getDimensionRowSize = (
  dimensionScenesLength: number,
  totalSceneslength: number
) => {
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

  totalDimensionRowSize =
    totalDimensionRowSize <= 0 ? 24 : totalDimensionRowSize;

  step = step > totalDimensionRowSize ? totalDimensionRowSize : step;
  totalDimensionRowSize -= step;

  return step;
};
</script>

<template>
  <el-row class="header">
    <el-col :span="24" :offset="0" style="text-align: center">
      <h3 style="margin-bottom: 0">
        {{ $t("BREAK.title") }} v{{ BREAK.version }}
      </h3>
      <h6 style="color: gray">{{ $t("BREAK.description") }}</h6>
    </el-col>

    <el-col :md="2" :sm="12" :offset="0">
      <el-select
        v-model="bsKeySelected"
        size="small"
        :placeholder="$t('allScenes')"
      >
        <el-option
          v-for="(bsVal, bsKey) in BREAK.businessScenes"
          :key="bsKey"
          :label="bsKey + ':&nbsp;&nbsp;' + bsVal.title"
          :value="bsKey"
        />
      </el-select>
    </el-col>
    <el-col :md="20" :sm="11" :offset="1">
      <el-radio-group size="small" v-model="hideAllSubRisks">
        <el-radio-button :label="false">{{
          $t("showAllSubRisks")
        }}</el-radio-button>
        <el-radio-button :label="true">{{
          $t("hideAllSubRisks")
        }}</el-radio-button>
      </el-radio-group>
    </el-col>
  </el-row>

  <el-row>
    <!-- 风险场景 -->
    <el-col
      class="risk-dimension"
      v-for="(rdVal, rdKey) in sceneBREAK.riskDimensions"
      :key="rdKey"
      :md="
        getDimensionRowSize(
          rdVal.riskScenes.length,
          Object.keys(sceneBREAK.riskScenes).length
        )
      "
    >
      <h3 class="risk-dimension-title" :title="rdKey.toString()">
        {{
          $t(
            `BREAK.businessScenes.${bsKeySelected}.riskDimensions.${rdKey}.title`
          )
        }}
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
            {{
              $t(
                `BREAK.businessScenes.${bsKeySelected}.riskScenes.${rsKey}.title`
              )
            }}

            <!-- </a> -->
          </h4>
          <ul class="risk-list">
            <!-- 风险列表 -->
            <li
              :class="subRisks[rKey] ? 's-risk' : 'risk'"
              v-for="rKey in getRisks(sceneBREAK.riskScenes, rsKey)"
              :key="rKey"
              :title="rKey + ': ' + $t(`BREAK.risks.${rKey}.definition`)"
              :style="hideSubRisks[rKey] ? '' : 'padding:0 0 3px 0;'"
            >
              <!-- 有子风险时，显示子风险列表 -->
              <table
                class="risk-with-sub"
                style="width: 100%; border-spacing: 0px"
                v-if="subRisks[rKey]"
              >
                <tr>
                  <td
                    class="sidebar sidebar-icon"
                    @click="hideSubRisks[rKey] = !hideSubRisks[rKey]"
                    :title="$t('showhideSubRisks')"
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
                  v-for="(srKey, index) in subRisks[rKey]"
                  v-show="!hideSubRisks[rKey]"
                >
                  <td class="sidebar sidebar-line">
                    <svg v-if="index === 0" fill="lightgray">
                      <path d="M0 0H12V12Z"></path>
                    </svg>
                  </td>
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
  <RiskDetail
    v-on:drawer-close="riskDetailClose"
    :drawer="riskDrawer"
    :rKey="riskKey"
  />
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
  width: 8px;
}

.sidebar-icon {
  cursor: pointer;
  color: #fff;
  background-color: lightgray;
  /* border-radius: 0 0 0 20px; */
}

.first-sub-risk .sidebar {
  border-radius: 0 0 0 20px;
  background-color: lightgray;
}

.sidebar-icon:hover {
  background-color: rgb(228, 230, 241);
  color: grey;
}
.sidebar-line {
  border-right: 1px solid lightgray;
  position: relative;
}

.sidebar-line svg {
  position: absolute;
  top: 0px;
  left: 0px;
  color: lightgray;
  width: 10px;
  height: 10px;
}

.link {
  display: block;
  height: 100%;
  width: 100%;
  font-size: 90%;
}

.parent-risk-link {
  font-weight: 500;
  border-left: 1px solid lightgray;
}
</style>
