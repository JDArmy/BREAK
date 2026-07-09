import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref, type Ref } from "vue";
import type { Component } from "vue";

const mocks = vi.hoisted(() => {
  const route = {
    name: "docs" as string,
    params: {} as Record<string, string>,
  };
  const router = {
    push: vi.fn(),
    replace: vi.fn(),
  };
  return { locale: undefined as unknown as Ref<string>, route, router };
});

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: mocks.locale,
  }),
}));

vi.mock("vue-router", () => ({
  useRoute: () => mocks.route,
  useRouter: () => mocks.router,
}));

const manifest = {
  "zh-CN": [
    { slug: "index", title: "快速上手", category: "入门", order: 1, summary: "中文首页", htmlPath: "docs/zh-CN/index.html" },
    { slug: "guide", title: "指南", category: "指南", order: 2, summary: "中文指南", htmlPath: "docs/zh-CN/guide.html" },
  ],
  en: [
    { slug: "index", title: "Getting Started", category: "Getting Started", order: 1, summary: "English index", htmlPath: "docs/en/index.html" },
    { slug: "guide", title: "Guide", category: "Guide", order: 2, summary: "English guide", htmlPath: "docs/en/guide.html" },
  ],
};

function okResponse(body: string) {
  return {
    ok: true,
    json: async () => JSON.parse(body),
    text: async () => body,
  } as Response;
}

function createFetchMock(overrides: Record<string, Response | Error> = {}) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const overrideKey = Object.keys(overrides).find((key) => url.includes(key));
    if (overrideKey) {
      const override = overrides[overrideKey];
      if (override instanceof Error) throw override;
      return override;
    }
    if (url.includes("data/docs-manifest.json")) {
      return okResponse(JSON.stringify(manifest));
    }
    if (url.includes("docs/zh-CN/index.html")) {
      return okResponse('<h1>快速上手</h1><a href="/docs/guide">指南</a>');
    }
    if (url.includes("docs/zh-CN/guide.html")) {
      return okResponse("<h1>指南</h1>");
    }
    if (url.includes("docs/en/index.html")) {
      return okResponse("<h1>Getting Started</h1>");
    }
    if (url.includes("docs/en/guide.html")) {
      return okResponse("<h1>Guide</h1>");
    }
    return { ok: false, status: 404, json: async () => ({}), text: async () => "" } as Response;
  });
}

async function mountDocsView() {
  const module = await import("@/views/DocsView.vue");
  const DocsView = module.default as Component;
  return mount(DocsView, {
    global: {
      stubs: {
        KnowledgeSplitView: {
          name: "KnowledgeSplitView",
          props: ["items", "selectedKey", "loading", "loadError"],
          emits: ["select", "retry"],
          template: `
            <section class="knowledge-split-stub">
              <button class="select-guide" type="button" @click="$emit('select', 'guide')">guide</button>
              <button class="retry" type="button" @click="$emit('retry')">retry</button>
              <slot />
            </section>
          `,
        },
      },
    },
  });
}

describe("DocsView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.locale = ref("zh-CN");
    mocks.route.name = "docs";
    mocks.route.params = {};
    vi.stubGlobal("fetch", createFetchMock());
    Object.defineProperty(window, "location", {
      value: new URL("http://localhost/#/docs"),
      configurable: true,
    });
  });

  it("加载 manifest 后只按需加载当前文档 HTML", async () => {
    const fetchMock = createFetchMock();
    vi.stubGlobal("fetch", fetchMock);
    const wrapper = await mountDocsView();
    await flushPromises();
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith("/data/docs-manifest.json");
    expect(fetchMock).toHaveBeenCalledWith("/docs/zh-CN/index.html");
    expect(fetchMock).not.toHaveBeenCalledWith("/docs/zh-CN/guide.html");
    expect(wrapper.text()).toContain("快速上手");
  });

  it("非法 slug 会回退到 index", async () => {
    mocks.route.name = "docs-detail";
    mocks.route.params = { slug: "missing" };

    await mountDocsView();
    await flushPromises();

    expect(mocks.router.replace).toHaveBeenCalledWith({
      name: "docs-detail",
      params: { slug: "index" },
    });
  });

  it("切换语言时保留当前 slug 并加载对应语言 HTML", async () => {
    mocks.route.name = "docs-detail";
    mocks.route.params = { slug: "guide" };
    const fetchMock = createFetchMock();
    vi.stubGlobal("fetch", fetchMock);

    const wrapper = await mountDocsView();
    await flushPromises();
    expect(wrapper.text()).toContain("指南");

    mocks.locale.value = "en";
    await flushPromises();
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith("/docs/en/guide.html");
    expect(wrapper.text()).toContain("Guide");
  });

  it("单篇 HTML 加载失败时保留目录并显示右侧错误态", async () => {
    const failed = { ok: false, status: 500, json: async () => ({}), text: async () => "" } as Response;
    vi.stubGlobal("fetch", createFetchMock({ "docs/zh-CN/index.html": failed }));

    const wrapper = await mountDocsView();
    await flushPromises();
    await flushPromises();

    const split = wrapper.findComponent({ name: "KnowledgeSplitView" });
    expect(split.props("loadError")).toBe(false);
    expect(split.props("items")).toHaveLength(2);
    expect(wrapper.find(".docs-detail-error").text()).toContain("error.dataLoadFailed");
  });

  it("正文 /docs 链接使用 router 跳转", async () => {
    const wrapper = await mountDocsView();
    await flushPromises();
    await flushPromises();

    const anchor = wrapper.find(".docs-body a").element;
    anchor.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));

    expect(mocks.router.push).toHaveBeenCalledWith({
      name: "docs-detail",
      params: { slug: "guide" },
      hash: "",
    });
  });
});
