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
  maxExpansions?: number;
  directed?: boolean;
  getRelationPriority?: (lineKey: string) => number;
}

/**
 * 双向 BFS 路径发现算法。
 * 从起点和终点同时向中间搜索，当两侧前沿相遇时即找到路径。
 * 搜索空间从 O(b^d) 降为 O(b^(d/2))，在大规模知识图谱中性能提升显著。
 */
export const findRelationPaths = ({
  lines,
  startId,
  endId,
  maxDepth = 4,
  maxPaths = 5,
  maxExpansions = 10000,
  directed = false,
  getRelationPriority = () => 0,
}: FindRelationPathsOptions): DiscoveredRelationPath[] => {
  if (
    !startId ||
    !endId ||
    startId === endId ||
    maxDepth < 1 ||
    maxPaths < 1 ||
    maxExpansions < 1
  ) {
    return [];
  }

  // 构建正向邻接表（从 from 能到 to）
  const forwardAdj = new Map<string, RelationPathEdge[]>();
  // 反向邻接表（从 to 能到 from）——用于反向搜索
  const backwardAdj = new Map<string, RelationPathEdge[]>();

  const appendEdge = (map: Map<string, RelationPathEdge[]>, fromId: string, nextId: string, line: Line) => {
    const edges = map.get(fromId);
    if (edges) {
      edges.push({ nextId, line });
    } else {
      map.set(fromId, [{ nextId, line }]);
    }
  };

  lines.forEach((line) => {
    // 正向：from → to
    appendEdge(forwardAdj, line.from, line.to, line);
    // 反向邻接：to → from（反向搜索时使用）
    appendEdge(backwardAdj, line.to, line.from, line);
    if (!directed) {
      // 无向图：双向都加
      appendEdge(forwardAdj, line.to, line.from, line);
      appendEdge(backwardAdj, line.from, line.to, line);
    }
  });

  const sortEdges = (edges: RelationPathEdge[]) => {
    edges.sort((first, second) => {
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
  };

  forwardAdj.forEach(sortEdges);
  backwardAdj.forEach(sortEdges);

  const paths: DiscoveredRelationPath[] = [];

  // 前向到达的节点 → 从 startId 到该节点的路径列表
  // 每条路径是 steps 数组（步骤从 startId 出发）
  const forwardPaths = new Map<string, DiscoveredRelationPathStep[][]>();
  forwardPaths.set(startId, [[]]);

  // 反向到达的节点 → 从该节点到 endId 的路径列表
  const backwardPaths = new Map<string, DiscoveredRelationPathStep[][]>();
  backwardPaths.set(endId, [[]]);

  // 当前层前沿节点集合
  let forwardFrontier = new Set<string>([startId]);
  let backwardFrontier = new Set<string>([endId]);

  let forwardDepth = 0;
  let backwardDepth = 0;
  let expansions = 0;

  // 路径去重：用节点序列作为 key
  const pathKeys = new Set<string>();
  const getPathKey = (steps: DiscoveredRelationPathStep[]): string => {
    let key = startId;
    for (const s of steps) key += `→${s.toId}`;
    return key;
  };

  /** 尝试将两侧路径拼接 */
  const tryConnect = (meetNode: string) => {
    const fPaths = forwardPaths.get(meetNode);
    const bPaths = backwardPaths.get(meetNode);
    if (!fPaths || !bPaths) return;

    for (const fPath of fPaths) {
      for (const bPath of bPaths) {
        if (paths.length >= maxPaths) return;
        const totalHops = fPath.length + bPath.length;
        if (totalHops < 1 || totalHops > maxDepth) continue;

        // 检查合并后路径无环
        const visitedNodes = new Set<string>([startId]);
        let hasLoop = false;
        for (const s of fPath) {
          if (visitedNodes.has(s.toId)) { hasLoop = true; break; }
          visitedNodes.add(s.toId);
        }
        if (!hasLoop) {
          for (const s of bPath) {
            if (visitedNodes.has(s.toId)) { hasLoop = true; break; }
            visitedNodes.add(s.toId);
          }
        }
        if (hasLoop) continue;

        const fullSteps = [...fPath, ...bPath];
        const key = getPathKey(fullSteps);
        if (pathKeys.has(key)) continue;
        pathKeys.add(key);

        paths.push({
          startId,
          endId,
          hopCount: totalHops,
          steps: fullSteps,
        });
      }
    }
  };

  /** 展开正向一层 */
  const expandForward = () => {
    const nextFrontier = new Set<string>();

    for (const nodeId of forwardFrontier) {
      if (expansions >= maxExpansions || paths.length >= maxPaths) break;
      expansions++;

      const edges = forwardAdj.get(nodeId) ?? [];
      const currentNodePaths = forwardPaths.get(nodeId) ?? [];

      for (const { nextId, line } of edges) {
        if (paths.length >= maxPaths) break;
        if (nextId === startId) continue;

        const step: DiscoveredRelationPathStep = { fromId: nodeId, toId: nextId, line };

        // 为每条当前路径生成扩展路径
        const newPaths: DiscoveredRelationPathStep[][] = [];
        for (const prevPath of currentNodePaths) {
          // 环路检查：nextId 不能在路径中已出现
          if (prevPath.some(s => s.toId === nextId)) continue;
          newPaths.push([...prevPath, step]);
        }
        if (newPaths.length === 0) continue;

        // 存储到达 nextId 的路径
        if (!forwardPaths.has(nextId)) {
          forwardPaths.set(nextId, []);
        }
        const existing = forwardPaths.get(nextId)!;
        for (const p of newPaths) {
          if (existing.length < maxPaths * 3) existing.push(p);
        }

        nextFrontier.add(nextId);

        // 检查是否与反向侧相遇
        if (backwardPaths.has(nextId)) {
          tryConnect(nextId);
        }
      }
    }

    forwardFrontier = nextFrontier;
    forwardDepth++;
  };

  /** 展开反向一层 */
  const expandBackward = () => {
    const nextFrontier = new Set<string>();

    for (const nodeId of backwardFrontier) {
      if (expansions >= maxExpansions || paths.length >= maxPaths) break;
      expansions++;

      const edges = backwardAdj.get(nodeId) ?? [];
      const currentNodePaths = backwardPaths.get(nodeId) ?? [];

      for (const { nextId, line } of edges) {
        if (paths.length >= maxPaths) break;
        if (nextId === endId) continue;

        // 反向步骤：实际路径方向是 nextId → nodeId
        const step: DiscoveredRelationPathStep = { fromId: nextId, toId: nodeId, line };

        const newPaths: DiscoveredRelationPathStep[][] = [];
        for (const prevPath of currentNodePaths) {
          // 环路检查：nextId 不能在路径中已出现
          if (prevPath.some(s => s.fromId === nextId)) continue;
          newPaths.push([step, ...prevPath]);
        }
        if (newPaths.length === 0) continue;

        if (!backwardPaths.has(nextId)) {
          backwardPaths.set(nextId, []);
        }
        const existing = backwardPaths.get(nextId)!;
        for (const p of newPaths) {
          if (existing.length < maxPaths * 3) existing.push(p);
        }

        nextFrontier.add(nextId);

        // 检查是否与正向侧相遇
        if (forwardPaths.has(nextId)) {
          tryConnect(nextId);
        }
      }
    }

    backwardFrontier = nextFrontier;
    backwardDepth++;
  };

  // 交替展开正向和反向，选择前沿更小的一侧先展开
  while (
    (forwardFrontier.size > 0 || backwardFrontier.size > 0) &&
    paths.length < maxPaths &&
    expansions < maxExpansions &&
    forwardDepth + backwardDepth < maxDepth
  ) {
    if (forwardFrontier.size > 0 &&
      (backwardFrontier.size === 0 || forwardFrontier.size <= backwardFrontier.size) &&
      forwardDepth + backwardDepth < maxDepth) {
      expandForward();
    } else if (backwardFrontier.size > 0 && forwardDepth + backwardDepth < maxDepth) {
      expandBackward();
    } else {
      break;
    }
  }

  // 按跳数排序
  paths.sort((a, b) => a.hopCount - b.hopCount);

  return paths.slice(0, maxPaths);
};
