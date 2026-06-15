import { computed, type ComputedRef, type Ref } from "vue";
import { isRelationEntityType, type Line, type Node } from "@/views/relation/relationTypes";

interface CreateRelationGraphRootAnalysisOptions {
  relKey: Ref<string>;
  lines: Line[];
  selectedNetworkNode: ComputedRef<Node | null>;
  findNodeById: (id: string) => Node | undefined;
  buildNodeSummary: (nodeId: string) => {
    id: string;
    rawType: string;
    isSubNode: boolean;
    type: string;
    title: string;
  };
  buildRelationSummary: (line: Line, nodeId: string) => {
    relationKey: string;
    direction: string;
    text: string;
    priority: number;
    directness: string;
    otherNodeId: string;
    otherNodeType: string;
    otherNodeTitle: string;
    sourceFields: string[];
  };
  getRelationPriority: (lineText: string) => number;
}

export const createRelationGraphRootAnalysis = ({
  relKey,
  lines,
  selectedNetworkNode,
  findNodeById,
  buildNodeSummary,
  buildRelationSummary,
  getRelationPriority,
}: CreateRelationGraphRootAnalysisOptions) => {
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
    selectedNodePathRelationKeys,
    selectedNodeRootPath,
    selectedNodeRootPreview,
  };
};
