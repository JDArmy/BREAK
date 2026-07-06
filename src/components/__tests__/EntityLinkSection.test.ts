import { mount, RouterLinkStub } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import EntityLinkSection from "@/components/EntityLinkSection.vue";

const globalConfig = {
  mocks: {
    $t: (key: string) => key,
  },
  stubs: {
    RouterLink: RouterLinkStub,
    ElTooltip: {
      template: "<span><slot /></span>",
    },
  },
};

describe("EntityLinkSection", () => {
  describe("router-link 模式（列表页，不传 onNavigate）", () => {
    it("普通实体通过 entityType 推导详情路由", () => {
      const wrapper = mount(EntityLinkSection, {
        props: {
          keys: ["R0001"],
          title: "risks",
          entityType: "risk" as const,
        },
        global: globalConfig,
      });

      expect(wrapper.findComponent(RouterLinkStub).props("to")).toEqual({
        name: "knowledgesRiskDetail",
        params: { rKey: "R0001" },
      });
      expect(wrapper.find("table").exists()).toBe(true);
      expect(wrapper.text()).toContain("R0001");
      expect(wrapper.text()).toContain("BREAK.risks.R0001.title");
      expect(wrapper.text()).toContain("BREAK.risks.R0001.definition");
    });

    it("businessScene 走 route + hash 模式", () => {
      const wrapper = mount(EntityLinkSection, {
        props: {
          keys: ["BS01"],
          title: "businessScenes",
          routeName: "businessScene",
          paramKey: "bsKey",
          i18nEntityType: "businessScenes",
        },
        global: globalConfig,
      });

      expect(wrapper.findComponent(RouterLinkStub).props("to")).toEqual({
        name: "businessScene",
        params: { bsKey: "BS01" },
        hash: "#BS01",
      });
      expect(wrapper.text()).toContain("BREAK.businessScenes.BS01.description");
    });

    it("懒加载实体传入 entityRecords 优先用记录数据", () => {
      const wrapper = mount(EntityLinkSection, {
        props: {
          keys: ["C0001"],
          title: "relatedCases",
          entityType: "case" as const,
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

    it("ID 列为纯文本不可点击", () => {
      const wrapper = mount(EntityLinkSection, {
        props: {
          keys: ["R0001"],
          title: "risks",
          entityType: "risk" as const,
        },
        global: globalConfig,
      });

      // ID 列是 span，不是 router-link
      const idCell = wrapper.find(".entity-reference-id");
      expect(idCell.findComponent(RouterLinkStub).exists()).toBe(false);
      expect(idCell.find("span.entity-reference-id-text").exists()).toBe(true);
    });
  });

  describe("button 模式（抽屉，传 onNavigate）", () => {
    it("keys 为空时整段不渲染", () => {
      const wrapper = mount(EntityLinkSection, {
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
      const wrapper = mount(EntityLinkSection, {
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
      const wrapper = mount(EntityLinkSection, {
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

    it("懒加载实体传入 entityRecords 优先用记录数据", () => {
      const wrapper = mount(EntityLinkSection, {
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
});
