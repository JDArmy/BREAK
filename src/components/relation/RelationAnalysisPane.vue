<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import RelationNodeAnalysisBlock from "@/components/relation/RelationNodeAnalysisBlock.vue";
import RelationNodeAttackPathBlock from "@/components/relation/RelationNodeAttackPathBlock.vue";
import RelationNodeBusinessSceneImpactBlock from "@/components/relation/RelationNodeBusinessSceneImpactBlock.vue";
import RelationNodeRootRelationBlock from "@/components/relation/RelationNodeRootRelationBlock.vue";
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
  RootPathSummary,
  RootRelationSummary,
} from "@/components/relation/relationNodeDrawerInsightTypes";
import "@/components/relation/relationNodeDrawerInsights.css";

const props = defineProps<{
  active: boolean;
  relationTypeMapping: ReturnType<typeof createRelationTypeMapping>;
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
  currentEntityTypeTitle: string;
  selectedNetworkNodeTitle: string;
  rootNodeRelations: RootRelationSummary[];
  selectedNodeRootPath: RootPathSummary | null;
  relKey: string;
  isPathNodeCurrentSelection: (nodeId: string) => boolean;
  isCurrentNodeRoot: boolean;
}>();

const emit = defineEmits<{
  "update:attack-path-filters": [value: AttackPathFilters];
  "reset-attack-path-filters": [];
  "apply-avoidance-filter": [avoidanceKey: string];
  "focus-node": [nodeId: string];
  "open-node-as-root": [nodeId: string];
}>();

const { t } = useI18n();

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

const hasAnyAnalysis = computed(
  () =>
    props.selectedNodeAnalysisSummary ||
    props.selectedNodeBusinessSceneImpactSummary ||
    props.selectedNodeCoverageSummary ||
    props.selectedNodeAttackPathSummary.length > 0 ||
    props.riskAvoidanceCoverage ||
    props.selectedAttackPathDetail ||
    props.rootNodeRelations.length > 0
);

const visibleCoverageItems = computed(
  () => props.riskAvoidanceCoverage?.items.slice(0, 24) ?? []
);

const hiddenCoverageCount = computed(() =>
  Math.max(
    0,
    (props.riskAvoidanceCoverage?.items.length ?? 0) -
      visibleCoverageItems.value.length
  )
);
</script>

<template>
  <div v-if="active" class="relation-analysis-pane">
    <div v-if="!hasAnyAnalysis" class="relation-analysis-empty">
      {{ t("relationView.noAnalysis") }}
    </div>
    <template v-else>
      <aside class="relation-analysis-side">
        <div class="relation-analysis-filter-bar">
          <div class="relation-analysis-filter-grid">
            <label
              v-for="type in filterTypes"
              :key="type"
              class="relation-analysis-filter"
            >
              <span>{{ relationTypeMapping[type].title }}</span>
              <el-select
                :model-value="attackPathFilters[type]"
                clearable
                filterable
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
                v-for="item in visibleCoverageItems"
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
                @click="emit('apply-avoidance-filter', item.avoidanceKey)"
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
            <div v-if="hiddenCoverageCount > 0" class="node-relation-more">
              {{
                t("relationView.hiddenCoverageItemCount", {
                  count: hiddenCoverageCount,
                })
              }}
            </div>
          </div>
        </div>

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
      </aside>

      <div class="relation-analysis-main">
        <div class="relation-analysis-entity-summary">
          <div class="relation-analysis-entity-row">
            <span>{{ currentEntityTypeTitle }}{{ t("relationView.entityNameSuffix") }}</span>
            <strong>{{ selectedNetworkNodeTitle || relKey }}</strong>
          </div>
          <div class="relation-analysis-entity-row">
            <span>{{ currentEntityTypeTitle }}{{ t("relationView.entityIdSuffix") }}</span>
            <strong>{{ relKey }}</strong>
          </div>
        </div>
        <RelationNodeRootRelationBlock
          :root-node-relations="rootNodeRelations"
          :selected-node-root-path="selectedNodeRootPath"
          :rel-key="relKey"
          :is-path-node-current-selection="isPathNodeCurrentSelection"
          :is-current-node-root="isCurrentNodeRoot"
          @focus-node="emit('focus-node', $event)"
          @open-node-as-root="emit('open-node-as-root', $event)"
        />
        <RelationNodeAnalysisBlock :summary="selectedNodeAnalysisSummary" />
        <RelationNodeBusinessSceneImpactBlock
          :summary="selectedNodeBusinessSceneImpactSummary"
        />
        <RelationNodeAttackPathBlock
          :selected-node-attack-path-summary="selectedNodeAttackPathSummary"
          :selected-node-attack-path-description="
            selectedNodeAttackPathDescription
          "
          :selected-node-attack-path-explanations="
            selectedNodeAttackPathExplanations
          "
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.relation-analysis-pane {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 36%);
  gap: 14px;
  height: 100%;
  overflow: auto;
  padding: 0 2px 14px;
}

.relation-analysis-filter-bar {
  grid-column: 1 / -1;
  display: flex;
  gap: 12px;
  align-items: flex-end;
  justify-content: space-between;
  padding: 10px 12px;
  border: 1px solid var(--break-border);
  background: var(--break-bg-card);
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

.relation-analysis-main,
.relation-analysis-side {
  min-width: 0;
}

.relation-analysis-side {
  display: flex;
  flex-direction: column;
  gap: 12px;
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

.relation-analysis-entity-summary {
  display: grid;
  gap: 8px;
  padding: 12px 14px;
  border: 1px solid var(--break-border);
  border-radius: 8px;
  background: var(--break-bg-soft);
}

.relation-analysis-entity-row {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  gap: 12px;
  align-items: baseline;
}

.relation-analysis-entity-row span {
  color: var(--break-text-muted);
  font-size: 12px;
  font-weight: 700;
}

.relation-analysis-entity-row strong {
  color: var(--break-text-primary);
  font-size: 14px;
  font-weight: 800;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.relation-analysis-summary {
  color: var(--break-text-secondary);
  font-size: 12px;
  line-height: 1.6;
}

.relation-analysis-coverage-list,
.relation-analysis-segments {
  display: grid;
  gap: 8px;
  margin-top: 10px;
}

.relation-analysis-coverage-item {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
  padding: 8px 9px;
  border: 1px solid var(--break-border);
  background: var(--break-bg-card);
  color: var(--break-text-secondary);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.relation-analysis-coverage-item:hover,
.relation-analysis-coverage-item-active {
  border-color: var(--el-color-primary);
}

.relation-analysis-coverage-item-both {
  border-left: 3px solid var(--el-color-success);
}

.relation-analysis-coverage-item-risk {
  border-left: 3px solid var(--el-color-primary);
}

.relation-analysis-coverage-item-attackTool {
  border-left: 3px solid var(--el-color-warning);
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

.relation-analysis-segment {
  padding: 8px;
  border: 1px solid var(--break-border);
  background: var(--break-bg-card);
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
