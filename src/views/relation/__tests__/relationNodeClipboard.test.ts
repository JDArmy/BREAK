import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { createCopyContextNodeCsv } from "../relationNodeClipboard";
import { createRelationTypeMapping, RelationType, type Line, type Node } from "../relationTypes";

const nodes: Record<string, Node> = {
  R0001: {
    id: "R0001",
    type: RelationType.risk,
    text: "R0001\n风险",
    color: "#ef4444",
  },
  A0001: {
    id: "A0001",
    type: RelationType.avoidance,
    text: "A0001\n规避 \"手段\"",
    color: "#22c55e",
  },
};

const lines: Line[] = [
  {
    from: "R0001",
    to: "A0001",
    text: "规避",
    relationKey: "relationLine.avoidanceMeans",
  },
];

const createCopyCsv = (options?: {
  contextNodeId?: string;
  explainRelation?: ReturnType<typeof vi.fn>;
  formatEvidenceLevel?: ReturnType<typeof vi.fn>;
  getRelationSourceFields?: ReturnType<typeof vi.fn>;
  isDirectRelationLine?: ReturnType<typeof vi.fn>;
  lines?: Line[];
  writeText?: (text: string) => Promise<void>;
}) => {
  const writeText = vi.fn(options?.writeText ?? (() => Promise.resolve()));
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });

  const copyCsv = createCopyContextNodeCsv({
    t: (key) => `t:${key}`,
    relKey: ref("R0001"),
    lines: options?.lines ?? lines,
    RelationTypeMapping: createRelationTypeMapping(
      (key) => `t:${key}`,
      (type) => `color:${type}`,
    ),
    findNodeById: vi.fn((id: string) => nodes[id]),
    buildNodeSummary: vi.fn((id: string) => ({
      id,
      isSubNode: id === "A0001",
      title: id === "A0001" ? '规避 "手段"' : "风险",
      type: nodes[id]?.type ?? RelationType.risk,
    })),
    isDirectRelationLine:
      options?.isDirectRelationLine ??
      vi.fn((lineText: string) => lineText === "relationLine.avoidanceMeans"),
    getRelationSourceFields:
      options?.getRelationSourceFields ??
      vi.fn(() => ["Risk.avoidances", "AttackTool.avoidances"]),
    explainRelation: Object.hasOwn(options ?? {}, "explainRelation")
      ? options?.explainRelation
      : vi.fn(() => ({
          evidenceLevel: "direct",
          explanation: "风险通过该手段缓解",
          fromId: "R0001",
          impactHint: "降低暴露面",
          qualityFlags: ["primary", "reviewed"],
          relationKey: "relationLine.avoidanceMeans",
          relationType: "avoidance",
          sourceFields: ["Risk.avoidances"],
          toId: "A0001",
        })),
    formatEvidenceLevel:
      Object.hasOwn(options ?? {}, "formatEvidenceLevel")
        ? options?.formatEvidenceLevel
        : vi.fn((level: string) => `证据:${level}`),
    getContextNodeId: () => options?.contextNodeId ?? "R0001",
  });

  return { copyCsv, writeText };
};

describe("relationNodeClipboard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("writes node and relation context as escaped CSV sections", async () => {
    const { copyCsv, writeText } = createCopyCsv();

    const result = await copyCsv();

    expect(result).toEqual({ ok: true, message: "t:relationView.copySuccess" });
    expect(writeText).toHaveBeenCalledTimes(1);
    const csv = writeText.mock.calls[0][0];
    expect(csv).toContain("t:relationView.csvNodes");
    expect(csv).toContain("t:relationView.csvRelations");
    expect(csv).toContain('"R0001","risk","风险","t:relationView.csvRoleRoot"');
    expect(csv).toContain('"A0001","avoidance","规避 ""手段""","t:relationView.csvRoleRelated"');
    expect(csv).toContain('"t:relationLine.avoidanceMeans"');
    expect(csv).toContain('"t:relationView.direct"');
    expect(csv).toContain('"证据:direct"');
    expect(csv).toContain('"风险通过该手段缓解"');
    expect(csv).toContain('"primary | reviewed"');
    expect(csv).toContain('"Risk.avoidances | AttackTool.avoidances"');
  });

  it("returns a failure result when the context node is missing", async () => {
    const { copyCsv, writeText } = createCopyCsv({ contextNodeId: "UNKNOWN" });

    await expect(copyCsv()).resolves.toEqual({
      ok: false,
      message: "t:relationView.copyFailed",
    });
    expect(writeText).not.toHaveBeenCalled();
  });

  it("returns a failure result when clipboard write rejects", async () => {
    const { copyCsv } = createCopyCsv({
      writeText: () => Promise.reject(new Error("denied")),
    });

    await expect(copyCsv()).resolves.toEqual({
      ok: false,
      message: "t:relationView.copyFailed",
    });
  });

  it("writes indirect relations without optional explanation fields", async () => {
    const { copyCsv, writeText } = createCopyCsv({
      explainRelation: undefined,
      formatEvidenceLevel: undefined,
      getRelationSourceFields: vi.fn(() => []),
      isDirectRelationLine: vi.fn(() => false),
    });

    const result = await copyCsv();

    expect(result.ok).toBe(true);
    const csv = writeText.mock.calls[0][0];
    expect(csv).toContain('"t:relationView.indirect"');
    expect(csv).toContain('"","","","","A0001"');
  });
});
