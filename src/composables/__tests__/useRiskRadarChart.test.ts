import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";
import type { RiskAssessment } from "@/BREAK/risks";

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("useRiskRadarChart", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("根据风险分级渲染雷达图，并在数据清空和卸载时释放实例", async () => {
    const setOption = vi.fn();
    const dispose = vi.fn();
    const initChart = vi.fn(() => ({ setOption, dispose }));
    vi.doMock("@/views/relation/relationECharts", () => ({
      loadRiskRadarECharts: vi.fn(async () => initChart),
    }));

    const assessment = ref<RiskAssessment | undefined>({
      likelihood: "low",
      businessLoss: "medium",
      attackCost: "high",
      detectionDifficulty: "critical",
      defenseMaturity: "unknown" as RiskAssessment["defenseMaturity"],
      severity: "medium",
      rationale: "测试",
    });
    const locale = ref("zh-CN");
    const t = vi.fn((key: string) => key);
    const { useRiskRadarChart } = await import("@/composables/useRiskRadarChart");
    const Host = defineComponent({
      setup() {
        const { radarChartRef } = useRiskRadarChart(assessment, locale, t);
        return () => h("div", { ref: radarChartRef });
      },
    });

    const wrapper = mount(Host);
    await nextTick();
    await flushPromises();

    expect(initChart).toHaveBeenCalledTimes(1);
    expect(setOption).toHaveBeenCalledTimes(2);
    expect(setOption.mock.calls[0][0].series[0].data[0].value).toEqual([1, 2, 3, 4, 0]);
    expect(t).toHaveBeenCalledWith("riskAssessmentDimensions");
    const initialSetOptionCalls = setOption.mock.calls.length;

    locale.value = "en";
    await nextTick();
    await flushPromises();
    expect(initChart).toHaveBeenCalledTimes(1);
    expect(setOption).toHaveBeenCalledTimes(initialSetOptionCalls + 1);

    assessment.value = undefined;
    await nextTick();
    await flushPromises();
    expect(dispose).toHaveBeenCalledTimes(1);

    assessment.value = {
      likelihood: "medium",
      businessLoss: "medium",
      attackCost: "medium",
      detectionDifficulty: "medium",
      defenseMaturity: "medium",
      severity: "medium",
      rationale: "测试",
    };
    await nextTick();
    await flushPromises();
    expect(initChart).toHaveBeenCalledTimes(2);

    wrapper.unmount();
    expect(dispose).toHaveBeenCalledTimes(2);
  });
});
