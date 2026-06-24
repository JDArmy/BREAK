export interface RelationSummary {
  relationKey: string;
  relationLineKey: string;
  direction: string;
  directionKey?: string;
  text: string;
  directness: string;
  directnessKey?: string;
  otherNodeId: string;
  otherNodeType: string;
  otherNodeTitle: string;
  sourceFields: string[];
  evidenceLabel: string;
  explanation: string;
  impactHint: string;
  qualityFlags: string[];
}

export interface RelationFilterValues {
  direction: string;
  relationType: string;
  directness: string;
}

export type RelationFilterKey = keyof RelationFilterValues;

export const createEmptyRelationFilters = (): RelationFilterValues => ({
  direction: "",
  relationType: "",
  directness: "",
});

export const uniqueSortedRelationFilterValues = (values: string[]) =>
  [...new Set(values.filter(Boolean))].sort((first, second) =>
    first.localeCompare(second, undefined, {
      numeric: true,
      sensitivity: "base",
    })
  );

export const relationMatchesFilters = (
  relation: RelationSummary,
  filters: RelationFilterValues,
  ignoredFilter?: RelationFilterKey,
) =>
  (ignoredFilter === "direction" ||
    !filters.direction ||
    (relation.directionKey ?? relation.direction) === filters.direction) &&
  (ignoredFilter === "relationType" ||
    !filters.relationType ||
    relation.relationLineKey === filters.relationType) &&
  (ignoredFilter === "directness" ||
    !filters.directness ||
    (relation.directnessKey ?? relation.directness) === filters.directness);

export const filterRelations = (
  relations: RelationSummary[],
  filters: RelationFilterValues,
) => relations.filter((relation) => relationMatchesFilters(relation, filters));

export const buildRelationFilterOptions = (
  relations: RelationSummary[],
  filters: RelationFilterValues,
) => {
  const getCandidateRelationsForFilter = (ignoredFilter: RelationFilterKey) =>
    relations.filter((relation) =>
      relationMatchesFilters(relation, filters, ignoredFilter)
    );

  return {
    directions: uniqueSortedRelationFilterValues(
      getCandidateRelationsForFilter("direction").map(
        (relation) => relation.directionKey ?? relation.direction,
      ),
    ),
    relationTypes: uniqueSortedRelationFilterValues(
      getCandidateRelationsForFilter("relationType").map(
        (relation) => relation.relationLineKey,
      ),
    ),
    directness: uniqueSortedRelationFilterValues(
      getCandidateRelationsForFilter("directness").map(
        (relation) => relation.directnessKey ?? relation.directness,
      ),
    ),
  };
};

export const sanitizeRelationFilters = (
  filters: RelationFilterValues,
  options: ReturnType<typeof buildRelationFilterOptions>,
): RelationFilterValues => ({
  direction:
    filters.direction && options.directions.includes(filters.direction)
      ? filters.direction
      : "",
  relationType:
    filters.relationType && options.relationTypes.includes(filters.relationType)
      ? filters.relationType
      : "",
  directness:
    filters.directness && options.directness.includes(filters.directness)
      ? filters.directness
      : "",
});
