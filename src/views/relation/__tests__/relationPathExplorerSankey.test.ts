import { computed, nextTick, ref } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildPathExplorerRootPathSummary,
  createRelationPathExplorerSankey,
} from "../relationPathExplorerSankey";
import {
  createRelationTypeMapping,
  getRelationLineKey,
  RelationType,
} from "../relationTypes";

// mock BREAK 全局数据——覆盖多种关系
vi.mock("@/BREAK", () => ({
  default: {
    risks: {
      R0001: { avoidances: ["A0001", "A0002"] },
      R0002: { avoidances: ["A0002", "A0003"] },
      R0027: { avoidances: ["A0003"] },
    },
    avoidances: {
      A0001: {},
      A0002: {},
      A0003: {},
    },
    attackTools: {
      AT0001: {
        directCauseRisks: ["R0001"],
        indirectSupportRisks: ["R0002"],
        avoidances: ["A0001"],
      },
      AT0002: {
        directCauseRisks: ["R0027"],
        indirectSupportRisks: [],
        avoidances: [],
      },
    },
    threatActors: {
      TA0001: {
        directCauseRisks: ["R0001"],
        indirectSupportRisks: [],
        buildAttackTools: ["AT0001"],
        useAttackTools: ["AT0002"],
      },
    },
    terms: {
      T0001: {
        relatedRisks: ["R0001"],
        relatedAvoidances: ["A0001"],
        relatedAttackTools: [],
        relatedThreatActors: [],
      },
    },
  },
}));

const relationTypeMapping = createRelationTypeMapping((key) => key, () => "#111");

const createExplorer = (options?: {
  startType?: RelationType;
  startKey?: string;
  endType?: RelationType;
  endKey?: string;
  maxDepth?: number;
  maxPaths?: number;
  isMobile?: boolean;
}) => {
  const startKey = ref(options?.startKey ?? "R0001");
  const endKey = ref(options?.endKey ?? "");
  const maxDepth = ref(options?.maxDepth ?? 4);
  const maxPaths = ref(options?.maxPaths ?? 10);
  const locale = ref("zh-CN");
  const selectedNetworkNodeId = ref("");
  return {
    explorer: createRelationPathExplorerSankey({
      startType: ref(options?.startType ?? RelationType.risk),
      startKey,
      endType: ref(options?.endType ?? RelationType.avoidance),
      endKey,
      maxDepth,
      maxPaths,
      getSankeyNodeName: (type, key) => `${locale.value}:${type}:${key}`,
      isMobile: computed(() => options?.isMobile ?? false),
      RelationTypeMapping: relationTypeMapping,
      locale,
      selectedNetworkNodeId,
      getNodeTitle: (type, key) => `${locale.value}:title:${type}:${key}`,
      getNodeTypeTitle: (type) => `${locale.value}:typeTitle:${type}`,
      isDirectRelationLine: (lineKey) => lineKey.includes("direct"),
      getRelationSourceFields: (line) => [line.relationKey],
      getRelationLineKey,
      t: (key) => `t:${key}`,
    }),
    startKey,
    endKey,
    maxDepth,
    maxPaths,
    locale,
    selectedNetworkNodeId,
  };
};

describe("relationPathExplorerSankey", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // === 基本功能 ===

  it("keeps sankey data empty when no target selected", () => {
    const { explorer } = createExplorer();

    expect(explorer.hasTarget.value).toBe(false);
    expect(explorer.pathExplorerHasData.value).toBe(false);
    expect(explorer.pathExplorerSankeyData.value).toEqual({ nodes: [], links: [] });
    expect(explorer.pathExplorerChartHeight.value).toBe(0);
    expect(explorer.pathExplorerStats.value).toBeNull();
  });

  it("returns empty when start equals end", async () => {
    const { explorer } = createExplorer({ startKey: "R0001", endKey: "R0001" });

    await nextTick();
    vi.runAllTimers();

    expect(explorer.discoveredPaths.value).toEqual([]);
    expect(explorer.pathExplorerHasData.value).toBe(false);
  });

  // === 全局关系搜索（修复：不再依赖当前图谱局部边）===

  it("finds direct path using global BREAK data regardless of current graph root", async () => {
    // R0027 → A0003 是全局数据中的直连关系
    const { explorer, endKey } = createExplorer({
      startType: RelationType.risk,
      startKey: "R0027",
      endType: RelationType.avoidance,
    });

    endKey.value = "A0003";
    await nextTick();
    vi.runAllTimers();

    expect(explorer.pathExplorerHasData.value).toBe(true);
    expect(explorer.discoveredPaths.value.length).toBeGreaterThanOrEqual(1);
    const directPath = explorer.discoveredPaths.value.find((p) => p.hopCount === 1);
    expect(directPath).toBeDefined();
    expect(directPath!.startId).toBe("R0027");
    expect(directPath!.endId).toBe("A0003");
  });

  it("finds paths across entity types through global relations", async () => {
    // TA0001 → AT0001 → R0001 → A0001（多跳跨实体类型）
    const { explorer, endKey } = createExplorer({
      startType: RelationType.threatActor,
      startKey: "TA0001",
      endType: RelationType.avoidance,
    });

    endKey.value = "A0001";
    await nextTick();
    vi.runAllTimers();

    expect(explorer.discoveredPaths.value.length).toBeGreaterThanOrEqual(1);
    expect(explorer.pathExplorerStats.value).not.toBeNull();
    expect(explorer.pathExplorerStats.value!.minHops).toBeGreaterThanOrEqual(2);
  });

  it("keeps target state but returns no data when no path exists", async () => {
    const { explorer, endKey } = createExplorer({
      startKey: "R0027",
      maxDepth: 1,
    });

    endKey.value = "TA0001";
    await nextTick();
    vi.runAllTimers();

    expect(explorer.hasTarget.value).toBe(true);
    expect(explorer.discoveredPaths.value).toEqual([]);
    expect(explorer.pathExplorerStats.value).toBeNull();
    expect(explorer.pathExplorerHasData.value).toBe(false);
  });

  // === depth 分配（起点/终点合并为单节点，中间实体按位置多节点）===

  it("end entity is a single node at max hop depth", async () => {
    // 不同长度路径都终止于 A0002，终点应合并为唯一节点且 depth = 最长路径跳数
    const { explorer, endKey } = createExplorer({
      startType: RelationType.risk,
      startKey: "R0001",
      endType: RelationType.avoidance,
      maxDepth: 4,
      maxPaths: 20,
    });

    endKey.value = "A0002";
    await nextTick();
    vi.runAllTimers();

    if (explorer.discoveredPaths.value.length > 1) {
      const endNodes = explorer.pathExplorerSankeyData.value.nodes.filter(
        (n) => n.entityKey === "A0002",
      );
      // 终点实体只出现一个节点
      expect(endNodes.length).toBe(1);
      const maxHop = Math.max(
        ...explorer.discoveredPaths.value.map((p) => p.hopCount),
      );
      expect(endNodes[0]!.depth).toBe(maxHop);
    }
  });

  it("end entity is single node at max hop count across all paths", async () => {
    const { explorer, endKey } = createExplorer({
      startType: RelationType.threatActor,
      startKey: "TA0001",
      endType: RelationType.avoidance,
      maxDepth: 5,
      maxPaths: 20,
    });

    endKey.value = "A0001";
    await nextTick();
    vi.runAllTimers();

    const paths = explorer.discoveredPaths.value;
    if (paths.length > 0) {
      const endNodes = explorer.pathExplorerSankeyData.value.nodes.filter(
        (n) => n.entityKey === "A0001",
      );
      expect(endNodes.length).toBe(1);
      const maxHop = Math.max(...paths.map((p) => p.hopCount));
      expect(endNodes[0]!.depth).toBe(maxHop);
    }
  });

  it("computes path statistics across mixed hop counts", async () => {
    const { explorer, endKey } = createExplorer({
      startKey: "R0001",
      maxDepth: 4,
      maxPaths: 20,
    });

    endKey.value = "A0002";
    await nextTick();
    vi.runAllTimers();

    if (explorer.discoveredPaths.value.length > 1) {
      const hops = explorer.discoveredPaths.value.map((path) => path.hopCount);
      expect(explorer.pathExplorerStats.value).toEqual({
        pathCount: explorer.discoveredPaths.value.length,
        minHops: Math.min(...hops),
        maxHops: Math.max(...hops),
      });
    }
  });

  // === 参数变化后数据保持可用（修复：v-show 不销毁 DOM）===

  it("retains path data after maxPaths parameter change (no intermediate empty state)", async () => {
    const { explorer, endKey, maxPaths } = createExplorer({
      startKey: "R0001",
      maxPaths: 10,
    });

    // 首次搜索
    endKey.value = "A0001";
    await nextTick();
    vi.runAllTimers();

    expect(explorer.pathExplorerHasData.value).toBe(true);
    const firstCount = explorer.discoveredPaths.value.length;

    // 修改 maxPaths——搜索期间 searching=true，但旧数据不应被清空
    maxPaths.value = 5;
    await nextTick();

    // 搜索触发前，旧数据仍然存在（不是空数组）
    expect(explorer.searching.value).toBe(true);
    // 关键：discoveredPaths 在新搜索完成前保持旧值
    expect(explorer.discoveredPaths.value.length).toBe(firstCount);

    // 搜索完成
    vi.runAllTimers();
    expect(explorer.searching.value).toBe(false);
    expect(explorer.pathExplorerHasData.value).toBe(true);
  });

  it("retains path data after maxDepth parameter change", async () => {
    const { explorer, endKey, maxDepth } = createExplorer({
      startKey: "R0001",
      maxDepth: 4,
    });

    endKey.value = "A0001";
    await nextTick();
    vi.runAllTimers();

    expect(explorer.pathExplorerHasData.value).toBe(true);

    // 修改 maxDepth
    maxDepth.value = 2;
    await nextTick();

    // 搜索中旧数据保持
    expect(explorer.discoveredPaths.value.length).toBeGreaterThanOrEqual(1);

    vi.runAllTimers();
    expect(explorer.searching.value).toBe(false);
    expect(explorer.pathExplorerHasData.value).toBe(true);
  });

  // === 最小高度使用视口减去其他元素高度 ===

  it("chart height at least fills one screen (desktop)", async () => {
    // happy-dom 默认 window.innerHeight = 768
    const { explorer, endKey } = createExplorer({ isMobile: false });

    endKey.value = "A0001";
    await nextTick();
    vi.runAllTimers();

    const height = explorer.pathExplorerChartHeight.value;
    // 最小高度 = max(300, innerHeight - 372)
    const viewportMin = Math.max(300, window.innerHeight - 372);
    expect(height).toBeGreaterThanOrEqual(viewportMin);
  });

  it("chart height at least fills one screen (mobile)", async () => {
    const { explorer, endKey } = createExplorer({ isMobile: true });

    endKey.value = "A0001";
    await nextTick();
    vi.runAllTimers();

    const height = explorer.pathExplorerChartHeight.value;
    const viewportMin = Math.max(300, window.innerHeight - 400);
    expect(height).toBeGreaterThanOrEqual(viewportMin);
  });

  // === 自动触发搜索（修复：去掉手动按钮）===

  it("automatically triggers search when endKey changes without manual action", async () => {
    const { explorer, endKey } = createExplorer({ startKey: "R0001" });

    expect(explorer.pathExplorerHasData.value).toBe(false);

    // 设置终点——无需调用任何 discover 方法
    endKey.value = "A0001";
    await nextTick();

    // 搜索应被自动触发
    expect(explorer.searching.value).toBe(true);

    vi.runAllTimers();
    expect(explorer.searching.value).toBe(false);
    expect(explorer.pathExplorerHasData.value).toBe(true);
  });

  it("debounces rapid parameter changes (only final state triggers search)", async () => {
    const { explorer, endKey, maxPaths } = createExplorer({ startKey: "R0001" });

    endKey.value = "A0001";
    await nextTick();

    // 快速连续修改参数
    maxPaths.value = 5;
    await nextTick();
    maxPaths.value = 3;
    await nextTick();
    maxPaths.value = 8;
    await nextTick();

    // 只有最后一次参数值生效
    vi.runAllTimers();
    expect(explorer.searching.value).toBe(false);
    expect(explorer.pathExplorerHasData.value).toBe(true);
  });

  // === 语言切换：桑基图节点 displayName 随语言重算 ===

  it("updates sankey node display names when locale changes", async () => {
    const { explorer, endKey, locale } = createExplorer({
      startKey: "R0027",
      endType: RelationType.avoidance,
    });

    endKey.value = "A0003";
    await nextTick();
    vi.runAllTimers();

    expect(explorer.pathExplorerHasData.value).toBe(true);
    const nodeBefore = explorer.pathExplorerSankeyData.value.nodes.find(
      (n) => n.entityKey === "A0003",
    );
    expect(nodeBefore).toBeDefined();
    expect(nodeBefore!.displayName).toContain("zh-CN");

    // 切换到英文
    locale.value = "en-US";
    await nextTick();

    const nodeAfter = explorer.pathExplorerSankeyData.value.nodes.find(
      (n) => n.entityKey === "A0003",
    );
    expect(nodeAfter).toBeDefined();
    expect(nodeAfter!.displayName).toContain("en-US");
    expect(nodeAfter!.displayName).not.toBe(nodeBefore!.displayName);
  });

  it("falls back unknown entity ids to risk node styling", async () => {
    const { explorer, endKey } = createExplorer({
      startKey: "T0001",
      maxDepth: 2,
    });

    endKey.value = "A0001";
    await nextTick();
    vi.runAllTimers();

    const startNode = explorer.pathExplorerSankeyData.value.nodes.find(
      (node) => node.entityKey === "T0001",
    );
    expect(startNode).toEqual(
      expect.objectContaining({
        entityType: RelationType.term,
        itemStyle: { color: "#111" },
      }),
    );
  });
});

// === 节点详情「与根节点关系」：起点→被点击节点子路径推导 ===

describe("buildPathExplorerRootPathSummary", () => {
  const getNodeType = (id: string): RelationType => {
    if (id.startsWith("AT")) return RelationType.attackTool;
    if (id.startsWith("TA")) return RelationType.threatActor;
    if (id.startsWith("R")) return RelationType.risk;
    if (id.startsWith("A")) return RelationType.avoidance;
    return RelationType.risk;
  };
  const baseDeps = {
    getNodeType,
    getNodeTitle: (type: RelationType, key: string) => `title:${type}:${key}`,
    getNodeTypeTitle: (type: string) => `typeTitle:${type}`,
    isDirectRelationLine: (lineKey: string) => lineKey.includes("direct"),
    getRelationSourceFields: (line: { relationKey: string }) => [
      line.relationKey,
    ],
    getRelationLineKey: (line: { relationKey: string; text: string }) =>
      getRelationLineKey(line),
    t: (key: string) => `t:${key}`,
  };

  // 路径：TA0001 →(构建) AT0001 →(直接造成) R0001 →(规避) A0001
  const makeLine = (from: string, to: string, text: string, relationKey: string) =>
    ({ from, to, text, relationKey }) as never;

  const path: import("../relationPathDiscovery").DiscoveredRelationPath = {
    startId: "TA0001",
    endId: "A0001",
    hopCount: 3,
    steps: [
      { fromId: "TA0001", toId: "AT0001", line: makeLine("TA0001", "AT0001", "构建", "threatActor-buildAttackTool") },
      { fromId: "AT0001", toId: "R0001", line: makeLine("AT0001", "R0001", "直接造成", "attackTool-directCauseRisk") },
      { fromId: "R0001", toId: "A0001", line: makeLine("R0001", "A0001", "规避", "risk-avoidance") },
    ],
  };

  it("returns null when clicked node is the start entity (root)", () => {
    expect(
      buildPathExplorerRootPathSummary({
        ...baseDeps,
        discoveredPaths: [path],
        clickedId: "TA0001",
        startId: "TA0001",
      }),
    ).toBeNull();
  });

  it("returns null when discoveredPaths is empty", () => {
    expect(
      buildPathExplorerRootPathSummary({
        ...baseDeps,
        discoveredPaths: [],
        clickedId: "AT0001",
        startId: "TA0001",
      }),
    ).toBeNull();
  });

  it("returns null when clicked node is not on any discovered path", () => {
    expect(
      buildPathExplorerRootPathSummary({
        ...baseDeps,
        discoveredPaths: [path],
        clickedId: "R0099",
        startId: "TA0001",
      }),
    ).toBeNull();
  });

  it("returns full path when clicked node is the end entity", () => {
    const summary = buildPathExplorerRootPathSummary({
      ...baseDeps,
      discoveredPaths: [path],
      clickedId: "A0001",
      startId: "TA0001",
    });
    expect(summary).not.toBeNull();
    expect(summary!.hopCount).toBe(3);
    expect(summary!.startNode).toEqual({
      id: "TA0001",
      type: "typeTitle:threat-actor",
      title: "title:threat-actor:TA0001",
    });
    expect(summary!.steps.length).toBe(3);
    expect(summary!.steps[2]!.isCurrentTarget).toBe(true);
    expect(summary!.steps[1]!.isCurrentTarget).toBe(false);
    expect(summary!.steps[2]!.targetNode.id).toBe("A0001");
  });

  it("returns truncated sub-path when clicking an intermediate node", () => {
    const summary = buildPathExplorerRootPathSummary({
      ...baseDeps,
      discoveredPaths: [path],
      clickedId: "R0001",
      startId: "TA0001",
    });
    expect(summary).not.toBeNull();
    // TA0001 → AT0001 → R0001 = 2 跳
    expect(summary!.hopCount).toBe(2);
    expect(summary!.steps.length).toBe(2);
    expect(summary!.steps[0]!.targetNode.id).toBe("AT0001");
    expect(summary!.steps[1]!.targetNode.id).toBe("R0001");
    expect(summary!.steps[1]!.isCurrentTarget).toBe(true);
    expect(summary!.steps[0]!.isCurrentTarget).toBe(false);
  });

  it("computes direction and directness relative to each step source", () => {
    const summary = buildPathExplorerRootPathSummary({
      ...baseDeps,
      discoveredPaths: [path],
      clickedId: "R0001",
      startId: "TA0001",
    });
    expect(summary).not.toBeNull();
    // TA0001→AT0001：line.from === step.fromId → outgoing
    expect(summary!.steps[0]!.relation.direction).toBe("t:relationView.outgoing");
    // 关系 key 含 "direct" → direct
    expect(summary!.steps[1]!.relation.directness).toBe("t:relationView.direct");
    // TA0001→AT0001 的 buildAttackTool 不含 direct → indirect
    expect(summary!.steps[0]!.relation.directness).toBe(
      "t:relationView.indirect",
    );
    // sourceFields 来自 relationKey
    expect(summary!.steps[0]!.relation.sourceFields).toEqual([
      "threatActor-buildAttackTool",
    ]);
  });
});

// === 路径探索 computed 集成：pathExplorerNodeRootPath / pathExplorerIsCurrentNodeRoot ===

describe("pathExplorerNodeRootPath computed", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is null before any search, and true isCurrentNodeRoot when selection is start", async () => {
    const { explorer, selectedNetworkNodeId, startKey } = createExplorer({
      startKey: "TA0001",
      endType: RelationType.avoidance,
    });

    expect(explorer.pathExplorerNodeRootPath.value).toBeNull();
    expect(explorer.pathExplorerIsCurrentNodeRoot.value).toBe(false);

    // 选中起点实体 → 视为根节点
    selectedNetworkNodeId.value = startKey.value;
    expect(explorer.pathExplorerIsCurrentNodeRoot.value).toBe(true);
    // 起点自身的根路径为 null（抽屉走 currentNodeIsRoot）
    expect(explorer.pathExplorerNodeRootPath.value).toBeNull();
  });

  it("builds sub-path to clicked intermediate node after search", async () => {
    const { explorer, endKey, selectedNetworkNodeId } = createExplorer({
      startKey: "TA0001",
      endType: RelationType.avoidance,
    });

    endKey.value = "A0001";
    await nextTick();
    vi.runAllTimers();

    expect(explorer.pathExplorerHasData.value).toBe(true);

    // 点击中间节点 R0001
    selectedNetworkNodeId.value = "R0001";
    const summary = explorer.pathExplorerNodeRootPath.value;
    expect(summary).not.toBeNull();
    expect(summary!.startNode.id).toBe("TA0001");
    expect(summary!.steps[summary!.steps.length - 1]!.targetNode.id).toBe(
      "R0001",
    );
    expect(
      summary!.steps[summary!.steps.length - 1]!.isCurrentTarget,
    ).toBe(true);
  });
});
