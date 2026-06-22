import {
  getRelationLineKey,
  type Line,
} from "@/views/relation/relationTypes";

export interface DiscoveredRelationPathStep {
  fromId: string;
  toId: string;
  line: Line;
}

export interface DiscoveredRelationPath {
  startId: string;
  endId: string;
  hopCount: number;
  steps: DiscoveredRelationPathStep[];
}

interface RelationPathQueueItem {
  nodeId: string;
  visited: Set<string>;
  steps: DiscoveredRelationPathStep[];
}

interface RelationPathEdge {
  nextId: string;
  line: Line;
}

export interface FindRelationPathsOptions {
  lines: Line[];
  startId: string;
  endId: string;
  maxDepth?: number;
  maxPaths?: number;
  directed?: boolean;
  getRelationPriority?: (lineKey: string) => number;
}

export const findRelationPaths = ({
  lines,
  startId,
  endId,
  maxDepth = 4,
  maxPaths = 5,
  directed = false,
  getRelationPriority = () => 0,
}: FindRelationPathsOptions): DiscoveredRelationPath[] => {
  if (!startId || !endId || startId === endId || maxDepth < 1 || maxPaths < 1) {
    return [];
  }

  const adjacency = new Map<string, RelationPathEdge[]>();
  const appendEdge = (fromId: string, nextId: string, line: Line) => {
    adjacency.set(fromId, [...(adjacency.get(fromId) ?? []), { nextId, line }]);
  };

  lines.forEach((line) => {
    appendEdge(line.from, line.to, line);
    if (!directed) appendEdge(line.to, line.from, line);
  });

  const sortEdges = (edges: RelationPathEdge[]) =>
    edges.slice().sort((first, second) => {
      const priorityDiff =
        getRelationPriority(getRelationLineKey(first.line)) -
        getRelationPriority(getRelationLineKey(second.line));
      return (
        priorityDiff ||
        first.nextId.localeCompare(second.nextId) ||
        getRelationLineKey(first.line).localeCompare(
          getRelationLineKey(second.line)
        )
      );
    });

  const paths: DiscoveredRelationPath[] = [];
  const queue: RelationPathQueueItem[] = [
    { nodeId: startId, visited: new Set([startId]), steps: [] },
  ];

  while (queue.length > 0 && paths.length < maxPaths) {
    const current = queue.shift();
    if (!current || current.steps.length >= maxDepth) continue;

    sortEdges(adjacency.get(current.nodeId) ?? []).forEach(({ nextId, line }) => {
      if (paths.length >= maxPaths || current.visited.has(nextId)) return;

      const nextSteps = [
        ...current.steps,
        { fromId: current.nodeId, toId: nextId, line },
      ];
      if (nextId === endId) {
        paths.push({
          startId,
          endId,
          hopCount: nextSteps.length,
          steps: nextSteps,
        });
        return;
      }

      queue.push({
        nodeId: nextId,
        visited: new Set([...current.visited, nextId]),
        steps: nextSteps,
      });
    });
  }

  return paths;
};
