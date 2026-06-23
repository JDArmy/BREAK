import { beforeEach, describe, expect, it, vi } from "vitest";

describe("useCases", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.doUnmock("vue");
    vi.doUnmock("vue-i18n");
    vi.doUnmock("@/BREAK/cases");
    vi.doUnmock("@/i18n");
  });

  it("多次调用 useCases 只注册一次 locale watch", async () => {
    const vue = await vi.importActual<typeof import("vue")>("vue");
    const locale = vue.ref("zh-CN");
    const watchMock = vi.fn(vue.watch);

    vi.doMock("vue", () => ({
      ...vue,
      watch: watchMock,
    }));
    vi.doMock("vue-i18n", () => ({
      useI18n: () => ({ locale }),
    }));
    vi.doMock("@/BREAK/cases", () => ({
      loadCases: vi.fn(async () => ({})),
    }));
    vi.doMock("@/i18n", () => ({
      mergeWithStructure: vi.fn((source) => source),
    }));

    const { useCases } = await import("@/composables/useCases");

    useCases();
    useCases();
    useCases();

    expect(watchMock).toHaveBeenCalledTimes(1);
  });

  it("ensureCases 加载后通过替换 cases ref 触发下游浅监听", async () => {
    const vue = await vi.importActual<typeof import("vue")>("vue");
    const locale = vue.ref("zh-CN");
    const loadedCases = {
      C0001: {
        title: "测试案例",
        keywords: ["测试"],
        summary: "测试摘要",
        category: "news_report",
        relatedRisks: ["R0001"],
        references: [{ title: "来源", link: "https://example.com" }],
      },
    };

    vi.doMock("vue-i18n", () => ({
      useI18n: () => ({ locale }),
    }));
    vi.doMock("@/BREAK/cases", () => ({
      loadCases: vi.fn(async () => loadedCases),
    }));
    vi.doMock("@/i18n", () => ({
      mergeWithStructure: vi.fn((source) => source),
    }));

    const { useCases } = await import("@/composables/useCases");
    const { cases, ensureCases } = useCases();
    const originalCases = cases.value;

    await ensureCases();

    expect(cases.value).toEqual(loadedCases);
    expect(cases.value).not.toBe(originalCases);
  });
});
