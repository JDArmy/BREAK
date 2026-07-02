/**
 * 审计所有实体自由文本字段中嵌入的、格式错误或指向不存在的实体 ID 引用。
 *
 * 背景：check-entity-relations.mjs 只校验结构化关系字段数组（如 avoidances/relatedRisks），
 * 不校验自由文本字段（definition/description/limitation/influence/summary/usageExample 等）里
 * 用自然语言提及的实体 ID。这类"文本里写错 ID"的笔误（如 A0010-003 写成 A010-003）无法被现有脚本捕获。
 *
 * 本脚本扫描 src/BREAK/ 下所有实体的自由文本字段，找两类问题：
 *   A类 - 疑似笔误（位数不足）：前缀 + 3位数字 + -NNN（标准是 4位数字 + -NNN）
 *   B类 - 引用不存在的实体：格式正确的 ID 不在合法 ID 集合中
 *
 * 只读审计，不修改任何数据。发现问题返回退出码 1，否则 0。
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, basename } from "node:path";

const ROOT = new URL("../../src/BREAK/", import.meta.url).pathname;

// ── 实体目录（含 avoidance-categories；basic-info 非实体不入此列）──
const ENTITY_DIRS = [
  "risks",
  "avoidances",
  "attack-tools",
  "threat-actors",
  "terms",
  "cases",
  "business-scenes",
  "avoidance-categories",
];

// ── 正则 ──
// 标准格式：前缀 + 4位数字 + 可选 -NNN。BS 是 2 位，单列正则。
// 前缀按长度降序排列，确保 AT 先于 A、TA 先于 T。
const STANDARD_RE = /\b(?:AT|TA|R|A|T|C)\d{4}(?:-\d{3})?\b/g;
const BS_STANDARD_RE = /\bBS\d{2}\b/g;
// 笔误正则：前缀 + 3位数字 + -NNN（标准是 4位+NNN，3位+NNN 极可能是少写一位）。
// BS 不纳入笔误正则（2 位是合法）。
// 笔误正则1：前缀 + 3位数字 + -NNN（标准是 4位+NNN，3位+NNN 极可能是少写一位）。
// BS 不纳入笔误正则（2 位是合法）。
const TYPO_RE = /\b(?:AT|TA|R|A|T|C)\d{3}-\d{3}\b/g;
// 笔误正则2：前缀 + 3位数字（无子编号）。比带子编号的更易误报（版本号、年份尾、缩写等），
// 因此扫描时记录，但仅在「补零成4位后恰好是合法ID」时才作为强信号报出，其余降级为弱信号单独列出。
const TYPO_BARE_RE = /\b(?:AT|TA|R|A|T|C)\d{3}\b/g;

// ── 排除的字段名（路径末段）──
// 这些字段的字符串值要么是结构化 ID 引用（由 check-entity-relations 管），要么是非文本元数据。
const EXCLUDE_FIELDS = new Set([
  "title",
  "category",
  "complexity",
  "effectiveness",
  "updated",
  "incidentTime",
  "link", // references[].link 是 URL
  "key", // 结构化关系对象数组里的 ID 字段（relatedAvoidances[].key 等）
  "relation", // 结构化关系类型枚举
  "keyword", // avoidanceCategories 的 keyword
  "aliases", // 数组，但元素是别名不是 ID；由 keywords 体系管
  "keywords", // 数组，由 keywords 体系管
]);

// references 数组整体跳过（title 与 link 都不扫：title 是来源标题、link 是 URL）
const SKIP_ARRAY_KEYS = new Set(["references"]);

// ── 收集所有合法实体 ID ──
function collectLegalIds() {
  const legal = new Set();
  const fileOf = new Map(); // id -> 所属文件（用于报错定位时反查）
  for (const dir of ENTITY_DIRS) {
    const dirPath = join(ROOT, dir);
    let entries;
    try {
      entries = readdirSync(dirPath);
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.endsWith(".json")) continue;
      const filePath = join(dirPath, entry);
      let obj;
      try {
        obj = JSON.parse(readFileSync(filePath, "utf8"));
      } catch (e) {
        continue;
      }
      if (obj && typeof obj === "object") {
        for (const topKey of Object.keys(obj)) {
          legal.add(topKey);
          fileOf.set(topKey, filePath);
        }
      }
    }
  }
  return { legal, fileOf };
}

// ── 递归扫描，收集所有字符串值及其路径 ──
// pathSegs 是字符串数组，描述从顶层 key 到当前值的路径。
function walk(value, pathSegs, out) {
  if (typeof value === "string") {
    out.push({ path: pathSegs, value });
    return;
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      walk(value[i], [...pathSegs, String(i)], out);
    }
    return;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      walk(v, [...pathSegs, k], out);
    }
  }
}

// 提取上下文片段：匹配位置前后各 ~25 字符。
function contextSnippet(text, matchStr) {
  const idx = text.indexOf(matchStr);
  if (idx === -1) return matchStr;
  const start = Math.max(0, idx - 25);
  const end = Math.min(text.length, idx + matchStr.length + 25);
  let snippet = text.slice(start, end);
  if (start > 0) snippet = "…" + snippet;
  if (end < text.length) snippet = snippet + "…";
  return snippet.replace(/\s+/g, " ");
}

function isExcluded(pathSegs) {
  // 路径末段在排除集合里
  const last = pathSegs[pathSegs.length - 1];
  if (EXCLUDE_FIELDS.has(last)) return true;
  // 路径中任意一段是 references（跳过整个 references 数组）
  for (const seg of pathSegs) {
    if (SKIP_ARRAY_KEYS.has(seg)) return true;
  }
  return false;
}

function main() {
  const { legal } = collectLegalIds();

  /** findings[type] = [{ file, entityId, field, badId, context }] */
  const findings = { typo: [], dangling: [] };

  for (const dir of ENTITY_DIRS) {
    const dirPath = join(ROOT, dir);
    let entries;
    try {
      entries = readdirSync(dirPath);
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.endsWith(".json")) continue;
      const filePath = join(dirPath, entry);
      let obj;
      try {
        obj = JSON.parse(readFileSync(filePath, "utf8"));
      } catch {
        continue;
      }
      if (!obj || typeof obj !== "object") continue;
      const relFile = filePath.replace(ROOT, "src/BREAK/");

      for (const [topKey, entityData] of Object.entries(obj)) {
        if (!entityData || typeof entityData !== "object") continue;
        const strings = [];
        walk(entityData, [topKey], strings);

        for (const { path, value } of strings) {
          if (isExcluded(path)) continue;

          // A类：笔误（3位数字 + -NNN）
          const typoRe = new RegExp(TYPO_RE.source, "g");
          let m;
          while ((m = typoRe.exec(value)) !== null) {
            const matched = m[0];
            // 笔误正则匹配到的可能恰好也是合法 ID（如某个真实 3 位前缀场景不存在，所以一定是笔误）
            // 但仍需检查：若 matched 恰好等于某合法 ID（理论上不会，因为合法都是4位），不报
            // 子编号笔误：A016-002 -> A0016-002（前缀后补一位0，保留 -NNN）
            const typoPrefix = matched.match(/^[A-Za-z]+/)[0];
            const typoRest = matched.slice(typoPrefix.length); // 形如 016-002
            const typoDigits = typoRest.split("-")[0];
            const typoSub = typoRest.slice(typoDigits.length); // 形如 -002
            const typoPadded = typoPrefix + "0" + typoDigits + typoSub;
            const typoSuggested = legal.has(typoPadded) ? typoPadded : undefined;
            findings.typo.push({
              file: relFile,
              entityId: topKey,
              field: path.join("."),
              badId: matched,
              context: contextSnippet(value, matched),
              suggested: typoSuggested,
            });
          }

          // B类：标准格式但 ID 不存在
          // 先用标准正则（4位）扫，再用 BS 正则扫
          const stdRe = new RegExp(STANDARD_RE.source, "g");
          while ((m = stdRe.exec(value)) !== null) {
            const matched = m[0];
            if (!legal.has(matched)) {
              findings.dangling.push({
                file: relFile,
                entityId: topKey,
                field: path.join("."),
                badId: matched,
                context: contextSnippet(value, matched),
              });
            }
          }
          const bsRe = new RegExp(BS_STANDARD_RE.source, "g");
          while ((m = bsRe.exec(value)) !== null) {
            const matched = m[0];
            if (!legal.has(matched)) {
              findings.dangling.push({
                file: relFile,
                entityId: topKey,
                field: path.join("."),
                badId: matched,
                context: contextSnippet(value, matched),
              });
            }
          }

          // A类（裸3位笔误）：前缀+3位数字，无子编号。仅当「补零成4位后恰好是合法ID」且
          // 「被中/英文括号包裹（形如（A018）/ (A018)）」时报出。括号是 ID 引用的强信号，
          // 可排除 C114论坛、版本号、缩写等专有名词噪声（如 C0608 的 "C114论坛" 是通信社区名）。
          // 带 -NNN 子编号的笔误由 TYPO_RE 覆盖（子编号本身就是强信号，无需括号约束）。
          const bareRe = new RegExp(TYPO_BARE_RE.source, "g");
          while ((m = bareRe.exec(value)) !== null) {
            const matched = m[0];
            const afterIdx = m.index + matched.length;
            const nextChar = value[afterIdx];
            // 后面紧跟 -数字 的，由带子编号的 TYPO_RE 覆盖，跳过避免重复。
            if (nextChar === "-" && /\d/.test(value[afterIdx + 1] ?? "")) continue;
            // 括号包裹约束：前一个字符必须是 ( 或 （，后一个字符必须是 ) 或 ）
            const prevChar = value[m.index - 1];
            if (!/[(（]/.test(prevChar ?? "")) continue;
            if (!/[)）]/.test(nextChar ?? "")) continue;
            // 补零成4位：A031 -> A0031
            const prefix = matched.match(/^[A-Za-z]+/)[0];
            const digits = matched.slice(prefix.length);
            const padded = prefix + "0" + digits;
            if (legal.has(padded)) {
              findings.typo.push({
                file: relFile,
                entityId: topKey,
                field: path.join("."),
                badId: matched,
                context: contextSnippet(value, matched),
                suggested: padded,
              });
            }
          }
        }
      }
    }
  }

  // ── 输出 ──
  const out = [];
  const totalTypo = findings.typo.length;
  const totalDangling = findings.dangling.length;

  out.push("=".repeat(78));
  out.push("文本字段嵌入实体 ID 引用审计报告");
  out.push("=".repeat(78));
  out.push(`合法实体 ID 总数：${legal.size}`);
  out.push("");

  // A类
  out.push("─".repeat(78));
  out.push(`【A类】疑似笔误（位数不足：前缀+3位数字，或 +-NNN 子编号；共 ${totalTypo} 处）`);
  out.push("─".repeat(78));
  if (totalTypo === 0) {
    out.push("  无");
  } else {
    // 按文件聚合
    const byFile = new Map();
    for (const f of findings.typo) {
      if (!byFile.has(f.file)) byFile.set(f.file, []);
      byFile.get(f.file).push(f);
    }
    for (const [file, items] of [...byFile.entries()].sort()) {
      out.push(`\n  文件：${file}`);
      for (const it of items) {
        out.push(`    [实体 ${it.entityId}] 字段 ${it.field}`);
        out.push(`      错误 ID：${it.badId}${it.suggested ? `  →  建议修复：${it.suggested}` : ""}`);
        out.push(`      上下文：${it.context}`);
      }
    }
  }
  out.push("");

  // B类
  out.push("─".repeat(78));
  out.push(`【B类】引用不存在的实体（格式正确但 ID 不在合法集合，共 ${totalDangling} 处）`);
  out.push("─".repeat(78));
  if (totalDangling === 0) {
    out.push("  无");
  } else {
    const byFile = new Map();
    for (const f of findings.dangling) {
      if (!byFile.has(f.file)) byFile.set(f.file, []);
      byFile.get(f.file).push(f);
    }
    for (const [file, items] of [...byFile.entries()].sort()) {
      out.push(`\n  文件：${file}`);
      for (const it of items) {
        out.push(`    [实体 ${it.entityId}] 字段 ${it.field}`);
        out.push(`      不存在 ID：${it.badId}`);
        out.push(`      上下文：${it.context}`);
      }
    }
  }
  out.push("");
  out.push("=".repeat(78));
  out.push(`汇总：A类笔误 ${totalTypo} 处 | B类悬空 ${totalDangling} 处 | 总计 ${totalTypo + totalDangling} 处`);
  out.push("=".repeat(78));

  console.log(out.join("\n"));

  process.exit(totalTypo + totalDangling > 0 ? 1 : 0);
}

main();
