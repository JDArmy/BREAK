/**
 * 首页风险矩阵布局计算 composable。
 *
 * 从 HomeView 提取的布局逻辑：业务域选择、风险维度/场景列宽计算、
 * 滚动阈值判断、子风险折叠管理。
 */

import { computed, ref, watch, type Ref } from "vue";
import BREAK from "@/BREAK/home";

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

// 场景布局常量
const SCENE_MIN_WIDTH_CN = 126;
const SCENE_MAX_WIDTH_CN = 190;
const SCENE_MIN_WIDTH_EN = 180;
const SCENE_MAX_WIDTH_EN = 300;
const SCENE_CARD_GAP = 6;

const visualTextLength = (value: string) =>
  Array.from(value).reduce(
    (length, char) => length + (/[一-鿿]/.test(char) ? 2 : 1),
    0,
  );

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export interface SceneLayoutItem {
  key: string;
  value: { title: string; riskScenes: string[] };
  size: number;
  width: number | undefined;
  scenes: { key: string; size: number; width: number | undefined }[];
}

export function useHomeSceneLayout(
  bdKeySelected: Ref<string>,
  locale: Ref<string>,
  getTitle: {
    riskScene: (key: string) => string;
    risk: (key: string) => string;
  },
) {
  const isChineseLocale = computed(() => locale.value === "cn");

  const sceneBREAK = computed(
    () =>
      ({
        riskDimensions:
          BREAK.businessDomains[bdKeySelected.value].riskDimensions,
        riskScenes: BREAK.businessDomains[bdKeySelected.value].riskScenes,
      }) as SceneBREAK,
  );

  const getSceneColumnWidth = (sceneKey: string) => {
    const isEnglish = locale.value === "en";
    const sceneTitle = getTitle.riskScene(sceneKey);
    const risks =
      sceneBREAK.value.riskScenes[
        sceneKey as keyof typeof sceneBREAK.value.riskScenes
      ]?.risks ?? [];
    const maxRiskTitleLength = risks.reduce((maxLength, riskKey) => {
      return Math.max(maxLength, visualTextLength(getTitle.risk(riskKey)));
    }, 0);
    const contentLength = Math.max(
      visualTextLength(sceneTitle),
      maxRiskTitleLength,
    );
    const minWidth = isEnglish ? SCENE_MIN_WIDTH_EN : SCENE_MIN_WIDTH_CN;
    const maxWidth = isEnglish ? SCENE_MAX_WIDTH_EN : SCENE_MAX_WIDTH_CN;
    const charWidth = isEnglish ? 7 : 9;
    const padding = isEnglish ? 44 : 34;
    return clamp(
      Math.ceil(contentLength * charWidth + padding),
      minWidth,
      maxWidth,
    );
  };

  // 桌面端统一走横向滚动布局：维度始终在同一行（flex-wrap: nowrap），
  // 内容宽度 < 容器宽时铺满无滚动条，超出则横向滚动。移动端由 HomeView 的
  // shouldEnableMatrixScroll && !isMobile 切换为垂直堆叠，不依赖此值。
  const shouldEnableScroll = computed(() => true);

  const sceneLayout = computed<SceneLayoutItem[]>(() => {
    return Object.entries(sceneBREAK.value.riskDimensions).map(
      ([rdKey, rdVal]) => {
        const dimensionWidth = rdVal.riskScenes.reduce(
          (total, sceneKey) =>
            total + getSceneColumnWidth(sceneKey) + SCENE_CARD_GAP,
          0,
        );
        const dimensionSize = 24;

        let remainingSceneSize = 24;
        const scenes = rdVal.riskScenes.map((rsKey) => {
          let sceneSize = Math.round(24 / rdVal.riskScenes.length);
          sceneSize = Math.min(sceneSize, remainingSceneSize || 24);
          remainingSceneSize -= sceneSize;
          return {
            key: rsKey,
            size: sceneSize,
            width: getSceneColumnWidth(rsKey),
          };
        });

        return {
          key: rdKey,
          value: rdVal,
          size: dimensionSize,
          width: dimensionWidth,
          scenes,
        };
      },
    );
  });

  return { sceneBREAK, sceneLayout, shouldEnableScroll, isChineseLocale };
}

/** 子风险折叠管理 */
export function useSubRiskToggle() {
  const subRisks = ref<Record<string, string[]>>({});
  const hideSubRisks = ref<Record<string, boolean>>({});

  Object.keys(BREAK.risks).forEach((prKey) => {
    if (prKey.includes("-")) return;
    const srKeys = Object.keys(BREAK.risks).filter(
      (rKey) => rKey.includes("-") && rKey.split("-")[0] === prKey,
    );
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
    },
  );

  return { subRisks, hideSubRisks, hideAllSubRisks };
}
