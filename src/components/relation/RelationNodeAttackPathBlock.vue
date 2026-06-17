<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import type { AttackPathExplanation } from "@/components/relation/relationNodeDrawerInsightTypes";
import {
  RelationType,
  type AttackPathFilterOption,
  type AttackPathFilterType,
  type AttackPathFilters,
} from "@/views/relation/relationTypes";
import "@/components/relation/relationNodeDrawerInsights.css";

const props = defineProps<{
  selectedNodeAttackPathSummary: string[];
  selectedNodeAttackPathDescription: string;
  selectedNodeAttackPathExplanations: AttackPathExplanation[];
  attackPathFilterOptions: Record<AttackPathFilterType, AttackPathFilterOption[]>;
  attackPathFilters: AttackPathFilters;
  hasActiveAttackPathFilters: boolean;
}>();

const emit = defineEmits<{
  "update:attack-path-filters": [value: AttackPathFilters];
  "reset-attack-path-filters": [];
}>();

const { t } = useI18n();

const DEFAULT_ATTACK_PATH_PREVIEW_LIMIT = 2;
const showAllAttackPaths = ref(false);

const pathMatchesFilters = (
  path: AttackPathExplanation,
  filters: AttackPathFilters,
  ignoredFilter?: AttackPathFilterType
) =>
  (ignoredFilter === RelationType.threatActor ||
    !filters[RelationType.threatActor] ||
    path.threatActors.some(
      (actor) => actor.id === filters[RelationType.threatActor]
    )) &&
  (ignoredFilter === RelationType.attackTool ||
    !filters[RelationType.attackTool] ||
    path.attackTool?.id === filters[RelationType.attackTool]) &&
  (ignoredFilter === RelationType.risk ||
    !filters[RelationType.risk] ||
    path.risk.id === filters[RelationType.risk]) &&
  (ignoredFilter === RelationType.avoidance ||
    !filters[RelationType.avoidance] ||
    path.avoidance?.id === filters[RelationType.avoidance]);

const filteredAttackPathExplanations = computed(() =>
  props.selectedNodeAttackPathExplanations.filter((path) =>
    pathMatchesFilters(path, props.attackPathFilters)
  )
);

const hasAttackPathFilters = computed(() => props.hasActiveAttackPathFilters);

const visibleAttackPathExplanations = computed(() => {
  if (showAllAttackPaths.value) {
    return filteredAttackPathExplanations.value;
  }
  return filteredAttackPathExplanations.value.slice(
    0,
    DEFAULT_ATTACK_PATH_PREVIEW_LIMIT
  );
});

const hiddenAttackPathCount = computed(
  () =>
    filteredAttackPathExplanations.value.length -
    visibleAttackPathExplanations.value.length
);

const getDisplayedThreatActors = (path: AttackPathExplanation) => {
  const threatActorId = props.attackPathFilters[RelationType.threatActor];
  if (!threatActorId) return path.threatActors;
  return path.threatActors.filter(
    (actor) => actor.id === threatActorId
  );
};

const getDisplayedAttackPathFinding = (path: AttackPathExplanation) => {
  const displayedThreatActors = getDisplayedThreatActors(path);
  const actorCount = displayedThreatActors.length || path.threatActors.length;
  const singleActor = actorCount === 1 ? displayedThreatActors[0] : undefined;
  const avoidance =
    path.avoidance?.title ?? t("relationView.noAvoidanceCoverage");

  if (path.attackTool) {
    const toolRiskStep = path.steps.find((step) => step.toId === path.risk.id);
    if (singleActor) {
      return t("relationView.attackPathFinding.singleActorToolRisk", {
        actor: singleActor.title,
        tool: path.attackTool.title,
        risk: path.risk.title,
        relation: toolRiskStep?.relationType ?? t("relationLine.causeRisk"),
        avoidance,
      });
    }

    return t("relationView.attackPathFinding.toolRisk", {
      actorCount,
      tool: path.attackTool.title,
      risk: path.risk.title,
      relation: toolRiskStep?.relationType ?? t("relationLine.causeRisk"),
      avoidance,
    });
  }

  if (singleActor) {
    return t("relationView.attackPathFinding.singleActorRisk", {
      actor: singleActor.title,
      risk: path.risk.title,
      avoidance,
    });
  }

  return t("relationView.attackPathFinding.actorRisk", {
    actorCount,
    risk: path.risk.title,
    avoidance,
  });
};

const openAttackPathSelect = (event: MouseEvent) => {
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

const updateAttackPathFilter = (
  type: AttackPathFilterType,
  value: string | undefined
) => {
  showAllAttackPaths.value = false;
  emit("update:attack-path-filters", {
    ...props.attackPathFilters,
    [type]: value || undefined,
  });
};

const toggleShowAllAttackPaths = () => {
  showAllAttackPaths.value = !showAllAttackPaths.value;
};
</script>

<template>
  <div v-if="selectedNodeAttackPathSummary.length" class="node-explain-block">
    <h3>{{ t("relationView.attackPathRole") }}</h3>
    <div class="node-insight-panel node-attack-role-panel">
      <div
        v-if="selectedNodeAttackPathDescription"
        class="node-attack-role-description"
      >
        {{ selectedNodeAttackPathDescription }}
      </div>
      <div class="node-role-list">
        <span
          v-for="role in selectedNodeAttackPathSummary"
          :key="role"
          class="node-role-chip"
          >{{ role }}</span
        >
      </div>
      <div
        v-if="selectedNodeAttackPathExplanations.length > 1"
        class="node-attack-filter-block"
      >
        <div class="node-attack-filter-header">
          <span>{{ t("relationView.attackPathFilters") }}</span>
          <span>
            {{
              t("relationView.filteredPathCount", {
                matched: filteredAttackPathExplanations.length,
                visible: visibleAttackPathExplanations.length,
                total: selectedNodeAttackPathExplanations.length,
              })
            }}
          </span>
        </div>
        <div class="node-attack-filter-grid">
          <label
            class="node-attack-filter-select"
            @click="openAttackPathSelect"
          >
            <span>{{ t("relationView.filterThreatActor") }}</span>
            <select
              id="attack-path-filter-threat-actor"
              name="attack-path-filter-threat-actor"
              :value="attackPathFilters[RelationType.threatActor] ?? ''"
              @change="
                updateAttackPathFilter(
                  RelationType.threatActor,
                  ($event.target as HTMLSelectElement).value
                )
              "
            >
              <option value="">
                {{ t("relationView.allAttackPathFilterOptions") }}
              </option>
              <option
                v-for="option in attackPathFilterOptions[RelationType.threatActor]"
                :key="option.key"
                :value="option.key"
              >
                {{ `${option.label} (${option.key})` }}
              </option>
              <option
                v-if="
                  attackPathFilterOptions[RelationType.threatActor].length === 0
                "
                disabled
              >
                {{ t("relationView.noAttackPathFilterOptions") }}
              </option>
            </select>
          </label>
          <label
            class="node-attack-filter-select"
            @click="openAttackPathSelect"
          >
            <span>{{ t("relationView.filterAttackTool") }}</span>
            <select
              id="attack-path-filter-attack-tool"
              name="attack-path-filter-attack-tool"
              :value="attackPathFilters[RelationType.attackTool] ?? ''"
              @change="
                updateAttackPathFilter(
                  RelationType.attackTool,
                  ($event.target as HTMLSelectElement).value
                )
              "
            >
              <option value="">
                {{ t("relationView.allAttackPathFilterOptions") }}
              </option>
              <option
                v-for="option in attackPathFilterOptions[RelationType.attackTool]"
                :key="option.key"
                :value="option.key"
              >
                {{ `${option.label} (${option.key})` }}
              </option>
              <option
                v-if="
                  attackPathFilterOptions[RelationType.attackTool].length === 0
                "
                disabled
              >
                {{ t("relationView.noAttackPathFilterOptions") }}
              </option>
            </select>
          </label>
          <label
            class="node-attack-filter-select"
            @click="openAttackPathSelect"
          >
            <span>{{ t("relationView.filterRisk") }}</span>
            <select
              id="attack-path-filter-risk"
              name="attack-path-filter-risk"
              :value="attackPathFilters[RelationType.risk] ?? ''"
              @change="
                updateAttackPathFilter(
                  RelationType.risk,
                  ($event.target as HTMLSelectElement).value
                )
              "
            >
              <option value="">
                {{ t("relationView.allAttackPathFilterOptions") }}
              </option>
              <option
                v-for="option in attackPathFilterOptions[RelationType.risk]"
                :key="option.key"
                :value="option.key"
              >
                {{ `${option.label} (${option.key})` }}
              </option>
              <option
                v-if="attackPathFilterOptions[RelationType.risk].length === 0"
                disabled
              >
                {{ t("relationView.noAttackPathFilterOptions") }}
              </option>
            </select>
          </label>
          <label
            class="node-attack-filter-select"
            @click="openAttackPathSelect"
          >
            <span>{{ t("relationView.filterAvoidance") }}</span>
            <select
              id="attack-path-filter-avoidance"
              name="attack-path-filter-avoidance"
              :value="attackPathFilters[RelationType.avoidance] ?? ''"
              @change="
                updateAttackPathFilter(
                  RelationType.avoidance,
                  ($event.target as HTMLSelectElement).value
                )
              "
            >
              <option value="">
                {{ t("relationView.allAttackPathFilterOptions") }}
              </option>
              <option
                v-for="option in attackPathFilterOptions[RelationType.avoidance]"
                :key="option.key"
                :value="option.key"
              >
                {{ `${option.label} (${option.key})` }}
              </option>
              <option
                v-if="
                  attackPathFilterOptions[RelationType.avoidance].length === 0
                "
                disabled
              >
                {{ t("relationView.noAttackPathFilterOptions") }}
              </option>
            </select>
          </label>
          <button
            type="button"
            class="node-filter-clear-button"
            :disabled="!hasAttackPathFilters"
            @click="emit('reset-attack-path-filters')"
          >
            {{ t("relationView.clearAttackPathFilters") }}
          </button>
        </div>
      </div>
      <div
        v-for="path in visibleAttackPathExplanations"
        :key="path.pathKey"
        class="node-attack-path-card"
      >
        <div class="node-path-summary">
          {{ getDisplayedAttackPathFinding(path) }}
        </div>
        <div class="node-attack-key-entities">
          <div v-if="path.attackTool" class="node-attack-entity">
            <span class="node-attack-entity-label">{{
              t("relationType.attackTool")
            }}</span>
            <strong>{{ path.attackTool.title }}</strong>
            <span>{{ path.attackTool.id }}</span>
          </div>
          <div class="node-attack-entity">
            <span class="node-attack-entity-label">{{
              t("relationType.risk")
            }}</span>
            <strong>{{ path.risk.title }}</strong>
            <span>{{ path.risk.id }}</span>
          </div>
          <div v-if="path.avoidance" class="node-attack-entity">
            <span class="node-attack-entity-label">{{
              t("relationType.avoidance")
            }}</span>
            <strong>{{ path.avoidance.title }}</strong>
            <span>{{ path.avoidance.id }}</span>
          </div>
        </div>
        <div
          v-if="getDisplayedThreatActors(path).length"
          class="node-relation-fields"
        >
          {{ t("relationView.relatedThreatActors") }}:
          {{
            getDisplayedThreatActors(path)
              .map((actor) => `${actor.title} (${actor.id})`)
              .join(", ")
          }}
        </div>
        <div v-if="path.evidenceFields.length" class="node-relation-fields">
          {{ t("relationView.keyEvidence") }}:
          {{ path.evidenceFields.join(", ") }}
        </div>
        <div class="node-attack-action">{{ path.recommendedAction }}</div>
        <div v-if="path.qualityFlags.length" class="node-relation-fields">
          {{ path.qualityFlags.join(", ") }}
        </div>
      </div>
      <div
        v-if="
          selectedNodeAttackPathExplanations.length &&
          filteredAttackPathExplanations.length === 0
        "
        class="node-relation-more"
      >
        {{ t("relationView.noFilteredAttackPaths") }}
      </div>
      <button
        v-else-if="hiddenAttackPathCount > 0 || showAllAttackPaths"
        type="button"
        class="node-relation-more node-attack-path-more-button"
        @click="toggleShowAllAttackPaths"
      >
        {{
          showAllAttackPaths
            ? t("relationView.collapseAttackPathCount", {
                count: hiddenAttackPathCount,
              })
            : t("relationView.hiddenAttackPathCount", {
                count: hiddenAttackPathCount,
              })
        }}
      </button>
    </div>
  </div>
</template>
