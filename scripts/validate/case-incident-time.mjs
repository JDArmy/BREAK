#!/usr/bin/env node
/**
 * 验证 Case 的 incidentTime 字段：格式、年份合理性、覆盖率统计
 *
 * Case 定义为"真实发生的具体事件"，时间是案例可信度的一部分。本脚本：
 * 1. 校验 incidentTime 格式（YYYY / YYYY-MM / YYYY-MM-DD）—— 与 schema 一致，这里做冗余硬检测
 * 2. 校验年份合理性（2000 ~ 当前年，不允许未来日期、不允许早于 2000）
 * 3. 校验 YYYY-MM-DD 形式的日历合法性（如 2023-02-30 非法）
 * 4. 统计覆盖率（总数 / 有 incidentTime / 缺失），按 category 分组，输出缺失清单
 *
 * 退出码：
 *   - 格式/年份/日历非法 → 始终 exit 1（硬阻断）
 *   --strict（接入 validate:data）：缺 incidentTime 且不在 allowlist → exit 1
 *   非 strict：缺 incidentTime 仅警告 exit 0
 *
 * allowlist（case-incident-time-allowlist.json）：经多渠道核实仍无法推断时间的
 * 历史 case ID 集合。这些 case 缺时间被允许（内容仍有价值），但会在报告中显式列出
 * 便于后续追踪。新增 case 不得进 allowlist——新案例必须有时间。
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const casesDir = path.join(__dirname, "../../src/BREAK/cases");
const allowlistPath = path.join(__dirname, "case-incident-time-allowlist.json");
const STRICT = process.argv.includes("--strict");

// 读 allowlist（允许缺失文件 → 空集）
let allowlist = new Set();
if (fs.existsSync(allowlistPath)) {
  try {
    const arr = JSON.parse(fs.readFileSync(allowlistPath, "utf8"));
    if (Array.isArray(arr)) allowlist = new Set(arr);
  } catch {}
}

const FORMAT_RE = /^\d{4}(-\d{2}(-\d{2})?)?$/;
const NOW = new Date();
const CURRENT_YEAR = NOW.getFullYear();
const CURRENT_YMD =
  `${NOW.getFullYear()}-${String(NOW.getMonth() + 1).padStart(2, "0")}-${String(NOW.getDate()).padStart(2, "0")}`;
const MIN_YEAR = 2000;

// 校验日历合法性（仅对 YYYY-MM-DD）
function isValidCalendar(dateStr) {
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return true; // YYYY / YYYY-MM 不校验日历
  const [, y, mo, d] = m;
  const dt = new Date(Number(y), Number(mo) - 1, Number(d));
  return (
    dt.getFullYear() === Number(y) &&
    dt.getMonth() === Number(mo) - 1 &&
    dt.getDate() === Number(d)
  );
}

// 校验年份/日期不未来
function isNotFuture(dateStr) {
  // 取 YYYY-MM-01 与当前比较（YYYY-MM 形式按月初比；YYYY 按年比）
  if (/^\d{4}$/.test(dateStr)) return Number(dateStr) <= CURRENT_YEAR;
  const ym = dateStr.slice(0, 7);
  return ym <= CURRENT_YMD.slice(0, 7);
}

const files = fs.readdirSync(casesDir).filter((f) => /^C\d{4}\.json$/.test(f));

let total = 0;
let hasTime = 0;
const missing = [];
const invalid = [];
const byCat = {};
const missingByCat = {};

for (const file of files) {
  const fp = path.join(casesDir, file);
  const data = JSON.parse(fs.readFileSync(fp, "utf8"));
  const id = Object.keys(data)[0];
  const c = data[id];
  const cat = c.category || "(unknown)";
  total++;
  byCat[cat] = (byCat[cat] || 0) + 1;

  const t = c.incidentTime;
  if (!t || !String(t).trim()) {
    missing.push({ id, cat });
    missingByCat[cat] = (missingByCat[cat] || 0) + 1;
    continue;
  }
  hasTime++;

  // 格式
  if (!FORMAT_RE.test(t)) {
    invalid.push({ id, cat, t, reason: `格式非法（需 YYYY/YYYY-MM/YYYY-MM-DD）` });
    continue;
  }
  // 年份下限
  const year = Number(t.slice(0, 4));
  if (year < MIN_YEAR) {
    invalid.push({ id, cat, t, reason: `年份 ${year} 早于 ${MIN_YEAR}` });
    continue;
  }
  // 未来
  if (!isNotFuture(t)) {
    invalid.push({ id, cat, t, reason: `日期晚于当前（${CURRENT_YMD}）` });
    continue;
  }
  // 日历合法性
  if (!isValidCalendar(t)) {
    invalid.push({ id, cat, t, reason: `非法日历日期` });
  }
}

console.log(`\n=== Case incidentTime 校验 ===\n`);
console.log(`总计 Case: ${total}`);
console.log(`有 incidentTime: ${hasTime}`);
console.log(`缺失 incidentTime: ${missing.length}`);
console.log(`覆盖率: ${((hasTime / total) * 100).toFixed(2)}%\n`);

console.log(`按 category 覆盖：`);
const cats = Object.keys(byCat).sort();
for (const cat of cats) {
  const miss = missingByCat[cat] || 0;
  const tot = byCat[cat];
  const pct = (((tot - miss) / tot) * 100).toFixed(1);
  console.log(`  ${cat.padEnd(28)} ${tot - miss}/${tot}（${pct}%）`);
}

if (invalid.length) {
  console.log(`\n❌ incidentTime 格式/年份非法 ${invalid.length} 个：`);
  for (const x of invalid) console.log(`  - ${x.id} [${x.cat}] "${x.t}" — ${x.reason}`);
}

if (missing.length) {
  const inAllow = missing.filter((x) => allowlist.has(x.id));
  const offAllow = missing.filter((x) => !allowlist.has(x.id));
  const tag = (x) => (allowlist.has(x.id) ? " [allowlist]" : "");
  console.log(`\n⚠ 缺失 incidentTime ${missing.length} 个：`);
  for (const x of missing) console.log(`  - ${x.id} [${x.cat}]${tag(x)}`);
  if (inAllow.length) {
    console.log(
      `\n  其中 ${inAllow.length} 个在 allowlist（经核实无法推断时间，允许缺失）：`
    );
    for (const x of inAllow) console.log(`    - ${x.id} [${x.cat}]`);
  }
}

if (invalid.length) {
  console.log(`\n❌ incidentTime 存在非法值，校验失败`);
  process.exit(1);
}

if (STRICT) {
  const offAllow = missing.filter((x) => !allowlist.has(x.id));
  if (offAllow.length) {
    console.log(
      `\n❌ --strict：以下 ${offAllow.length} 个 case 缺 incidentTime 且不在 allowlist：`
    );
    for (const x of offAllow) console.log(`  - ${x.id} [${x.cat}]`);
    console.log(`\n补齐时间后重试，或在 case-incident-time-allowlist.json 中登记（仅限经多渠道核实仍无法推断时间的 case）。`);
    process.exit(1);
  }
}

if (!missing.length && !invalid.length) {
  console.log(`\n✅ 所有 Case 均有合法 incidentTime`);
} else if (!invalid.length) {
  if (STRICT) {
    console.log(
      `\n✅ incidentTime 格式/年份全部合法；缺失项均已纳入 allowlist`
    );
  } else {
    console.log(
      `\n✅ incidentTime 格式/年份全部合法（${missing.length} 个缺失已在上方列出，非阻断）`
    );
  }
}
