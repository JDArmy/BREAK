<script setup lang="ts">
  import { onMounted, ref, watch } from "vue";
  import BREAK from "@/BREAK";

  import RelationGraph, {
    type RGJsonData,
    type RGLayoutOptions,
    type RGOptions,
  } from "relation-graph/vue3";

  const props = defineProps<{
    rKey: string;
  }>();

  watch(
    () => props.rKey,
    () => {
      setJsonData();
    }
  );

  const graphRef$ = ref<RelationGraph>();

  const graphOptions: RGOptions = {
    allowShowMiniToolBar: false, //是否显示工具栏
    disableZoom: true, //是否禁用缩放
    disableDragCanvas: true, //是否禁用拖拽画布
    defaultExpandHolderPosition: "hide",
  };
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
    let nodes: {
      id: string;
      text: string;
      color: string;
    }[] = [];

    // 枚举所有有关的avoidances
    BREAK.risks[props.rKey as keyof typeof BREAK.risks].avoidances.forEach((avoidanceKey) => {
      nodes.push({
        id: avoidanceKey,
        text:
          avoidanceKey +
          "<br>" +
          BREAK.avoidances[avoidanceKey as keyof typeof BREAK.avoidances].title,
        color: "green",
      });
    });

    // 枚举所有有关的attackTools
    Object.keys(BREAK.attackTools).forEach((atKey) => {
      if (
        BREAK.attackTools[atKey as keyof typeof BREAK.attackTools].risks.includes(
          props.rKey as never
        )
      ) {
        nodes.push({
          id: atKey,
          text: atKey + "<br>" + BREAK.attackTools[atKey as keyof typeof BREAK.attackTools].title,
          color: "blue",
        });
      }
    });

    // 枚举所有有关的threatActors
    Object.keys(BREAK.threatActors).forEach((taKey) => {
      if (
        BREAK.threatActors[taKey as keyof typeof BREAK.threatActors].makeRisks.includes(
          props.rKey as never
        )
      ) {
        nodes.push({
          id: taKey,
          text: taKey + "<br>" + BREAK.threatActors[taKey as keyof typeof BREAK.threatActors].title,
          color: "red",
        });
      }
    });

    let lines = nodes.map((node) => {
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
      text: props.rKey + "<br>" + BREAK.risks[props.rKey as keyof typeof BREAK.risks].title,
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
    style="border: #efefef solid 1px; height: calc(60vh); width: 100%"
    @dblclick="$router.push({ name: 'relation', params: { type: 'risk', key: rKey } })"
    id="relation-graph-pane"
    :title="$t('more')"
  >
    <relation-graph ref="graphRef$" :options="graphOptions" />
  </div>
</template>

<style scoped></style>
