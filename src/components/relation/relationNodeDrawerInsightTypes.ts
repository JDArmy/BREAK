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
  highlights: string[];
  notices: string[];
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

export interface NodeBusinessSceneImpactRisk {
  id: string;
  title: string;
  sourceFields: string[];
}

export interface NodeBusinessSceneImpactRiskScene {
  id: string;
  title: string;
  riskCount: number;
  risks: NodeBusinessSceneImpactRisk[];
}

export interface NodeBusinessSceneImpactItem {
  id: string;
  title: string;
  dimensionTitles: string[];
  riskCount: number;
  riskSceneCount: number;
  riskScenes: NodeBusinessSceneImpactRiskScene[];
}

export interface NodeBusinessSceneImpactSummary {
  title: string;
  summary: string;
  metrics: Array<{
    label: string;
    value: number;
  }>;
  items: NodeBusinessSceneImpactItem[];
  risks: NodeBusinessSceneImpactRisk[];
  notice?: string;
}
