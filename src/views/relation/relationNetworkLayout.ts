import type { Ref } from "vue";
import {
  RelationType,
  type GraphLink,
  type GraphNode,
  type Line,
  type NetworkLayoutMode,
  type Node,
  networkLabelMaxLineLength,
  networkNodeSize,
  networkRootNodeSize,
} from "@/views/relation/relationTypes";

interface CreateNetworkDataHelpersOptions {
  nodes: Node[];
  lines: Line[];
  relKey: Ref<string>;
  selectedNetworkNodeId: Ref<string>;
  filterRelationType: Ref<string[]>;
  filterSubNode: Ref<boolean>;
  filterLineType: Ref<string[]>;
  draggedNodePositions: Ref<Record<string, { x: number; y: number }>>;
  networkState: { layout: NetworkLayoutMode };
  relationLegendItems: Ref<{ color: string; label: string }[]>;
  isDark: Ref<boolean>;
  wrapLabelText: (text: string, maxLineLength?: number) => string;
  getGraphColor: (key: "line" | "nodeText" | "subNodeFill" | "selectedNodeBorder" | "subNodeBorder" | "nodeBorder" | "selectedNodeGlow") => string;
  getRelationSourceFields: (line: Line) => string[];
  findNodeById: (id: string) => Node | undefined;
}

const networkNodeSortOrder: Record<string, number> = {
  [RelationType.threatActor]: 0,
  [RelationType.attackTool]: 1,
  [RelationType.risk]: 2,
  [RelationType.avoidance]: 3,
};

const normalizeGraphText = (text: string) => text.replace(/<br\s*\/?>/gi, "\n");

export const createNetworkDataHelpers = ({
  nodes,
  lines,
  relKey,
  selectedNetworkNodeId,
  filterRelationType,
  filterSubNode,
  filterLineType,
  draggedNodePositions,
  networkState,
  relationLegendItems,
  isDark,
  wrapLabelText,
  getGraphColor,
  getRelationSourceFields,
  findNodeById,
}: CreateNetworkDataHelpersOptions) => {
  const createGraphNode = (
    node: Node,
    x: number,
    y: number,
    symbolSize = networkNodeSize
  ): GraphNode => {
    const text = normalizeGraphText(node.text);
    const isSelected = node.id === selectedNetworkNodeId.value;
    const isSubNode = Boolean(node.data?.isSubNode);
    const draggedPosition = draggedNodePositions.value[node.id];
    return {
      id: node.id,
      name: node.id,
      type: node.type,
      text,
      labelText: wrapLabelText(text, networkLabelMaxLineLength),
      symbolSize: isSelected ? symbolSize + 10 : symbolSize,
      itemStyle: {
        color: isSubNode ? getGraphColor("subNodeFill") : node.color,
        borderColor: isSelected
          ? getGraphColor("selectedNodeBorder")
          : isSubNode
            ? getGraphColor("subNodeBorder")
            : getGraphColor("nodeBorder"),
        borderWidth: isSelected ? 3 : 1,
        shadowBlur: isSelected ? 18 : 0,
        shadowColor: isSelected ? getGraphColor("selectedNodeGlow") : "transparent",
      },
      label: {
        color: getGraphColor("nodeText"),
        fontSize: isSelected ? 9 : 8,
        fontWeight: isSelected ? 700 : 500,
      },
      data: node.data,
      fixed: true,
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
    } as Record<Exclude<RelationType, RelationType.all>, Node[]>);

  const placeGridNodes = (
    graphNodes: GraphNode[],
    group: Node[],
    layout: { x: number; y: number; columns: number; columnGap?: number; rowGap?: number }
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
          layout.y + row * rowGap - height / 2
        )
      );
    });
  };

  const applyHorizontalNetworkLayout = (
    graphNodes: GraphNode[],
    groupedNodes: Record<Exclude<RelationType, RelationType.all>, Node[]>
  ) => {
    const groupLayout: Record<
      Exclude<RelationType, RelationType.all>,
      { x: number; y: number; columns: number; columnGap?: number; rowGap?: number }
    > = {
      [RelationType.threatActor]: { x: -720, y: -170, columns: 3, columnGap: 118, rowGap: 100 },
      [RelationType.attackTool]: { x: -340, y: 190, columns: 4, columnGap: 116, rowGap: 100 },
      [RelationType.risk]: { x: 280, y: -170, columns: 4, columnGap: 116, rowGap: 100 },
      [RelationType.avoidance]: { x: 720, y: 180, columns: 4, columnGap: 116, rowGap: 100 },
    };

    Object.entries(groupLayout).forEach(([type, layout]) => {
      placeGridNodes(
        graphNodes,
        groupedNodes[type as Exclude<RelationType, RelationType.all>],
        layout
      );
    });
  };

  const applyLaneNetworkLayout = (
    graphNodes: GraphNode[],
    groupedNodes: Record<Exclude<RelationType, RelationType.all>, Node[]>
  ) => {
    const groupLayout: Record<
      Exclude<RelationType, RelationType.all>,
      { x: number; y: number; columns: number; columnGap?: number; rowGap?: number }
    > = {
      [RelationType.threatActor]: { x: 0, y: -440, columns: 8, columnGap: 116, rowGap: 92 },
      [RelationType.attackTool]: { x: 0, y: -165, columns: 8, columnGap: 116, rowGap: 92 },
      [RelationType.risk]: { x: 0, y: 165, columns: 8, columnGap: 116, rowGap: 92 },
      [RelationType.avoidance]: { x: 0, y: 440, columns: 8, columnGap: 116, rowGap: 92 },
    };

    Object.entries(groupLayout).forEach(([type, layout]) => {
      placeGridNodes(
        graphNodes,
        groupedNodes[type as Exclude<RelationType, RelationType.all>],
        layout
      );
    });
  };

  const applySplitNetworkLayout = (
    graphNodes: GraphNode[],
    groupedNodes: Record<Exclude<RelationType, RelationType.all>, Node[]>
  ) => {
    const groupLayout: Record<
      Exclude<RelationType, RelationType.all>,
      { x: number; y: number; columns: number; columnGap?: number; rowGap?: number }
    > = {
      [RelationType.threatActor]: { x: -520, y: -245, columns: 4, columnGap: 112, rowGap: 98 },
      [RelationType.attackTool]: { x: -520, y: 245, columns: 4, columnGap: 112, rowGap: 98 },
      [RelationType.risk]: { x: 520, y: -245, columns: 4, columnGap: 112, rowGap: 98 },
      [RelationType.avoidance]: { x: 520, y: 245, columns: 4, columnGap: 112, rowGap: 98 },
    };

    Object.entries(groupLayout).forEach(([type, layout]) => {
      placeGridNodes(
        graphNodes,
        groupedNodes[type as Exclude<RelationType, RelationType.all>],
        layout
      );
    });
  };

  const placeRadialGroupNodes = (
    graphNodes: GraphNode[],
    group: Node[],
    options: { startAngle: number; endAngle: number; radius: number; innerRadius?: number }
  ) => {
    if (group.length === 0) return;

    const angleSpan = options.endAngle - options.startAngle;
    const useInnerRing = group.length > 7;
    group.forEach((node, index) => {
      const ring = useInnerRing && index % 2 === 1 ? options.innerRadius ?? options.radius - 130 : options.radius;
      const angleIndex = useInnerRing ? Math.floor(index / 2) : index;
      const angleCount = useInnerRing ? Math.ceil(group.length / 2) : group.length;
      const angle =
        options.startAngle +
        (angleSpan * (angleIndex + 0.5)) / Math.max(1, angleCount);
      graphNodes.push(createGraphNode(node, Math.cos(angle) * ring, Math.sin(angle) * ring));
    });
  };

  const applyRadialNetworkLayout = (
    graphNodes: GraphNode[],
    groupedNodes: Record<Exclude<RelationType, RelationType.all>, Node[]>
  ) => {
    placeRadialGroupNodes(graphNodes, groupedNodes[RelationType.threatActor], {
      startAngle: -Math.PI * 0.95,
      endAngle: -Math.PI * 0.55,
      radius: 650,
    });
    placeRadialGroupNodes(graphNodes, groupedNodes[RelationType.attackTool], {
      startAngle: -Math.PI * 0.45,
      endAngle: -Math.PI * 0.05,
      radius: 520,
    });
    placeRadialGroupNodes(graphNodes, groupedNodes[RelationType.risk], {
      startAngle: Math.PI * 0.05,
      endAngle: Math.PI * 0.45,
      radius: 520,
    });
    placeRadialGroupNodes(graphNodes, groupedNodes[RelationType.avoidance], {
      startAngle: Math.PI * 0.55,
      endAngle: Math.PI * 0.95,
      radius: 650,
    });
  };

  const applyNetworkLayout = (
    graphNodes: GraphNode[],
    groupedNodes: Record<Exclude<RelationType, RelationType.all>, Node[]>
  ) => {
    switch (networkState.layout) {
      case "lanes":
        applyLaneNetworkLayout(graphNodes, groupedNodes);
        break;
      case "split":
        applySplitNetworkLayout(graphNodes, groupedNodes);
        break;
      case "radial":
        applyRadialNetworkLayout(graphNodes, groupedNodes);
        break;
      case "horizontal":
      default:
        applyHorizontalNetworkLayout(graphNodes, groupedNodes);
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
    const visibleNodeKeys = new Set<string>();
    const visibleNodes: Node[] = [];
    const linkMap = new Map<string, GraphLink>();

    nodes.forEach((node) => {
      const isSubNode = node.data?.isSubNode;
      if (
        !filterRelationType.value.includes(node.type) ||
        (isSubNode && !filterSubNode.value)
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
          (networkNodeSortOrder[a.type] ?? 99) - (networkNodeSortOrder[b.type] ?? 99);
        return orderDiff || a.id.localeCompare(b.id);
      })
      .reduce<Record<Exclude<RelationType, RelationType.all>, Node[]>>((groups, node) => {
        groups[node.type as Exclude<RelationType, RelationType.all>].push(node);
        return groups;
      }, createEmptyGroupedNodes());

    const graphNodes: GraphNode[] = [];
    if (rootNode) {
      graphNodes.push(createGraphNode(rootNode, 0, 0, networkRootNodeSize));
    }
    applyNetworkLayout(graphNodes, groupedNodes);

    lines.forEach((line) => {
      if (!filterLineType.value.includes(line.text)) return;
      if (!visibleNodeKeys.has(line.from) || !visibleNodeKeys.has(line.to)) return;
      if (!findNodeById(line.from) || !findNodeById(line.to)) return;

      const linkKey = `${line.from}->${line.to}->${line.text}`;
      if (!linkMap.has(linkKey)) {
        const legendItem = relationLegendItems.value.find((item) => item.label === line.text);
        linkMap.set(linkKey, {
          source: line.from,
          target: line.to,
          text: line.text,
          sourceFields: getRelationSourceFields(line),
          lineStyle: {
            color: legendItem?.color ?? getGraphColor("line"),
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
