import type { Ref } from "vue";
import { createRelationGraphRelationSummary } from "@/views/relation/relationGraphRelationSummary";
import { createRelationGraphRootAnalysis } from "@/views/relation/relationGraphRootAnalysis";
import { RelationType, type Line, type Node } from "@/views/relation/relationTypes";

type Translate = (key: string, params?: Record<string, unknown>) => string;

interface CreateRelationGraphInsightsOptions {
  t: Translate;
  relKey: Ref<string>;
  nodes: Node[];
  lines: Line[];
  selectedNetworkNodeId: Ref<string>;
  getNodeTitle: (type: Exclude<RelationType, RelationType.all>, key: string) => string;
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

  return {
    buildNodeSummary,
    findNodeById,
    rootNodeRelations,
    isCurrentNodeRoot,
    selectedNetworkNode,
    selectedNetworkNodeTitle,
    selectedNetworkRelationCounts,
    selectedNetworkRelations,
    selectedNodePathRelationKeys,
    selectedNodeRootPath,
    selectedNodeRootPreview,
  };
};
