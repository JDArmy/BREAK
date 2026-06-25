import { computed, type Ref } from "vue";
import { getRelationLineKey, type Line } from "@/views/relation/relationTypes";
import {
  createRelationGraphInsightHelpers,
  type RelationGraphInsightBaseOptions,
} from "@/views/relation/relationGraphInsightShared";

interface CreateRelationGraphRelationSummaryOptions extends RelationGraphInsightBaseOptions {
  relKey: Ref<string>;
  selectedNetworkNodeId: Ref<string>;
}

export const createRelationGraphRelationSummary = ({
  relKey,
  selectedNetworkNodeId,
  ...baseOptions
}: CreateRelationGraphRelationSummaryOptions) => {
  const { buildNodeSummary, buildRelationSummary, findNodeById } =
    createRelationGraphInsightHelpers(baseOptions);
  const relationLinesByNodeId = computed(() => {
    const lineMap = new Map<string, Line[]>();
    baseOptions.lines.forEach((line) => {
      const fromLines = lineMap.get(line.from);
      if (fromLines) {
        fromLines.push(line);
      } else {
        lineMap.set(line.from, [line]);
      }
      const toLines = lineMap.get(line.to);
      if (toLines) {
        toLines.push(line);
      } else {
        lineMap.set(line.to, [line]);
      }
    });
    return lineMap;
  });

  const selectedNetworkNode = computed(() => {
    const selectedNode = baseOptions.nodes.find(
      (node) => node.id === selectedNetworkNodeId.value,
    );
    return (
      selectedNode ??
      baseOptions.nodes.find((node) => node.id === relKey.value) ??
      null
    );
  });

  const selectedNetworkNodeTitle = computed(() => {
    const node = selectedNetworkNode.value;
    if (!node) return "";
    return baseOptions.getNodeTitle(node.type, node.id);
  });

  const selectedNetworkRelations = computed(() => {
    const node = selectedNetworkNode.value;
    if (!node) return [];

    return (relationLinesByNodeId.value.get(node.id) ?? [])
      .map((line) => buildRelationSummary(line, node.id))
      .sort(
        (a, b) =>
          a.priority - b.priority || a.otherNodeId.localeCompare(b.otherNodeId),
      );
  });

  const selectedNetworkRelationCounts = computed(() => {
    const node = selectedNetworkNode.value;
    if (!node) return { incoming: 0, outgoing: 0 };
    const relationLines = relationLinesByNodeId.value.get(node.id) ?? [];
    return {
      incoming: relationLines.filter((line) => line.to === node.id).length,
      outgoing: relationLines.filter((line) => line.from === node.id).length,
    };
  });

  const rootNodeRelations = computed(() => {
    const node = selectedNetworkNode.value;
    if (!node || node.id === relKey.value) return [];

    return baseOptions.lines
      .filter(
        (line) =>
          (line.from === relKey.value && line.to === node.id) ||
          (line.from === node.id && line.to === relKey.value),
      )
      .map((line) => {
        const relationLineKey = getRelationLineKey(line);
        const explanation = baseOptions.explainRelation(line);
        return {
          text: line.text,
          direction:
            line.from === relKey.value
              ? baseOptions.t("relationView.rootToNode")
              : baseOptions.t("relationView.nodeToRoot"),
          directness: baseOptions.isDirectRelationLine(relationLineKey)
            ? baseOptions.t("relationView.direct")
            : baseOptions.t("relationView.indirect"),
          evidenceLevel: explanation.evidenceLevel,
          evidenceLabel: baseOptions.formatEvidenceLevel(
            explanation.evidenceLevel,
          ),
          explanation: explanation.explanation,
          impactHint: explanation.impactHint,
          qualityFlags: explanation.qualityFlags,
          sourceFields: baseOptions.getRelationSourceFields(line),
          priority: baseOptions.getRelationPriority(relationLineKey),
        };
      })
      .sort((a, b) => a.priority - b.priority);
  });

  const isCurrentNodeRoot = computed(() => {
    const node = selectedNetworkNode.value;
    return node ? node.id === relKey.value : false;
  });

  return {
    buildNodeSummary,
    buildRelationSummary,
    findNodeById,
    rootNodeRelations,
    isCurrentNodeRoot,
    selectedNetworkNode,
    selectedNetworkNodeTitle,
    selectedNetworkRelationCounts,
    selectedNetworkRelations,
  };
};
