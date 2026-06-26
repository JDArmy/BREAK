/**
 * 实体路由工具：ID 类型推断、i18n 路径生成、详情页路由映射。
 *
 * 供 EntityId / EntityText / useEntityResolver 等实体悬浮提示相关模块共享。
 * 所有元信息来自 entityRegistry（唯一来源）。
 */

import type { Router } from "vue-router";
import {
  inferEntityType,
  entityI18nPrefix,
  getEntityEntry,
  ENTITY_ID_PATTERN,
  type EntityType,
} from "@/BREAK/entityRegistry";

// 从 entityRegistry 重导出，保持向后兼容
export { inferEntityType, entityI18nPrefix, ENTITY_ID_PATTERN, type EntityType };

/** 通过 router.resolve 生成实体详情页完整 href（含 # 前缀），适合 `<a :href>` */
export function entityDetailHref(
  router: Router,
  id: string,
  type?: EntityType
): string | null {
  const t = type ?? inferEntityType(id);
  if (!t) return null;
  const entry = getEntityEntry(t);
  return router.resolve({
    name: entry.detailRouteName,
    params: { [entry.paramKey]: id },
  }).href;
}
