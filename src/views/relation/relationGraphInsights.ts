import { computed, type Ref } from "vue";
import {
  isRelationEntityType,
  type Line,
  type Node,
  type RelationType,
} from "@/views/relation/relationTypes";

type Translate = (key: string, params?: Record<string, unknown>) => string;

interface CreateRelationGraphInsightsOptions {
  t: Translate;
  relKey: Ref<string>;
  nodes: Node[];
  lines: Line[];
  selectedNetworkNodeId: Ref<string>;
  getNodeTitle: (type: Exclude<RelationType, RelationType.all>, key: string) => string;
  getNodeTypeTitle: (type: string) => string;
  getRelationPriority: (lineText: string) => number;
  isDirectRelationLine: (lineText: string) => boolean;
  getRelationSourceFields: (line: Line) => string[];
}

export const createRelationGraphInsights = ({
  t,
  relKey,
  nodes,
  lines,
  selectedNetworkNodeId,
  getNodeTitle,
  getNodeTypeTitle,
  getRelationPriority,
  isDirectRelationLine,
  getRelationSourceFields,
}: CreateRelationGraphInsightsOptions) => {
  const findNodeById = (id: string) => nodes.find((node) => node.id === id);

  const buildRelationSummary = (line: Line, nodeId: string) => {
    const otherNodeId = line.from === nodeId ? line.to : line.from;
    const otherNode = findNodeById(otherNodeId);
    return {
      relationKey: `${line.from}::${line.text}::${line.to}`,
      direction: line.from === nodeId ? t("relationView.outgoing") : t("relationView.incoming"),
      text: line.text,
      priority: getRelationPriority(line.text),
      directness: isDirectRelationLine(line.text) ? t("relationView.direct") : t("relationView.indirect"),
      otherNodeId,
      otherNodeType: otherNode ? getNodeTypeTitle(otherNode.type) : "",
      otherNodeTitle:
        otherNode && isRelationEntityType(otherNode.type) ? getNodeTitle(otherNode.type, otherNode.id) : "",
      sourceFields: getRelationSourceFields(line),
    };
  };

  const buildNodeSummary = (nodeId: string) => {
    const node = findNodeById(nodeId);
    return {
      id: nodeId,
      rawType: node?.type ?? "",
      isSubNode: Boolean(node?.data?.isSubNode),
      type: node ? getNodeTypeTitle(node.type) : "",
      title: node && isRelationEntityType(node.type) ? getNodeTitle(node.type, node.id) : "",
    };
  };

  const selectedNetworkNode = computed(() => {
    const selectedNode = nodes.find((node) => node.id === selectedNetworkNodeId.value);
    return selectedNode ?? nodes.find((node) => node.id === relKey.value) ?? null;
  });

  const selectedNetworkNodeTitle = computed(() => {
    const node = selectedNetworkNode.value;
    if (!node || !isRelationEntityType(node.type)) return "";
    return getNodeTitle(node.type, node.id);
  });

  const selectedNetworkRelations = computed(() => {
    const node = selectedNetworkNode.value;
    if (!node) return [];

    return lines
      .filter((line) => line.from === node.id || line.to === node.id)
      .map((line) => buildRelationSummary(line, node.id))
      .sort((a, b) => a.priority - b.priority || a.otherNodeId.localeCompare(b.otherNodeId));
  });

  const selectedNetworkRelationCounts = computed(() => {
    const node = selectedNetworkNode.value;
    if (!node) return { incoming: 0, outgoing: 0 };
    return {
      incoming: lines.filter((line) => line.to === node.id).length,
      outgoing: lines.filter((line) => line.from === node.id).length,
    };
  });

  const rootNodeRelations = computed(() => {
    const node = selectedNetworkNode.value;
    if (!node || node.id === relKey.value) return [];

    return lines
      .filter(
        (line) =>
          (line.from === relKey.value && line.to === node.id) || (line.from === node.id && line.to === relKey.value)
      )
      .map((line) => ({
        text: line.text,
        direction: line.from === relKey.value ? t("relationView.rootToNode") : t("relationView.nodeToRoot"),
        directness: isDirectRelationLine(line.text) ? t("relationView.direct") : t("relationView.indirect"),
        sourceFields: getRelationSourceFields(line),
        priority: getRelationPriority(line.text),
      }))
      .sort((a, b) => a.priority - b.priority);
  });

  const selectedNodeRootPath = computed(() => {
    const node = selectedNetworkNode.value;
    if (!node || node.id === relKey.value) return null;

    const adjacency = new Map<string, { nextId: string; line: Line }[]>();
    lines.forEach((line) => {
      const fromEdges = adjacency.get(line.from) ?? [];
      fromEdges.push({ nextId: line.to, line });
      adjacency.set(line.from, fromEdges);

      const toEdges = adjacency.get(line.to) ?? [];
      toEdges.push({ nextId: line.from, line });
      adjacency.set(line.to, toEdges);
    });

    const queue: { nodeId: string; steps: { fromId: string; toId: string; line: Line }[] }[] = [
      { nodeId: relKey.value, steps: [] },
    ];
    const visited = new Set<string>([relKey.value]);

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) break;
      if (current.nodeId === node.id) {
        return {
          hopCount: current.steps.length,
          startNode: buildNodeSummary(relKey.value),
          steps: current.steps.map((step) => ({
            relation: buildRelationSummary(step.line, step.fromId),
            targetNode: buildNodeSummary(step.toId),
            isCurrentTarget: step.toId === node.id,
          })),
        };
      }

      const neighbors = adjacency.get(current.nodeId) ?? [];
      neighbors
        .slice()
        .sort((a, b) => getRelationPriority(a.line.text) - getRelationPriority(b.line.text))
        .forEach(({ nextId, line }) => {
          if (visited.has(nextId)) return;
          visited.add(nextId);
          queue.push({
            nodeId: nextId,
            steps: [...current.steps, { fromId: current.nodeId, toId: nextId, line }],
          });
        });
    }

    return null;
  });

  const selectedNodePathRelationKeys = computed(() => {
    if (!selectedNodeRootPath.value) return new Set<string>();
    return new Set(selectedNodeRootPath.value.steps.map((step) => step.relation.relationKey));
  });

  const selectedNodeRootPreview = computed(() => {
    const node = selectedNetworkNode.value;
    if (!node || !isRelationEntityType(node.type) || node.id === relKey.value) return null;

    const previewNodes: Node[] = [];
    const previewLines: Line[] = [];

    previewNodes.push({
      id: node.id,
      type: node.type,
      text: node.text,
      color: node.color,
      data: node.data,
    });

    const collectPreviewRelation = (relatedNodeId: string) => {
      const relatedNode = findNodeById(relatedNodeId);
      if (relatedNode && relatedNode.id !== node.id && !previewNodes.some((item) => item.id === relatedNode.id)) {
        previewNodes.push(relatedNode);
      }
    };

    lines.forEach((line) => {
      if (line.from === node.id || line.to === node.id) {
        previewLines.push(line);
        collectPreviewRelation(line.from);
        collectPreviewRelation(line.to);
      }
    });

    const groupedCounts = previewNodes.reduce<Record<string, number>>((acc, item) => {
      acc[item.type] = (acc[item.type] ?? 0) + 1;
      return acc;
    }, {});

    return {
      nodeCount: previewNodes.length,
      lineCount: previewLines.length,
      groupedCounts,
    };
  });

  return {
    buildNodeSummary,
    findNodeById,
    rootNodeRelations,
    selectedNetworkNode,
    selectedNetworkNodeTitle,
    selectedNetworkRelationCounts,
    selectedNetworkRelations,
    selectedNodePathRelationKeys,
    selectedNodeRootPath,
    selectedNodeRootPreview,
  };
};
