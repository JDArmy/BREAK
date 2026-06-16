import { computed, ref, type Ref } from "vue";
import BREAK from "@/BREAK";
import { createAttackToolRelationBuilder } from "@/views/relation/relationGraphAttackToolBuilder";
import { createAvoidanceRelationBuilder } from "@/views/relation/relationGraphAvoidanceBuilder";
import {
  type RelationGraphBuilderContext,
  type Translate,
} from "@/views/relation/relationGraphBuilderShared";
import { logRelationPerf, measureRelationPerf, relationPerfNow } from "@/views/relation/relationPerf";
import { createRiskRelationBuilder } from "@/views/relation/relationGraphRiskBuilder";
import { createTermRelationBuilder } from "@/views/relation/relationGraphTermBuilder";
import { createThreatActorRelationBuilder } from "@/views/relation/relationGraphThreatActorBuilder";
import { createRelationTypeMapping, type Line, type Node, RelationType } from "@/views/relation/relationTypes";

interface CreateRelationGraphBuilderOptions {
  t: Translate;
  relType: Ref<RelationType>;
  relKey: Ref<string>;
  nodes: Node[];
  lines: Line[];
  jsonData: { rootId: string };
  selectedNetworkNodeId: Ref<string>;
  RelationTypeMapping: ReturnType<typeof createRelationTypeMapping>;
  relationLegendItems: Ref<{ color: string; label: string; fields: string[] }[]>;
  getGraphNodeText: (type: Exclude<RelationType, RelationType.all>, key: string) => string;
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
  const totalLineType = ref([] as string[]);
  const filterLineType = ref(totalLineType.value);

  const getLineType = () => {
    totalLineType.value.splice(0, totalLineType.value.length);
    lines.forEach((line) => {
      if (!totalLineType.value.includes(line.text)) {
        totalLineType.value.push(line.text);
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
    relationLegendItems.value.filter((item) => totalLineType.value.includes(item.label))
  );

  const setNetworkGraphData = (options?: { render?: boolean }) => {
    const startedAt = relationPerfNow();
    const before = {
      rawNodes: nodes.length,
      rawLines: lines.length,
    };
    uniqNodes();
    uniqLines();
    getLineType();
    measureRelationPerf("set network graph data prepared", startedAt, {
      ...before,
      nodes: nodes.length,
      lines: lines.length,
      lineTypes: totalLineType.value.length,
    });
    if (options?.render !== false) {
      const renderStartedAt = relationPerfNow();
      renderNetworkChart();
      measureRelationPerf("set network graph data render requested", renderStartedAt, {
        nodes: nodes.length,
        lines: lines.length,
      });
    }
  };

  const draggedNodePositions = ref<Record<string, { x: number; y: number }>>({});

  const clearDraggedNodePositions = () => {
    draggedNodePositions.value = {};
  };

  const addRootNode = () => {
    const breakItemAttr =
      RelationTypeMapping[relType.value as keyof typeof RelationTypeMapping];
    const items = BREAK[breakItemAttr.BreakKey as keyof typeof BREAK];
    const item = items[relKey.value as keyof typeof items] as { title: string };
    if (item === undefined) {
      alert(t("unknownId"));
      return;
    }

    nodes.push({
      id: relKey.value,
      type: breakItemAttr.relType,
      text: getGraphNodeText(breakItemAttr.relType, relKey.value),
      color: "",
    } as Node);
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

  function rebuildGraphData() {
    jsonData.rootId = relKey.value;
    selectedNetworkNodeId.value = relKey.value;
    clearDraggedNodePositions();
    nodes.splice(0, nodes.length);
    lines.splice(0, lines.length);
    addRootNode();
    genNetworkGraphData(RelationType.all, relType.value, relKey.value);
  }

  const genNetworkGraphData = (
    reqType: RelationType,
    currentNodeType: RelationType,
    currentNodeId: string,
    options?: { render?: boolean }
  ) => {
    const startedAt = relationPerfNow();
    logRelationPerf("gen network graph data start", {
      reqType,
      currentNodeType,
      currentNodeId,
      beforeNodes: nodes.length,
      beforeLines: lines.length,
    });
    if (currentNodeType === RelationType.risk) {
      if (reqType == RelationType.avoidance) {
        riskBuilder.addAvoidance(currentNodeId);
      } else if (reqType == RelationType.attackTool) {
        riskBuilder.addAttackTool(currentNodeId);
      } else if (reqType == RelationType.threatActor) {
        riskBuilder.addThreatActor(currentNodeId);
      } else if (reqType == RelationType.term) {
        riskBuilder.addTerm(currentNodeId);
      } else if (reqType == RelationType.all) {
        riskBuilder.addAvoidance(currentNodeId);
        riskBuilder.addAttackTool(currentNodeId);
        riskBuilder.addAvoidanceAttackToolRelation(currentNodeId);
        riskBuilder.addThreatActor(currentNodeId);
        riskBuilder.addThreatActorAttackToolRelation(currentNodeId);
        riskBuilder.addSubrisk(currentNodeId);
        riskBuilder.addTerm(currentNodeId);
      }
    } else if (currentNodeType === RelationType.avoidance) {
      if (reqType == RelationType.risk) {
        avoidanceBuilder.addRisk(currentNodeId);
      } else if (reqType == RelationType.term) {
        avoidanceBuilder.addTerm(currentNodeId);
      }
      if (reqType == RelationType.all) {
        avoidanceBuilder.addRisk(currentNodeId);
        avoidanceBuilder.addSubavoidance(currentNodeId);
        avoidanceBuilder.addTerm(currentNodeId);
      }
    } else if (currentNodeType === RelationType.attackTool) {
      if (reqType == RelationType.risk) {
        attackToolBuilder.addRisk(currentNodeId);
      } else if (reqType == RelationType.avoidance) {
        attackToolBuilder.addAvoidance(currentNodeId);
      } else if (reqType == RelationType.threatActor) {
        attackToolBuilder.addThreatActor(currentNodeId);
      } else if (reqType == RelationType.term) {
        attackToolBuilder.addTerm(currentNodeId);
      } else if (reqType == RelationType.all) {
        attackToolBuilder.addRisk(currentNodeId);
        attackToolBuilder.addAvoidance(currentNodeId);
        attackToolBuilder.addRiskAvoidanceRelation(currentNodeId);
        attackToolBuilder.addThreatActor(currentNodeId);
        attackToolBuilder.addThreatActorRiskRelation(currentNodeId);
        attackToolBuilder.addSubattackTool(currentNodeId);
        attackToolBuilder.addTerm(currentNodeId);
      }
    } else if (currentNodeType === RelationType.threatActor) {
      if (reqType == RelationType.risk) {
        threatActorBuilder.addRisk(currentNodeId);
      } else if (reqType == RelationType.attackTool) {
        threatActorBuilder.addAttackTool(currentNodeId);
      } else if (reqType == RelationType.term) {
        threatActorBuilder.addTerm(currentNodeId);
      } else if (reqType == RelationType.all) {
        threatActorBuilder.addRisk(currentNodeId);
        threatActorBuilder.addAttackTool(currentNodeId);
        threatActorBuilder.addAttackToolRiskRelation(currentNodeId);
        threatActorBuilder.addSubthreatActor(currentNodeId);
        threatActorBuilder.addTerm(currentNodeId);
      }
    } else if (currentNodeType === RelationType.term) {
      if (reqType == RelationType.all) {
        termBuilder.addRelatedEntities(currentNodeId);
      } else if (reqType == RelationType.risk || reqType == RelationType.avoidance || reqType == RelationType.attackTool || reqType == RelationType.threatActor) {
        termBuilder.addRelatedEntities(currentNodeId);
      }
    }
    setNetworkGraphData(options);
    measureRelationPerf("gen network graph data end", startedAt, {
      reqType,
      currentNodeType,
      currentNodeId,
      nodes: nodes.length,
      lines: lines.length,
    });
  };

  return {
    addRootNode,
    clearDraggedNodePositions,
    draggedNodePositions,
    filterLineType,
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
