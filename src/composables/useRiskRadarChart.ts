import { onBeforeUnmount, onMounted, ref, watch, nextTick, type Ref } from "vue";
import type { ECharts } from "echarts/core";
import { loadRiskRadarECharts } from "@/views/relation/relationECharts";
import type { RiskAssessment } from "@/BREAK/risks";

/**
 * 风险分级雷达图 composable：RisksView 与 RiskDetail 共用，去重渲染/销毁/watch 逻辑。
 *
 * 内部自管 radarChartRef / radarChart 实例 / renderRadar / disposeRadar，
 * 监听 assessmentRef 与 localeRef 变化重渲染；onMounted 触发首渲，onBeforeUnmount 释放。
 * assessmentRef 为空时不渲染并销毁已有实例。
 *
 * @param assessmentRef riskAssessment 对象的 ref/computed（空表示无分级数据）
 * @param localeRef locale 的 ref
 * @param t 翻译函数（用于雷达轴名与系列名）
 * @returns radarChartRef 由 composable 创建并返回，模板用 ref="radarChartRef" 绑定
 */
export function useRiskRadarChart(
  assessmentRef: Ref<RiskAssessment | undefined>,
  localeRef: Ref<string>,
  t: (key: string) => string,
): {
  radarChartRef: Ref<HTMLElement | null>;
} {
  const radarChartRef = ref<HTMLElement | null>(null);
  let radarChart: ECharts | null = null;

  const RISK_DIMENSIONS = [
    "likelihood",
    "businessLoss",
    "attackCost",
    "detectionDifficulty",
    "defenseMaturity",
  ] as const;
  const SEVERITY_VALUE: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };

  async function renderRadar() {
    const a = assessmentRef.value;
    if (!a || !radarChartRef.value) return;
    const initFn = await loadRiskRadarECharts();
    if (!radarChartRef.value) return; // 切换期间可能已卸载
    if (!radarChart) {
      radarChart = initFn(radarChartRef.value);
    }
    // echarts canvas 不支持 CSS 变量，从根元素读取实际颜色值
    const styles = getComputedStyle(document.documentElement);
    const textColor = styles.getPropertyValue("--break-text-secondary").trim() || "#666";
    const primaryColor = styles.getPropertyValue("--break-primary").trim() || "#409eff";
    radarChart.setOption({
      radar: {
        indicator: RISK_DIMENSIONS.map((dim) => ({ name: t(`riskDim.${dim}`), max: 4 })),
        radius: "60%",
        center: ["50%", "52%"],
        axisName: {
          color: textColor,
          fontSize: 12,
          fontWeight: 600,
          padding: [3, 5],
        },
        splitArea: { areaStyle: { color: ["var(--break-bg-secondary)", "transparent"] } },
      },
      series: [
        {
          type: "radar",
          data: [
            {
              value: RISK_DIMENSIONS.map((dim) => SEVERITY_VALUE[a[dim]] ?? 0),
              name: t("riskAssessmentDimensions"),
              areaStyle: { opacity: 0.2 },
              lineStyle: { width: 2 },
              label: {
                show: true,
                color: primaryColor,
                fontSize: 11,
                fontWeight: 700,
                formatter: (params: { value: number }) => params.value,
              },
            },
          ],
        },
      ],
    });
  }

  function disposeRadar() {
    if (radarChart) {
      radarChart.dispose();
      radarChart = null;
    }
  }

  watch(
    [assessmentRef, localeRef],
    () => {
      nextTick(() => {
        if (assessmentRef.value) {
          renderRadar();
        } else {
          disposeRadar();
        }
      });
    },
    { immediate: true },
  );

  onMounted(() => {
    nextTick(() => assessmentRef.value && renderRadar());
  });
  onBeforeUnmount(disposeRadar);

  return { radarChartRef };
}
