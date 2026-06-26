import type { LocationQueryRaw } from "vue-router";
import type { RelationPerspectiveKey } from "@/views/relation/relationAnalysisPerspectives";

/**
 * 每个关系图视角允许写入 URL query 的 key 白名单。
 * 切换视角时只保留目标视角白名单内的 query，避免一个视角的参数串到另一个视角
 * （例如 pathExplorer 的 endType/endKey/maxDepth/maxPaths 不应残留在其它视角 URL）。
 */
const RELATION_PERSPECTIVE_QUERY_KEYS: Record<RelationPerspectiveKey, string[]> = {
  risk: ["nodeTypes", "subNode", "relatedEntity", "lineTypes", "layout"],
  attackPath: ["nodeTypes", "subNode", "relatedEntity", "lineTypes", "layout"],
  defenseCoverage: ["nodeTypes", "subNode", "relatedEntity", "lineTypes", "layout"],
  pathExplorer: ["endType", "endKey", "maxDepth", "maxPaths"],
};

/**
 * 构造切到目标视角后的 query：只保留该视角白名单允许的 key。
 * 非白名单 key 一律丢弃，确保视角间参数隔离。
 */
export const buildPerspectiveQuery = (
  currentQuery: LocationQueryRaw,
  target: RelationPerspectiveKey,
): LocationQueryRaw => {
  const allowed = RELATION_PERSPECTIVE_QUERY_KEYS[target];
  const next: LocationQueryRaw = {};
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

/** 将数组序列化为逗号分隔字符串 */
export const serializeArray = (arr: string[]): string => arr.join(",");

/** 将逗号分隔字符串反序列化为数组（过滤空串） */
export const deserializeArray = (str: string): string[] =>
  str ? str.split(",").filter(Boolean) : [];

/** 比较两个数组是否内容相同（忽略顺序） */
export const arrayEquals = (a: string[], b: string[]): boolean => {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((v, i) => v === sortedB[i]);
};

const LINE_TYPE_PREFIX = "relationLine.";

/** 将 lineType 数组序列化为 URL 值（剥离 "relationLine." 前缀） */
export const serializeLineTypes = (arr: string[]): string =>
  arr.map((s) => (s.startsWith(LINE_TYPE_PREFIX) ? s.slice(LINE_TYPE_PREFIX.length) : s)).join(",");

/** 将 URL 值反序列化为 lineType 数组（补回 "relationLine." 前缀） */
export const deserializeLineTypes = (str: string): string[] =>
  str
    ? str.split(",").filter(Boolean).map((s) => (s.startsWith(LINE_TYPE_PREFIX) ? s : LINE_TYPE_PREFIX + s))
    : [];

