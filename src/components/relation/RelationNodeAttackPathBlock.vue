<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import { useI18n } from "vue-i18n";
import type {
  AttackPathEntity,
  AttackPathExplanation,
} from "@/components/relation/relationNodeDrawerInsightTypes";
import "@/components/relation/relationNodeDrawerInsights.css";

const props = defineProps<{
  selectedNodeAttackPathSummary: string[];
  selectedNodeAttackPathDescription: string;
  selectedNodeAttackPathExplanations: AttackPathExplanation[];
}>();

const { t } = useI18n();

const DEFAULT_ATTACK_PATH_PREVIEW_LIMIT = 3;
const FILTERED_ATTACK_PATH_RENDER_LIMIT = 30;

const attackPathFilters = reactive({
  threatActorId: "",
  attackToolId: "",
  riskId: "",
  avoidanceId: "",
});

const formatFilterOptionLabel = (entity: AttackPathEntity) =>
  `${entity.title} (${entity.id})`;

const uniqueEntityOptions = (entities: Array<AttackPathEntity | undefined>) => {
  const optionMap = new Map<string, AttackPathEntity>();
  entities.forEach((entity) => {
    if (entity && !optionMap.has(entity.id)) {
      optionMap.set(entity.id, entity);
    }
  });

  return [...optionMap.values()].sort((first, second) =>
    first.id.localeCompare(second.id, undefined, {
      numeric: true,
      sensitivity: "base",
    })
  );
};

type AttackPathFilterKey = keyof typeof attackPathFilters;
type AttackPathFilterValues = Record<AttackPathFilterKey, string>;

const pathMatchesFilters = (
  path: AttackPathExplanation,
  filters: AttackPathFilterValues,
  ignoredFilter?: AttackPathFilterKey
) =>
  (ignoredFilter === "threatActorId" ||
    !filters.threatActorId ||
    path.threatActors.some((actor) => actor.id === filters.threatActorId)) &&
  (ignoredFilter === "attackToolId" ||
    !filters.attackToolId ||
    path.attackTool?.id === filters.attackToolId) &&
  (ignoredFilter === "riskId" ||
    !filters.riskId ||
    path.risk.id === filters.riskId) &&
  (ignoredFilter === "avoidanceId" ||
    !filters.avoidanceId ||
    path.avoidance?.id === filters.avoidanceId);

const getCandidatePathsForFilter = (ignoredFilter: AttackPathFilterKey) =>
  props.selectedNodeAttackPathExplanations.filter((path) =>
    pathMatchesFilters(path, attackPathFilters, ignoredFilter)
  );

const attackPathFilterOptions = computed(() => ({
  threatActors: uniqueEntityOptions(
    getCandidatePathsForFilter("threatActorId").flatMap(
      (path) => path.threatActors
    )
  ),
  attackTools: uniqueEntityOptions(
    getCandidatePathsForFilter("attackToolId").map((path) => path.attackTool)
  ),
  risks: uniqueEntityOptions(
    getCandidatePathsForFilter("riskId").map((path) => path.risk)
  ),
  avoidances: uniqueEntityOptions(
    getCandidatePathsForFilter("avoidanceId").map((path) => path.avoidance)
  ),
}));

const filteredAttackPathExplanations = computed(() =>
  props.selectedNodeAttackPathExplanations.filter((path) =>
    pathMatchesFilters(path, attackPathFilters)
  )
);

const hasAttackPathFilters = computed(() =>
  Boolean(
    attackPathFilters.threatActorId ||
      attackPathFilters.attackToolId ||
      attackPathFilters.riskId ||
      attackPathFilters.avoidanceId
  )
);

const visibleAttackPathExplanations = computed(() => {
  const limit = hasAttackPathFilters.value
    ? FILTERED_ATTACK_PATH_RENDER_LIMIT
    : DEFAULT_ATTACK_PATH_PREVIEW_LIMIT;
  return filteredAttackPathExplanations.value.slice(0, limit);
});

const hiddenAttackPathCount = computed(
  () =>
    filteredAttackPathExplanations.value.length -
    visibleAttackPathExplanations.value.length
);

const getDisplayedThreatActors = (path: AttackPathExplanation) => {
  if (!attackPathFilters.threatActorId) return path.threatActors;
  return path.threatActors.filter(
    (actor) => actor.id === attackPathFilters.threatActorId
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

const resetAttackPathFilters = () => {
  attackPathFilters.threatActorId = "";
  attackPathFilters.attackToolId = "";
  attackPathFilters.riskId = "";
  attackPathFilters.avoidanceId = "";
};

watch(
  attackPathFilterOptions,
  (options) => {
    if (
      attackPathFilters.threatActorId &&
      !options.threatActors.some(
        (option) => option.id === attackPathFilters.threatActorId
      )
    ) {
      attackPathFilters.threatActorId = "";
    }
    if (
      attackPathFilters.attackToolId &&
      !options.attackTools.some(
        (option) => option.id === attackPathFilters.attackToolId
      )
    ) {
      attackPathFilters.attackToolId = "";
    }
    if (
      attackPathFilters.riskId &&
      !options.risks.some((option) => option.id === attackPathFilters.riskId)
    ) {
      attackPathFilters.riskId = "";
    }
    if (
      attackPathFilters.avoidanceId &&
      !options.avoidances.some(
        (option) => option.id === attackPathFilters.avoidanceId
      )
    ) {
      attackPathFilters.avoidanceId = "";
    }
  },
  { flush: "post" }
);

watch(
  () =>
    props.selectedNodeAttackPathExplanations
      .map((path) => path.pathKey)
      .join("|"),
  () => resetAttackPathFilters()
);
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
            <select v-model="attackPathFilters.threatActorId">
              <option value="">
                {{ t("relationView.allAttackPathFilterOptions") }}
              </option>
              <option
                v-for="option in attackPathFilterOptions.threatActors"
                :key="option.id"
                :value="option.id"
              >
                {{ formatFilterOptionLabel(option) }}
              </option>
              <option
                v-if="attackPathFilterOptions.threatActors.length === 0"
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
            <select v-model="attackPathFilters.attackToolId">
              <option value="">
                {{ t("relationView.allAttackPathFilterOptions") }}
              </option>
              <option
                v-for="option in attackPathFilterOptions.attackTools"
                :key="option.id"
                :value="option.id"
              >
                {{ formatFilterOptionLabel(option) }}
              </option>
              <option
                v-if="attackPathFilterOptions.attackTools.length === 0"
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
            <select v-model="attackPathFilters.riskId">
              <option value="">
                {{ t("relationView.allAttackPathFilterOptions") }}
              </option>
              <option
                v-for="option in attackPathFilterOptions.risks"
                :key="option.id"
                :value="option.id"
              >
                {{ formatFilterOptionLabel(option) }}
              </option>
              <option
                v-if="attackPathFilterOptions.risks.length === 0"
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
            <select v-model="attackPathFilters.avoidanceId">
              <option value="">
                {{ t("relationView.allAttackPathFilterOptions") }}
              </option>
              <option
                v-for="option in attackPathFilterOptions.avoidances"
                :key="option.id"
                :value="option.id"
              >
                {{ formatFilterOptionLabel(option) }}
              </option>
              <option
                v-if="attackPathFilterOptions.avoidances.length === 0"
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
            @click="resetAttackPathFilters"
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
      <div v-else-if="hiddenAttackPathCount > 0" class="node-relation-more">
        {{
          t("relationView.hiddenAttackPathCount", {
            count: hiddenAttackPathCount,
          })
        }}
      </div>
    </div>
  </div>
</template>
