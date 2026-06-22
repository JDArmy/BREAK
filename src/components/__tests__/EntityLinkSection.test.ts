import { mount, RouterLinkStub } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import EntityLinkSection from "@/components/EntityLinkSection.vue";

const mocks = vi.hoisted(() => ({
  isMobile: { value: false, __v_isRef: true },
}));

vi.mock("@/composables/useBreakpoints", () => ({
  useBreakpoints: () => ({ isMobile: mocks.isMobile }),
}));

describe("EntityLinkSection", () => {
  it("普通桌面列表链接使用 hash 定位", () => {
    const wrapper = mount(EntityLinkSection, {
      props: {
        keys: ["R0001"],
        title: "risks",
        routeName: "risks",
        detailRouteName: "risksDetail",
        paramKey: "rKey",
      },
      global: {
        mocks: {
          $t: (key: string) => key,
        },
        stubs: {
          RouterLink: RouterLinkStub,
        },
      },
    });

    expect(wrapper.findComponent(RouterLinkStub).props("to")).toEqual({
      name: "risks",
      hash: "#R0001",
    });
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
      global: {
        mocks: {
          $t: (key: string) => key,
        },
        stubs: {
          RouterLink: RouterLinkStub,
        },
      },
    });

    expect(wrapper.findComponent(RouterLinkStub).props("to")).toEqual({
      name: "businessScene",
      params: { bsKey: "BS01" },
      hash: "#BS01",
    });
  });
});
