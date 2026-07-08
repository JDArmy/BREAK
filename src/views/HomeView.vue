<script setup lang="ts">
import BREAK from "@/BREAK/home";

import { ref, watch, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useBreakpoints } from "@/composables/useBreakpoints";
import { useDrawerRoute } from "@/composables/useDrawerRoute";
import { useHomeSceneLayout, useSubRiskToggle } from "@/composables/useHomeSceneLayout";
import { entityRegistry } from "@/BREAK/entityRegistry";
import { useCases } from "@/composables/useCases";
import { useI18n } from "vue-i18n";
import { createRecoverableAsyncComponent } from "@/utils/chunkLoadRecovery";

const RiskDetail = createRecoverableAsyncComponent(() => import("@/components/RiskDetail.vue"), undefined, "HomeRiskDetail");
const AvoidanceDetail = createRecoverableAsyncComponent(() => import("@/components/AvoidanceDetail.vue"), undefined, "HomeAvoidanceDetail");
const AttackToolDetail = createRecoverableAsyncComponent(() => import("@/components/AttackToolDetail.vue"), undefined, "HomeAttackToolDetail");
const ThreatActorDetail = createRecoverableAsyncComponent(() => import("@/components/ThreatActorDetail.vue"), undefined, "HomeThreatActorDetail");
const TermDetail = createRecoverableAsyncComponent(() => import("@/components/TermDetail.vue"), undefined, "HomeTermDetail");
const CaseDetail = createRecoverableAsyncComponent(() => import("@/components/CaseDetail.vue"), undefined, "HomeCaseDetail");

const router = useRouter();
const route = useRoute();
const { locale, t, te } = useI18n();
const { cases, ensureCases } = useCases();
const defaultBusinessSceneKey = "BS00";

const { isMobile } = useBreakpoints();
const componentSize = computed(() => isMobile.value ? 'default' : 'small');

const getSingleRouteParam = (param: unknown) =>
  typeof param === "string" ? param : undefined;

const hasOwn = <T extends object>(obj: T, key: string) =>
  Object.prototype.hasOwnProperty.call(obj, key);

type FullBREAK = typeof import("@/BREAK").default;
let fullBreakPromise: Promise<FullBREAK> | null = null;

const loadFullBREAK = () => {
  // 失败时清空缓存并 rethrow，避免把 rejected Promise 永久缓存导致抽屉详情功能瘫痪
  fullBreakPromise ??= import("@/BREAK")
    .then(({ default: fullBREAK }) => fullBREAK)
    .catch((err) => {
      fullBreakPromise = null;
      throw err;
    });
  return fullBreakPromise;
};

// 统计所有风险（包括子风险）
const totalRisks = computed(() => Object.keys(BREAK.risks).length);
const subRisksCount = computed(() => Object.keys(BREAK.risks).filter(key => key.includes('-')).length);

// 统计所有规避手段（包括子手段）
const totalAvoidances = computed(() => BREAK.entityCounts.avoidances);
const subAvoidancesCount = computed(() => BREAK.entityCounts.subAvoidances);

// 统计所有攻击工具（包括子工具）
const totalAttackTools = computed(() => BREAK.entityCounts.attackTools);
const subAttackToolsCount = computed(() => BREAK.entityCounts.subAttackTools);

// 统计所有威胁行为者（包括子行为者）
const totalThreatActors = computed(() => BREAK.entityCounts.threatActors);
const subThreatActorsCount = computed(() => BREAK.entityCounts.subThreatActors);
const totalTerms = computed(() => BREAK.entityCounts.terms);
const totalCases = computed(() => BREAK.entityCounts.cases);

//分业务场景查看风险

const isChineseLocale = computed(() => locale.value === "cn");

const getLocalizedText = (path: string, cnText: string) => {
  // 中文环境直接用中文文本，不触发 i18n 查找；
  // 英文环境先用 te 检查 key 是否存在，存在才 t(path)，否则用中文兜底——
  // 避免首页轻量数据入口首屏未注入实体 title 时批量报 "[intlify] Not found" 警告
  if (isChineseLocale.value) return cnText;
  return te(path) ? String(t(path)) : cnText;
};

const getBusinessSceneTitle = (bsKey: string) =>
  getLocalizedText(
    `BREAK.businessScenes.${bsKey}.title`,
    BREAK.businessScenes[bsKey]?.title ?? bsKey
  );

const getBusinessSceneDescription = (bsKey: string) =>
  getLocalizedText(
    `BREAK.businessScenes.${bsKey}.description`,
    BREAK.businessScenes[bsKey]?.description ?? ""
  );

const getRiskDimensionTitle = (dimensionKey: string) =>
  getLocalizedText(
    `BREAK.businessScenes.${bsKeySelected.value}.riskDimensions.${dimensionKey}.title`,
    BREAK.businessScenes[bsKeySelected.value].riskDimensions[dimensionKey]?.title ?? dimensionKey
  );

const getRiskSceneTitle = (sceneKey: string) =>
  getLocalizedText(
    `BREAK.businessScenes.${bsKeySelected.value}.riskScenes.${sceneKey}.title`,
    BREAK.businessScenes[bsKeySelected.value].riskScenes[sceneKey]?.title ?? sceneKey
  );

const getRiskTitle = (riskKey: string) =>
  getLocalizedText(`BREAK.risks.${riskKey}.title`, BREAK.risks[riskKey]?.title ?? riskKey);

const getRiskDefinition = (riskKey: string) =>
  getLocalizedText(`BREAK.risks.${riskKey}.definition`, BREAK.risks[riskKey]?.definition ?? "");

const shouldEnableMatrixScroll = computed(() => shouldEnableScroll.value && !isMobile.value);


const normalizeBusinessSceneKey = (key?: string) =>
  key && hasOwn(BREAK.businessScenes, key) ? key : defaultBusinessSceneKey;

//url params init
const bsKeySelected = ref(normalizeBusinessSceneKey(getSingleRouteParam(route.params.bsKey)));
watch(
  () => route.params.bsKey,
  (rawBsKey) => {
    const nextBsKey = getSingleRouteParam(rawBsKey);
    const normalizedBsKey = normalizeBusinessSceneKey(nextBsKey);
    bsKeySelected.value = normalizedBsKey;

    if (route.name === "businessScene" && nextBsKey !== normalizedBsKey) {
      router.replace({ name: "home" });
    }
  },
  { immediate: true }
);

// 场景布局计算委托给 composable（布局常量、列宽计算、滚动阈值均在 composable 内部管理）
const { sceneBREAK, sceneLayout, shouldEnableScroll } = useHomeSceneLayout(
  bsKeySelected,
  locale,
  { riskScene: getRiskSceneTitle, risk: getRiskTitle },
);

//bsKeySelected event
watch(bsKeySelected, (rawBsKey) => {
  const normalizedBsKey = normalizeBusinessSceneKey(rawBsKey);
  if (normalizedBsKey !== rawBsKey) {
    bsKeySelected.value = normalizedBsKey;
    return;
  }

  if (normalizedBsKey === defaultBusinessSceneKey) {
    if (route.name !== "home") {
      router.push({ name: "home" });
    }
    return;
  }

  if (route.name !== "businessScene" || route.params.bsKey !== normalizedBsKey) {
    router.push({
      name: "businessScene",
      params: {
        bsKey: normalizedBsKey,
      },
    });
  }
});

const getRisks = (
  riskScenes: typeof sceneBREAK.value.riskScenes,
  rsKey: string
) => {
  return riskScenes[rsKey as keyof typeof sceneBREAK.value.riskScenes].risks;
};

/*-----子风险筛选-----*/
const { subRisks, hideSubRisks, hideAllSubRisks } = useSubRiskToggle();
//subrisk end.
//subrisk end.

/////////////////////////////////////////////////////////////////////
// 抽屉路由管理——统一使用 useDrawerRoute composable

// 业务场景下的实体抽屉路由名集合（从 entityRegistry 派生）
const businessSceneDrawerRouteNames = entityRegistry
  .map(e => e.businessSceneDetailRouteName)
  .filter(Boolean);
const isBusinessSceneDrawerRoute = (name: unknown) =>
  typeof name === "string" && businessSceneDrawerRouteNames.includes(name);

// 关闭抽屉：来自业务场景则回 businessScene（保留 bsKey），否则回 home
const closeDrawerToHome = () => {
  if (isBusinessSceneDrawerRoute(route.name) && route.params.bsKey) {
    router.push({ name: "businessScene", params: { bsKey: route.params.bsKey } });
  } else {
    router.push({ name: "home" });
  }
};

// 风险详情抽屉（支持首页与业务场景两类路由名）
const riskDrawer = useDrawerRoute({
  routeNames: ["homeRiskDetail", "businessSceneRiskDetail"],
  routeParam: "rKey",
  validateKey: (key) => hasOwn(BREAK.risks, key),
  onClose: closeDrawerToHome,
});

// 规避手段抽屉
const avoidanceDrawer = useDrawerRoute({
  routeNames: ["homeAvoidanceDetail", "businessSceneAvoidanceDetail"],
  routeParam: "aKey",
  validateKey: async (key) => {
    const fullBREAK = await loadFullBREAK();
    return hasOwn(fullBREAK.avoidances, key);
  },
  onClose: closeDrawerToHome,
});

// 攻击工具抽屉
const attackToolDrawer = useDrawerRoute({
  routeNames: ["homeAttackToolDetail", "businessSceneAttackToolDetail"],
  routeParam: "atKey",
  validateKey: async (key) => {
    const fullBREAK = await loadFullBREAK();
    return hasOwn(fullBREAK.attackTools, key);
  },
  onClose: closeDrawerToHome,
});

// 威胁行为者抽屉
const threatActorDrawer = useDrawerRoute({
  routeNames: ["homeThreatActorDetail", "businessSceneThreatActorDetail"],
  routeParam: "taKey",
  validateKey: async (key) => {
    const fullBREAK = await loadFullBREAK();
    return hasOwn(fullBREAK.threatActors, key);
  },
  onClose: closeDrawerToHome,
});

// 行业术语抽屉
const termDrawer = useDrawerRoute({
  routeNames: ["homeTermDetail", "businessSceneTermDetail"],
  routeParam: "tKey",
  validateKey: async (key) => {
    const fullBREAK = await loadFullBREAK();
    return hasOwn(fullBREAK.terms, key);
  },
  onClose: closeDrawerToHome,
});

// 典型案例抽屉（案例数据懒加载，仅首页路由）
const caseDrawer = useDrawerRoute({
  routeNames: ["homeCaseDetail"],
  routeParam: "cKey",
  validateKey: async (key) => {
    await ensureCases();
    return hasOwn(cases.value, key);
  },
  onClose: closeDrawerToHome,
});
</script>

<template>
  <el-row class="header" align="middle">
    <el-col :span="24" :offset="0" style="text-align: center">
      <h1 class="home-title">
        {{ $t("BREAK.title") }} v{{ BREAK.version }}
      </h1>
      <p class="home-description">{{ $t("BREAK.description") }}</p>
      <div class="last-updated">
        {{ $t("lastUpdated") }}: {{ BREAK.updated }}
      </div>
      <div class="stats">
        <router-link to="/knowledges/risk/list" class="stat-card">
          <div class="stat-label">{{ $t("stats.risks") }}</div>
          <div class="stat-number">{{ totalRisks }}</div>
          <div v-if="subRisksCount > 0" class="stat-sub">{{ $t("stats.subRisks") }} {{ subRisksCount }}</div>
        </router-link>
        <router-link to="/knowledges/avoidance/list" class="stat-card">
          <div class="stat-label">{{ $t("stats.avoidances") }}</div>
          <div class="stat-number">{{ totalAvoidances }}</div>
          <div v-if="subAvoidancesCount > 0" class="stat-sub">{{ $t("stats.subAvoidances") }} {{ subAvoidancesCount }}</div>
        </router-link>
        <router-link to="/knowledges/attack-tool/list" class="stat-card">
          <div class="stat-label">{{ $t("stats.attackTools") }}</div>
          <div class="stat-number">{{ totalAttackTools }}</div>
          <div v-if="subAttackToolsCount > 0" class="stat-sub">{{ $t("stats.subAttackTools") }} {{ subAttackToolsCount }}</div>
        </router-link>
        <router-link to="/knowledges/threat-actor/list" class="stat-card">
          <div class="stat-label">{{ $t("stats.threatActors") }}</div>
          <div class="stat-number">{{ totalThreatActors }}</div>
          <div v-if="subThreatActorsCount > 0" class="stat-sub">{{ $t("stats.subThreatActors") }} {{ subThreatActorsCount }}</div>
        </router-link>
        <router-link to="/knowledges/term/list" class="stat-card">
          <div class="stat-label">{{ $t("stats.terms") }}</div>
          <div class="stat-number">{{ totalTerms }}</div>
          <div class="stat-sub">&nbsp;</div>
        </router-link>
        <router-link to="/knowledges/case/list" class="stat-card">
          <div class="stat-label">{{ $t("stats.cases") }}</div>
          <div class="stat-number">{{ totalCases }}</div>
          <div class="stat-sub">&nbsp;</div>
        </router-link>
      </div>
    </el-col>

    <el-col :md="24" :sm="24" class="scene-controls">
      <div class="scene-selector-wrapper">
        <span class="control-label">{{ $t("businessScene") }}:</span>
        <el-select
          id="business-scene-selector"
          v-model="bsKeySelected"
          name="business-scene-selector"
          :size="componentSize"
          :placeholder="$t('allScenes')"
          class="scene-selector"
          :aria-label="$t('businessScene')"
        >
          <el-option
            v-for="(bsVal, bsKey) in BREAK.businessScenes"
            :key="bsKey"
            :label="bsKey + ': ' + getBusinessSceneTitle(String(bsKey))"
            :value="bsKey"
          />
        </el-select>
      </div>
      <div class="subrisk-controls-wrapper">
        <span class="control-label">{{ $t("subRiskDisplay") }}:</span>
        <el-radio-group
          v-model="hideAllSubRisks"
          class="subrisk-toggle"
          name="subrisk-toggle"
          :size="componentSize"
          :aria-label="$t('subRiskDisplay')"
        >
          <el-radio-button :value="false">{{
            $t("showAllSubRisks")
          }}</el-radio-button>
          <el-radio-button :value="true">{{
            $t("hideAllSubRisks")
          }}</el-radio-button>
        </el-radio-group>
      </div>
      <p v-if="getBusinessSceneDescription(bsKeySelected)" class="scene-description">
        {{ getBusinessSceneDescription(bsKeySelected) }}
      </p>
    </el-col>
  </el-row>

  <div :class="{ 'scrollable-container': shouldEnableMatrixScroll }">
    <el-row>
      <!-- 风险场景 -->
      <el-col
        class="risk-dimension"
        v-for="dimension in sceneLayout"
        :key="dimension.key"
        :xs="24"
        :sm="24"
        :md="shouldEnableMatrixScroll ? undefined : dimension.size"
        :style="shouldEnableMatrixScroll ? { flex: `0 0 ${dimension.width}px`, maxWidth: `${dimension.width}px` } : {}"
      >
        <div class="risk-card">
        <h3 class="risk-dimension-title" :title="dimension.key">
          {{
            getRiskDimensionTitle(dimension.key)
          }}
        </h3>

        <el-row justify="center">
          <!-- 风险维度 -->
          <el-col
            class="risk-scene"
            v-for="scene in dimension.scenes"
            :key="scene.key"
            :xs="24"
            :sm="24"
            :md="scene.size"
            :style="shouldEnableMatrixScroll && scene.width
              ? { flex: `0 0 ${scene.width}px`, maxWidth: `${scene.width}px` }
              : {}"
          >
          <h4 class="risk-scene-title" :title="t('riskSceneIdTitle', { id: scene.key })">
            <!-- <a :href="'/risk-demensions/' + rdKey"> -->
            {{
              getRiskSceneTitle(scene.key)
            }}

            <!-- </a> -->
          </h4>
          <ul class="risk-list">
            <!-- 风险列表 -->
            <li
              :class="subRisks[rKey] ? 's-risk' : 'risk'"
              v-for="rKey in getRisks(sceneBREAK.riskScenes, scene.key)"
              :key="rKey"
              :title="rKey + ': ' + getRiskDefinition(rKey)"
              :style="hideSubRisks[rKey] ? '' : 'padding:0 0 3px 0;'"
            >
              <!-- 有子风险时，显示子风险列表 -->
              <table
                class="risk-with-sub"
                style="width: 100%; border-spacing: 0px"
                :aria-label="getRiskTitle(rKey)"
                v-if="subRisks[rKey]"
              >
                <tbody>
                <tr>
                  <td
                    class="sidebar sidebar-icon"
                    :class="hideSubRisks[rKey] ? 'sidebar-collapsed' : 'sidebar-expanded'"
                    @click="hideSubRisks[rKey] = !hideSubRisks[rKey]"
                    :title="$t('showhideSubRisks')"
                  >
                    <span class="sidebar-arrow">{{ hideSubRisks[rKey] ? '▶' : '▼' }}</span>
                  </td>
                  <td class="parent-risk-link">
                    <router-link
                      class="link"
                      :to="bsKeySelected === defaultBusinessSceneKey
                        ? { name: 'homeRiskDetail', params: { rKey } }
                        : { name: 'businessSceneRiskDetail', params: { bsKey: bsKeySelected, rKey } }">{{
	                      getRiskTitle(rKey)
                    }}</router-link>
                  </td>
                  <td style="width: 1px"></td>
                </tr>
                <tr
                  class="sub-risk"
                  :key="srKey"
	                  :title="srKey + ': ' + getRiskDefinition(srKey)"
                  v-for="(srKey, index) in subRisks[rKey]"
                  v-show="!hideSubRisks[rKey]"
                >
                  <td class="sidebar sidebar-line" :class="hideSubRisks[rKey] ? 'sidebar-collapsed' : 'sidebar-expanded'">
                    <svg v-if="index === 0" fill="lightgray">
                      <path d="M0 0H12V12Z"></path>
                    </svg>
                  </td>
                  <td class="sub-risk-link">
                    <router-link
                      class="link"
                      :to="bsKeySelected === defaultBusinessSceneKey
                        ? { name: 'homeRiskDetail', params: { rKey: srKey } }
                        : { name: 'businessSceneRiskDetail', params: { bsKey: bsKeySelected, rKey: srKey } }">{{
	                      getRiskTitle(srKey)
                    }}</router-link>
                  </td>
                  <td style="width: 1px"></td>
                </tr>
                </tbody>
              </table>
              <!-- 无子风险时 -->
              <router-link
                class="link"
                v-else
                :to="bsKeySelected === defaultBusinessSceneKey
                  ? { name: 'homeRiskDetail', params: { rKey } }
                  : { name: 'businessSceneRiskDetail', params: { bsKey: bsKeySelected, rKey } }">{{
	                getRiskTitle(rKey)
              }}</router-link>
            </li>
          </ul>
        </el-col>
      </el-row>
      </div>
    </el-col>
  </el-row>
  </div>
  <RiskDetail
    v-if="riskDrawer.drawerVisible.value"
    v-on:drawer-close="riskDrawer.close"
    :drawer="riskDrawer.drawerVisible.value"
    :rKey="riskDrawer.entityKey.value"
  />
  <AvoidanceDetail
    v-if="avoidanceDrawer.drawerVisible.value"
    v-on:drawer-close="avoidanceDrawer.close"
    :drawer="avoidanceDrawer.drawerVisible.value"
    :aKey="avoidanceDrawer.entityKey.value"
  />
  <AttackToolDetail
    v-if="attackToolDrawer.drawerVisible.value"
    v-on:drawer-close="attackToolDrawer.close"
    :drawer="attackToolDrawer.drawerVisible.value"
    :atKey="attackToolDrawer.entityKey.value"
  />
  <ThreatActorDetail
    v-if="threatActorDrawer.drawerVisible.value"
    v-on:drawer-close="threatActorDrawer.close"
    :drawer="threatActorDrawer.drawerVisible.value"
    :taKey="threatActorDrawer.entityKey.value"
  />
  <TermDetail
    v-if="termDrawer.drawerVisible.value"
    v-on:drawer-close="termDrawer.close"
    :drawer="termDrawer.drawerVisible.value"
    :tKey="termDrawer.entityKey.value"
  />
  <CaseDetail
    v-if="caseDrawer.drawerVisible.value"
    v-on:drawer-close="caseDrawer.close"
    :drawer="caseDrawer.drawerVisible.value"
    :cKey="caseDrawer.entityKey.value"
  />
</template>

<style scoped>
.header {
  margin-bottom: 16px;
}

.scrollable-container {
  overflow-x: auto;
  overflow-y: hidden;
  margin-bottom: -20px;
  padding-bottom: 20px;
  -webkit-overflow-scrolling: touch;
}

.scrollable-container .el-row {
  flex-wrap: nowrap !important;
}

.risk-dimension {
  box-sizing: border-box;
  padding: 3px;
}

.risk-card {
  border: 1px solid var(--break-border);
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  padding-bottom: 10px;
  min-width: 0;
  overflow: hidden;
}

.risk-dimension-title {
  margin: 0 0 6px 0;
  color: var(--break-text-primary);
  text-align: center;
  font-weight: 700;
  font-size: 0.95em;
  padding: 8px 6px 6px;
  background: var(--break-border-light);
  border-bottom: 1px solid var(--break-border);
}

.risk-scene {
  padding: 3px;
  min-width: 0;
}

.risk-scene-title {
  margin-bottom: 5px;
  color: var(--break-text-secondary);
  text-align: center;
  font-weight: 600;
  font-size: 0.85em;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--break-border);
}

.risk-list {
  list-style: none;
  margin: 0;
  padding: 0;
  min-width: 0;
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
  border: 1px solid var(--break-border);
  border-radius: 4px;
  margin-bottom: 2px;
  min-width: 0;
}

.risk-with-sub {
  table-layout: fixed;
}

.risk:hover,
.risk:active,
.s-risk:hover,
.s-risk:active {
  background-color: var(--break-highlight-bg);
  border-color: var(--break-highlight-border);
}

.sub-risk-link:hover,
.sub-risk-link:active {
  background-color: var(--break-highlight-bg);
}

.risk a,
.s-risk a,
.sub-risk a {
  color: var(--break-link);
  text-decoration: none;
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.risk a:hover,
.risk a:active,
.s-risk a:hover,
.s-risk a:active,
.sub-risk a:hover,
.sub-risk a:active {
  color: var(--break-link-hover);
}

.sidebar {
  width: 10px;
}

.sidebar-icon {
  cursor: pointer;
  color: var(--break-text-weak);
  background: none;
  text-align: center;
  vertical-align: middle;
}

.sidebar-arrow {
  font-size: 9px;
  line-height: 1;
  display: block;
  text-align: center;
}

.sidebar-expanded {
  border-left: 3px solid var(--break-link);
  background-color: var(--break-highlight-bg);
  color: var(--break-link);
}

.sidebar-collapsed {
  border-left: 3px solid var(--break-border);
  background-color: transparent;
  color: var(--break-text-weak);
}

.sidebar-icon:hover,
.sidebar-icon:active {
  border-left-color: var(--break-link);
  background-color: var(--break-highlight-bg);
  color: var(--break-link-hover);
}

.sidebar-line {
  position: relative;
}

.sidebar-line svg {
  display: none;
}

.link {
  display: block;
  height: 100%;
  width: 100%;
  font-size: 90%;
  line-height: 1.45;
  padding: 2px 4px;
  box-sizing: border-box;
}

.parent-risk-link {
  font-weight: 500;
  border-left: 1px solid var(--break-border);
  min-width: 0;
}

.stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 1em;
  margin-bottom: 1em;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px 24px;
  background: linear-gradient(135deg, var(--break-stat-bg-start) 0%, var(--break-stat-bg-end) 100%);
  border-radius: 12px;
  text-decoration: none;
  color: var(--break-stat-text);
  min-width: 120px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.home-title {
  margin: 0;
  font-size: 1.5rem;
  line-height: 1.25;
}

.home-description {
  color: var(--break-text-secondary);
  margin: 0.2em 0 0.3em;
}

.stat-card:hover,
.stat-card:active {
  transform: translateY(-4px);
  box-shadow: 0 8px 12px rgba(0, 0, 0, 0.15);
  background: linear-gradient(135deg, var(--break-stat-hover-start) 0%, var(--break-stat-hover-end) 100%);
}

.stat-number {
  font-size: 2em;
  font-weight: bold;
  line-height: 1;
  margin-top: 4px;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 0.9em;
  opacity: 0.95;
  white-space: nowrap;
}

.stat-sub {
  font-size: 0.75em;
  opacity: 0.8;
  margin-top: 4px;
}

.stat-item {
  white-space: nowrap;
  text-decoration: none;
  color: var(--break-text-muted);
  transition: color 0.2s;
}

.stat-item:hover,
.stat-item:active {
  color: var(--break-link);
}

.stat-separator {
  color: var(--break-text-secondary);
}

.sub-count {
  font-size: 0.9em;
  color: var(--break-text-weak);
  margin-left: 2px;
}

.last-updated {
  text-align: center;
  color: var(--break-text-secondary);
  font-size: 0.7em;
  margin-top: 0.3em;
  margin-bottom: 0.5em;
}

.scene-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: var(--break-bg-soft);
  border-radius: 8px;
  border: 1px solid var(--break-border);
}

.scene-selector-wrapper,
.subrisk-controls-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--break-text-secondary);
  white-space: nowrap;
}

.scene-selector {
  min-width: 200px;
}

.scene-description {
  width: 100%;
  margin: 4px 0 0;
  padding: 0;
  color: var(--break-text-secondary);
  font-size: 13px;
  line-height: 1.65;
  background: none;
  border: none;
  border-radius: 0;
}

.subrisk-toggle {
  --el-radio-button-checked-bg-color: var(--blue-700);
  --el-radio-button-checked-border-color: var(--blue-700);
  --el-radio-button-checked-text-color: var(--slate-white);
  font-size: 0;
}

.subrisk-toggle :deep(.el-radio-button) {
  margin: 0;
  font-size: 14px;
}

.subrisk-toggle :deep(.el-radio-button:not(:first-child)) {
  margin-left: -1px;
}

.subrisk-toggle :deep(.el-radio-button__inner) {
  margin: 0;
}

/* 移动端适配 */
@media (max-width: 767px) {
  .home-title {
    font-size: 1.05rem;
  }

  .scene-controls {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .scene-selector-wrapper,
  .subrisk-controls-wrapper {
    flex-direction: column;
    align-items: stretch;
  }

  .subrisk-controls-wrapper {
    align-items: flex-start;
  }

  .control-label {
    font-size: 13px;
  }

  .scene-selector {
    width: 100%;
  }

  .subrisk-toggle {
    width: 100%;
    display: flex;
  }

  .subrisk-toggle :deep(.el-radio-button) {
    flex: 1;
    display: flex;
  }

  .subrisk-toggle :deep(.el-radio-button__inner) {
    width: 100%;
  }

  .stats {
    display: grid !important;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    width: 100%;
  }

  .stat-card {
    min-width: 0 !important;
    padding: 12px 16px;
  }

  .stat-number {
    font-size: 1.5em;
  }

  .scrollable-container {
    overflow-x: visible;
    overflow-y: visible;
    margin-bottom: 0;
    padding-bottom: 0;
  }

  .scrollable-container .el-row {
    flex-wrap: wrap !important;
  }

  .risk-dimension {
    width: 100%;
    max-width: 100%;
    padding: 6px 0;
  }

  .risk-card {
    width: 100%;
  }

  .risk-dimension-title {
    font-size: 0.95rem;
  }

  .risk-scene {
    width: 100%;
    max-width: 100%;
    padding: 6px 8px;
  }

  .risk-scene-title {
    text-align: left;
    font-size: 0.875rem;
  }

  .risk,
  .s-risk,
  .sub-risk-link {
    text-align: left;
  }

  .sidebar {
    width: 18px;
  }
}
</style>
