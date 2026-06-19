import { useCases } from "@/composables/useCases";

// 倒排索引：entityKey -> caseKey[]，支持按 risk/attackTool/threatActor 反查相关案例
// Case.relatedRisks/relatedAttackTools/relatedThreatActors 单向维护在 Case 侧，
// 其他实体详情页通过此索引反查"相关案例"。
// 案例数据懒加载，索引随 cases 加载状态响应式重建。
type CaseRefField = "relatedRisks" | "relatedAttackTools" | "relatedThreatActors";

import { computed } from "vue";

function buildMap(cases: Record<string, { [k in CaseRefField]?: string[] }>, field: CaseRefField): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const [caseKey, caseEntity] of Object.entries(cases)) {
    for (const refKey of caseEntity[field] || []) {
      const arr = map.get(refKey);
      if (arr) {
        arr.push(caseKey);
      } else {
        map.set(refKey, [caseKey]);
      }
    }
  }
  return map;
}

export function useCasesByRisk() {
  const { cases, ensureCases, loaded } = useCases();

  const risksMap = computed(() => buildMap(cases.value, "relatedRisks"));
  const attackToolsMap = computed(() => buildMap(cases.value, "relatedAttackTools"));
  const threatActorsMap = computed(() => buildMap(cases.value, "relatedThreatActors"));

  return {
    ensureCases,
    cases,
    loaded,
    getCasesByRisk(riskKey: string): string[] {
      return risksMap.value.get(riskKey) ?? [];
    },
    getCasesByAttackTool(atKey: string): string[] {
      return attackToolsMap.value.get(atKey) ?? [];
    },
    getCasesByThreatActor(taKey: string): string[] {
      return threatActorsMap.value.get(taKey) ?? [];
    },
  };
}
