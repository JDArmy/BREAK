import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import RelationSelectorBar from "@/components/relation/RelationSelectorBar.vue";
import { RelationType } from "@/views/relation/relationTypes";
import { RELATION_VIEW_MODEL_KEY } from "@/views/relation/relationViewModelKey";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

const relationTypeMapping = {
  [RelationType.risk]: { title: "风险", BreakKey: "risks" },
  [RelationType.avoidance]: { title: "规避手段", BreakKey: "avoidances" },
  [RelationType.attackTool]: { title: "攻击工具", BreakKey: "attackTools" },
  [RelationType.threatActor]: { title: "威胁行为者", BreakKey: "threatActors" },
  [RelationType.term]: { title: "术语", BreakKey: "terms" },
};

const stubs = {
  ElSelect: {
    props: ["modelValue"],
    emits: ["update:modelValue"],
    template:
      '<select id="relation-selector-type" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
  },
  ElOption: {
    props: ["label", "value"],
    template: '<option :value="value">{{ label }}</option>',
  },
  ElSelectV2: {
    props: ["modelValue", "options"],
    emits: ["update:modelValue"],
    template:
      '<select id="relation-selector-key" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="item in options" :key="item.value" :value="item.value">{{ item.label }}</option></select>',
  },
};

interface MockViewModelOptions {
  relType?: RelationType;
  relKey?: string;
  getCurrentEntityOptions?: Record<string, unknown>;
}

/** 构造 mock viewModel（含 RelationSelectorBar 所需的 ref/对象） */
const createMockViewModel = (options: MockViewModelOptions = {}) => ({
  relType: ref<RelationType>(options.relType ?? RelationType.risk),
  relKey: ref<string>(options.relKey ?? "R0001"),
  RelationTypeMapping: relationTypeMapping,
  getCurrentEntityOptions: ref<Record<string, unknown>>(
    options.getCurrentEntityOptions ?? { R0001: {}, R0002: {} },
  ),
});

const mountSelector = (options?: MockViewModelOptions) => {
  const viewModel = createMockViewModel(options);
  const wrapper = mount(RelationSelectorBar, {
    global: {
      stubs,
      provide: {
        [RELATION_VIEW_MODEL_KEY as symbol]: viewModel,
      },
    },
  });
  return { wrapper, viewModel };
};

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete (window as Window & { requestIdleCallback?: unknown }).requestIdleCallback;
  delete (window as Window & { cancelIdleCallback?: unknown }).cancelIdleCallback;
});

describe("RelationSelectorBar", () => {
  it("不渲染重复的任务型分析视角控件", () => {
    const { wrapper } = mountSelector();

    expect(wrapper.find(".relation-perspective-control").exists()).toBe(false);
  });

  it("隐藏术语类型并同步关系类型到 viewModel", async () => {
    const { wrapper, viewModel } = mountSelector();

    expect(wrapper.find("#relation-selector-type").text()).not.toContain("术语");

    await wrapper.find("#relation-selector-type").setValue(RelationType.avoidance);

    // relType 是 viewModel 的 ref，选择后直接同步到 viewModel（不再 emit）
    expect(viewModel.relType.value).toBe(RelationType.avoidance);
  });

  it("初始只渲染当前实体，选择时同步实体 key 到 viewModel", async () => {
    const { wrapper, viewModel } = mountSelector();

    expect(wrapper.find("#relation-selector-key").text()).toContain("R0001");
    expect(wrapper.find("#relation-selector-key").text()).not.toContain("R0002");

    await wrapper.find("#relation-selector-key").setValue("R0001");

    expect(viewModel.relKey.value).toBe("R0001");
  });

  it("空闲回调触发后应该渲染当前类型的全部实体选项", async () => {
    let idleCallback: (() => void) | null = null;
    (window as Window & { requestIdleCallback: (callback: () => void) => number }).requestIdleCallback = vi.fn(
      (callback: () => void) => {
        idleCallback = callback;
        return 10;
      },
    );

    const { wrapper } = mountSelector();

    expect(wrapper.find("#relation-selector-key").text()).not.toContain("R0002");

    idleCallback?.();
    await wrapper.vm.$nextTick();

    expect(wrapper.find("#relation-selector-key").text()).toContain("R0001:BREAK.risks.R0001.title");
    expect(wrapper.find("#relation-selector-key").text()).toContain("R0002:BREAK.risks.R0002.title");
  });

  it("关系类型变化后应该立即切换到新类型实体选项", async () => {
    const { wrapper, viewModel } = mountSelector({
      relType: RelationType.risk,
      relKey: "R0001",
      getCurrentEntityOptions: { R0001: {}, R0002: {} },
    });

    // 模拟 viewModel 的 relType/relKey/getCurrentEntityOptions 变化（响应式驱动）
    viewModel.relType.value = RelationType.avoidance;
    viewModel.relKey.value = "A0001";
    viewModel.getCurrentEntityOptions.value = { A0001: {}, A0002: {} };
    await wrapper.vm.$nextTick();

    expect(wrapper.find("#relation-selector-key").text()).toContain("A0001:BREAK.avoidances.A0001.title");
    expect(wrapper.find("#relation-selector-key").text()).toContain("A0002:BREAK.avoidances.A0002.title");
  });

  it("缺失实体类型映射时应该返回空实体选项", () => {
    const { wrapper } = mountSelector({
      relType: RelationType.all,
      relKey: "R0001",
    });

    expect(wrapper.find("#relation-selector-key").text()).toBe("");
  });

  it("卸载时应该清理空闲回调", () => {
    (window as Window & { requestIdleCallback: () => number }).requestIdleCallback = vi.fn(() => 12);
    const cancelIdleCallback = vi.fn();
    (window as Window & { cancelIdleCallback: (handle: number) => void }).cancelIdleCallback =
      cancelIdleCallback;

    const { wrapper } = mountSelector();

    wrapper.unmount();

    expect(cancelIdleCallback).toHaveBeenCalledWith(12);
  });

  it("不支持空闲回调时应该使用定时器并在卸载时清理", () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");
    const { wrapper } = mountSelector();

    wrapper.unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});
