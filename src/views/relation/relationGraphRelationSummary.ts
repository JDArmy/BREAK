import { computed, type Ref } from "vue";
import { isRelationEntityType, RelationType } from "@/views/relation/relationTypes";
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
  const { buildNodeSummary, buildRelationSummary, findNodeById } = createRelationGraphInsightHelpers(baseOptions);

  const selectedNetworkNode = computed(() => {
    const selectedNode = baseOptions.nodes.find((node) => node.id === selectedNetworkNodeId.value);
    return selectedNode ?? baseOptions.nodes.find((node) => node.id === relKey.value) ?? null;
  });

  const selectedNetworkNodeTitle = computed(() => {
    const node = selectedNetworkNode.value;
    if (!node || !isRelationEntityType(node.type)) return "";
    return baseOptions.getNodeTitle(node.type as Exclude<RelationType, RelationType.all>, node.id);
  });

  const selectedNetworkRelations = computed(() => {
    const node = selectedNetworkNode.value;
    if (!node) return [];

    return baseOptions.lines
      .filter((line) => line.from === node.id || line.to === node.id)
      .map((line) => buildRelationSummary(line, node.id))
      .sort((a, b) => a.priority - b.priority || a.otherNodeId.localeCompare(b.otherNodeId));
  });

  const selectedNetworkRelationCounts = computed(() => {
    const node = selectedNetworkNode.value;
    if (!node) return { incoming: 0, outgoing: 0 };
    return {
      incoming: baseOptions.lines.filter((line) => line.to === node.id).length,
      outgoing: baseOptions.lines.filter((line) => line.from === node.id).length,
    };
  });

  const rootNodeRelations = computed(() => {
    const node = selectedNetworkNode.value;
    if (!node || node.id === relKey.value) return [];

    return baseOptions.lines
      .filter(
        (line) =>
          (line.from === relKey.value && line.to === node.id) || (line.from === node.id && line.to === relKey.value)
      )
      .map((line) => ({
        text: line.text,
        direction: line.from === relKey.value ? baseOptions.t("relationView.rootToNode") : baseOptions.t("relationView.nodeToRoot"),
        directness: baseOptions.isDirectRelationLine(line.text)
          ? baseOptions.t("relationView.direct")
          : baseOptions.t("relationView.indirect"),
        evidenceLevel: baseOptions.explainRelation(line).evidenceLevel,
        evidenceLabel: baseOptions.formatEvidenceLevel(baseOptions.explainRelation(line).evidenceLevel),
        explanation: baseOptions.explainRelation(line).explanation,
        impactHint: baseOptions.explainRelation(line).impactHint,
        qualityFlags: baseOptions.explainRelation(line).qualityFlags,
        sourceFields: baseOptions.getRelationSourceFields(line),
        priority: baseOptions.getRelationPriority(line.text),
      }))
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
