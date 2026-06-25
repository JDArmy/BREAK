import { computed, nextTick, ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRelationPathExplorerSankey } from "../relationPathExplorerSankey";
import { createRelationTypeMapping, RelationType, type Line } from "../relationTypes";

const relationTypeMapping = createRelationTypeMapping((key) => key, () => "#111");

const createExplorer = (options?: {
  startKey?: string;
  endKey?: string;
  isMobile?: boolean;
  lines?: Line[];
}) =>
  createRelationPathExplorerSankey({
    lines: options?.lines ?? [
      { from: "R0001", relationKey: "risk-avoidance", text: "关联", to: "A0001" },
      { from: "A0001", relationKey: "avoidance-tool", text: "关联", to: "AT0001" },
      { from: "R0001", relationKey: "risk-tool", text: "关联", to: "AT0001" },
    ],
    startType: ref(RelationType.risk),
    startKey: ref(options?.startKey ?? "R0001"),
    endType: ref(RelationType.attackTool),
    endKey: ref(options?.endKey ?? ""),
    maxDepth: ref(3),
    maxPaths: ref(10),
    getSankeyNodeName: (_type, key) => `node:${key}`,
    isMobile: computed(() => options?.isMobile ?? false),
    RelationTypeMapping: relationTypeMapping,
    getNodeIds: () => new Set(["R0001", "A0001", "AT0001"]),
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

  it("returns empty when start equals end", () => {
    const endKey = ref("R0001");
    const explorer = createRelationPathExplorerSankey({
      lines: [{ from: "R0001", relationKey: "x", text: "x", to: "A0001" }],
      startType: ref(RelationType.risk),
      startKey: ref("R0001"),
      endType: ref(RelationType.risk),
      endKey,
      maxDepth: ref(3),
      maxPaths: ref(10),
      getSankeyNodeName: (_type, key) => `node:${key}`,
      isMobile: computed(() => false),
      RelationTypeMapping: relationTypeMapping,
      getNodeIds: () => new Set(["R0001", "A0001"]),
    });

    // watch 触发搜索
    vi.runAllTimers();

    expect(explorer.discoveredPaths.value).toEqual([]);
    expect(explorer.pathExplorerHasData.value).toBe(false);
  });

  it("auto-discovers paths when endKey changes and builds sankey data", async () => {
    const endKey = ref("");
    const explorer = createRelationPathExplorerSankey({
      lines: [
        { from: "R0001", relationKey: "risk-avoidance", text: "关联", to: "A0001" },
        { from: "A0001", relationKey: "avoidance-tool", text: "关联", to: "AT0001" },
        { from: "R0001", relationKey: "risk-tool", text: "关联", to: "AT0001" },
      ],
      startType: ref(RelationType.risk),
      startKey: ref("R0001"),
      endType: ref(RelationType.attackTool),
      endKey,
      maxDepth: ref(3),
      maxPaths: ref(10),
      getSankeyNodeName: (_type, key) => `node:${key}`,
      isMobile: computed(() => false),
      RelationTypeMapping: relationTypeMapping,
      getNodeIds: () => new Set(["R0001", "A0001", "AT0001"]),
    });

    // 设置终点触发自动搜索
    endKey.value = "AT0001";
    await nextTick();
    vi.runAllTimers();

    expect(explorer.searching.value).toBe(false);
    expect(explorer.discoveredPaths.value).toHaveLength(2);
    expect(explorer.pathExplorerStats.value).toEqual({
      pathCount: 2,
      minHops: 1,
      maxHops: 2,
    });
    expect(explorer.pathExplorerSankeyData.value.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ entityKey: "R0001", depth: 0, entityType: RelationType.risk }),
        expect.objectContaining({ entityKey: "A0001", depth: 1, entityType: RelationType.avoidance }),
        expect.objectContaining({ entityKey: "AT0001", depth: 1, entityType: RelationType.attackTool }),
      ]),
    );
    expect(explorer.pathExplorerSankeyData.value.links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: "node:R0001", target: "node:A0001", value: 1 }),
        expect.objectContaining({ source: "node:R0001", target: "node:AT0001", value: 1 }),
        expect.objectContaining({ source: "node:A0001", target: "node:AT0001", value: 1 }),
      ]),
    );
    expect(explorer.pathExplorerHasData.value).toBe(true);
    expect(explorer.pathExplorerChartHeight.value).toBe(400);
  });

  it("uses mobile height constraints for dense path layers", async () => {
    const denseLines: Line[] = Array.from({ length: 100 }, (_, index) => ({
      from: "R0001",
      relationKey: "dense",
      text: "密集关系",
      to: `A${index.toString().padStart(4, "0")}`,
    }));
    const endKey = ref("");
    const explorer = createRelationPathExplorerSankey({
      lines: denseLines,
      startType: ref(RelationType.risk),
      startKey: ref("R0001"),
      endType: ref(RelationType.avoidance),
      endKey,
      maxDepth: ref(3),
      maxPaths: ref(10),
      getSankeyNodeName: (_type, key) => `node:${key}`,
      isMobile: computed(() => true),
      RelationTypeMapping: relationTypeMapping,
      getNodeIds: () => new Set(["R0001"]),
    });

    endKey.value = "A0099";
    await nextTick();
    vi.runAllTimers();

    expect(explorer.pathExplorerSankeyData.value.nodes.length).toBeGreaterThan(1);
    expect(explorer.pathExplorerChartHeight.value).toBeGreaterThanOrEqual(400);
    expect(explorer.pathExplorerChartHeight.value).toBeLessThanOrEqual(3200);
  });
});
