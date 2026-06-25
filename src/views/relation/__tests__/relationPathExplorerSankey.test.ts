import { computed, nextTick, ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRelationPathExplorerSankey } from "../relationPathExplorerSankey";
import { createRelationTypeMapping, RelationType } from "../relationTypes";

// mock BREAK 全局数据——只需关系字段
vi.mock("@/BREAK", () => ({
  default: {
    risks: {
      R0001: { avoidances: ["A0001", "A0002"] },
      R0002: { avoidances: ["A0002"] },
    },
    avoidances: {
      A0001: {},
      A0002: {},
    },
    attackTools: {
      AT0001: {
        directCauseRisks: ["R0001"],
        indirectSupportRisks: [],
        avoidances: ["A0001"],
      },
    },
    threatActors: {
      TA0001: {
        directCauseRisks: ["R0001"],
        indirectSupportRisks: [],
        buildAttackTools: ["AT0001"],
        useAttackTools: [],
      },
    },
    terms: {},
  },
}));

const relationTypeMapping = createRelationTypeMapping((key) => key, () => "#111");

const createExplorer = (options?: {
  startKey?: string;
  endKey?: string;
  isMobile?: boolean;
}) =>
  createRelationPathExplorerSankey({
    startType: ref(RelationType.risk),
    startKey: ref(options?.startKey ?? "R0001"),
    endType: ref(RelationType.avoidance),
    endKey: ref(options?.endKey ?? ""),
    maxDepth: ref(4),
    maxPaths: ref(10),
    getSankeyNodeName: (_type, key) => `node:${key}`,
    isMobile: computed(() => options?.isMobile ?? false),
    RelationTypeMapping: relationTypeMapping,
  });

describe("relationPathExplorerSankey", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("keeps sankey data empty when no target selected", () => {
    const explorer = createExplorer();

    expect(explorer.hasTarget.value).toBe(false);
    expect(explorer.pathExplorerHasData.value).toBe(false);
    expect(explorer.pathExplorerSankeyData.value).toEqual({ nodes: [], links: [] });
    expect(explorer.pathExplorerChartHeight.value).toBe(0);
    expect(explorer.pathExplorerStats.value).toBeNull();
  });

  it("returns empty when start equals end", async () => {
    const endKey = ref("R0001");
    const explorer = createRelationPathExplorerSankey({
      startType: ref(RelationType.risk),
      startKey: ref("R0001"),
      endType: ref(RelationType.risk),
      endKey,
      maxDepth: ref(3),
      maxPaths: ref(10),
      getSankeyNodeName: (_type, key) => `node:${key}`,
      isMobile: computed(() => false),
      RelationTypeMapping: relationTypeMapping,
    });

    await nextTick();
    vi.runAllTimers();

    expect(explorer.discoveredPaths.value).toEqual([]);
    expect(explorer.pathExplorerHasData.value).toBe(false);
  });

  it("auto-discovers paths from global BREAK data when endKey set", async () => {
    const endKey = ref("");
    const explorer = createRelationPathExplorerSankey({
      startType: ref(RelationType.risk),
      startKey: ref("R0001"),
      endType: ref(RelationType.avoidance),
      endKey,
      maxDepth: ref(4),
      maxPaths: ref(10),
      getSankeyNodeName: (_type, key) => `node:${key}`,
      isMobile: computed(() => false),
      RelationTypeMapping: relationTypeMapping,
    });

    // R0001 → A0001 是直连关系（R0001.avoidances 包含 A0001）
    endKey.value = "A0001";
    await nextTick();
    vi.runAllTimers();

    expect(explorer.searching.value).toBe(false);
    expect(explorer.discoveredPaths.value.length).toBeGreaterThanOrEqual(1);
    expect(explorer.pathExplorerHasData.value).toBe(true);

    // 验证能找到直达路径（1 跳）
    const directPath = explorer.discoveredPaths.value.find((p) => p.hopCount === 1);
    expect(directPath).toBeDefined();
    expect(directPath!.startId).toBe("R0001");
    expect(directPath!.endId).toBe("A0001");
  });

  it("finds multi-hop paths through intermediate entities", async () => {
    const endKey = ref("");
    const explorer = createRelationPathExplorerSankey({
      startType: ref(RelationType.threatActor),
      startKey: ref("TA0001"),
      endType: ref(RelationType.avoidance),
      endKey,
      maxDepth: ref(4),
      maxPaths: ref(10),
      getSankeyNodeName: (_type, key) => `node:${key}`,
      isMobile: computed(() => false),
      RelationTypeMapping: relationTypeMapping,
    });

    // TA0001 → AT0001 → R0001 → A0001（3 跳）或 TA0001 → R0001 → A0001（2 跳）
    endKey.value = "A0001";
    await nextTick();
    vi.runAllTimers();

    expect(explorer.discoveredPaths.value.length).toBeGreaterThanOrEqual(1);
    expect(explorer.pathExplorerStats.value).not.toBeNull();
    expect(explorer.pathExplorerStats.value!.minHops).toBeGreaterThanOrEqual(1);
  });

  it("uses mobile height constraints", async () => {
    const endKey = ref("");
    const explorer = createRelationPathExplorerSankey({
      startType: ref(RelationType.risk),
      startKey: ref("R0001"),
      endType: ref(RelationType.avoidance),
      endKey,
      maxDepth: ref(4),
      maxPaths: ref(10),
      getSankeyNodeName: (_type, key) => `node:${key}`,
      isMobile: computed(() => true),
      RelationTypeMapping: relationTypeMapping,
    });

    endKey.value = "A0001";
    await nextTick();
    vi.runAllTimers();

    expect(explorer.pathExplorerChartHeight.value).toBeGreaterThanOrEqual(400);
    expect(explorer.pathExplorerChartHeight.value).toBeLessThanOrEqual(3200);
  });
});
