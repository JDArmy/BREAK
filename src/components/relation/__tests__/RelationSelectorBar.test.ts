import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import RelationSelectorBar from "@/components/relation/RelationSelectorBar.vue";
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

describe("RelationSelectorBar", () => {
  it("隐藏术语类型并转发关系类型更新", async () => {
    const wrapper = mount(RelationSelectorBar, {
      props: {
        relType: RelationType.risk,
        relKey: "R0001",
        RelationTypeMapping: relationTypeMapping,
        getCurrentEntityOptions: { R0001: {}, R0002: {} },
      },
      global: {
        stubs: {
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
        },
      },
    });

    expect(wrapper.find("#relation-selector-type").text()).not.toContain("术语");

    await wrapper.find("#relation-selector-type").setValue(RelationType.avoidance);

    expect(wrapper.emitted("update:relType")?.[0]).toEqual([RelationType.avoidance]);
  });

  it("初始只渲染当前实体，选择时转发实体 key", async () => {
    const wrapper = mount(RelationSelectorBar, {
      props: {
        relType: RelationType.risk,
        relKey: "R0001",
        RelationTypeMapping: relationTypeMapping,
        getCurrentEntityOptions: { R0001: {}, R0002: {} },
      },
      global: {
        stubs: {
          ElSelect: { template: "<select><slot /></select>" },
          ElOption: { template: "<option />" },
          ElSelectV2: {
            props: ["modelValue", "options"],
            emits: ["update:modelValue"],
            template:
              '<select id="relation-selector-key" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="item in options" :key="item.value" :value="item.value">{{ item.label }}</option></select>',
          },
        },
      },
    });

    expect(wrapper.find("#relation-selector-key").text()).toContain("R0001");
    expect(wrapper.find("#relation-selector-key").text()).not.toContain("R0002");

    await wrapper.find("#relation-selector-key").setValue("R0001");

    expect(wrapper.emitted("update:relKey")?.[0]).toEqual(["R0001"]);
  });
});
