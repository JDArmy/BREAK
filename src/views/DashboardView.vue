<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { init, use, type ECharts, type EChartsOption } from "echarts/core";
import { BarChart, PieChart } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { buildDashboardMetrics } from "@/BREAK/metrics";
import { useTheme } from "@/composables/useTheme";

use([BarChart, PieChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

const router = useRouter();
const { t, locale } = useI18n();
const { isDark } = useTheme();
const metrics = computed(() => buildDashboardMetrics());

const entityChartRef = ref<HTMLDivElement>();
const complexityChartRef = ref<HTMLDivElement>();
const categoryChartRef = ref<HTMLDivElement>();
const sceneChartRef = ref<HTMLDivElement>();

let entityChart: ECharts | null = null;
let complexityChart: ECharts | null = null;
let categoryChart: ECharts | null = null;
let sceneChart: ECharts | null = null;

const chartTextColor = computed(() => (isDark.value ? "#e2e8f0" : "#1e293b"));
const chartMutedColor = computed(() => (isDark.value ? "#94a3b8" : "#64748b"));
const chartGridColor = computed(() => (isDark.value ? "#334155" : "#e2e8f0"));

const entityCards = computed(() => [
  { label: t("dashboard.entities.risks"), path: "/risks", ...metrics.value.entities.risks },
  { label: t("dashboard.entities.avoidances"), path: "/avoidances", ...metrics.value.entities.avoidances },
  {
    label: t("dashboard.entities.attackTools"),
    path: "/attack-tools",
    ...metrics.value.entities.attackTools,
  },
  {
    label: t("dashboard.entities.threatActors"),
    path: "/threat-actors",
    ...metrics.value.entities.threatActors,
  },
  { label: t("dashboard.entities.businessScenes"), path: "/", ...metrics.value.entities.businessScenes },
]);

const relationRows = computed(() =>
  metrics.value.relationCoverage.map((item) => ({
    ...item,
    status:
      item.rate >= 95
        ? t("dashboard.status.good")
        : item.rate >= 80
          ? t("dashboard.status.watch")
          : t("dashboard.status.weak"),
  }))
);

const topSceneRows = computed(() => metrics.value.businessSceneCoverage.slice(0, 8));

const highestDegreeRows = computed(() => metrics.value.highDegreeNodes.slice(0, 8));

const baseBarOption = (): EChartsOption => ({
  backgroundColor: "transparent",
  textStyle: { color: chartTextColor.value },
  tooltip: {
    trigger: "axis",
    axisPointer: { type: "shadow" },
  },
  grid: { top: 24, right: 18, bottom: 34, left: 42 },
  xAxis: {
    type: "category",
    axisLabel: { color: chartMutedColor.value },
    axisLine: { lineStyle: { color: chartGridColor.value } },
    axisTick: { show: false },
  },
  yAxis: {
    type: "value",
    axisLabel: { color: chartMutedColor.value },
    splitLine: { lineStyle: { color: chartGridColor.value } },
  },
});

const renderCharts = () => {
  if (!entityChartRef.value || !complexityChartRef.value || !categoryChartRef.value || !sceneChartRef.value) {
    return;
  }

  entityChart ??= init(entityChartRef.value);
  complexityChart ??= init(complexityChartRef.value);
  categoryChart ??= init(categoryChartRef.value);
  sceneChart ??= init(sceneChartRef.value);

  entityChart.setOption({
    ...baseBarOption(),
    xAxis: {
      ...(baseBarOption().xAxis as object),
      data: entityCards.value.map((item) => item.label),
    },
    series: [
      {
        type: "bar",
        data: entityCards.value.map((item) => item.main),
        name: t("dashboard.mainItems"),
        stack: "entities",
        itemStyle: { color: "#2563eb" },
      },
      {
        type: "bar",
        data: entityCards.value.map((item) => item.sub),
        name: t("dashboard.subItems"),
        stack: "entities",
        itemStyle: { color: "#14b8a6" },
      },
    ],
  });

  complexityChart.setOption({
    backgroundColor: "transparent",
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
    legend: { bottom: 0, textStyle: { color: chartMutedColor.value } },
    series: [
      {
        type: "pie",
        radius: ["45%", "72%"],
        center: ["50%", "42%"],
        avoidLabelOverlap: true,
        label: { color: chartTextColor.value },
        data: metrics.value.riskComplexity.map((item) => ({
          name: item.label,
          value: item.count,
        })),
      },
    ],
  });

  categoryChart.setOption({
    ...baseBarOption(),
    xAxis: {
      ...(baseBarOption().xAxis as object),
      data: metrics.value.avoidanceCategories.map((item) => item.key),
    },
    series: [
      {
        type: "bar",
        data: metrics.value.avoidanceCategories.map((item) => item.count),
        itemStyle: { color: "#16a34a" },
      },
    ],
  });

  sceneChart.setOption({
    ...baseBarOption(),
    grid: { top: 24, right: 18, bottom: 34, left: 56 },
    xAxis: { type: "value", axisLabel: { color: chartMutedColor.value } },
    yAxis: {
      type: "category",
      inverse: true,
      data: topSceneRows.value.map((item) => item.key),
      axisLabel: { color: chartMutedColor.value },
      axisLine: { lineStyle: { color: chartGridColor.value } },
      axisTick: { show: false },
    },
    series: [
      {
        type: "bar",
        data: topSceneRows.value.map((item) => item.uniqueRiskCount),
        itemStyle: { color: "#f97316" },
      },
    ],
  });
};

const resizeCharts = () => {
  entityChart?.resize();
  complexityChart?.resize();
  categoryChart?.resize();
  sceneChart?.resize();
};

onMounted(async () => {
  await nextTick();
  renderCharts();
  window.addEventListener("resize", resizeCharts);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", resizeCharts);
  entityChart?.dispose();
  complexityChart?.dispose();
  categoryChart?.dispose();
  sceneChart?.dispose();
});

watch([metrics, isDark, locale], async () => {
  await nextTick();
  renderCharts();
});
</script>

<template>
  <main class="dashboard-page">
    <header class="dashboard-header">
      <div>
        <p class="eyebrow">{{ $t("dashboard.eyebrow") }}</p>
        <h1>{{ $t("dashboard.title") }}</h1>
      </div>
      <div class="trust-score">
        <span>{{ $t("dashboard.referenceCoverage") }}</span>
        <strong>{{ metrics.reference.coverageRate }}%</strong>
      </div>
    </header>

    <section class="entity-grid" :aria-label="$t('dashboard.entityOverview')">
      <button
        v-for="item in entityCards"
        :key="item.key"
        class="metric-card"
        type="button"
        @click="router.push(item.path)"
      >
        <span>{{ item.label }}</span>
        <strong>{{ item.total }}</strong>
        <small>{{ $t("dashboard.mainSub", { main: item.main, sub: item.sub }) }}</small>
      </button>
    </section>

    <section class="dashboard-band">
      <div class="chart-panel wide">
        <div class="panel-heading">
          <h2>{{ $t("dashboard.entityComposition") }}</h2>
          <span>{{ $t("dashboard.mainVsSub") }}</span>
        </div>
        <div ref="entityChartRef" class="chart"></div>
      </div>
      <div class="chart-panel">
        <div class="panel-heading">
          <h2>{{ $t("dashboard.riskComplexity") }}</h2>
          <span>{{ metrics.entities.risks.total }}</span>
        </div>
        <div ref="complexityChartRef" class="chart"></div>
      </div>
    </section>

    <section class="dashboard-band">
      <div class="chart-panel">
        <div class="panel-heading">
          <h2>{{ $t("dashboard.avoidanceCategories") }}</h2>
          <span>{{ metrics.entities.avoidances.total }}</span>
        </div>
        <div ref="categoryChartRef" class="chart"></div>
      </div>
      <div class="chart-panel wide">
        <div class="panel-heading">
          <h2>{{ $t("dashboard.businessSceneCoverage") }}</h2>
          <span>{{ $t("dashboard.topScenes") }}</span>
        </div>
        <div ref="sceneChartRef" class="chart"></div>
      </div>
    </section>

    <section class="dashboard-tables">
      <div class="table-panel">
        <div class="panel-heading">
          <h2>{{ $t("dashboard.relationCoverage") }}</h2>
          <span>{{ $t("dashboard.coverageRate") }}</span>
        </div>
        <div class="coverage-list">
          <div v-for="item in relationRows" :key="item.name" class="coverage-row">
            <div>
              <strong>{{ item.name }}</strong>
              <span>{{ item.covered }}/{{ item.total }} · {{ item.status }}</span>
            </div>
            <div class="coverage-meter">
              <i :style="{ width: `${item.rate}%` }"></i>
            </div>
            <b>{{ item.rate }}%</b>
          </div>
        </div>
      </div>

      <div class="table-panel">
        <div class="panel-heading">
          <h2>{{ $t("dashboard.highDegreeNodes") }}</h2>
          <span>{{ $t("dashboard.degree") }}</span>
        </div>
        <ol class="rank-list">
          <li v-for="item in highestDegreeRows" :key="`${item.type}:${item.key}`">
            <span>{{ item.key }}</span>
            <b>{{ item.degree }}</b>
          </li>
        </ol>
      </div>
    </section>
  </main>
</template>

<style scoped>
.dashboard-page {
  max-width: 1320px;
  margin: 0 auto;
  padding: 24px 18px 44px;
  color: var(--break-text-primary);
}

.dashboard-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  padding: 10px 0 24px;
  border-bottom: 1px solid var(--break-border);
}

.eyebrow {
  margin: 0 0 6px;
  color: var(--break-text-muted);
  font-size: 0.78rem;
}

.dashboard-header h1 {
  margin: 0;
  font-size: 1.8rem;
  line-height: 1.25;
}

.trust-score {
  display: grid;
  gap: 4px;
  min-width: 150px;
  padding: 12px 14px;
  border: 1px solid var(--break-border);
  border-radius: 8px;
  background: var(--break-bg-secondary);
}

.trust-score span {
  color: var(--break-text-muted);
  font-size: 0.78rem;
}

.trust-score strong {
  font-size: 1.7rem;
  line-height: 1;
}

.entity-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin: 20px 0;
}

.metric-card {
  display: grid;
  gap: 8px;
  min-height: 112px;
  padding: 14px;
  text-align: left;
  border: 1px solid var(--break-border);
  border-radius: 8px;
  color: var(--break-text-primary);
  background: var(--break-bg-card);
  cursor: pointer;
}

.metric-card:hover,
.metric-card:focus-visible {
  border-color: var(--break-highlight-border);
  background: var(--break-highlight-bg);
}

.metric-card span,
.metric-card small {
  color: var(--break-text-muted);
}

.metric-card strong {
  font-size: 2rem;
  line-height: 1;
}

.dashboard-band,
.dashboard-tables {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
  margin-top: 16px;
}

.chart-panel,
.table-panel {
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--break-border);
  border-radius: 8px;
  background: var(--break-bg-card);
}

.chart-panel.wide {
  grid-column: span 1;
}

.panel-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.panel-heading h2 {
  margin: 0;
  font-size: 1rem;
}

.panel-heading span {
  color: var(--break-text-muted);
  font-size: 0.78rem;
}

.chart {
  width: 100%;
  height: 300px;
}

.coverage-list,
.rank-list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
}

.coverage-row {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(96px, 1fr) auto;
  align-items: center;
  gap: 12px;
}

.coverage-row div:first-child {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.coverage-row strong,
.rank-list span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.coverage-row span {
  color: var(--break-text-muted);
  font-size: 0.78rem;
}

.coverage-meter {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--break-bg-secondary);
}

.coverage-meter i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #2563eb;
}

.rank-list {
  list-style: none;
}

.rank-list li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  padding: 9px 0;
  border-bottom: 1px solid var(--break-border-light);
}

.rank-list b,
.coverage-row b {
  color: var(--break-text-primary);
}

@media (max-width: 1024px) {
  .entity-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 767px) {
  .dashboard-page {
    padding: 16px 10px 34px;
  }

  .dashboard-header {
    align-items: stretch;
    flex-direction: column;
  }

  .entity-grid,
  .dashboard-band,
  .dashboard-tables {
    grid-template-columns: 1fr;
  }

  .coverage-row {
    grid-template-columns: 1fr auto;
  }

  .coverage-meter {
    grid-column: 1 / -1;
    order: 3;
  }

  .chart {
    height: 260px;
  }
}
</style>
