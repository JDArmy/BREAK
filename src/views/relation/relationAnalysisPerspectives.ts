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

/**
 * 关系图 4 视角的路由元信息（单一来源）：pathSegment + baseRouteName + entityRouteName + perspective。
 * router 程序化生成路由、RELATION_PERSPECTIVE_BY_NAME、relationRouteQuery 的
 * ENTITY_ROUTE_BY_PERSPECTIVE/PERSPECTIVE_ROUTE_NAME 均从此派生，避免多处映射重复维护。
 * pathExplorer 独立于 relationAnalysisPerspectiveOptions（该数组仅含 3 个分析视角），故路由元信息独立维护。
 */
export interface RelationPerspectiveRouteMeta {
  pathSegment: string;
  baseRouteName: string;
  entityRouteName: string;
  perspective: RelationPerspectiveKey;
}

export const RELATION_PERSPECTIVE_ROUTES: readonly RelationPerspectiveRouteMeta[] = [
  { pathSegment: "risk-relation", baseRouteName: "relationRisk", entityRouteName: "relationRiskEntity", perspective: "risk" },
  { pathSegment: "attack-path", baseRouteName: "relationAttackPath", entityRouteName: "relationAttackPathEntity", perspective: "attackPath" },
  { pathSegment: "defense-coverage", baseRouteName: "relationDefenseCoverage", entityRouteName: "relationDefenseCoverageEntity", perspective: "defenseCoverage" },
  { pathSegment: "path-explorer", baseRouteName: "relationPathExplorer", entityRouteName: "relationPathExplorerEntity", perspective: "pathExplorer" },
] as const;

// 开发期完整性校验：确保 RelationPerspectiveKey 联合的每个视角都在 RELATION_PERSPECTIVE_ROUTES 中。
// 若新增 perspective 到联合类型但漏加路由条目，此处 dev 控制台报错（as Record 断言会掩盖此缺失）。
if (import.meta.env.DEV) {
  const expectedPerspectives: RelationPerspectiveKey[] = ["risk", "attackPath", "defenseCoverage", "pathExplorer"];
  const actualPerspectives = RELATION_PERSPECTIVE_ROUTES.map((r) => r.perspective);
  for (const p of expectedPerspectives) {
    if (!actualPerspectives.includes(p)) {
      console.error(`[relationAnalysisPerspectives] RELATION_PERSPECTIVE_ROUTES 缺少视角: ${p}`);
    }
  }
}

/** 路由 name → 关系图视角（从 RELATION_PERSPECTIVE_ROUTES 单一来源派生，避免重复维护） */
export const RELATION_PERSPECTIVE_BY_NAME: Record<string, RelationPerspectiveKey> = Object.fromEntries(
  RELATION_PERSPECTIVE_ROUTES.flatMap((r) => [
    [r.baseRouteName, r.perspective],
    [r.entityRouteName, r.perspective],
  ]),
) as Record<string, RelationPerspectiveKey>;

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
