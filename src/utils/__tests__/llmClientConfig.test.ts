import { describe, expect, it } from "vitest";
import { resolveSetting, resolveUrl } from "../../../scripts/llm/llm-client.mjs";

describe("LLM 配置解析", () => {
  it("显式环境变量优先于本地 .env", () => {
    expect(resolveSetting("process-value", "local-value", "fallback")).toBe("process-value");
  });

  it("未显式配置时依次使用本地值和默认值", () => {
    expect(resolveSetting("", "local-value", "fallback")).toBe("local-value");
    expect(resolveSetting("", "", "fallback")).toBe("fallback");
  });

  it("保留 HTTPS 配置且默认使用 HTTPS", () => {
    const endpoint = "https://ai-api.jdcloud.com/v1/chat/completions";
    expect(resolveUrl(endpoint)).toBe(endpoint);
    expect(resolveUrl()).toBe(endpoint);
  });
});
