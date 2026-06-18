<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import RelationNodeDetailContent from "@/components/relation/RelationNodeDetailContent.vue";
import RelationNodeSpecialInsightBlock from "@/components/relation/RelationNodeSpecialInsightBlock.vue";
import {
  RelationType,
  type AttackPathDetail,
  type AttackPathFilterOption,
  type AttackPathFilterType,
  type AttackPathFilters,
  type createRelationTypeMapping,
  type RiskAvoidanceCoverage,
} from "@/views/relation/relationTypes";
import type {
  AttackPathExplanation,
  NodeAnalysisSummary,
  NodeBusinessSceneImpactSummary,
  NodeCoverageSummary,
  NodeSpecialInsightSummary,
  RootPathSummary,
  RootRelationSummary,
} from "@/components/relation/relationNodeDrawerInsightTypes";
import "@/components/relation/relationNodeDrawerInsights.css";

interface DetailNode {
  id: string;
  type: string;
}

interface RelationSummary {
  relationKey: string;
  direction: string;
  text: string;
  directness: string;
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
  active: boolean;
  relationTypeMapping: ReturnType<typeof createRelationTypeMapping>;
  attackPathDetails: AttackPathDetail[];
  selectedNetworkNode: DetailNode | null;
  attackPathFilterOptions: Record<AttackPathFilterType, AttackPathFilterOption[]>;
  attackPathFilters: AttackPathFilters;
  filteredAttackPathCount: number;
  hasActiveAttackPathFilters: boolean;
  riskAvoidanceCoverage: RiskAvoidanceCoverage | null;
  selectedAttackPathDetail: AttackPathDetail | null;
  selectedNodeAnalysisSummary: NodeAnalysisSummary | null;
  selectedNodeAttackPathSummary: string[];
  selectedNodeAttackPathDescription: string;
  selectedNodeAttackPathExplanations: AttackPathExplanation[];
  selectedNodeBusinessSceneImpactSummary: NodeBusinessSceneImpactSummary | null;
  selectedNodeCoverageSummary: NodeCoverageSummary | null;
  selectedNodeSpecialInsightSummary: NodeSpecialInsightSummary | null;
  selectedNetworkNodeTitle: string;
  selectedNetworkRelationCounts: {
    incoming: number;
    outgoing: number;
  };
  selectedNetworkRelations: RelationSummary[];
  rootNodeRelations: RootRelationSummary[];
  selectedNodeRootPath: RootPathSummary | null;
  relKey: string;
  getNodeTypeTitle: (type: string) => string;
  isPathNodeCurrentSelection: (nodeId: string) => boolean;
  isRelationOnSelectedPath: (relationKey: string) => boolean;
  isCurrentNodeRoot: boolean;
  drawerCopyFeedbackMessage: string;
  drawerCopyFeedbackType: "success" | "error";
}>();

const emit = defineEmits<{
  "update:attack-path-filters": [value: AttackPathFilters];
  "reset-attack-path-filters": [];
  "select-attack-path": [pathId: string];
  "apply-avoidance-filter": [avoidanceKey: string];
  "copy-csv": [];
  "view-detail": [];
  "open-detail-new-window": [];
  "open-as-root": [];
  "focus-node": [nodeId: string];
  "open-node-as-root": [nodeId: string];
  "open-node-detail": [nodeId: string];
}>();

const { t } = useI18n();
const coverageColumnRef = ref<HTMLElement | null>(null);
const pathColumnRef = ref<HTMLElement | null>(null);
const detailColumnRef = ref<HTMLElement | null>(null);
const preserveScrollPane = ref<"left" | "middle" | "right" | null>(null);

const filterTypes: AttackPathFilterType[] = [
  RelationType.threatActor,
  RelationType.attackTool,
  RelationType.risk,
  RelationType.avoidance,
];

const updateFilter = (type: AttackPathFilterType, value: string | undefined) => {
  emit("update:attack-path-filters", {
    ...props.attackPathFilters,
    [type]: value || undefined,
  });
};

const applySpecialInsightFilter = (payload: { type: string; id: string }) => {
  preserveScrollPane.value = "left";
  const nextFilters: AttackPathFilters = {};
  if (payload.type === RelationType.avoidance) {
    nextFilters[RelationType.avoidance] = payload.id;
  } else if (payload.type === RelationType.attackTool) {
    nextFilters[RelationType.attackTool] = payload.id;
  } else if (payload.type === RelationType.threatActor) {
    nextFilters[RelationType.threatActor] = payload.id;
  } else if (payload.type === RelationType.risk) {
    nextFilters[RelationType.risk] = payload.id;
  }

  emit("update:attack-path-filters", nextFilters);
};

const emitAttackPathFilters = (
  filters: AttackPathFilters,
  preservePane: "left" | "middle" | "right"
) => {
  preserveScrollPane.value = preservePane;
  emit("update:attack-path-filters", filters);
};

const applyLeftAvoidanceFilter = (avoidanceKey: string) => {
  preserveScrollPane.value = "left";
  emit("apply-avoidance-filter", avoidanceKey);
};

const selectMiddleAttackPath = (pathId: string) => {
  preserveScrollPane.value = "middle";
  emit("select-attack-path", pathId);
};

const emitRightAction = <T extends unknown[]>(
  eventName: Parameters<typeof emit>[0],
  ...args: T
) => {
  preserveScrollPane.value = "right";
  emit(eventName, ...(args as never));
};

const hasAnyAnalysis = computed(
  () =>
    props.selectedNodeAnalysisSummary ||
    props.selectedNodeSpecialInsightSummary ||
    props.selectedNodeBusinessSceneImpactSummary ||
    props.selectedNodeCoverageSummary ||
    props.selectedNodeAttackPathSummary.length > 0 ||
    props.riskAvoidanceCoverage ||
    props.selectedAttackPathDetail ||
    props.rootNodeRelations.length > 0
);

const displayedCoverageItems = computed(() => {
  return props.riskAvoidanceCoverage?.items ?? [];
});

const resetColumnScroll = () => {
  nextTick(() => {
    const preservedPane = preserveScrollPane.value;
    preserveScrollPane.value = null;
    [
      { key: "left", column: coverageColumnRef.value },
      { key: "middle", column: pathColumnRef.value },
      { key: "right", column: detailColumnRef.value },
    ].forEach(({ key, column }) => {
      if (key === preservedPane) return;
      if (!column) return;
      column.scrollTop = 0;
      column.scrollLeft = 0;
    });
  });
};

watch(
  () => [
    props.selectedNetworkNode?.type ?? "",
    props.selectedNetworkNode?.id ?? "",
    props.attackPathFilters[RelationType.threatActor] ?? "",
    props.attackPathFilters[RelationType.attackTool] ?? "",
    props.attackPathFilters[RelationType.risk] ?? "",
    props.attackPathFilters[RelationType.avoidance] ?? "",
  ],
  resetColumnScroll
);
</script>

<template>
  <div v-if="active" class="relation-analysis-pane">
    <div v-if="!hasAnyAnalysis" class="relation-analysis-empty">
      {{ t("relationView.noAnalysis") }}
    </div>
    <template v-else>
      <div class="relation-analysis-toolbar">
        <div class="relation-analysis-filter-bar">
          <div class="relation-analysis-filter-grid">
            <label
              v-for="type in filterTypes"
              :key="type"
              class="relation-analysis-filter"
            >
              <span>{{ relationTypeMapping[type].title }}</span>
              <el-select
                :id="`relation-analysis-filter-${type}`"
                :model-value="attackPathFilters[type]"
                clearable
                filterable
                :name="`relation-analysis-filter-${type}`"
                :placeholder="t('relationView.pathFilterPlaceholder')"
                @update:model-value="
                  updateFilter(type, $event as string | undefined)
                "
              >
                <el-option
                  v-for="option in attackPathFilterOptions[type]"
                  :key="option.key"
                  :label="`${option.label} (${option.count})`"
                  :value="option.key"
                />
              </el-select>
            </label>
          </div>
          <div class="relation-analysis-filter-summary">
            <span>
              {{
                t("relationView.filteredSimplePathCount", {
                  count: filteredAttackPathCount,
                })
              }}
            </span>
            <el-button
              v-if="hasActiveAttackPathFilters"
              size="small"
              text
              @click="emit('reset-attack-path-filters')"
            >
              {{ t("relationView.resetPathFilters") }}
            </el-button>
          </div>
        </div>
      </div>

      <div class="relation-analysis-columns">
        <div class="relation-analysis-column-shell">
          <aside
            id="relation-analysis-coverage-column"
            ref="coverageColumnRef"
            class="relation-analysis-column relation-analysis-coverage-column"
          >
            <div
              v-if="riskAvoidanceCoverage"
              class="node-explain-block relation-analysis-coverage"
            >
              <h3>{{ t("relationView.coverageMode") }}</h3>
              <div class="node-insight-panel">
                <div class="relation-analysis-summary">
                  {{
                    t("relationView.coverageModeSummary", {
                      total: riskAvoidanceCoverage.totalCount,
                      direct: riskAvoidanceCoverage.directCount,
                      tool: riskAvoidanceCoverage.attackToolCount,
                      overlap: riskAvoidanceCoverage.overlapCount,
                    })
                  }}
                </div>
                <div class="relation-analysis-coverage-list">
                  <button
                    v-for="item in displayedCoverageItems"
                    :key="item.avoidanceKey"
                    type="button"
                    :class="[
                      'relation-analysis-coverage-item',
                      `relation-analysis-coverage-item-${item.source}`,
                      attackPathFilters[RelationType.avoidance] ===
                      item.avoidanceKey
                        ? 'relation-analysis-coverage-item-active'
                        : '',
                    ]"
                    @click="applyLeftAvoidanceFilter(item.avoidanceKey)"
                  >
                    <span class="relation-analysis-item-title">
                      <strong>{{ item.avoidanceTitle }}</strong>
                      <span>{{ item.avoidanceKey }}</span>
                    </span>
                    <span class="relation-analysis-item-meta">
                      {{ item.sourceLabel }} /
                      {{
                        t("relationView.coveragePathCount", {
                          count: item.pathCount,
                        })
                      }}
                    </span>
                    <span
                      v-if="item.attackToolLabels.length"
                      class="relation-analysis-item-meta"
                    >
                      {{ t("relationView.coverageToolSources") }}:
                      {{ item.attackToolLabels.join(", ") }}
                    </span>
                  </button>
                </div>
              </div>
            </div>
            <RelationNodeSpecialInsightBlock
              v-else
              :summary="selectedNodeSpecialInsightSummary"
              :interactive="true"
              @apply-filter="applySpecialInsightFilter"
            />
          </aside>
          <el-backtop
            class="relation-analysis-pane-backtop"
            target="#relation-analysis-coverage-column"
            :title="t('backtop')"
            :aria-label="t('backtop')"
            :visibility-height="240"
          />
        </div>

        <div class="relation-analysis-column-shell">
          <aside
            id="relation-analysis-path-column"
            ref="pathColumnRef"
            class="relation-analysis-column relation-analysis-path-column"
          >
            <div
              v-if="selectedAttackPathDetail"
              class="node-explain-block relation-analysis-path-detail"
            >
              <h3>{{ t("relationView.pathDetail") }}</h3>
              <div class="node-insight-panel">
                <div class="relation-analysis-summary">
                  {{
                    t("relationView.filteredSimplePathCount", {
                      count: filteredAttackPathCount,
                    })
                  }}
                </div>
                <div class="relation-analysis-path-chain">
                  <span
                    v-for="(node, index) in selectedAttackPathDetail.nodes"
                    :key="`${node.type}:${node.key}`"
                    class="relation-analysis-path-node"
                  >
                    <span>{{ node.label }}</span>
                    <span
                      v-if="index < selectedAttackPathDetail.nodes.length - 1"
                      class="relation-analysis-path-arrow"
                      >-></span
                    >
                  </span>
                </div>
                <div class="relation-analysis-segments">
                  <div
                    v-for="segment in selectedAttackPathDetail.segments"
                    :key="`${segment.source.type}:${segment.source.key}->${segment.target.type}:${segment.target.key}`"
                    class="relation-analysis-segment"
                  >
                    <div class="relation-analysis-segment-main">
                      <strong>{{ segment.source.label }}</strong>
                      <span>{{ segment.relation }}</span>
                      <strong>{{ segment.target.label }}</strong>
                    </div>
                    <div class="relation-analysis-item-meta">
                      {{ segment.reason }}
                    </div>
                    <div class="relation-analysis-item-meta">
                      {{ t("relationView.sourceFields") }}:
                      {{ segment.sourceFields.join(", ") }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="node-explain-block relation-analysis-all-paths">
              <h3>{{ t("relationView.allPaths") }}</h3>
              <div class="node-insight-panel">
                <div class="relation-analysis-summary">
                  {{
                    t("relationView.filteredSimplePathCount", {
                      count: attackPathDetails.length,
                    })
                  }}
                </div>
                <div class="relation-analysis-path-list">
                  <button
                    v-for="path in attackPathDetails"
                    :key="path.id"
                    type="button"
                    :class="[
                      'relation-analysis-path-list-item',
                      selectedAttackPathDetail?.id === path.id
                        ? 'relation-analysis-path-list-item-active'
                        : '',
                    ]"
                    @click="selectMiddleAttackPath(path.id)"
                  >
                    <span class="relation-analysis-path-list-title">
                      {{ path.label }}
                    </span>
                    <span class="relation-analysis-item-meta">
                      {{ path.segments.length }}
                      {{ t("relationView.pathSegments") }}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </aside>
          <el-backtop
            class="relation-analysis-pane-backtop"
            target="#relation-analysis-path-column"
            :title="t('backtop')"
            :aria-label="t('backtop')"
            :visibility-height="240"
          />
        </div>

        <div class="relation-analysis-column-shell">
          <div
            id="relation-analysis-detail-column"
            ref="detailColumnRef"
            class="relation-analysis-column relation-analysis-main"
          >
            <div v-if="selectedNetworkNode" class="node-explain-block">
              <h3>{{ t("relationView.relationDetail") }}</h3>
              <div class="node-insight-panel relation-analysis-detail-panel">
                <RelationNodeDetailContent
                  :selected-network-node="selectedNetworkNode"
                  :selected-network-node-title="selectedNetworkNodeTitle"
                  :selected-network-relation-counts="
                    selectedNetworkRelationCounts
                  "
                  :root-node-relations="rootNodeRelations"
                  :selected-node-root-path="selectedNodeRootPath"
                  :selected-node-analysis-summary="selectedNodeAnalysisSummary"
                  :selected-node-attack-path-summary="
                    selectedNodeAttackPathSummary
                  "
                  :selected-node-attack-path-description="
                    selectedNodeAttackPathDescription
                  "
                  :selected-node-attack-path-explanations="
                    selectedNodeAttackPathExplanations
                  "
                  :attack-path-filter-options="attackPathFilterOptions"
                  :attack-path-filters="attackPathFilters"
                  :has-active-attack-path-filters="hasActiveAttackPathFilters"
                  :selected-node-business-scene-impact-summary="
                    selectedNodeBusinessSceneImpactSummary
                  "
                  :selected-node-coverage-summary="selectedNodeCoverageSummary"
                  :show-root-relation-block="false"
                  :show-attack-path-block="false"
                  :selected-network-relations="selectedNetworkRelations"
                  :rel-key="relKey"
                  :get-node-type-title="getNodeTypeTitle"
                  :is-path-node-current-selection="
                    isPathNodeCurrentSelection
                  "
                  :is-relation-on-selected-path="isRelationOnSelectedPath"
                  :is-current-node-root="isCurrentNodeRoot"
                  :drawer-copy-feedback-message="drawerCopyFeedbackMessage"
                  :drawer-copy-feedback-type="drawerCopyFeedbackType"
                  :show-open-as-root-action="false"
                  @copy-csv="emitRightAction('copy-csv')"
                  @view-detail="emitRightAction('view-detail')"
                  @open-detail-new-window="
                    emitRightAction('open-detail-new-window')
                  "
                  @open-as-root="emitRightAction('open-as-root')"
                  @update:attack-path-filters="
                    emitAttackPathFilters($event, 'right')
                  "
                  @reset-attack-path-filters="
                    emitRightAction('reset-attack-path-filters')
                  "
                  @focus-node="emitRightAction('focus-node', $event)"
                  @open-node-as-root="
                    emitRightAction('open-node-as-root', $event)
                  "
                  @open-node-detail="emitRightAction('open-node-detail', $event)"
                />
              </div>
            </div>
          </div>
          <el-backtop
            class="relation-analysis-pane-backtop"
            target="#relation-analysis-detail-column"
            :title="t('backtop')"
            :aria-label="t('backtop')"
            :visibility-height="240"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.relation-analysis-pane {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 14px;
  height: 100%;
  overflow: hidden;
  padding: 0 2px 14px;
}

.relation-analysis-toolbar {
  min-height: 0;
}

.relation-analysis-filter-bar {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  justify-content: space-between;
  padding: 10px 12px;
  border: 1px solid var(--break-border);
  background: var(--break-bg-card);
}

.relation-analysis-columns {
  display: grid;
  grid-template-columns:
    minmax(300px, 1.1fr) minmax(300px, 1fr)
    minmax(420px, 1.35fr);
  gap: 14px;
  min-height: 0;
}

.relation-analysis-column-shell {
  position: relative;
  min-width: 0;
  min-height: 0;
}

.relation-analysis-column {
  min-width: 0;
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding-right: 2px;
  -webkit-overflow-scrolling: touch;
}

.relation-analysis-detail-panel {
  padding: 12px;
  background: transparent;
}

.relation-analysis-filter-grid {
  display: grid;
  flex: 1;
  grid-template-columns: repeat(4, minmax(132px, 1fr));
  gap: 8px;
}

.relation-analysis-filter {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
  color: var(--break-text-secondary);
  font-size: 12px;
}

.relation-analysis-filter :deep(.el-select) {
  width: 100%;
}

.relation-analysis-filter-summary {
  display: flex;
  min-width: 160px;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  color: var(--break-text-secondary);
  font-size: 12px;
  white-space: nowrap;
}

.relation-analysis-main {
  min-width: 0;
}

.relation-analysis-pane-backtop {
  position: absolute;
  right: 14px;
  bottom: 14px;
  z-index: 2;
  width: 32px;
  height: 32px;
  min-width: 32px;
  padding: 0;
  border: 1px solid var(--break-border);
  background: var(--break-bg-card);
  box-shadow: 0 6px 18px
    color-mix(in srgb, var(--break-text-primary) 10%, transparent);
}

.relation-analysis-pane-backtop:hover {
  border-color: var(--el-color-primary);
  background: color-mix(
    in srgb,
    var(--el-color-primary) 8%,
    var(--break-bg-card)
  );
}

.relation-analysis-pane-backtop :deep(.el-icon) {
  font-size: 14px;
}

.relation-analysis-empty {
  display: flex;
  min-height: 320px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--break-border);
  color: var(--break-text-secondary);
  background: var(--break-bg-card);
}

.relation-analysis-summary {
  color: var(--break-text-secondary);
  font-size: 12px;
  line-height: 1.6;
}

.relation-analysis-coverage-list,
.relation-analysis-segments,
.relation-analysis-path-list {
  display: grid;
  gap: 10px;
  margin-top: 10px;
}

.relation-analysis-coverage-item,
.relation-analysis-segment,
.relation-analysis-path-list-item {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border: 1px solid color-mix(in srgb, var(--break-border) 86%, var(--el-color-primary));
  border-radius: 7px;
  background: color-mix(in srgb, var(--break-bg-card) 84%, transparent);
  color: var(--break-text-secondary);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--break-border) 24%, transparent);
}

.relation-analysis-coverage-item,
.relation-analysis-path-list-item {
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.relation-analysis-coverage-item:hover,
.relation-analysis-coverage-item-active {
  border-color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary) 5%, var(--break-bg-card));
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--el-color-primary) 22%, transparent),
    0 0 0 1px color-mix(in srgb, var(--el-color-primary) 10%, transparent);
}

.relation-analysis-coverage-item-both {
  box-shadow:
    inset 3px 0 0 var(--el-color-success),
    inset 0 0 0 1px color-mix(in srgb, var(--break-border) 24%, transparent);
}

.relation-analysis-coverage-item-risk {
  box-shadow:
    inset 3px 0 0 var(--el-color-primary),
    inset 0 0 0 1px color-mix(in srgb, var(--break-border) 24%, transparent);
}

.relation-analysis-coverage-item-attackTool {
  box-shadow:
    inset 3px 0 0 var(--el-color-warning),
    inset 0 0 0 1px color-mix(in srgb, var(--break-border) 24%, transparent);
}

.relation-analysis-item-title {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  color: var(--break-text-primary);
  font-size: 12px;
}

.relation-analysis-item-meta {
  color: var(--break-text-secondary);
  font-size: 12px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.relation-analysis-path-chain {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
  color: var(--break-text-primary);
  font-size: 12px;
  line-height: 1.5;
}

.relation-analysis-path-node {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}

.relation-analysis-path-arrow {
  color: var(--break-text-muted);
}

.relation-analysis-path-list-item {
  box-shadow:
    inset 3px 0 0 var(--el-color-primary),
    inset 0 0 0 1px color-mix(in srgb, var(--break-border) 24%, transparent);
}

.relation-analysis-path-list-item:hover,
.relation-analysis-path-list-item-active {
  border-color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary) 5%, var(--break-bg-card));
  color: var(--break-text-primary);
  box-shadow:
    inset 3px 0 0 var(--el-color-primary),
    inset 0 0 0 1px color-mix(in srgb, var(--el-color-primary) 22%, transparent),
    0 0 0 1px color-mix(in srgb, var(--el-color-primary) 10%, transparent);
}

.relation-analysis-path-list-title {
  color: var(--break-text-primary);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.relation-analysis-segment-main {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  color: var(--break-text-primary);
  font-size: 12px;
  line-height: 1.5;
}

@media (max-width: 1023px) {
  .relation-analysis-pane {
    grid-template-columns: 1fr;
  }

  .relation-analysis-columns {
    grid-template-columns: 1fr;
  }

  .relation-analysis-pane-backtop {
    right: 10px;
    bottom: 10px;
  }

  .relation-analysis-filter-grid {
    grid-template-columns: repeat(2, minmax(132px, 1fr));
  }
}

@media (max-width: 767px) {
  .relation-analysis-pane {
    height: auto;
    overflow: visible;
    padding-bottom: 8px;
  }

  .relation-analysis-columns {
    grid-template-columns: 1fr;
  }

  .relation-analysis-column {
    overflow: visible;
    padding-right: 0;
  }

  .relation-analysis-pane-backtop {
    display: none;
  }

  .relation-analysis-filter-bar {
    flex-direction: column;
    align-items: stretch;
    padding: 8px;
  }

  .relation-analysis-filter-grid {
    grid-template-columns: 1fr;
  }

  .relation-analysis-filter-summary {
    align-items: flex-start;
  }
}
</style>
