<script lang="ts">
import { defineComponent } from "vue";
import RelationFilterPanels from "@/components/relation/RelationFilterPanels.vue";
import RelationNodeDetailDrawer from "@/components/relation/RelationNodeDetailDrawer.vue";
import { Aim, Download, Filter as FilterIcon, FullScreen, InfoFilled, Operation, Refresh, TopRight, ZoomIn, ZoomOut } from "@element-plus/icons-vue";
import { useRelationViewModel } from "@/views/relation/useRelationViewModel";
import "element-plus/es/components/drawer/style/css";

export default defineComponent({
  name: "RelationView",
  components: {
    Aim,
    Download,
    FilterIcon,
    FullScreen,
    InfoFilled,
    Operation,
    Refresh,
    RelationFilterPanels,
    RelationNodeDetailDrawer,
    TopRight,
    ZoomIn,
    ZoomOut,
  },
  setup: useRelationViewModel,
});
</script>

<template>
  <div class="relation-page">
    <div class="relation-selector">
      <el-select class="relation-select" v-model="relType">
        <el-option
          v-for="(item, key) in RelationTypeMapping"
          :label="item.title"
          :key="key"
          :value="key"
        >
        </el-option>
      </el-select>
      <el-select class="relation-key-select" v-model="relKey" filterable>
        <el-option
          v-for="(_item, key) in getCurrentEntityOptions"
          :key="key"
          :label="key + ':' + $t(`BREAK.${RelationTypeMapping[relType as keyof typeof RelationTypeMapping].BreakKey}.${key}.title`)"
          :value="key"
        >
        </el-option>
      </el-select>
    </div>

    <el-tabs v-model="activeView" class="relation-tabs">
      <el-tab-pane :label="$t('relationView.network')" name="network">
        <!-- 关系图 -->
        <div ref="networkPaneRef" class="network-graph-pane">
          <div class="graph-toolbar">
            <el-tooltip :content="$t('toolbar.fullscreen')" placement="top">
              <el-button circle size="small" @click="enterFullscreen">
                <el-icon><FullScreen /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip :content="$t('toolbar.zoomIn')" placement="top">
              <el-button circle size="small" @click="zoomNetworkChart(0.08)">
                <el-icon><ZoomIn /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip :content="$t('toolbar.zoomOut')" placement="top">
              <el-button circle size="small" @click="zoomNetworkChart(-0.08)">
                <el-icon><ZoomOut /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip
              :content="networkLayoutTooltip"
              placement="top"
            >
              <el-dropdown trigger="click" placement="left" @command="handleNetworkLayoutCommand">
                <el-button circle size="small">
                  <el-icon><Aim /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item
                      v-for="layout in networkLayoutOptions"
                      :key="layout.value"
                      :command="layout.value"
                      :class="{ 'is-active-layout': layout.value === networkState.layout }"
                    >
                      {{ $t(layout.labelKey) }}
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </el-tooltip>
            <el-tooltip :content="$t('toolbar.refresh')" placement="top">
              <el-button circle size="small" @click="refreshNetworkChart">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip :content="$t('toolbar.download')" placement="top">
              <el-button circle size="small" @click="downloadNetworkChart">
                <el-icon><Download /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip :content="$t('toolbar.nodeFilterPanel')" placement="top">
              <el-button
                circle
                size="small"
                :class="{ 'is-toolbar-active': nodeFilterVisible }"
                @click="toggleNodeFilter"
              >
                <el-icon><Operation /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip :content="$t('toolbar.relationFilterPanel')" placement="top">
              <el-button
                circle
                size="small"
                :class="{ 'is-toolbar-active': lineFilterVisible }"
                @click="toggleLineFilter"
              >
                  <el-icon><FilterIcon /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip :content="$t('relationView.nodeDetail')" placement="top">
              <el-button circle size="small" @click="openNodeDetailDrawer">
                <el-icon><InfoFilled /></el-icon>
              </el-button>
            </el-tooltip>
          </div>
          <div ref="networkChartRef" class="network-chart"></div>
          <RelationFilterPanels
            v-model:node-filter-visible="nodeFilterVisible"
            v-model:line-filter-visible="lineFilterVisible"
            v-model:filter-relation-type="filterRelationType"
            v-model:filter-sub-node="filterSubNode"
            v-model:filter-line-type="filterLineType"
            :relation-type-items="relationTypeItems"
            :sub-node-filter-color="subNodeFilterColor"
            :visible-relation-legend-items="visibleRelationLegendItems"
            :format-relation-fields-tooltip="formatRelationFieldsTooltip"
            @filter="doFilter"
          />
          <el-dropdown ref="dropdown1" :handleOpen="true" :style="dropdownStyle">
            <span class="el-dropdown-link"></span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item
                  v-for="(item, key) in RelationTypeMapping"
                  :key="key"
                  @click="clickContextMenu(key)"
                  :disabled="item.disableContextMenu.value"
                  >{{ item.title }}</el-dropdown-item
                >
                <el-dropdown-item
                  @click="clickContextMenu(RelationType.all)"
                  :disabled="disableContextMenuAll"
                  >{{ $t('fetchAllRelations') }}</el-dropdown-item
                >
                <el-dropdown-item
                  @click="gotoNewRelationView()"
                  :disabled="disableContextMenuOpenAsRoot"
                  divided
                  >{{ $t('openAsRoot') }}</el-dropdown-item
                >
                <el-dropdown-item @click="openContextNodeDetailDrawer()">
                  {{ $t('relationView.nodeDetail') }}
                </el-dropdown-item>
                <el-dropdown-item @click="copyContextNodeCsv()">
                  {{ $t('relationView.copyCsv') }}
                </el-dropdown-item>
                <el-dropdown-item divided @click="gotoItemDetailView()">
                  <span class="menu-action-with-icon">
                    <el-icon><TopRight /></el-icon>
                    <span>{{ $t('viewDetail') }}</span>
                  </span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-tab-pane>
      <el-tab-pane :label="$t('relationView.attackPath')" name="sankey">
        <div class="sankey-pane">
          <div v-if="sankeyData.nodes.length === 0" class="sankey-empty">
            {{ $t("relationView.noAttackPath") }}
          </div>
          <div v-show="sankeyData.nodes.length > 0" ref="sankeyChartRef" class="sankey-chart"></div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 手机端触摸操作面板 -->
    <div v-if="touchActionVisible" class="touch-action-overlay" @click="touchActionClose">
      <div class="touch-action-sheet" @click.stop>
        <div class="touch-action-item"
          v-for="(item, key) in RelationTypeMapping"
          :key="key"
          :class="{ disabled: item.disableContextMenu.value }"
          @click="!item.disableContextMenu.value && clickContextMenu(key)"
        >{{ item.title }}</div>
        <div class="touch-action-item"
          :class="{ disabled: disableContextMenuAll }"
          @click="!disableContextMenuAll && clickContextMenu(RelationType.all)"
        >{{ $t('fetchAllRelations') }}</div>
        <div class="touch-action-divider"></div>
        <div class="touch-action-item"
          :class="{ disabled: disableContextMenuOpenAsRoot }"
          @click="!disableContextMenuOpenAsRoot && gotoNewRelationView()"
        >{{ $t('openAsRoot') }}</div>
        <div class="touch-action-item" @click="openTouchNodeDetailDrawer()">{{ $t('relationView.nodeDetail') }}</div>
        <div class="touch-action-item" @click="copyContextNodeCsv()">{{ $t('relationView.copyCsv') }}</div>
        <div class="touch-action-item" @click="gotoItemDetailView()">
          <span class="menu-action-with-icon">
            <el-icon><TopRight /></el-icon>
            <span>{{ $t('viewDetail') }}</span>
          </span>
        </div>
        <div class="touch-action-divider"></div>
        <div class="touch-action-item touch-action-cancel" @click="touchActionClose">{{ $t('cancel') }}</div>
      </div>
    </div>

    <RelationNodeDetailDrawer
      v-model="nodeDetailDrawerVisible"
      :selected-network-node="selectedNetworkNode"
      :selected-network-node-title="selectedNetworkNodeTitle"
      :selected-network-relation-counts="selectedNetworkRelationCounts"
      :root-node-relations="rootNodeRelations"
      :selected-node-root-path="selectedNodeRootPath"
      :selected-node-attack-path-summary="selectedNodeAttackPathSummary"
      :selected-node-attack-path-description="selectedNodeAttackPathDescription"
      :selected-node-root-preview="selectedNodeRootPreview"
      :selected-network-relations="selectedNetworkRelations"
      :rel-key="relKey"
      :get-node-type-title="getNodeTypeTitle"
      :is-path-node-current-selection="isPathNodeCurrentSelection"
      :is-relation-on-selected-path="isRelationOnSelectedPath"
      @view-detail="gotoSelectedNodeDetailView"
      @open-as-root="openSelectedNodeAsRoot"
      @focus-node="focusNodeInDrawer"
      @open-node-as-root="openNodeAsRootById"
    />
  </div>
</template>

<style scoped>
.relation-page {
  position: relative;
  display: flex;
  flex-direction: column;
  height: calc(100dvh - 132px);
  min-height: 480px;
  overflow: hidden;
  padding: 0 12px 4px;
}

.relation-selector {
  position: absolute;
  z-index: 20;
  top: 0;
  right: 12px;
  display: flex;
  gap: 8px;
  align-items: center;
  padding-bottom: 4px;
}

.relation-select {
  width: 160px;
}

.relation-key-select {
  width: min(520px, calc(100vw - 420px));
}

.relation-tabs {
  min-height: 0;
  flex: 1;
}

.relation-tabs :deep(.el-tabs__header) {
  margin-bottom: 8px;
}

.relation-tabs :deep(.el-tabs__nav-wrap) {
  padding-right: min(700px, calc(100vw - 360px));
}

.relation-tabs :deep(.el-tabs__nav-wrap) {
  min-height: 40px;
}

.relation-tabs :deep(.el-tabs__content) {
  height: calc(100% - 48px);
}

.relation-tabs :deep(.el-tab-pane) {
  height: 100%;
}

.network-graph-pane,
.sankey-pane {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 420px;
  border: var(--break-graph-border) solid 1px;
  background: var(--break-bg-card);
}

.network-graph-pane {
  overflow: hidden;
}

.network-chart {
  width: 100%;
  height: 100%;
}

.legend-node-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 10px;
  margin-bottom: 8px;
}

.legend-node-item {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.legend-node-color {
  width: 12px;
  height: 12px;
  flex: 0 0 auto;
  border: 1px solid var(--break-graph-border);
  border-radius: 50%;
}

.legend-relation-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.legend-relation-item {
  padding-top: 6px;
  border-top: 1px solid var(--break-border);
  font-size: 12px;
  line-height: 1.4;
}

.legend-relation-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legend-line-color {
  width: 18px;
  height: 3px;
  flex: 0 0 auto;
  border-radius: 999px;
}

.menu-action-with-icon {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.legend-relation-name {
  margin-right: 6px;
  font-weight: 700;
}

.legend-relation-fields {
  color: var(--break-text-muted);
  overflow-wrap: anywhere;
}

.graph-toolbar {
  position: absolute;
  z-index: 710;
  top: 50%;
  right: 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 48px;
  padding: 10px 7px;
  border: 1px solid var(--break-graph-border);
  border-radius: 8px;
  background: var(--break-bg-card);
  transform: translateY(-50%);
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
}

.graph-toolbar .el-button {
  width: 28px;
  height: 28px;
  margin-left: 0;
}

.graph-toolbar .is-toolbar-active {
  border-color: color-mix(in srgb, var(--el-color-primary) 45%, var(--break-graph-border));
  color: var(--el-color-primary);
  background: color-mix(in srgb, var(--el-color-primary-light-9) 72%, var(--break-bg-card));
}

.graph-toolbar :deep(.el-button + .el-button) {
  margin-left: 0;
}

.graph-toolbar :deep(.el-dropdown) {
  line-height: 1;
}

.is-active-layout {
  color: var(--el-color-primary);
  font-weight: 600;
}

.sankey-pane {
  overflow-x: hidden;
  overflow-y: auto;
}

.sankey-chart {
  width: 100%;
  min-height: 100%;
}

@media (max-width: 767px) {
  .relation-selector {
    position: static;
    width: 100%;
    flex-wrap: wrap;
    justify-content: flex-start;
    margin-bottom: 8px;
  }

  .relation-select,
  .relation-key-select {
    width: 100%;
  }

  .relation-tabs :deep(.el-tabs__header) {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .relation-tabs :deep(.el-tabs__nav-wrap) {
    padding-right: 0;
  }

  .graph-toolbar {
    top: auto;
    right: 10px;
    bottom: 10px;
    flex-direction: row;
    flex-wrap: wrap;
    transform: none;
    max-width: calc(100% - 20px);
  }
}

.sankey-empty {
  display: flex;
  height: 100%;
  min-height: 360px;
  align-items: center;
  justify-content: center;
  color: var(--break-graph-text);
  font-size: 14px;
}

/* 触摸操作面板 */
.touch-action-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  z-index: 2000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.touch-action-sheet {
  width: 100%;
  max-width: 500px;
  background: var(--break-bg-card);
  border-radius: 16px 16px 0 0;
  padding: 8px 0;
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.12);
}

.touch-action-item {
  padding: 14px 20px;
  font-size: 16px;
  color: var(--break-text-primary);
  cursor: pointer;
  text-align: center;
  transition: background-color 0.15s;
}

.touch-action-item:hover,
.touch-action-item:active {
  background: var(--break-bg-secondary);
}

.touch-action-item.disabled {
  color: var(--break-text-weak);
  cursor: not-allowed;
}

.touch-action-divider {
  height: 1px;
  background: var(--break-border);
  margin: 4px 20px;
}

.touch-action-cancel {
  font-weight: 600;
  color: var(--break-text-secondary);
}

@media (max-width: 767px) {
  .network-graph-pane {
    display: flex;
    flex-direction: column;
    gap: 0;
    overflow-y: auto;
  }

  .network-chart {
    order: 3;
    flex: 1 1 auto;
    min-height: 260px;
    height: auto;
  }

  .legend-node-list {
    grid-template-columns: 1fr;
  }
}
</style>
