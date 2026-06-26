import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  inferEntityType,
  entityI18nPrefix,
  ENTITY_ID_PATTERN,
} from "@/utils/entityRoute";

describe("entityRoute", () => {
  describe("inferEntityType", () => {
    it("识别 Risk 前缀", () => {
      expect(inferEntityType("R0001")).toBe("risk");
      expect(inferEntityType("R0001-001")).toBe("risk");
    });

    it("识别 Avoidance 前缀", () => {
      expect(inferEntityType("A0001")).toBe("avoidance");
      expect(inferEntityType("A0001-001")).toBe("avoidance");
    });

    it("识别 AttackTool 前缀（AT 优先于 A）", () => {
      expect(inferEntityType("AT0001")).toBe("attackTool");
      expect(inferEntityType("AT0001-001")).toBe("attackTool");
    });

    it("识别 ThreatActor 前缀（TA 优先于 T）", () => {
      expect(inferEntityType("TA0001")).toBe("threatActor");
      expect(inferEntityType("TA0001-001")).toBe("threatActor");
    });

    it("识别 Term 前缀", () => {
      expect(inferEntityType("T0001")).toBe("term");
    });

    it("识别 Case 前缀", () => {
      expect(inferEntityType("C0001")).toBe("case");
    });

    it("未知前缀返回 null", () => {
      expect(inferEntityType("X0001")).toBeNull();
      expect(inferEntityType("")).toBeNull();
      expect(inferEntityType("BS01")).toBeNull();
    });
  });

  describe("entityI18nPrefix", () => {
    it("生成正确的 i18n 前缀", () => {
      expect(entityI18nPrefix("R0001", "risk")).toBe("BREAK.risks.R0001");
      expect(entityI18nPrefix("A0001", "avoidance")).toBe("BREAK.avoidances.A0001");
      expect(entityI18nPrefix("AT0001", "attackTool")).toBe("BREAK.attackTools.AT0001");
      expect(entityI18nPrefix("TA0001", "threatActor")).toBe("BREAK.threatActors.TA0001");
      expect(entityI18nPrefix("T0001", "term")).toBe("BREAK.terms.T0001");
      expect(entityI18nPrefix("C0001", "case")).toBe("BREAK.cases.C0001");
    });
  });

  describe("ENTITY_ID_PATTERN", () => {
    it("匹配标准实体 ID", () => {
      const text = "参见 R0001 和 A0002 获取详情";
      const matches = [...text.matchAll(new RegExp(ENTITY_ID_PATTERN.source, "g"))];
      expect(matches.map((m) => m[1])).toEqual(["R0001", "A0002"]);
    });

    it("匹配子编号（如 R0001-001）", () => {
      const text = "风险 R0001-001 是子风险";
      const matches = [...text.matchAll(new RegExp(ENTITY_ID_PATTERN.source, "g"))];
      expect(matches.map((m) => m[1])).toEqual(["R0001-001"]);
    });

    it("匹配所有类型前缀", () => {
      const text = "R0001 A0002 AT0003 TA0004 T0005 C0006";
      const matches = [...text.matchAll(new RegExp(ENTITY_ID_PATTERN.source, "g"))];
      expect(matches.map((m) => m[1])).toEqual([
        "R0001",
        "A0002",
        "AT0003",
        "TA0004",
        "T0005",
        "C0006",
      ]);
    });

    it("不匹配非标准 ID（位数不对）", () => {
      const text = "R00001 A01 T00";
      const matches = [...text.matchAll(new RegExp(ENTITY_ID_PATTERN.source, "g"))];
      expect(matches).toHaveLength(0);
    });
  });
});

describe("useEntityResolver", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.doUnmock("vue-i18n");
    vi.doUnmock("vue-router");
    vi.doUnmock("@/composables/useCases");
  });

  it("解析存在的 Risk 实体", async () => {
    const vue = await vi.importActual<typeof import("vue")>("vue");

    vi.doMock("vue-i18n", () => ({
      useI18n: () => ({
        t: (key: string) => {
          const map: Record<string, string> = {
            "relationType.risk": "风险",
            "BREAK.risks.R0001.title": "测试风险",
            "BREAK.risks.R0001.definition": "这是定义",
            "BREAK.risks.R0001.description": "这是描述",
          };
          return map[key] ?? key;
        },
        te: (key: string) => {
          const keys = [
            "relationType.risk",
            "BREAK.risks.R0001.title",
            "BREAK.risks.R0001.definition",
            "BREAK.risks.R0001.description",
          ];
          return keys.includes(key);
        },
      }),
    }));

    vi.doMock("vue-router", () => ({
      useRouter: () => ({
        resolve: (route: { name: string; params: Record<string, string> }) => ({
          href: `#/knowledges/risk/detail/${route.params.rKey}`,
        }),
      }),
    }));

    vi.doMock("@/composables/useCases", () => ({
      useCases: () => ({
        cases: vue.ref(null),
        loaded: vue.ref(false),
        ensureCases: vi.fn(),
      }),
    }));

    const { useEntityResolver } = await import("@/composables/useEntityResolver");
    const { resolve } = useEntityResolver();

    const result = resolve("R0001");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("R0001");
    expect(result!.type).toBe("risk");
    expect(result!.typeLabel).toBe("风险");
    expect(result!.title).toBe("测试风险");
    expect(result!.definition).toBe("这是定义");
    expect(result!.description).toBe("这是描述");
    expect(result!.exists).toBe(true);
    expect(result!.href).toContain("R0001");
  });

  it("不存在的实体返回 exists: false", async () => {
    const vue = await vi.importActual<typeof import("vue")>("vue");

    vi.doMock("vue-i18n", () => ({
      useI18n: () => ({
        t: (key: string) => key,
        te: () => false,
      }),
    }));

    vi.doMock("vue-router", () => ({
      useRouter: () => ({
        resolve: () => ({ href: "#/knowledges/risk/detail/R9999" }),
      }),
    }));

    vi.doMock("@/composables/useCases", () => ({
      useCases: () => ({
        cases: vue.ref(null),
        loaded: vue.ref(false),
        ensureCases: vi.fn(),
      }),
    }));

    const { useEntityResolver } = await import("@/composables/useEntityResolver");
    const { resolve } = useEntityResolver();

    const result = resolve("R9999");
    expect(result).not.toBeNull();
    expect(result!.exists).toBe(false);
    expect(result!.definition).toBeNull();
  });

  it("未知前缀返回 null", async () => {
    const vue = await vi.importActual<typeof import("vue")>("vue");

    vi.doMock("vue-i18n", () => ({
      useI18n: () => ({
        t: (key: string) => key,
        te: () => false,
      }),
    }));

    vi.doMock("vue-router", () => ({
      useRouter: () => ({
        resolve: () => ({ href: "" }),
      }),
    }));

    vi.doMock("@/composables/useCases", () => ({
      useCases: () => ({
        cases: vue.ref(null),
        loaded: vue.ref(false),
        ensureCases: vi.fn(),
      }),
    }));

    const { useEntityResolver } = await import("@/composables/useEntityResolver");
    const { resolve } = useEntityResolver();

    expect(resolve("X0001")).toBeNull();
  });

  it("Case 类型触发懒加载", async () => {
    const vue = await vi.importActual<typeof import("vue")>("vue");
    const ensureMock = vi.fn();

    vi.doMock("vue-i18n", () => ({
      useI18n: () => ({
        t: (key: string) => key,
        te: () => false,
      }),
    }));

    vi.doMock("vue-router", () => ({
      useRouter: () => ({
        resolve: () => ({ href: "#/knowledges/case/detail/C0001" }),
      }),
    }));

    vi.doMock("@/composables/useCases", () => ({
      useCases: () => ({
        cases: vue.ref(null),
        loaded: vue.ref(false),
        ensureCases: ensureMock,
      }),
    }));

    const { useEntityResolver } = await import("@/composables/useEntityResolver");
    const { resolve } = useEntityResolver();

    resolve("C0001");
    expect(ensureMock).toHaveBeenCalled();
  });

  it("entityExists 正确判断各类型实体", async () => {
    const vue = await vi.importActual<typeof import("vue")>("vue");

    // entityExists 现在通过 te() 判断非 case 类型的存在性
    const existingKeys = new Set([
      "BREAK.risks.R0001.title",
      "BREAK.avoidances.A0001.title",
      "BREAK.attackTools.AT0001.title",
      "BREAK.threatActors.TA0001.title",
      "BREAK.terms.T0001.title",
    ]);

    vi.doMock("vue-i18n", () => ({
      useI18n: () => ({
        t: (key: string) => key,
        te: (key: string) => existingKeys.has(key),
      }),
    }));

    vi.doMock("vue-router", () => ({
      useRouter: () => ({
        resolve: () => ({ href: "" }),
      }),
    }));

    vi.doMock("@/composables/useCases", () => ({
      useCases: () => ({
        cases: vue.ref({ C0001: { title: "案例" } }),
        loaded: vue.ref(true),
        ensureCases: vi.fn(),
      }),
    }));

    const { useEntityResolver } = await import("@/composables/useEntityResolver");
    const { entityExists } = useEntityResolver();

    expect(entityExists("R0001", "risk")).toBe(true);
    expect(entityExists("R9999", "risk")).toBe(false);
    expect(entityExists("A0001", "avoidance")).toBe(true);
    expect(entityExists("AT0001", "attackTool")).toBe(true);
    expect(entityExists("TA0001", "threatActor")).toBe(true);
    expect(entityExists("T0001", "term")).toBe(true);
    expect(entityExists("C0001", "case")).toBe(true);
  });

  it("resolve 截断长描述", async () => {
    const vue = await vi.importActual<typeof import("vue")>("vue");
    const longText = "这".repeat(200);

    vi.doMock("vue-i18n", () => ({
      useI18n: () => ({
        t: (key: string) => {
          if (key === "BREAK.risks.R0001.definition") return longText;
          if (key === "BREAK.risks.R0001.title") return "标题";
          if (key === "relationType.risk") return "风险";
          return key;
        },
        te: (key: string) => {
          return [
            "relationType.risk",
            "BREAK.risks.R0001.title",
            "BREAK.risks.R0001.definition",
          ].includes(key);
        },
      }),
    }));

    vi.doMock("vue-router", () => ({
      useRouter: () => ({
        resolve: () => ({ href: "#/test" }),
      }),
    }));

    vi.doMock("@/composables/useCases", () => ({
      useCases: () => ({
        cases: vue.ref(null),
        loaded: vue.ref(false),
        ensureCases: vi.fn(),
      }),
    }));

    const { useEntityResolver } = await import("@/composables/useEntityResolver");
    const { resolve } = useEntityResolver();

    const result = resolve("R0001");
    expect(result!.definition!.length).toBeLessThanOrEqual(121); // 120 + "…"
    expect(result!.definition!.endsWith("…")).toBe(true);
  });
});
