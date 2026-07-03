import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const indexHtml = readFileSync(resolve(process.cwd(), "index.html"), "utf-8");
const asyncLoadingVue = readFileSync(
  resolve(process.cwd(), "src/components/AsyncComponentLoading.vue"),
  "utf-8",
);

describe("启动加载页", () => {
  it("提供静态加载状态和操作按钮", () => {
    expect(indexHtml).toContain("JDARMY BREAK");
    expect(indexHtml).toContain("break-boot-stage");
    expect(indexHtml).toContain("break-boot-progress");
    expect(indexHtml).toContain("data-break-boot-reload");
    expect(indexHtml).toContain("data-break-boot-clear");
  });

  it("暴露启动状态 API 并包含慢网/失败兜底", () => {
    expect(indexHtml).toContain("window.__BREAK_BOOT__");
    expect(indexHtml).toContain("setStage");
    expect(indexHtml).toContain("setError");
    expect(indexHtml).toContain("网络较慢");
    expect(indexHtml).toContain("unhandledrejection");
  });

  it("主 JS 加载前会模拟推进进度，避免进度条静止", () => {
    expect(indexHtml).toContain("progressTimer");
    expect(indexHtml).toContain("window.setInterval");
    expect(indexHtml).toContain("currentPercent >= 82");
    expect(indexHtml).toContain("updateProgress");
  });

  it("页面已显示后的异步加载占位不提供刷新按钮", () => {
    expect(asyncLoadingVue).toContain("网络较慢，正在继续加载资源。");
    expect(asyncLoadingVue).not.toContain("刷新页面");
    expect(asyncLoadingVue).not.toContain("window.location.reload");
  });
});
