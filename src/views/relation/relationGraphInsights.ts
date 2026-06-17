import { computed, type Ref } from "vue";
import { createRelationGraphRelationSummary } from "@/views/relation/relationGraphRelationSummary";
import { createRelationGraphRootAnalysis } from "@/views/relation/relationGraphRootAnalysis";
import {
  RelationType,
  isRelationEntityType,
  type Line,
  type Node,
} from "@/views/relation/relationTypes";

type Translate = (key: string, params?: Record<string, unknown>) => string;

interface NodeAnalysisSummary {
  summary: string;
  highlights: Array<{
    label: string;
    type: string;
    ids: string[];
  }>;
  notices: string[];
}

interface CreateRelationGraphInsightsOptions {
  t: Translate;
  relKey: Ref<string>;
  nodes: Node[];
  lines: Line[];
  selectedNetworkNodeId: Ref<string>;
  getNodeTitle: (
    type: Exclude<RelationType, RelationType.all>,
    key: string
  ) => string;
  getNodeTypeTitle: (type: string) => string;
  getRelationPriority: (lineText: string) => number;
  isDirectRelationLine: (lineText: string) => boolean;
  getRelationSourceFields: (line: Line) => string[];
  explainRelation: (line: Line) => {
    evidenceLevel: string;
    explanation: string;
    impactHint: string;
    qualityFlags: string[];
  };
  formatEvidenceLevel: (level: string) => string;
}

export const createRelationGraphInsights = ({
  t,
  relKey,
  nodes,
  lines,
  selectedNetworkNodeId,
  getNodeTitle,
  getNodeTypeTitle,
  getRelationPriority,
  isDirectRelationLine,
  getRelationSourceFields,
  explainRelation,
  formatEvidenceLevel,
}: CreateRelationGraphInsightsOptions) => {
  const {
    buildNodeSummary,
    buildRelationSummary,
    findNodeById,
    rootNodeRelations,
    isCurrentNodeRoot,
    selectedNetworkNode,
    selectedNetworkNodeTitle,
    selectedNetworkRelationCounts,
    selectedNetworkRelations,
  } = createRelationGraphRelationSummary({
    t,
    relKey,
    nodes,
    lines,
    selectedNetworkNodeId,
    getNodeTitle,
    getNodeTypeTitle,
    getRelationPriority,
    isDirectRelationLine,
    getRelationSourceFields,
    explainRelation,
    formatEvidenceLevel,
  });

  const {
    selectedNodePathRelationKeys,
    selectedNodeRootPath,
    selectedNodeRootPreview,
  } = createRelationGraphRootAnalysis({
    relKey,
    lines,
    selectedNetworkNode,
    findNodeById,
    buildNodeSummary,
    buildRelationSummary,
    getRelationPriority,
  });

  const selectedNodeAnalysisSummary = computed<NodeAnalysisSummary | null>(
    () => {
      const node = selectedNetworkNode.value;
      if (!node) return null;

      const relatedNodeIds = new Set<string>();
      let incoming = 0;
      let outgoing = 0;

      lines.forEach((line) => {
        if (line.from === node.id) {
          outgoing += 1;
          relatedNodeIds.add(line.to);
        }
        if (line.to === node.id) {
          incoming += 1;
          relatedNodeIds.add(line.from);
        }
      });

      const relatedTypeGroups = [...relatedNodeIds].reduce<
        Record<string, string[]>
      >((groups, nodeId) => {
        const relatedNode = nodes.find((item) => item.id === nodeId);
        if (!relatedNode) return groups;
        groups[relatedNode.type] = [...(groups[relatedNode.type] ?? []), nodeId];
        return groups;
      }, {});
      const relatedTypeCounts = Object.fromEntries(
        Object.entries(relatedTypeGroups).map(([type, ids]) => [
          type,
          ids.length,
        ])
      );

      const getCount = (type: RelationType) => relatedTypeCounts[type] ?? 0;
      const relationCount = incoming + outgoing;
      const typeTitle = getNodeTypeTitle(node.type);
      const title = isRelationEntityType(node.type)
        ? getNodeTitle(node.type, node.id)
        : node.id;
      const params = {
        title,
        type: typeTitle,
        incoming,
        outgoing,
        relations: relationCount,
        risks: getCount(RelationType.risk),
        avoidances: getCount(RelationType.avoidance),
        attackTools: getCount(RelationType.attackTool),
        threatActors: getCount(RelationType.threatActor),
        terms: getCount(RelationType.term),
      };

      const summaryKey = isRelationEntityType(node.type)
        ? `relationView.nodeAnalysis.${node.type}`
        : "relationView.nodeAnalysis.default";
      const highlights = Object.entries(relatedTypeCounts)
        .filter(([, count]) => count > 0)
        .sort(([firstType], [secondType]) =>
          firstType.localeCompare(secondType)
        )
        .map(([relatedType, count]) => ({
          label: t("relationView.nodeAnalysisRelatedCount", {
            type: getNodeTypeTitle(relatedType),
            count,
          }),
          type: relatedType,
          ids: [...(relatedTypeGroups[relatedType] ?? [])].sort(),
        }));

      const notices: string[] = [];
      if (relationCount >= 8) {
        notices.push(t("relationView.nodeAnalysisNotice.highConnectivity"));
      }
      if (relationCount <= 1) {
        notices.push(t("relationView.nodeAnalysisNotice.lowConnectivity"));
      }
      if (
        node.type === RelationType.risk &&
        getCount(RelationType.avoidance) === 0
      ) {
        notices.push(t("relationView.nodeAnalysisNotice.missingAvoidance"));
      }
      if (
        node.type === RelationType.attackTool &&
        getCount(RelationType.risk) === 0
      ) {
        notices.push(t("relationView.nodeAnalysisNotice.missingRiskLink"));
      }
      if (
        selectedNodeRootPath.value &&
        selectedNodeRootPath.value.hopCount > 1
      ) {
        notices.push(
          t("relationView.nodeAnalysisNotice.rootPath", {
            count: selectedNodeRootPath.value.hopCount,
          })
        );
      }

      return {
        summary: t(summaryKey, params),
        highlights,
        notices,
      };
    }
  );

  return {
    buildNodeSummary,
    findNodeById,
    rootNodeRelations,
    isCurrentNodeRoot,
    selectedNetworkNode,
    selectedNetworkNodeTitle,
    selectedNetworkRelationCounts,
    selectedNetworkRelations,
    selectedNodeAnalysisSummary,
    selectedNodePathRelationKeys,
    selectedNodeRootPath,
    selectedNodeRootPreview,
  };
};
