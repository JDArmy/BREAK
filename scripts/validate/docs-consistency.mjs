import fs from "fs";
import path from "path";
import { projectRoot, readJson } from "../search/common.mjs";

const docs = {
  readme: fs.readFileSync(path.join(projectRoot, "README.md"), "utf8"),
  readmeCn: fs.readFileSync(path.join(projectRoot, "README_CN.md"), "utf8"),
  skill: fs.readFileSync(path.join(projectRoot, "SKILL.md"), "utf8"),
  skillEn: fs.readFileSync(path.join(projectRoot, "SKILL_en.md"), "utf8"),
  gettingStarted: fs.readFileSync(
    path.join(projectRoot, "docs/zh-CN/01-getting-started.md"),
    "utf8",
  ),
  defenderGuide: fs.readFileSync(
    path.join(projectRoot, "docs/zh-CN/02-defender-guide.md"),
    "utf8",
  ),
  dataModel: fs.readFileSync(
    path.join(projectRoot, "docs/zh-CN/04-data-model.md"),
    "utf8",
  ),
  dataConsumption: fs.readFileSync(
    path.join(projectRoot, "docs/zh-CN/07-data-consumption.md"),
    "utf8",
  ),
  dataConsumptionEn: fs.readFileSync(
    path.join(projectRoot, "docs/en/07-data-consumption.md"),
    "utf8",
  ),
  contribution: fs.readFileSync(
    path.join(projectRoot, "docs/zh-CN/05-contribution.md"),
    "utf8",
  ),
  contributionEn: fs.readFileSync(
    path.join(projectRoot, "docs/en/05-contribution.md"),
    "utf8",
  ),
  releaseGuide: fs.readFileSync(
    path.join(projectRoot, "docs/zh-CN/08-release-maintenance.md"),
    "utf8",
  ),
  releaseGuideEn: fs.readFileSync(
    path.join(projectRoot, "docs/en/08-release-maintenance.md"),
    "utf8",
  ),
  ciWorkflow: fs.readFileSync(
    path.join(projectRoot, ".github/workflows/ci.yml"),
    "utf8",
  ),
  deployWorkflow: fs.readFileSync(
    path.join(projectRoot, ".github/workflows/deploy.yml"),
    "utf8",
  ),
  pullRequestTemplate: fs.readFileSync(
    path.join(projectRoot, ".github/pull_request_template.md"),
    "utf8",
  ),
  dataChangeIssueTemplate: fs.readFileSync(
    path.join(projectRoot, ".github/ISSUE_TEMPLATE/data-change.md"),
    "utf8",
  ),
};

const packageJson = readJson(path.join(projectRoot, "package.json"));
const buildScript = packageJson.scripts?.build || "";
const deployBuildScript = packageJson.scripts?.["deploy:build"] || "";

const entityDirs = {
  risks: "src/BREAK/risks",
  avoidances: "src/BREAK/avoidances",
  attackTools: "src/BREAK/attack-tools",
  threatActors: "src/BREAK/threat-actors",
  terms: "src/BREAK/terms",
  businessDomains: "src/BREAK/business-domains",
  avoidanceCategories: "src/BREAK/avoidance-categories",
  cases: "src/BREAK/cases",
};

function loadRecords(relativeDir) {
  const dir = path.join(projectRoot, relativeDir);
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .flatMap((file) =>
      Object.entries(readJson(path.join(dir, file))).map(([key, entity]) => ({
        key,
        entity,
      })),
    );
}

function summarize(relativeDir) {
  const records = loadRecords(relativeDir);
  const main = records.filter(({ key }) => !key.includes("-")).length;
  const sub = records.length - main;
  return {
    main,
    sub,
    total: records.length,
  };
}

const counts = Object.fromEntries(
  Object.entries(entityDirs).map(([key, dir]) => [key, summarize(dir)]),
);

const metricReferenceTypes = [
  "risks",
  "avoidances",
  "attackTools",
  "threatActors",
];
const metricReferenceTotal = metricReferenceTypes.reduce(
  (sum, key) =>
    sum +
    loadRecords(entityDirs[key]).reduce(
      (count, { entity }) =>
        count +
        (Array.isArray(entity.references) ? entity.references.length : 0),
      0,
    ),
  0,
);

const failures = [];

function expectIncludes(docName, snippet, description) {
  if (!docs[docName].includes(snippet)) {
    failures.push(`${docName}: 缺少或未同步 ${description}: ${snippet}`);
  }
}

function rejectIncludes(docName, snippet, description) {
  if (docs[docName].includes(snippet)) {
    failures.push(`${docName}: 仍包含过时内容 ${description}: ${snippet}`);
  }
}

function expectFile(relativePath, description) {
  if (!fs.existsSync(path.join(projectRoot, relativePath))) {
    failures.push(`${relativePath}: 缺少 ${description}`);
  }
}

function listMarkdownFiles(relativeDir) {
  const dir = path.join(projectRoot, relativeDir);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) return listMarkdownFiles(relativePath);
    return entry.isFile() && entry.name.endsWith(".md") ? [relativePath] : [];
  });
}

const buildGateScripts = [
  "lint",
  "type-check",
  "validate:data",
  "test",
  "test:coverage",
  "validate:schema-docs",
  "validate:home-counts",
  "export:data",
  "export:data-en",
  "export:data-package",
  "build-only",
  "audit:bundle:check",
  "validate:data-export",
  "validate:data-package",
];
const documentedUtilityScripts = [
  "schema:docs:write",
  "validate:docs",
  "entity:version:bump",
  "version:sync",
];
const deployBuildScripts = [
  "export:data",
  "export:data-en",
  "export:stix",
  "export:jsonld",
  "build-only",
  "export:data-package",
];

const englishStats =
  `The current framework catalogues ${counts.risks.total} risk items, ` +
  `${counts.avoidances.total} avoidance measures, ${counts.attackTools.total} attack tools, ` +
  `${counts.threatActors.total} threat actors, ${counts.terms.total} industry terms, ` +
  `${counts.businessDomains.total} business domains, ${counts.avoidanceCategories.total} avoidance categories, ` +
  `and ${counts.cases.total} cases`;

const chineseStats =
  `目前框架共收集和整理风险点 ${counts.risks.total} 个、规避手段 ${counts.avoidances.total} 个、` +
  `攻击工具 ${counts.attackTools.total} 个、威胁行为者 ${counts.threatActors.total} 个、` +
  `行业术语 ${counts.terms.total} 个、业务域 ${counts.businessDomains.total} 个、` +
  `规避手段分类 ${counts.avoidanceCategories.total} 个、案例 ${counts.cases.total} 个`;

const skillTotal =
  counts.risks.total +
  counts.avoidances.total +
  counts.attackTools.total +
  counts.threatActors.total +
  counts.terms.total +
  counts.cases.total +
  counts.businessDomains.total;

const skillRows = [
  ["Risk", counts.risks.total],
  ["Avoidance", counts.avoidances.total],
  ["AttackTool", counts.attackTools.total],
  ["ThreatActor", counts.threatActors.total],
  ["Term", counts.terms.total],
  ["Case", counts.cases.total],
  ["BusinessDomain", counts.businessDomains.total],
];

expectIncludes("readme", englishStats, "README entity totals");
expectIncludes("readmeCn", chineseStats, "README_CN entity totals");
expectIncludes(
  "readme",
  "[DATA_SCHEMA.md](./DATA_SCHEMA.md)",
  "README schema docs link",
);
expectIncludes(
  "readmeCn",
  "[DATA_SCHEMA.md](./DATA_SCHEMA.md)",
  "README_CN schema docs link",
);
expectIncludes("skill", `包含 ${skillTotal} 条`, "SKILL entity total");
expectIncludes(
  "skillEn",
  `containing ${skillTotal.toLocaleString("en-US")} entries`,
  "SKILL_en entity total",
);

for (const [label, count] of skillRows) {
  const rowPattern = new RegExp(
    `\\|\\s*${label}(?:（[^）]+）)?\\s*\\|\\s*${count}\\s*\\|`,
  );
  if (!rowPattern.test(docs.skill)) {
    failures.push(`skill: ${label} 数量未同步为 ${count}`);
  }
  if (!rowPattern.test(docs.skillEn)) {
    failures.push(`skillEn: ${label} count is not synchronized to ${count}`);
  }
}

for (const scriptName of buildGateScripts) {
  if (!buildScript.includes(`npm run ${scriptName}`)) {
    failures.push(`package.json: build 脚本缺少门禁 npm run ${scriptName}`);
  }
  expectIncludes(
    "readme",
    `npm run ${scriptName}`,
    `README build gate ${scriptName}`,
  );
  expectIncludes(
    "readmeCn",
    `npm run ${scriptName}`,
    `README_CN build gate ${scriptName}`,
  );
  expectIncludes(
    "ciWorkflow",
    `npm run ${scriptName}`,
    `CI workflow build gate ${scriptName}`,
  );
}

for (const scriptName of deployBuildScripts) {
  if (!deployBuildScript.includes(`npm run ${scriptName}`)) {
    failures.push(
      `package.json: deploy:build 脚本缺少发布产物步骤 npm run ${scriptName}`,
    );
  }
}

expectIncludes(
  "deployWorkflow",
  "npm run deploy:build",
  "Deploy workflow release build script",
);

for (const scriptName of documentedUtilityScripts) {
  expectIncludes(
    "readme",
    `npm run ${scriptName}`,
    `README utility script ${scriptName}`,
  );
  expectIncludes(
    "readmeCn",
    `npm run ${scriptName}`,
    `README_CN utility script ${scriptName}`,
  );
}

if (
  packageJson.scripts?.["version:bump"] !==
  packageJson.scripts?.["version:sync"]
) {
  failures.push(
    "package.json: version:bump 必须保持为 version:sync 的兼容别名",
  );
}
if (
  !packageJson.scripts?.["entity:version:bump"]?.includes("auto-version.mjs")
) {
  failures.push(
    "package.json: entity:version:bump 未指向实体版本脚本 auto-version.mjs",
  );
}

expectIncludes(
  "readmeCn",
  "`npm run entity:version:bump` 会通过 `git diff`",
  "README_CN entity version semantics",
);
expectIncludes(
  "readme",
  "`npm run entity:version:bump` detects substantive entity changes",
  "README entity version semantics",
);
expectIncludes(
  "releaseGuide",
  "`npm run version:bump` 是兼容别名",
  "release guide version alias semantics",
);
expectIncludes(
  "releaseGuideEn",
  "`npm run version:bump` is a compatibility alias",
  "English release guide version alias semantics",
);
rejectIncludes(
  "readmeCn",
  "`npm run version:bump` 会通过 `git diff` 检测实体文件",
  "旧实体版本命令说明",
);
rejectIncludes(
  "readme",
  "`npm run version:bump` detects substantive entity file changes",
  "stale entity-version command description",
);

const browserScripts = [
  "test:smoke",
  "test:relation-stability",
  "test:lighthouse",
  "test:performance",
  "test:visual-review",
];
for (const scriptName of browserScripts) {
  expectIncludes(
    "ciWorkflow",
    `npm run ${scriptName}`,
    `PR browser gate ${scriptName}`,
  );
  expectIncludes(
    "readmeCn",
    `npm run ${scriptName}`,
    `README_CN browser command ${scriptName}`,
  );
  expectIncludes(
    "readme",
    `npm run ${scriptName}`,
    `README browser command ${scriptName}`,
  );
}
expectIncludes(
  "readmeCn",
  "当前 PR CI 会在每个 PR 中运行这五项浏览器检查",
  "当前 PR 浏览器门禁说明",
);
expectIncludes(
  "readme",
  "The current PR CI runs all five browser checks on every pull request",
  "current PR browser-gate description",
);
rejectIncludes(
  "readmeCn",
  "仅在 major/minor 版本变化时进入 PR CI",
  "旧浏览器 CI 条件",
);
rejectIncludes(
  "readme",
  "only for major/minor version changes",
  "stale browser CI condition",
);

expectIncludes("dataModel", "/knowledges/case/list", "Case list route");
rejectIncludes("dataModel", "`/cases`", "旧 Case 列表路由");
expectIncludes(
  "defenderGuide",
  `${counts.risks.total} 条风险`,
  "防御指南风险数量",
);
rejectIncludes("defenderGuide", "600+ 条风险", "旧风险数量");
expectIncludes(
  "contribution",
  "src/BREAK/entityRegistry.ts",
  "Entity Registry ownership",
);
expectIncludes(
  "contributionEn",
  "src/BREAK/entityRegistry.ts",
  "English Entity Registry ownership",
);
rejectIncludes("contribution", "要改 11 处", "旧实体类型维护清单");
rejectIncludes(
  "contributionEn",
  "11 places must change",
  "stale entity-type maintenance checklist",
);

expectIncludes(
  "dataConsumption",
  "manifest.packageVersion",
  "Manifest packageVersion 读取示例",
);
expectIncludes(
  "dataConsumption",
  "data.data.risks.R0001",
  "JSON data 包装结构读取示例",
);
expectIncludes(
  "dataConsumptionEn",
  "manifest.packageVersion",
  "English Manifest packageVersion example",
);
expectIncludes(
  "dataConsumptionEn",
  "data.data.risks.R0001",
  "English JSON data wrapper example",
);
rejectIncludes(
  "dataConsumption",
  "manifest.version",
  "错误 Manifest version 字段",
);
rejectIncludes(
  "dataConsumptionEn",
  "manifest.version",
  "invalid Manifest version field",
);

for (const [name, content] of Object.entries({
  contributionEn: docs.contributionEn,
  releaseGuideEn: docs.releaseGuideEn,
})) {
  const mixedHeading = content.match(/^#{1,6} .*\p{Script=Han}.*$/mu);
  if (mixedHeading) {
    failures.push(`${name}: 英文文档标题含中文残留: ${mixedHeading[0]}`);
  }
}

for (const [file, description] of [
  ["CONTRIBUTING.md", "根目录贡献指南"],
  ["SECURITY.md", "安全问题报告流程"],
  [".env.example", "可选环境变量模板"],
  ["docs/zh-CN/06-architecture.md", "中文架构文档"],
  ["docs/en/06-architecture.md", "英文架构文档"],
  ["docs/zh-CN/07-data-consumption.md", "中文数据消费文档"],
  ["docs/en/07-data-consumption.md", "英文数据消费文档"],
  ["docs/zh-CN/08-release-maintenance.md", "中文发布维护文档"],
  ["docs/en/08-release-maintenance.md", "英文发布维护文档"],
]) {
  expectFile(file, description);
}

for (const snippet of [
  "[贡献指南](./CONTRIBUTING.md)",
  "[安全问题报告](./SECURITY.md)",
  "[`.env.example`](./.env.example)",
]) {
  expectIncludes("readmeCn", snippet, `README_CN 文档入口 ${snippet}`);
}
for (const snippet of [
  "[Contribution guide](./CONTRIBUTING.md)",
  "[Security reporting](./SECURITY.md)",
  "[`.env.example`](./.env.example)",
]) {
  expectIncludes("readme", snippet, `README documentation entry ${snippet}`);
}

const localLinkFiles = [
  "README.md",
  "README_CN.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "DATA_SCHEMA.md",
  "ADMISSION-STANDARD.md",
  "QUALITY-GOVERNANCE.md",
  "STIX_MAPPING.md",
  "scripts/llm/README.md",
  ...listMarkdownFiles("docs"),
];
for (const relativeFile of localLinkFiles) {
  const content = fs.readFileSync(path.join(projectRoot, relativeFile), "utf8");
  for (const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const rawTarget = match[1].trim().replace(/^<|>$/g, "");
    const target = rawTarget.split("#")[0];
    if (!target || /^(?:https?:|mailto:|\/)/.test(target)) continue;
    const resolved = path.resolve(
      projectRoot,
      path.dirname(relativeFile),
      target,
    );
    if (!fs.existsSync(resolved)) {
      failures.push(`${relativeFile}: 本地 Markdown 链接不存在: ${rawTarget}`);
    }
  }
}

for (const snippet of [
  "CHANGELOG.md",
  "data / app / docs / build",
  "npm run export:data-package",
]) {
  expectIncludes(
    "pullRequestTemplate",
    snippet,
    `PR template contribution gate ${snippet}`,
  );
}

for (const snippet of [
  "CHANGELOG.md",
  "静态数据包或 npm 数据包评估",
  "data/app/docs/build",
]) {
  expectIncludes(
    "dataChangeIssueTemplate",
    snippet,
    `data issue template contribution gate ${snippet}`,
  );
}

if (failures.length > 0) {
  console.error("\n❌ 文档统计一致性检查失败\n");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("\n✅ 文档统计一致性检查通过");
console.log(
  `entities=${counts.risks.total}/${counts.avoidances.total}/${counts.attackTools.total}/${counts.threatActors.total}/${counts.terms.total}/${counts.businessDomains.total}/${counts.avoidanceCategories.total}/${counts.cases.total}`,
);
console.log(`metricReferences=${metricReferenceTotal}`);
