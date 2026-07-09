import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const source = readFileSync(resolve(projectRoot, "src/components/MenuList.vue"), "utf-8");

describe("MenuList 文档入口", () => {
  it("更多菜单桌面端与移动端都包含文档入口并跳转 /docs", () => {
    expect(source).toContain('command === "docs"');
    expect(source).toContain('router.push("/docs")');
    expect(source).toContain('command="docs"');
    expect(source).toContain("menu.docs");
    expect(source).toContain("handleMobileNav('/docs')");
    expect(source).toContain("route.fullPath.startsWith('/docs')");
  });
});
