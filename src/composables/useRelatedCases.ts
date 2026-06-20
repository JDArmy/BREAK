import { computed, toValue, type ComputedRef, type MaybeRefOrGetter, type Ref } from "vue";
import { useCasesByRisk } from "@/composables/useCasesByRisk";
import { useLazyCasesSection } from "@/composables/useLazyCasesSection";

/**
 * 按实体类型反查相关案例 + 滚动懒加载的统一封装。
 *
 * RisksView/AttackToolsView/ThreatActorsView 此前逐字重复 3 行：
 *   const { getXxx, ensureCases, cases, loaded } = useCasesByRisk();
 *   const relatedCases = computed(() => getXxx(selectedKey.value));
 *   const { sectionRef } = useLazyCasesSection(() => ensureCases());
 * 仅 getter 名不同。useCasesByRisk 已是通用倒排索引，本件按 type 选 getter 收敛。
 *
 * @param type 实体类型
 * @param entityKey 当前实体 key（响应式）
 * @returns relatedCases（随 cases 加载与 key 变化重建）、ensureCases、cases、loaded、sectionRef
 */
export type RelatedCasesType = "risk" | "attackTool" | "threatActor";

interface CaseEntity {
  title: string;
  [key: string]: unknown;
}

interface UseRelatedCasesReturn {
  relatedCases: ComputedRef<string[]>;
  ensureCases: () => Promise<void>;
  cases: Ref<Record<string, CaseEntity>>;
  loaded: Ref<boolean>;
  sectionRef: Ref<HTMLElement | undefined>;
}

export function useRelatedCases(
  type: RelatedCasesType,
  entityKey: MaybeRefOrGetter<string>,
): UseRelatedCasesReturn {
  const { getCasesByRisk, getCasesByAttackTool, getCasesByThreatActor, ensureCases, cases, loaded } =
    useCasesByRisk();

  const getter =
    type === "risk"
      ? getCasesByRisk
      : type === "attackTool"
        ? getCasesByAttackTool
        : getCasesByThreatActor;

  const relatedCases = computed(() => getter(toValue(entityKey)));
  const { sectionRef } = useLazyCasesSection(() => ensureCases());

  return { relatedCases, ensureCases, cases, loaded, sectionRef };
}
