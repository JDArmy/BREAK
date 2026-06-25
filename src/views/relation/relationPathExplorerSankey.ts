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
 * 关键约束：桑基图必须是 DAG（无环），且终点实体唯一出现在最右层。
 *
 * 无向图搜索会让同一实体在不同路径中处于不同位置，若强行合并成单一节点，
 * 不同路径对它的位置期望冲突，要么产生环要么让中间节点被推向最右变成"伪终点"。
 *
 * 策略：以「实体ID + 该实体在路径中的位置」作为桑基节点的唯一标识，
 * 即允许同一实体在不同深度各出现一个节点。每条路径独立成链，深度严格递增，
 * 自然满足 DAG；终点实体的节点只会出现在它真正作为路径末尾的那一层，
 * 不会因为被其他路径"提前引用"而分裂成多个终点。
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

  // 节点唯一键：实体ID @ 该实体在所属路径中的步进位置。
  // 同一实体出现在不同位置时各自独立成节点，避免跨路径位置冲突。
  const nodeKey = (entityId: string, position: number) => `${entityId}@${position}`;

  // 统计每个 (entityId, position) 的最大深度贡献，用于同名实体去重对齐。
  // 这里直接用 position 作为 depth：每条路径的步骤严格按 0,1,2,... 递增。
  const nodeMap = new Map<string, SankeyNode>();
  const linkMap = new Map<string, SankeyLink>();

  const ensureNode = (entityId: string, position: number) => {
    const key = nodeKey(entityId, position);
    const existing = nodeMap.get(key);
    if (existing) return existing.name;
    const type = getNodeType(entityId);
    // name 作为内部唯一键（含位置），供 link 匹配；displayName 供 label 显示
    const name = key;
    const displayName = getSankeyNodeName(type, entityId);
    nodeMap.set(key, {
      name,
      displayName,
      depth: position,
      entityType: type,
      entityKey: entityId,
      itemStyle: {
        color: RelationTypeMapping[type]?.color ?? "#999",
      },
    });
    return name;
  };

  const addLink = (sourceName: string, targetName: string) => {
    const linkKey = `${sourceName}->${targetName}`;
    if (!linkMap.has(linkKey)) {
      linkMap.set(linkKey, { source: sourceName, target: targetName, value: 1 });
    }
  };

  for (const path of paths) {
    const startName = ensureNode(path.startId, 0);
    let prevName = startName;
    for (let i = 0; i < path.steps.length; i++) {
      const step = path.steps[i];
      const position = i + 1;
      const nodeName = ensureNode(step.toId, position);
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
