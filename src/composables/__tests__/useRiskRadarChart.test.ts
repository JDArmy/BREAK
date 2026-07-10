import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";
import type { RiskAssessment } from "@/BREAK/risks";

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));
const resizeObserverCallbacks: Array<() => void> = [];

class TestResizeObserver {
  observe = vi.fn();
  disconnect = vi.fn();

  constructor(callback: () => void) {
    resizeObserverCallbacks.push(callback);
  }
}

describe("useRiskRadarChart", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    resizeObserverCallbacks.length = 0;
    vi.stubGlobal("ResizeObserver", TestResizeObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("根据风险分级渲染雷达图，并在数据清空和卸载时释放实例", async () => {
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(630);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(450);
    const setOption = vi.fn();
    const resize = vi.fn();
    const dispose = vi.fn();
    const initChart = vi.fn(() => ({ setOption, resize, dispose }));
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
    expect(setOption).toHaveBeenCalledTimes(1);
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

  it("容器恢复尺寸后才初始化雷达图", async () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    let width = 0;
    let height = 0;
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(() => width);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(() => height);
    const setOption = vi.fn();
    const initChart = vi.fn(() => ({ setOption, resize: vi.fn(), dispose: vi.fn() }));
    vi.doMock("@/views/relation/relationECharts", () => ({
      loadRiskRadarECharts: vi.fn(async () => initChart),
    }));
    const assessment = ref<RiskAssessment | undefined>({
      likelihood: "low",
      businessLoss: "medium",
      attackCost: "high",
      detectionDifficulty: "critical",
      defenseMaturity: "medium",
      severity: "medium",
      rationale: "测试",
    });
    const locale = ref("zh-CN");
    const { useRiskRadarChart } = await import("@/composables/useRiskRadarChart");
    const Host = defineComponent({
      setup() {
        const { radarChartRef } = useRiskRadarChart(assessment, locale, (key) => key);
        return () => h("div", { ref: radarChartRef });
      },
    });

    const wrapper = mount(Host);
    await nextTick();
    await flushPromises();
    expect(initChart).not.toHaveBeenCalled();

    width = 630;
    height = 450;
    resizeObserverCallbacks[0]();
    await flushPromises();

    expect(initChart).toHaveBeenCalledTimes(1);
    expect(setOption).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });
});
