import { computed, type ComputedRef, type Ref } from "vue";
import type { Translate } from "@/views/relation/relationCoverageAnalysisHelpers";
import { createRelationNodeCoverageBuilders } from "@/views/relation/relationNodeCoverageBuilders";
import { createRelationSpecialInsightBuilders } from "@/views/relation/relationSpecialInsightBuilders";
import {
  RelationType,
  type Node,
  type NodeCoverageSummary,
  type NodeSpecialInsightSummary,
  type RelationEntityType,
} from "@/views/relation/relationTypes";

interface CreateRelationCoverageAnalysisOptions {
  t: Translate;
  relType: Ref<RelationType>;
  relKey: Ref<string>;
  selectedNetworkNode: ComputedRef<Node | null>;
  getNodeTitle: (type: RelationEntityType, key: string) => string;
}

export const createRelationCoverageAnalysis = ({
  t,
  relType,
  relKey,
  selectedNetworkNode,
  getNodeTitle,
}: CreateRelationCoverageAnalysisOptions) => {
  const {
    buildAttackToolCoverage,
    buildAvoidanceCoverage,
    buildRiskCoverage,
    buildThreatActorCoverage,
  } = createRelationNodeCoverageBuilders({ t, getNodeTitle });

  const selectedNodeCoverageSummary = computed<NodeCoverageSummary | null>(
    () => {
      const node = selectedNetworkNode.value;
      if (!node) return null;
      if (node.type === RelationType.risk) return buildRiskCoverage(node.id);
      if (node.type === RelationType.avoidance)
        return buildAvoidanceCoverage(node.id);
      if (node.type === RelationType.attackTool)
        return buildAttackToolCoverage(node.id);
      if (node.type === RelationType.threatActor)
        return buildThreatActorCoverage(node.id);
      return null;
    },
  );

  const {
    buildAttackToolSpecialInsight,
    buildAvoidanceSpecialInsight,
    buildThreatActorSpecialInsight,
  } = createRelationSpecialInsightBuilders({ t, getNodeTitle });

  const selectedNodeSpecialInsightSummary =
    computed<NodeSpecialInsightSummary | null>(() => {
      const node = selectedNetworkNode.value;
      if (!node) return null;
      if (node.type === RelationType.avoidance)
        return relType.value === RelationType.avoidance
          ? buildAvoidanceSpecialInsight(relKey.value)
          : null;
      if (node.type === RelationType.attackTool)
        return relType.value === RelationType.attackTool
          ? buildAttackToolSpecialInsight(relKey.value)
          : null;
      if (node.type === RelationType.threatActor)
        return relType.value === RelationType.threatActor
          ? buildThreatActorSpecialInsight(relKey.value)
          : null;
      return null;
    });

  return {
    selectedNodeCoverageSummary,
    selectedNodeSpecialInsightSummary,
  };
};
