import { ref } from "vue";

export enum RelationType {
  risk = "risk",
  avoidance = "avoidance",
  attackTool = "attack-tool",
  threatActor = "threat-actor",
  term = "term",
  all = "all",
}

export type NetworkLayoutMode = "horizontal" | "lanes" | "split" | "radial" | "hierarchical" | "force";

export interface Node {
  id: string;
  type: string;
  text: string;
  color: string;
  data?: { isSubNode?: boolean };
}

export interface Line {
  from: string;
  text: string;
  to: string;
}

export interface RelationExplanation {
  evidenceLevel: string;
  explanation: string;
  impactHint: string;
  qualityFlags: string[];
}

export interface RelationSummary extends RelationExplanation {
  relationKey: string;
  direction: string;
  text: string;
  priority: number;
  directness: string;
  otherNodeId: string;
  otherNodeType: string;
  otherNodeTitle: string;
  sourceFields: string[];
}

export interface RootRelationSummary extends RelationExplanation {
  direction: string;
  text: string;
  directness: string;
  sourceFields: string[];
  priority: number;
}

export interface RelationLegendItem {
  color: string;
  label: string;
  fields: string[];
}

export interface GraphNode {
  id: string;
  name: string;
  type: string;
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
  data?: { isSubNode?: boolean };
  x?: number;
  y?: number;
  fixed?: boolean;
}

export interface GraphLink {
  source: string;
  target: string;
  text: string;
  sourceFields: string[];
  lineStyle: {
    color: string;
    opacity: number;
    curveness: number;
  };
}

export interface SankeyNode {
  name: string;
  depth?: number;
  entityType: Exclude<RelationType, RelationType.all>;
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

export interface AttackPathNodeRef {
  type: AttackPathFilterType;
  key: string;
  title: string;
  label: string;
}

export interface AttackPathSegment {
  source: AttackPathNodeRef;
  target: AttackPathNodeRef;
  relation: string;
  sourceFields: string[];
  reason: string;
}

export interface AttackPathDetail {
  id: string;
  label: string;
  path: AttackPath;
  nodes: AttackPathNodeRef[];
  segments: AttackPathSegment[];
}

export type RiskAvoidanceCoverageSource = "risk" | "attackTool" | "both";

export interface RiskAvoidanceCoverageItem {
  avoidanceKey: string;
  avoidanceTitle: string;
  label: string;
  source: RiskAvoidanceCoverageSource;
  sourceLabel: string;
  directRisk: boolean;
  attackToolKeys: string[];
  attackToolLabels: string[];
  pathCount: number;
  sourceFields: string[];
}

export interface RiskAvoidanceCoverage {
  riskKey: string;
  riskTitle: string;
  directCount: number;
  attackToolCount: number;
  overlapCount: number;
  totalCount: number;
  items: RiskAvoidanceCoverageItem[];
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
  Exclude<RelationType, RelationType.all>,
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

export const networkLayoutOptions: { value: NetworkLayoutMode; labelKey: string }[] = [
  { value: "horizontal", labelKey: "relationLayout.horizontal" },
  { value: "lanes", labelKey: "relationLayout.lanes" },
  { value: "split", labelKey: "relationLayout.split" },
  { value: "radial", labelKey: "relationLayout.radial" },
  { value: "hierarchical", labelKey: "relationLayout.hierarchical" },
  { value: "force", labelKey: "relationLayout.force" },
];

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

export const isRelationEntityType = (type: string): type is Exclude<RelationType, RelationType.all> =>
  [RelationType.risk, RelationType.avoidance, RelationType.attackTool, RelationType.threatActor, RelationType.term].includes(
    type as Exclude<RelationType, RelationType.all>
  );

export const createRelationTypeMapping = (
  t: (key: string) => string,
  getRelationTypeColor: (type: Exclude<RelationType, RelationType.all>) => string
) => ({
  [RelationType.risk]: {
    get title() { return t("relationType.risk"); },
    relType: RelationType.risk,
    BreakKey: "risks",
    get color() { return getRelationTypeColor(RelationType.risk); },
    disableContextMenu: ref<boolean>(false),
  },
  [RelationType.avoidance]: {
    get title() { return t("relationType.avoidance"); },
    relType: RelationType.avoidance,
    BreakKey: "avoidances",
    get color() { return getRelationTypeColor(RelationType.avoidance); },
    disableContextMenu: ref<boolean>(false),
  },
  [RelationType.attackTool]: {
    get title() { return t("relationType.attackTool"); },
    relType: RelationType.attackTool,
    BreakKey: "attackTools",
    get color() { return getRelationTypeColor(RelationType.attackTool); },
    disableContextMenu: ref<boolean>(false),
  },
  [RelationType.threatActor]: {
    get title() { return t("relationType.threatActor"); },
    relType: RelationType.threatActor,
    BreakKey: "threatActors",
    get color() { return getRelationTypeColor(RelationType.threatActor); },
    disableContextMenu: ref<boolean>(false),
  },
  [RelationType.term]: {
    get title() { return t("relationType.term"); },
    relType: RelationType.term,
    BreakKey: "terms",
    get color() { return getRelationTypeColor(RelationType.term); },
    disableContextMenu: ref<boolean>(false),
  },
});
