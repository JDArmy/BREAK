import { nextTick, onBeforeUnmount, onMounted, watch, type Ref } from "vue";
import BREAK from "@/BREAK";
import type { Router, RouteLocationNormalizedLoaded } from "vue-router";
import { createRelationTypeMapping, RelationType } from "@/views/relation/relationTypes";
import { normalizeRelationViewMode, type RelationViewMode } from "@/views/relation/relationViewState";

type Translate = (key: string, params?: Record<string, unknown>) => string;

interface SetupRelationViewEffectsOptions {
  t: Translate;
  route: RouteLocationNormalizedLoaded;
  router: Router;
  locale: Ref<string>;
  isDark: Ref<boolean>;
  activeView: Ref<RelationViewMode>;
  relType: Ref<RelationType>;
  relKey: Ref<string>;
  getCurrentEntityOptions: Ref<Record<string, unknown>>;
  RelationTypeMapping: ReturnType<typeof createRelationTypeMapping>;
  addRootNode: () => void;
  genNetworkGraphData: (
    reqType: RelationType,
    currentNodeType: RelationType,
    currentNodeId: string,
    options?: { render?: boolean }
  ) => void;
  rebuildGraphData: () => void;
  refreshGraphAfterVisible: () => void;
  renderNetworkChart: (notMerge?: boolean) => void;
  updateNetworkSelection: () => void;
  renderSankeyChart: () => void;
  updateSankeyTheme: () => void;
  resizeNetworkChart: () => void;
  resizeSankeyChart: () => void;
  hideNetworkTooltip: () => void;
  hideSankeyTooltip: () => void;
  handleGlobalPointerDown: (event: PointerEvent) => void;
  disposeNetworkChart: () => void;
  disposeSankeyChart: () => void;
  filterLineType: Ref<string[]>;
  selectedNetworkNodeId: Ref<string>;
}

export const setupRelationViewEffects = ({
  t,
  route,
  router,
  locale,
  isDark,
  activeView,
  relType,
  relKey,
  getCurrentEntityOptions,
  RelationTypeMapping,
  addRootNode,
  genNetworkGraphData,
  rebuildGraphData,
  refreshGraphAfterVisible,
  renderNetworkChart,
  updateNetworkSelection,
  renderSankeyChart,
  updateSankeyTheme,
  resizeNetworkChart,
  resizeSankeyChart,
  hideNetworkTooltip,
  hideSankeyTooltip,
  handleGlobalPointerDown,
  disposeNetworkChart,
  disposeSankeyChart,
  filterLineType,
  selectedNetworkNodeId,
}: SetupRelationViewEffectsOptions) => {
  let hasMounted = false;
  let networkDataReady = false;

  const ensureNetworkData = (options?: { render?: boolean }) => {
    if (networkDataReady) return;
    genNetworkGraphData(RelationType.all, relType.value, relKey.value, options);
    networkDataReady = true;
  };

  onMounted(() => {
    if (
      !Object.values(RelationType).includes(route.params.type as RelationType) ||
      !Object.keys(
        BREAK[
          RelationTypeMapping[
            route.params.type as keyof typeof RelationTypeMapping
          ].BreakKey as keyof typeof BREAK
        ]
      ).includes(route.params.key as string)
    ) {
      alert(t("unknownTypeOrId"));
      router
        .push({
          name: "relation",
          params: {
            type: "risk",
            key: "R0001",
          },
        })
        .then(() => {
          location.reload();
        });
      return;
    }
    addRootNode();
    if (activeView.value === "network") {
      ensureNetworkData({ render: false });
      renderNetworkChart(false);
    } else {
      renderSankeyChart();
    }
    window.addEventListener("resize", resizeNetworkChart);
    window.addEventListener("resize", resizeSankeyChart);
    document.addEventListener("pointerdown", handleGlobalPointerDown);
    hasMounted = true;
  });

  onBeforeUnmount(() => {
    window.removeEventListener("resize", resizeNetworkChart);
    window.removeEventListener("resize", resizeSankeyChart);
    document.removeEventListener("pointerdown", handleGlobalPointerDown);
    disposeNetworkChart();
    disposeSankeyChart();
  });

  watch(
    () => relType.value,
    () => {
      if (!Object.keys(getCurrentEntityOptions.value).includes(relKey.value)) {
        relKey.value = Object.keys(getCurrentEntityOptions.value)[0] ?? "";
      }
    }
  );

  watch(
    () => [relType.value, relKey.value],
    ([newType, newKey]) => {
      if (newType !== route.params.type || newKey !== route.params.key) {
        router.push({
          name: "relation",
          params: {
            type: newType,
            key: newKey,
          },
          query: route.query,
        });
      }
    }
  );

  watch(
    [() => route.params.type, () => route.params.key],
    () => {
      relType.value = route.params.type as RelationType;
      relKey.value = route.params.key as string;
      networkDataReady = false;
      if (activeView.value === "network") {
        refreshGraphAfterVisible();
        networkDataReady = true;
      }
    }
  );

  watch(locale, () => {
    filterLineType.value = [];
    networkDataReady = false;
    if (activeView.value === "network") {
      rebuildGraphData();
      networkDataReady = true;
    }
    nextTick(() => {
      if (activeView.value === "network") {
        renderNetworkChart(true);
      }
      renderSankeyChart();
    });
  });

  watch(
    activeView,
    () => {
      if (route.query.view !== activeView.value) {
        router.replace({
          name: "relation",
          params: {
            type: relType.value,
            key: relKey.value,
          },
          query: {
            ...route.query,
            view: activeView.value,
          },
        });
      }

      if (!hasMounted) {
        return;
      }

      hideNetworkTooltip();
      hideSankeyTooltip();

      if (activeView.value === "sankey") {
        nextTick(renderSankeyChart);
      } else {
        ensureNetworkData({ render: false });
        nextTick(() => renderNetworkChart(true));
      }
    }
  );

  watch(
    () => route.query.view,
    (view) => {
      const nextView = normalizeRelationViewMode(view, activeView.value);
      if (nextView !== activeView.value) {
        activeView.value = nextView;
      }
    }
  );

  watch(
    [activeView, relType, relKey, selectedNetworkNodeId],
    () => {
      if (hasMounted && activeView.value === "sankey") {
        nextTick(renderSankeyChart);
      }
    }
  );

  watch(isDark, () => {
    renderNetworkChart(true);
    nextTick(updateSankeyTheme);
  });

  watch(selectedNetworkNodeId, () => {
    if (activeView.value === "network") {
      nextTick(updateNetworkSelection);
    }
  });
};
