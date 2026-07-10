#!/usr/bin/env node
/**
 * BREAK 知识库搜索引擎（Node.js 版）
 *
 * 零外部依赖，仅使用 Node.js 标准库。
 * 支持关键词搜索、ID 精确查询、多类型过滤、中英文自动检测。
 *
 * 用法:
 *   node break_search.mjs <query> [options]
 *
 * 示例:
 *   node break_search.mjs "流量清洗"
 *   node break_search.mjs "credential stuffing" --lang en
 *   node break_search.mjs R0001
 *   node break_search.mjs "自动化" --type risks
 *   node break_search.mjs "DDoS" --type risks,attackTools --limit 10
 */

import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── 常量 ───

/** 实体 ID 正则，用于 ID 精确查询识别 */
const ID_PATTERNS = {
  risks:                /^R\d{4}(?:-\d{3})?$/i,
  avoidances:           /^A\d{4}(?:-\d{3})?$/i,
  attackTools:          /^AT\d{4}(?:-\d{3})?$/i,
  threatActors:         /^TA\d{4}(?:-\d{3})?$/i,
  terms:                /^T\d{4}$/i,
  cases:                /^C\d{4}$/i,
  businessDomains:       /^BD\d{2}$/i,
  avoidanceCategories:  /^AC\d{2}$/i,
};

/** 实体类型显示名称和 emoji */
const TYPE_DISPLAY = {
  risks:               ['🔴', '风险', 'Risks'],
  avoidances:          ['🟢', '规避手段', 'Avoidances'],
  attackTools:         ['🔧', '攻击工具', 'Attack Tools'],
  threatActors:        ['👤', '威胁行为者', 'Threat Actors'],
  terms:               ['📖', '术语', 'Terms'],
  cases:               ['📋', '案例', 'Cases'],
  businessDomains:      ['🏢', '业务域', 'Business Domains'],
  avoidanceCategories: ['📂', '规避分类', 'Avoidance Categories'],
};

/** 可搜索的实体类型及其搜索字段权重（对齐前端 Fuse.js 配置） */
const SEARCH_CONFIGS = {
  risks: {
    title: 2.0, keywords: 1.6, definition: 1.5,
    description: 1.0, influence: 0.6,
  },
  avoidances: {
    title: 2.0, keywords: 1.6, definition: 1.5,
    description: 1.0, limitation: 0.6,
  },
  attackTools: {
    title: 2.0, keywords: 1.6, description: 1.0,
  },
  threatActors: {
    title: 2.0, keywords: 1.6, description: 1.0,
  },
  terms: {
    title: 2.0, keywords: 1.6, definition: 1.5,
    description: 1.0, aliases: 1.0, categoryLabel: 0.8, categoryGroupLabel: 0.5,
  },
  cases: {
    title: 2.0, keywords: 1.6, summary: 1.2,
    description: 0.8,
  },
};


// ─── 工具函数 ───

/** 检测文本是否包含 CJK 字符 */
function containsCjk(text) {
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if ((cp >= 0x4E00 && cp <= 0x9FFF) ||   // CJK 统一表意文字
        (cp >= 0x3400 && cp <= 0x4DBF) ||   // CJK 统一表意文字扩展 A
        (cp >= 0x2E80 && cp <= 0x2FDF) ||   // CJK 部首
        (cp >= 0x3000 && cp <= 0x303F) ||   // CJK 符号和标点
        (cp >= 0x3040 && cp <= 0x30FF) ||   // 日文平假名/片假名
        (cp >= 0xF900 && cp <= 0xFAFF)) {   // CJK 兼容表意文字
      return true;
    }
  }
  return false;
}

/** 自动检测查询语言 */
function detectLang(query) {
  return containsCjk(query) ? 'zh' : 'en';
}

/** 根据脚本自身位置推算数据目录 */
function resolveDataDir() {
  // 情况 1：在项目中 scripts/skill/break_search.mjs → ../../public/data/
  const projectData = resolve(__dirname, '..', '..', 'public', 'data');
  if (existsSync(projectData)) return projectData;
  // 情况 2：作为 skill 包分发 break/break_search.mjs → break/data/
  const skillData = join(__dirname, 'data');
  if (existsSync(skillData)) return skillData;
  return null;
}

/** 推算项目根目录（仅在项目内有效） */
function resolveProjectRoot() {
  const root = resolve(__dirname, '..', '..');
  if (existsSync(join(root, 'package.json'))) return root;
  return null;
}

/** 确保数据文件存在，不存在时尝试自动生成 */
function ensureDataFile(dataDir, filename) {
  const filepath = join(dataDir, filename);
  if (existsSync(filepath)) return true;

  const projectRoot = resolveProjectRoot();
  if (!projectRoot) return false;

  let cmd;
  if (filename === 'break-data.json') {
    cmd = [join(projectRoot, 'scripts', 'validate', 'export-static-data.mjs')];
  } else if (filename === 'break-data-en.json') {
    ensureDataFile(dataDir, 'break-data.json');
    cmd = [join(projectRoot, 'scripts', 'skill', 'export_en_data.mjs')];
  } else {
    return false;
  }

  process.stderr.write(`⏳ 数据文件不存在，正在生成 ${filename} ...\n`);
  try {
    execFileSync('node', cmd, { cwd: projectRoot, stdio: ['ignore', 'ignore', 'pipe'] });
  } catch (e) {
    process.stderr.write(`❌ 生成数据文件失败: ${e.stderr?.toString() || e.message}\n`);
    return false;
  }
  return existsSync(filepath);
}

/** 检测查询是否为实体 ID 格式 */
function detectIdType(query) {
  const q = query.trim();
  for (const [entityType, pattern] of Object.entries(ID_PATTERNS)) {
    if (pattern.test(q)) return { entityType, entityId: q.toUpperCase() };
  }
  return null;
}

/** 截取文本到指定长度 */
function truncate(text, maxLen = 150) {
  if (!text) return '';
  const clean = text.replace(/\n/g, ' ').trim();
  return clean.length > maxLen ? clean.slice(0, maxLen) + '...' : clean;
}

/** 解析命令行参数（零依赖） */
function parseArgs(argv) {
  const args = { query: null, lang: null, types: null, limit: 5, detail: false, dataDir: null };
  let i = 2; // 跳过 node 和脚本路径
  while (i < argv.length) {
    const arg = argv[i];
    if (arg === '--lang' && i + 1 < argv.length) {
      args.lang = argv[++i];
    } else if (arg === '--type' && i + 1 < argv.length) {
      args.types = argv[++i].split(',').map(t => t.trim());
    } else if (arg === '--limit' && i + 1 < argv.length) {
      args.limit = parseInt(argv[++i], 10) || 5;
    } else if (arg === '--detail') {
      args.detail = true;
    } else if (arg === '--data-dir' && i + 1 < argv.length) {
      args.dataDir = argv[++i];
    } else if (!arg.startsWith('--') && !args.query) {
      args.query = arg;
    }
    i++;
  }
  return args;
}


// ─── 搜索引擎 ───

class BreakSearchEngine {
  constructor(dataDir, lang = 'zh') {
    this.lang = lang;
    this.dataDir = dataDir;
    this.data = {};
    this.version = 'unknown';
    this._loadData();
  }

  _loadData() {
    const filename = this.lang === 'zh' ? 'break-data.json' : 'break-data-en.json';
    let filepath = join(this.dataDir, filename);

    if (!existsSync(filepath)) ensureDataFile(this.dataDir, filename);

    if (!existsSync(filepath)) {
      // 英文文件不存在时回退到中文
      if (this.lang === 'en') {
        const zhFile = join(this.dataDir, 'break-data.json');
        if (!existsSync(zhFile)) ensureDataFile(this.dataDir, 'break-data.json');
        if (existsSync(zhFile)) {
          process.stderr.write('⚠️ 英文数据文件不存在，回退到中文数据\n');
          this.lang = 'zh';
          filepath = zhFile;
        } else {
          process.stderr.write(`❌ 数据文件不存在: ${filepath}\n`);
          process.exit(1);
        }
      } else {
        process.stderr.write(`❌ 数据文件不存在: ${filepath}\n`);
        process.exit(1);
      }
    }

    const bundle = JSON.parse(readFileSync(filepath, 'utf-8'));
    this.data = bundle.data || {};
    const categoryRegistry = this.data.termCategories || {};
    for (const term of Object.values(this.data.terms || {})) {
      const category = categoryRegistry.categories?.[term.category];
      const group = categoryRegistry.groups?.[category?.group];
      term.categoryLabel = category?.title || term.category;
      term.categoryGroupLabel = group?.title || '';
    }
    this.version = bundle.packageVersion || 'unknown';
  }

  /** 通过 ID 精确查询实体 */
  lookupId(entityType, entityId) {
    const entities = this.data[entityType] || {};
    return entities[entityId] || null;
  }

  /** 关键词搜索，返回按类型分组的结果 */
  search(query, types, limit = 5) {
    const queryLower = query.toLowerCase();
    const terms = queryLower.split(/\s+/).filter(Boolean);
    if (!terms.length) return {};

    const searchTypes = types || Object.keys(SEARCH_CONFIGS);
    const results = {};

    for (const entityType of searchTypes) {
      const fieldWeights = SEARCH_CONFIGS[entityType];
      if (!fieldWeights) continue;
      const entities = this.data[entityType] || {};
      const typeResults = [];

      for (const [entityId, entity] of Object.entries(entities)) {
        const score = this._scoreEntity(entity, terms, fieldWeights);
        if (score > 0) typeResults.push([entityId, entity, score]);
      }

      typeResults.sort((a, b) => b[2] - a[2]);
      if (typeResults.length) results[entityType] = typeResults.slice(0, limit);
    }
    return results;
  }

  _scoreEntity(entity, terms, fieldWeights) {
    const termScores = [];
    for (const term of terms) {
      let best = 0;
      for (const [field, weight] of Object.entries(fieldWeights)) {
        const value = entity[field];
        if (value == null) continue;
        const s = this._scoreField(value, term, weight);
        if (s > best) best = s;
      }
      if (best === 0) return 0; // 该词无匹配，整体不命中
      termScores.push(best);
    }
    return Math.min(...termScores); // 多词取最低分
  }

  _scoreField(value, term, weight) {
    if (typeof value === 'string') return this._scoreText(value, term, weight);
    if (Array.isArray(value)) {
      let best = 0;
      for (const item of value) {
        if (typeof item === 'string') {
          const s = this._scoreText(item, term, weight);
          if (s > best) best = s;
        }
      }
      return best;
    }
    return 0;
  }

  _scoreText(text, term, weight) {
    const textLower = text.toLowerCase();
    if (textLower === term) return weight * 1.5; // 精确匹配加成
    if (textLower.includes(term)) return weight;
    return 0;
  }

  /** 解析实体 ID 为标题 */
  resolveEntityTitle(entityType, entityId) {
    const entity = this.lookupId(entityType, entityId);
    return entity?.title || entityId;
  }
}


// ─── 格式化输出 ───

function formatSearchResults(engine, query, results, lang) {
  const total = Object.values(results).reduce((s, items) => s + items.length, 0);
  const lines = [];
  lines.push('=== BREAK 知识库搜索结果 ===');
  lines.push(`查询: "${query}"  语言: ${lang}  匹配: ${total} 条`);
  lines.push('');

  if (total === 0) {
    lines.push('未找到匹配结果。');
    lines.push('');
    lines.push('建议：');
    lines.push('- 尝试使用不同的关键词');
    lines.push('- 使用更宽泛的搜索词');
    lines.push('- 通过 --type 指定搜索范围');
    return lines.join('\n');
  }

  for (const [entityType, items] of Object.entries(results)) {
    const [emoji, cnName, enName] = TYPE_DISPLAY[entityType] || ['', entityType, entityType];
    lines.push(`## ${emoji} ${cnName} (${enName}) — ${items.length} 条匹配`);
    for (const [entityId, entity, score] of items) {
      lines.push(`- [${entityId}] ${entity.title || ''} (score: ${score.toFixed(1)})`);
      const snippet = entity.definition || entity.summary || entity.description || '';
      if (snippet) lines.push(`  ${truncate(snippet, 120)}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function formatEntityDetail(engine, entityType, entityId, entity) {
  const lines = [];
  lines.push(`=== [${entityId}] ${entity.title || ''} ===`);
  lines.push(`类型: ${(TYPE_DISPLAY[entityType] || ['', entityType])[1]}`);
  lines.push('');

  // 基础文本字段
  for (const [field, label] of [
    ['definition', '定义'], ['description', '描述'], ['summary', '摘要'],
    ['influence', '影响'], ['limitation', '局限性'], ['usageExample', '使用场景'],
  ]) {
    if (entity[field]) { lines.push(`${label}: ${entity[field]}`); lines.push(''); }
  }

  // 元数据字段
  const metaParts = [];
  for (const [field, label] of [
    ['complexity', '复杂度'], ['category', '分类'],
    ['effectiveness', '有效性'], ['incidentTime', '事件时间'],
  ]) {
    if (entity[field]) {
      const value = entityType === 'terms' && field === 'category'
        ? (entity.categoryLabel || entity[field])
        : entity[field];
      metaParts.push(`${label}: ${value}`);
    }
  }
  if (metaParts.length) { lines.push(metaParts.join(' | ')); lines.push(''); }

  // 关键词
  if (entity.keywords?.length) { lines.push(`关键词: ${entity.keywords.join(', ')}`); lines.push(''); }

  // 别名
  if (entity.aliases?.length) { lines.push(`别名: ${entity.aliases.join(', ')}`); lines.push(''); }

  // 关联关系展开
  const relationFields = [
    ['avoidances', '规避手段', 'avoidances'],
    ['directCauseRisks', '直接导致的风险', 'risks'],
    ['indirectSupportRisks', '间接支持的风险', 'risks'],
    ['buildAttackTools', '自建的工具', 'attackTools'],
    ['useAttackTools', '使用的工具', 'attackTools'],
    ['relatedRisks', '相关风险', 'risks'],
    ['relatedAvoidances', '相关规避手段', 'avoidances'],
    ['relatedAttackTools', '相关攻击工具', 'attackTools'],
    ['relatedThreatActors', '相关威胁行为者', 'threatActors'],
    ['relatedBusinessDomains', '相关业务域', 'businessDomains'],
  ];
  for (const [field, label, refType] of relationFields) {
    const value = entity[field];
    if (!value?.length) continue;
    if (typeof value[0] === 'string') {
      const expanded = value.map(id => `${id}(${engine.resolveEntityTitle(refType, id)})`);
      lines.push(`${label}: ${expanded.join(', ')}`);
    } else if (typeof value[0] === 'object') {
      lines.push(`${label}:`);
      for (const rel of value) {
        const title = engine.resolveEntityTitle(refType, rel.key || '');
        let desc = `${rel.key || ''}(${title})`;
        if (rel.relation) desc += ` [${rel.relation}]`;
        if (rel.note) desc += ` - ${rel.note}`;
        lines.push(`  - ${desc}`);
      }
    }
    lines.push('');
  }

  // 参考资料
  if (entity.references?.length) {
    lines.push('参考资料:');
    for (const ref of entity.references) {
      lines.push(ref.link ? `  - ${ref.title} (${ref.link})` : `  - ${ref.title}`);
    }
    lines.push('');
  }

  if (entity.updated) lines.push(`更新时间: ${entity.updated}`);
  return lines.join('\n');
}

function formatBusinessDomainDetail(engine, entityId, entity) {
  const lines = [];
  lines.push(`=== [${entityId}] ${entity.title || ''} ===`);
  lines.push('类型: 业务域');
  lines.push('');

  if (entity.description) { lines.push(`描述: ${entity.description}`); lines.push(''); }

  const dimensions = entity.riskDimensions || {};
  const scenes = entity.riskScenes || {};

  if (Object.keys(dimensions).length) {
    lines.push('风险维度:');
    for (const [dimId, dim] of Object.entries(dimensions).sort(([a], [b]) => a.localeCompare(b))) {
      lines.push(`  [${dimId}] ${dim.title || dimId}`);
      for (const sceneId of dim.riskScenes || []) {
        const scene = scenes[sceneId] || {};
        const riskCount = (scene.risks || []).length;
        lines.push(`    └─ [${sceneId}] ${scene.title || sceneId} (${riskCount} 个风险)`);
      }
    }
    lines.push('');
  }

  const topRisks = entity.risks || [];
  if (topRisks.length) {
    lines.push(`顶层风险 (${topRisks.length} 个):`);
    for (const rid of topRisks.slice(0, 10)) {
      lines.push(`  - ${rid}(${engine.resolveEntityTitle('risks', rid)})`);
    }
    if (topRisks.length > 10) lines.push(`  ... 还有 ${topRisks.length - 10} 个`);
    lines.push('');
  }

  if (entity.updated) lines.push(`更新时间: ${entity.updated}`);
  return lines.join('\n');
}


// ─── 主程序 ───

function main() {
  const args = parseArgs(process.argv);

  if (!args.query) {
    console.log(`用法: node break_search.mjs <query> [options]

选项:
  --lang zh|en       语言（默认自动检测）
  --type <types>     逗号分隔的实体类型过滤
  --limit N          每类型最大返回数（默认 5）
  --detail           详细模式
  --data-dir <dir>   数据目录路径覆盖

示例:
  node break_search.mjs "流量清洗"
  node break_search.mjs "credential stuffing" --lang en
  node break_search.mjs R0001
  node break_search.mjs "自动化" --type risks
  node break_search.mjs "DDoS" --type risks,attackTools --limit 10`);
    process.exit(0);
  }

  // 解析数据目录
  const dataDir = args.dataDir || resolveDataDir();
  if (!dataDir || !existsSync(dataDir)) {
    process.stderr.write('❌ 无法找到数据目录。请使用 --data-dir 指定。\n');
    process.exit(1);
  }

  // 语言检测
  const lang = args.lang || detectLang(args.query);

  // 类型过滤校验
  if (args.types) {
    const invalid = args.types.filter(t => !(t in SEARCH_CONFIGS));
    if (invalid.length) {
      process.stderr.write(`⚠️ 未知的实体类型: ${invalid.join(', ')}\n`);
      process.stderr.write(`可用类型: ${Object.keys(SEARCH_CONFIGS).join(', ')}\n`);
    }
  }

  // 初始化搜索引擎
  const engine = new BreakSearchEngine(dataDir, lang);

  // 检测 ID 查询
  const idResult = detectIdType(args.query);

  if (idResult) {
    const { entityType, entityId } = idResult;
    const entity = engine.lookupId(entityType, entityId);
    if (entity) {
      console.log(entityType === 'businessDomains'
        ? formatBusinessDomainDetail(engine, entityId, entity)
        : formatEntityDetail(engine, entityType, entityId, entity));
    } else {
      console.log(`❌ 未找到实体: [${entityId}]`);
      console.log(`\n尝试搜索 "${entityId.replace(/^[A-Z]+/, '')}":"`);
      const results = engine.search(entityId, null, 3);
      if (Object.keys(results).length) {
        console.log(formatSearchResults(engine, entityId, results, lang));
      }
    }
    return;
  }

  // 关键词搜索
  const results = engine.search(args.query, args.types, args.limit);
  console.log(formatSearchResults(engine, args.query, results, lang));

  // detail 模式展开第一个结果
  if (args.detail && Object.keys(results).length) {
    for (const [entityType, items] of Object.entries(results)) {
      const [entityId, entity] = items[0];
      console.log('\n' + '='.repeat(60));
      console.log(formatEntityDetail(engine, entityType, entityId, entity));
      break;
    }
  }
}

main();
