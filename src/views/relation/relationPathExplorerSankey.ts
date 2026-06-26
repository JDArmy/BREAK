import { computed, ref, watch, type ComputedRef, type Ref } from "vue";
import {
  findRelationPaths,
  type DiscoveredRelationPath,
} from "@/views/relation/relationPathDiscovery";
import {
  type createRelationTypeMapping,
  getRelationLineKey,
  type Line,
  type RelationEntityType,
  type SankeyLink,
  type SankeyNode,
  RelationType,
} from "@/views/relation/relationTypes";
import type { RootPathSummary } from "@/components/relation/relationNodeDrawerInsightTypes";
import { getGlobalLines, getNodeTypeById } from "@/views/relation/relationGlobalLines";

type SankeyNodeNameGetter = (type: RelationEntityType, key: string) => string;
type Translate = (key: string, params?: Record<string, unknown>) => string;

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
  /** 当前语言，变化时桑基图节点 displayName 随之重算 */
  locale: Ref<string>;
  /** 当前选中的网络节点 ID（被点击打开详情的节点） */
  selectedNetworkNodeId: Ref<string>;
  /** 实体标题（i18n 响应），用于构建根路径预览的节点文案 */
  getNodeTitle: (type: RelationEntityType, key: string) => string;
  /** 实体类型标题，用于根路径预览的节点 type 字段 */
  getNodeTypeTitle: (type: string) => string;
  /** 判断关系是否为直接关系（入参为关系 key） */
  isDirectRelationLine: (lineKey: string) => boolean;
  /** 关系来源字段 */
  getRelationSourceFields: (line: Line) => string[];
  /** 翻译函数 */
  t: Translate;
}

/** 路径探索统计 */
export interface PathExplorerStats {
  pathCount: number;
  minHops: number;
  maxHops: number;
}


/**
 * 将 DiscoveredRelationPath[] 转换为桑基图 nodes/links 数据。
 * 关键约束：桑基图必须是 DAG（无环），且起点/终点实体各只出现一个节点。
 *
 * 策略：
 * - 起点和终点合并为单节点：起点 depth=0，终点 depth=最长路径跳数。
 * - 中间实体按「实体ID + 在路径中的位置」多节点：同一实体在不同路径的不同位置
 *   各自独立成节点，避免跨路径位置冲突产生环。
 *
 * 无环性验证：任意 link 都是「起点(0)→中间(≥1)」或「中间(p)→中间(p+1)」
 * 或「中间(末尾前)→终点(最长跳数)」，源 depth 始终 < 目标 depth。
 */
const pathsToSankeyData = (
  paths: DiscoveredRelationPath[],
  getSankeyNodeName: SankeyNodeNameGetter,
  RelationTypeMapping: ReturnType<typeof createRelationTypeMapping>,
  getNodeType: (id: string) => RelationEntityType,
) => {
  if (paths.length === 0) {
    return { nodes: [] as SankeyNode[], links: [] as SankeyLink[] };
  }

  const startId = paths[0].startId;
  // 终点 = 最长路径的末尾实体（所有路径终点相同）
  const endId = paths.reduce((max, p) => (p.hopCount > max.hopCount ? p : max), paths[0])
    .endId;
  // 终点 depth = 最长路径跳数，确保终点始终在最右层
  const maxHop = Math.max(...paths.map((p) => p.hopCount));

  const nodeMap = new Map<string, SankeyNode>();
  const linkMap = new Map<string, SankeyLink>();

  const createNode = (entityId: string, key: string, depth: number) => {
    const existing = nodeMap.get(key);
    if (existing) return existing.name;
    const type = getNodeType(entityId);
    const displayName = getSankeyNodeName(type, entityId);
    nodeMap.set(key, {
      // name 作为内部唯一键供 link 匹配；displayName 供 label 显示
      name: key,
      displayName,
      depth,
      entityType: type,
      entityKey: entityId,
      itemStyle: {
        color: RelationTypeMapping[type]?.color ?? "#999",
      },
    });
    return key;
  };

  // 起点/终点用固定单键（合并所有路径的起点/终点）
  const startKey = createNode(startId, `start:${startId}`, 0);
  const endKey = createNode(endId, `end:${endId}`, maxHop);

  const addLink = (sourceName: string, targetName: string) => {
    const linkKey = `${sourceName}->${targetName}`;
    if (!linkMap.has(linkKey)) {
      linkMap.set(linkKey, { source: sourceName, target: targetName, value: 1 });
    }
  };

  for (const path of paths) {
    // 起点 → 第一个中间节点（或直接到终点，当只有 1 跳）
    let prevName = startKey;
    for (let i = 0; i < path.steps.length; i++) {
      const step = path.steps[i];
      if (step.toId === endId) {
        // 连到合并的终点节点（终点在路径中只应出现在末尾）
        addLink(prevName, endKey);
        break;
      }
      // 中间节点按 (entityId, position) 多节点
      const position = i + 1;
      const key = `${step.toId}@${position}`;
      const nodeName = createNode(step.toId, key, position);
      addLink(prevName, nodeName);
      prevName = nodeName;
    }
  }

  return {
    nodes: [...nodeMap.values()],
    links: [...linkMap.values()],
  };
};

interface BuildPathExplorerRootPathSummaryOptions {
  discoveredPaths: DiscoveredRelationPath[];
  /** 被点击打开详情的节点实体 ID */
  clickedId: string;
  /** 路径起点实体 ID（= pathExplorerStartKey） */
  startId: string;
  /** 由实体 ID 推断类型 */
  getNodeType: (id: string) => RelationEntityType;
  getNodeTitle: (type: RelationEntityType, key: string) => string;
  getNodeTypeTitle: (type: string) => string;
  isDirectRelationLine: (lineKey: string) => boolean;
  getRelationSourceFields: (line: Line) => string[];
  getRelationLineKey: (line: Line) => string;
  t: Translate;
}

/**
 * 从路径探索已发现的路径中，截取「起点 → 被点击节点」的子路径，
 * 转换为节点详情抽屉「与根节点关系」区块使用的 RootPathSummary。
 *
 * 被点击节点必出现在至少一条 discoveredPath 的某个 step.toId（桑基图即由 discoveredPaths 构建）。
 * - 点击起点自身 → null（抽屉走 currentNodeIsRoot 分支）
 * - 点击终点 → 完整路径
 * - 点击中间节点 → 截断到该节点为止的子路径
 */
export const buildPathExplorerRootPathSummary = ({
  discoveredPaths,
  clickedId,
  startId,
  getNodeType,
  getNodeTitle,
  getNodeTypeTitle,
  isDirectRelationLine,
  getRelationSourceFields,
  getRelationLineKey,
  t,
}: BuildPathExplorerRootPathSummaryOptions): RootPathSummary | null => {
  if (!clickedId || discoveredPaths.length === 0) return null;
  if (clickedId === startId) return null;

  const path = discoveredPaths.find((p) =>
    p.steps.some((step) => step.toId === clickedId),
  );
  if (!path) return null;

  const targetIndex = path.steps.findIndex((step) => step.toId === clickedId);
  if (targetIndex < 0) return null;
  const truncated = path.steps.slice(0, targetIndex + 1);

  const buildNodeSummary = (id: string) => {
    const type = getNodeType(id);
    return {
      id,
      type: getNodeTypeTitle(type),
      title: getNodeTitle(type, id),
    };
  };

  return {
    hopCount: truncated.length,
    startNode: buildNodeSummary(startId),
    steps: truncated.map((step) => {
      const lineKey = getRelationLineKey(step.line);
      return {
        relation: {
          direction:
            step.line.from === step.fromId
              ? t("relationView.outgoing")
              : t("relationView.incoming"),
          text: t(getRelationLineKey(step.line)),
          directness: isDirectRelationLine(lineKey)
            ? t("relationView.direct")
            : t("relationView.indirect"),
          sourceFields: getRelationSourceFields(step.line),
        },
        targetNode: buildNodeSummary(step.toId),
        isCurrentTarget: step.toId === clickedId,
      };
    }),
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
  locale,
  selectedNetworkNodeId,
  getNodeTitle,
  getNodeTypeTitle,
  isDirectRelationLine,
  getRelationSourceFields,
  t,
}: CreatePathExplorerSankeyOptions) => {
  const searching = ref(false);
  const discoveredPaths = ref<DiscoveredRelationPath[]>([]);

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
    // 访问 locale 建立响应依赖：语言切换时 displayName 需随 getSankeyNodeName 重算
    void locale.value;
    if (discoveredPaths.value.length === 0) {
      return { nodes: [] as SankeyNode[], links: [] as SankeyLink[] };
    }
    return pathsToSankeyData(
      discoveredPaths.value,
      getSankeyNodeName,
      RelationTypeMapping,
      getNodeTypeById,
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
      return Math.min(Math.max(620, maxLayerNodeCount * 34 + 140), 5200);
    }

    return Math.min(Math.max(520, maxLayerNodeCount * 24 + 96), 3200);
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

  // 节点详情抽屉「与根节点关系」：路径探索以起点实体为根，
  // 从 discoveredPaths 截取起点→被点击节点的子路径。
  // getNodeTitle/getNodeTypeTitle 内部读取 locale，语言切换时自动重算。
  const pathExplorerNodeRootPath = computed(() =>
    buildPathExplorerRootPathSummary({
      discoveredPaths: discoveredPaths.value,
      clickedId: selectedNetworkNodeId.value,
      startId: startKey.value,
      getNodeType: getNodeTypeById,
      getNodeTitle,
      getNodeTypeTitle,
      isDirectRelationLine,
      getRelationSourceFields,
      getRelationLineKey,
      t,
    }),
  );

  const pathExplorerIsCurrentNodeRoot = computed(
    () =>
      Boolean(selectedNetworkNodeId.value) &&
      selectedNetworkNodeId.value === startKey.value,
  );

  return {
    discoveredPaths,
    hasTarget,
    pathExplorerChartHeight,
    pathExplorerHasData,
    pathExplorerIsCurrentNodeRoot,
    pathExplorerNodeRootPath,
    pathExplorerSankeyData,
    pathExplorerStats,
    searching,
  };
};
