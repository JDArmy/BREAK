import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const scriptPath = resolve(projectRoot, "scripts/validate/docs-freshness.mjs");
const tempRoots: string[] = [];

function createGitRepo() {
  const root = mkdtempSync(resolve(tmpdir(), "break-docs-freshness-test-"));
  tempRoots.push(root);
  execFileSync("git", ["init", "-b", "main"], { cwd: root });
  execFileSync("git", ["config", "user.name", "BREAK Test"], { cwd: root });
  execFileSync("git", ["config", "user.email", "break-test@example.invalid"], { cwd: root });
  writeFile(root, "README.md", "README\n");
  writeFile(root, "README_CN.md", "README CN\n");
  writeFile(root, "SKILL.md", "Skill\n");
  writeFile(root, "SKILL_en.md", "Skill EN\n");
  writeFile(root, "docs/zh-CN/05-contribution.md", "贡献\n");
  writeFile(root, "docs/en/05-contribution.md", "Contribution\n");
  writeFile(root, "package.json", "{}\n");
  execFileSync("git", ["add", "."], { cwd: root });
  execFileSync("git", ["commit", "-m", "init"], { cwd: root });
  return root;
}

function writeFile(root: string, file: string, content: string) {
  mkdirSync(resolve(root, file, ".."), { recursive: true });
  writeFileSync(resolve(root, file), content, "utf-8");
}

function runFreshness(root: string) {
  return spawnSync(process.execPath, [scriptPath], { cwd: root, encoding: "utf-8" });
}

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) rmSync(root, { recursive: true, force: true });
  }
});

describe("docs-freshness.mjs", () => {
  it("在使用手册触发变更缺少中英文 docs 更新时失败", () => {
    const root = createGitRepo();
    writeFile(root, "src/router/index.ts", "export const route = '/docs';\n");

    const result = runFreshness(root);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("[使用手册]");
    expect(result.stderr).toContain("docs/zh-CN/05-contribution.md");
    expect(result.stderr).toContain("docs/en/05-contribution.md");
  });

  it("同时补齐使用手册、README 和 Skill 文档时通过", () => {
    const root = createGitRepo();
    writeFile(root, "src/router/index.ts", "export const route = '/docs';\n");
    writeFile(root, "scripts/validate/new-gate.mjs", "console.log('gate');\n");
    writeFile(root, "scripts/skill/export_data.mjs", "console.log('skill');\n");
    writeFile(root, "src/BREAK/risks/R9999.json", "{}\n");
    writeFile(root, "docs/zh-CN/05-contribution.md", "贡献：更新门禁说明\n");
    writeFile(root, "docs/en/05-contribution.md", "Contribution: update gate notes\n");
    writeFile(root, "README.md", "README: update gate notes\n");
    writeFile(root, "README_CN.md", "README CN：更新门禁说明\n");
    writeFile(root, "SKILL.md", "Skill：更新门禁说明\n");
    writeFile(root, "SKILL_en.md", "Skill EN: update gate notes\n");

    const result = runFreshness(root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("文档新鲜度检查通过");
  });

  it("Skill 相关变更缺少英文 Skill 文档更新时失败", () => {
    const root = createGitRepo();
    writeFile(root, "scripts/skill/search.mjs", "console.log('search');\n");
    writeFile(root, "SKILL.md", "Skill：更新搜索说明\n");

    const result = runFreshness(root);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("[Skill 文档]");
    expect(result.stderr).toContain("SKILL_en.md");
  });
});
