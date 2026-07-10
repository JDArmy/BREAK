import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const swSource = readFileSync(resolve(process.cwd(), "public/sw.js"), "utf-8");

describe("Service Worker 更新策略", () => {
  it("install 阶段不主动 skipWaiting，避免新版本抢占旧页面", () => {
    const installBlock = swSource.match(/self\.addEventListener\("install"[\s\S]+?\n}\);/)?.[0] ?? "";
    expect(installBlock).not.toContain("skipWaiting");
  });

  it("通过页面消息触发 skipWaiting", () => {
    expect(swSource).toContain('event.data?.type === "SKIP_WAITING"');
    expect(swSource).toContain("self.skipWaiting()");
  });

  it("激活时保留上一版本缓存", () => {
    expect(swSource).toContain("previousCaches.slice(-1)");
    expect(swSource).toContain("cachesToKeep");
  });

  it("所有构建 JS/CSS 资源都按当前部署作用域的 assets 路径匹配", () => {
    expect(swSource).toContain('const ASSET_PATH_PREFIX = `${SCOPE_PATH}/assets/`;');
    expect(swSource).toContain("pathname.startsWith(ASSET_PATH_PREFIX)");
    expect(swSource).toContain("/\\.(js|css)$/i.test(pathname)");
    expect(swSource).not.toContain("[\\da-f]{6,}");
  });
});
