import { computed, ref, type ComputedRef, type Ref } from "vue";
import {
  RelationType,
  type AttackPath,
  type AttackPathDetail,
  type AttackPathFilterOption,
  type AttackPathFilters,
  type AttackPathFilterType,
} from "@/views/relation/relationTypes";

type NodeTitleGetter = (
  type: Exclude<RelationType, RelationType.all>,
  key: string
) => string;

interface CreateRelationAttackPathFiltersOptions {
  allAttackPaths: ComputedRef<AttackPath[]>;
  buildAttackPathDetail: (path: AttackPath) => AttackPathDetail;
  getNodeTitle: NodeTitleGetter;
  selectedAttackPathId: Ref<string>;
}

export const attackPathFilterTypes = [
  RelationType.threatActor,
  RelationType.attackTool,
  RelationType.risk,
  RelationType.avoidance,
] as AttackPathFilterType[];

export const isAttackPathFilterType = (
  type: RelationType
): type is AttackPathFilterType =>
  attackPathFilterTypes.includes(type as AttackPathFilterType);

export const pathMatchesAttackPathFilters = (
  path: AttackPath,
  filters: AttackPathFilters,
  ignoredFilter?: AttackPathFilterType
) =>
  (ignoredFilter === RelationType.threatActor ||
    !filters[RelationType.threatActor] ||
    path.threatActorKey === filters[RelationType.threatActor]) &&
  (ignoredFilter === RelationType.attackTool ||
    !filters[RelationType.attackTool] ||
    path.attackToolKey === filters[RelationType.attackTool]) &&
  (ignoredFilter === RelationType.risk ||
    !filters[RelationType.risk] ||
    path.riskKey === filters[RelationType.risk]) &&
  (ignoredFilter === RelationType.avoidance ||
    !filters[RelationType.avoidance] ||
    path.avoidanceKey === filters[RelationType.avoidance]);

const sortByKey = <T extends { key: string }>(items: T[]) =>
  [...items].sort((first, second) =>
    first.key.localeCompare(second.key, undefined, {
      numeric: true,
      sensitivity: "base",
    })
  );

const getPathFilterKey = (path: AttackPath, type: AttackPathFilterType) => {
  if (type === RelationType.threatActor) return path.threatActorKey;
  if (type === RelationType.attackTool) return path.attackToolKey;
  if (type === RelationType.risk) return path.riskKey;
  return path.avoidanceKey;
};

export const createRelationAttackPathFilters = ({
  allAttackPaths,
  buildAttackPathDetail,
  getNodeTitle,
  selectedAttackPathId,
}: CreateRelationAttackPathFiltersOptions) => {
  const attackPathFilters = ref<AttackPathFilters>({});

  const filteredAttackPaths = computed(() =>
    allAttackPaths.value.filter((path) =>
      pathMatchesAttackPathFilters(path, attackPathFilters.value)
    )
  );

  const attackPathDetails = computed(() =>
    filteredAttackPaths.value.map(buildAttackPathDetail)
  );

  const hasActiveAttackPathFilters = computed(() =>
    attackPathFilterTypes.some((type) => Boolean(attackPathFilters.value[type]))
  );

  const buildFilterOptions = (type: AttackPathFilterType) => {
    const countMap = new Map<string, number>();
    allAttackPaths.value
      .filter((path) =>
        pathMatchesAttackPathFilters(path, attackPathFilters.value, type)
      )
      .forEach((path) => {
        const key = getPathFilterKey(path, type);
        if (!key) return;
        countMap.set(key, (countMap.get(key) ?? 0) + 1);
      });

    return sortByKey(
      [...countMap.entries()].map<AttackPathFilterOption>(([key, count]) => ({
        key,
        label: getNodeTitle(type, key),
        count,
      }))
    );
  };

  const attackPathFilterOptions = computed<
    Record<AttackPathFilterType, AttackPathFilterOption[]>
  >(() => ({
    [RelationType.threatActor]: buildFilterOptions(RelationType.threatActor),
    [RelationType.attackTool]: buildFilterOptions(RelationType.attackTool),
    [RelationType.risk]: buildFilterOptions(RelationType.risk),
    [RelationType.avoidance]: buildFilterOptions(RelationType.avoidance),
  }));

  const normalizeAttackPathFilters = () => {
    const nextFilters: AttackPathFilters = {};

    attackPathFilterTypes.forEach((type) => {
      const value = attackPathFilters.value[type];
      if (
        value &&
        allAttackPaths.value.some((path) => getPathFilterKey(path, type) === value)
      ) {
        nextFilters[type] = value;
      }
    });
    attackPathFilters.value = nextFilters;

    if (
      selectedAttackPathId.value &&
      !attackPathDetails.value.some(
        (detail) => detail.id === selectedAttackPathId.value
      )
    ) {
      selectedAttackPathId.value = "";
    }
  };

  const resetAttackPathFilters = () => {
    attackPathFilters.value = {};
    selectedAttackPathId.value = "";
  };

  return {
    attackPathDetails,
    attackPathFilterOptions,
    attackPathFilters,
    filteredAttackPaths,
    hasActiveAttackPathFilters,
    normalizeAttackPathFilters,
    resetAttackPathFilters,
  };
};
