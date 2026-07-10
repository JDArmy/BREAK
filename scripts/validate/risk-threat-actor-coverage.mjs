import fs from "node:fs";
import path from "node:path";
import {
  ensureDir,
  loadEntities,
  projectRoot,
  readJson,
  writeJson,
} from "../search/common.mjs";

const reportDir = path.join(projectRoot, "research/search-reports");
const reportJsonPath = path.join(reportDir, "risk-threat-actor-coverage.json");
const reportMdPath = path.join(reportDir, "risk-threat-actor-coverage.md");
const exemptionPath = path.join(
  projectRoot,
  "scripts/validate/risk-threat-actor-coverage-exemptions.json",
);
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const maxRows = Number.parseInt(limitArg?.split("=")[1] || "160", 10);

if (!Number.isInteger(maxRows) || maxRows < 1) {
  console.error("[risk-threat-actor-coverage] --limit 必须是正整数");
  process.exit(1);
}

const percent = (part, total) =>
  total ? Number(((part / total) * 100).toFixed(2)) : 0;
const exemptions = readJson(exemptionPath);
const risks = loadEntities("risks");
const threatActors = loadEntities("threat-actors");
const riskIds = new Set(risks.map(({ key }) => key));
const actorMap = new Map();

for (const { key: actorKey, entity } of threatActors) {
  for (const relationType of ["directCauseRisks", "indirectSupportRisks"]) {
    for (const riskKey of entity[relationType] || []) {
      const current = actorMap.get(riskKey) || [];
      current.push({
        key: actorKey,
        title: entity.title || "",
        relationType,
      });
      actorMap.set(riskKey, current);
    }
  }
}

const invalidExemptions = Object.keys(exemptions).filter(
  (riskKey) => !riskIds.has(riskKey),
);
const rows = risks
  .map(({ key, entity, filePath }) => {
    const actors = actorMap.get(key) || [];
    return {
      key,
      title: entity.title || "",
      complexity: entity.complexity || "unknown",
      updated: entity.updated || "",
      isSubRisk: key.includes("-"),
      filePath: path.relative(projectRoot, filePath),
      exempt: Object.hasOwn(exemptions, key),
      exemptionReason: exemptions[key] || "",
      actorCount: actors.length,
      actors: actors.sort((a, b) => a.key.localeCompare(b.key)),
    };
  })
  .sort((a, b) => a.key.localeCompare(b.key));

const covered = rows.filter((row) => row.actorCount > 0);
const exemptUncovered = rows.filter(
  (row) => row.actorCount === 0 && row.exempt,
);
const actionableUncovered = rows.filter(
  (row) => row.actorCount === 0 && !row.exempt,
);
const staleExemptions = rows.filter((row) => row.actorCount > 0 && row.exempt);
const accountableTotal = rows.length - exemptUncovered.length;

const report = {
  generatedAt: new Date().toISOString(),
  policy:
    "ThreatActor 覆盖是非阻断成熟度指标。合规、技术演进和功能安全风险可显式豁免，其余未覆盖 Risk 进入关系补全或实体建设清单。",
  summary: {
    totalRisks: rows.length,
    coveredRisks: covered.length,
    exemptUncoveredRisks: exemptUncovered.length,
    actionableUncoveredRisks: actionableUncovered.length,
    rawCoverageRate: percent(covered.length, rows.length),
    accountableCoverageRate: percent(covered.length, accountableTotal),
    staleExemptions: staleExemptions.length,
    invalidExemptions: invalidExemptions.length,
  },
  invalidExemptions,
  staleExemptions,
  exemptUncoveredRisks: exemptUncovered,
  actionableUncoveredRisks: actionableUncovered,
  risks: rows,
};

const lines = [
  "# Risk-ThreatActor 覆盖审计",
  "",
  `生成时间：${report.generatedAt}`,
  "",
  report.policy,
  "",
  "## 总览",
  "",
  `- Risk 总数：${report.summary.totalRisks}`,
  `- 已关联 ThreatActor：${report.summary.coveredRisks}`,
  `- 显式豁免且未关联：${report.summary.exemptUncoveredRisks}`,
  `- 待处理未覆盖：${report.summary.actionableUncoveredRisks}`,
  `- 原始覆盖率：${report.summary.rawCoverageRate}%`,
  `- 排除豁免后的覆盖率：${report.summary.accountableCoverageRate}%`,
  `- 已有关联但仍在豁免清单：${report.summary.staleExemptions}`,
  `- 无效豁免 ID：${report.summary.invalidExemptions}`,
  "",
  `## 待处理未覆盖 Risk（前 ${Math.min(maxRows, actionableUncovered.length)} 条）`,
  "",
  "| Risk | 标题 | complexity | updated |",
  "| --- | --- | --- | --- |",
  ...actionableUncovered
    .slice(0, maxRows)
    .map(
      (risk) =>
        `| ${risk.key} | ${risk.title} | ${risk.complexity} | ${risk.updated || "-"} |`,
    ),
  "",
  "## 显式豁免",
  "",
  "| Risk | 标题 | 原因 |",
  "| --- | --- | --- |",
  ...exemptUncovered.map(
    (risk) =>
      `| ${risk.key} | ${risk.title} | ${risk.exemptionReason.replaceAll("|", "\\|")} |`,
  ),
];

ensureDir(reportDir);
writeJson(reportJsonPath, report);
fs.writeFileSync(reportMdPath, `${lines.join("\n")}\n`);

console.log("[risk-threat-actor-coverage] 非阻断审计完成");
console.log(
  `[risk-threat-actor-coverage] 原始覆盖率 ${report.summary.rawCoverageRate}%：${report.summary.coveredRisks}/${report.summary.totalRisks}`,
);
console.log(
  `[risk-threat-actor-coverage] 排除 ${report.summary.exemptUncoveredRisks} 个豁免后覆盖率 ${report.summary.accountableCoverageRate}%`,
);
console.log(
  `[risk-threat-actor-coverage] 待处理未覆盖 Risk：${report.summary.actionableUncoveredRisks}`,
);
console.log(
  `[risk-threat-actor-coverage] 报告：${path.relative(projectRoot, reportMdPath)}`,
);
