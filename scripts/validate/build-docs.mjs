#!/usr/bin/env node
/**
 * 将 docs/{zh-CN,en}/*.md 编译为文档 manifest 与单篇 HTML。
 *
 * 输出：
 * - public/data/docs-manifest.json：文档目录元数据，不包含正文 HTML
 * - public/docs/{locale}/{slug}.html：单篇文档 HTML 片段，供 DocsView 按需加载
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, rmSync, mkdtempSync } from "fs";
import { resolve, dirname, basename, join } from "path";
import { tmpdir } from "os";
import { fileURLToPath } from "url";
import { marked } from "marked";
import { JSDOM } from "jsdom";
import createDOMPurify from "dompurify";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const LANGS = ["zh-CN", "en"];
const DEFAULT_LANG = "zh-CN";
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function parseArgs(argv) {
  const options = {
    docsDir: resolve(ROOT, "docs"),
    dataOutputDir: resolve(ROOT, "public/data"),
    htmlOutputDir: resolve(ROOT, "public/docs"),
    check: false,
  };
  for (const arg of argv) {
    if (arg === "--check") {
      options.check = true;
    } else if (arg.startsWith("--docs-dir=")) {
      options.docsDir = resolve(ROOT, arg.slice("--docs-dir=".length));
    } else if (arg.startsWith("--data-output-dir=")) {
      options.dataOutputDir = resolve(ROOT, arg.slice("--data-output-dir=".length));
    } else if (arg.startsWith("--html-output-dir=")) {
      options.htmlOutputDir = resolve(ROOT, arg.slice("--html-output-dir=".length));
    } else {
      throw new Error(`未知参数: ${arg}`);
    }
  }
  return options;
}

marked.setOptions({ gfm: true, breaks: false });

const renderer = new marked.Renderer();
const usedHeadingIds = new Map();
renderer.heading = ({ tokens, depth }) => {
  const text = tokens.map((t) => t.text ?? "").join("");
  const baseSlug = String(text)
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[\s]+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "heading";
  const used = usedHeadingIds.get(baseSlug) || 0;
  usedHeadingIds.set(baseSlug, used + 1);
  const slug = used === 0 ? baseSlug : `${baseSlug}-${used + 1}`;
  return `<h${depth} id="${slug}">${text}</h${depth}>`;
};
marked.use({ renderer });

const { window } = new JSDOM("");
const DOMPurify = createDOMPurify(window);
const SANITIZE_CONFIG = {
  USE_PROFILES: { html: true },
  ADD_ATTR: ["target", "rel", "id", "class"],
};

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
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    frontmatter[key] = key === "order" ? Number(val) : val;
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

function validateDocMeta({ lang, file, frontmatter, issues }) {
  for (const key of ["title", "category", "slug"]) {
    if (typeof frontmatter[key] !== "string" || !frontmatter[key].trim()) {
      issues.push(`docs/${lang}/${file}: frontmatter 缺少 ${key}`);
    }
  }

  if (!Number.isInteger(frontmatter.order) || frontmatter.order <= 0) {
    issues.push(`docs/${lang}/${file}: frontmatter.order 必须是正整数`);
  }

  if (frontmatter.slug && !SLUG_PATTERN.test(frontmatter.slug)) {
    issues.push(`docs/${lang}/${file}: slug 只能使用小写字母、数字和连字符`);
  }
}

function renderBodyHtml(body) {
  usedHeadingIds.clear();
  const rawHtml = marked.parse(body);
  return DOMPurify.sanitize(rawHtml, SANITIZE_CONFIG);
}

function buildLang(lang, issues, options) {
  const dir = resolve(options.docsDir, lang);
  if (!existsSync(dir)) {
    issues.push(`docs/${lang}/ 目录不存在`);
    return [];
  }

  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".md") && f !== "README.md")
    .sort();

  if (files.length === 0) {
    issues.push(`docs/${lang}/ 没有 Markdown 文档`);
    return [];
  }

  const docs = [];
  const seenSlugs = new Map();
  const seenOrders = new Map();
  const langOutputDir = resolve(options.htmlOutputDir, lang);
  mkdirSync(langOutputDir, { recursive: true });

  for (const file of files) {
    const filePath = resolve(dir, file);
    const raw = readFileSync(filePath, "utf-8");
    const { frontmatter, body } = parseFrontmatter(raw);
    validateDocMeta({ lang, file, frontmatter, issues });

    const slug = frontmatter.slug || basename(file, ".md");
    const title = frontmatter.title || slug;
    const category = frontmatter.category || "文档";
    const order = Number.isInteger(frontmatter.order) ? frontmatter.order : 99;
    const summary = extractSummary(body, lang);

    if (seenSlugs.has(slug)) {
      issues.push(`docs/${lang}/${file}: slug 与 ${seenSlugs.get(slug)} 重复 (${slug})`);
    }
    seenSlugs.set(slug, file);

    if (seenOrders.has(order)) {
      issues.push(`docs/${lang}/${file}: order 与 ${seenOrders.get(order)} 重复 (${order})`);
    }
    seenOrders.set(order, file);

    const bodyHtml = renderBodyHtml(body);
    const htmlPath = `docs/${lang}/${slug}.html`;
    writeFileSync(resolve(options.htmlOutputDir, lang, `${slug}.html`), bodyHtml + "\n", "utf-8");

    docs.push({ slug, title, category, order, summary, htmlPath });
  }

  docs.sort((a, b) => {
    const orderDiff = a.order - b.order;
    if (orderDiff !== 0) return orderDiff;
    if (a.category !== b.category) return a.category.localeCompare(b.category, lang === "zh-CN" ? "zh-Hans-CN" : "en");
    return a.title.localeCompare(b.title, lang === "zh-CN" ? "zh-Hans-CN" : "en");
  });

  if (!docs.some((doc) => doc.slug === "index")) {
    issues.push(`docs/${lang}/ 缺少 slug: index 的默认文档`);
  }

  return docs;
}

function validateCrossLanguage(manifest, issues) {
  const defaultDocs = manifest[DEFAULT_LANG] || [];
  const defaultSlugs = defaultDocs.map((doc) => doc.slug);

  for (const lang of LANGS) {
    const docs = manifest[lang] || [];
    const slugs = docs.map((doc) => doc.slug);
    const missing = defaultSlugs.filter((slug) => !slugs.includes(slug));
    const extra = slugs.filter((slug) => !defaultSlugs.includes(slug));

    if (missing.length > 0) {
      issues.push(`docs/${lang}/ 缺少文档 slug: ${missing.join(", ")}`);
    }
    if (extra.length > 0) {
      issues.push(`docs/${lang}/ 多出未在 ${DEFAULT_LANG} 中定义的文档 slug: ${extra.join(", ")}`);
    }

    for (const defaultDoc of defaultDocs) {
      const doc = docs.find((item) => item.slug === defaultDoc.slug);
      if (doc && doc.order !== defaultDoc.order) {
        issues.push(`docs/${lang}/${doc.slug}: order=${doc.order} 与 ${DEFAULT_LANG} 的 order=${defaultDoc.order} 不一致`);
      }
    }
  }
}

function cleanOutputs(options) {
  mkdirSync(options.dataOutputDir, { recursive: true });
  rmSync(options.htmlOutputDir, { recursive: true, force: true });
  mkdirSync(options.htmlOutputDir, { recursive: true });

  for (const file of readdirSync(options.dataOutputDir)) {
    if (/^docs-.+\.json$/.test(file) || file === "docs-manifest.json") {
      rmSync(resolve(options.dataOutputDir, file), { force: true });
    }
  }
}

function buildDocs(options) {
  cleanOutputs(options);

  const issues = [];
  const manifest = {};
  for (const lang of LANGS) {
    manifest[lang] = buildLang(lang, issues, options);
  }
  validateCrossLanguage(manifest, issues);

  if (issues.length > 0) {
    return { ok: false, issues, manifest };
  }

  const manifestPath = resolve(options.dataOutputDir, "docs-manifest.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf-8");
  return { ok: true, issues: [], manifest, manifestPath };
}

function readIfExists(filePath) {
  return existsSync(filePath) ? readFileSync(filePath, "utf-8") : null;
}

function compareGeneratedOutputs(expectedOptions, actualOptions, manifest) {
  const issues = [];
  const expectedManifest = readIfExists(resolve(expectedOptions.dataOutputDir, "docs-manifest.json"));
  const actualManifest = readIfExists(resolve(actualOptions.dataOutputDir, "docs-manifest.json"));
  if (expectedManifest !== actualManifest) {
    issues.push("public/data/docs-manifest.json 不是最新产物，请运行 npm run generate:docs");
  }

  for (const lang of LANGS) {
    for (const doc of manifest[lang] || []) {
      const expectedHtml = readIfExists(resolve(expectedOptions.htmlOutputDir, lang, `${doc.slug}.html`));
      const actualHtml = readIfExists(resolve(actualOptions.htmlOutputDir, lang, `${doc.slug}.html`));
      if (expectedHtml !== actualHtml) {
        issues.push(`public/docs/${lang}/${doc.slug}.html 不是最新产物，请运行 npm run generate:docs`);
      }
    }
  }
  return issues;
}

function failBuild(issues) {
  console.error("\n❌ 文档构建校验失败");
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    failBuild([String(error?.message || error)]);
  }

  if (options.check) {
    const tmpRoot = mkdtempSync(join(tmpdir(), "break-docs-"));
    const expectedOptions = {
      ...options,
      dataOutputDir: resolve(tmpRoot, "data"),
      htmlOutputDir: resolve(tmpRoot, "docs"),
      check: false,
    };
    const result = buildDocs(expectedOptions);
    if (!result.ok) failBuild(result.issues);

    const freshnessIssues = compareGeneratedOutputs(expectedOptions, options, result.manifest);
    rmSync(tmpRoot, { recursive: true, force: true });
    if (freshnessIssues.length > 0) failBuild(freshnessIssues);
    console.log("✅ 文档构建产物已是最新");
    return;
  }

  const result = buildDocs(options);
  if (!result.ok) failBuild(result.issues);

  const total = LANGS.reduce((sum, lang) => sum + result.manifest[lang].length, 0);
  console.log(`✅ docs-manifest.json 已生成：${result.manifestPath}`);
  for (const lang of LANGS) {
    console.log(`✅ public/docs/${lang}/ 已生成：${result.manifest[lang].length} 篇文档`);
  }
  console.log(`📚 文档构建完成，共 ${total} 篇`);
}

main();
