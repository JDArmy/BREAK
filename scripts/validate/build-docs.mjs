#!/usr/bin/env node
/**
 * 将 docs/{zh-CN,en}/*.md 编译为结构化 JSON，输出到 public/data/docs-{lang}.json
 * 供前端 DocsView 异步加载使用。
 *
 * - frontmatter 用正则自解析（title/category/order/slug）
 * - 正文用 marked 渲染为 HTML，再用 DOMPurify（jsdom 提供 window）清洗防 XSS
 * - heading 注入 id 锚点，供文档内目录跳转
 *
 * 用法：node scripts/validate/build-docs.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, unlinkSync } from "fs";
import { resolve, dirname, basename } from "path";
import { fileURLToPath } from "url";
import { marked } from "marked";
import { JSDOM } from "jsdom";
import createDOMPurify from "dompurify";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const DOCS_DIR = resolve(ROOT, "docs");
const OUTPUT_DIR = resolve(ROOT, "public/data");

const LANGS = ["zh-CN", "en"];

// marked 配置：GFM 表格 / 任务列表
marked.setOptions({ gfm: true, breaks: false });

// heading 注入 id 锚点：保留中文/字母数字，其余转 -
const renderer = new marked.Renderer();
renderer.heading = ({ tokens, depth }) => {
  const text = tokens.map((t) => t.text ?? "").join("");
  const slug = String(text)
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/g, "") // 去掉内联标签残留
    .replace(/[\s]+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "") // 仅保留字母数字连字符（含中文，\p{L} 覆盖 CJK）
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `<h${depth} id="${slug}">${text}</h${depth}>`;
};
marked.use({ renderer });

// DOMPurify 需要真实 DOM；jsdom 提供 window。允许 class（代码高亮/样式钩子）
const { window } = new JSDOM("");
const DOMPurify = createDOMPurify(window);
const SANITIZE_CONFIG = {
  USE_PROFILES: { html: true },
  ADD_ATTR: ["target", "rel", "id", "class"],
};

/**
 * 解析 frontmatter（--- 包裹的 YAML 子集，仅取 title/category/order/slug 四个简单标量）
 * 返回 { frontmatter, body }；无 frontmatter 时 frontmatter 为 {}
 */
function parseFrontmatter(raw) {
  const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!fmMatch) return { frontmatter: {}, body: raw };
  const fmBlock = fmMatch[1];
  const body = fmMatch[2];
  const frontmatter = {};
  for (const line of fmBlock.split(/\r?\n/)) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (!m) continue;
    const [, key, valRaw] = m;
    let val = valRaw.trim();
    // 去引号
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    // order 转 number
    if (key === "order" && val !== "") {
      const num = Number(val);
      frontmatter[key] = Number.isNaN(num) ? 0 : num;
    } else {
      frontmatter[key] = val;
    }
  }
  return { frontmatter, body };
}

function stripMarkdownInline(text) {
  return text
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function limitSummary(text, lang) {
  const maxLength = lang === "zh-CN" ? 72 : 140;
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

function extractSummary(body, lang) {
  const blocks = body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
  const paragraph = blocks.find((block) =>
    !block.startsWith("#") &&
    !block.startsWith(">") &&
    !block.startsWith("```") &&
    !block.startsWith("|")
  );
  return limitSummary(stripMarkdownInline(paragraph || ""), lang);
}

function buildLang(lang) {
  const dir = resolve(DOCS_DIR, lang);
  if (!existsSync(dir)) {
    console.warn(`⚠️  docs/${lang}/ 目录不存在，跳过`);
    return [];
  }

  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".md") && f !== "README.md")
    .sort();

  const docs = [];
  for (const file of files) {
    const filePath = resolve(dir, file);
    const raw = readFileSync(filePath, "utf-8");
    const { frontmatter, body } = parseFrontmatter(raw);

    // slug：frontmatter 优先，否则用文件名去扩展名
    const slug = frontmatter.slug || basename(file, ".md");
    const title = frontmatter.title || slug;
    const category = frontmatter.category || "文档";
    const order = typeof frontmatter.order === "number" ? frontmatter.order : 99;
    const summary = extractSummary(body, lang);

    const rawHtml = marked.parse(body);
    const bodyHtml = DOMPurify.sanitize(rawHtml, SANITIZE_CONFIG);

    docs.push({ slug, title, category, order, summary, bodyHtml });
  }

  // order 是跨语言稳定顺序；category/title 只用于同序兜底，避免中英文分类名排序导致首篇不一致。
  docs.sort((a, b) => {
    const orderDiff = a.order - b.order;
    if (orderDiff !== 0) return orderDiff;
    if (a.category !== b.category) return a.category.localeCompare(b.category, lang === "zh-CN" ? "zh-Hans-CN" : "en");
    return a.title.localeCompare(b.title, lang === "zh-CN" ? "zh-Hans-CN" : "en");
  });

  return docs;
}

mkdirSync(OUTPUT_DIR, { recursive: true });
for (const file of readdirSync(OUTPUT_DIR)) {
  if (/^docs-.+\.json$/.test(file)) {
    unlinkSync(resolve(OUTPUT_DIR, file));
  }
}

let total = 0;
for (const lang of LANGS) {
  const docs = buildLang(lang);
  const outputPath = resolve(OUTPUT_DIR, `docs-${lang}.json`);
  writeFileSync(outputPath, JSON.stringify(docs, null, 2) + "\n", "utf-8");
  total += docs.length;
  console.log(`✅ docs-${lang}.json 已生成：${docs.length} 篇文档 → ${outputPath}`);
}

console.log(`📚 文档构建完成，共 ${total} 篇`);
