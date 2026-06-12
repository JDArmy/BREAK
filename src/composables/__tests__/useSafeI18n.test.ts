/**
 * useSafeI18n 单元测试
 * 测试 safeT() 函数的路径解析和管道符绕过能力
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";

// Mock vue-i18n
const mockMessages = ref<Record<string, unknown>>({
  "zh-CN": {
    BREAK: {
      risks: {
        R0001: {
          title: "营销羊毛风险",
          definition: "利用营销活动规则漏洞获取不当利益的风险",
          references: [
            { title: "管道符测试|后半部分", link: "https://example.com" },
            { title: "正常标题", link: "https://example.com/2" },
          ],
        },
        R0002: {
          title: "合规处罚风险",
        },
      },
      avoidances: {
        A0001: {
          title: "人机验证技术",
        },
      },
    },
  },
  en: {
    BREAK: {
      risks: {
        R0001: {
          title: "Marketing Fraud Risk",
        },
      },
    },
  },
});

const mockLocale = ref("zh-CN");

vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    locale: mockLocale,
    messages: mockMessages,
  }),
}));

// 导入被测模块（在 mock 之后）
import { useSafeI18n } from "@/composables/useSafeI18n";

describe("useSafeI18n", () => {
  beforeEach(() => {
    mockLocale.value = "zh-CN";
  });

  describe("safeT 路径解析", () => {
    it("解析简单嵌套路径", () => {
      const { safeT } = useSafeI18n();
      expect(safeT("BREAK.risks.R0001.title")).toBe("营销羊毛风险");
    });

    it("解析深层嵌套路径", () => {
      const { safeT } = useSafeI18n();
      expect(safeT("BREAK.risks.R0001.definition")).toBe(
        "利用营销活动规则漏洞获取不当利益的风险"
      );
    });

    it("不存在的路径返回空字符串", () => {
      const { safeT } = useSafeI18n();
      expect(safeT("BREAK.risks.R9999.title")).toBe("");
    });

    it("中间路径不存在的返回空字符串", () => {
      const { safeT } = useSafeI18n();
      expect(safeT("BREAK.nonexistent.R0001.title")).toBe("");
    });

    it("空路径返回空字符串", () => {
      const { safeT } = useSafeI18n();
      expect(safeT("")).toBe("");
    });
  });

  describe("safeT 数组索引处理", () => {
    it("解析 references[0].title 格式", () => {
      const { safeT } = useSafeI18n();
      expect(safeT("BREAK.risks.R0001.references[0].title")).toBe(
        "管道符测试|后半部分"
      );
    });

    it("解析 references[1].title 格式", () => {
      const { safeT } = useSafeI18n();
      expect(safeT("BREAK.risks.R0001.references[1].title")).toBe("正常标题");
    });

    it("数组越界索引返回空字符串", () => {
      const { safeT } = useSafeI18n();
      expect(safeT("BREAK.risks.R0001.references[99].title")).toBe("");
    });
  });

  describe("safeT 管道符绕过", () => {
    it("包含 | 的标题不被截断", () => {
      const { safeT } = useSafeI18n();
      const result = safeT("BREAK.risks.R0001.references[0].title");
      // safeT 应返回完整标题，不会被 | 截断
      expect(result).toBe("管道符测试|后半部分");
      expect(result).toContain("|");
    });
  });

  describe("safeT 语言切换", () => {
    it("切换 locale 后返回对应语言", () => {
      const { safeT } = useSafeI18n();
      mockLocale.value = "en";
      expect(safeT("BREAK.risks.R0001.title")).toBe("Marketing Fraud Risk");
    });

    it("英文中不存在的 key 返回空字符串", () => {
      const { safeT } = useSafeI18n();
      mockLocale.value = "en";
      expect(safeT("BREAK.risks.R0002.title")).toBe("");
    });
  });
});
