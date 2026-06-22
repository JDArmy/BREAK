import { mount } from "@vue/test-utils";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { nextTick } from "vue";
import KnowledgeSplitView from "@/components/KnowledgeSplitView.vue";

const mocks = vi.hoisted(() => {
  const isMobile = { value: false, __v_isRef: true };
  const route = {
    hash: "",
    params: {} as Record<string, string>,
    query: {} as Record<string, string>,
    name: "risks",
  };
  return {
    isMobile,
    route,
    router: {
      push: vi.fn(),
      replace: vi.fn(),
    },
  };
});

vi.mock("element-plus/es/components/button/style/css", () => ({}));

vi.mock("@/composables/useBreakpoints", () => ({
  useBreakpoints: () => ({ isMobile: mocks.isMobile }),
}));

vi.mock("vue-router", () => ({
  useRoute: () => mocks.route,
  useRouter: () => mocks.router,
}));

const items = [
  { id: "R0001", title: "流程自动化", subtitle: "自动化请求", searchText: "automation" },
  { id: "R0002", title: "账号盗用", subtitle: "Account takeover", searchText: "ato" },
];

const mountView = (selectedKey = "R0001") =>
  mount(KnowledgeSplitView, {
    props: {
      title: "风险",
      routeName: "risks",
      detailRouteName: "riskDetail",
      items,
      selectedKey,
      searchPlaceholder: "搜索风险",
    },
    slots: {
      default: ({ selectedKey: key }: { selectedKey: string }) => `详情 ${key}`,
    },
    global: {
      mocks: {
        $t: (key: string) => key,
      },
      stubs: {
        ElInput: {
          props: ["modelValue", "placeholder"],
          emits: ["update:modelValue"],
          template:
            '<input class="el-input-stub" :placeholder="placeholder" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
        ElButton: {
          emits: ["click"],
          template: '<button type="button" @click="$emit(\'click\', $event)"><slot /></button>',
        },
        ElIcon: { template: "<span><slot /></span>" },
        ArrowLeft: { template: "<span />" },
      },
    },
  });

describe("KnowledgeSplitView", () => {
  beforeEach(() => {
    mocks.isMobile.value = false;
    mocks.route.hash = "";
    mocks.route.params = {};
    mocks.route.query = {};
    mocks.route.name = "risks";
    mocks.router.push.mockClear();
    mocks.router.replace.mockClear();
  });

  it("按查询词过滤列表并保留详情插槽", async () => {
    const wrapper = mountView();

    await wrapper.find(".el-input-stub").setValue("ato");

    expect(wrapper.text()).toContain("账号盗用");
    expect(wrapper.text()).not.toContain("流程自动化");
    expect(wrapper.text()).toContain("详情 R0001");
  });

  it("点击桌面列表项时发出选择事件并更新 hash", async () => {
    const wrapper = mountView();

    await wrapper.find('[data-knowledge-key="R0002"]').trigger("click");

    expect(wrapper.emitted("select")?.[0]).toEqual(["R0002"]);
    expect(mocks.router.replace).toHaveBeenCalledWith({
      name: "risks",
      hash: "#R0002",
    });
  });

  it("移动端点击列表项时进入详情路由", async () => {
    mocks.isMobile.value = true;
    const wrapper = mountView();
    await nextTick();

    await wrapper.find('[data-knowledge-key="R0002"]').trigger("click");

    expect(wrapper.emitted("select")?.[0]).toEqual(["R0002"]);
    expect(mocks.router.push).toHaveBeenCalledWith({
      name: "riskDetail",
      params: { rKey: "R0002" },
    });
  });
});
