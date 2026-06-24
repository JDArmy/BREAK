import { computed, ref, type ComputedRef, type Ref } from "vue";
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
  lines: Line[];
  startType: Ref<RelationType>;
  startKey: Ref<string>;
  endType: Ref<RelationType>;
  endKey: Ref<string>;
  maxDepth: Ref<number>;
  maxPaths: Ref<number>;
  getSankeyNodeName: SankeyNodeNameGetter;
  isMobile: ComputedRef<boolean> | Ref<boolean>;
  RelationTypeMapping: ReturnType<typeof createRelationTypeMapping>;
  /** 用于检测起终点在图中是否存在的节点 ID 集合 */
  getNodeIds: () => Set<string>;
}

/** 路径探索统计 */
export interface PathExplorerStats {
  pathCount: number;
  minHops: number;
  maxHops: number;
}

/**
 * 将 DiscoveredRelationPath[] 转换为桑基图 nodes/links 数据。
 * 每条路径的步骤按顺序分配 depth；同一实体取最小 depth。
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
      // 取最小 depth
      if (depth < (existing.depth ?? Infinity)) {
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
    // 起点 depth=0
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
  lines,
  startType,
  startKey,
  endType,
  endKey,
  maxDepth,
  maxPaths,
  getSankeyNodeName,
  isMobile,
  RelationTypeMapping,
  getNodeIds,
}: CreatePathExplorerSankeyOptions) => {
  // 搜索触发标志——只有用户点击"发现路径"时才触发搜索
  const searchTriggered = ref(false);
  const searching = ref(false);

  // 缓存路径发现结果
  const discoveredPaths = ref<DiscoveredRelationPath[]>([]);

  // 从 lines 构建节点类型查找表
  const nodeTypeMap = computed(() => {
    const map = new Map<string, RelationEntityType>();
    // 从 lines 的 from/to 字段推断类型有限；使用 RelationType 前缀规则
    // R=risk, A=avoidance, AT=attackTool, TA=threatActor, T=term
    return map;
  });

  const getNodeType = (id: string): RelationEntityType => {
    if (id.startsWith("AT")) return RelationType.attackTool;
    if (id.startsWith("TA")) return RelationType.threatActor;
    if (id.startsWith("R")) return RelationType.risk;
    if (id.startsWith("A")) return RelationType.avoidance;
    if (id.startsWith("T")) return RelationType.term;
    return RelationType.risk;
  };

  // 执行路径搜索
  const discoverPaths = () => {
    if (!startKey.value || !endKey.value || startKey.value === endKey.value) {
      discoveredPaths.value = [];
      searchTriggered.value = true;
      return;
    }

    searching.value = true;
    searchTriggered.value = true;

    // 使用 setTimeout 避免阻塞 UI（大图搜索可能较慢）
    setTimeout(() => {
      const result = findRelationPaths({
        lines,
        startId: startKey.value,
        endId: endKey.value,
        maxDepth: maxDepth.value,
        maxPaths: maxPaths.value,
        maxExpansions: 2000,
        directed: false,
      });
      discoveredPaths.value = result;
      searching.value = false;
    }, 0);
  };

  // 桑基图数据
  const pathExplorerSankeyData = computed(() => {
    if (!searchTriggered.value || discoveredPaths.value.length === 0) {
      return { nodes: [] as SankeyNode[], links: [] as SankeyLink[] };
    }
    return pathsToSankeyData(
      discoveredPaths.value,
      getSankeyNodeName,
      RelationTypeMapping,
      getNodeType,
    );
  });

  // 桑基图高度
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

  // 统计信息
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

  // 是否有数据
  const pathExplorerHasData = computed(
    () => pathExplorerSankeyData.value.nodes.length > 0,
  );

  return {
    discoverPaths,
    discoveredPaths,
    pathExplorerChartHeight,
    pathExplorerHasData,
    pathExplorerSankeyData,
    pathExplorerStats,
    searchTriggered,
    searching,
    // 暴露 nodeTypeMap 以便调试
    void: nodeTypeMap,
  };
};
