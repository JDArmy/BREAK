/**
 * 实体路由工具：ID 类型推断、i18n 路径生成、详情页路由映射。
 *
 * 供 EntityId / EntityText / useEntityResolver 等实体悬浮提示相关模块共享。
 */

import type { Router } from "vue-router";

/** 实体类型枚举 */
export type EntityType =
  | "risk"
  | "avoidance"
  | "term"
  | "attackTool"
  | "threatActor"
  | "case";

/**
 * 全站统一的实体 ID 正则（捕获完整 ID，含子编号）。
 * 注意：AT / TA 必须在 A / T 之前匹配（最长前缀优先）。
 * 每次使用前需 `new RegExp(ENTITY_ID_PATTERN.source, 'g')` 以重置 lastIndex。
 */
export const ENTITY_ID_PATTERN =
  /\b((?:AT|TA|R|A|T|C)\d{4}(?:-\d{3})?)\b/g;

/** 从 ID 前缀推断实体类型；返回 null 表示无法识别 */
export function inferEntityType(id: string): EntityType | null {
  // 顺序重要：AT / TA 必须先于 A / T
  if (id.startsWith("AT")) return "attackTool";
  if (id.startsWith("TA")) return "threatActor";
  if (id.startsWith("R")) return "risk";
  if (id.startsWith("A")) return "avoidance";
  if (id.startsWith("T")) return "term";
  if (id.startsWith("C")) return "case";
  return null;
}

/** 实体类型 → i18n 数据路径中的集合名（BREAK 对象键名） */
const I18N_COLLECTION: Record<EntityType, string> = {
  risk: "risks",
  avoidance: "avoidances",
  attackTool: "attackTools",
  threatActor: "threatActors",
  term: "terms",
  case: "cases",
};

/** 获取实体的 i18n key 前缀，如 `'BREAK.risks.R0001'` */
export function entityI18nPrefix(id: string, type: EntityType): string {
  return `BREAK.${I18N_COLLECTION[type]}.${id}`;
}

/** 实体类型 → 知识库详情路由 name + paramKey */
const DETAIL_ROUTE_MAP: Record<EntityType, { name: string; paramKey: string }> =
  {
    risk: { name: "knowledgesRiskDetail", paramKey: "rKey" },
    avoidance: { name: "knowledgesAvoidanceDetail", paramKey: "aKey" },
    attackTool: { name: "knowledgesAttackToolDetail", paramKey: "atKey" },
    threatActor: { name: "knowledgesThreatActorDetail", paramKey: "taKey" },
    term: { name: "knowledgesTermDetail", paramKey: "tKey" },
    case: { name: "knowledgesCaseDetail", paramKey: "cKey" },
  };

/** 通过 router.resolve 生成实体详情页完整 href（含 # 前缀），适合 `<a :href>` */
export function entityDetailHref(
  router: Router,
  id: string,
  type?: EntityType
): string | null {
  const t = type ?? inferEntityType(id);
  if (!t) return null;
  const entry = DETAIL_ROUTE_MAP[t];
  return router.resolve({
    name: entry.name,
    params: { [entry.paramKey]: id },
  }).href;
}
