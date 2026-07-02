/**
 * 测量实体自由文本字段中嵌入的其他实体 ID 引用情况（纯测量，只读）。
 *
 * 测量口径：
 *  - 自由文本字段仅限：definition / description / limitation / influence / summary / usageExample
 *    （与任务定义一致；结构化关系字段 avoidances/relatedRisks/relatedAvoidances/
 *     relatedAttackTools/relatedThreatActors/relatedBusinessScenes/directCauseRisks/
 *     indirectSupportRisks/buildAttackTools/useAttackTools 等不算文本引用）
 *  - 仅统计"合法实体 ID"（在 src/BREAK/ 下任一 JSON 顶层 key 中存在的 ID）。
 *  - 排除自引用（实体引用自己的 ID 不计）。
 *  - 去重：同一实体在文本里引用同一 ID 多次，按 1 次计（记录首次命中的字段）。
 *  - 子风险 R0001-001 引用父风险 R0001 算合法引用（不同实体）。
 *
 * 产出：
 *  (a) 按实体类型的引用密度
 *  (b) 引用密度分布（0 / 1-2 / 3-5 / 6+）
 *  (c) 引用方向矩阵（引用方 × 被引用方）
 *  (d) 引用密度最低（=0）的实体清单
 *  (e) 结构化关系已引用但文本未提及的"潜在缺失"统计
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("../../src/BREAK/", import.meta.url).pathname;

// ── 实体目录 ──
const ENTITY_DIRS = [
  "risks",
  "avoidances",
  "attack-tools",
  "threat-actors",
  "terms",
  "cases",
  "business-scenes",
];

// 自由文本字段（仅这些字段的字符串值参与文本引用扫描）
const TEXT_FIELDS = new Set([
  "definition",
  "description",
  "limitation",
  "influence",
  "summary",
  "usageExample",
]);

// 实体类型标签（中文，用于输出）
const TYPE_LABEL = {
  risk: "Risk(风险)",
  avoidance: "Avoidance(规避)",
  attackTool: "AttackTool(攻击工具)",
  threatActor: "ThreatActor(威胁行为者)",
  term: "Term(术语)",
  case: "Case(案例)",
};

// 6 类纳入统计的实体类型顺序
const STAT_TYPES = ["risk", "avoidance", "attackTool", "threatActor", "term", "case"];

// ── 正则（与 audit-text-id-refs.mjs 一致）──
const STANDARD_RE = /\b(?:AT|TA|R|A|T|C)\d{4}(?:-\d{3})?\b/g;
const BS_STANDARD_RE = /\bBS\d{2}\b/g;

// ── ID 前缀 → 类型（最长优先：AT 先于 A，TA 先于 T）──
function typeOfId(id) {
  if (id.startsWith("BS")) return "businessScene";
  if (id.startsWith("AT")) return "attackTool";
  if (id.startsWith("TA")) return "threatActor";
  if (id.startsWith("R")) return "risk";
  if (id.startsWith("A")) return "avoidance";
  if (id.startsWith("T")) return "term";
  if (id.startsWith("C")) return "case";
  return null;
}

// ── 收集所有合法实体 ID 及其类型 ──
function collectLegalIds() {
  const legal = new Set(); // 合法 ID 集合
  const typeOf = new Map(); // id -> type
  // 同时收集每个实体的数据，供后续扫描复用
  // entities: { type -> [{ id, dir, file, data }] }
  const entities = { risk: [], avoidance: [], attackTool: [], threatActor: [], term: [], case: [], businessScene: [] };

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
      for (const [topKey, entityData] of Object.entries(obj)) {
        const t = typeOfId(topKey);
        if (!t) continue;
        legal.add(topKey);
        typeOf.set(topKey, t);
        if (entities[t]) {
          entities[t].push({ id: topKey, dir, file: filePath, data: entityData });
        }
      }
    }
  }
  return { legal, typeOf, entities };
}

// ── 递归收集指定字段名的字符串值 ──
// 只收集路径末段名在 TEXT_FIELDS 里的字符串（自由文本字段）。
// pathSegs: 从顶层实体 key 开始的路径段数组。
function walkTextFields(value, pathSegs, out) {
  if (typeof value === "string") {
    // 路径至少 2 段：[entityId, fieldName, ...]
    // 末段或路径中存在 TEXT_FIELDS 字段名即收集（嵌套也按末段判断）
    const last = pathSegs[pathSegs.length - 1];
    if (TEXT_FIELDS.has(last)) {
      out.push({ field: last, value });
    }
    return;
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      walkTextFields(value[i], [...pathSegs, String(i)], out);
    }
    return;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      walkTextFields(v, [...pathSegs, k], out);
    }
  }
}

// ── 提取文本里所有合法实体 ID（去重，保留首次字段）──
// 返回 Map: referencedId -> { field, refType }
function extractTextRefs(text, legal, typeOf, selfId) {
  const refs = new Map();
  const tryMatch = (re) => {
    const r = new RegExp(re.source, "g");
    let m;
    while ((m = r.exec(text)) !== null) {
      const id = m[0];
      if (!legal.has(id)) continue;
      if (id === selfId) continue; // 排除自引用
      if (refs.has(id)) continue; // 去重，保留首次
      refs.set(id, { field: null, refType: typeOf.get(id) || typeOfId(id) });
    }
  };
  tryMatch(STANDARD_RE);
  tryMatch(BS_STANDARD_RE);
  return refs;
}

// ── 提取结构化关系字段引用的 ID 集合 ──
// 字段形状兼容：字符串数组（["A0015"]）或对象数组（[{key:"A0015",...}]）
function extractStructRefs(entityData, type) {
  const set = new Set();
  const add = (v) => {
    if (typeof v === "string") set.add(v);
    else if (v && typeof v === "object" && typeof v.key === "string") set.add(v.key);
  };
  const fieldsByType = {
    risk: ["avoidances"],
    avoidance: ["relatedAvoidances"],
    attackTool: ["directCauseRisks", "indirectSupportRisks", "avoidances"],
    threatActor: ["buildAttackTools", "useAttackTools", "directCauseRisks", "indirectSupportRisks"],
    term: ["relatedRisks", "relatedAvoidances", "relatedAttackTools", "relatedThreatActors", "relatedBusinessScenes"],
    case: ["relatedRisks", "relatedAttackTools", "relatedThreatActors"],
  };
  const fields = fieldsByType[type] || [];
  for (const f of fields) {
    const v = entityData[f];
    if (Array.isArray(v)) {
      for (const item of v) add(item);
    }
  }
  return set;
}

// ── 中位数 ──
function median(arr) {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

// ── 主流程 ──
function main() {
  const { legal, typeOf, entities } = collectLegalIds();

  // 每个实体的测量结果
  // stats: { type -> [{ id, title, textRefCount, textRefs: Map, structRefs: Set }] }
  const stats = {};
  for (const t of STAT_TYPES) stats[t] = [];

  for (const t of STAT_TYPES) {
    for (const { id, data } of entities[t]) {
      const title = typeof data.title === "string" ? data.title : "";
      // 文本引用
      const strings = [];
      walkTextFields(data, [id], strings);
      let textRefs = new Map();
      for (const { value } of strings) {
        const r = extractTextRefs(value, legal, typeOf, id);
        for (const [rid, info] of r) {
          if (!textRefs.has(rid)) {
            textRefs.set(rid, { field: null, refType: info.refType });
          }
        }
      }
      // 结构化引用
      const structRefs = extractStructRefs(data, t);

      stats[t].push({
        id,
        title,
        textRefCount: textRefs.size,
        textRefs,
        structRefs,
      });
    }
  }

  // ── (a) 按实体类型的引用密度 ──
  const out = [];
  out.push("=".repeat(90));
  out.push("BREAK 实体文本字段互引用测量报告");
  out.push("=".repeat(90));
  out.push(`合法实体 ID 总数：${legal.size}`);
  out.push(`自由文本字段范围：${[...TEXT_FIELDS].join(" / ")}`);
  out.push("");

  out.push("─".repeat(90));
  out.push("(a) 按实体类型的引用密度");
  out.push("─".repeat(90));
  out.push(
    "类型".padEnd(22) +
    "总数".padStart(6) +
    "有引用数".padStart(10) +
    "占比".padStart(10) +
    "引用总数".padStart(10) +
    "平均/实体".padStart(12) +
    "中位数".padStart(10),
  );
  out.push("-".repeat(90));

  const densitySummary = {}; // type -> { total, withRef, refSum, counts:[] }
  for (const t of STAT_TYPES) {
    const arr = stats[t];
    const total = arr.length;
    const counts = arr.map((x) => x.textRefCount);
    const withRef = arr.filter((x) => x.textRefCount > 0).length;
    const refSum = counts.reduce((a, b) => a + b, 0);
    const avg = total > 0 ? refSum / total : 0;
    const med = median(counts);
    densitySummary[t] = { total, withRef, refSum, counts };
    out.push(
      TYPE_LABEL[t].padEnd(22) +
        String(total).padStart(6) +
        String(withRef).padStart(10) +
        (total > 0 ? ((withRef / total) * 100).toFixed(1) + "%" : "-").padStart(10) +
        String(refSum).padStart(10) +
        avg.toFixed(2).padStart(12) +
        med.toFixed(1).padStart(10),
    );
  }
  out.push("");

  // ── (b) 引用密度分布 ──
  out.push("─".repeat(90));
  out.push("(b) 引用密度分布（按文本引用数 0 / 1-2 / 3-5 / 6+ 四档）");
  out.push("─".repeat(90));
  out.push(
    "类型".padEnd(22) +
      "0".padStart(8) +
      "1-2".padStart(8) +
      "3-5".padStart(8) +
      "6+".padStart(8),
  );
  out.push("-".repeat(90));
  for (const t of STAT_TYPES) {
    const counts = densitySummary[t].counts;
    const b0 = counts.filter((c) => c === 0).length;
    const b12 = counts.filter((c) => c >= 1 && c <= 2).length;
    const b35 = counts.filter((c) => c >= 3 && c <= 5).length;
    const b6 = counts.filter((c) => c >= 6).length;
    out.push(
      TYPE_LABEL[t].padEnd(22) +
        String(b0).padStart(8) +
        String(b12).padStart(8) +
        String(b35).padStart(8) +
        String(b6).padStart(8),
    );
  }
  out.push("");

  // ── (c) 引用方向矩阵 ──
  out.push("─".repeat(90));
  out.push('(c) 引用方向矩阵（行=引用方类型，列=被引用方类型；按"实体 A 文本引用了实体 B"计1次，去重）');
  out.push("─".repeat(90));
  const refTypes = ["risk", "avoidance", "attackTool", "threatActor", "term", "case", "businessScene"];
  const refLabels = {
    risk: "Risk",
    avoidance: "Avoid",
    attackTool: "AT",
    threatActor: "TA",
    term: "Term",
    case: "Case",
    businessScene: "BS",
  };
  // header
  let header = "引用方\\被引用方".padEnd(20);
  for (const rt of refTypes) header += refLabels[rt].padStart(9);
  header += "合计".padStart(10);
  out.push(header);
  out.push("-".repeat(90));
  const matrix = {}; // fromType -> { toType -> count }
  const rowTotals = {};
  for (const t of STAT_TYPES) {
    matrix[t] = {};
    let rowTotal = 0;
    for (const rt of refTypes) matrix[t][rt] = 0;
    for (const { textRefs } of stats[t]) {
      for (const [, info] of textRefs) {
        const rt = info.refType;
        if (rt && matrix[t][rt] !== undefined) {
          matrix[t][rt]++;
          rowTotal++;
        }
      }
    }
    rowTotals[t] = rowTotal;
    let line = TYPE_LABEL[t].replace(/\(.*\)/, "").padEnd(20);
    for (const rt of refTypes) line += String(matrix[t][rt]).padStart(9);
    line += String(rowTotal).padStart(10);
    out.push(line);
  }
  out.push("");

  // ── (d) 引用密度最低（=0）的实体清单 ──
  out.push("─".repeat(90));
  out.push("(d) 文本引用数 = 0 的实体清单（每类最多列 30 个，超过注明总数）");
  out.push("─".repeat(90));
  for (const t of STAT_TYPES) {
    const zeros = stats[t].filter((x) => x.textRefCount === 0);
    if (zeros.length === 0) {
      out.push(`\n【${TYPE_LABEL[t]}】无 0 引用实体（全部都有文本引用）。`);
      continue;
    }
    out.push(`\n【${TYPE_LABEL[t]}】0 引用实体共 ${zeros.length} 个：`);
    const show = zeros.slice(0, 30);
    for (const z of show) {
      out.push(`  ${z.id}  ${z.title}`);
    }
    if (zeros.length > 30) {
      out.push(`  ...（仅列前 30 个，共 ${zeros.length} 个）`);
    }
  }
  out.push("");

  // ── (e) 结构化关系已引用但文本未提及的"潜在缺失"统计 ──
  out.push("─".repeat(90));
  out.push('(e) 结构化关系引用了、但文本字段完全未提及的"潜在缺失"统计（按类型汇总）');
  out.push("─".repeat(90));
  out.push("口径：对每个实体，取其结构化关系字段引用的 ID 集合，减去文本字段引用的 ID 集合，");
  out.push('      差集大小即为"结构化有、文本无"的实体数。下表为各类型实体的汇总。');
  out.push("");
  out.push(
    "类型".padEnd(22) +
      "实体数".padStart(8) +
      "有缺失的实体数".padStart(14) +
      "缺失ID总数".padStart(12) +
      "平均缺失/实体".padStart(14) +
      "中位缺失".padStart(10),
  );
  out.push("-".repeat(90));
  let grandMissingEntities = 0;
  let grandMissingIds = 0;
  for (const t of STAT_TYPES) {
    const arr = stats[t];
    let missingEntityCount = 0;
    let missingIdTotal = 0;
    const missingCounts = [];
    for (const { textRefs, structRefs } of arr) {
      let missing = 0;
      for (const sid of structRefs) {
        if (!textRefs.has(sid)) missing++;
      }
      if (missing > 0) {
        missingEntityCount++;
        missingIdTotal += missing;
      }
      missingCounts.push(missing);
    }
    grandMissingEntities += missingEntityCount;
    grandMissingIds += missingIdTotal;
    const avg = arr.length > 0 ? missingIdTotal / arr.length : 0;
    const med = median(missingCounts);
    out.push(
      TYPE_LABEL[t].padEnd(22) +
        String(arr.length).padStart(8) +
        String(missingEntityCount).padStart(14) +
        String(missingIdTotal).padStart(12) +
        avg.toFixed(2).padStart(14) +
        med.toFixed(1).padStart(10),
    );
  }
  out.push("-".repeat(90));
  out.push(
    "合计".padEnd(22) +
      "-".padStart(8) +
      String(grandMissingEntities).padStart(14) +
      String(grandMissingIds).padStart(12),
  );
  out.push("");

  out.push("=".repeat(90));
  // 总体一句话
  const allCounts = STAT_TYPES.flatMap((t) => stats[t].map((x) => x.textRefCount));
  const allTotal = allCounts.length;
  const allWithRef = allCounts.filter((c) => c > 0).length;
  const allRefSum = allCounts.reduce((a, b) => a + b, 0);
  out.push(
    `总体：6 类实体共 ${allTotal} 个，其中 ${allWithRef} 个（${((allWithRef / allTotal) * 100).toFixed(1)}%）文本字段至少引用 1 个其他实体，文本引用总计 ${allRefSum} 次（去重后），平均每实体 ${(allRefSum / allTotal).toFixed(2)} 次。`,
  );
  out.push("=".repeat(90));

  console.log(out.join("\n"));
}

main();
