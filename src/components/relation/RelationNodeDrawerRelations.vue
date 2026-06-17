<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

interface RelationSummary {
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

const props = defineProps<{
  selectedNetworkRelations: RelationSummary[];
  isRelationOnSelectedPath: (relationKey: string) => boolean;
  copyFeedbackMessage: string;
  copyFeedbackType: "success" | "error";
}>();

const emit = defineEmits<{
  "copy-csv": [];
  "open-node-detail": [nodeId: string];
}>();

const { t } = useI18n();

const relationFilters = reactive({
  direction: "",
  relationType: "",
  directness: "",
});

const RELATION_PREVIEW_LIMIT = 15;
const showAllRelations = ref(false);

const uniqueSortedValues = (values: string[]) =>
  [...new Set(values.filter(Boolean))].sort((first, second) =>
    first.localeCompare(second, undefined, {
      numeric: true,
      sensitivity: "base",
    })
  );

type RelationFilterKey = keyof typeof relationFilters;
type RelationFilterValues = Record<RelationFilterKey, string>;

const relationMatchesFilters = (
  relation: RelationSummary,
  filters: RelationFilterValues,
  ignoredFilter?: RelationFilterKey
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

const getCandidateRelationsForFilter = (ignoredFilter: RelationFilterKey) =>
  props.selectedNetworkRelations.filter((relation) =>
    relationMatchesFilters(relation, relationFilters, ignoredFilter)
  );

const relationFilterOptions = computed(() => ({
  directions: uniqueSortedValues(
    getCandidateRelationsForFilter("direction").map(
      (relation) => relation.directionKey ?? relation.direction
    )
  ),
  relationTypes: uniqueSortedValues(
    getCandidateRelationsForFilter("relationType").map(
      (relation) => relation.relationLineKey
    )
  ),
  directness: uniqueSortedValues(
    getCandidateRelationsForFilter("directness").map(
      (relation) => relation.directnessKey ?? relation.directness
    )
  ),
}));

const filteredRelations = computed(() =>
  props.selectedNetworkRelations.filter((relation) =>
    relationMatchesFilters(relation, relationFilters)
  )
);

const tableRows = computed(() =>
  filteredRelations.value.map((relation) => ({
    ...relation,
    relationSummary: `${relation.direction} ${relation.text}`,
    isActive: props.isRelationOnSelectedPath(relation.relationKey),
  }))
);

const visibleTableRows = computed(() =>
  showAllRelations.value
    ? tableRows.value
    : tableRows.value.slice(0, RELATION_PREVIEW_LIMIT)
);

const hiddenRelationCount = computed(
  () => tableRows.value.length - visibleTableRows.value.length
);

const getDirectionLabel = (directionKey: string) =>
  directionKey === "outgoing"
    ? t("relationView.outgoing")
    : directionKey === "incoming"
      ? t("relationView.incoming")
      : directionKey;

const getDirectnessLabel = (directnessKey: string) =>
  directnessKey === "direct"
    ? t("relationView.direct")
    : directnessKey === "indirect"
      ? t("relationView.indirect")
      : directnessKey;

const hasRelationFilters = computed(() =>
  Boolean(
    relationFilters.direction ||
    relationFilters.relationType ||
    relationFilters.directness
  )
);

const resetRelationFilters = () => {
  relationFilters.direction = "";
  relationFilters.relationType = "";
  relationFilters.directness = "";
  showAllRelations.value = false;
};

const setDirectionFilter = (direction: "incoming" | "outgoing") => {
  relationFilters.direction = direction;
  showAllRelations.value = false;
};

const toggleShowAllRelations = () => {
  showAllRelations.value = !showAllRelations.value;
};

defineExpose({
  setDirectionFilter,
});

const openRelationSelect = (event: MouseEvent) => {
  const selectElement = (event.currentTarget as HTMLElement).querySelector(
    "select"
  ) as (HTMLSelectElement & { showPicker?: () => void }) | null;
  if (!selectElement || event.target === selectElement) return;

  selectElement.focus();
  if (typeof selectElement.showPicker === "function") {
    selectElement.showPicker();
    return;
  }

  selectElement.click();
};

watch(
  () =>
    props.selectedNetworkRelations
      .map((relation) => relation.relationKey)
      .join("|"),
  () => resetRelationFilters()
);

watch(
  () => ({
    direction: relationFilters.direction,
    relationType: relationFilters.relationType,
    directness: relationFilters.directness,
  }),
  () => {
    showAllRelations.value = false;
  }
);

watch(
  () => ({
    direction: relationFilters.direction,
    directions: relationFilterOptions.value.directions.join("|"),
    relationType: relationFilters.relationType,
    relationTypes: relationFilterOptions.value.relationTypes.join("|"),
    directness: relationFilters.directness,
    directnessOptions: relationFilterOptions.value.directness.join("|"),
  }),
  () => {
    if (
      relationFilters.direction &&
      !relationFilterOptions.value.directions.includes(
        relationFilters.direction
      )
    ) {
      relationFilters.direction = "";
    }

    if (
      relationFilters.relationType &&
      !relationFilterOptions.value.relationTypes.includes(
        relationFilters.relationType
      )
    ) {
      relationFilters.relationType = "";
    }

    if (
      relationFilters.directness &&
      !relationFilterOptions.value.directness.includes(
        relationFilters.directness
      )
    ) {
      relationFilters.directness = "";
    }
  },
  { flush: "post" }
);

const relationRowClassName = ({ row }: { row: { isActive: boolean } }) =>
  row.isActive ? "node-relation-row-active" : "";
</script>

<template>
  <div class="node-explain-block">
    <div class="node-explain-header">
      <h3>{{ t("relationView.allRelations") }}</h3>
      <div class="node-explain-actions">
        <span
          v-if="copyFeedbackMessage"
          :class="['copy-feedback', `copy-feedback-${copyFeedbackType}`]"
        >
          {{ copyFeedbackMessage }}
        </span>
        <el-button size="small" plain @click="emit('copy-csv')">
          {{ t("relationView.copyCsv") }}
        </el-button>
      </div>
    </div>
    <div class="node-relation-filter-block">
      <div class="node-relation-filter-header">
        <span>{{ t("relationView.relationFilters") }}</span>
        <span>
          {{
            t("relationView.filteredRelationCount", {
              count: visibleTableRows.length,
              total: selectedNetworkRelations.length,
            })
          }}
        </span>
      </div>
      <div class="node-relation-filter-grid">
        <label class="node-relation-filter-select" @click="openRelationSelect">
          <span>{{ t("relationView.filterDirection") }}</span>
          <select
            id="relation-filter-direction"
            v-model="relationFilters.direction"
            name="relation-filter-direction"
          >
            <option value="">
              {{ t("relationView.allRelationFilterOptions") }}
            </option>
            <option
              v-for="option in relationFilterOptions.directions"
              :key="option"
              :value="option"
            >
              {{ getDirectionLabel(option) }}
            </option>
          </select>
        </label>
        <label class="node-relation-filter-select" @click="openRelationSelect">
          <span>{{ t("relationView.filterRelationType") }}</span>
          <select
            id="relation-filter-type"
            v-model="relationFilters.relationType"
            name="relation-filter-type"
          >
            <option value="">
              {{ t("relationView.allRelationFilterOptions") }}
            </option>
            <option
              v-for="option in relationFilterOptions.relationTypes"
              :key="option"
              :value="option"
            >
              {{ t(option) }}
            </option>
          </select>
        </label>
        <label class="node-relation-filter-select" @click="openRelationSelect">
          <span>{{ t("relationView.filterDirectness") }}</span>
          <select
            id="relation-filter-directness"
            v-model="relationFilters.directness"
            name="relation-filter-directness"
          >
            <option value="">
              {{ t("relationView.allRelationFilterOptions") }}
            </option>
            <option
              v-for="option in relationFilterOptions.directness"
              :key="option"
              :value="option"
            >
              {{ getDirectnessLabel(option) }}
            </option>
          </select>
        </label>
        <button
          type="button"
          class="node-filter-clear-button"
          :disabled="!hasRelationFilters"
          @click="resetRelationFilters"
        >
          {{ t("relationView.clearRelationFilters") }}
        </button>
      </div>
    </div>
  </div>

  <div class="node-relation-table-scroll">
    <el-table
      :data="visibleTableRows"
      size="small"
      stripe
      table-layout="fixed"
      :row-class-name="relationRowClassName"
      class="node-relation-table"
    >
      <el-table-column type="expand" width="32">
        <template #default="{ row }">
          <div class="node-relation-expanded">
            <div>{{ row.explanation }}</div>
            <div class="node-relation-impact">{{ row.impactHint }}</div>
            <div class="node-relation-fields">
              {{ t("relationView.evidence") }}: {{ row.evidenceLabel }}
            </div>
            <div v-if="row.sourceFields.length" class="node-relation-fields">
              {{ t("relationView.sourceFields") }}:
              {{ row.sourceFields.join(", ") }}
            </div>
            <div v-if="row.qualityFlags.length" class="node-relation-fields">
              {{ row.qualityFlags.join(", ") }}
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column
        prop="relationSummary"
        :label="t('relationView.allRelations')"
        min-width="42%"
      />
      <el-table-column
        :label="t('relationView.csvHeaderDirectness')"
        width="88"
      >
        <template #default="{ row }">
          <div class="node-relation-badges">
            <span class="node-relation-badge">{{ row.directness }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column
        :label="t('relationView.csvHeaderTargetTitle')"
        min-width="40%"
      >
        <template #default="{ row }">
          <button
            type="button"
            class="node-relation-link"
            :title="row.otherNodeType"
            @click="emit('open-node-detail', row.otherNodeId)"
          >
            <span class="node-relation-link-id">{{ row.otherNodeId }}</span>
            <span>{{ row.otherNodeTitle }}</span>
          </button>
        </template>
      </el-table-column>
    </el-table>
  </div>
  <button
    v-if="hiddenRelationCount > 0 || showAllRelations"
    type="button"
    class="node-relation-more node-attack-path-more-button"
    @click="toggleShowAllRelations"
  >
    {{
      showAllRelations
        ? t("relationView.collapseRelationCount")
        : t("relationView.hiddenRelationCount", {
            count: hiddenRelationCount,
          })
    }}
  </button>
</template>

<style scoped>
.node-explain-block {
  margin-top: 14px;
}

.node-explain-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.node-explain-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.node-explain-block h3 {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
}

.node-relation-filter-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.node-relation-filter-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 6px;
  color: var(--break-text-muted);
  font-size: 12px;
}

.node-relation-filter-header span:first-child {
  color: var(--break-text-secondary);
  font-weight: 700;
}

.node-relation-filter-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.node-relation-filter-select {
  box-sizing: border-box;
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 3px;
  min-width: 0;
  width: 100%;
  padding: 7px 8px;
  border: 1px solid var(--break-border);
  border-radius: 6px;
  background: var(--break-bg);
  overflow: hidden;
}

.node-relation-filter-select::after {
  content: "";
  position: absolute;
  right: 12px;
  bottom: 13px;
  width: 7px;
  height: 7px;
  border-right: 1.5px solid var(--break-text-muted);
  border-bottom: 1.5px solid var(--break-text-muted);
  pointer-events: none;
  transform: rotate(45deg);
}

.node-relation-filter-select span {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  color: var(--break-text-muted);
  font-size: 11px;
  font-weight: 500;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-relation-filter-select select {
  appearance: none;
  -webkit-appearance: none;
  box-sizing: border-box;
  min-width: 0;
  width: 100%;
  max-width: 100%;
  padding-right: 24px;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--break-text-secondary);
  font-size: 12px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-filter-clear-button {
  justify-self: end;
  width: auto;
  padding: 2px 0;
  border: 0;
  background: transparent;
  color: var(--el-color-primary);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.4;
  cursor: pointer;
}

.node-filter-clear-button:disabled {
  color: var(--break-text-muted);
  cursor: default;
  opacity: 0.55;
}

.node-filter-clear-button:not(:disabled):hover {
  text-decoration: underline;
}

.copy-feedback {
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  white-space: nowrap;
}

.copy-feedback-success {
  color: var(--el-color-success);
}

.copy-feedback-error {
  color: var(--el-color-danger);
}

.node-relation-table {
  width: 100%;
}

.node-relation-table-scroll {
  width: 100%;
  margin-top: 12px;
}

.node-relation-table :deep(.el-table__cell) {
  vertical-align: top;
}

.node-relation-table :deep(.node-relation-row-active) {
  --el-table-tr-bg-color: color-mix(
    in srgb,
    var(--el-color-primary) 10%,
    transparent
  );
}

.node-relation-table :deep(.cell) {
  font-size: 12px;
  line-height: 1.4;
}

.node-relation-link {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--el-color-primary);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.node-relation-link:hover {
  text-decoration: underline;
}

.node-relation-link-id {
  font-weight: 600;
}

.node-relation-badges {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
}

.node-relation-badge {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 2px 6px;
  border: 1px solid var(--break-border);
  border-radius: 999px;
  color: var(--break-text-secondary);
  font-size: 11px;
  line-height: 1.2;
  white-space: normal;
}

.node-relation-expanded {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 12px;
  border: 1px solid var(--break-border);
  border-radius: 6px;
  background: var(--break-bg-soft);
  color: var(--break-text-primary);
}

.node-relation-impact,
.node-relation-fields {
  color: var(--break-text-muted);
  overflow-wrap: anywhere;
}

@media (max-width: 767px) {
  .node-explain-block {
    margin-top: 10px;
  }

  .node-explain-header {
    align-items: flex-start;
    gap: 6px;
    margin-bottom: 6px;
  }

  .node-explain-actions {
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 5px;
  }

  .copy-feedback {
    width: 100%;
    justify-content: flex-end;
    font-size: 11px;
  }

  .node-relation-table-scroll {
    width: 100%;
    margin-top: 10px;
    overflow-x: hidden;
  }

  .node-relation-table {
    width: 100% !important;
  }

  .node-relation-table :deep(.el-table__cell) {
    padding: 5px 0;
  }

  .node-relation-table :deep(.cell) {
    padding: 0 5px;
    font-size: 11px;
    line-height: 1.35;
    overflow-wrap: anywhere;
  }

  .node-relation-link {
    gap: 3px;
  }
}
</style>
