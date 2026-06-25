import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, nextTick } from "vue";

const mocks = vi.hoisted(() => ({
  route: {
    name: "home" as string | undefined,
    params: {} as Record<string, unknown>,
  },
  router: {
    push: vi.fn(),
    replace: vi.fn(),
  },
}));

vi.mock("vue-router", () => ({
  useRoute: () => mocks.route,
  useRouter: () => mocks.router,
}));

const flush = async () => {
  await nextTick();
  await Promise.resolve();
  await nextTick();
};

describe("useDrawerRoute", () => {
  beforeEach(() => {
    mocks.route.name = "home";
    mocks.route.params = {};
    mocks.router.push.mockClear();
    mocks.router.replace.mockClear();
  });

  const mountHost = async (
    options: Parameters<typeof import("@/composables/useDrawerRoute").useDrawerRoute>[0],
  ) => {
    const { useDrawerRoute } = await import("@/composables/useDrawerRoute");
    let state!: ReturnType<typeof useDrawerRoute>;
    const Host = defineComponent({
      setup() {
        state = useDrawerRoute(options);
        return () => null;
      },
    });
    const wrapper = mount(Host);
    await flush();
    return { state, wrapper };
  };

  it("匹配详情路由时打开抽屉并记录实体 key", async () => {
    mocks.route.name = "riskDetail";
    mocks.route.params = { rKey: "R0001" };

    const { state } = await mountHost({
      routeNames: ["riskDetail"],
      routeParam: "rKey",
    });

    expect(state.drawerVisible.value).toBe(true);
    expect(state.entityKey.value).toBe("R0001");
    expect(mocks.router.replace).not.toHaveBeenCalled();
  });

  it("缺少字符串参数或验证失败时跳转首页", async () => {
    mocks.route.name = "riskDetail";
    mocks.route.params = { rKey: ["R0001"] };

    await mountHost({
      routeNames: ["riskDetail"],
      routeParam: "rKey",
    });

    expect(mocks.router.replace).toHaveBeenCalledWith({ name: "home" });

    mocks.router.replace.mockClear();
    mocks.route.params = { rKey: "R9999" };
    await mountHost({
      routeNames: ["riskDetail"],
      routeParam: "rKey",
      validateKey: vi.fn(async () => false),
    });

    expect(mocks.router.replace).toHaveBeenCalledWith({ name: "home" });
  });

  it("异步验证期间路由已变化时忽略旧结果", async () => {
    mocks.route.name = "riskDetail";
    mocks.route.params = { rKey: "R0001" };
    let resolveValidation!: (value: boolean) => void;
    const validateKey = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          resolveValidation = resolve;
        }),
    );
    const { state } = await mountHost({
      routeNames: ["riskDetail"],
      routeParam: "rKey",
      validateKey,
    });

    mocks.route.name = "home";
    mocks.route.params = {};
    resolveValidation(true);
    await flush();

    expect(state.drawerVisible.value).toBe(false);
    expect(state.entityKey.value).toBe("");
    expect(mocks.router.replace).not.toHaveBeenCalled();
  });

  it("非详情路由关闭抽屉，close 支持默认、自定义路由和自定义回调", async () => {
    const { state } = await mountHost({
      routeNames: ["riskDetail"],
      routeParam: "rKey",
    });

    expect(state.drawerVisible.value).toBe(false);

    state.close();
    expect(mocks.router.push).toHaveBeenCalledWith({ name: "home" });

    const customClose = vi.fn();
    const custom = await mountHost({
      routeNames: ["riskDetail"],
      routeParam: "rKey",
      closeRouteName: "risks",
    });
    custom.state.close();
    expect(mocks.router.push).toHaveBeenCalledWith({ name: "risks" });

    const callback = await mountHost({
      routeNames: ["riskDetail"],
      routeParam: "rKey",
      onClose: customClose,
    });
    callback.state.close();
    expect(customClose).toHaveBeenCalledTimes(1);
  });
});
