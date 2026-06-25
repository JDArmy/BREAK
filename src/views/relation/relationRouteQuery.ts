import type { RelationPerspectiveKey } from "@/views/relation/relationAnalysisPerspectives";

/**
 * 每个关系图视角允许写入 URL query 的 key 白名单。
 * 切换视角时只保留目标视角白名单内的 query，避免一个视角的参数串到另一个视角
 * （例如 pathExplorer 的 endType/endKey/maxDepth/maxPaths 不应残留在其它视角 URL）。
 */
const RELATION_PERSPECTIVE_QUERY_KEYS: Record<RelationPerspectiveKey, string[]> = {
  risk: [],
  attackPath: [],
  defenseCoverage: [],
  pathExplorer: ["endType", "endKey", "maxDepth", "maxPaths"],
};

/**
 * 构造切到目标视角后的 query：只保留该视角白名单允许的 key。
 * 非白名单 key 一律丢弃，确保视角间参数隔离。
 */
export const buildPerspectiveQuery = (
  currentQuery: Record<string, unknown>,
  target: RelationPerspectiveKey,
): Record<string, unknown> => {
  const allowed = RELATION_PERSPECTIVE_QUERY_KEYS[target];
  const next: Record<string, unknown> = {};
  for (const key of allowed) {
    if (currentQuery[key] !== undefined) {
      next[key] = currentQuery[key];
    }
  }
  return next;
};

/** 当前视角的带实体子路由 name（切换根节点 / 切视角保留实体时使用） */
export const ENTITY_ROUTE_BY_PERSPECTIVE: Record<RelationPerspectiveKey, string> = {
  risk: "relationRiskEntity",
  attackPath: "relationAttackPathEntity",
  defenseCoverage: "relationDefenseCoverageEntity",
  pathExplorer: "relationPathExplorerEntity",
};

/** 视角首页（无实体）路由 name */
export const PERSPECTIVE_ROUTE_NAME: Record<RelationPerspectiveKey, string> = {
  risk: "relationRisk",
  attackPath: "relationAttackPath",
  defenseCoverage: "relationDefenseCoverage",
  pathExplorer: "relationPathExplorer",
};

/** RelationViewMode → 视角（el-tabs 切换用） */
export const VIEW_TO_PERSPECTIVE: Record<
  "network" | "sankey" | "analysis" | "pathExplorer",
  RelationPerspectiveKey
> = {
  network: "risk",
  sankey: "attackPath",
  analysis: "defenseCoverage",
  pathExplorer: "pathExplorer",
};
