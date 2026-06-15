<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import BREAK from "@/BREAK";
import { useI18n } from "vue-i18n";
import { useTheme } from "@/composables/useTheme";
import { init, use, type ECharts, type EChartsOption } from "echarts/core";
import { GraphChart } from "echarts/charts";
import { TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

use([GraphChart, TooltipComponent, CanvasRenderer]);

const props = defineProps<{
  rKey: string;
}>();

const { t } = useI18n();
const { isDark } = useTheme();

const chartRef = ref<HTMLDivElement>();
let chart: ECharts | null = null;

const isTouchDevice =
  typeof window !== "undefined" &&
  ("ontouchstart" in window || navigator.maxTouchPoints > 0);

const getRelationColor = (type: "risk" | "avoidance" | "attackTool" | "threatActor") => {
  const element = document.documentElement;
  const style = getComputedStyle(element);
  const colorMap = {
    risk: "--break-relation-risk",
    avoidance: "--break-relation-avoidance",
    attackTool: "--break-relation-attack-tool",
    threatActor: "--break-relation-threat-actor",
  };
  return style.getPropertyValue(colorMap[type]).trim();
};

interface GraphNode {
  id: string;
  name: string;
  text: string;
  labelText: string;
  symbolSize: number;
  itemStyle: {
    color: string;
    borderColor: string;
    borderWidth: number;
  };
  x?: number;
  y?: number;
  fixed?: boolean;
}

interface GraphLink {
  source: string;
  target: string;
  lineStyle: {
    color: string;
    opacity: number;
    curveness: number;
  };
}

const nodeText = (type: "risks" | "avoidances" | "attackTools" | "threatActors", key: string) =>
  `${key}\n${t(`BREAK.${type}.${key}.title`)}`;

const wrapLabelText = (text: string, maxLineLength = 10) => {
  const [id, title = ""] = text.split("\n");
  if (!title) return id;

  const words = title.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  if (words.length > 1) {
    let current = "";
    words.forEach((word) => {
      if (!current) {
        current = word;
      } else if (`${current} ${word}`.length <= maxLineLength) {
        current = `${current} ${word}`;
      } else {
        lines.push(current);
        current = word;
      }
    });
    if (current) lines.push(current);
  } else {
    for (let index = 0; index < title.length; index += maxLineLength) {
      lines.push(title.slice(index, index + maxLineLength));
    }
  }

  return [id, ...lines.slice(0, 3)].join("\n");
};

const buildGraphData = () => {
  const rootId = props.rKey;
  const nodes: GraphNode[] = [];

  BREAK.risks[props.rKey as keyof typeof BREAK.risks].avoidances.forEach((avoidanceKey) => {
    const text = nodeText("avoidances", avoidanceKey);
    nodes.push({
      id: avoidanceKey,
      name: avoidanceKey,
      text,
      labelText: wrapLabelText(text, 10),
      symbolSize: 96,
      itemStyle: {
        color: getRelationColor("avoidance"),
        borderColor: getGraphColor("nodeBorder"),
        borderWidth: 1,
      },
    });
  });

  Object.keys(BREAK.attackTools).forEach((atKey) => {
    const at = BREAK.attackTools[atKey as keyof typeof BREAK.attackTools];
    if (at.directCauseRisks.includes(props.rKey) || at.indirectSupportRisks.includes(props.rKey)) {
      const text = nodeText("attackTools", atKey);
      nodes.push({
        id: atKey,
        name: atKey,
        text,
        labelText: wrapLabelText(text, 10),
        symbolSize: 96,
        itemStyle: {
          color: getRelationColor("attackTool"),
          borderColor: getGraphColor("nodeBorder"),
          borderWidth: 1,
        },
      });
    }
  });

  Object.keys(BREAK.threatActors).forEach((taKey) => {
    const ta = BREAK.threatActors[taKey as keyof typeof BREAK.threatActors];
    if (ta.directCauseRisks.includes(props.rKey) || ta.indirectSupportRisks.includes(props.rKey)) {
      const text = nodeText("threatActors", taKey);
      nodes.push({
        id: taKey,
        name: taKey,
        text,
        labelText: wrapLabelText(text, 10),
        symbolSize: 96,
        itemStyle: {
          color: getRelationColor("threatActor"),
          borderColor: getGraphColor("nodeBorder"),
          borderWidth: 1,
        },
      });
    }
  });

  const links: GraphLink[] = nodes.map((node) => ({
    source: node.id,
    target: rootId,
    lineStyle: {
      color: getGraphColor("line"),
      opacity: isDark.value ? 0.42 : 0.52,
      curveness: 0.18,
    },
  }));

  const rootText = nodeText("risks", props.rKey);
  nodes.push({
    id: rootId,
    name: rootId,
    text: rootText,
    labelText: wrapLabelText(rootText, 10),
    symbolSize: 112,
    x: 0,
    y: 0,
    fixed: true,
    itemStyle: {
      color: getRelationColor("risk"),
      borderColor: getGraphColor("nodeBorder"),
      borderWidth: 1,
    },
  });

  return { nodes, links };
};

const renderChart = (notMerge = false) => {
  if (!chartRef.value) return;
  if (!chart) {
    chart = init(chartRef.value);
  }
  const graphData = buildGraphData();
  const option = {
    backgroundColor: getGraphColor("background"),
    tooltip: {
      trigger: "item",
      formatter: (params: { dataType?: string; data?: GraphNode }) =>
        params.dataType === "node" ? (params.data?.text ?? "").replace(/\n/g, "<br>") : "",
    },
    series: [
      {
        type: "graph",
        layout: "force",
        data: graphData.nodes,
        links: graphData.links,
        roam: isTouchDevice,
        draggable: isTouchDevice,
        force: {
          repulsion: 260,
          edgeLength: 155,
          gravity: 0.08,
          friction: 0.35,
        },
        label: {
          show: true,
          color: getGraphColor("nodeText"),
          fontSize: 13,
          lineHeight: 17,
          formatter: (params: { data?: GraphNode }) => params.data?.labelText ?? "",
        },
        lineStyle: {
          color: getGraphColor("line"),
          opacity: isDark.value ? 0.42 : 0.52,
          curveness: 0.18,
        },
        scaleLimit: {
          min: 0.2,
          max: 3,
        },
      },
    ],
  } satisfies EChartsOption;

  chart.setOption(option, { notMerge, lazyUpdate: false });
  chart.resize();
};

const resizeChart = () => {
  chart?.resize();
};

onMounted(() => {
  nextTick(() => renderChart(true));
  window.addEventListener("resize", resizeChart);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", resizeChart);
  chart?.dispose();
  chart = null;
});

watch(
  () => props.rKey,
  () => {
    renderChart(true);
  }
);

watch(isDark, () => {
  renderChart(true);
});
</script>

<template>
  <div
    class="risk-relation-pane"
    @dblclick="$router.push({ name: 'relation', params: { type: 'risk', key: rKey } })"
    id="risk-relation-pane"
    :title="$t('more')"
  >
    <div ref="chartRef" class="risk-relation-chart"></div>
  </div>
</template>

<style scoped>
.risk-relation-pane {
  width: 100%;
  height: 60dvh;
  border: var(--break-graph-border) solid 1px;
  background: var(--break-bg-card);
}

.risk-relation-chart {
  width: 100%;
  height: 100%;
}
</style>
