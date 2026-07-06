/**
 * BREAK 新条目准入门禁
 *
 * 卡控新增条目的内容下限与 references 质量，防止低质/占位/泛泛内容入库：
 *   1. references 禁止使用 10 种框架首页占位链接（黑名单精确匹配）
 *   2. keywords 数量下限（按类型 ≥3 / Term ≥4）
 *   3. 文本字段长度下限（definition/description/influence/limitation/summary，去空白字符）
 *   4. 高价值 Case（criminal_verdict 等 4 类）需 ≥2 源且含 ≥1 primary 来源
 *   5. 内容退化保护：历史条目（在 baseline exemptIds 内）若 keywords/长度低于快照值 → 报错
 *
 * 作用范围（baseline 豁免机制）：
 *   - exemptIds：2.39.0 发布时已存在的全部实体 ID。新增条目（不在 exemptIds）严格执行 1-4。
 *   - placeholderExempt：含占位 link 的历史 ID。这些条目跳过占位禁令（技术债，由历史修复工单处理）。
 *   - fieldSnapshots：每条 ID 的 keywords 数 + 各文本字段长度。baseline 条目内容退化 → 报错（防劣化）。
 *
 * 与现有门禁分工：
 *   - require-references.mjs 管「references ≥1 + 合法 URL」，本脚本不重复，只管占位/分级/下限/退化。
 *   - case-source-quality.mjs 是 Case 来源质量审计报告（exit 0），本脚本把高价值 Case 的 primary 要求提升为门禁。
 *   - avoidance-content.mjs（--strict，已接入 build 链）管 avoidance 的 description≥40/limitation≥30 全库；
 *     本脚本对新增 avoidance 更严（description≥60），两者不冲突。
 *
 * 用法：
 *   node scripts/validate/admission.mjs                 # 门禁模式（有 error 则 exit 1），接入 validate:data
 *   node scripts/validate/admission.mjs --audit         # 仅报告，exit 0（npm run audit:admission）
 *   node scripts/validate/admission.mjs --generate-baseline  # 生成 admission-baseline.json 快照
 *   node scripts/validate/admission.mjs --regenerate        # 重生成快照（吸收当前全库为新基线）
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { classifySource, highValueCategories, normalizeSlash } from "./source-classify.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const breakDir = path.join(__dirname, "../../src/BREAK");
const baselinePath = path.join(__dirname, "admission-baseline.json");

// ── 6 类实体配置 ──
// textFields: [{ field, minLen }] 文本字段及去空白字符数下限（仅对新增条目强制）
// keywordsMin: keywords 数量下限（仅对新增条目强制）
const ENTITY_CONFIGS = [
  {
    dir: "risks",
    name: "Risk",
    textFields: [
      { field: "definition", minLen: 20 },
      { field: "description", minLen: 60 },
      { field: "influence", minLen: 15 },
    ],
    keywordsMin: 3,
  },
  {
    dir: "avoidances",
    name: "Avoidance",
    textFields: [
      { field: "definition", minLen: 20 },
      { field: "description", minLen: 60 },
      { field: "limitation", minLen: 30 },
    ],
    keywordsMin: 3,
  },
  {
    dir: "attack-tools",
    name: "AttackTool",
    textFields: [{ field: "description", minLen: 80 }],
    keywordsMin: 3,
  },
  {
    dir: "threat-actors",
    name: "ThreatActor",
    textFields: [{ field: "description", minLen: 80 }],
    keywordsMin: 3,
  },
  {
    dir: "terms",
    name: "Term",
    textFields: [
      { field: "definition", minLen: 20 },
      { field: "description", minLen: 60 },
    ],
    keywordsMin: 4,
  },
  {
    dir: "cases",
    name: "Case",
    textFields: [{ field: "summary", minLen: 80 }],
    keywordsMin: 3,
  },
];

// ── 10 种框架首页占位链接黑名单（源于 scripts/import/expand-coverage-batch.mjs）──
// normalizeSlash 去尾斜杠后比较，避免 0x00-header vs 0x00-header/ 漏判；
// 精确匹配首页，不误伤 nist.gov/cyberframework/framework/basic 这类具体页。
const PLACEHOLDER_LINKS = [
  "https://www.nist.gov/cyberframework",
  "https://www.nist.gov/itl/ai-risk-management-framework",
  "https://owasp.org/API-Security/editions/2023/en/0x00-header",
  "https://owasp.org/www-project-top-10-for-large-language-model-applications",
  "https://owasp.org/www-project-top-10-ci-cd-security-risks",
  "https://www.pcisecuritystandards.org/standards/pci-dss",
  "https://www.cisa.gov/topics/information-communications-technology-supply-chain-security/sbom",
  "https://www.cisa.gov/securebydesign",
  "https://www.iso.org/standard/70918.html",
  "https://www.w3.org/TR/did-core",
].map(normalizeSlash);

const isPlaceholderLink = (link) => PLACEHOLDER_LINKS.includes(normalizeSlash(link));

// ── 工具函数 ──
// 去除所有空白字符（含空格/换行/制表符/全角空格）后的长度
function strippedLen(value) {
  return String(value || "").replace(/\s+/g, "").replace(/　/g, "").length;
}

function loadBaseline() {
  if (!fs.existsSync(baselinePath)) {
    return { exemptIds: new Set(), placeholderExempt: new Set(), fieldSnapshots: new Map(), missing: true };
  }
  const raw = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
  return {
    exemptIds: new Set(raw.exemptIds || []),
    placeholderExempt: new Set(raw.placeholderExempt || []),
    fieldSnapshots: new Map(Object.entries(raw.fieldSnapshots || {})),
    missing: false,
  };
}

// 遍历某类目录，返回 [{ id, entity, filePath }]
// 一个实体文件可能内嵌多个子实体（如 R0001.json 含 R0001 + R0001-001），
// 必须遍历文件内所有 key，否则子实体的准入下限/占位禁令/退化保护会全部漏检。
function loadDir(config) {
  const dir = path.join(breakDir, config.dir);
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const filePath = path.join(dir, file);
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    for (const [id, entity] of Object.entries(data)) {
      out.push({ id, entity, filePath });
    }
  }
  return out;
}

// ── 检查项 ──
function checkPlaceholderReferences(entity, id, config, baseline, issues) {
  if (baseline.placeholderExempt.has(id)) return; // 历史占位豁免
  const refs = entity.references || [];
  refs.forEach((ref, i) => {
    if (ref && ref.link && isPlaceholderLink(ref.link)) {
      issues.push({
        severity: "error",
        id,
        type: config.name,
        file: config.dir,
        rule: "placeholder_link",
        message: `references[${i}] 使用框架首页占位链接（禁止）：${ref.link}`,
      });
    }
  });
}

function checkKeywordsCount(entity, id, config, baseline, issues) {
  const isNew = !baseline.exemptIds.has(id);
  if (!isNew) return; // 历史条目豁免初始下限（退化由 detectDeterioration 管）
  const kws = entity.keywords || [];
  if (kws.length < config.keywordsMin) {
    issues.push({
      severity: "error",
      id,
      type: config.name,
      file: config.dir,
      rule: "keywords_too_few",
      message: `keywords 过少：${kws.length}（需 ≥${config.keywordsMin}）`,
    });
  }
}

function checkTextLength(entity, id, config, baseline, issues) {
  const isNew = !baseline.exemptIds.has(id);
  if (!isNew) return;
  for (const { field, minLen } of config.textFields) {
    const val = entity[field];
    if (val === undefined || val === null) continue; // 可选字段（如 limitation）缺失不报，由 schema 管
    const len = strippedLen(val);
    if (len < minLen) {
      issues.push({
        severity: "error",
        id,
        type: config.name,
        file: config.dir,
        rule: "text_too_short",
        message: `${field} 过短：${len} 字（需 ≥${minLen}，去空白字符）`,
      });
    }
  }
}

function checkCaseSourceQuality(entity, id, config, baseline, issues) {
  if (config.name !== "Case") return;
  const isNew = !baseline.exemptIds.has(id);
  const category = entity.category;
  const isHighValue = highValueCategories.has(category);
  const refs = entity.references || [];
  const sourceTypes = [...new Set(refs.map((r) => classifySource(r).sourceType))];
  const hasPrimary = sourceTypes.includes("primary");

  if (isHighValue) {
    // 高价值 Case：需 ≥2 源且含 ≥1 primary（新条目 error，历史条目也卡——历史高价值缺 primary 是 case-source-quality 已公示的技术债，这里对新条目强制）
    if (!hasPrimary) {
      issues.push({
        severity: isNew ? "error" : "warning",
        id,
        type: config.name,
        file: config.dir,
        rule: "high_value_missing_primary",
        message: `高价值案例(${category})缺 primary 一手来源（当前来源分级：${sourceTypes.join("/") || "无"}）`,
      });
    }
    if (isNew && refs.length < 2) {
      issues.push({
        severity: "error",
        id,
        type: config.name,
        file: config.dir,
        rule: "high_value_single_source",
        message: `高价值案例单源：${refs.length}（需 ≥2 源）`,
      });
    }
  } else if (isNew && refs.length < 1) {
    // 非高价值新 Case 至少 1 源（require-references 已管全库≥1，这里是新条目双保险，实际不会触发）
    issues.push({
      severity: "error",
      id,
      type: config.name,
      file: config.dir,
      rule: "no_reference",
      message: `无任何 references`,
    });
  }
}

// 内容退化保护：baseline 条目的 keywords/文本长度不得低于快照值
function detectDeterioration(entity, id, config, baseline, issues) {
  if (!baseline.exemptIds.has(id)) return; // 仅历史条目
  const snap = baseline.fieldSnapshots.get(id);
  if (!snap) return; // 快照缺失（可能是 baseline 生成后新增但误入 exemptIds，不报）
  const kws = entity.keywords || [];
  if (kws.length < snap.keywords) {
    issues.push({
      severity: "error",
      id,
      type: config.name,
      file: config.dir,
      rule: "deterioration_keywords",
      message: `内容退化：keywords 从 ${snap.keywords} 降至 ${kws.length}`,
    });
  }
  for (const { field } of config.textFields) {
    const snapLen = snap.fields?.[field];
    if (snapLen === undefined) continue;
    const len = strippedLen(entity[field]);
    if (len < snapLen) {
      issues.push({
        severity: "error",
        id,
        type: config.name,
        file: config.dir,
        rule: "deterioration_text",
        message: `内容退化：${field} 从 ${snapLen} 字降至 ${len} 字`,
      });
    }
  }
}

// ── 聚合 ──
function collectIssues(baseline) {
  const issues = [];
  const stats = { scanned: 0, newEntities: 0, byType: {} };
  for (const config of ENTITY_CONFIGS) {
    const entries = loadDir(config);
    stats.byType[config.name] = entries.length;
    for (const { id, entity } of entries) {
      stats.scanned++;
      if (!baseline.exemptIds.has(id)) stats.newEntities++;
      checkPlaceholderReferences(entity, id, config, baseline, issues);
      checkKeywordsCount(entity, id, config, baseline, issues);
      checkTextLength(entity, id, config, baseline, issues);
      checkCaseSourceQuality(entity, id, config, baseline, issues);
      detectDeterioration(entity, id, config, baseline, issues);
    }
  }
  return { issues, stats };
}

// ── 报告 ──
function renderReport(issues, stats) {
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  const lines = ["", "=== BREAK 新条目准入标准检查 ===", ""];
  lines.push(`扫描: ${stats.scanned} 条（${Object.entries(stats.byType).map(([k, v]) => `${v} ${k}`).join(" / ")}）`);
  lines.push(`新增条目（非 baseline）: ${stats.newEntities}`);
  lines.push(`error: ${errors.length}  warning: ${warnings.length}`);

  if (issues.length === 0) {
    lines.push("", "✅ 全部通过准入标准");
    return lines.join("\n");
  }

  // 按类型分组
  const byType = new Map();
  for (const iss of issues) {
    if (!byType.has(iss.type)) byType.set(iss.type, []);
    byType.get(iss.type).push(iss);
  }
  for (const [type, list] of byType) {
    lines.push("", `## ${type}（${list.length}）`);
    for (const iss of list.slice(0, 100)) {
      const tag = iss.severity === "error" ? "[error]" : "[warn]";
      lines.push(`${tag} ${iss.id} (${iss.file}/${iss.id}.json) — ${iss.message}`);
    }
    if (list.length > 100) lines.push(`... 还有 ${list.length - 100} 条`);
  }
  return lines.join("\n");
}

// ── baseline 生成 ──
function generateBaseline() {
  const exemptIds = [];
  const placeholderExempt = [];
  const fieldSnapshots = {};
  for (const config of ENTITY_CONFIGS) {
    const entries = loadDir(config);
    for (const { id, entity } of entries) {
      exemptIds.push(id);
      const kws = entity.keywords || [];
      const fields = {};
      for (const { field } of config.textFields) {
        if (entity[field] !== undefined && entity[field] !== null) {
          fields[field] = strippedLen(entity[field]);
        }
      }
      fieldSnapshots[id] = { keywords: kws.length, fields };
      // 标记含占位 link 的条目
      const refs = entity.references || [];
      if (refs.some((r) => r && r.link && isPlaceholderLink(r.link))) {
        placeholderExempt.push(id);
      }
    }
  }
  const baseline = {
    generatedAt: new Date().toISOString(),
    version: "2.39.0",
    description: "新条目准入 baseline 快照：exemptIds 豁免初始下限（防误伤历史），placeholderExempt 豁免占位禁令（历史技术债），fieldSnapshots 用于退化保护。新增条目不在 exemptIds 内，严格执行所有下限。",
    exemptIds,
    placeholderExempt,
    fieldSnapshots,
  };
  fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2) + "\n", "utf8");
  console.log(`已生成 ${baselinePath}`);
  console.log(`  exemptIds: ${exemptIds.length}`);
  console.log(`  placeholderExempt: ${placeholderExempt.length}`);
  console.log(`  fieldSnapshots: ${Object.keys(fieldSnapshots).length}`);
}

// ── main ──
function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--generate-baseline") || argv.includes("--regenerate")) {
    generateBaseline();
    return;
  }
  const auditOnly = argv.includes("--audit");
  const baseline = loadBaseline();
  if (baseline.missing) {
    console.log("\n⚠️ admission-baseline.json 不存在，先运行: node scripts/validate/admission.mjs --generate-baseline");
    if (!auditOnly) process.exit(1);
    return;
  }
  const { issues, stats } = collectIssues(baseline);
  console.log(renderReport(issues, stats));
  const errors = issues.filter((i) => i.severity === "error");
  if (!auditOnly && errors.length > 0) {
    console.log(`\n❌ 准入检查未通过：${errors.length} 个 error（门禁模式，已阻断）`);
    process.exit(1);
  }
}

main();
