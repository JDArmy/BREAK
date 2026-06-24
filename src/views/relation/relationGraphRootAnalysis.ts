import { computed, type ComputedRef, type Ref } from "vue";
import {
  getRelationLineKey,
  type Line,
  type Node,
  type RelationEntityType,
} from "@/views/relation/relationTypes";

const maxRootPathExpansions = 800;

interface CreateRelationGraphRootAnalysisOptions {
  relKey: Ref<string>;
  lines: Line[];
  selectedNetworkNode: ComputedRef<Node | null>;
  findNodeById: (id: string) => Node | undefined;
  buildNodeSummary: (nodeId: string) => {
    id: string;
    rawType: RelationEntityType | "";
    isSubNode: boolean;
    type: string;
    title: string;
  };
  buildRelationSummary: (
    line: Line,
    nodeId: string,
  ) => {
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
  const adjacencyByNodeId = computed(() => {
    const adjacency = new Map<string, { nextId: string; line: Line }[]>();
    const appendEdge = (fromId: string, nextId: string, line: Line) => {
      const edges = adjacency.get(fromId);
      if (edges) {
        edges.push({ nextId, line });
        return;
      }
      adjacency.set(fromId, [{ nextId, line }]);
    };

    lines.forEach((line) => {
      appendEdge(line.from, line.to, line);
      appendEdge(line.to, line.from, line);
    });

    adjacency.forEach((neighbors) => {
      neighbors.sort(
        (a, b) =>
          getRelationPriority(getRelationLineKey(a.line)) -
          getRelationPriority(getRelationLineKey(b.line)),
      );
    });

    return adjacency;
  });

  const selectedNodeRootPath = computed(() => {
    const node = selectedNetworkNode.value;
    if (!node || node.id === relKey.value) return null;

    const adjacency = adjacencyByNodeId.value;
    const queue: {
      nodeId: string;
      steps: { fromId: string; toId: string; line: Line }[];
    }[] = [{ nodeId: relKey.value, steps: [] }];
    const visited = new Set<string>([relKey.value]);
    let expansions = 0;

    while (queue.length > 0 && expansions < maxRootPathExpansions) {
      const current = queue.shift();
      if (!current) break;
      expansions += 1;
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
      for (const { nextId, line } of neighbors) {
        if (visited.has(nextId)) continue;
        visited.add(nextId);
        queue.push({
          nodeId: nextId,
          steps: [
            ...current.steps,
            { fromId: current.nodeId, toId: nextId, line },
          ],
        });
        if (expansions >= maxRootPathExpansions) break;
      }
    }

    return null;
  });

  const selectedNodePathRelationKeys = computed(() => {
    if (!selectedNodeRootPath.value) return new Set<string>();
    return new Set(
      selectedNodeRootPath.value.steps.map((step) => step.relation.relationKey),
    );
  });

  const selectedNodeRootPreview = computed(() => {
    const node = selectedNetworkNode.value;
    if (!node) return null;

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
      if (
        relatedNode &&
        relatedNode.id !== node.id &&
        !previewNodes.some((item) => item.id === relatedNode.id)
      ) {
        previewNodes.push(relatedNode);
      }
    };

    (adjacencyByNodeId.value.get(node.id) ?? []).forEach(({ line }) => {
      if (line.from === node.id || line.to === node.id) {
        previewLines.push(line);
        collectPreviewRelation(line.from);
        collectPreviewRelation(line.to);
      }
    });

    const groupedCounts = previewNodes.reduce<Record<string, number>>(
      (acc, item) => {
        acc[item.type] = (acc[item.type] ?? 0) + 1;
        return acc;
      },
      {},
    );

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
