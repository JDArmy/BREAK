import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { computed, defineComponent, nextTick, reactive, ref } from "vue";

const push = vi.fn();
const replace = vi.fn();
const route = reactive<{
  name: string;
  params: Record<string, string | undefined>;
}>({
  name: "home",
  params: {},
});
const locale = ref("cn");

vi.mock("element-plus/es/components/row/style/css", () => ({}));
vi.mock("element-plus/es/components/col/style/css", () => ({}));

vi.mock("vue-router", () => ({
  useRouter: () => ({ push, replace }),
  useRoute: () => route,
}));

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    locale,
    t: (key: string) => key,
    te: (key: string) => key.includes("BS00") || key.includes("R0001"),
  }),
}));

vi.mock("@/composables/useBreakpoints", () => ({
  useBreakpoints: () => ({
    isMobile: computed(() => false),
  }),
}));

vi.mock("@/BREAK/home", () => ({
  default: {
    version: "2.23.62",
    updated: "2026-06-24",
    entityCounts: {
      avoidances: 1,
      subAvoidances: 0,
      attackTools: 1,
      subAttackTools: 0,
      threatActors: 1,
      subThreatActors: 0,
      terms: 1,
      cases: 1,
    },
    risks: {
      R0001: {
        title: "流程自动化",
        definition: "流程自动化风险",
      },
      "R0001-001": {
        title: "子风险",
        definition: "子风险定义",
      },
    },
    businessScenes: {
      BS00: {
        title: "全场景",
        riskDimensions: {
          RD01: {
            title: "交易维度",
            riskScenes: ["RS01"],
          },
        },
        riskScenes: {
          RS01: {
            title: "接口攻击",
            risks: ["R0001"],
          },
        },
      },
      BS01: {
        title: "金融",
        riskDimensions: {
          RD02: {
            title: "金融维度",
            riskScenes: ["RS02"],
          },
        },
        riskScenes: {
          RS02: {
            title: "金融欺诈",
            risks: ["R0001"],
          },
        },
      },
    },
  },
}));

vi.mock("@/BREAK", () => ({
  default: {
    avoidances: { A0001: { title: "人机验证" } },
    attackTools: { AT0001: { title: "电话黑卡" } },
    threatActors: { TA0001: { title: "羊毛党" } },
    terms: { T0001: { title: "账号" } },
  },
}));

const drawerStub = (className: string, keyProp: string) =>
  defineComponent({
    props: ["drawer", keyProp],
    emits: ["drawerClose"],
    template: `<section class="${className}">{{ ${keyProp} }}<button class="close-drawer" @click="$emit('drawerClose')">close</button></section>`,
  });

const mountHomeView = async () => {
  const HomeView = (await import("@/views/HomeView.vue")).default;
  return mount(HomeView, {
    global: {
      mocks: {
        $t: (key: string) => key,
      },
      stubs: {
        RouterLink: {
          props: ["to"],
          template: '<a class="router-link-stub" :data-to="JSON.stringify(to)"><slot /></a>',
        },
        ElRow: { template: '<div class="el-row"><slot /></div>' },
        ElCol: { template: '<div class="el-col"><slot /></div>' },
        ElSelect: {
          props: ["modelValue"],
          emits: ["update:modelValue"],
          template: '<select class="select-stub" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
        },
        ElOption: {
          props: ["label", "value"],
          template: '<option :value="value">{{ label }}</option>',
        },
        ElRadioGroup: {
          props: ["modelValue"],
          emits: ["update:modelValue"],
          template: '<div class="radio-group-stub"><slot /></div>',
        },
        ElRadioButton: {
          props: ["value"],
          template: '<button class="radio-button-stub"><slot /></button>',
        },
        RiskDetail: drawerStub("risk-detail-stub", "rKey"),
        AvoidanceDetail: drawerStub("avoidance-detail-stub", "aKey"),
        AttackToolDetail: drawerStub("attack-tool-detail-stub", "atKey"),
        ThreatActorDetail: drawerStub("threat-actor-detail-stub", "taKey"),
        TermDetail: drawerStub("term-detail-stub", "tKey"),
      },
    },
  });
};

describe("HomeView", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    route.name = "home";
    route.params = {};
    locale.value = "cn";
  });

  it("渲染首页统计与默认业务场景风险入口", async () => {
    const wrapper = await mountHomeView();

    expect(wrapper.text()).toContain("BREAK.title");
    expect(wrapper.text()).toContain("流程自动化");
    expect(wrapper.findAll(".stat-card")).toHaveLength(6);
    expect(wrapper.find(".risk-detail-stub").exists()).toBe(false);
  });

  it("风险详情路由打开抽屉，关闭后回到首页", async () => {
    route.name = "riskDetail";
    route.params = { rKey: "R0001" };
    const wrapper = await mountHomeView();

    expect(wrapper.find(".risk-detail-stub").text()).toContain("R0001");

    await wrapper.find(".risk-detail-stub .close-drawer").trigger("click");

    expect(push).toHaveBeenCalledWith({ name: "home" });
  });

  it("业务场景风险详情关闭后回到对应业务场景", async () => {
    route.name = "businessSceneRiskDetail";
    route.params = { bsKey: "BS01", rKey: "R0001" };
    const wrapper = await mountHomeView();

    expect(wrapper.find(".risk-detail-stub").text()).toContain("R0001");

    await wrapper.find(".risk-detail-stub .close-drawer").trigger("click");

    expect(push).toHaveBeenCalledWith({
      name: "businessScene",
      params: { bsKey: "BS01" },
    });
  });

  it("非法业务场景和非法风险详情路由会替换回首页", async () => {
    route.name = "businessScene";
    route.params = { bsKey: "UNKNOWN" };
    await mountHomeView();

    expect(replace).toHaveBeenCalledWith({ name: "home" });

    vi.clearAllMocks();
    route.name = "riskDetail";
    route.params = { rKey: "R9999" };
    await mountHomeView();

    expect(replace).toHaveBeenCalledWith({ name: "home" });
  });

  it("异步详情路由仅在实体存在时打开对应抽屉", async () => {
    route.name = "avoidanceDetail";
    route.params = { aKey: "A0001" };
    const wrapper = await mountHomeView();
    await vi.dynamicImportSettled();
    await nextTick();

    expect(wrapper.find(".avoidance-detail-stub").text()).toContain("A0001");

    route.name = "termDetail";
    route.params = { tKey: "T9999" };
    await vi.dynamicImportSettled();
    await nextTick();

    expect(replace).toHaveBeenCalledWith({ name: "home" });
  });
});
