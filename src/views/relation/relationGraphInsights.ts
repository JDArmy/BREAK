import { computed, type Ref } from "vue";
import { createRelationGraphRelationSummary } from "@/views/relation/relationGraphRelationSummary";
import { createRelationGraphRootAnalysis } from "@/views/relation/relationGraphRootAnalysis";
import { findRelationPaths } from "@/views/relation/relationPathDiscovery";
import {
  getRelationLineKey,
  RelationType,
  type Line,
  type Node,
  type RelationEntityType,
} from "@/views/relation/relationTypes";
import type { NodeRelatedEntitySummary } from "@/components/relation/relationNodeDrawerInsightTypes";

type Translate = (key: string, params?: Record<string, unknown>) => string;

export interface NodeAnalysisSummary {
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
  getNodeTitle: (type: RelationEntityType, key: string) => string;
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
  const nodeById = computed(() => new Map(nodes.map((node) => [node.id, node])));
  const relationLinesByNodeId = computed(() => {
    const lineMap = new Map<string, Line[]>();
    lines.forEach((line) => {
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

  const selectedNodeDiscoveredPaths = computed(() => {
    const node = selectedNetworkNode.value;
    if (!node || node.id === relKey.value) return [];

    return findRelationPaths({
      lines,
      startId: relKey.value,
      endId: node.id,
      maxDepth: 5,
      maxPaths: 5,
      getRelationPriority: (lineKey) => getRelationPriority(lineKey),
    });
  });

  const selectedNodeAnalysisSummary = computed<NodeAnalysisSummary | null>(
    () => {
      const node = selectedNetworkNode.value;
      if (!node) return null;

      const relatedNodeIds = new Set<string>();
      let incoming = 0;
      let outgoing = 0;

      (relationLinesByNodeId.value.get(node.id) ?? []).forEach((line) => {
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
        const relatedNode = nodeById.value.get(nodeId);
        if (!relatedNode) return groups;
        groups[relatedNode.type] = [
          ...(groups[relatedNode.type] ?? []),
          nodeId,
        ];
        return groups;
      }, {});
      const relatedTypeCounts = Object.fromEntries(
        Object.entries(relatedTypeGroups).map(([type, ids]) => [
          type,
          ids.length,
        ]),
      );

      const getCount = (type: RelationType) => relatedTypeCounts[type] ?? 0;
      const relationCount = incoming + outgoing;
      const typeTitle = getNodeTypeTitle(node.type);
      const title = getNodeTitle(node.type, node.id);
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

      const summaryKey = `relationView.nodeAnalysis.${node.type}`;
      const highlights = Object.entries(relatedTypeCounts)
        .filter(([, count]) => count > 0)
        .sort(([firstType], [secondType]) =>
          firstType.localeCompare(secondType),
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
          }),
        );
      }
      if (selectedNodeDiscoveredPaths.value.length > 1) {
        notices.push(
          t("relationView.nodeAnalysisNotice.discoveredPath", {
            count: selectedNodeDiscoveredPaths.value.length,
            hops: selectedNodeDiscoveredPaths.value[0]?.hopCount ?? 0,
          }),
        );
      }

      return {
        summary: t(summaryKey, params),
        highlights,
        notices,
      };
    },
  );

  const selectedNodeRelatedEntitySummary =
    computed<NodeRelatedEntitySummary | null>(() => {
      const node = selectedNetworkNode.value;
      if (!node) return null;

      const relatedItems = (relationLinesByNodeId.value.get(node.id) ?? [])
        .map((line) => {
          const otherNodeId = line.from === node.id ? line.to : line.from;
          const otherNode = nodeById.value.get(otherNodeId);
          if (
            !otherNode ||
            otherNode.type !== node.type ||
            !otherNode.data?.isRelatedEntity
          ) {
            return null;
          }

          const relationKey = getRelationLineKey(line);
          return {
            id: otherNode.id,
            title: getNodeTitle(node.type, otherNode.id),
            type: otherNode.type,
            relationKey,
            relationText: line.text,
            direction:
              line.from === node.id
                ? t("relationView.outgoing")
                : t("relationView.incoming"),
            sourceFields: getRelationSourceFields(line),
            priority: getRelationPriority(relationKey),
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .sort(
          (first, second) =>
            first.priority - second.priority ||
            first.id.localeCompare(second.id),
        )
        .map((item) => ({
          id: item.id,
          title: item.title,
          type: item.type,
          relationKey: item.relationKey,
          relationText: item.relationText,
          direction: item.direction,
          sourceFields: item.sourceFields,
        }));

      if (!relatedItems.length) return null;

      return {
        title: t("relationView.relatedEntityTitle", {
          type: getNodeTypeTitle(node.type),
        }),
        summary: t("relationView.relatedEntitySummary", {
          count: relatedItems.length,
          type: getNodeTypeTitle(node.type),
        }),
        items: relatedItems,
      };
    });

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
    selectedNodeRelatedEntitySummary,
    selectedNodeDiscoveredPaths,
    selectedNodePathRelationKeys,
    selectedNodeRootPath,
    selectedNodeRootPreview,
  };
};
