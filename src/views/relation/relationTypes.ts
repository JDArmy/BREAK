import { ref } from "vue";
import { getEntityEntryByRelationKey } from "@/BREAK/entityRegistry";

export enum RelationType {
  risk = "risk",
  avoidance = "avoidance",
  attackTool = "attack-tool",
  threatActor = "threat-actor",
  term = "term",
  all = "all",
}

export type RelationEntityType = Exclude<RelationType, RelationType.all>;

export const relationEntityTypes = [
  RelationType.risk,
  RelationType.avoidance,
  RelationType.attackTool,
  RelationType.threatActor,
  RelationType.term,
] as const satisfies readonly RelationEntityType[];

export type NetworkLayoutMode =
  | "horizontal"
  | "lanes"
  | "split"
  | "radial"
  | "hierarchical"
  | "force";

export interface Node {
  id: string;
  type: RelationEntityType;
  text: string;
  color: string;
  data?: { isSubNode?: boolean; isRelatedEntity?: boolean };
}

export interface Line {
  from: string;
  relationKey?: string;
  text: string;
  to: string;
}

export type RelationEvidenceLevel =
  | "direct"
  | "indirect"
  | "inferred"
  | "review";

export interface RelationExplanation {
  relationKey: string;
  fromId: string;
  toId: string;
  relationType: string;
  sourceFields: string[];
  evidenceLevel: RelationEvidenceLevel;
  explanation: string;
  semanticExplanation?: string;
  impactHint: string;
  qualityFlags: string[];
}

export interface RelationLegendItem {
  key: string;
  color: string;
  label: string;
  fields: string[];
}

export interface GraphNode {
  id: string;
  name: string;
  type: RelationEntityType;
  text: string;
  labelText: string;
  symbolSize: number;
  itemStyle: {
    color: string;
    borderColor: string;
    borderWidth: number;
    shadowBlur?: number;
    shadowColor?: string;
  };
  label?: {
    color: string;
    fontSize: number;
    fontWeight?: number | string;
  };
  data?: { isSubNode?: boolean; isRelatedEntity?: boolean };
  x?: number;
  y?: number;
  fixed?: boolean;
}

export interface GraphLink {
  source: string;
  target: string;
  sourceTitle: string;
  targetTitle: string;
  sourceTypeTitle: string;
  targetTypeTitle: string;
  sourceDisplay: string;
  targetDisplay: string;
  text: string;
  sourceFields: string[];
  explanation: RelationExplanation;
  evidenceLabel: string;
  lineStyle: {
    color: string;
    opacity: number;
    curveness: number;
  };
}

export interface SankeyNode {
  name: string;
  /** 节点显示名；当 name 为内部唯一键时，label/tooltip 应优先使用此字段 */
  displayName?: string;
  depth?: number;
  entityType: RelationEntityType;
  entityKey: string;
  itemStyle: {
    color: string;
  };
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface AttackPath {
  threatActorKey?: string;
  attackToolKey?: string;
  riskKey: string;
  avoidanceKey?: string;
  avoidanceSourceFields?: string[];
}

export interface AttackPathExplanationStep {
  fromId: string;
  fromTitle: string;
  toId: string;
  toTitle: string;
  relationType: string;
  sourceFields: string[];
  attackIntent: string;
  defensiveMeaning: string;
}

export interface AttackPathEntitySummary {
  id: string;
  title: string;
  type: RelationEntityType;
}

export interface AttackPathExplanation {
  pathKey: string;
  pathCount: number;
  threatActors: AttackPathEntitySummary[];
  threatActorId?: string;
  attackTool?: AttackPathEntitySummary;
  attackToolId?: string;
  risk: AttackPathEntitySummary;
  riskId: string;
  avoidance?: AttackPathEntitySummary;
  avoidanceId?: string;
  summary: string;
  analysisFinding: string;
  recommendedAction: string;
  evidenceFields: string[];
  defensiveFocus: string[];
  qualityFlags: string[];
  steps: AttackPathExplanationStep[];
}

export type AttackPathFilterType =
  | RelationType.threatActor
  | RelationType.attackTool
  | RelationType.risk
  | RelationType.avoidance;

export type AttackPathFilters = Partial<Record<AttackPathFilterType, string>>;

export interface AttackPathFilterOption {
  key: string;
  label: string;
  count: number;
}

export interface AttackPathDetailNode {
  type: AttackPathFilterType;
  key: string;
  label: string;
}

export interface AttackPathDetailSegment {
  source: AttackPathDetailNode;
  target: AttackPathDetailNode;
  relation: string;
  reason: string;
  sourceFields: string[];
}

export interface AttackPathDetail {
  id: string;
  label: string;
  nodes: AttackPathDetailNode[];
  segments: AttackPathDetailSegment[];
}

export interface RiskAvoidanceCoverageItem {
  avoidanceKey: string;
  avoidanceTitle: string;
  source: "risk" | "attackTool" | "both";
  sourceLabel: string;
  pathCount: number;
  attackToolLabels: string[];
  sourceFields: string[];
}

export interface RiskAvoidanceCoverage {
  totalCount: number;
  directCount: number;
  attackToolCount: number;
  overlapCount: number;
  items: RiskAvoidanceCoverageItem[];
}

export type NodeCoverageSeverity = "normal" | "warning" | "danger";

export interface NodeCoverageMetric {
  label: string;
  value: number;
}

export interface NodeCoverageItem {
  id: string;
  title: string;
  type: RelationEntityType;
  meta: string;
  sourceFields: string[];
}

export interface NodeCoverageSummary {
  title: string;
  summary: string;
  severity: NodeCoverageSeverity;
  metrics: NodeCoverageMetric[];
  items: NodeCoverageItem[];
  notice?: string;
}

export interface NodeSpecialInsightSection {
  title: string;
  summary: string;
  metrics: NodeCoverageMetric[];
  items: NodeCoverageItem[];
  notice?: string;
}

export interface NodeSpecialInsightSummary {
  title: string;
  summary: string;
  severity: NodeCoverageSeverity;
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
  metrics: NodeCoverageMetric[];
  items: NodeBusinessDomainImpactItem[];
  risks: NodeBusinessDomainImpactRisk[];
  notice?: string;
}

export const getColorFromCSS = (varName: string): string => {
  const style = getComputedStyle(document.documentElement);
  const value = style.getPropertyValue(varName).trim();

  // 如果值是 var(--xxx) 形式，递归解析
  const varMatch = value.match(/var\((--[^)]+)\)/);
  if (varMatch) {
    return getColorFromCSS(varMatch[1]);
  }

  return value;
};

export const relationTypeColors: Record<
  RelationEntityType,
  { light: string; dark: string }
> = {
  [RelationType.risk]: { light: "#fed7aa", dark: "#7c2d12" },
  [RelationType.avoidance]: { light: "#bbf7d0", dark: "#14532d" },
  [RelationType.attackTool]: { light: "#bfdbfe", dark: "#1e3a8a" },
  [RelationType.threatActor]: { light: "#fecaca", dark: "#7f1d1d" },
  [RelationType.term]: { light: "#ddd6fe", dark: "#4c1d95" },
};

export const graphColors = {
  background: "",
  line: "",
  lineText: "",
  nodeText: "",
  nodeBorder: "",
  subNodeFill: "",
  subNodeBorder: "",
  selectedNodeBorder: "",
  selectedNodeGlow: "",
} as const;

export const relationLineColors = {
  avoidanceMeans: "",
  directCauseRisk: "",
  indirectSupportRisk: "",
  riskPrerequisite: "",
  riskCoOccurrence: "",
  riskEscalation: "",
  riskVariant: "",
  avoidancePrerequisite: "",
  avoidanceComplement: "",
  avoidanceAlternative: "",
  avoidanceMitigatesGap: "",
  attackToolPrerequisite: "",
  attackToolCoUsed: "",
  attackToolAlternative: "",
  attackToolCapabilityUpgrade: "",
  buildAttackTool: "",
  useAttackTool: "",
  causeRisk: "",
  relatedTerm: "",
  subRisk: "",
  subAvoidance: "",
  subAttackTool: "",
  subThreatActor: "",
  attackToolMaker: "",
} as const;

export const getGraphColors = () => ({
  background: getColorFromCSS("--break-bg-primary"),
  line: getColorFromCSS("--break-text-muted"),
  lineText: getColorFromCSS("--break-text-secondary"),
  nodeText: getColorFromCSS("--break-text-primary"),
  nodeBorder: getColorFromCSS("--break-border"),
  subNodeFill: getColorFromCSS("--break-graph-sub-node-fill"),
  subNodeBorder: getColorFromCSS("--break-graph-sub-node-border"),
  selectedNodeBorder: getColorFromCSS("--break-graph-selected-border"),
  selectedNodeGlow: `rgba(${getColorFromCSS("--break-graph-selected-border")
    .match(/\d+/g)
    ?.join(", ")}, 0.3)`,
});

export const getRelationLineColors = () => ({
  avoidanceMeans: getColorFromCSS("--break-line-avoidance"),
  directCauseRisk: getColorFromCSS("--break-line-direct-risk"),
  indirectSupportRisk: getColorFromCSS("--break-line-indirect-risk"),
  riskPrerequisite: getColorFromCSS("--break-line-cause-risk"),
  riskCoOccurrence: getColorFromCSS("--break-line-related-term"),
  riskEscalation: getColorFromCSS("--break-line-direct-risk"),
  riskVariant: getColorFromCSS("--break-line-sub"),
  avoidancePrerequisite: getColorFromCSS("--break-line-cause-risk"),
  avoidanceComplement: getColorFromCSS("--break-line-avoidance"),
  avoidanceAlternative: getColorFromCSS("--break-line-sub"),
  avoidanceMitigatesGap: getColorFromCSS("--break-line-indirect-risk"),
  attackToolPrerequisite: getColorFromCSS("--break-line-cause-risk"),
  attackToolCoUsed: getColorFromCSS("--break-line-build-tool"),
  attackToolAlternative: getColorFromCSS("--break-line-sub"),
  attackToolCapabilityUpgrade: getColorFromCSS("--break-line-direct-risk"),
  buildAttackTool: getColorFromCSS("--break-line-build-tool"),
  useAttackTool: getColorFromCSS("--break-line-use-tool"),
  causeRisk: getColorFromCSS("--break-line-cause-risk"),
  relatedTerm: getColorFromCSS("--break-line-related-term"),
  subRisk: getColorFromCSS("--break-line-sub"),
  subAvoidance: getColorFromCSS("--break-line-sub"),
  subAttackTool: getColorFromCSS("--break-line-sub"),
  subThreatActor: getColorFromCSS("--break-line-sub"),
  attackToolMaker: getColorFromCSS("--break-line-maker"),
});

export const networkLayoutOptions: {
  value: NetworkLayoutMode;
  labelKey: string;
}[] = [
  { value: "horizontal", labelKey: "relationLayout.horizontal" },
  { value: "lanes", labelKey: "relationLayout.lanes" },
  { value: "split", labelKey: "relationLayout.split" },
  { value: "radial", labelKey: "relationLayout.radial" },
  { value: "hierarchical", labelKey: "relationLayout.hierarchical" },
  { value: "force", labelKey: "relationLayout.force" },
];

export const getRelationLineKey = (line: Line) => line.relationKey || line.text;

export const networkLayoutZoom: Record<NetworkLayoutMode, number> = {
  horizontal: 1.0,
  lanes: 1.0,
  split: 1.0,
  radial: 1.0,
  hierarchical: 1.0,
  force: 0.95,
};

export const networkNodeSize = 58;
export const networkRootNodeSize = 64;
export const networkLabelMaxLineLength = 5;

export const isRelationEntityType = (
  type: string,
): type is RelationEntityType =>
  relationEntityTypes.includes(type as RelationEntityType);

export const createRelationTypeMapping = (
  t: (key: string) => string,
  getRelationTypeColor: (type: RelationEntityType) => string,
) => {
  const makeEntry = (relType: RelationEntityType) => {
    const entry = getEntityEntryByRelationKey(relType);
    return {
      get title() {
        return t(entry?.typeLabelKey ?? `relationType.${relType}`);
      },
      relType,
      BreakKey: entry?.breakKey ?? relType,
      get color() {
        return getRelationTypeColor(relType);
      },
      disableContextMenu: ref<boolean>(false),
    };
  };
  return {
    [RelationType.risk]: makeEntry(RelationType.risk),
    [RelationType.avoidance]: makeEntry(RelationType.avoidance),
    [RelationType.attackTool]: makeEntry(RelationType.attackTool),
    [RelationType.threatActor]: makeEntry(RelationType.threatActor),
    [RelationType.term]: makeEntry(RelationType.term),
  };
};
