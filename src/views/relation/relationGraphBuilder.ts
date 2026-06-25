import { computed, ref, type Ref } from "vue";
import { ElMessage } from "element-plus";
import BREAK from "@/BREAK";
import { createAttackToolRelationBuilder } from "@/views/relation/relationGraphAttackToolBuilder";
import { createAvoidanceRelationBuilder } from "@/views/relation/relationGraphAvoidanceBuilder";
import {
  type RelationGraphBuilderContext,
  type Translate,
} from "@/views/relation/relationGraphBuilderShared";
import { createRiskRelationBuilder } from "@/views/relation/relationGraphRiskBuilder";
import { createTermRelationBuilder } from "@/views/relation/relationGraphTermBuilder";
import { createThreatActorRelationBuilder } from "@/views/relation/relationGraphThreatActorBuilder";
import { createRelationGraphRequestDispatcher } from "@/views/relation/relationGraphRequestDispatcher";
import {
  createRelationTypeMapping,
  getRelationLineKey,
  RelationType,
  type Line,
  type Node,
  type RelationEntityType,
} from "@/views/relation/relationTypes";

interface CreateRelationGraphBuilderOptions {
  t: Translate;
  relType: Ref<RelationType>;
  relKey: Ref<string>;
  nodes: Node[];
  lines: Line[];
  jsonData: { rootId: string };
  selectedNetworkNodeId: Ref<string>;
  RelationTypeMapping: ReturnType<typeof createRelationTypeMapping>;
  relationLegendItems: Ref<
    { key?: string; color: string; label: string; fields: string[] }[]
  >;
  getGraphNodeText: (type: RelationEntityType, key: string) => string;
  renderNetworkChart: (notMerge?: boolean) => void;
}

export const createRelationGraphBuilder = ({
  t,
  relType,
  relKey,
  nodes,
  lines,
  jsonData,
  selectedNetworkNodeId,
  RelationTypeMapping,
  relationLegendItems,
  getGraphNodeText,
  renderNetworkChart,
}: CreateRelationGraphBuilderOptions) => {
  const filterRelationType = ref([
    RelationType.risk,
    RelationType.avoidance,
    RelationType.attackTool,
    RelationType.threatActor,
    RelationType.term,
  ] as string[]);

  const filterSubNode = ref(true);
  const filterRelatedEntity = ref(true);
  const totalLineType = ref([] as string[]);
  const filterLineType = ref(totalLineType.value);

  const getLineType = () => {
    totalLineType.value.splice(0, totalLineType.value.length);
    lines.forEach((line) => {
      const lineKey = getRelationLineKey(line);
      if (!totalLineType.value.includes(lineKey)) {
        totalLineType.value.push(lineKey);
      }
    });
    totalLineType.value.forEach((lineType) => {
      if (!filterLineType.value.includes(lineType)) {
        filterLineType.value.push(lineType);
      }
    });
  };

  const uniqLines = () => {
    const linesSet = new Set<string>();
    lines.forEach((line) => {
      linesSet.add(JSON.stringify(line));
    });
    lines.splice(0, lines.length);
    linesSet.forEach((line) => {
      lines.push(JSON.parse(line) as Line);
    });
  };

  const uniqNodes = () => {
    const nodeMap = new Map<string, Node>();
    nodes.forEach((node) => {
      if (!nodeMap.has(node.id)) {
        nodeMap.set(node.id, node);
      }
    });
    nodes.splice(0, nodes.length, ...nodeMap.values());
  };

  const visibleRelationLegendItems = computed(() =>
    relationLegendItems.value.filter((item) =>
      totalLineType.value.includes(item.key ?? item.label),
    ),
  );

  const setNetworkGraphData = (options?: { render?: boolean }) => {
    uniqNodes();
    uniqLines();
    getLineType();
    if (options?.render !== false) {
      renderNetworkChart();
    }
  };

  const draggedNodePositions = ref<Record<string, { x: number; y: number }>>(
    {},
  );

  const clearDraggedNodePositions = () => {
    draggedNodePositions.value = {};
  };

  const addRootNode = (): boolean => {
    const breakItemAttr =
      RelationTypeMapping[relType.value as keyof typeof RelationTypeMapping];
    const items = BREAK[breakItemAttr.BreakKey as keyof typeof BREAK];
    const item = items[relKey.value as keyof typeof items] as { title: string };
    if (item === undefined) {
      ElMessage({
        message: t("unknownId"),
        type: "warning",
        plain: true,
        duration: 2200,
        grouping: true,
      });
      return false;
    }

    nodes.push({
      id: relKey.value,
      type: breakItemAttr.relType as RelationEntityType,
      text: getGraphNodeText(breakItemAttr.relType as RelationEntityType, relKey.value),
      color: "",
    } as Node);
    return true;
  };

  const builderContext: RelationGraphBuilderContext = {
    t,
    nodes,
    lines,
    RelationTypeMapping,
    getGraphNodeText,
  };
  const riskBuilder = createRiskRelationBuilder(builderContext);
  const avoidanceBuilder = createAvoidanceRelationBuilder(builderContext);
  const attackToolBuilder = createAttackToolRelationBuilder(builderContext);
  const threatActorBuilder = createThreatActorRelationBuilder(builderContext);
  const termBuilder = createTermRelationBuilder(builderContext);
  const requestDispatcher = createRelationGraphRequestDispatcher({
    attackToolBuilder,
    avoidanceBuilder,
    riskBuilder,
    termBuilder,
    threatActorBuilder,
  });

  function rebuildGraphData(options?: { render?: boolean }) {
    jsonData.rootId = relKey.value;
    selectedNetworkNodeId.value = relKey.value;
    clearDraggedNodePositions();
    totalLineType.value.splice(0, totalLineType.value.length);
    nodes.splice(0, nodes.length);
    lines.splice(0, lines.length);
    const success = addRootNode();
    if (!success) return;
    genNetworkGraphData(RelationType.all, relType.value, relKey.value, options);
  }

  const genNetworkGraphData = (
    reqType: RelationType,
    currentNodeType: RelationType,
    currentNodeId: string,
    options?: { render?: boolean },
  ) => {
    requestDispatcher.dispatch(reqType, currentNodeType, currentNodeId);
    setNetworkGraphData(options);
  };

  return {
    addRootNode,
    clearDraggedNodePositions,
    draggedNodePositions,
    filterLineType,
    filterRelatedEntity,
    filterRelationType,
    filterSubNode,
    getLineType,
    genNetworkGraphData,
    rebuildGraphData,
    totalLineType,
    uniqLines,
    uniqNodes,
    visibleRelationLegendItems,
  };
};
