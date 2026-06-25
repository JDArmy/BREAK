import { describe, expect, it } from "vitest";
import { findRelationPaths } from "../relationPathDiscovery";
import type { Line } from "../relationTypes";

describe("relationPathDiscovery", () => {
  const lines: Line[] = [
    { from: "ROOT", relationKey: "slow", text: "慢路径", to: "B" },
    { from: "ROOT", relationKey: "fast", text: "快路径", to: "A" },
    { from: "A", relationKey: "fast", text: "快路径", to: "TARGET" },
    { from: "B", relationKey: "slow", text: "慢路径", to: "C" },
    { from: "C", relationKey: "slow", text: "慢路径", to: "TARGET" },
    { from: "C", relationKey: "loop", text: "回环", to: "ROOT" },
  ];

  it("finds prioritized shortest paths without looping", () => {
    const paths = findRelationPaths({
      lines,
      startId: "ROOT",
      endId: "TARGET",
      getRelationPriority: (key) => ({ fast: 0, slow: 1, loop: 9 })[key] ?? 9,
    });

    expect(paths[0]).toEqual({
      startId: "ROOT",
      endId: "TARGET",
      hopCount: 2,
      steps: [
        expect.objectContaining({ fromId: "ROOT", toId: "A" }),
        expect.objectContaining({ fromId: "A", toId: "TARGET" }),
      ],
    });
    expect(paths.map((path) => path.hopCount)).toEqual([2, 2, 3]);
  });

  it("respects maxDepth and maxPaths limits", () => {
    expect(
      findRelationPaths({
        lines,
        startId: "ROOT",
        endId: "TARGET",
        maxDepth: 2,
        maxPaths: 1,
      })
    ).toHaveLength(1);

    expect(
      findRelationPaths({
        lines,
        startId: "ROOT",
        endId: "TARGET",
        maxDepth: 1,
      })
    ).toEqual([]);
  });

  it("distinguishes directed and undirected discovery", () => {
    const directedOnlyLine: Line = {
      from: "TARGET",
      relationKey: "reverse",
      text: "反向",
      to: "ROOT",
    };

    expect(
      findRelationPaths({
        lines: [directedOnlyLine],
        startId: "ROOT",
        endId: "TARGET",
        directed: true,
      })
    ).toEqual([]);
    expect(
      findRelationPaths({
        lines: [directedOnlyLine],
        startId: "ROOT",
        endId: "TARGET",
      })[0]?.steps
    ).toEqual([
      expect.objectContaining({
        fromId: "ROOT",
        toId: "TARGET",
        line: directedOnlyLine,
      }),
    ]);
  });

  it("caps breadth-first expansion for dense relation graphs", () => {
    const denseLines: Line[] = [];
    for (let index = 0; index < 30; index += 1) {
      denseLines.push({
        from: "ROOT",
        relationKey: "dense",
        text: "密集关系",
        to: `RISK-${index.toString().padStart(2, "0")}`,
      });
      denseLines.push({
        from: `RISK-${index.toString().padStart(2, "0")}`,
        relationKey: "dense",
        text: "密集关系",
        to: "TARGET",
      });
    }

    expect(
      findRelationPaths({
        lines: denseLines,
        startId: "ROOT",
        endId: "TARGET",
        maxDepth: 2,
        maxPaths: 5,
        maxExpansions: 1,
      }),
    ).toEqual([]);
    expect(
      findRelationPaths({
        lines: denseLines,
        startId: "ROOT",
        endId: "TARGET",
        maxDepth: 2,
        maxPaths: 5,
        maxExpansions: 40,
      }),
    ).toHaveLength(5);
  });

  // === 双向 BFS 专项测试 ===

  it("returns empty for invalid inputs", () => {
    expect(findRelationPaths({ lines, startId: "", endId: "TARGET" })).toEqual([]);
    expect(findRelationPaths({ lines, startId: "ROOT", endId: "" })).toEqual([]);
    expect(findRelationPaths({ lines, startId: "ROOT", endId: "ROOT" })).toEqual([]);
    expect(findRelationPaths({ lines, startId: "ROOT", endId: "TARGET", maxDepth: 0 })).toEqual([]);
    expect(findRelationPaths({ lines, startId: "ROOT", endId: "TARGET", maxPaths: 0 })).toEqual([]);
    expect(findRelationPaths({ lines, startId: "ROOT", endId: "TARGET", maxExpansions: 0 })).toEqual([]);
  });

  it("finds direct 1-hop path", () => {
    const paths = findRelationPaths({
      lines: [{ from: "S", relationKey: "direct", text: "直连", to: "E" }],
      startId: "S",
      endId: "E",
    });
    expect(paths).toHaveLength(1);
    expect(paths[0].hopCount).toBe(1);
    expect(paths[0].steps[0]).toEqual(expect.objectContaining({ fromId: "S", toId: "E" }));
  });

  it("finds multi-hop paths across a chain", () => {
    const chainLines: Line[] = [
      { from: "A", relationKey: "r", text: "", to: "B" },
      { from: "B", relationKey: "r", text: "", to: "C" },
      { from: "C", relationKey: "r", text: "", to: "D" },
      { from: "D", relationKey: "r", text: "", to: "E" },
    ];
    const paths = findRelationPaths({
      lines: chainLines,
      startId: "A",
      endId: "E",
      maxDepth: 6,
    });
    expect(paths.length).toBeGreaterThanOrEqual(1);
    expect(paths[0].hopCount).toBe(4);
  });

  it("deduplicates paths found from both sides meeting at same node", () => {
    // 对称图谱：S→M←E，双向 BFS 从两侧都能到达 M
    const symmetricLines: Line[] = [
      { from: "S", relationKey: "r", text: "", to: "M" },
      { from: "E", relationKey: "r", text: "", to: "M" },
    ];
    const paths = findRelationPaths({
      lines: symmetricLines,
      startId: "S",
      endId: "E",
      maxDepth: 4,
      maxPaths: 10,
    });
    // 无向图中应找到 S→M→E（2 跳），不应有重复
    expect(paths).toHaveLength(1);
    expect(paths[0].hopCount).toBe(2);
  });

  it("returns no path when start and end are disconnected", () => {
    const disconnected: Line[] = [
      { from: "A", relationKey: "r", text: "", to: "B" },
      { from: "X", relationKey: "r", text: "", to: "Y" },
    ];
    const paths = findRelationPaths({
      lines: disconnected,
      startId: "A",
      endId: "Y",
      maxDepth: 4,
    });
    expect(paths).toEqual([]);
  });

  it("avoids cycles in discovered paths", () => {
    // A→B→C→A→B→...不应产生环路路径
    const cyclicLines: Line[] = [
      { from: "A", relationKey: "r", text: "", to: "B" },
      { from: "B", relationKey: "r", text: "", to: "C" },
      { from: "C", relationKey: "r", text: "", to: "A" },
      { from: "C", relationKey: "r", text: "", to: "D" },
    ];
    const paths = findRelationPaths({
      lines: cyclicLines,
      startId: "A",
      endId: "D",
      maxDepth: 6,
    });
    for (const path of paths) {
      const nodeSequence = ["A", ...path.steps.map(s => s.toId)];
      const uniqueNodes = new Set(nodeSequence);
      expect(uniqueNodes.size).toBe(nodeSequence.length);
    }
  });

  it("sorts results by hop count ascending", () => {
    // 提供短路和长路
    const mixedLines: Line[] = [
      { from: "S", relationKey: "r", text: "", to: "E" }, // 1 跳直连
      { from: "S", relationKey: "r", text: "", to: "M1" },
      { from: "M1", relationKey: "r", text: "", to: "E" }, // 2 跳
      { from: "S", relationKey: "r", text: "", to: "M2" },
      { from: "M2", relationKey: "r", text: "", to: "M3" },
      { from: "M3", relationKey: "r", text: "", to: "E" }, // 3 跳
    ];
    const paths = findRelationPaths({
      lines: mixedLines,
      startId: "S",
      endId: "E",
      maxDepth: 4,
      maxPaths: 10,
    });
    expect(paths.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < paths.length; i++) {
      expect(paths[i].hopCount).toBeGreaterThanOrEqual(paths[i - 1].hopCount);
    }
  });

  it("backward frontier expands first when it is smaller", () => {
    // 起点连接很多节点（宽前沿），终点只连少量节点
    // 这会触发反向侧先展开
    const wideStartLines: Line[] = [];
    for (let i = 0; i < 20; i++) {
      wideStartLines.push({ from: "S", relationKey: "r", text: "", to: `N${i}` });
    }
    // 终点只有一条路：E←M←N5
    wideStartLines.push({ from: "M", relationKey: "r", text: "", to: "E" });
    wideStartLines.push({ from: "N5", relationKey: "r", text: "", to: "M" });

    const paths = findRelationPaths({
      lines: wideStartLines,
      startId: "S",
      endId: "E",
      maxDepth: 4,
      maxPaths: 5,
    });
    expect(paths.length).toBeGreaterThanOrEqual(1);
    expect(paths[0].hopCount).toBe(3); // S→N5→M→E
  });

  it("stops early when maxPaths reached during expansion", () => {
    // 100 条从 S 直连 M_i，每条 M_i 直连 E → 100 条 2-hop 路径
    const manyPathLines: Line[] = [];
    for (let i = 0; i < 100; i++) {
      manyPathLines.push({ from: "S", relationKey: "r", text: "", to: `M${i}` });
      manyPathLines.push({ from: `M${i}`, relationKey: "r", text: "", to: "E" });
    }
    const paths = findRelationPaths({
      lines: manyPathLines,
      startId: "S",
      endId: "E",
      maxDepth: 3,
      maxPaths: 7,
    });
    expect(paths).toHaveLength(7);
  });

  it("handles directed graph with forward-only reachability", () => {
    // 有向图：S→A→B→E，但无反向边
    const directedChain: Line[] = [
      { from: "S", relationKey: "r", text: "", to: "A" },
      { from: "A", relationKey: "r", text: "", to: "B" },
      { from: "B", relationKey: "r", text: "", to: "E" },
    ];
    const paths = findRelationPaths({
      lines: directedChain,
      startId: "S",
      endId: "E",
      maxDepth: 4,
      directed: true,
    });
    expect(paths).toHaveLength(1);
    expect(paths[0].hopCount).toBe(3);
  });

  it("respects maxPaths * 3 limit on stored intermediate paths", () => {
    // 非常密集的中间层——每个节点存储的路径数被限制
    const denseMiddle: Line[] = [];
    for (let i = 0; i < 50; i++) {
      denseMiddle.push({ from: "S", relationKey: "r", text: "", to: `A${i}` });
      for (let j = 0; j < 5; j++) {
        denseMiddle.push({ from: `A${i}`, relationKey: "r", text: "", to: `B${j}` });
      }
    }
    denseMiddle.push({ from: "B0", relationKey: "r", text: "", to: "E" });

    const paths = findRelationPaths({
      lines: denseMiddle,
      startId: "S",
      endId: "E",
      maxDepth: 4,
      maxPaths: 3,
      maxExpansions: 200,
    });
    // 应该找到路径且不崩溃
    expect(paths.length).toBeGreaterThanOrEqual(1);
    expect(paths.length).toBeLessThanOrEqual(3);
  });
});
