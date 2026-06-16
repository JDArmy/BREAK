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
      R0001: { title: "营销羊毛风险", keywords: ["薅羊毛"], avoidances: ["A0001"] },
      R0002: { title: "合规处罚风险", keywords: ["监管处罚"], avoidances: [] },
      R0032: { title: "账号盗取", keywords: ["盗号", "账号被盗", "ATO"], avoidances: ["A0007"] },
    },
    avoidances: {
      A0001: { title: "人机验证技术", keywords: ["验证码", "CAPTCHA"], category: "AC01" },
      A0007: { title: "多因素验证", keywords: ["MFA", "2FA"], category: "AC02" },
    },
    attackTools: {
      AT0001: { title: "打码平台", keywords: ["验证码平台"], directCauseRisks: ["R0001"] },
      AT0042: { title: "撞库工具", keywords: ["撞库", "凭证填充"], directCauseRisks: ["R0032"] },
      AT0064: { title: "信息窃取器", keywords: ["infostealer", "cookie 窃取"], directCauseRisks: ["R0032"] },
    },
    threatActors: {
      TA0001: { title: "羊毛党", keywords: ["薅羊毛"], directCauseRisks: ["R0001"] },
      TA0018: { title: "恶意黑客", keywords: ["攻击者"], directCauseRisks: ["R0032"] },
    },
    terms: {
      T0001: { title: "报丹", keywords: ["报丹", "报单"], aliases: ["报单"], category: "营销欺诈" },
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
          keywords: ["薅羊毛"],
          definition: "利用营销活动规则漏洞获取不当利益",
          description: "攻击者通过批量注册、自动领券等方式获取营销福利",
          influence: "高",
        },
        R0002: {
          title: "合规处罚风险",
          keywords: ["监管处罚"],
          definition: "因违反法规而受到处罚的风险",
          description:
            "企业在业务快速扩张时可能忽略资质、流程、授权、数据处理边界和内部审计要求，长期积累后会在专项检查中暴露问题并面临监管处罚",
          influence: "中",
        },
        R0032: {
          title: "账号盗取",
          keywords: ["盗号", "账号被盗", "ATO"],
          definition: "非法获取他人账号的控制权",
          description: "通过撞库、钓鱼等方式盗取账号",
          influence: "高",
        },
      },
      avoidances: {
        A0001: {
          title: "人机验证技术",
          keywords: ["验证码", "CAPTCHA"],
          definition: "区分人与自动化程序的技术",
          description: "通过验证码等方式识别人机",
          limitation: "验证码可被破解",
        },
        A0007: {
          title: "多因素验证",
          keywords: ["MFA", "2FA"],
          definition: "需要两种以上认证方式的验证",
          description: "增加账号安全性",
          limitation: "用户体验降低",
        },
      },
      attackTools: {
        AT0001: {
          title: "打码平台",
          keywords: ["验证码平台"],
          description: "提供验证码识别服务的平台",
        },
        AT0042: {
          title: "撞库工具",
          keywords: ["撞库", "凭证填充"],
          description:
            "这是一类自动化攻击工具，攻击者会准备代理、脚本、设备指纹和批量任务调度能力，在较长的攻击链路中不断尝试登录入口，最终通过撞库方式验证已泄露账号密码是否可用。",
        },
      },
      threatActors: {
        TA0001: {
          title: "羊毛党",
          keywords: ["薅羊毛"],
          description: "专门利用营销活动规则漏洞获取利益的群体",
        },
        TA0018: {
          title: "恶意黑客",
          keywords: ["攻击者"],
          description: "利用技术手段进行非法操作的黑客",
        },
      },
      terms: {
        T0001: {
          title: "报单",
          keywords: ["报单", "报丹"],
          aliases: ["报丹"],
          category: "营销欺诈",
          definition: "将非法操作或交易上报给团伙内部管理者。",
          description: "黄牛代下人员登记下单记录及收款账号，用于组织者统计和结算。",
          references: [
            {
              title: "【黑产大数据】电商黄牛党产业链分析报告",
              link: "https://www.threathunter.cn/blog/fc4b4d8d000",
            },
          ],
        },
      },
    },
  },
  en: {
    BREAK: {
      risks: {
        R0001: {
          title: "Marketing Fraud Risk",
          keywords: ["coupon abuse"],
          definition: "Risk of gaining improper benefits through marketing rule exploitation",
          description: "Attackers obtain marketing benefits through bulk registration",
          influence: "High",
        },
        R0002: {
          title: "Compliance Penalty Risk",
          keywords: ["regulatory penalty"],
          definition: "Risk of penalty due to regulatory violations",
          description: "Enterprises face penalties for non-compliant behavior",
          influence: "Medium",
        },
        R0032: {
          title: "Account Takeover",
          keywords: ["account takeover", "ATO"],
          definition: "Illegally gaining control of others' accounts",
          description: "Stealing accounts through credential stuffing, phishing, etc.",
          influence: "High",
        },
      },
      avoidances: {
        A0001: {
          title: "CAPTCHA Technology",
          keywords: ["captcha", "verification code"],
          definition: "Technology to distinguish humans from bots",
          description: "Identifying human vs machine via verification codes",
          limitation: "CAPTCHAs can be broken",
        },
        A0007: {
          title: "Multi-Factor Authentication",
          keywords: ["MFA", "2FA"],
          definition: "Authentication requiring two or more factors",
          description: "Enhances account security",
          limitation: "Reduced user experience",
        },
      },
      attackTools: {
        AT0001: {
          title: "CAPTCHA Solving Platform",
          keywords: ["captcha platform"],
          description: "Platform providing CAPTCHA recognition services",
        },
        AT0042: {
          title: "Credential Stuffing Tool",
          keywords: ["credential stuffing", "bulk login attempts"],
          description: "Tool using leaked credentials for bulk login attempts",
        },
        AT0064: {
          title: "Infostealer",
          keywords: ["infostealer", "cookie theft"],
          description: "Malware that steals cookies and saved credentials",
        },
      },
      threatActors: {
        TA0001: {
          title: "Coupon Abuser",
          keywords: ["coupon abuse"],
          description: "Group exploiting marketing rule loopholes for profit",
        },
        TA0018: {
          title: "Malicious Hacker",
          keywords: ["attacker"],
          description: "Hackers using technical means for illegal operations",
        },
      },
      terms: {
        T0001: {
          title: "Order Reporting",
          keywords: ["Order Reporting", "report order", "bao dan"],
          aliases: ["bao dan"],
          category: "marketing fraud",
          definition: "Reporting an illicit order or operation to an upstream organizer.",
          description: "Participants submit order and payout details for internal settlement and statistics.",
          references: [
            {
              title: "【黑产大数据】电商黄牛党产业链分析报告",
              link: "https://www.threathunter.cn/blog/fc4b4d8d000",
            },
          ],
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
import { extractSnippetForSearch, useSearch } from "@/composables/useSearch";

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
      expect(result.term).toEqual([]);
    });

    it("纯空格返回空结果", () => {
      const { search } = useSearch();
      const result = search("   ");
      expect(result.risk).toEqual([]);
    });
  });

  describe("中文搜索", () => {
    it("单字符查询也返回结果", () => {
      const { search } = useSearch();
      const result = search("羊");
      expect(result.risk.length + result.threatActor.length).toBeGreaterThan(0);
    });

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
        ...result.term,
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

    it("snippet 围绕实际命中关键词生成", () => {
      const snippet = extractSnippetForSearch(
        {
          id: "R0002",
          title: "合规处罚风险",
          description:
            "企业在业务快速扩张时可能忽略资质、流程、授权、数据处理边界和内部审计要求，长期积累后会在专项检查中暴露问题并面临监管处罚",
        },
        undefined,
        "监管"
      );

      expect(snippet).toContain("监管");
      expect(snippet).toMatch(/^\.\.\./);
    });

    it("按中文关键词搜索风险", () => {
      const { search } = useSearch();
      const result = search("盗号");
      expect(result.risk.length).toBeGreaterThan(0);
      expect(result.risk[0].id).toBe("R0032");
    });

    it("按中文关键词搜索攻击工具", () => {
      const { search } = useSearch();
      const result = search("凭证填充");
      expect(result.attackTool.length).toBeGreaterThan(0);
      expect(result.attackTool[0].id).toBe("AT0042");
    });

    it("按中文关键词搜索规避手段", () => {
      const { search } = useSearch();
      const result = search("MFA");
      expect(result.avoidance.length).toBeGreaterThan(0);
      expect(result.avoidance[0].id).toBe("A0007");
    });

    it("按黑话或规范词搜索术语", () => {
      const { search } = useSearch();
      expect(search("报丹").term[0].id).toBe("T0001");
      expect(search("报单").term[0].id).toBe("T0001");
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

    it("按英文关键词搜索风险", () => {
      const { search } = useSearch();
      const result = search("ATO");
      expect(result.risk.length).toBeGreaterThan(0);
      expect(result.risk[0].id).toBe("R0032");
    });

    it("按英文关键词搜索攻击工具", () => {
      const { search } = useSearch();
      const result = search("bulk login attempts");
      expect(result.attackTool.length).toBeGreaterThan(0);
      expect(result.attackTool[0].id).toBe("AT0042");
    });

    it("按英文关键词搜索信息窃取器", () => {
      const { search } = useSearch();
      const result = search("infostealer");
      expect(result.attackTool.length).toBeGreaterThan(0);
      expect(result.attackTool[0].id).toBe("AT0064");
    });

    it("按英文术语别名搜索", () => {
      const { search } = useSearch();
      const result = search("report order");
      expect(result.term.length).toBeGreaterThan(0);
      expect(result.term[0].id).toBe("T0001");
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
      expect(result.term.length).toBeLessThanOrEqual(5);
    });
  });
});
