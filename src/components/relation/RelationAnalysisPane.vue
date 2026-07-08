<script setup lang="ts">
import { computed, nextTick, ref, toValue, watch, inject } from "vue";
import { useI18n } from "vue-i18n";
import { useBreakpoints } from "@/composables/useBreakpoints";
import { useIncrementalVisibleList } from "@/composables/useIncrementalVisibleList";
import RelationAnalysisCoverageColumn from "@/components/relation/RelationAnalysisCoverageColumn.vue";
import RelationAnalysisDetailColumn from "@/components/relation/RelationAnalysisDetailColumn.vue";
import RelationAnalysisPathColumn from "@/components/relation/RelationAnalysisPathColumn.vue";
import {
  RelationType,
  type AttackPathFilterType,
  type AttackPathFilters,
} from "@/views/relation/relationTypes";
import { RELATION_VIEW_MODEL_KEY } from "@/views/relation/relationViewModelKey";
import "@/components/relation/relationNodeDrawerInsights.css";

// inject viewModel（RelationView provide），取代 props 钻取
const vm = inject(RELATION_VIEW_MODEL_KEY)!;
// ref/computed 解构安全，模板内自动 unwrap；方法直接解构
// 仅保留 RelationAnalysisPane 自身模板/script 使用的字段；
// RelationAnalysisDetailColumn 已迁移到 inject，相关 vm 字段不再透传
const {
  attackPathDetails,
  attackPathFilterOptions,
  attackPathFilters,
  filteredAttackPaths,
  hasActiveAttackPathFilters,
  riskAvoidanceCoverage,
  selectedAttackPathDetail,
  selectedNetworkNode,
  selectedNodeAnalysisSummary,
  selectedNodeAttackPathSummary,
  selectedNodeBusinessSceneImpactSummary,
  selectedNodeCoverageSummary,
  selectedNodeSpecialInsightSummary,
  rootNodeRelations,
  resetAttackPathFilters,
  selectAttackPath,
  // 改 vm 状态触发本组件 watch 的操作（经 DetailColumn emit 透传），需设 preserveScrollPane 保持右列滚动
  focusNodeInDrawer,
  openNodeAsRootById,
} = vm;
// RelationTypeMapping 是普通对象（非 ref），直接取
const relationTypeMapping = vm.RelationTypeMapping;
// 原 RelationView 模板 :active="activeView === 'analysis'"
const active = computed(() => vm.activeView.value === "analysis");
// 原 RelationView 模板 :filtered-attack-path-count="filteredAttackPaths.length"
const filteredAttackPathCount = computed(() => filteredAttackPaths.value.length);

const { t } = useI18n();
const { isMobile } = useBreakpoints();
const coverageColumnRef = ref<HTMLElement | null>(null);
const pathColumnRef = ref<HTMLElement | null>(null);
const detailColumnRef = ref<HTMLElement | null>(null);
const preserveScrollPane = ref<"left" | "middle" | "right" | null>(null);

const MOBILE_COVERAGE_ITEM_LIMIT = 6;
const MOBILE_ATTACK_PATH_LIMIT = 8;
const DESKTOP_ANALYSIS_ITEM_LIMIT = 10;
const SHOW_MORE_STEP = 50;

const filterTypes: AttackPathFilterType[] = [
  RelationType.threatActor,
  RelationType.attackTool,
  RelationType.risk,
  RelationType.avoidance,
];

const updateFilter = (type: AttackPathFilterType, value: string | undefined) => {
  attackPathFilters.value = {
    ...attackPathFilters.value,
    [type]: value || undefined,
  };
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

  attackPathFilters.value = nextFilters;
};

const emitAttackPathFilters = (
  filters: AttackPathFilters,
  preservePane: "left" | "middle" | "right"
) => {
  preserveScrollPane.value = preservePane;
  attackPathFilters.value = filters;
};

// 右列（详情列）触发的、改 vm 状态的操作：先设 preserveScrollPane='right' 保持右列滚动，
// 再调 vm 方法。这些操作经 RelationNodeDetailContent emit → DetailColumn 透传 → 本组件接收。
const rightAction = <T extends unknown[]>(fn: (...args: T) => void, ...args: T) => {
  preserveScrollPane.value = "right";
  fn(...args);
};

const applyLeftAvoidanceFilter = (avoidanceKey: string) => {
  preserveScrollPane.value = "left";
  // 原 RelationView 模板 @apply-avoidance-filter：在 attackPathFilters 上叠加 avoidance 筛选
  attackPathFilters.value = {
    ...(attackPathFilters.value || {}),
    [RelationType.avoidance]: avoidanceKey,
  };
};

const selectMiddleAttackPath = (pathId: string) => {
  preserveScrollPane.value = "middle";
  selectAttackPath(pathId);
};

const hasAnyAnalysis = computed(
  () =>
    selectedNodeAnalysisSummary.value ||
    selectedNodeSpecialInsightSummary.value ||
    selectedNodeBusinessSceneImpactSummary.value ||
    selectedNodeCoverageSummary.value ||
    selectedNodeAttackPathSummary.value.length > 0 ||
    riskAvoidanceCoverage.value ||
    selectedAttackPathDetail.value ||
    rootNodeRelations.value.length > 0
);
const coverageItemLimit = computed(() =>
  toValue(isMobile) ? MOBILE_COVERAGE_ITEM_LIMIT : DESKTOP_ANALYSIS_ITEM_LIMIT
);
const attackPathLimit = computed(() =>
  toValue(isMobile) ? MOBILE_ATTACK_PATH_LIMIT : DESKTOP_ANALYSIS_ITEM_LIMIT
);

const {
  hiddenCount: hiddenCoverageItemCount,
  hasExpanded: hasExpandedCoverageItems,
  reset: resetDisplayedCoverageItems,
  showMoreOrReset: showMoreCoverageItems,
  visibleItems: displayedCoverageItems,
} = useIncrementalVisibleList(
  computed(() => riskAvoidanceCoverage.value?.items ?? []),
  {
    enabled: true,
    initialLimit: coverageItemLimit,
    step: SHOW_MORE_STEP,
  }
);

const {
  hiddenCount: hiddenAttackPathCount,
  hasExpanded: hasExpandedAttackPaths,
  reset: resetDisplayedAttackPaths,
  showMoreOrReset: showMoreAttackPaths,
  visibleItems: displayedAttackPathDetails,
} = useIncrementalVisibleList(computed(() => attackPathDetails.value), {
  enabled: true,
  initialLimit: attackPathLimit,
  step: SHOW_MORE_STEP,
});

const resetColumnScroll = () => {
  nextTick(() => {
    const preservedPane = preserveScrollPane.value;
    preserveScrollPane.value = null;
    resetDisplayedCoverageItems();
    resetDisplayedAttackPaths();
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
    selectedNetworkNode.value?.type ?? "",
    selectedNetworkNode.value?.id ?? "",
    attackPathFilters.value[RelationType.threatActor] ?? "",
    attackPathFilters.value[RelationType.attackTool] ?? "",
    attackPathFilters.value[RelationType.risk] ?? "",
    attackPathFilters.value[RelationType.avoidance] ?? "",
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
            <div
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
            </div>
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
              @click="resetAttackPathFilters"
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
            <RelationAnalysisCoverageColumn
              :attack-path-filters="attackPathFilters"
              :displayed-coverage-items="displayedCoverageItems"
              :has-expanded-coverage-items="hasExpandedCoverageItems"
              :hidden-coverage-item-count="hiddenCoverageItemCount"
              :is-mobile="isMobile"
              :risk-avoidance-coverage="riskAvoidanceCoverage"
              :selected-node-special-insight-summary="
                selectedNodeSpecialInsightSummary
              "
              @apply-avoidance-filter="applyLeftAvoidanceFilter"
              @apply-special-insight-filter="applySpecialInsightFilter"
              @toggle-coverage-items="showMoreCoverageItems"
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
            <RelationAnalysisPathColumn
              :attack-path-details="attackPathDetails"
              :displayed-attack-path-details="displayedAttackPathDetails"
              :filtered-attack-path-count="filteredAttackPathCount"
              :has-expanded-attack-paths="hasExpandedAttackPaths"
              :hidden-attack-path-count="hiddenAttackPathCount"
              :is-mobile="isMobile"
              :selected-attack-path-detail="selectedAttackPathDetail"
              @select-attack-path="selectMiddleAttackPath"
              @toggle-attack-paths="showMoreAttackPaths"
            />
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
            <RelationAnalysisDetailColumn
              @update:attack-path-filters="emitAttackPathFilters($event, 'right')"
              @reset-attack-path-filters="rightAction(resetAttackPathFilters)"
              @focus-node="rightAction(focusNodeInDrawer, $event)"
              @open-node-as-root="rightAction(openNodeAsRootById, $event)"
            />
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

:deep(.relation-analysis-detail-panel) {
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

:deep(.relation-analysis-summary) {
  color: var(--break-text-secondary);
  font-size: 12px;
  line-height: 1.6;
}

:deep(.relation-analysis-coverage-list),
:deep(.relation-analysis-segments),
:deep(.relation-analysis-path-list) {
  display: grid;
  gap: 10px;
  margin-top: 10px;
}

:deep(.relation-analysis-coverage-item),
:deep(.relation-analysis-segment),
:deep(.relation-analysis-path-list-item) {
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

:deep(.relation-analysis-coverage-item),
:deep(.relation-analysis-path-list-item) {
  font: inherit;
  text-align: left;
  cursor: pointer;
}

:deep(.relation-analysis-coverage-item:hover),
:deep(.relation-analysis-coverage-item-active) {
  border-color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary) 5%, var(--break-bg-card));
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--el-color-primary) 22%, transparent),
    0 0 0 1px color-mix(in srgb, var(--el-color-primary) 10%, transparent);
}

:deep(.relation-analysis-coverage-item-both) {
  box-shadow:
    inset 3px 0 0 var(--el-color-success),
    inset 0 0 0 1px color-mix(in srgb, var(--break-border) 24%, transparent);
}

:deep(.relation-analysis-coverage-item-risk) {
  box-shadow:
    inset 3px 0 0 var(--el-color-primary),
    inset 0 0 0 1px color-mix(in srgb, var(--break-border) 24%, transparent);
}

:deep(.relation-analysis-coverage-item-attackTool) {
  box-shadow:
    inset 3px 0 0 var(--el-color-warning),
    inset 0 0 0 1px color-mix(in srgb, var(--break-border) 24%, transparent);
}

:deep(.relation-analysis-item-title) {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  color: var(--break-text-primary);
  font-size: 12px;
}

:deep(.relation-analysis-item-meta) {
  color: var(--break-text-secondary);
  font-size: 12px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

:deep(.relation-analysis-path-chain) {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
  color: var(--break-text-primary);
  font-size: 12px;
  line-height: 1.5;
}

:deep(.relation-analysis-path-node) {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}

:deep(.relation-analysis-path-arrow) {
  color: var(--break-text-muted);
}

:deep(.relation-analysis-path-list-item) {
  box-shadow:
    inset 3px 0 0 var(--el-color-primary),
    inset 0 0 0 1px color-mix(in srgb, var(--break-border) 24%, transparent);
}

:deep(.relation-analysis-path-list-item:hover),
:deep(.relation-analysis-path-list-item-active) {
  border-color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary) 5%, var(--break-bg-card));
  color: var(--break-text-primary);
  box-shadow:
    inset 3px 0 0 var(--el-color-primary),
    inset 0 0 0 1px color-mix(in srgb, var(--el-color-primary) 22%, transparent),
    0 0 0 1px color-mix(in srgb, var(--el-color-primary) 10%, transparent);
}

:deep(.relation-analysis-path-list-title) {
  color: var(--break-text-primary);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

:deep(.relation-analysis-segment-main) {
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
