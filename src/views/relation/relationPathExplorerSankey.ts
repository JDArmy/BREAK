import { computed, ref, watch, type ComputedRef, type Ref } from "vue";
import BREAK from "@/BREAK";
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
          text: step.line.text,
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
    // 访问 locale 建立响应依赖：语言切换时 displayName 需随 getSankeyNodeName 重算
    void locale.value;
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
    const depthCount = Object.keys(nodesByDepth).length;

    // 最小高度 = 视口高度 - 页面其他元素占位（确保至少占满 1 屏可用空间）
    // header(60) + 选择器栏(44) + tabs(48) + 控制面板(~130) + 统计栏(~40) + footer(30) + 间距(~20) ≈ 372
    const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;
    const otherElementsHeight = isMobile.value ? 400 : 372;
    const minHeight = Math.max(300, viewportHeight - otherElementsHeight);

    // 每节点分配高度随跳数增加而增加——层数多时标签更密集，需要更大垂直间距
    // 基准 44px，每增加 1 层（超过 3 层）加 10px
    const baseNodeHeight = isMobile.value ? 50 : 44;
    const extraPerDepth = depthCount > 3 ? (depthCount - 3) * 10 : 0;
    const nodeSlotHeight = baseNodeHeight + extraPerDepth;
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

  // 节点详情抽屉「与根节点关系」：路径探索以起点实体为根，
  // 从 discoveredPaths 截取起点→被点击节点的子路径。
  // getNodeTitle/getNodeTypeTitle 内部读取 locale，语言切换时自动重算。
  const pathExplorerNodeRootPath = computed(() =>
    buildPathExplorerRootPathSummary({
      discoveredPaths: discoveredPaths.value,
      clickedId: selectedNetworkNodeId.value,
      startId: startKey.value,
      getNodeType,
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
