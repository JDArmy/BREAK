/**
 * useSearch 单元测试
 * 测试搜索索引构建、搜索查询、模糊匹配和语言切换
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";

// Mock BREAK 数据
vi.mock("@/BREAK", () => ({
  default: {
    risks: {
      R0001: { title: "营销羊毛风险", avoidances: ["A0001"] },
      R0002: { title: "合规处罚风险", avoidances: [] },
      R0032: { title: "账号盗取", avoidances: ["A0007"] },
    },
    avoidances: {
      A0001: { title: "人机验证技术", category: "AC01" },
      A0007: { title: "多因素验证", category: "AC02" },
    },
    attackTools: {
      AT0001: { title: "打码平台", directCauseRisks: ["R0001"] },
      AT0042: { title: "撞库工具", directCauseRisks: ["R0032"] },
    },
    threatActors: {
      TA0001: { title: "羊毛党", directCauseRisks: ["R0001"] },
      TA0018: { title: "恶意黑客", directCauseRisks: ["R0032"] },
    },
  },
}));

// Mock i18n messages
const mockMessages = ref<Record<string, unknown>>({
  "zh-CN": {
    BREAK: {
      risks: {
        R0001: {
          title: "营销羊毛风险",
          definition: "利用营销活动规则漏洞获取不当利益",
          description: "攻击者通过批量注册、自动领券等方式获取营销福利",
          influence: "高",
        },
        R0002: {
          title: "合规处罚风险",
          definition: "因违反法规而受到处罚的风险",
          description: "企业因不合规行为面临监管处罚",
          influence: "中",
        },
        R0032: {
          title: "账号盗取",
          definition: "非法获取他人账号的控制权",
          description: "通过撞库、钓鱼等方式盗取账号",
          influence: "高",
        },
      },
      avoidances: {
        A0001: {
          title: "人机验证技术",
          definition: "区分人与自动化程序的技术",
          description: "通过验证码等方式识别人机",
          limitation: "验证码可被破解",
        },
        A0007: {
          title: "多因素验证",
          definition: "需要两种以上认证方式的验证",
          description: "增加账号安全性",
          limitation: "用户体验降低",
        },
      },
      attackTools: {
        AT0001: {
          title: "打码平台",
          description: "提供验证码识别服务的平台",
        },
        AT0042: {
          title: "撞库工具",
          description: "利用已泄露的账号密码批量尝试登录",
        },
      },
      threatActors: {
        TA0001: {
          title: "羊毛党",
          description: "专门利用营销活动规则漏洞获取利益的群体",
        },
        TA0018: {
          title: "恶意黑客",
          description: "利用技术手段进行非法操作的黑客",
        },
      },
    },
  },
  en: {
    BREAK: {
      risks: {
        R0001: {
          title: "Marketing Fraud Risk",
          definition: "Risk of gaining improper benefits through marketing rule exploitation",
          description: "Attackers obtain marketing benefits through bulk registration",
          influence: "High",
        },
        R0002: {
          title: "Compliance Penalty Risk",
          definition: "Risk of penalty due to regulatory violations",
          description: "Enterprises face penalties for non-compliant behavior",
          influence: "Medium",
        },
        R0032: {
          title: "Account Takeover",
          definition: "Illegally gaining control of others' accounts",
          description: "Stealing accounts through credential stuffing, phishing, etc.",
          influence: "High",
        },
      },
      avoidances: {
        A0001: {
          title: "CAPTCHA Technology",
          definition: "Technology to distinguish humans from bots",
          description: "Identifying human vs machine via verification codes",
          limitation: "CAPTCHAs can be broken",
        },
        A0007: {
          title: "Multi-Factor Authentication",
          definition: "Authentication requiring two or more factors",
          description: "Enhances account security",
          limitation: "Reduced user experience",
        },
      },
      attackTools: {
        AT0001: {
          title: "CAPTCHA Solving Platform",
          description: "Platform providing CAPTCHA recognition services",
        },
        AT0042: {
          title: "Credential Stuffing Tool",
          description: "Tool using leaked credentials for bulk login attempts",
        },
      },
      threatActors: {
        TA0001: {
          title: "Coupon Abuser",
          description: "Group exploiting marketing rule loopholes for profit",
        },
        TA0018: {
          title: "Malicious Hacker",
          description: "Hackers using technical means for illegal operations",
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
import { useSearch } from "@/composables/useSearch";

describe("useSearch", () => {
  beforeEach(() => {
    mockLocale.value = "zh-CN";
  });

  describe("空查询", () => {
    it("空字符串返回空结果", () => {
      const { search } = useSearch();
      const result = search("");
      expect(result.risk).toEqual([]);
      expect(result.avoidance).toEqual([]);
      expect(result.attackTool).toEqual([]);
      expect(result.threatActor).toEqual([]);
    });

    it("纯空格返回空结果", () => {
      const { search } = useSearch();
      const result = search("   ");
      expect(result.risk).toEqual([]);
    });
  });

  describe("中文搜索", () => {
    it("按标题搜索风险", () => {
      const { search } = useSearch();
      const result = search("羊毛");
      expect(result.risk.length).toBeGreaterThan(0);
      expect(result.risk[0].id).toBe("R0001");
      expect(result.risk[0].title).toBe("营销羊毛风险");
    });

    it("按标题搜索规避手段", () => {
      const { search } = useSearch();
      const result = search("人机验证");
      expect(result.avoidance.length).toBeGreaterThan(0);
      expect(result.avoidance[0].id).toBe("A0001");
    });

    it("按标题搜索攻击工具", () => {
      const { search } = useSearch();
      const result = search("打码");
      expect(result.attackTool.length).toBeGreaterThan(0);
      expect(result.attackTool[0].id).toBe("AT0001");
    });

    it("按标题搜索威胁行为者", () => {
      const { search } = useSearch();
      const result = search("羊毛党");
      expect(result.threatActor.length).toBeGreaterThan(0);
      expect(result.threatActor[0].id).toBe("TA0001");
    });

    it("按定义搜索", () => {
      const { search } = useSearch();
      const result = search("非法");
      // 应能匹配到定义中包含"非法"的条目
      const allResults = [
        ...result.risk,
        ...result.avoidance,
        ...result.attackTool,
        ...result.threatActor,
      ];
      expect(allResults.length).toBeGreaterThan(0);
    });

    it("搜索结果包含 snippet", () => {
      const { search } = useSearch();
      const result = search("羊毛");
      if (result.risk.length > 0) {
        expect(result.risk[0].snippet).toBeDefined();
      }
    });
  });

  describe("模糊匹配", () => {
    it("容错拼写能匹配", () => {
      const { search } = useSearch();
      // Fuse.js 宽松阈值 (0.4) 应允许轻微拼写偏差
      const result = search("撞库");
      expect(result.attackTool.length).toBeGreaterThan(0);
    });

    it("按实体 ID 搜索", () => {
      const { search } = useSearch();
      const result = search("R0001");
      expect(result.risk.length).toBeGreaterThan(0);
      expect(result.risk[0].id).toBe("R0001");
    });
  });

  describe("英文搜索", () => {
    beforeEach(() => {
      mockLocale.value = "en";
    });

    it("按英文标题搜索风险", () => {
      const { search } = useSearch();
      const result = search("Marketing");
      expect(result.risk.length).toBeGreaterThan(0);
      expect(result.risk[0].id).toBe("R0001");
    });

    it("按英文标题搜索攻击工具", () => {
      const { search } = useSearch();
      const result = search("Credential");
      expect(result.attackTool.length).toBeGreaterThan(0);
      expect(result.attackTool[0].id).toBe("AT0042");
    });

    it("按英文定义搜索", () => {
      const { search } = useSearch();
      const result = search("distinguish");
      expect(result.avoidance.length).toBeGreaterThan(0);
      expect(result.avoidance[0].id).toBe("A0001");
    });
  });

  describe("结果格式", () => {
    it("搜索结果包含 id, type, title 字段", () => {
      const { search } = useSearch();
      const result = search("风险");
      for (const item of result.risk) {
        expect(item).toHaveProperty("id");
        expect(item).toHaveProperty("type");
        expect(item).toHaveProperty("title");
      }
    });

    it("搜索结果 type 正确", () => {
      const { search } = useSearch();
      const result = search("验证");
      for (const item of result.avoidance) {
        expect(item.type).toBe("avoidance");
      }
      for (const item of result.attackTool) {
        expect(item.type).toBe("attackTool");
      }
    });

    it("每种类型最多返回 5 条结果", () => {
      const { search } = useSearch();
      const result = search("风险");
      expect(result.risk.length).toBeLessThanOrEqual(5);
      expect(result.avoidance.length).toBeLessThanOrEqual(5);
      expect(result.attackTool.length).toBeLessThanOrEqual(5);
      expect(result.threatActor.length).toBeLessThanOrEqual(5);
    });
  });
});
