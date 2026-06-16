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
  getColorFromCSS,
  graphColors,
  networkLayoutOptions,
  relationLineColors,
  RelationType,
} from "@/views/relation/relationTypes";

use([GraphChart, SankeyChart, LegendComponent, TooltipComponent, CanvasRenderer]);

export const useRelationViewModel = () => {
  const route = useRoute();
  const router = useRouter();
  const { t, locale } = useI18n();
  const { isDark } = useTheme();
  const { isMobile, width } = useBreakpoints();

  const getRelationTypeColor = (type: Exclude<RelationType, RelationType.all>) => {
    return getColorFromCSS(`--break-relation-${type}`);
  };

  const RelationTypeMapping = createRelationTypeMapping(
    (key) => t(key),
    getRelationTypeColor
  );

  const graphColorVarMap: Record<keyof typeof graphColors, string> = {
    background: "--break-bg-primary",
    line: "--break-text-muted",
    lineText: "--break-text-secondary",
    nodeText: "--break-text-primary",
    nodeBorder: "--break-border",
    subNodeFill: "--break-graph-sub-node-fill",
    subNodeBorder: "--break-graph-sub-node-border",
    selectedNodeBorder: "--break-graph-selected-border",
    selectedNodeGlow: "--break-graph-selected-border",
  };

  const getGraphColor = (key: keyof typeof graphColors) => {
    const varName = graphColorVarMap[key];
    let color = getColorFromCSS(varName);
    if (key === "selectedNodeGlow") {
      const rgb = color.match(/\d+/g)?.join(", ");
      color = rgb ? `rgba(${rgb}, 0.3)` : color;
    }
    return color;
  };

  const lineColorVarMap: Record<keyof typeof relationLineColors, string> = {
    avoidanceMeans: "--break-line-avoidance",
    directCauseRisk: "--break-line-direct-risk",
    indirectSupportRisk: "--break-line-indirect-risk",
    buildAttackTool: "--break-line-build-tool",
    useAttackTool: "--break-line-use-tool",
    causeRisk: "--break-line-cause-risk",
    relatedTerm: "--break-line-related-term",
    subRisk: "--break-line-sub",
    subAvoidance: "--break-line-sub",
    subAttackTool: "--break-line-sub",
    subThreatActor: "--break-line-sub",
    attackToolMaker: "--break-line-maker",
  };

  const getRelationLineColor = (key: keyof typeof relationLineColors) =>
    getColorFromCSS(lineColorVarMap[key]);

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
