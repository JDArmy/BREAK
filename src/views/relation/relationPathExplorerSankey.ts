import { computed, ref, watch, type ComputedRef, type Ref } from "vue";
import BREAK from "@/BREAK";
import {
  findRelationPaths,
  type DiscoveredRelationPath,
} from "@/views/relation/relationPathDiscovery";
import {
  type createRelationTypeMapping,
  type Line,
  type RelationEntityType,
  type SankeyLink,
  type SankeyNode,
  RelationType,
} from "@/views/relation/relationTypes";

type SankeyNodeNameGetter = (type: RelationEntityType, key: string) => string;

interface CreatePathExplorerSankeyOptions {
  startType: Ref<RelationType>;
  startKey: Ref<string>;
  endType: Ref<RelationType>;
  endKey: Ref<string>;
  maxDepth: Ref<number>;
  maxPaths: Ref<number>;
  getSankeyNodeName: SankeyNodeNameGetter;
  isMobile: ComputedRef<boolean> | Ref<boolean>;
  RelationTypeMapping: ReturnType<typeof createRelationTypeMapping>;
}

/** 路径探索统计 */
export interface PathExplorerStats {
  pathCount: number;
  minHops: number;
  maxHops: number;
}

/**
 * 从 BREAK 全局数据构建所有实体间的关系边。
 * 覆盖 Risk↔Avoidance、AttackTool→Risk、AttackTool→Avoidance、
 * ThreatActor→Risk、ThreatActor→AttackTool、Term→各实体 等全部关系方向。
 */
const buildGlobalLines = (): Line[] => {
  const lines: Line[] = [];

  // Risk → Avoidance
  for (const [rKey, risk] of Object.entries(BREAK.risks)) {
    for (const aKey of risk.avoidances ?? []) {
      lines.push({ from: rKey, to: aKey, text: "规避", relationKey: "risk-avoidance" });
    }
  }

  // AttackTool → Risk (直接/间接), AttackTool → Avoidance
  for (const [atKey, tool] of Object.entries(BREAK.attackTools)) {
    for (const rKey of tool.directCauseRisks ?? []) {
      lines.push({ from: atKey, to: rKey, text: "直接造成", relationKey: "attackTool-directCauseRisk" });
    }
    for (const rKey of tool.indirectSupportRisks ?? []) {
      lines.push({ from: atKey, to: rKey, text: "间接支持", relationKey: "attackTool-indirectSupportRisk" });
    }
    for (const aKey of tool.avoidances ?? []) {
      lines.push({ from: atKey, to: aKey, text: "规避", relationKey: "attackTool-avoidance" });
    }
  }

  // ThreatActor → Risk (直接/间接), ThreatActor → AttackTool (构建/使用)
  for (const [taKey, actor] of Object.entries(BREAK.threatActors)) {
    for (const rKey of actor.directCauseRisks ?? []) {
      lines.push({ from: taKey, to: rKey, text: "直接造成", relationKey: "threatActor-directCauseRisk" });
    }
    for (const rKey of actor.indirectSupportRisks ?? []) {
      lines.push({ from: taKey, to: rKey, text: "间接支持", relationKey: "threatActor-indirectSupportRisk" });
    }
    for (const atKey of actor.buildAttackTools ?? []) {
      lines.push({ from: taKey, to: atKey, text: "构建", relationKey: "threatActor-buildAttackTool" });
    }
    for (const atKey of actor.useAttackTools ?? []) {
      lines.push({ from: taKey, to: atKey, text: "使用", relationKey: "threatActor-useAttackTool" });
    }
  }

  // Term → 各实体
  for (const [tKey, term] of Object.entries(BREAK.terms)) {
    for (const rKey of term.relatedRisks ?? []) {
      lines.push({ from: tKey, to: rKey, text: "关联风险", relationKey: "term-risk" });
    }
    for (const aKey of term.relatedAvoidances ?? []) {
      lines.push({ from: tKey, to: aKey, text: "关联规避", relationKey: "term-avoidance" });
    }
    for (const atKey of term.relatedAttackTools ?? []) {
      lines.push({ from: tKey, to: atKey, text: "关联工具", relationKey: "term-attackTool" });
    }
    for (const taKey of term.relatedThreatActors ?? []) {
      lines.push({ from: tKey, to: taKey, text: "关联行为者", relationKey: "term-threatActor" });
    }
  }

  return lines;
};

// 全局缓存：所有关系边只构建一次
let globalLinesCache: Line[] | null = null;
const getGlobalLines = (): Line[] => {
  if (!globalLinesCache) {
    globalLinesCache = buildGlobalLines();
  }
  return globalLinesCache;
};

/**
 * 将 DiscoveredRelationPath[] 转换为桑基图 nodes/links 数据。
 * 每条路径的步骤按顺序分配 depth；同一实体取距起点的最大距离，
 * 确保桑基图中节点尽量靠右排布，避免短路径把中间节点拉到左侧导致连线交叉。
 */
const pathsToSankeyData = (
  paths: DiscoveredRelationPath[],
  getSankeyNodeName: SankeyNodeNameGetter,
  RelationTypeMapping: ReturnType<typeof createRelationTypeMapping>,
  getNodeType: (id: string) => RelationEntityType,
) => {
  // 所有路径都是 startId → ... → endId，但因为无向图搜索，
  // 同一节点可能在不同路径中出现在不同深度。
  // 策略：收集所有有向边（按路径方向），用 BFS 从起点确定层级，确保 DAG。

  const startId = paths[0]?.startId;
  if (!startId) return { nodes: [] as SankeyNode[], links: [] as SankeyLink[] };

  // 收集每条路径中相邻步骤构成的有向边
  const directedEdges = new Map<string, Set<string>>();
  for (const path of paths) {
    let prev = path.startId;
    for (const step of path.steps) {
      if (!directedEdges.has(prev)) directedEdges.set(prev, new Set());
      directedEdges.get(prev)!.add(step.toId);
      prev = step.toId;
    }
  }

  // BFS 从起点确定层级（最短路径深度）——保证起点在最左，终点在最右
  const depthMap = new Map<string, number>();
  depthMap.set(startId, 0);
  const queue = [startId];
  let qi = 0;
  while (qi < queue.length) {
    const curr = queue[qi++];
    const currDepth = depthMap.get(curr)!;
    const neighbors = directedEdges.get(curr);
    if (!neighbors) continue;
    for (const next of neighbors) {
      if (!depthMap.has(next)) {
        depthMap.set(next, currDepth + 1);
        queue.push(next);
      }
    }
  }

  // 构建桑基节点和链接
  const nodeMap = new Map<string, SankeyNode>();
  const linkMap = new Map<string, SankeyLink>();

  const ensureNode = (key: string) => {
    if (nodeMap.has(key)) return nodeMap.get(key)!.name;
    const type = getNodeType(key);
    const name = getSankeyNodeName(type, key);
    const depth = depthMap.get(key) ?? 0;
    nodeMap.set(key, {
      name,
      depth,
      entityType: type,
      entityKey: key,
      itemStyle: {
        color: RelationTypeMapping[type]?.color ?? "#999",
      },
    });
    return name;
  };

  // 只添加从低 depth 到高 depth 的 link（确保 DAG，无环）
  for (const [from, toSet] of directedEdges) {
    const fromName = ensureNode(from);
    const fromDepth = depthMap.get(from) ?? 0;
    for (const to of toSet) {
      const toDepth = depthMap.get(to) ?? 0;
      if (fromDepth < toDepth) {
        const toName = ensureNode(to);
        const linkKey = `${fromName}->${toName}`;
        if (!linkMap.has(linkKey)) {
          linkMap.set(linkKey, { source: fromName, target: toName, value: 1 });
        }
      }
    }
  }

  return {
    nodes: [...nodeMap.values()],
    links: [...linkMap.values()],
  };
};

export const createRelationPathExplorerSankey = ({
  startKey,
  endKey,
  maxDepth,
  maxPaths,
  getSankeyNodeName,
  isMobile,
  RelationTypeMapping,
}: CreatePathExplorerSankeyOptions) => {
  const searching = ref(false);
  const discoveredPaths = ref<DiscoveredRelationPath[]>([]);

  const getNodeType = (id: string): RelationEntityType => {
    if (id.startsWith("AT")) return RelationType.attackTool;
    if (id.startsWith("TA")) return RelationType.threatActor;
    if (id.startsWith("R")) return RelationType.risk;
    if (id.startsWith("A")) return RelationType.avoidance;
    if (id.startsWith("T")) return RelationType.term;
    return RelationType.risk;
  };

  let searchTimer: ReturnType<typeof setTimeout> | null = null;
  const runSearch = () => {
    if (searchTimer) {
      clearTimeout(searchTimer);
      searchTimer = null;
    }

    if (!startKey.value || !endKey.value || startKey.value === endKey.value) {
      discoveredPaths.value = [];
      searching.value = false;
      return;
    }

    searching.value = true;

    searchTimer = setTimeout(() => {
      searchTimer = null;
      const result = findRelationPaths({
        lines: getGlobalLines(),
        startId: startKey.value,
        endId: endKey.value,
        maxDepth: maxDepth.value,
        maxPaths: maxPaths.value,
        maxExpansions: 10000,
        directed: false,
      });
      discoveredPaths.value = result;
      searching.value = false;
    }, 150);
  };

  watch(
    [startKey, endKey, maxDepth, maxPaths],
    () => {
      runSearch();
    },
    { immediate: true },
  );

  const hasTarget = computed(() => Boolean(endKey.value));

  const pathExplorerSankeyData = computed(() => {
    if (discoveredPaths.value.length === 0) {
      return { nodes: [] as SankeyNode[], links: [] as SankeyLink[] };
    }
    return pathsToSankeyData(
      discoveredPaths.value,
      getSankeyNodeName,
      RelationTypeMapping,
      getNodeType,
    );
  });

  const pathExplorerChartHeight = computed(() => {
    const nodes = pathExplorerSankeyData.value.nodes;
    if (nodes.length === 0) return 0;

    const nodesByDepth = nodes.reduce<Record<number, number>>(
      (acc, node) => {
        const depth = node.depth ?? 0;
        acc[depth] = (acc[depth] ?? 0) + 1;
        return acc;
      },
      {},
    );
    const maxLayerNodeCount = Math.max(1, ...Object.values(nodesByDepth));

    // 最小高度 = 视口高度 - 页面其他元素占位（确保至少占满 1 屏可用空间）
    // header(60) + 选择器栏(44) + tabs(48) + 控制面板(~130) + 统计栏(~40) + footer(30) + 间距(~20) ≈ 372
    const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;
    const otherElementsHeight = isMobile.value ? 400 : 372;
    const minHeight = Math.max(300, viewportHeight - otherElementsHeight);

    // 按最密集层的节点数计算所需高度：每节点需要约 44px（含 nodeGap + label + 节点条高度）
    const nodeSlotHeight = isMobile.value ? 50 : 44;
    const contentHeight = maxLayerNodeCount * nodeSlotHeight + 100;

    // 最小 1 屏，实体多时可动态增高（页面滚动查看）
    return Math.max(minHeight, contentHeight);
  });

  const pathExplorerStats = computed<PathExplorerStats | null>(() => {
    const paths = discoveredPaths.value;
    if (paths.length === 0) return null;
    const hops = paths.map((p) => p.hopCount);
    return {
      pathCount: paths.length,
      minHops: Math.min(...hops),
      maxHops: Math.max(...hops),
    };
  });

  const pathExplorerHasData = computed(
    () => pathExplorerSankeyData.value.nodes.length > 0,
  );

  return {
    discoveredPaths,
    hasTarget,
    pathExplorerChartHeight,
    pathExplorerHasData,
    pathExplorerSankeyData,
    pathExplorerStats,
    searching,
  };
};
