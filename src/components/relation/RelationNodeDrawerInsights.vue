<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import { useI18n } from "vue-i18n";

interface RootRelationSummary {
  direction: string;
  text: string;
  directness: string;
  sourceFields: string[];
  evidenceLabel: string;
  explanation: string;
  impactHint: string;
  qualityFlags: string[];
}

interface PathNodeSummary {
  id: string;
  type: string;
  title: string;
}

interface PathStepSummary {
  relation: {
    direction: string;
    text: string;
    directness: string;
    sourceFields: string[];
  };
  targetNode: PathNodeSummary;
  isCurrentTarget: boolean;
}

interface RootPathSummary {
  hopCount: number;
  startNode: PathNodeSummary;
  steps: PathStepSummary[];
}

interface RootPreviewSummary {
  nodeCount: number;
  lineCount: number;
  groupedCounts: Record<string, number>;
}

interface AttackPathExplanation {
  pathKey: string;
  pathCount: number;
  threatActors: Array<{
    id: string;
    title: string;
    type: string;
  }>;
  threatActorId?: string;
  attackTool?: {
    id: string;
    title: string;
    type: string;
  };
  attackToolId?: string;
  risk: {
    id: string;
    title: string;
    type: string;
  };
  riskId: string;
  avoidance?: {
    id: string;
    title: string;
    type: string;
  };
  avoidanceId?: string;
  summary: string;
  analysisFinding: string;
  recommendedAction: string;
  evidenceFields: string[];
  defensiveFocus: string[];
  qualityFlags: string[];
  steps: Array<{
    fromId: string;
    fromTitle: string;
    toId: string;
    toTitle: string;
    relationType: string;
    sourceFields: string[];
    attackIntent: string;
    defensiveMeaning: string;
  }>;
}

const props = defineProps<{
  rootNodeRelations: RootRelationSummary[];
  selectedNodeRootPath: RootPathSummary | null;
  selectedNodeAttackPathSummary: string[];
  selectedNodeAttackPathDescription: string;
  selectedNodeAttackPathExplanations: AttackPathExplanation[];
  selectedNodeRootPreview: RootPreviewSummary | null;
  relKey: string;
  getNodeTypeTitle: (type: string) => string;
  isPathNodeCurrentSelection: (nodeId: string) => boolean;
  isCurrentNodeRoot: boolean;
}>();

const emit = defineEmits<{
  "focus-node": [nodeId: string];
  "open-node-as-root": [nodeId: string];
}>();

const { t } = useI18n();

type AttackPathEntity = AttackPathExplanation["risk"];
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
  <div v-if="rootNodeRelations.length" class="node-explain-block">
    <h3>{{ t("relationView.rootRelation") }}</h3>
    <div class="node-insight-panel">
      <div
        v-for="relation in rootNodeRelations"
        :key="`${relation.direction}-${relation.text}`"
        class="node-relation-item"
      >
        <div>
          <span class="node-relation-direction">{{ relation.direction }}</span>
          <span>{{ relation.text }}</span>
          <span class="node-relation-directness">{{
            relation.directness
          }}</span>
        </div>
        <div v-if="relation.sourceFields.length" class="node-relation-fields">
          {{ t("relationView.sourceFields") }}:
          {{ relation.sourceFields.join(", ") }}
        </div>
        <div class="node-relation-fields">{{ relation.explanation }}</div>
        <div class="node-relation-fields">{{ relation.impactHint }}</div>
      </div>
    </div>
  </div>
  <div v-else class="node-explain-block">
    <h3>{{ t("relationView.rootRelation") }}</h3>
    <div class="node-insight-panel node-root-relation-empty-panel">
      <div class="node-root-relation-status">
        {{
          isCurrentNodeRoot
            ? t("relationView.currentNodeIsRoot")
            : t("relationView.noDirectRootRelation")
        }}
      </div>
      <div v-if="selectedNodeRootPath" class="node-path-preview">
        <div class="node-path-summary">
          {{
            t("relationView.indirectPathSummary", {
              count: selectedNodeRootPath.hopCount,
            })
          }}
        </div>
        <div class="node-path-chain">
          <div class="node-path-node node-path-node-root">
            <div class="node-path-node-tag">
              {{ t("relationView.rootStart") }}
            </div>
            <div class="node-path-node-main">
              <span
                :title="selectedNodeRootPath.startNode.type"
                class="node-path-node-id"
              >
                {{ selectedNodeRootPath.startNode.id }}
              </span>
              <span>{{ selectedNodeRootPath.startNode.title }}</span>
            </div>
            <div class="node-path-node-actions">
              <el-button
                link
                size="small"
                :disabled="
                  isPathNodeCurrentSelection(selectedNodeRootPath.startNode.id)
                "
                @click="emit('focus-node', selectedNodeRootPath.startNode.id)"
              >
                {{ t("relationView.switchNode") }}
              </el-button>
              <el-button link size="small" disabled>
                {{ t("openAsRoot") }}
              </el-button>
            </div>
          </div>
          <div
            v-for="(step, index) in selectedNodeRootPath.steps"
            :key="`${step.relation.direction}-${step.relation.text}-${step.targetNode.id}-${index}`"
            class="node-path-step"
          >
            <div class="node-path-relation">
              <div>
                <span class="node-relation-direction">{{
                  step.relation.direction
                }}</span>
                <span>{{ step.relation.text }}</span>
                <span class="node-relation-directness">{{
                  step.relation.directness
                }}</span>
              </div>
              <div
                v-if="step.relation.sourceFields.length"
                class="node-relation-fields"
              >
                {{ t("relationView.sourceFields") }}:
                {{ step.relation.sourceFields.join(", ") }}
              </div>
            </div>
            <div
              :class="[
                'node-path-node',
                step.isCurrentTarget ? 'node-path-node-current' : '',
              ]"
            >
              <div class="node-path-node-tag">
                {{
                  step.isCurrentTarget
                    ? t("relationView.currentNode")
                    : t("relationView.pathNode")
                }}
              </div>
              <div class="node-path-node-main">
                <span :title="step.targetNode.type" class="node-path-node-id">{{
                  step.targetNode.id
                }}</span>
                <span>{{ step.targetNode.title }}</span>
              </div>
              <div class="node-path-node-actions">
                <el-button
                  link
                  size="small"
                  :disabled="isPathNodeCurrentSelection(step.targetNode.id)"
                  @click="emit('focus-node', step.targetNode.id)"
                >
                  {{ t("relationView.switchNode") }}
                </el-button>
                <el-button
                  link
                  size="small"
                  :disabled="step.targetNode.id === relKey"
                  @click="emit('open-node-as-root', step.targetNode.id)"
                >
                  {{ t("openAsRoot") }}
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

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

  <div v-if="selectedNodeRootPreview" class="node-explain-block">
    <h3>{{ t("relationView.rootPreview") }}</h3>
    <div class="node-insight-panel">
      <div class="node-detail-counts">
        <span
          >{{ t("relationView.previewNodeCount") }}:
          {{ selectedNodeRootPreview.nodeCount }}</span
        >
        <span
          >{{ t("relationView.previewRelationCount") }}:
          {{ selectedNodeRootPreview.lineCount }}</span
        >
      </div>
      <div class="node-preview-groups">
        <span
          v-for="(count, type) in selectedNodeRootPreview.groupedCounts"
          :key="type"
          class="node-role-chip"
        >
          {{ getNodeTypeTitle(type) }} {{ count }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.node-explain-block {
  margin-top: 14px;
}

.node-explain-block h3 {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 700;
}

.node-insight-panel {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  max-width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--break-border);
  border-radius: 8px;
  background: var(--break-bg-soft);
  overflow: hidden;
}

.node-root-relation-empty-panel {
  gap: 8px;
  padding: 0;
  border: 0;
  background: transparent;
}

.node-root-relation-status {
  display: inline-flex;
  align-self: flex-start;
  align-items: center;
  max-width: 100%;
  padding: 4px 10px;
  border: 1px solid var(--break-border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--break-bg-soft) 72%, transparent);
  color: var(--break-text-muted);
  font-size: 12px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.node-relation-item {
  padding-top: 10px;
  font-size: 12px;
  line-height: 1.4;
}

.node-relation-item:first-child {
  padding-top: 0;
}

.node-relation-item + .node-relation-item {
  border-top: 1px solid var(--break-border);
}

.node-relation-direction {
  margin-right: 6px;
  font-weight: 700;
}

.node-relation-fields,
.node-relation-more {
  color: var(--break-text-muted);
  font-size: 12px;
  line-height: 1.65;
  overflow-wrap: anywhere;
}

.node-relation-directness {
  display: inline-flex;
  align-items: center;
  margin-left: 8px;
  padding: 2px 8px;
  border: 1px solid var(--break-border);
  border-radius: 999px;
  color: var(--break-text-secondary);
  font-size: 11px;
}

.node-role-chip {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border: 1px solid var(--break-border);
  border-radius: 999px;
  background: var(--break-bg);
  color: var(--break-text-secondary);
  font-size: 11px;
  line-height: 1.2;
}

.node-path-preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.node-path-summary {
  color: var(--break-text-secondary);
  font-size: 12px;
}

.node-path-chain {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.node-path-step {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-left: 12px;
}

.node-path-step::before {
  content: "";
  position: absolute;
  top: -4px;
  bottom: calc(100% - 12px);
  left: 3px;
  width: 1px;
  background: var(--break-border);
}

.node-path-node {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  border: 1px solid var(--break-border);
  border-radius: 8px;
  background: var(--break-bg-soft);
}

.node-path-node-root {
  border-color: color-mix(
    in srgb,
    var(--el-color-primary) 28%,
    var(--break-border)
  );
}

.node-path-node-current {
  border-color: color-mix(
    in srgb,
    var(--el-color-success) 28%,
    var(--break-border)
  );
}

.node-path-node-tag {
  color: var(--break-text-muted);
  font-size: 11px;
  font-weight: 600;
}

.node-path-node-main {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 6px;
  color: var(--break-text-primary);
  font-size: 12px;
  overflow-wrap: anywhere;
}

.node-path-node-id {
  font-weight: 700;
}

.node-path-node-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
}

.node-path-relation {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-left: 16px;
}

.node-role-list,
.node-preview-groups,
.node-detail-counts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.node-detail-counts {
  color: var(--break-text-muted);
  font-size: 12px;
}

.node-attack-path-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid var(--break-border);
}

.node-attack-filter-block + .node-attack-path-card {
  border-top: 0;
}

.node-attack-filter-block {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  max-width: 100%;
  padding: 8px 0 10px;
  border-bottom: 1px solid var(--break-border);
  overflow: hidden;
}

.node-attack-filter-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 6px;
  color: var(--break-text-muted);
  font-size: 12px;
}

.node-attack-filter-header span:first-child {
  color: var(--break-text-secondary);
  font-weight: 700;
}

.node-attack-filter-grid {
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  min-width: 0;
  max-width: 100%;
}

.node-attack-filter-select {
  box-sizing: border-box;
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: center;
  gap: 3px;
  min-width: 0;
  width: 100%;
  max-width: 100%;
  padding: 7px 8px;
  border: 1px solid var(--break-border);
  border-radius: 6px;
  background: var(--break-bg);
  overflow: hidden;
}

.node-attack-filter-select::after {
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

.node-attack-filter-select span {
  box-sizing: border-box;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--break-text-muted);
  font-size: 11px;
  font-weight: 500;
  line-height: 1.2;
}

.node-attack-filter-select select {
  appearance: none;
  -webkit-appearance: none;
  box-sizing: border-box;
  display: block;
  min-width: 0;
  inline-size: 100%;
  width: 100%;
  max-inline-size: 100%;
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

.node-attack-key-entities {
  display: grid;
  grid-template-columns: 1fr;
  gap: 6px;
}

.node-attack-entity {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  font-size: 12px;
}

.node-attack-entity span:last-child {
  color: var(--break-text-muted);
}

.node-attack-entity-label {
  display: inline-flex;
  padding: 2px 6px;
  border: 1px solid var(--break-border);
  border-radius: 999px;
  color: var(--break-text-secondary);
  font-size: 11px;
}

.node-attack-action {
  padding: 8px 10px;
  border: 1px solid
    color-mix(in srgb, var(--el-color-success) 22%, var(--break-border));
  border-radius: 8px;
  background: color-mix(in srgb, var(--el-color-success) 5%, var(--break-bg));
  color: var(--break-text-secondary);
  font-size: 12px;
  line-height: 1.6;
  font-weight: 600;
}

.node-attack-role-panel {
  border: 1px solid
    color-mix(in srgb, var(--el-color-primary) 18%, var(--break-border));
  background: color-mix(in srgb, var(--el-color-primary) 4%, var(--break-bg));
}

.node-attack-role-description {
  color: var(--break-text-secondary);
  font-size: 12px;
  line-height: 1.65;
}

@media (max-width: 767px) {
  .node-explain-block {
    margin-top: 10px;
  }

  .node-explain-block h3 {
    margin-bottom: 6px;
    font-size: 12px;
  }

  .node-insight-panel {
    gap: 8px;
    padding: 8px 9px;
    border-radius: 7px;
  }

  .node-relation-item {
    padding-top: 8px;
    line-height: 1.45;
  }

  .node-relation-directness {
    margin-left: 4px;
    padding: 1px 6px;
  }

  .node-role-chip {
    padding: 3px 8px;
    border-radius: 8px;
    overflow-wrap: anywhere;
  }

  .node-path-step {
    gap: 6px;
    padding-left: 8px;
  }

  .node-path-node {
    gap: 5px;
    padding: 7px 8px;
    border-radius: 7px;
  }

  .node-path-node-main {
    display: block;
    line-height: 1.55;
  }

  .node-path-node-id {
    margin-right: 6px;
  }

  .node-path-node-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }

  .node-path-node-actions :deep(.el-button) {
    justify-content: center;
    margin-left: 0;
    min-width: 0;
  }

  .node-path-relation {
    padding-left: 8px;
    font-size: 12px;
    overflow-wrap: anywhere;
  }

  .node-role-list,
  .node-preview-groups,
  .node-detail-counts {
    gap: 5px;
  }

  .node-attack-filter-grid {
    grid-template-columns: 1fr;
    gap: 6px;
  }
}
</style>
