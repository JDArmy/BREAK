<script setup lang="ts">
import { onMounted, ref, watch, reactive, nextTick } from "vue";
import BREAK from "@/BREAK";
import { useI18n } from "vue-i18n";
import { useTheme } from "@/composables/useTheme";

import RelationGraph, {
  type RGJsonData,
  type RGLayoutOptions,
  type RGOptions,
} from "relation-graph/vue3";

const props = defineProps<{
  rKey: string;
}>();

const { t } = useI18n();
const { isDark } = useTheme();

watch(
  () => props.rKey,
  () => {
    setJsonData();
  }
);

const graphRef$ = ref<RelationGraph>();

// 控制图谱组件的销毁与重建，用于主题切换时完整重绘 Canvas
const graphVisible = ref(true);

const graphOptions: RGOptions = reactive({
  allowShowMiniToolBar: false, //是否显示工具栏
  disableZoom: true, //是否禁用缩放
  disableDragCanvas: true, //是否禁用拖拽画布
  defaultExpandHolderPosition: "hide",
  backgroundColor: "transparent",
  defaultLineColor: "#999999",
  defaultLineFontColor: "#666666",
  defaultNodeFontColor: "#333333",
  defaultNodeBorderColor: "#efefef",
});

// 暗色模式下销毁并重建图谱，确保 Canvas 完整重绘
watch(isDark, (dark) => {
  graphOptions.backgroundColor = dark ? "#0f172a" : "#ffffff";
  graphOptions.defaultLineColor = dark ? "#475569" : "#999999";
  graphOptions.defaultLineFontColor = dark ? "#94a3b8" : "#666666";
  graphOptions.defaultNodeFontColor = dark ? "#e2e8f0" : "#333333";
  graphOptions.defaultNodeBorderColor = dark ? "#334155" : "#efefef";
  // 销毁图谱，等待 DOM 更新后重建
  graphVisible.value = false;
  nextTick(() => {
    graphVisible.value = true;
    nextTick(() => {
      setJsonData();
    });
  });
}, { immediate: true });
graphOptions.layout = {
  layoutLabel: "中心布局",
  layoutName: "center",
  distance_coefficient: 2,
  maxLayoutTimes: 20,
  force_line_elastic: 0.3, // 连线牵引力系数
  force_node_repulsion: 3, // 节点排斥力系数
} as RGLayoutOptions;

onMounted(() => {
  setJsonData();
});

const setJsonData = () => {
  const rootId = props.rKey;
  const nodes: {
    id: string;
    text: string;
    color: string;
  }[] = [];

  // 枚举所有有关的avoidances
  BREAK.risks[props.rKey as keyof typeof BREAK.risks].avoidances.forEach(
    (avoidanceKey) => {
      nodes.push({
        id: avoidanceKey,
        text: avoidanceKey + "<br>" + t(`BREAK.avoidances.${avoidanceKey}.title`),
        color: "green",
      });
    }
  );

  // 枚举所有有关的attackTools
  Object.keys(BREAK.attackTools).forEach((atKey) => {
    const at = BREAK.attackTools[atKey as keyof typeof BREAK.attackTools];
    if (
      at.directCauseRisks.includes(props.rKey) || at.indirectSupportRisks.includes(props.rKey)
    ) {
      nodes.push({
        id: atKey,
        text: atKey + "<br>" + t(`BREAK.attackTools.${atKey}.title`),
        color: "blue",
      });
    }
  });

  // 枚举所有有关的threatActors
  Object.keys(BREAK.threatActors).forEach((taKey) => {
    const ta = BREAK.threatActors[taKey as keyof typeof BREAK.threatActors];
    if (
      ta.directCauseRisks.includes(props.rKey) || ta.indirectSupportRisks.includes(props.rKey)
    ) {
      nodes.push({
        id: taKey,
        text: taKey + "<br>" + t(`BREAK.threatActors.${taKey}.title`),
        color: "red",
      });
    }
  });

  const lines = nodes.map((node) => {
    return {
      from: node.id,
      to: rootId,
    };
  });

  /**
   * 将Root节点加入nodes
   */
  nodes.push({
    id: props.rKey,
    text: props.rKey + "<br>" + t(`BREAK.risks.${props.rKey}.title`),
    color: "orange",
  });
  const jsonData: RGJsonData = {
    rootId,
    nodes,
    lines,
  };

  graphRef$?.value?.setJsonData(jsonData);
};
</script>

<template>
  <!-- 关系图 -->
  <div
    style="border: var(--break-graph-border) solid 1px; height: calc(60vh); width: 100%"
    @dblclick="
      $router.push({ name: 'relation', params: { type: 'risk', key: rKey } })
    "
    id="relation-graph-pane"
    :title="$t('more')"
  >
    <relation-graph v-if="graphVisible" ref="graphRef$" :options="graphOptions" />
  </div>
</template>

<style scoped></style>
