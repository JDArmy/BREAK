import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import DrawerEntityLinkSection from "@/components/DrawerEntityLinkSection.vue";

const globalConfig = {
  mocks: {
    $t: (key: string) => key,
  },
  stubs: {
    ElTooltip: {
      template: "<span><slot /></span>",
    },
  },
};

describe("DrawerEntityLinkSection", () => {
  it("keys 为空时整段不渲染", () => {
    const wrapper = mount(DrawerEntityLinkSection, {
      props: {
        keys: [],
        title: "risks",
        entityType: "risk" as const,
        onNavigate: vi.fn(),
      },
      global: globalConfig,
    });

    expect(wrapper.find("section").exists()).toBe(false);
    expect(wrapper.find("table").exists()).toBe(false);
  });

  it("渲染表格并通过 entityType 取 i18n 路径", () => {
    const wrapper = mount(DrawerEntityLinkSection, {
      props: {
        keys: ["R0001"],
        title: "risks",
        entityType: "risk" as const,
        onNavigate: vi.fn(),
      },
      global: globalConfig,
    });

    expect(wrapper.find("table").exists()).toBe(true);
    expect(wrapper.text()).toContain("R0001");
    expect(wrapper.text()).toContain("BREAK.risks.R0001.title");
    expect(wrapper.text()).toContain("BREAK.risks.R0001.definition");
  });

  it("点击 button 触发 onNavigate 回调", async () => {
    const onNavigate = vi.fn();
    const wrapper = mount(DrawerEntityLinkSection, {
      props: {
        keys: ["R0001"],
        title: "risks",
        entityType: "risk" as const,
        onNavigate,
      },
      global: globalConfig,
    });

    const buttons = wrapper.findAll("button.entity-reference-link--button");
    expect(buttons.length).toBe(1); // 仅标题列可点击（ID 列为纯文本）
    await buttons[0].trigger("click");
    expect(onNavigate).toHaveBeenCalledWith("R0001");
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it("懒加载实体传入 entityRecords 时优先用记录数据", () => {
    const wrapper = mount(DrawerEntityLinkSection, {
      props: {
        keys: ["C0001"],
        title: "relatedCases",
        entityType: "case" as const,
        onNavigate: vi.fn(),
        entityRecords: {
          C0001: {
            title: "案例标题",
            summary: "案例简介",
          },
        },
      },
      global: globalConfig,
    });

    expect(wrapper.text()).toContain("案例标题");
    expect(wrapper.text()).toContain("案例简介");
    expect(wrapper.text()).not.toContain("BREAK.cases.C0001.title");
  });
});
