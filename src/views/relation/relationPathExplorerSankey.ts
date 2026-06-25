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
  const nodeMap = new Map<string, SankeyNode>();
  const linkMap = new Map<string, SankeyLink>();

  const addNode = (key: string, depth: number) => {
    const existing = nodeMap.get(key);
    if (existing) {
      // 取最大 depth——让节点尽量靠右，避免短路径把中间节点拉到起点附近
      if (depth > (existing.depth ?? -1)) {
        existing.depth = depth;
      }
      return existing.name;
    }
    const type = getNodeType(key);
    const name = getSankeyNodeName(type, key);
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

  const addLink = (source: string, target: string) => {
    const linkKey = `${source}->${target}`;
    const existing = linkMap.get(linkKey);
    if (existing) {
      existing.value += 1;
    } else {
      linkMap.set(linkKey, { source, target, value: 1 });
    }
  };

  for (const path of paths) {
    const startName = addNode(path.startId, 0);
    let prevName = startName;

    for (let i = 0; i < path.steps.length; i++) {
      const step = path.steps[i];
      const nodeName = addNode(step.toId, i + 1);
      addLink(prevName, nodeName);
      prevName = nodeName;
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
        maxExpansions: 2000,
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

    if (isMobile.value) {
      return Math.min(Math.max(400, maxLayerNodeCount * 34 + 140), 3200);
    }
    return Math.min(Math.max(400, maxLayerNodeCount * 24 + 96), 2400);
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
