import { nextTick, onBeforeUnmount, onMounted, watch, type Ref } from "vue";
import BREAK from "@/BREAK";
import type { Router, RouteLocationNormalizedLoaded } from "vue-router";
import { createRelationTypeMapping, RelationType } from "@/views/relation/relationTypes";

type Translate = (key: string, params?: Record<string, unknown>) => string;

interface SetupRelationViewEffectsOptions {
  t: Translate;
  route: RouteLocationNormalizedLoaded;
  router: Router;
  locale: Ref<string>;
  isDark: Ref<boolean>;
  activeView: Ref<"network" | "sankey">;
  relType: Ref<RelationType>;
  relKey: Ref<string>;
  sankeyData: Ref<unknown>;
  getCurrentEntityOptions: Ref<Record<string, unknown>>;
  RelationTypeMapping: ReturnType<typeof createRelationTypeMapping>;
  addRootNode: () => void;
  genNetworkGraphData: (reqType: RelationType, currentNodeType: RelationType, currentNodeId: string) => void;
  rebuildGraphData: () => void;
  refreshGraphAfterVisible: () => void;
  renderNetworkChart: (notMerge?: boolean) => void;
  updateNetworkSelection: () => void;
  renderSankeyChart: () => void;
  updateSankeyTheme: () => void;
  resizeNetworkChart: () => void;
  resizeSankeyChart: () => void;
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
  sankeyData,
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
  handleGlobalPointerDown,
  disposeNetworkChart,
  disposeSankeyChart,
  filterLineType,
  selectedNetworkNodeId,
}: SetupRelationViewEffectsOptions) => {
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
    genNetworkGraphData(RelationType.all, relType.value, relKey.value);
    nextTick(() => {
      renderNetworkChart(true);
      renderSankeyChart();
    });
    window.addEventListener("resize", resizeNetworkChart);
    window.addEventListener("resize", resizeSankeyChart);
    document.addEventListener("pointerdown", handleGlobalPointerDown);
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
    (newType, oldType) => {
      console.time(`[RelationPerf] watch relType ${oldType} -> ${newType}`);
      if (!Object.keys(getCurrentEntityOptions.value).includes(relKey.value)) {
        relKey.value = Object.keys(getCurrentEntityOptions.value)[0] ?? "";
      }
      console.timeEnd(`[RelationPerf] watch relType ${oldType} -> ${newType}`);
    }
  );

  watch(
    () => [relType.value, relKey.value],
    ([newType, newKey]) => {
      console.time(`[RelationPerf] watch relType+relKey ${newType}:${newKey}`);
      if (newType !== route.params.type || newKey !== route.params.key) {
        router.push({
          name: "relation",
          params: {
            type: newType,
            key: newKey,
          },
        });
      }
      console.timeEnd(`[RelationPerf] watch relType+relKey ${newType}:${newKey}`);
    }
  );

  watch(
    () => [route.params.type, route.params.key],
    ([newType, newKey], [oldType, oldKey]) => {
      console.time(`[RelationPerf] watch route ${oldType}:${oldKey} -> ${newType}:${newKey}`);
      relType.value = route.params.type as RelationType;
      relKey.value = route.params.key as string;
      refreshGraphAfterVisible();
      console.timeEnd(`[RelationPerf] watch route ${oldType}:${oldKey} -> ${newType}:${newKey}`);
    }
  );

  watch(locale, () => {
    filterLineType.value = [];
    rebuildGraphData();
    nextTick(() => {
      renderNetworkChart(true);
      renderSankeyChart();
    });
  });

  watch(activeView, () => {
    if (activeView.value === "sankey") {
      nextTick(renderSankeyChart);
    } else {
      nextTick(() => renderNetworkChart(true));
    }
  });

  watch(
    sankeyData,
    () => {
      if (activeView.value === "sankey") {
        nextTick(renderSankeyChart);
      }
    },
    { deep: true }
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
