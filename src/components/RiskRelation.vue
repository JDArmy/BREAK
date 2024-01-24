<script setup lang="ts">
  import { onMounted, ref, watch } from "vue";
  import BREAK from "@/BREAK";

  import RelationGraph, { type RGJsonData, type RGOptions } from "relation-graph/vue3";

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
  onMounted(() => {
    setJsonData();
  });

  const setJsonData = () => {
    const rootId = props.rKey;
    // 将avoidances加入nodes
    const nodes = BREAK.risks[props.rKey as keyof typeof BREAK.risks].avoidances.map(
      (avoidanceKey) => {
        return {
          id: avoidanceKey,
          text:
            avoidanceKey +
            "<br>" +
            BREAK.avoidances[avoidanceKey as keyof typeof BREAK.avoidances].title,
          color: "green",
        };
      }
    );
    // 将attackTools加入nodes
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

    const lines = nodes.map((node) => {
      return {
        from: node.id,
        to: rootId,
      };
    });
    // 将avoidances和attackTools之间的关系加入lines
    BREAK.risks[props.rKey as keyof typeof BREAK.risks].avoidances.forEach((avoidanceKey) => {
      Object.keys(BREAK.attackTools).forEach((atKey) => {
        if (
          BREAK.attackTools[atKey as keyof typeof BREAK.attackTools].risks.includes(
            props.rKey as never
          ) &&
          BREAK.attackTools[atKey as keyof typeof BREAK.attackTools].avoidances.includes(
            avoidanceKey
          )
        ) {
          lines.push({
            from: avoidanceKey,
            to: atKey,
          });
        }
      });
    });

    // 将Root节点加入nodes
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
    console.log(jsonData);

    graphRef$?.value?.setJsonData(jsonData);
  };
</script>

<template>
  <!-- 关系图 -->
  <div style="border: #efefef solid 1px; height: calc(60vh); width: 100%; cursor: pointer">
    <relation-graph ref="graphRef$" :options="graphOptions" />
  </div>
</template>
