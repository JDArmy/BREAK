import type { RelationNodeActionBaseOptions, Translate } from "@/views/relation/relationNodeActionShared";
import { getRelationLineKey } from "@/views/relation/relationTypes";

interface CreateCopyContextNodeCsvOptions extends RelationNodeActionBaseOptions {
  t: Translate;
  getContextNodeId: () => string;
}

const toCsvCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, "\"\"")}"`;

export const createCopyContextNodeCsv = ({
  t,
  lines,
  findNodeById,
  buildNodeSummary,
  isDirectRelationLine,
  getRelationSourceFields,
  explainRelation,
  formatEvidenceLevel,
  getContextNodeId,
}: CreateCopyContextNodeCsvOptions) => async () => {
  const node = findNodeById(getContextNodeId());
  if (!node) {
    return { ok: false as const, message: t("relationView.copyFailed") };
  }

  const centerNode = buildNodeSummary(node.id);
  const relationLines = lines.filter((line) => line.from === node.id || line.to === node.id);
  const relatedNodes = new Map<string, ReturnType<typeof buildNodeSummary>>();
  relatedNodes.set(centerNode.id, centerNode);

  const relationRows = relationLines.map((line) => {
    const sourceNode = buildNodeSummary(line.from);
    const targetNode = buildNodeSummary(line.to);
    const explanation = explainRelation?.(line);
    relatedNodes.set(sourceNode.id, sourceNode);
    relatedNodes.set(targetNode.id, targetNode);
    return [
      sourceNode.id,
      sourceNode.type,
      sourceNode.title,
      line.text,
      isDirectRelationLine(getRelationLineKey(line))
        ? t("relationView.direct")
        : t("relationView.indirect"),
      explanation && formatEvidenceLevel ? formatEvidenceLevel(explanation.evidenceLevel) : "",
      explanation?.explanation ?? "",
      explanation?.impactHint ?? "",
      explanation?.qualityFlags.join(" | ") ?? "",
      targetNode.id,
      targetNode.type,
      targetNode.title,
      getRelationSourceFields(line).join(" | "),
    ];
  });

  const nodeRows = [...relatedNodes.values()]
    .sort((a, b) => (a.id === centerNode.id ? -1 : b.id === centerNode.id ? 1 : a.id.localeCompare(b.id)))
    .map((item) => [
      item.id,
      item.type,
      item.title,
      item.id === centerNode.id ? t("relationView.csvRoleRoot") : t("relationView.csvRoleRelated"),
      item.isSubNode ? t("relationView.csvYes") : t("relationView.csvNo"),
    ]);

  const csvSections = [
    t("relationView.csvNodes"),
    [
      t("relationView.csvHeaderId"),
      t("relationView.csvHeaderType"),
      t("relationView.csvHeaderTitle"),
      t("relationView.csvHeaderRole"),
      t("relationView.csvHeaderIsSubNode"),
    ].map(toCsvCell).join(","),
    ...nodeRows.map((row) => row.map(toCsvCell).join(",")),
    "",
    t("relationView.csvRelations"),
    [
      t("relationView.csvHeaderSourceId"),
      t("relationView.csvHeaderSourceType"),
      t("relationView.csvHeaderSourceTitle"),
      t("relationView.csvHeaderRelation"),
      t("relationView.csvHeaderDirectness"),
      t("relationView.csvHeaderEvidence"),
      t("relationView.csvHeaderExplanation"),
      t("relationView.csvHeaderImpact"),
      t("relationView.csvHeaderQualityFlags"),
      t("relationView.csvHeaderTargetId"),
      t("relationView.csvHeaderTargetType"),
      t("relationView.csvHeaderTargetTitle"),
      t("relationView.csvHeaderSourceFields"),
    ].map(toCsvCell).join(","),
    ...relationRows.map((row) => row.map(toCsvCell).join(",")),
  ];

  try {
    await navigator.clipboard.writeText(csvSections.join("\n"));
    return { ok: true as const, message: t("relationView.copySuccess") };
  } catch {
    return { ok: false as const, message: t("relationView.copyFailed") };
  }
};
