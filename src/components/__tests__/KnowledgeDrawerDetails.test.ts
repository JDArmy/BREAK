import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import RiskDetail from "@/components/RiskDetail.vue";
import AvoidanceDetail from "@/components/AvoidanceDetail.vue";

vi.mock("element-plus/es/components/drawer/style/css", () => ({}));
vi.mock("element-plus/es/components/button/style/css", () => ({}));

vi.mock("vue-router", () => ({
  useRouter: () => ({
    push: vi.fn(),
    resolve: vi.fn(() => ({ href: "/#/relation/risk/R0001" })),
  }),
  useRoute: () => ({
    params: {},
  }),
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: ref("cn"),
    messages: ref({ cn: {} }),
  }),
}));

vi.mock("@/composables/useDrawerWidth", () => ({
  useDrawerWidth: () => ({
    getDrawerWidth: () => "720px",
    getInnerDrawerWidth: () => "640px",
  }),
}));

// RiskDetail 经 useRelatedCases 拉起 useCases→@/i18n→createI18n 重链，抽屉单测里隔离掉
vi.mock("@/composables/useRelatedCases", () => ({
  useRelatedCases: () => ({
    relatedCases: ref<string[]>([]),
    ensureCases: vi.fn(() => Promise.resolve()),
    cases: ref({}),
    loaded: ref(true),
    sectionRef: ref<HTMLElement | undefined>(undefined),
  }),
}));

const globalConfig = {
  mocks: {
    $t: (key: string) => key,
    $router: {
      push: vi.fn(),
    },
  },
  stubs: {
    ElDrawer: {
      props: ["modelValue", "title", "size"],
      emits: ["closed"],
      template:
        '<section class="drawer-stub" :data-size="size"><header><slot name="header" /></header><slot /><button class="drawer-closed" @click="$emit(\'closed\')">closed</button></section>',
    },
    ElButton: {
      emits: ["click"],
      template: '<button type="button" class="button-stub" @click="$emit(\'click\', $event)"><slot /></button>',
    },
    ElIcon: { template: "<span><slot /></span>" },
    RouterLink: {
      props: ["to"],
      template: '<a class="router-link-stub"><slot /></a>',
    },
    ReferenceList: {
      props: ["type", "entityKey"],
      template: '<div class="reference-list-stub">{{ type }} {{ entityKey }}</div>',
    },
    AvoidanceDetail: true,
    AttackToolDetail: true,
    ThreatActorDetail: true,
    TermDetail: true,
    FeedbackLink: true,
    IconRelation: true,
    ArrowLeft: true,
  },
};

describe("知识抽屉详情组件", () => {
  it("RiskDetail 渲染风险基础信息并转发关闭事件", async () => {
    const wrapper = mount(RiskDetail, {
      props: {
        drawer: true,
        rKey: "R0001",
      },
      global: globalConfig,
    });

    expect(wrapper.text()).toContain("R0001");
    expect(wrapper.text()).toContain("riskDefinition");
    expect(wrapper.find(".drawer-stub").attributes("data-size")).toBe("720px");

    await wrapper.find(".drawer-closed").trigger("click");

    expect(wrapper.emitted("drawerClose")).toHaveLength(1);
  });

  it("AvoidanceDetail 渲染规避手段基础信息并转发关闭事件", async () => {
    const wrapper = mount(AvoidanceDetail, {
      props: {
        drawer: true,
        aKey: "A0001",
      },
      global: globalConfig,
    });

    expect(wrapper.text()).toContain("A0001");
    expect(wrapper.text()).toContain("definition");
    expect(wrapper.find(".drawer-stub").attributes("data-size")).toBe("640px");

    await wrapper.find(".drawer-closed").trigger("click");

    expect(wrapper.emitted("drawerClose")).toHaveLength(1);
  });
});
