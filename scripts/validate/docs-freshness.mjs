#!/usr/bin/env node
// 文档新鲜度门禁：当代码、数据模型、构建链路或 Skill 入口发生文档相关变更时，
// 要求同步更新使用手册、README 或 Skill 文档，避免功能已变但文档滞后。

import { execFileSync } from "child_process";

const baseArg = process.argv.find((arg) => arg.startsWith("--base="));
const baseRef = baseArg ? baseArg.slice("--base=".length) : "HEAD";

function runGit(args) {
  try {
    return execFileSync("git", args, { encoding: "utf8" })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

const changedFiles = Array.from(
  new Set([
    ...runGit(["diff", "--name-only", "--diff-filter=ACMRTUXB", baseRef]),
    ...runGit(["ls-files", "--others", "--exclude-standard"]),
  ]),
).sort();

const isDoc = (file) =>
  file.startsWith("docs/") ||
  file === "README.md" ||
  file === "README_CN.md" ||
  file === "CONTRIBUTING.md" ||
  file === "SECURITY.md" ||
  file === "DATA_SCHEMA.md" ||
  file === "ADMISSION-STANDARD.md" ||
  file === "QUALITY-GOVERNANCE.md" ||
  file === "STIX_MAPPING.md" ||
  file === "SKILL.md" ||
  file === "SKILL_en.md" ||
  file === ".env.example" ||
  file === "scripts/llm/README.md";

const hasAny = (predicates) =>
  changedFiles.some((file) => predicates.some((predicate) => predicate(file)));
const missing = (files) => files.filter((file) => !changedFiles.includes(file));

const manualTriggers = [
  (file) => file === "package.json",
  (file) => file === "src/router/index.ts",
  (file) => file === "src/components/MenuList.vue",
  (file) => file === "src/components/KnowledgeSplitView.vue",
  (file) => file === "src/views/DocsView.vue",
  (file) => file.startsWith("src/views/") && file.endsWith(".vue"),
  (file) => file.startsWith("src/components/") && file.endsWith(".vue"),
  (file) => file.startsWith("src/composables/") && file.endsWith(".ts"),
  (file) => file.startsWith("src/validation/"),
  (file) => file.startsWith("src/BREAK/entityRegistry"),
  (file) => file.startsWith("src/utils/entityRoute"),
  (file) => file.startsWith("scripts/validate/") && file.endsWith(".mjs"),
  (file) => file === "DATA_SCHEMA.md",
];

const userGuideTriggers = [
  (file) => file === "src/router/index.ts",
  (file) => file === "src/components/MenuList.vue",
  (file) => file === "src/components/KnowledgeSplitView.vue",
  (file) => file === "src/views/DocsView.vue",
  (file) => file.startsWith("src/views/") && file.endsWith(".vue"),
  (file) => file.startsWith("src/composables/") && file.endsWith(".ts"),
  (file) => file.startsWith("src/utils/entityRoute"),
];

const dataModelTriggers = [
  (file) => file.startsWith("src/validation/"),
  (file) => file === "DATA_SCHEMA.md",
  (file) => file.startsWith("src/BREAK/entityRegistry"),
  (file) => file === "src/BREAK/index.ts",
  (file) => file === "src/composables/useCases.ts",
];

const maintenanceTriggers = [
  (file) => file === "package.json",
  (file) => file.startsWith(".github/workflows/"),
  (file) => file.startsWith("scripts/validate/") && file.endsWith(".mjs"),
];

const readmeTriggers = [
  (file) => file === "package.json",
  (file) => file.startsWith(".github/workflows/"),
  (file) => file.startsWith("scripts/validate/") && file.endsWith(".mjs"),
  (file) => file.startsWith("scripts/skill/"),
  (file) =>
    file.startsWith("scripts/") &&
    /export|package|stix|jsonld|bundle|lighthouse|smoke|performance/.test(file),
  (file) => file === "DATA_SCHEMA.md",
  (file) => file === "STIX_MAPPING.md",
  (file) => file.startsWith("src/validation/"),
  (file) => file.startsWith("src/BREAK/basic-info/"),
  (file) => file.startsWith("src/BREAK/entityRegistry"),
];

const skillTriggers = [
  (file) => file.startsWith("scripts/skill/"),
  (file) => file === "package.json",
  (file) => file.startsWith("public/data/"),
  (file) => file.startsWith("src/BREAK/"),
  (file) => file.startsWith("src/i18n/en/BREAK/"),
];

const gates = [
  {
    name: "入门与界面指南",
    active: hasAny(userGuideTriggers),
    required: [
      "docs/zh-CN/01-getting-started.md",
      "docs/en/01-getting-started.md",
    ],
    reason:
      "路由、菜单、页面或导航行为变化时，需要同步更新双语入门与界面说明。",
  },
  {
    name: "数据模型与架构",
    active: hasAny(dataModelTriggers),
    required: [
      "docs/zh-CN/04-data-model.md",
      "docs/en/04-data-model.md",
      "docs/zh-CN/06-architecture.md",
      "docs/en/06-architecture.md",
    ],
    reason:
      "Schema、实体注册表、数据加载或聚合边界变化时，需要同步更新数据模型和架构文档。",
  },
  {
    name: "发布与维护指南",
    active: hasAny(maintenanceTriggers),
    required: [
      "docs/zh-CN/05-contribution.md",
      "docs/en/05-contribution.md",
      "docs/zh-CN/08-release-maintenance.md",
      "docs/en/08-release-maintenance.md",
    ],
    reason:
      "公共命令、校验脚本或 CI/发布流程变化时，需要同步更新贡献和发布维护指南。",
  },
  {
    name: "使用手册",
    active: hasAny(manualTriggers),
    required: ["docs/zh-CN/05-contribution.md", "docs/en/05-contribution.md"],
    reason:
      "UI、路由、数据模型、验证脚本、构建链路或维护流程发生变化时，需要同步更新使用手册。",
  },
  {
    name: "README",
    active: hasAny(readmeTriggers),
    required: ["README.md", "README_CN.md"],
    reason:
      "公共命令、构建/发布门禁、导出产物、数据模型或 Skill 分发方式发生变化时，需要同步更新 README。",
  },
  {
    name: "Skill 文档",
    active: hasAny(skillTriggers),
    required: ["SKILL.md", "SKILL_en.md"],
    reason:
      "Skill 搜索脚本、导出数据、实体结构或 Skill 打包方式发生变化时，需要同步更新 Skill 文档。",
  },
];

const activeGates = gates
  .filter((gate) => gate.active)
  .map((gate) => ({ ...gate, missing: missing(gate.required) }));
const issues = activeGates.filter((gate) => gate.missing.length > 0);

console.log("\n=== 文档新鲜度门禁 ===");
console.log(`base: ${baseRef}`);
console.log(`changed files: ${changedFiles.length}`);

if (changedFiles.length === 0 || changedFiles.every(isDoc)) {
  console.log("✅ 无需检查：没有非文档变更");
  process.exit(0);
}

for (const gate of activeGates) {
  console.log(
    `- ${gate.name}: ${gate.missing.length ? "missing" : "ok"} (${gate.reason})`,
  );
}

if (issues.length > 0) {
  console.error("\n❌ 文档新鲜度检查失败");
  for (const issue of issues) {
    console.error(`\n[${issue.name}] ${issue.reason}`);
    console.error(`需要同步修改: ${issue.required.join(", ")}`);
    console.error(`当前缺少: ${issue.missing.join(", ")}`);
  }
  console.error(
    "\n若确认为纯内部重构且不影响文档，请在同一次变更中更新对应文档说明本次无需文档变更的原因。",
  );
  process.exit(1);
}

console.log("\n✅ 文档新鲜度检查通过");
