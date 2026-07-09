/**
 * STIX 2.1 映射工具 — BREAK 实体 → STIX SDO/SRO 转换所需的常量和辅助函数。
 *
 * 设计原则：
 * - 能映射到标准 STIX SDO 的用标准类型 + Extension 扩展 BREAK 特有字段
 * - 无法映射的用 x-break-* 自定义 SDO
 * - 所有 STIX ID 基于 UUID v5 确定性生成，中英文 Bundle 共享相同 UUID
 */

import crypto from 'node:crypto';

// ────────────────────────────────────────
// 1. UUID v5 确定性 ID 生成
// ────────────────────────────────────────

/**
 * BREAK 专属 UUID v5 namespace：
 * 由 UUID v5("break.jd.army", DNS_NAMESPACE) 生成，固定不变。
 * DNS namespace = 6ba7b810-9dad-11d1-80b4-00c04fd430c8
 */
export const BREAK_NAMESPACE = generateUUIDv5('break.jd.army', '6ba7b810-9dad-11d1-80b4-00c04fd430c8');

/**
 * 生成 UUID v5（RFC 4122 标准实现）
 * @param {string} name - 种子名称
 * @param {string} namespace - namespace UUID（带连字符格式）
 * @returns {string} UUID v5 字符串
 */
export function generateUUIDv5(name, namespace) {
  // 将 namespace UUID 转为 16 字节 buffer
  const nsBytes = Buffer.from(namespace.replace(/-/g, ''), 'hex');
  const nameBytes = Buffer.from(name, 'utf8');

  const hash = crypto.createHash('sha1').update(nsBytes).update(nameBytes).digest();

  // 设置 version 5 和 variant bits
  hash[6] = (hash[6] & 0x0f) | 0x50; // version 5
  hash[8] = (hash[8] & 0x3f) | 0x80; // variant RFC 4122

  const hex = hash.subarray(0, 16).toString('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

/**
 * 为 BREAK 实体生成确定性 STIX ID
 * @param {string} stixType - STIX 对象类型，如 "x-break-risk"、"course-of-action"
 * @param {string} breakId - BREAK 实体 ID，如 "R0001"
 * @returns {string} STIX ID，如 "x-break-risk--<uuid>"
 */
export function makeStixId(stixType, breakId) {
  const uuid = generateUUIDv5(`${stixType}:${breakId}`, BREAK_NAMESPACE);
  return `${stixType}--${uuid}`;
}

/**
 * 为 STIX Relationship 生成确定性 ID
 * @param {string} sourceRef - source_ref STIX ID
 * @param {string} targetRef - target_ref STIX ID
 * @param {string} relationshipType - relationship_type
 * @returns {string} STIX Relationship ID
 */
export function makeRelationshipId(sourceRef, targetRef, relationshipType) {
  const seed = `${sourceRef}|${relationshipType}|${targetRef}`;
  const uuid = generateUUIDv5(seed, BREAK_NAMESPACE);
  return `relationship--${uuid}`;
}

// ────────────────────────────────────────
// 2. BREAK → STIX 类型映射
// ────────────────────────────────────────

/** BREAK 实体类型 → STIX SDO 类型映射 */
export const ENTITY_TYPE_MAP = {
  risks: 'x-break-risk',
  avoidances: 'course-of-action',
  attackTools: 'tool',
  threatActors: 'threat-actor',
  terms: 'x-break-term',
  cases: 'report',
  businessDomains: 'x-break-business-domain',
};

// ────────────────────────────────────────
// 3. 关系类型映射
// ────────────────────────────────────────

/** 跨类型关系 → STIX relationship_type */
export const CROSS_TYPE_RELATIONS = {
  'risk.avoidances': 'mitigated-by',
  'attackTool.directCauseRisks': 'x-break-directly-causes',
  'attackTool.indirectSupportRisks': 'x-break-indirectly-supports',
  'attackTool.avoidances': 'mitigated-by',
  'threatActor.buildAttackTools': 'x-break-builds',
  'threatActor.useAttackTools': 'uses',
  'threatActor.directCauseRisks': 'x-break-directly-causes',
  'threatActor.indirectSupportRisks': 'x-break-indirectly-supports',
  'case.relatedRisks': 'related-to',
  'case.relatedAttackTools': 'related-to',
  'case.relatedThreatActors': 'related-to',
  'term.relatedRisks': 'related-to',
  'term.relatedAvoidances': 'related-to',
  'term.relatedAttackTools': 'related-to',
  'term.relatedThreatActors': 'related-to',
  'term.relatedBusinessDomains': 'related-to',
};

/** 同类型内部关系 → STIX relationship_type（BREAK relation 枚举值 → STIX 值） */
export const INTRA_TYPE_RELATIONS = {
  // Risk 内部
  'risk.prerequisite': 'x-break-prerequisite-of',
  'risk.co-occurrence': 'x-break-co-occurs-with',
  'risk.escalation': 'x-break-escalates-to',
  'risk.variant': 'variant-of',
  // Avoidance 内部
  'avoidance.prerequisite': 'x-break-prerequisite-of',
  'avoidance.complement': 'x-break-complements',
  'avoidance.alternative': 'x-break-alternative-to',
  'avoidance.mitigates-gap': 'x-break-mitigates-gap-of',
  // AttackTool 内部
  'attackTool.prerequisite': 'x-break-prerequisite-of',
  'attackTool.co-used': 'x-break-co-used-with',
  'attackTool.alternative': 'x-break-alternative-to',
  'attackTool.capability-upgrade': 'x-break-capability-upgrade-of',
  // ThreatActor 内部
  'threatActor.co-involved': 'x-break-co-involved-with',
};

/**
 * 跨类型关系字段 → 关系的 target 实体类型映射
 * 用于根据字段名确定 target_ref 的 STIX 类型
 */
export const RELATION_TARGET_TYPE = {
  'risk.avoidances': 'avoidances',
  'attackTool.directCauseRisks': 'risks',
  'attackTool.indirectSupportRisks': 'risks',
  'attackTool.avoidances': 'avoidances',
  'threatActor.buildAttackTools': 'attackTools',
  'threatActor.useAttackTools': 'attackTools',
  'threatActor.directCauseRisks': 'risks',
  'threatActor.indirectSupportRisks': 'risks',
  'case.relatedRisks': 'risks',
  'case.relatedAttackTools': 'attackTools',
  'case.relatedThreatActors': 'threatActors',
  'term.relatedRisks': 'risks',
  'term.relatedAvoidances': 'avoidances',
  'term.relatedAttackTools': 'attackTools',
  'term.relatedThreatActors': 'threatActors',
  'term.relatedBusinessDomains': 'businessDomains',
};

// ────────────────────────────────────────
// 4. Extension Definition 生成
// ────────────────────────────────────────

const EXTENSION_BASE_URL = 'https://break.jd.army/stix/extensions';

/** Extension Definition 配置 */
const EXTENSION_CONFIGS = [
  {
    key: 'x-break-risk-ext',
    name: 'BREAK Risk Extension',
    description: 'BREAK 框架风险实体的自定义属性扩展，包含 definition、complexity、influence 等字段',
    schema: `${EXTENSION_BASE_URL}/x-break-risk-ext/v1/schema.json`,
    extensionTypes: ['new-sdo'],
  },
  {
    key: 'x-break-avoidance-ext',
    name: 'BREAK Avoidance Extension',
    description: 'BREAK 框架规避手段的 course-of-action 属性扩展',
    schema: `${EXTENSION_BASE_URL}/x-break-avoidance-ext/v1/schema.json`,
    extensionTypes: ['property-extension'],
  },
  {
    key: 'x-break-attack-tool-ext',
    name: 'BREAK Attack Tool Extension',
    description: 'BREAK 框架攻击工具的 tool 属性扩展',
    schema: `${EXTENSION_BASE_URL}/x-break-attack-tool-ext/v1/schema.json`,
    extensionTypes: ['property-extension'],
  },
  {
    key: 'x-break-threat-actor-ext',
    name: 'BREAK Threat Actor Extension',
    description: 'BREAK 框架威胁行为者的 threat-actor 属性扩展',
    schema: `${EXTENSION_BASE_URL}/x-break-threat-actor-ext/v1/schema.json`,
    extensionTypes: ['property-extension'],
  },
  {
    key: 'x-break-term-ext',
    name: 'BREAK Term Extension',
    description: 'BREAK 框架行业术语的自定义 SDO 扩展',
    schema: `${EXTENSION_BASE_URL}/x-break-term-ext/v1/schema.json`,
    extensionTypes: ['new-sdo'],
  },
  {
    key: 'x-break-case-ext',
    name: 'BREAK Case Extension',
    description: 'BREAK 框架典型案例的 report 属性扩展',
    schema: `${EXTENSION_BASE_URL}/x-break-case-ext/v1/schema.json`,
    extensionTypes: ['property-extension'],
  },
  {
    key: 'x-break-business-domain-ext',
    name: 'BREAK Business Domain Extension',
    description: 'BREAK 框架业务域的自定义 SDO 扩展',
    schema: `${EXTENSION_BASE_URL}/x-break-business-domain-ext/v1/schema.json`,
    extensionTypes: ['new-sdo'],
  },
];

/**
 * 生成 BREAK Identity SDO（数据源标识）
 * @param {string} created - ISO 8601 创建时间
 * @returns {object} STIX Identity SDO
 */
export function createBreakIdentity(created) {
  return {
    type: 'identity',
    spec_version: '2.1',
    id: makeStixId('identity', 'JDARMY-BREAK'),
    created,
    modified: created,
    name: 'JDARMY BREAK',
    description: 'BREAK（Business Risk Enumeration & Avoidance Knowledge）— 一个开放的业务风险枚举与规避知识框架',
    identity_class: 'organization',
    sectors: ['technology'],
    contact_information: 'https://break.jd.army/',
  };
}

/**
 * 生成全部 Extension Definition SDO
 * @param {string} identityRef - BREAK Identity 的 STIX ID
 * @param {string} created - ISO 8601 创建时间
 * @returns {object[]} Extension Definition SDO 数组
 */
export function createExtensionDefinitions(identityRef, created) {
  return EXTENSION_CONFIGS.map((config) => ({
    type: 'extension-definition',
    spec_version: '2.1',
    id: makeStixId('extension-definition', config.key),
    created,
    modified: created,
    created_by_ref: identityRef,
    name: config.name,
    description: config.description,
    schema: config.schema,
    version: '1.0.0',
    extension_types: config.extensionTypes,
  }));
}

/**
 * 获取指定 BREAK 实体类型对应的 Extension Definition ID
 * @param {string} breakEntityType - BREAK 实体类型 key（如 'risks'、'avoidances'）
 * @returns {string} Extension Definition 的 STIX ID
 */
export function getExtensionId(breakEntityType) {
  const keyMap = {
    risks: 'x-break-risk-ext',
    avoidances: 'x-break-avoidance-ext',
    attackTools: 'x-break-attack-tool-ext',
    threatActors: 'x-break-threat-actor-ext',
    terms: 'x-break-term-ext',
    cases: 'x-break-case-ext',
    businessDomains: 'x-break-business-domain-ext',
  };
  return makeStixId('extension-definition', keyMap[breakEntityType]);
}

// ────────────────────────────────────────
// 5. 日期/时间处理
// ────────────────────────────────────────

/**
 * 将 BREAK 日期/时间字符串转为 STIX 兼容的 ISO 8601 时间戳。
 * 支持三种格式（与 breakSchema.ts 的 incidentTime 一致）：
 *   - YYYY       → 当年 1 月 1 日
 *   - YYYY-MM    → 当月 1 日
 *   - YYYY-MM-DD → 当日
 * @param {string|undefined} dateStr - BREAK 日期字符串
 * @param {string} fallback - 无 dateStr 或非法时使用的回退时间
 * @returns {string} ISO 8601 时间戳
 */
export function toStixTimestamp(dateStr, fallback) {
  if (dateStr) {
    let normalized;
    if (/^\d{4}$/.test(dateStr)) {
      normalized = `${dateStr}-01-01`;
    } else if (/^\d{4}-\d{2}$/.test(dateStr)) {
      normalized = `${dateStr}-01`;
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      normalized = dateStr;
    } else {
      return fallback;
    }
    const date = new Date(`${normalized}T00:00:00.000Z`);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  return fallback;
}

// ────────────────────────────────────────
// 6. Bundle 级辅助
// ────────────────────────────────────────

/**
 * 生成 STIX 2.1 Bundle 对象
 * @param {object[]} objects - Bundle 内的所有 STIX 对象
 * @param {string} locale - 语言标识（'zh-CN' 或 'en'）
 * @returns {object} STIX Bundle
 */
export function createStixBundle(objects, locale) {
  const bundleUuid = generateUUIDv5(`stix-bundle:break:${locale}`, BREAK_NAMESPACE);
  return {
    type: 'bundle',
    id: `bundle--${bundleUuid}`,
    objects,
  };
}
