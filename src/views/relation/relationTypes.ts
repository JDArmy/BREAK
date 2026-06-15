import { ref } from "vue";

export enum RelationType {
  risk = "risk",
  avoidance = "avoidance",
  attackTool = "attack-tool",
  threatActor = "threat-actor",
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

export const relationTypeColors: Record<
  Exclude<RelationType, RelationType.all>,
  { light: string; dark: string }
> = {
  [RelationType.risk]: { light: "#fed7aa", dark: "#7c2d12" },
  [RelationType.avoidance]: { light: "#bbf7d0", dark: "#14532d" },
  [RelationType.attackTool]: { light: "#bfdbfe", dark: "#1e3a8a" },
  [RelationType.threatActor]: { light: "#fecaca", dark: "#7f1d1d" },
};

export const graphColors = {
  background: { light: "#ffffff", dark: "#0f172a" },
  line: { light: "#999999", dark: "#475569" },
  lineText: { light: "#666666", dark: "#94a3b8" },
  nodeText: { light: "#333333", dark: "#e2e8f0" },
  nodeBorder: { light: "#efefef", dark: "#334155" },
  subNodeFill: { light: "#fde7a7", dark: "#7c5a1d" },
  subNodeBorder: { light: "#e0b85b", dark: "#f6d28b" },
  selectedNodeBorder: { light: "#2563eb", dark: "#93c5fd" },
  selectedNodeGlow: { light: "rgba(37, 99, 235, 0.26)", dark: "rgba(147, 197, 253, 0.3)" },
};

export const relationLineColors = {
  avoidanceMeans: { light: "#8b5cf6", dark: "#c084fc" },
  directCauseRisk: { light: "#ef4444", dark: "#f87171" },
  indirectSupportRisk: { light: "#f59e0b", dark: "#fbbf24" },
  buildAttackTool: { light: "#0ea5e9", dark: "#38bdf8" },
  useAttackTool: { light: "#14b8a6", dark: "#5eead4" },
  causeRisk: { light: "#dc2626", dark: "#fb7185" },
  subRisk: { light: "#94a3b8", dark: "#64748b" },
  subAvoidance: { light: "#94a3b8", dark: "#64748b" },
  subAttackTool: { light: "#94a3b8", dark: "#64748b" },
  subThreatActor: { light: "#94a3b8", dark: "#64748b" },
  attackToolMaker: { light: "#22c55e", dark: "#4ade80" },
};

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
  [RelationType.risk, RelationType.avoidance, RelationType.attackTool, RelationType.threatActor].includes(
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
});
