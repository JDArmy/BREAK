import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useTheme } from "@/composables/useTheme";
import { useBreakpoints } from "@/composables/useBreakpoints";
import { use } from "echarts/core";
import { GraphChart, SankeyChart } from "echarts/charts";
import { LegendComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
  import {
    createRelationDropdownRef,
    createRelationDropdownBinder,
    createNetworkInteractionsBridge,
    createRenderNetworkChartBridge,
  } from "@/views/relation/relationViewBridges";
import { createRelationViewAssembly } from "@/views/relation/relationViewAssembly";
import {
  createRelationTypeMapping,
  graphColors,
  networkLayoutOptions,
  relationLineColors,
  relationTypeColors,
  RelationType,
} from "@/views/relation/relationTypes";

use([GraphChart, SankeyChart, LegendComponent, TooltipComponent, CanvasRenderer]);

export const useRelationViewModel = () => {
  const route = useRoute();
  const router = useRouter();
  const { t, locale } = useI18n();
  const { isDark } = useTheme();
  const { isMobile, width } = useBreakpoints();

  const getRelationTypeColor = (type: Exclude<RelationType, RelationType.all>) =>
    isDark.value ? relationTypeColors[type].dark : relationTypeColors[type].light;

  const RelationTypeMapping = createRelationTypeMapping(
    (key) => t(key),
    getRelationTypeColor
  );

  const getGraphColor = (key: keyof typeof graphColors) =>
    isDark.value ? graphColors[key].dark : graphColors[key].light;

  const getRelationLineColor = (key: keyof typeof relationLineColors) =>
    isDark.value ? relationLineColors[key].dark : relationLineColors[key].light;

  const renderNetworkChartBridge = createRenderNetworkChartBridge();
  const dropdown1 = createRelationDropdownRef();
  const setDropdownInstance = createRelationDropdownBinder(dropdown1);
  const networkInteractionsBridge = createNetworkInteractionsBridge<unknown>();

  const relationView = createRelationViewAssembly({
    route,
    router,
    t,
    locale,
    isDark,
    isMobile,
    width,
    RelationTypeMapping,
    getGraphColor,
    getRelationLineColor,
    renderNetworkChartBridge,
    dropdown1,
    setDropdownInstance,
    networkInteractionsBridge,
  });

  return {
    RelationType,
    RelationTypeMapping,
    networkLayoutOptions,
    setDropdownInstance,
    ...relationView,
  };
};
