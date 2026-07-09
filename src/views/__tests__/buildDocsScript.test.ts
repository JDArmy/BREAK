import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const scriptPath = resolve(projectRoot, "scripts/validate/build-docs.mjs");
const tempRoots: string[] = [];

function createTempRoot() {
  const root = mkdtempSync(resolve(tmpdir(), "break-docs-test-"));
  tempRoots.push(root);
  mkdirSync(resolve(root, "docs/zh-CN"), { recursive: true });
  mkdirSync(resolve(root, "docs/en"), { recursive: true });
  return root;
}

function writeDoc(root: string, lang: string, file: string, meta: { title: string; category: string; order: number; slug: string }, body = "正文段落。") {
  writeFileSync(
    resolve(root, "docs", lang, file),
    `---\ntitle: ${meta.title}\ncategory: ${meta.category}\norder: ${meta.order}\nslug: ${meta.slug}\n---\n\n# ${meta.title}\n\n${body}\n`,
    "utf-8",
  );
}

function writeValidDocs(root: string) {
  writeDoc(root, "zh-CN", "01-index.md", { title: "快速上手", category: "入门", order: 1, slug: "index" });
  writeDoc(root, "zh-CN", "02-guide.md", { title: "指南", category: "指南", order: 2, slug: "guide" });
  writeDoc(root, "en", "01-index.md", { title: "Getting Started", category: "Getting Started", order: 1, slug: "index" });
  writeDoc(root, "en", "02-guide.md", { title: "Guide", category: "Guide", order: 2, slug: "guide" });
}

function runBuild(root: string, extraArgs: string[] = []) {
  const dataOutputDir = resolve(root, "public/data");
  const htmlOutputDir = resolve(root, "public/docs");
  return spawnSync(
    process.execPath,
    [
      scriptPath,
      `--docs-dir=${resolve(root, "docs")}`,
      `--data-output-dir=${dataOutputDir}`,
      `--html-output-dir=${htmlOutputDir}`,
      ...extraArgs,
    ],
    { cwd: projectRoot, encoding: "utf-8" },
  );
}

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) rmSync(root, { recursive: true, force: true });
  }
});

describe("build-docs.mjs", () => {
  it("生成 manifest 与单篇 HTML，并为重复标题生成稳定唯一 id", () => {
    const root = createTempRoot();
    writeDoc(root, "zh-CN", "01-index.md", { title: "快速上手", category: "入门", order: 1, slug: "index" }, "第一段。\n\n## 重复标题\n\n## 重复标题");
    writeDoc(root, "en", "01-index.md", { title: "Getting Started", category: "Getting Started", order: 1, slug: "index" }, "First paragraph.\n\n## Repeat\n\n## Repeat");

    const result = runBuild(root);

    expect(result.status).toBe(0);
    const manifest = JSON.parse(readFileSync(resolve(root, "public/data/docs-manifest.json"), "utf-8"));
    expect(manifest["zh-CN"][0]).toMatchObject({ slug: "index", order: 1, htmlPath: "docs/zh-CN/index.html" });
    const html = readFileSync(resolve(root, "public/docs/zh-CN/index.html"), "utf-8");
    expect(html).toContain('id="重复标题"');
    expect(html).toContain('id="重复标题-2"');
  });

  it("阻断重复 slug 和重复 order", () => {
    const root = createTempRoot();
    writeDoc(root, "zh-CN", "01-index.md", { title: "快速上手", category: "入门", order: 1, slug: "index" });
    writeDoc(root, "zh-CN", "02-dup.md", { title: "重复", category: "入门", order: 1, slug: "index" });
    writeDoc(root, "en", "01-index.md", { title: "Getting Started", category: "Getting Started", order: 1, slug: "index" });

    const result = runBuild(root);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("slug 与");
    expect(result.stderr).toContain("order 与");
  });

  it("阻断缺少 index 默认文档", () => {
    const root = createTempRoot();
    writeDoc(root, "zh-CN", "01-guide.md", { title: "指南", category: "指南", order: 1, slug: "guide" });
    writeDoc(root, "en", "01-guide.md", { title: "Guide", category: "Guide", order: 1, slug: "guide" });

    const result = runBuild(root);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("缺少 slug: index");
  });

  it("阻断中英文 slug 或 order 不一致", () => {
    const root = createTempRoot();
    writeDoc(root, "zh-CN", "01-index.md", { title: "快速上手", category: "入门", order: 1, slug: "index" });
    writeDoc(root, "zh-CN", "02-guide.md", { title: "指南", category: "指南", order: 2, slug: "guide" });
    writeDoc(root, "en", "01-index.md", { title: "Getting Started", category: "Getting Started", order: 1, slug: "index" });
    writeDoc(root, "en", "02-other.md", { title: "Other", category: "Guide", order: 3, slug: "other" });

    const result = runBuild(root);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("缺少文档 slug: guide");
    expect(result.stderr).toContain("多出未在 zh-CN 中定义的文档 slug: other");
  });

  it("--check 在产物过期时失败", () => {
    const root = createTempRoot();
    writeValidDocs(root);
    execFileSync(process.execPath, [
      scriptPath,
      `--docs-dir=${resolve(root, "docs")}`,
      `--data-output-dir=${resolve(root, "public/data")}`,
      `--html-output-dir=${resolve(root, "public/docs")}`,
    ], { cwd: projectRoot });

    writeDoc(root, "zh-CN", "02-guide.md", { title: "指南已更新", category: "指南", order: 2, slug: "guide" });

    const result = runBuild(root, ["--check"]);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("不是最新产物");
  });
});
