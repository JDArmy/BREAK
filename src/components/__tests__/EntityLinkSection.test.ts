import { mount, RouterLinkStub } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
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
  it("普通实体链接统一使用详情路由", () => {
    const wrapper = mount(EntityLinkSection, {
      props: {
        keys: ["R0001"],
        title: "risks",
        routeName: "risks",
        detailRouteName: "risksDetail",
        paramKey: "rKey",
      },
      global: globalConfig,
    });

    expect(wrapper.findComponent(RouterLinkStub).props("to")).toEqual({
      name: "risksDetail",
      params: { rKey: "R0001" },
    });
    expect(wrapper.find("table").exists()).toBe(true);
    expect(wrapper.text()).toContain("R0001");
    expect(wrapper.text()).toContain("BREAK.risks.R0001.title");
    expect(wrapper.text()).toContain("BREAK.risks.R0001.definition");
  });

  it("无独立详情路由的业务场景链接保留必需路由参数", () => {
    const wrapper = mount(EntityLinkSection, {
      props: {
        keys: ["BS01"],
        title: "businessScenes",
        routeName: "businessScene",
        detailRouteName: "businessScene",
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

  it("懒加载实体可传入记录数据避免读取不存在的 i18n 路径", () => {
    const wrapper = mount(EntityLinkSection, {
      props: {
        keys: ["C0001"],
        title: "relatedCases",
        routeName: "cases",
        detailRouteName: "casesDetail",
        paramKey: "cKey",
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
