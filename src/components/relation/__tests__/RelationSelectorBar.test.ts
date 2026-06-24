import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import RelationSelectorBar from "@/components/relation/RelationSelectorBar.vue";
import type { RelationAnalysisPerspectiveOption } from "@/views/relation/relationAnalysisPerspectives";
import { RelationType } from "@/views/relation/relationTypes";

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
  ElRadioGroup: {
    props: ["modelValue"],
    emits: ["update:modelValue"],
    template:
      '<div class="radio-group-stub"><slot /><button class="perspective-update" @click="$emit(\'update:modelValue\', \'attackPath\')">update</button></div>',
  },
  ElRadioButton: {
    props: ["value"],
    template: '<button class="radio-button-stub" :data-value="value"><slot /></button>',
  },
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

const perspectiveOptions: RelationAnalysisPerspectiveOption[] = [
  {
    key: "risk",
    titleKey: "relationView.perspective.risk.title",
    descriptionKey: "relationView.perspective.risk.description",
    defaultView: "network",
    networkLayout: "horizontal",
    relationTypes: [RelationType.risk],
    lineTypes: ["relationLine.directCauseRisk"],
    showSubNode: true,
    showRelatedEntity: true,
  },
  {
    key: "attackPath",
    titleKey: "relationView.perspective.attackPath.title",
    descriptionKey: "relationView.perspective.attackPath.description",
    defaultView: "sankey",
    networkLayout: "horizontal",
    relationTypes: [RelationType.threatActor, RelationType.attackTool],
    lineTypes: ["relationLine.useAttackTool"],
    showSubNode: false,
    showRelatedEntity: false,
  },
];

const mountSelector = (props?: Partial<InstanceType<typeof RelationSelectorBar>["$props"]>) =>
  mount(RelationSelectorBar, {
    props: {
      relType: RelationType.risk,
      relKey: "R0001",
      RelationTypeMapping: relationTypeMapping,
      getCurrentEntityOptions: { R0001: {}, R0002: {} },
      ...props,
    },
    global: {
      stubs,
    },
  });

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete (window as Window & { requestIdleCallback?: unknown }).requestIdleCallback;
  delete (window as Window & { cancelIdleCallback?: unknown }).cancelIdleCallback;
});

describe("RelationSelectorBar", () => {
  it("渲染任务型分析视角并转发视角更新", async () => {
    const wrapper = mountSelector({
      analysisPerspective: "risk",
      analysisPerspectiveOptions: perspectiveOptions,
    });

    expect(wrapper.text()).toContain("relationView.perspective.risk.title");
    expect(wrapper.text()).toContain(
      "relationView.perspective.risk.description",
    );

    await wrapper.find(".perspective-update").trigger("click");

    expect(wrapper.emitted("update:analysisPerspective")?.[0]).toEqual([
      "attackPath",
    ]);
  });

  it("隐藏术语类型并转发关系类型更新", async () => {
    const wrapper = mountSelector();

    expect(wrapper.find("#relation-selector-type").text()).not.toContain("术语");

    await wrapper.find("#relation-selector-type").setValue(RelationType.avoidance);

    expect(wrapper.emitted("update:relType")?.[0]).toEqual([RelationType.avoidance]);
  });

  it("初始只渲染当前实体，选择时转发实体 key", async () => {
    const wrapper = mountSelector();

    expect(wrapper.find("#relation-selector-key").text()).toContain("R0001");
    expect(wrapper.find("#relation-selector-key").text()).not.toContain("R0002");

    await wrapper.find("#relation-selector-key").setValue("R0001");

    expect(wrapper.emitted("update:relKey")?.[0]).toEqual(["R0001"]);
  });

  it("空闲回调触发后应该渲染当前类型的全部实体选项", async () => {
    let idleCallback: (() => void) | null = null;
    (window as Window & { requestIdleCallback: (callback: () => void) => number }).requestIdleCallback = vi.fn(
      (callback: () => void) => {
        idleCallback = callback;
        return 10;
      },
    );

    const wrapper = mountSelector();

    expect(wrapper.find("#relation-selector-key").text()).not.toContain("R0002");

    idleCallback?.();
    await wrapper.vm.$nextTick();

    expect(wrapper.find("#relation-selector-key").text()).toContain("R0001:BREAK.risks.R0001.title");
    expect(wrapper.find("#relation-selector-key").text()).toContain("R0002:BREAK.risks.R0002.title");
  });

  it("关系类型变化后应该立即切换到新类型实体选项", async () => {
    const wrapper = mountSelector({
      relType: RelationType.risk,
      relKey: "R0001",
      getCurrentEntityOptions: { R0001: {}, R0002: {} },
    });

    await wrapper.setProps({
      relType: RelationType.avoidance,
      relKey: "A0001",
      getCurrentEntityOptions: { A0001: {}, A0002: {} },
    });

    expect(wrapper.find("#relation-selector-key").text()).toContain("A0001:BREAK.avoidances.A0001.title");
    expect(wrapper.find("#relation-selector-key").text()).toContain("A0002:BREAK.avoidances.A0002.title");
  });

  it("缺失实体类型映射时应该返回空实体选项", () => {
    const wrapper = mountSelector({
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

    const wrapper = mountSelector();

    wrapper.unmount();

    expect(cancelIdleCallback).toHaveBeenCalledWith(12);
  });

  it("不支持空闲回调时应该使用定时器并在卸载时清理", () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");
    const wrapper = mountSelector();

    wrapper.unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});
