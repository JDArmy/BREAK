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
});
