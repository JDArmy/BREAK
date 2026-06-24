import { computed, ref } from "vue";
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
    endKey: ref(options?.endKey ?? "AT0001"),
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

  it("keeps sankey data empty before discovery", () => {
    const explorer = createExplorer();

    expect(explorer.searchTriggered.value).toBe(false);
    expect(explorer.pathExplorerHasData.value).toBe(false);
    expect(explorer.pathExplorerSankeyData.value).toEqual({ nodes: [], links: [] });
    expect(explorer.pathExplorerChartHeight.value).toBe(0);
    expect(explorer.pathExplorerStats.value).toBeNull();
  });

  it("marks empty discovery when endpoints are invalid", () => {
    const explorer = createExplorer({ startKey: "R0001", endKey: "R0001" });

    explorer.discoverPaths();

    expect(explorer.searchTriggered.value).toBe(true);
    expect(explorer.searching.value).toBe(false);
    expect(explorer.discoveredPaths.value).toEqual([]);
    expect(explorer.pathExplorerHasData.value).toBe(false);
  });

  it("builds sankey nodes, merged links, stats, and desktop height after discovery", () => {
    const explorer = createExplorer();

    explorer.discoverPaths();
    expect(explorer.searching.value).toBe(true);
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

  it("uses mobile height constraints for dense path layers", () => {
    const denseLines: Line[] = Array.from({ length: 100 }, (_, index) => ({
      from: "R0001",
      relationKey: "dense",
      text: "密集关系",
      to: `A${index.toString().padStart(4, "0")}`,
    }));
    const explorer = createExplorer({
      isMobile: true,
      endKey: "A0099",
      lines: denseLines,
    });

    explorer.discoverPaths();
    vi.runAllTimers();

    expect(explorer.pathExplorerSankeyData.value.nodes.length).toBeGreaterThan(1);
    expect(explorer.pathExplorerChartHeight.value).toBeGreaterThanOrEqual(400);
    expect(explorer.pathExplorerChartHeight.value).toBeLessThanOrEqual(3200);
  });
});
