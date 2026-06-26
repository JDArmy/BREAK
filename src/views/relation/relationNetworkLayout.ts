import type { Ref } from "vue";
import {
  RelationType,
  getRelationLineKey,
  relationEntityTypes,
  type GraphLink,
  type GraphNode,
  type Line,
  type NetworkLayoutMode,
  type Node,
  type RelationEntityType,
  networkLabelMaxLineLength,
  networkNodeSize,
  networkRootNodeSize,
} from "@/views/relation/relationTypes";
import { entityRegistry, type EntityRegistryEntry } from "@/BREAK/entityRegistry";

interface CreateNetworkDataHelpersOptions {
  nodes: Node[];
  lines: Line[];
  relKey: Ref<string>;
  selectedNetworkNodeId: Ref<string>;
  filterRelationType: Ref<string[]>;
  filterSubNode: Ref<boolean>;
  filterRelatedEntity: Ref<boolean>;
  filterLineType: Ref<string[]>;
  draggedNodePositions: Ref<Record<string, { x: number; y: number }>>;
  networkState: { layout: NetworkLayoutMode };
  relationLegendItems: Ref<{ key?: string; color: string; label: string }[]>;
  isDark: Ref<boolean>;
  getRelationTypeColor: (type: RelationEntityType) => string;
  wrapLabelText: (text: string, maxLineLength?: number) => string;
  getGraphColor: (
    key:
      | "line"
      | "nodeText"
      | "subNodeFill"
      | "selectedNodeBorder"
      | "subNodeBorder"
      | "nodeBorder"
      | "selectedNodeGlow",
  ) => string;
  getRelationSourceFields: (
    line: Line,
    fromType?: string,
    toType?: string,
  ) => string[];
  explainRelation: (
    line: Line,
    fromType?: string,
    toType?: string,
  ) => GraphLink["explanation"];
  formatEvidenceLevel: (level: string) => string;
  getNodeTypeTitle: (type: string) => string;
}

const networkNodeSortOrder: Record<string, number> = {
  [RelationType.threatActor]: 0,
  [RelationType.attackTool]: 1,
  [RelationType.risk]: 2,
  [RelationType.avoidance]: 3,
  [RelationType.term]: 4,
};

const normalizeGraphText = (text: string) => text.replace(/<br\s*\/?>/gi, "\n");

/** 子编号 ID 正则（从 entityRegistry 派生，只含有 childIdPattern 的类型） */
const entityChildIdPatterns: Partial<Record<RelationEntityType, RegExp>> =
  Object.fromEntries(
    entityRegistry
      .filter((e): e is EntityRegistryEntry & { childIdPattern: RegExp } => !!e.childIdPattern)
      .map((e) => [e.relationKey, e.childIdPattern]),
  ) as Partial<Record<RelationEntityType, RegExp>>;

const getEntityParentId = (node: Node) => {
  const childMatch = entityChildIdPatterns[node.type]?.exec(node.id);
  return childMatch ? node.id.split("-")[0] : undefined;
};

interface NetworkGraphStyleContext {
  lineColor: string;
  nodeTextColor: string;
  nodeBorderColor: string;
  selectedNodeBorderColor: string;
  selectedNodeGlowColor: string;
  subNodeFillColor: string;
  subNodeBorderColor: string;
  relationTypeColors: Partial<Record<RelationEntityType, string>>;
}

export const createNetworkDataHelpers = ({
  nodes,
  lines,
  relKey,
  selectedNetworkNodeId,
  filterRelationType,
  filterSubNode,
  filterRelatedEntity,
  filterLineType,
  draggedNodePositions,
  networkState,
  relationLegendItems,
  isDark,
  getRelationTypeColor,
  wrapLabelText,
  getGraphColor,
  getRelationSourceFields,
  explainRelation,
  formatEvidenceLevel,
  getNodeTypeTitle,
}: CreateNetworkDataHelpersOptions) => {
  const isSubNodeLike = (node: Node) =>
    Boolean(node.data?.isSubNode) ||
    (node.id !== relKey.value &&
      Boolean(getEntityParentId(node)));

  const isForeignChildNode = (node: Node) => {
    if (node.data?.isSubNode) return false;
    const parentId = getEntityParentId(node);
    return Boolean(
      parentId && node.id !== relKey.value && parentId !== relKey.value,
    );
  };

  const createGraphNode = (
    node: Node,
    x: number,
    y: number,
    styleContext: NetworkGraphStyleContext,
    symbolSize = networkNodeSize,
  ): GraphNode => {
    const text = normalizeGraphText(node.text);
    const isSelected = node.id === selectedNetworkNodeId.value;
    const isSubNode = isSubNodeLike(node);
    const draggedPosition = draggedNodePositions.value[node.id];
    const baseColor =
      styleContext.relationTypeColors[node.type] ??
      getRelationTypeColor(node.type);
    return {
      id: node.id,
      name: node.id,
      type: node.type,
      text,
      labelText: wrapLabelText(text, networkLabelMaxLineLength),
      symbolSize: isSelected ? symbolSize + 10 : symbolSize,
      itemStyle: {
        color: isSubNode ? styleContext.subNodeFillColor : baseColor,
        borderColor: isSelected
          ? styleContext.selectedNodeBorderColor
          : isSubNode
            ? styleContext.subNodeBorderColor
            : styleContext.nodeBorderColor,
        borderWidth: isSelected ? 3 : 1,
        shadowBlur: isSelected ? 18 : 0,
        shadowColor: isSelected
          ? styleContext.selectedNodeGlowColor
          : "transparent",
      },
      label: {
        color: styleContext.nodeTextColor,
        fontSize: isSelected ? 9 : 8,
        fontWeight: isSelected ? 700 : 500,
      },
      data: node.data,
      fixed: networkState.layout === "force" ? Boolean(draggedPosition) : true,
      x: draggedPosition?.x ?? x,
      y: draggedPosition?.y ?? y,
    };
  };

  const createEmptyGroupedNodes = () =>
    ({
      [RelationType.threatActor]: [],
      [RelationType.attackTool]: [],
      [RelationType.risk]: [],
      [RelationType.avoidance]: [],
      [RelationType.term]: [],
    }) as Record<RelationEntityType, Node[]>;

  const placeGridNodes = (
    graphNodes: GraphNode[],
    group: Node[],
    layout: {
      x: number;
      y: number;
      columns: number;
      columnGap?: number;
      rowGap?: number;
    },
    styleContext: NetworkGraphStyleContext,
  ) => {
    if (group.length === 0) return;

    const columnGap = layout.columnGap ?? 112;
    const rowGap = layout.rowGap ?? 96;
    const columns = Math.max(1, Math.min(layout.columns, group.length));
    const rowCount = Math.ceil(group.length / columns);
    const width = (columns - 1) * columnGap;
    const height = (rowCount - 1) * rowGap;

    group.forEach((node, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      graphNodes.push(
        createGraphNode(
          node,
          layout.x + column * columnGap - width / 2,
          layout.y + row * rowGap - height / 2,
          styleContext,
        ),
      );
    });
  };

  const applyHorizontalNetworkLayout = (
    graphNodes: GraphNode[],
    groupedNodes: Record<RelationEntityType, Node[]>,
    styleContext: NetworkGraphStyleContext,
  ) => {
    const groupLayout: Record<
      RelationEntityType,
      {
        x: number;
        y: number;
        columns: number;
        columnGap?: number;
        rowGap?: number;
      }
    > = {
      [RelationType.threatActor]: {
        x: -720,
        y: -170,
        columns: 3,
        columnGap: 118,
        rowGap: 100,
      },
      [RelationType.attackTool]: {
        x: -340,
        y: 190,
        columns: 4,
        columnGap: 116,
        rowGap: 100,
      },
      [RelationType.risk]: {
        x: 280,
        y: -170,
        columns: 4,
        columnGap: 116,
        rowGap: 100,
      },
      [RelationType.avoidance]: {
        x: 720,
        y: 180,
        columns: 4,
        columnGap: 116,
        rowGap: 100,
      },
      [RelationType.term]: {
        x: 0,
        y: 470,
        columns: 6,
        columnGap: 116,
        rowGap: 92,
      },
    };

    relationEntityTypes.forEach((type) => {
      const layout = groupLayout[type];
      placeGridNodes(graphNodes, groupedNodes[type], layout, styleContext);
    });
  };

  const applyLaneNetworkLayout = (
    graphNodes: GraphNode[],
    groupedNodes: Record<RelationEntityType, Node[]>,
    styleContext: NetworkGraphStyleContext,
  ) => {
    const groupLayout: Record<
      RelationEntityType,
      {
        x: number;
        y: number;
        columns: number;
        columnGap?: number;
        rowGap?: number;
      }
    > = {
      [RelationType.threatActor]: {
        x: 0,
        y: -440,
        columns: 8,
        columnGap: 116,
        rowGap: 92,
      },
      [RelationType.attackTool]: {
        x: 0,
        y: -165,
        columns: 8,
        columnGap: 116,
        rowGap: 92,
      },
      [RelationType.risk]: {
        x: 0,
        y: 165,
        columns: 8,
        columnGap: 116,
        rowGap: 92,
      },
      [RelationType.avoidance]: {
        x: 0,
        y: 440,
        columns: 8,
        columnGap: 116,
        rowGap: 92,
      },
      [RelationType.term]: {
        x: 0,
        y: 715,
        columns: 8,
        columnGap: 116,
        rowGap: 92,
      },
    };

    relationEntityTypes.forEach((type) => {
      const layout = groupLayout[type];
      placeGridNodes(graphNodes, groupedNodes[type], layout, styleContext);
    });
  };

  const applySplitNetworkLayout = (
    graphNodes: GraphNode[],
    groupedNodes: Record<RelationEntityType, Node[]>,
    styleContext: NetworkGraphStyleContext,
  ) => {
    const groupLayout: Record<
      RelationEntityType,
      {
        x: number;
        y: number;
        columns: number;
        columnGap?: number;
        rowGap?: number;
      }
    > = {
      [RelationType.threatActor]: {
        x: -520,
        y: -245,
        columns: 4,
        columnGap: 112,
        rowGap: 98,
      },
      [RelationType.attackTool]: {
        x: -520,
        y: 245,
        columns: 4,
        columnGap: 112,
        rowGap: 98,
      },
      [RelationType.risk]: {
        x: 520,
        y: -245,
        columns: 4,
        columnGap: 112,
        rowGap: 98,
      },
      [RelationType.avoidance]: {
        x: 520,
        y: 245,
        columns: 4,
        columnGap: 112,
        rowGap: 98,
      },
      [RelationType.term]: {
        x: 0,
        y: 560,
        columns: 6,
        columnGap: 112,
        rowGap: 92,
      },
    };

    relationEntityTypes.forEach((type) => {
      const layout = groupLayout[type];
      placeGridNodes(graphNodes, groupedNodes[type], layout, styleContext);
    });
  };

  const placeRadialGroupNodes = (
    graphNodes: GraphNode[],
    group: Node[],
    options: {
      startAngle: number;
      endAngle: number;
      radius: number;
      innerRadius?: number;
    },
    styleContext: NetworkGraphStyleContext,
  ) => {
    if (group.length === 0) return;

    const angleSpan = options.endAngle - options.startAngle;
    const useInnerRing = group.length > 7;
    group.forEach((node, index) => {
      const ring =
        useInnerRing && index % 2 === 1
          ? (options.innerRadius ?? options.radius - 130)
          : options.radius;
      const angleIndex = useInnerRing ? Math.floor(index / 2) : index;
      const angleCount = useInnerRing
        ? Math.ceil(group.length / 2)
        : group.length;
      const angle =
        options.startAngle +
        (angleSpan * (angleIndex + 0.5)) / Math.max(1, angleCount);
      graphNodes.push(
        createGraphNode(
          node,
          Math.cos(angle) * ring,
          Math.sin(angle) * ring,
          styleContext,
        ),
      );
    });
  };

  const applyRadialNetworkLayout = (
    graphNodes: GraphNode[],
    groupedNodes: Record<RelationEntityType, Node[]>,
    styleContext: NetworkGraphStyleContext,
  ) => {
    placeRadialGroupNodes(
      graphNodes,
      groupedNodes[RelationType.threatActor],
      {
        startAngle: -Math.PI * 0.95,
        endAngle: -Math.PI * 0.55,
        radius: 650,
      },
      styleContext,
    );
    placeRadialGroupNodes(
      graphNodes,
      groupedNodes[RelationType.attackTool],
      {
        startAngle: -Math.PI * 0.45,
        endAngle: -Math.PI * 0.05,
        radius: 520,
      },
      styleContext,
    );
    placeRadialGroupNodes(
      graphNodes,
      groupedNodes[RelationType.risk],
      {
        startAngle: Math.PI * 0.05,
        endAngle: Math.PI * 0.45,
        radius: 520,
      },
      styleContext,
    );
    placeRadialGroupNodes(
      graphNodes,
      groupedNodes[RelationType.avoidance],
      {
        startAngle: Math.PI * 0.55,
        endAngle: Math.PI * 0.95,
        radius: 650,
      },
      styleContext,
    );
    placeRadialGroupNodes(
      graphNodes,
      groupedNodes[RelationType.term],
      {
        startAngle: Math.PI * 1.05,
        endAngle: Math.PI * 1.45,
        radius: 720,
        innerRadius: 580,
      },
      styleContext,
    );
  };

  const getNodeDegreeMap = () => {
    const degreeMap = new Map<string, number>();
    lines.forEach((line) => {
      degreeMap.set(line.from, (degreeMap.get(line.from) ?? 0) + 1);
      degreeMap.set(line.to, (degreeMap.get(line.to) ?? 0) + 1);
    });
    return degreeMap;
  };

  const placeForceGroupNodes = (
    graphNodes: GraphNode[],
    group: Node[],
    options: {
      startAngle: number;
      endAngle: number;
      radius: number;
    },
    styleContext: NetworkGraphStyleContext,
    nodeDegreeMap: Map<string, number>,
  ) => {
    if (group.length === 0) return;

    const angleSpan = options.endAngle - options.startAngle;
    const sortedGroup = group.slice().sort((first, second) => {
      const degreeDiff =
        (nodeDegreeMap.get(second.id) ?? 0) -
        (nodeDegreeMap.get(first.id) ?? 0);
      return degreeDiff || first.id.localeCompare(second.id);
    });

    sortedGroup.forEach((node, index) => {
      const degree = nodeDegreeMap.get(node.id) ?? 0;
      const angle =
        options.startAngle +
        (angleSpan * (index + 0.5)) / Math.max(1, sortedGroup.length);
      const degreePull = Math.min(180, degree * 30);
      const alternatingSpread = index % 2 === 0 ? -36 : 36;
      const radius =
        Math.max(210, options.radius - degreePull) + alternatingSpread;

      graphNodes.push(
        createGraphNode(
          node,
          Math.cos(angle) * radius,
          Math.sin(angle) * radius,
          styleContext,
        ),
      );
    });
  };

  const applyForceNetworkLayout = (
    graphNodes: GraphNode[],
    groupedNodes: Record<RelationEntityType, Node[]>,
    styleContext: NetworkGraphStyleContext,
  ) => {
    const nodeDegreeMap = getNodeDegreeMap();
    placeForceGroupNodes(
      graphNodes,
      groupedNodes[RelationType.threatActor],
      {
        startAngle: -Math.PI * 0.9,
        endAngle: -Math.PI * 0.52,
        radius: 520,
      },
      styleContext,
      nodeDegreeMap,
    );
    placeForceGroupNodes(
      graphNodes,
      groupedNodes[RelationType.attackTool],
      {
        startAngle: -Math.PI * 0.48,
        endAngle: -Math.PI * 0.1,
        radius: 360,
      },
      styleContext,
      nodeDegreeMap,
    );
    placeForceGroupNodes(
      graphNodes,
      groupedNodes[RelationType.risk],
      {
        startAngle: Math.PI * 0.02,
        endAngle: Math.PI * 0.42,
        radius: 300,
      },
      styleContext,
      nodeDegreeMap,
    );
    placeForceGroupNodes(
      graphNodes,
      groupedNodes[RelationType.avoidance],
      {
        startAngle: Math.PI * 0.5,
        endAngle: Math.PI * 0.88,
        radius: 430,
      },
      styleContext,
      nodeDegreeMap,
    );
    placeForceGroupNodes(
      graphNodes,
      groupedNodes[RelationType.term],
      {
        startAngle: Math.PI * 1.02,
        endAngle: Math.PI * 1.4,
        radius: 560,
      },
      styleContext,
      nodeDegreeMap,
    );
  };

  const applyHierarchicalNetworkLayout = (
    graphNodes: GraphNode[],
    groupedNodes: Record<RelationEntityType, Node[]>,
    styleContext: NetworkGraphStyleContext,
  ) => {
    const groupLayout: Record<
      RelationEntityType,
      {
        x: number;
        y: number;
        columns: number;
        columnGap?: number;
        rowGap?: number;
      }
    > = {
      [RelationType.threatActor]: { x: -660, y: 0, columns: 1, rowGap: 96 },
      [RelationType.attackTool]: { x: -220, y: 0, columns: 1, rowGap: 96 },
      [RelationType.risk]: { x: 220, y: 0, columns: 1, rowGap: 96 },
      [RelationType.avoidance]: { x: 660, y: 0, columns: 1, rowGap: 96 },
      [RelationType.term]: {
        x: 0,
        y: 420,
        columns: 6,
        columnGap: 112,
        rowGap: 92,
      },
    };

    relationEntityTypes.forEach((type) => {
      const layout = groupLayout[type];
      placeGridNodes(graphNodes, groupedNodes[type], layout, styleContext);
    });
  };

  const applyNetworkLayout = (
    graphNodes: GraphNode[],
    groupedNodes: Record<RelationEntityType, Node[]>,
    styleContext: NetworkGraphStyleContext,
  ) => {
    switch (networkState.layout) {
      case "lanes":
        applyLaneNetworkLayout(graphNodes, groupedNodes, styleContext);
        break;
      case "split":
        applySplitNetworkLayout(graphNodes, groupedNodes, styleContext);
        break;
      case "radial":
        applyRadialNetworkLayout(graphNodes, groupedNodes, styleContext);
        break;
      case "hierarchical":
        applyHierarchicalNetworkLayout(graphNodes, groupedNodes, styleContext);
        break;
      case "force":
        applyForceNetworkLayout(graphNodes, groupedNodes, styleContext);
        break;
      case "horizontal":
      default:
        applyHorizontalNetworkLayout(graphNodes, groupedNodes, styleContext);
        break;
    }
  };

  const toContextNode = (node: GraphNode): Node => ({
    id: node.id,
    type: node.type,
    text: node.text,
    color: node.itemStyle.color,
    data: node.data,
  });

  const getVisibleNetworkData = () => {
    const filterLineTypeSet = new Set(filterLineType.value);
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const nodeTypeById = new Map(nodes.map((node) => [node.id, node.type]));
    const relationLegendColorByKey = new Map(
      relationLegendItems.value.map((item) => [
        item.key ?? item.label,
        item.color,
      ]),
    );
    const styleContext: NetworkGraphStyleContext = {
      lineColor: getGraphColor("line"),
      nodeTextColor: getGraphColor("nodeText"),
      nodeBorderColor: getGraphColor("nodeBorder"),
      selectedNodeBorderColor: getGraphColor("selectedNodeBorder"),
      selectedNodeGlowColor: getGraphColor("selectedNodeGlow"),
      subNodeFillColor: getGraphColor("subNodeFill"),
      subNodeBorderColor: getGraphColor("subNodeBorder"),
      relationTypeColors: {
        [RelationType.risk]: getRelationTypeColor(RelationType.risk),
        [RelationType.avoidance]: getRelationTypeColor(RelationType.avoidance),
        [RelationType.attackTool]: getRelationTypeColor(
          RelationType.attackTool,
        ),
        [RelationType.threatActor]: getRelationTypeColor(
          RelationType.threatActor,
        ),
        [RelationType.term]: getRelationTypeColor(RelationType.term),
      },
    };
    const visibleNodeKeys = new Set<string>();
    const visibleNodes: Node[] = [];
    const linkMap = new Map<string, GraphLink>();

    nodes.forEach((node) => {
      const isSubNode = isSubNodeLike(node);
      const isRelatedEntity = node.data?.isRelatedEntity;
      if (
        !filterRelationType.value.includes(node.type) ||
        isForeignChildNode(node) ||
        (isSubNode && !filterSubNode.value) ||
        (isRelatedEntity && !isSubNode && !filterRelatedEntity.value)
      ) {
        return;
      }

      visibleNodeKeys.add(node.id);
      visibleNodes.push(node);
    });

    const rootNode = visibleNodes.find((node) => node.id === relKey.value);
    const groupedNodes = visibleNodes
      .filter((node) => node.id !== relKey.value)
      .sort((a, b) => {
        const orderDiff =
          (networkNodeSortOrder[a.type] ?? 99) -
          (networkNodeSortOrder[b.type] ?? 99);
        return orderDiff || a.id.localeCompare(b.id);
      })
      .reduce<Record<RelationEntityType, Node[]>>((groups, node) => {
        groups[node.type].push(node);
        return groups;
      }, createEmptyGroupedNodes());

    const graphNodes: GraphNode[] = [];
    if (rootNode) {
      graphNodes.push(
        createGraphNode(rootNode, 0, 0, styleContext, networkRootNodeSize),
      );
    }
    applyNetworkLayout(graphNodes, groupedNodes, styleContext);

    lines.forEach((line) => {
      const lineKey = getRelationLineKey(line);
      if (!filterLineTypeSet.has(lineKey)) return;
      if (!visibleNodeKeys.has(line.from) || !visibleNodeKeys.has(line.to))
        return;
      const fromType = nodeTypeById.get(line.from);
      const toType = nodeTypeById.get(line.to);
      if (!fromType || !toType) return;
      const sourceNode = nodeById.get(line.from);
      const targetNode = nodeById.get(line.to);

      const linkKey = `${line.from}->${line.to}->${lineKey}`;
      if (!linkMap.has(linkKey)) {
        const explanation = explainRelation(line, fromType, toType);
        const sourceTitle = normalizeGraphText(
          sourceNode?.text ?? line.from,
        ).replace(/\n/g, " ");
        const targetTitle = normalizeGraphText(
          targetNode?.text ?? line.to,
        ).replace(/\n/g, " ");
        const sourceTypeTitle = getNodeTypeTitle(fromType);
        const targetTypeTitle = getNodeTypeTitle(toType);
        linkMap.set(linkKey, {
          source: line.from,
          target: line.to,
          sourceTitle,
          targetTitle,
          sourceTypeTitle,
          targetTypeTitle,
          sourceDisplay: `${sourceTypeTitle}: ${sourceTitle}`,
          targetDisplay: `${targetTypeTitle}: ${targetTitle}`,
          text: line.text,
          sourceFields: explanation.sourceFields.length
            ? explanation.sourceFields
            : getRelationSourceFields(line, fromType, toType),
          explanation,
          evidenceLabel: formatEvidenceLevel(explanation.evidenceLevel),
          lineStyle: {
            color:
              relationLegendColorByKey.get(lineKey) ?? styleContext.lineColor,
            opacity: isDark.value ? 0.42 : 0.52,
            curveness: 0.18,
          },
        });
      }
    });

    return {
      nodes: graphNodes,
      links: [...linkMap.values()],
    };
  };

  return {
    getVisibleNetworkData,
    toContextNode,
  };
};
