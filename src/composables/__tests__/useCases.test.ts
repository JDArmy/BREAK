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

  it("ensureCases 并发调用时复用同一个中文案例加载 Promise", async () => {
    const vue = await vi.importActual<typeof import("vue")>("vue");
    const locale = vue.ref("zh-CN");
    const loadedCases = {
      C0002: {
        title: "并发案例",
        keywords: ["并发"],
        summary: "并发摘要",
        category: "news_report",
        relatedRisks: ["R0002"],
        references: [{ title: "来源", link: "https://example.com" }],
      },
    };
    let resolveLoad!: (cases: typeof loadedCases) => void;
    const loadCases = vi.fn(
      () =>
        new Promise<typeof loadedCases>((resolve) => {
          resolveLoad = resolve;
        }),
    );

    vi.doMock("vue-i18n", () => ({
      useI18n: () => ({ locale }),
    }));
    vi.doMock("@/BREAK/cases", () => ({
      loadCases,
    }));
    vi.doMock("@/i18n", () => ({
      mergeWithStructure: vi.fn((source) => source),
    }));

    const { useCases } = await import("@/composables/useCases");
    const { cases, ensureCases, loaded } = useCases();
    const first = ensureCases();
    const second = ensureCases();

    expect(loadCases).toHaveBeenCalledTimes(1);
    resolveLoad(loadedCases);
    await Promise.all([first, second]);

    expect(cases.value).toEqual(loadedCases);
    expect(loaded.value).toBe(true);
  });

  it("ensureCases 加载失败后清空缓存并允许下次重试", async () => {
    const vue = await vi.importActual<typeof import("vue")>("vue");
    const locale = vue.ref("zh-CN");
    const retryCases = {
      C0003: {
        title: "重试案例",
        keywords: ["重试"],
        summary: "重试摘要",
        category: "news_report",
        relatedRisks: ["R0003"],
        references: [{ title: "来源", link: "https://example.com" }],
      },
    };
    const loadCases = vi
      .fn()
      .mockRejectedValueOnce(new Error("首次加载失败"))
      .mockResolvedValueOnce(retryCases);

    vi.doMock("vue-i18n", () => ({
      useI18n: () => ({ locale }),
    }));
    vi.doMock("@/BREAK/cases", () => ({
      loadCases,
    }));
    vi.doMock("@/i18n", () => ({
      mergeWithStructure: vi.fn((source) => source),
    }));

    const { useCases } = await import("@/composables/useCases");
    const { cases, ensureCases, loaded } = useCases();

    await expect(ensureCases()).rejects.toThrow("首次加载失败");
    expect(loaded.value).toBe(false);

    await ensureCases();
    expect(loadCases).toHaveBeenCalledTimes(2);
    expect(cases.value).toEqual(retryCases);
    expect(loaded.value).toBe(true);
  });

  it("案例未加载时切换 locale 不触发案例同步", async () => {
    const vue = await vi.importActual<typeof import("vue")>("vue");
    const locale = vue.ref("zh-CN");
    const loadCases = vi.fn(async () => ({}));

    vi.doMock("vue-i18n", () => ({
      useI18n: () => ({ locale }),
    }));
    vi.doMock("@/BREAK/cases", () => ({
      loadCases,
    }));
    vi.doMock("@/i18n", () => ({
      mergeWithStructure: vi.fn((source) => source),
    }));

    const { useCases } = await import("@/composables/useCases");
    useCases();

    locale.value = "en";
    await vue.nextTick();
    await Promise.resolve();

    expect(loadCases).not.toHaveBeenCalled();
  });

  it("英文 locale 首次 ensureCases 后合并英文案例翻译", async () => {
    const vue = await vi.importActual<typeof import("vue")>("vue");
    const locale = vue.ref("en");
    const loadedCases = {
      C0001: {
        title: "中文案例",
        keywords: ["中文"],
        summary: "中文摘要",
        category: "news_report",
        relatedRisks: ["R0001"],
        references: [{ title: "中文来源", link: "https://example.com" }],
      },
    };
    const mergedCases = {
      C0001: {
        ...loadedCases.C0001,
        title: "English Case",
      },
    };
    const mergeWithStructure = vi.fn(() => mergedCases);

    vi.doMock("vue-i18n", () => ({
      useI18n: () => ({ locale }),
    }));
    vi.doMock("@/BREAK/cases", () => ({
      loadCases: vi.fn(async () => loadedCases),
    }));
    vi.doMock("@/i18n", () => ({
      mergeWithStructure,
    }));

    const { useCases } = await import("@/composables/useCases");
    const { cases, ensureCases, loaded } = useCases();

    await ensureCases();

    expect(loaded.value).toBe(true);
    expect(mergeWithStructure).toHaveBeenCalledWith(
      loadedCases,
      expect.objectContaining({
        C0001: expect.objectContaining({
          title: expect.any(String),
        }),
      }),
    );
    expect(cases.value).toEqual(mergedCases);
  });

  it("案例加载后切换 locale 会重新同步中英文案例数据", async () => {
    const vue = await vi.importActual<typeof import("vue")>("vue");
    const locale = vue.ref("zh-CN");
    let localeWatcher!: (newLocale: string) => Promise<void>;
    const loadedCases = {
      C0001: {
        title: "中文案例",
        keywords: ["中文"],
        summary: "中文摘要",
        category: "news_report",
        relatedRisks: ["R0001"],
        references: [{ title: "中文来源", link: "https://example.com" }],
      },
    };
    const mergedCases = {
      C0001: {
        ...loadedCases.C0001,
        title: "English Case",
      },
    };
    const mergeWithStructure = vi.fn(() => mergedCases);

    vi.doMock("vue", () => ({
      ...vue,
      watch: vi.fn((_source, callback) => {
        localeWatcher = callback as (newLocale: string) => Promise<void>;
      }),
    }));
    vi.doMock("vue-i18n", () => ({
      useI18n: () => ({ locale }),
    }));
    vi.doMock("@/BREAK/cases", () => ({
      loadCases: vi.fn(async () => loadedCases),
    }));
    vi.doMock("@/i18n", () => ({
      mergeWithStructure,
    }));

    const { useCases } = await import("@/composables/useCases");
    const { cases, ensureCases } = useCases();

    await ensureCases();
    expect(cases.value).toEqual(loadedCases);

    await localeWatcher("en");

    expect(cases.value).toEqual(mergedCases);

    await localeWatcher("zh-CN");

    expect(cases.value).toEqual(loadedCases);
  });
});
