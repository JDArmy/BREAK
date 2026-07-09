export interface RootRelationSummary {
  direction: string;
  text: string;
  directness: string;
  sourceFields: string[];
  evidenceLabel: string;
  explanation: string;
  impactHint: string;
  qualityFlags: string[];
}

export interface PathNodeSummary {
  id: string;
  type: string;
  title: string;
}

export interface PathStepSummary {
  relation: {
    direction: string;
    text: string;
    directness: string;
    sourceFields: string[];
  };
  targetNode: PathNodeSummary;
  isCurrentTarget: boolean;
}

export interface RootPathSummary {
  hopCount: number;
  startNode: PathNodeSummary;
  steps: PathStepSummary[];
}

export interface NodeAnalysisSummary {
  summary: string;
  highlights: Array<{
    label: string;
    type: string;
    ids: string[];
  }>;
  notices: string[];
}

export interface NodeRelatedEntityItem {
  id: string;
  title: string;
  type: string;
  relationKey: string;
  relationText: string;
  direction: string;
  sourceFields: string[];
}

export interface NodeRelatedEntitySummary {
  title: string;
  summary: string;
  items: NodeRelatedEntityItem[];
}

export interface AttackPathEntity {
  id: string;
  title: string;
  type: string;
}

export interface AttackPathExplanation {
  pathKey: string;
  pathCount: number;
  threatActors: AttackPathEntity[];
  threatActorId?: string;
  attackTool?: AttackPathEntity;
  attackToolId?: string;
  risk: AttackPathEntity;
  riskId: string;
  avoidance?: AttackPathEntity;
  avoidanceId?: string;
  summary: string;
  analysisFinding: string;
  recommendedAction: string;
  evidenceFields: string[];
  defensiveFocus: string[];
  qualityFlags: string[];
  steps: Array<{
    fromId: string;
    fromTitle: string;
    toId: string;
    toTitle: string;
    relationType: string;
    sourceFields: string[];
    attackIntent: string;
    defensiveMeaning: string;
  }>;
}

export interface NodeCoverageSummary {
  title: string;
  summary: string;
  severity: "normal" | "warning" | "danger";
  metrics: Array<{
    label: string;
    value: number;
  }>;
  items: Array<{
    id: string;
    title: string;
    type: string;
    meta: string;
    sourceFields: string[];
  }>;
  notice?: string;
}

export interface NodeSpecialInsightSection {
  title: string;
  summary: string;
  metrics: Array<{
    label: string;
    value: number;
  }>;
  items: Array<{
    id: string;
    title: string;
    type: string;
    meta: string;
    sourceFields: string[];
  }>;
  notice?: string;
}

export interface NodeSpecialInsightSummary {
  title: string;
  summary: string;
  severity: "normal" | "warning" | "danger";
  sections: NodeSpecialInsightSection[];
  recommendation?: string;
}

export interface NodeBusinessDomainImpactRisk {
  id: string;
  title: string;
  sourceFields: string[];
}

export interface NodeBusinessDomainImpactRiskScene {
  id: string;
  title: string;
  riskCount: number;
  risks: NodeBusinessDomainImpactRisk[];
}

export interface NodeBusinessDomainImpactItem {
  id: string;
  title: string;
  dimensionTitles: string[];
  riskCount: number;
  riskSceneCount: number;
  riskScenes: NodeBusinessDomainImpactRiskScene[];
}

export interface NodeBusinessDomainImpactSummary {
  title: string;
  summary: string;
  metrics: Array<{
    label: string;
    value: number;
  }>;
  items: NodeBusinessDomainImpactItem[];
  risks: NodeBusinessDomainImpactRisk[];
  notice?: string;
}
