import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from "vue";

/**
 * 反查工厂：在 source 实体表中找出所有"某字段数组包含 targetKey"的条目 key。
 *
 * 用于详情页/列表页的反向关联展示（如某 Risk 被哪些 AttackTool 直接造成/间接支持，
 * 某 AttackTool 被哪些 ThreatActor 自建/使用，某实体被哪些 Term 关联）。
 * 正向关系维护在被引用方时（如 Term.relatedRisks），引用方需反查，用本工厂。
 *
 * @param source BREAK 实体表，如 BREAK.attackTools / BREAK.threatActors / BREAK.terms
 * @param fields 一个或多个字段名；多字段为 OR 语义（任一字段数组命中即算关联）
 * @param targetKey 被包含的目标 key（响应式，传 ref / computed / getter 均可）
 * @returns ComputedRef<string[]>，随 targetKey 变化重算
 */
// 泛型约束用 any（而非 unknown）以让 BREAK.terms 等具体对象类型兼容传入；
// unknown 约束会因对象类型无索引签名而拒绝，迫使调用方写 as unknown as 双重断言。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useRelatedEntities<T extends Record<string, Record<string, any>>>(
  source: T,
  fields: string | string[],
  targetKey: MaybeRefOrGetter<string>,
): ComputedRef<string[]> {
  const fieldList = Array.isArray(fields) ? fields : [fields];
  return computed(() => {
    const key = toValue(targetKey);
    if (!key) return [];
    return Object.keys(source).filter((entityKey) => {
      const entity = source[entityKey] as Record<string, unknown>;
      return fieldList.some(
        (field) => Array.isArray(entity[field]) && (entity[field] as string[]).includes(key),
      );
    });
  });
}
