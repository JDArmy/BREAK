import fs from 'fs';
import path from 'path';
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
