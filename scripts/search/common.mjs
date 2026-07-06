import fs from 'fs';
import path from 'path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'url';

export const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const projectRoot = path.resolve(__dirname, '../..');

export const entityConfigs = {
  risks: {
    label: 'risks',
    zhDir: 'src/BREAK/risks',
    enDir: 'src/i18n/en/BREAK/risks',
    titlePath: 'BREAK.risks',
  },
  avoidances: {
    label: 'avoidances',
    zhDir: 'src/BREAK/avoidances',
    enDir: 'src/i18n/en/BREAK/avoidances',
    titlePath: 'BREAK.avoidances',
  },
  'attack-tools': {
    label: 'attack-tools',
    zhDir: 'src/BREAK/attack-tools',
    enDir: 'src/i18n/en/BREAK/attack-tools',
    titlePath: 'BREAK.attackTools',
  },
  attackTools: {
    aliasOf: 'attack-tools',
  },
  'threat-actors': {
    label: 'threat-actors',
    zhDir: 'src/BREAK/threat-actors',
    enDir: 'src/i18n/en/BREAK/threat-actors',
    titlePath: 'BREAK.threatActors',
  },
  threatActors: {
    aliasOf: 'threat-actors',
  },
  cases: {
    label: 'cases',
    zhDir: 'src/BREAK/cases',
    enDir: 'src/i18n/en/BREAK/cases',
    titlePath: 'BREAK.cases',
  },
};

export function normalizeEntityType(type) {
  const config = entityConfigs[type];
  if (!config) {
    throw new Error(`Unsupported entity type: ${type}`);
  }
  return config.aliasOf || type;
}

export function getEntityConfig(type) {
  return entityConfigs[normalizeEntityType(type)];
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

export function parentKeyFor(entityKey) {
  return entityKey.includes('-') ? entityKey.split('-')[0] : entityKey;
}

export function getDataFilePath(entityType, entityKey, locale = 'zh') {
  const config = getEntityConfig(entityType);
  const dir = locale === 'en' ? config.enDir : config.zhDir;
  const fullDir = path.join(projectRoot, dir);
  const canonicalPath = path.join(fullDir, `${parentKeyFor(entityKey)}.json`);

  if (fs.existsSync(canonicalPath)) {
    try {
      const data = readJson(canonicalPath);
      if (data[entityKey]) return canonicalPath;
    } catch {
      return canonicalPath;
    }
  }

  for (const filePath of fs
    .readdirSync(fullDir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => path.join(fullDir, file))) {
    try {
      const data = readJson(filePath);
      if (data[entityKey]) return filePath;
    } catch {
      // Ignore malformed files here; the validator reports JSON failures separately.
    }
  }

  return canonicalPath;
}

export function loadEntityFile(entityType, entityKey, locale = 'zh') {
  const filePath = getDataFilePath(entityType, entityKey, locale);
  if (!fs.existsSync(filePath)) {
    return { filePath, data: null, entity: null };
  }
  const data = readJson(filePath);
  return { filePath, data, entity: data[entityKey] || null };
}

export function listEntityFiles(entityType, locale = 'zh') {
  const config = getEntityConfig(entityType);
  const dir = path.join(projectRoot, locale === 'en' ? config.enDir : config.zhDir);
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file) => path.join(dir, file));
}

export function loadEntities(entityType, locale = 'zh') {
  const entities = [];
  for (const filePath of listEntityFiles(entityType, locale)) {
    const data = readJson(filePath);
    for (const [key, entity] of Object.entries(data)) {
      entities.push({
        key,
        entityType: normalizeEntityType(entityType),
        filePath,
        entity,
      });
    }
  }
  return entities;
}

export function normalizeLink(link) {
  return String(link || '').trim();
}

export function safeUrl(link) {
  try {
    return new URL(link);
  } catch {
    return null;
  }
}

export function domainOf(link) {
  const url = safeUrl(link);
  return url ? url.hostname.replace(/^www\./, '').toLowerCase() : '';
}

/**
 * 判断 domain 是否匹配给定的后缀集合（带前导点保护，避免子串误匹配）。
 * suffix 可为 'example.com'（精确或其子域）或 '.example.com'（仅子域）。
 * 统一替换各脚本里 domain.endsWith(item) 的写法，避免 notbaidu.com 误匹配 baidu.com。
 * @param {string} domain - 已小写、去 www 的域名
 * @param {string[]} suffixes - 后缀集合
 * @returns {boolean}
 */
export function matchesDomain(domain, suffixes) {
  const d = String(domain || '').toLowerCase();
  return suffixes.some((suffix) => {
    const s = String(suffix || '').toLowerCase();
    if (s.startsWith('.')) return d.endsWith(s);
    return d === s || d.endsWith(`.${s}`);
  });
}

export function existingReferenceLinks() {
  const links = new Set();
  for (const type of ['risks', 'avoidances', 'attack-tools', 'threat-actors']) {
    for (const { entity } of loadEntities(type)) {
      for (const ref of entity.references || []) {
        const link = normalizeLink(ref.link).toLowerCase();
        if (link) links.add(link);
      }
    }
  }
  return links;
}

export function compactText(value, maxLength = 120) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

// 解析 version 的 "major.minor" 段；非法返回 null
function minorSegment(version) {
  const match = String(version || '').match(/^(\d+)\.(\d+)/);
  return match ? `${match[1]}.${match[2]}` : null;
}

// 读取 git 指定 ref 已提交的 package.json version；取不到返回 null
function readGitVersion(ref) {
  try {
    const out = execSync(`git show ${ref}:package.json`, {
      cwd: projectRoot,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    });
    return JSON.parse(out).version ?? null;
  } catch {
    return null;
  }
}

function resolvePreviousVersionRef() {
  if (process.env.BREAK_PREVIOUS_VERSION_REF) {
    return process.env.BREAK_PREVIOUS_VERSION_REF;
  }
  if (process.env.GITHUB_BASE_REF) {
    return `origin/${process.env.GITHUB_BASE_REF}`;
  }
  if (process.env.GITHUB_EVENT_NAME === 'push' && process.env.GITHUB_EVENT_BEFORE) {
    return process.env.GITHUB_EVENT_BEFORE;
  }
  return 'HEAD';
}

/**
 * 判断当前是否为次版本(minor)变化，用于决定是否运行重型浏览器测试
 * (test:relation-stability / test:lighthouse)。
 *
 * 对比基准：工作区 package.json version（即将提交的新版本）vs git HEAD
 * 已提交的 version（上一个版本）。本地 build 前已改好 version 但未 commit
 * 时，HEAD 即旧版本；CI 上 checkout 的 HEAD 已是新版本时同样以 HEAD 为基准。
 *
 * - major.minor 段不同 → 运行（次版本变化，如 2.18.x → 2.19.0）
 * - major.minor 段相同 → 跳过（补丁变化，如 2.18.3 → 2.18.4）
 * - 任一版本取不到（首次提交 / 无 git / shallow clone）→ 默认运行（保守不漏跑）
 * - BREAK_FORCE_BROWSER_REGRESSION=1 → 强制运行（用于本地完整验收）
 *
 * @returns {{ shouldRun: boolean, current: string|null, previous: string|null, reason: string }}
 */
export function shouldRunOnMinorBump() {
  const current = readJson(path.join(projectRoot, 'package.json')).version;
  if (process.env.BREAK_FORCE_BROWSER_REGRESSION === '1') {
    return { shouldRun: true, current, previous: null, reason: 'BREAK_FORCE_BROWSER_REGRESSION=1 强制运行' };
  }
  const previousRef = resolvePreviousVersionRef();
  const previous = readGitVersion(previousRef);
  const curSeg = minorSegment(current);
  const prevSeg = minorSegment(previous);
  if (!curSeg || !prevSeg) {
    return { shouldRun: true, current, previous, reason: `无法读取对比版本(${previousRef})，默认运行` };
  }
  if (curSeg === prevSeg) {
    return { shouldRun: false, current, previous, reason: `非次版本变化 (${previousRef}: ${previous} → ${current})` };
  }
  return { shouldRun: true, current, previous, reason: `次版本变化 (${previousRef}: ${previous} → ${current})` };
}
