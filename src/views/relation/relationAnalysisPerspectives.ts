import {
  RelationType,
  type NetworkLayoutMode,
} from "@/views/relation/relationTypes";
import type { RelationViewMode } from "@/views/relation/relationViewState";

/** 三元分析视角（风险/攻击路径/防御覆盖）；pathExplorer 独立于该体系 */
export type RelationAnalysisPerspective =
  | "risk"
  | "attackPath"
  | "defenseCoverage";

/** 关系图视角（含 pathExplorer），对应路由 meta.relationPerspective */
export type RelationPerspectiveKey =
  | "risk"
  | "attackPath"
  | "defenseCoverage"
  | "pathExplorer";

/**
 * 关系图视角 ↔ 默认 view 映射。
 * 新结构下视角由路由 name 决定（meta.relationPerspective），activeView 由视角推导，不再依赖 query.view。
 */
export const getDefaultViewByPerspective = (
  p: RelationPerspectiveKey,
): RelationViewMode =>
  p === "risk"
    ? "network"
    : p === "attackPath"
      ? "sankey"
      : p === "defenseCoverage"
        ? "analysis"
        : "pathExplorer";

// beforeEach 预加载 ECharts 用
export const getRelationDefaultViewByPerspective = getDefaultViewByPerspective;

/** 路由 name → 关系图视角 */
export const RELATION_PERSPECTIVE_BY_NAME: Record<string, RelationPerspectiveKey> = {
  relationRisk: "risk",
  relationRiskEntity: "risk",
  relationAttackPath: "attackPath",
  relationAttackPathEntity: "attackPath",
  relationDefenseCoverage: "defenseCoverage",
  relationDefenseCoverageEntity: "defenseCoverage",
  relationPathExplorer: "pathExplorer",
  relationPathExplorerEntity: "pathExplorer",
};

/** 从 route.name 推导关系图视角；非关系图路由返回 null */
export const getRelationPerspectiveFromRoute = (
  name?: string | symbol | null,
): RelationPerspectiveKey | null =>
  typeof name === "string" ? RELATION_PERSPECTIVE_BY_NAME[name] ?? null : null;

export interface RelationAnalysisPerspectiveOption {
  key: RelationAnalysisPerspective;
  titleKey: string;
  descriptionKey: string;
  defaultView: RelationViewMode;
  networkLayout: NetworkLayoutMode;
  relationTypes: RelationType[];
  lineTypes: string[];
  showSubNode: boolean;
  showRelatedEntity: boolean;
}

export const relationAnalysisPerspectiveOptions: RelationAnalysisPerspectiveOption[] =
  [
    {
      key: "risk",
      titleKey: "relationView.perspective.risk.title",
      descriptionKey: "relationView.perspective.risk.description",
      defaultView: "network",
      networkLayout: "horizontal",
      relationTypes: [
        RelationType.risk,
        RelationType.attackTool,
        RelationType.threatActor,
        RelationType.avoidance,
      ],
      lineTypes: [
        "relationLine.directCauseRisk",
        "relationLine.indirectSupportRisk",
        "relationLine.causeRisk",
        "relationLine.avoidanceMeans",
        "relationLine.riskPrerequisite",
        "relationLine.riskCoOccurrence",
        "relationLine.riskEscalation",
      ],
      showSubNode: true,
      showRelatedEntity: true,
    },
    {
      key: "attackPath",
      titleKey: "relationView.perspective.attackPath.title",
      descriptionKey: "relationView.perspective.attackPath.description",
      defaultView: "sankey",
      networkLayout: "horizontal",
      relationTypes: [
        RelationType.threatActor,
        RelationType.attackTool,
        RelationType.risk,
        RelationType.avoidance,
      ],
      lineTypes: [
        "relationLine.buildAttackTool",
        "relationLine.useAttackTool",
        "relationLine.directCauseRisk",
        "relationLine.indirectSupportRisk",
        "relationLine.causeRisk",
        "relationLine.avoidanceMeans",
      ],
      showSubNode: false,
      showRelatedEntity: false,
    },
    {
      key: "defenseCoverage",
      titleKey: "relationView.perspective.defenseCoverage.title",
      descriptionKey: "relationView.perspective.defenseCoverage.description",
      defaultView: "analysis",
      networkLayout: "force",
      relationTypes: [
        RelationType.risk,
        RelationType.avoidance,
        RelationType.attackTool,
        RelationType.threatActor,
      ],
      lineTypes: [
        "relationLine.avoidanceMeans",
        "relationLine.directCauseRisk",
        "relationLine.indirectSupportRisk",
        "relationLine.avoidanceComplement",
        "relationLine.avoidanceAlternative",
        "relationLine.avoidanceMitigatesGap",
      ],
      showSubNode: false,
      showRelatedEntity: true,
    },
  ];

const relationAnalysisPerspectiveKeys = relationAnalysisPerspectiveOptions.map(
  (option) => option.key,
);

export const normalizeRelationAnalysisPerspective = (
  value: unknown,
  fallback: RelationAnalysisPerspective = "risk",
): RelationAnalysisPerspective =>
  typeof value === "string" &&
  relationAnalysisPerspectiveKeys.includes(
    value as RelationAnalysisPerspective,
  )
    ? (value as RelationAnalysisPerspective)
    : fallback;

export const getRelationAnalysisPerspectiveOption = (
  perspective: RelationAnalysisPerspective,
) =>
  relationAnalysisPerspectiveOptions.find((option) => option.key === perspective) ??
  relationAnalysisPerspectiveOptions[0];

export const getRelationAnalysisPerspectiveByView = (
  view: RelationViewMode,
): RelationAnalysisPerspective =>
  relationAnalysisPerspectiveOptions.find((option) => option.defaultView === view)
    ?.key ?? "risk";
