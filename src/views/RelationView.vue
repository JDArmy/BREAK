<script lang="ts">
import { defineComponent, onMounted, onUnmounted, provide } from "vue";
import RelationAnalysisPane from "@/components/relation/RelationAnalysisPane.vue";
import RelationGraphContextMenu from "@/components/relation/RelationGraphContextMenu.vue";
import RelationGraphTouchActions from "@/components/relation/RelationGraphTouchActions.vue";
import RelationSankeyPane from "@/components/relation/RelationSankeyPane.vue";
import RelationSelectorBar from "@/components/relation/RelationSelectorBar.vue";
import RelationPaneError from "@/components/relation/RelationPaneError.vue";
import { useRelationViewModel } from "@/views/relation/useRelationViewModel";
import { RELATION_VIEW_MODEL_KEY } from "@/views/relation/relationViewModelKey";
import { RelationType } from "@/views/relation/relationTypes";
import {
  loadNetworkECharts,
  loadSankeyECharts,
} from "@/views/relation/relationECharts";
import { createRecoverableAsyncComponent } from "@/utils/chunkLoadRecovery";

const loadRelationNetworkPane = () =>
  import("@/components/relation/RelationNetworkPane.vue");
const loadRelationNodeDetailDrawer = () =>
  import("@/components/relation/RelationNodeDetailDrawer.vue");
const loadRelationPathExplorerPane = () =>
  import("@/components/relation/RelationPathExplorerPane.vue");
const RelationNetworkPane = createRecoverableAsyncComponent(
  loadRelationNetworkPane,
  RelationPaneError,
  "RelationNetworkPane",
);
const RelationNodeDetailDrawer = createRecoverableAsyncComponent(
  loadRelationNodeDetailDrawer,
  RelationPaneError,
  "RelationNodeDetailDrawer",
);
const RelationPathExplorerPane = createRecoverableAsyncComponent(
  loadRelationPathExplorerPane,
  RelationPaneError,
  "RelationPathExplorerPane",
);

export default defineComponent({
  name: "RelationView",
  components: {
    RelationNodeDetailDrawer,
    RelationAnalysisPane,
    RelationGraphContextMenu,
    RelationGraphTouchActions,
    RelationNetworkPane,
    RelationPathExplorerPane,
    RelationSankeyPane,
    RelationSelectorBar,
  },
  setup() {
    const viewModel = useRelationViewModel();
    // provide viewModel 给子组件，子组件 inject 取代 props 钻取（RelationSelectorBar 等已迁移）
    provide(RELATION_VIEW_MODEL_KEY, viewModel);
    let preloadTimer: ReturnType<typeof setTimeout> | null = null;
    let preloadIdleHandle: number | null = null;
    onMounted(() => {
      const isMobileViewport = window.innerWidth < 768;
      const schedulePreload = () => {
        if ("requestIdleCallback" in window) {
          preloadIdleHandle = window.requestIdleCallback(preloadSecondaryView, { timeout: 3000 });
        } else {
          preloadSecondaryView();
        }
      };
      const preloadSecondaryView = () => {
        preloadIdleHandle = null;
        void loadRelationNodeDetailDrawer();
        if (viewModel.activeView.value === "sankey") {
          void loadRelationNetworkPane();
          void loadNetworkECharts();
        } else {
          void loadSankeyECharts();
        }
      };
      if (isMobileViewport) {
        preloadTimer = window.setTimeout(schedulePreload, 12000);
      } else if ("requestIdleCallback" in window) {
        preloadIdleHandle = window.requestIdleCallback(preloadSecondaryView, { timeout: 1500 });
      } else {
        preloadTimer = window.setTimeout(preloadSecondaryView, 800);
      }
    });
    onUnmounted(() => {
      if (preloadTimer !== null) {
        clearTimeout(preloadTimer);
        preloadTimer = null;
      }
      if (preloadIdleHandle !== null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(preloadIdleHandle);
        preloadIdleHandle = null;
      }
    });
    return {
      ...viewModel,
      RelationType,
      onTabChange: (name: string | number) => {
        // el-tabs 切换：交由 switchPerspective 路由跳转到目标视角
        viewModel.switchPerspective(name as "network" | "sankey" | "analysis" | "pathExplorer");
      },
    };
  },
});
</script>

<template>
  <div
    :ref="setRelationPageElement"
    class="relation-page"
    :class="{
      'relation-page--mobile-sankey': activeView === 'sankey',
      'relation-page--mobile-network': activeView === 'network',
      'relation-page--path-explorer': activeView === 'pathExplorer',
    }"
  >
    <RelationSelectorBar />

    <el-tabs :model-value="activeView" class="relation-tabs" @tab-change="onTabChange">
      <el-tab-pane
        :label="$t('relationView.perspective.risk.title')"
        name="network"
        :lazy="activeView !== 'network'"
      >
        <RelationNetworkPane />
      </el-tab-pane>
      <el-tab-pane
        :label="$t('relationView.perspective.attackPath.title')"
        name="sankey"
        :lazy="activeView !== 'sankey'"
      >
        <RelationSankeyPane />
      </el-tab-pane>
      <el-tab-pane
        :label="$t('relationView.perspective.defenseCoverage.title')"
        name="analysis"
        :lazy="activeView !== 'analysis'"
      >
        <RelationAnalysisPane />
      </el-tab-pane>
      <el-tab-pane
        :label="$t('relationView.pathExplorer')"
        name="pathExplorer"
        :lazy="activeView !== 'pathExplorer'"
      >
        <RelationPathExplorerPane />
      </el-tab-pane>
    </el-tabs>

    <RelationGraphContextMenu />

    <RelationGraphTouchActions />

    <RelationNodeDetailDrawer v-if="nodeDetailDrawerVisible" />
  </div>
</template>

<style scoped>
.relation-page {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 480px;
  overflow: hidden;
  padding: 0 12px 4px;
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

/* 路径探索模式：允许页面滚动，图表限高 1 屏 */
.relation-page--path-explorer {
  height: auto;
  min-height: 0;
  overflow: visible;
}

.relation-page--path-explorer .relation-tabs {
  flex: none;
}

.relation-page--path-explorer :deep(.el-tabs__content) {
  height: auto;
}

.relation-page--path-explorer :deep(.el-tab-pane) {
  height: auto;
}

@media (max-width: 767px) {
  .relation-page {
    height: auto;
    min-height: 0;
    overflow: visible;
    padding: 0 6px 2px;
  }

  .relation-tabs {
    min-height: 0;
    height: auto;
    overflow: visible;
  }

  .relation-tabs :deep(.el-tabs__header) {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 4px;
  }

  .relation-tabs :deep(.el-tabs__nav-wrap) {
    padding-right: 0;
    min-height: 34px;
    max-width: 100%;
    overflow: visible;
  }

  /* 隐藏 el-tabs 内置的左右箭头按钮，移动端用触摸滑动代替 */
  .relation-tabs :deep(.el-tabs__nav-prev),
  .relation-tabs :deep(.el-tabs__nav-next) {
    display: none;
  }

  /* is-scrollable 模式下 el-tabs 会给 nav-wrap 加 padding，这里重置 */
  .relation-tabs :deep(.el-tabs__nav-wrap.is-scrollable) {
    padding: 0;
  }

  /* nav-scroll 容器变为手指可滑动 */
  .relation-tabs :deep(.el-tabs__nav-scroll) {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  /* 隐藏滚动条但保留功能 */
  .relation-tabs :deep(.el-tabs__nav-scroll::-webkit-scrollbar) {
    display: none;
  }

  .relation-tabs :deep(.el-tabs__nav-scroll) {
    scrollbar-width: none;
  }

  .relation-tabs :deep(.el-tabs__item) {
    height: 34px;
    line-height: 34px;
    font-size: 13px;
    padding: 0 12px;
  }

  .relation-tabs :deep(.el-tabs__content) {
    height: auto;
  }

  .relation-page--mobile-sankey {
    height: auto;
    overflow: visible;
  }

  .relation-page--mobile-sankey .relation-tabs {
    flex: none;
  }

  .relation-page--mobile-sankey :deep(.el-tabs__content) {
    height: auto;
  }

  .relation-page--mobile-sankey :deep(.el-tab-pane) {
    height: auto;
  }

  .relation-page :deep(.el-tab-pane) {
    overflow: visible;
  }

  /* 关系网络在移动端限制为一屏：面板限高、画布在面板内通过 ECharts 缩放/拖拽浏览，
     不再把页面整体撑高到超出一屏。 */
  .relation-page--mobile-network {
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }

  .relation-page--mobile-network .relation-tabs {
    flex: 1;
    min-height: 0;
    height: 100%;
    overflow: hidden;
  }

  .relation-page--mobile-network :deep(.el-tabs__content) {
    height: calc(100% - 41px);
    min-height: 0;
    overflow: hidden;
  }

  .relation-page--mobile-network :deep(.el-tab-pane) {
    height: 100%;
    overflow: hidden;
  }
}
</style>
