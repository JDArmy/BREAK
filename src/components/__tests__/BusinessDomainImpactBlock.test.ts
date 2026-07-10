import { mount, RouterLinkStub } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import BusinessDomainImpactBlock from "@/components/BusinessDomainImpactBlock.vue";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  }),
}));

const global = {
  stubs: { RouterLink: RouterLinkStub },
};

describe("BusinessDomainImpactBlock", () => {
  it("将风险映射为可跳转的业务域列表", () => {
    const wrapper = mount(BusinessDomainImpactBlock, {
      props: {
        entityType: "risk",
        entityId: "R0005-001",
        entityTitle: "测试风险",
      },
      global,
    });

    expect(wrapper.text()).toContain("relationView.businessDomainImpactBlockTitle");
    expect(wrapper.text()).toContain("BD00");
    expect(wrapper.findComponent(RouterLinkStub).props("to")).toEqual({
      name: "businessDomain",
      params: { bdKey: "BD00" },
    });
  });

  it("Case 使用传入的 relatedRisks 推导业务域影响", () => {
    const wrapper = mount(BusinessDomainImpactBlock, {
      props: {
        entityType: "case",
        entityId: "C9999",
        entityTitle: "测试案例",
        caseRelatedRisks: ["R0005-001"],
      },
      global,
    });

    expect(wrapper.text()).toContain("BD00");
    expect(wrapper.text()).toContain("relationView.businessDomainImpactSummary");
  });

  it("无法映射时显示既有空状态说明", () => {
    const wrapper = mount(BusinessDomainImpactBlock, {
      props: {
        entityType: "attackTool",
        entityId: "AT9999",
        entityTitle: "未知工具",
      },
      global,
    });

    expect(wrapper.text()).toContain("relationView.businessDomainImpactSummaryEmpty");
    expect(wrapper.text()).toContain("relationView.businessDomainImpactNoticeEmpty");
    expect(wrapper.findComponent(RouterLinkStub).exists()).toBe(false);
  });
});
