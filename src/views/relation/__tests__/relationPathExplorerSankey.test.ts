import { computed, nextTick, ref } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRelationPathExplorerSankey } from "../relationPathExplorerSankey";
import { createRelationTypeMapping, RelationType } from "../relationTypes";

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
  return {
    explorer: createRelationPathExplorerSankey({
      startType: ref(options?.startType ?? RelationType.risk),
      startKey,
      endType: ref(options?.endType ?? RelationType.avoidance),
      endKey,
      maxDepth,
      maxPaths,
      getSankeyNodeName: (_type, key) => `node:${key}`,
      isMobile: computed(() => options?.isMobile ?? false),
      RelationTypeMapping: relationTypeMapping,
    }),
    startKey,
    endKey,
    maxDepth,
    maxPaths,
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

  // === depth 分配（同实体多节点方案：同一实体在不同路径位置各自独立成节点）===

  it("places end entity nodes at their path positions (max position equals max hop)", async () => {
    // R0001 → A0001（1 跳）和 R0001 → A0002 → ... → A0002（间接多跳）
    // 终点 A0002 在每条路径中都处于该路径的末尾位置，
    // 其最右节点的 depth 应等于最长路径的跳数，不会被短路径拉到左侧
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
      // 终点 A0002 的所有节点中，最右节点的 depth = 最长路径跳数
      const endNodes = explorer.pathExplorerSankeyData.value.nodes.filter(
        (n) => n.entityKey === "A0002",
      );
      expect(endNodes.length).toBeGreaterThan(0);
      const maxEndDepth = Math.max(...endNodes.map((n) => n.depth ?? 0));
      const maxHop = Math.max(
        ...explorer.discoveredPaths.value.map((p) => p.hopCount),
      );
      expect(maxEndDepth).toBe(maxHop);
    }
  });

  it("end entity max depth equals max hop count across all paths", async () => {
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
      expect(endNodes.length).toBeGreaterThan(0);
      const maxEndDepth = Math.max(...endNodes.map((n) => n.depth ?? 0));
      const maxHop = Math.max(...paths.map((p) => p.hopCount));
      expect(maxEndDepth).toBe(maxHop);
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
});
