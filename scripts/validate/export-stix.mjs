/**
 * STIX 2.1 Bundle 导出脚本
 *
 * 将 BREAK 全部实体和关系映射为合法 STIX 2.1 Bundle，生成中英文双产物。
 *
 * 使用方式：
 *   node scripts/validate/export-stix.mjs
 *
 * 产物：
 *   public/data/break-stix-zh.json  — 中文 STIX 2.1 Bundle
 *   public/data/break-stix-en.json  — 英文 STIX 2.1 Bundle
 *
 * 前置条件：
 *   需要先执行 export:data 和 export:data-en 生成 break-data.json / break-data-en.json
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ensureDir, projectRoot, readJson, writeJson } from '../search/common.mjs';
import {
  ENTITY_TYPE_MAP,
  CROSS_TYPE_RELATIONS,
  INTRA_TYPE_RELATIONS,
  RELATION_TARGET_TYPE,
  makeStixId,
  makeRelationshipId,
  getExtensionId,
  createBreakIdentity,
  createExtensionDefinitions,
  createStixBundle,
  toStixTimestamp,
} from './stix-utils.mjs';

const outputDir = path.join(projectRoot, 'public/data');
const manifestPath = path.join(outputDir, 'break-manifest.json');

// ────────────────────────────────────────
// 1. 实体转换器
// ────────────────────────────────────────

/**
 * 将 Risk 转换为 x-break-risk SDO
 */
function convertRisk(breakId, entity, identityRef, created) {
  const modified = toStixTimestamp(entity.updated, created);
  return {
    type: 'x-break-risk',
    spec_version: '2.1',
    id: makeStixId('x-break-risk', breakId),
    created,
    modified,
    created_by_ref: identityRef,
    name: entity.title,
    description: entity.description,
    external_references: convertReferences(entity.references, breakId),
    extensions: {
      [getExtensionId('risks')]: {
        extension_type: 'new-sdo',
      },
    },
    x_break_id: breakId,
    x_break_definition: entity.definition,
    x_break_complexity: entity.complexity,
    x_break_influence: entity.influence,
    x_break_assessment: entity.riskAssessment ?? null,
    x_break_keywords: entity.keywords,
    x_break_version: entity.version ?? 1,
  };
}

/**
 * 将 Avoidance 转换为 course-of-action SDO + Extension
 */
function convertAvoidance(breakId, entity, identityRef, created) {
  const modified = toStixTimestamp(entity.updated, created);
  const sdo = {
    type: 'course-of-action',
    spec_version: '2.1',
    id: makeStixId('course-of-action', breakId),
    created,
    modified,
    created_by_ref: identityRef,
    name: entity.title,
    description: entity.description,
    external_references: convertReferences(entity.references, breakId),
    extensions: {
      [getExtensionId('avoidances')]: {
        extension_type: 'property-extension',
        x_break_id: breakId,
        x_break_definition: entity.definition,
        x_break_category: entity.category,
        x_break_keywords: entity.keywords,
        x_break_version: entity.version ?? 1,
      },
    },
  };
  if (entity.effectiveness) {
    sdo.extensions[getExtensionId('avoidances')].x_break_effectiveness = entity.effectiveness;
  }
  if (entity.limitation) {
    sdo.extensions[getExtensionId('avoidances')].x_break_limitation = entity.limitation;
  }
  return sdo;
}

/**
 * 将 AttackTool 转换为 tool SDO + Extension
 */
function convertAttackTool(breakId, entity, identityRef, created) {
  const modified = toStixTimestamp(entity.updated, created);
  return {
    type: 'tool',
    spec_version: '2.1',
    id: makeStixId('tool', breakId),
    created,
    modified,
    created_by_ref: identityRef,
    name: entity.title,
    description: entity.description,
    external_references: convertReferences(entity.references, breakId),
    extensions: {
      [getExtensionId('attackTools')]: {
        extension_type: 'property-extension',
        x_break_id: breakId,
        x_break_keywords: entity.keywords,
        x_break_version: entity.version ?? 1,
      },
    },
  };
}

/**
 * 将 ThreatActor 转换为 threat-actor SDO + Extension
 */
function convertThreatActor(breakId, entity, identityRef, created) {
  const modified = toStixTimestamp(entity.updated, created);
  return {
    type: 'threat-actor',
    spec_version: '2.1',
    id: makeStixId('threat-actor', breakId),
    created,
    modified,
    created_by_ref: identityRef,
    name: entity.title,
    description: entity.description,
    threat_actor_types: ['unknown'],
    external_references: convertReferences(entity.references, breakId),
    extensions: {
      [getExtensionId('threatActors')]: {
        extension_type: 'property-extension',
        x_break_id: breakId,
        x_break_keywords: entity.keywords,
        x_break_version: entity.version ?? 1,
      },
    },
  };
}

/**
 * 将 Term 转换为 x-break-term SDO
 */
function convertTerm(breakId, entity, identityRef, created) {
  const modified = toStixTimestamp(entity.updated, created);
  return {
    type: 'x-break-term',
    spec_version: '2.1',
    id: makeStixId('x-break-term', breakId),
    created,
    modified,
    created_by_ref: identityRef,
    name: entity.title,
    description: entity.description,
    external_references: convertReferences(entity.references, breakId),
    extensions: {
      [getExtensionId('terms')]: {
        extension_type: 'new-sdo',
      },
    },
    x_break_id: breakId,
    x_break_definition: entity.definition,
    x_break_aliases: entity.aliases || [],
    x_break_category: entity.category,
    x_break_keywords: entity.keywords,
    x_break_usage_example: entity.usageExample || '',
    x_break_version: entity.version ?? 1,
  };
}

/**
 * 将 Case 转换为 report SDO + Extension
 */
function convertCase(breakId, entity, identityRef, created, allObjects) {
  const modified = toStixTimestamp(entity.updated, created);
  // report 需要 object_refs 引用关联的对象
  const objectRefs = [];
  for (const rId of entity.relatedRisks || []) {
    objectRefs.push(makeStixId('x-break-risk', rId));
  }
  for (const atId of entity.relatedAttackTools || []) {
    objectRefs.push(makeStixId('tool', atId));
  }
  for (const taId of entity.relatedThreatActors || []) {
    objectRefs.push(makeStixId('threat-actor', taId));
  }

  return {
    type: 'report',
    spec_version: '2.1',
    id: makeStixId('report', breakId),
    created,
    modified,
    created_by_ref: identityRef,
    name: entity.title,
    description: entity.description || entity.summary,
    published: entity.incidentTime ? `${entity.incidentTime}-01T00:00:00.000Z` : created,
    report_types: [mapCaseCategoryToReportType(entity.category)],
    object_refs: objectRefs.length > 0 ? objectRefs : [identityRef], // report 至少需要一个 object_ref
    external_references: convertReferences(entity.references, breakId),
    extensions: {
      [getExtensionId('cases')]: {
        extension_type: 'property-extension',
        x_break_id: breakId,
        x_break_summary: entity.summary,
        x_break_case_category: entity.category,
        x_break_incident_time: entity.incidentTime || '',
        x_break_keywords: entity.keywords,
        x_break_version: entity.version ?? 1,
      },
    },
  };
}

/**
 * 将 BusinessScene 转换为 x-break-business-scene SDO
 */
function convertBusinessScene(breakId, entity, identityRef, created) {
  const modified = toStixTimestamp(entity.updated, created);
  return {
    type: 'x-break-business-scene',
    spec_version: '2.1',
    id: makeStixId('x-break-business-scene', breakId),
    created,
    modified,
    created_by_ref: identityRef,
    name: entity.title,
    description: entity.description || '',
    external_references: [],
    extensions: {
      [getExtensionId('businessScenes')]: {
        extension_type: 'new-sdo',
      },
    },
    x_break_id: breakId,
    x_break_risk_dimensions: entity.riskDimensions || {},
    x_break_risk_scenes: entity.riskScenes || {},
    x_break_version: entity.version ?? 1,
  };
}

// ────────────────────────────────────────
// 2. 辅助转换
// ────────────────────────────────────────

/**
 * 转换 references 为 STIX external_references
 */
function convertReferences(refs, breakId) {
  const result = [
    {
      source_name: 'BREAK',
      external_id: breakId,
      url: `https://break.jd.army/`,
    },
  ];
  for (const ref of refs || []) {
    result.push({
      source_name: ref.title,
      url: ref.link,
    });
  }
  return result;
}

/**
 * Case category → STIX report_types 映射
 * 参考 STIX 2.1 report-type-ov 开放词汇表
 */
function mapCaseCategoryToReportType(category) {
  const map = {
    criminal_verdict: 'threat-report',
    administrative_enforcement: 'threat-report',
    security_incident: 'threat-report',
    vulnerability_advisory: 'vulnerability',
    academic_research: 'observed-data',
    news_report: 'campaign',
  };
  return map[category] || 'threat-report';
}

// ────────────────────────────────────────
// 3. 关系提取
// ────────────────────────────────────────

/**
 * 从所有实体中提取跨类型关系 → Relationship SRO
 */
function extractCrossTypeRelations(data, identityRef, created) {
  const relationships = [];
  const seen = new Set();

  // Risk → Avoidance (mitigated-by)
  extractArrayRelations(data.risks, 'risks', 'avoidances', 'risk.avoidances', identityRef, created, relationships, seen);

  // AttackTool → Risk (directly-causes / indirectly-supports)
  extractArrayRelations(data.attackTools, 'attackTools', 'directCauseRisks', 'attackTool.directCauseRisks', identityRef, created, relationships, seen);
  extractArrayRelations(data.attackTools, 'attackTools', 'indirectSupportRisks', 'attackTool.indirectSupportRisks', identityRef, created, relationships, seen);
  // AttackTool → Avoidance (mitigated-by)
  extractArrayRelations(data.attackTools, 'attackTools', 'avoidances', 'attackTool.avoidances', identityRef, created, relationships, seen);

  // ThreatActor → AttackTool (builds / uses)
  extractArrayRelations(data.threatActors, 'threatActors', 'buildAttackTools', 'threatActor.buildAttackTools', identityRef, created, relationships, seen);
  extractArrayRelations(data.threatActors, 'threatActors', 'useAttackTools', 'threatActor.useAttackTools', identityRef, created, relationships, seen);
  // ThreatActor → Risk
  extractArrayRelations(data.threatActors, 'threatActors', 'directCauseRisks', 'threatActor.directCauseRisks', identityRef, created, relationships, seen);
  extractArrayRelations(data.threatActors, 'threatActors', 'indirectSupportRisks', 'threatActor.indirectSupportRisks', identityRef, created, relationships, seen);

  // Case → Risk / AttackTool / ThreatActor
  extractArrayRelations(data.cases, 'cases', 'relatedRisks', 'case.relatedRisks', identityRef, created, relationships, seen);
  extractArrayRelations(data.cases, 'cases', 'relatedAttackTools', 'case.relatedAttackTools', identityRef, created, relationships, seen);
  extractArrayRelations(data.cases, 'cases', 'relatedThreatActors', 'case.relatedThreatActors', identityRef, created, relationships, seen);

  // Term → 各类实体
  extractArrayRelations(data.terms, 'terms', 'relatedRisks', 'term.relatedRisks', identityRef, created, relationships, seen);
  extractArrayRelations(data.terms, 'terms', 'relatedAvoidances', 'term.relatedAvoidances', identityRef, created, relationships, seen);
  extractArrayRelations(data.terms, 'terms', 'relatedAttackTools', 'term.relatedAttackTools', identityRef, created, relationships, seen);
  extractArrayRelations(data.terms, 'terms', 'relatedThreatActors', 'term.relatedThreatActors', identityRef, created, relationships, seen);
  extractArrayRelations(data.terms, 'terms', 'relatedBusinessScenes', 'term.relatedBusinessScenes', identityRef, created, relationships, seen);

  return relationships;
}

/**
 * 从 ID 数组字段提取关系
 */
function extractArrayRelations(entities, sourceEntityType, fieldName, relationKey, identityRef, created, relationships, seen) {
  const stixRelType = CROSS_TYPE_RELATIONS[relationKey];
  const targetEntityType = RELATION_TARGET_TYPE[relationKey];
  if (!stixRelType || !targetEntityType) return;

  const sourceStixType = ENTITY_TYPE_MAP[sourceEntityType];
  const targetStixType = ENTITY_TYPE_MAP[targetEntityType];

  for (const [breakId, entity] of Object.entries(entities || {})) {
    const targetIds = entity[fieldName];
    if (!Array.isArray(targetIds)) continue;

    const sourceRef = makeStixId(sourceStixType, breakId);
    for (const targetBreakId of targetIds) {
      const targetRef = makeStixId(targetStixType, targetBreakId);
      const dedupKey = `${sourceRef}|${stixRelType}|${targetRef}`;

      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);

      relationships.push({
        type: 'relationship',
        spec_version: '2.1',
        id: makeRelationshipId(sourceRef, targetRef, stixRelType),
        created,
        modified: created,
        created_by_ref: identityRef,
        relationship_type: stixRelType,
        source_ref: sourceRef,
        target_ref: targetRef,
      });
    }
  }
}

/**
 * 从同类型内部关系数组提取 Relationship SRO
 */
function extractIntraTypeRelations(data, identityRef, created) {
  const relationships = [];
  const seen = new Set();

  // Risk.relatedRisks
  extractObjectRelations(data.risks, 'risks', 'relatedRisks', 'risk', identityRef, created, relationships, seen);
  // Avoidance.relatedAvoidances
  extractObjectRelations(data.avoidances, 'avoidances', 'relatedAvoidances', 'avoidance', identityRef, created, relationships, seen);
  // AttackTool.relatedAttackTools
  extractObjectRelations(data.attackTools, 'attackTools', 'relatedAttackTools', 'attackTool', identityRef, created, relationships, seen);
  // ThreatActor.relatedThreatActors
  extractObjectRelations(data.threatActors, 'threatActors', 'relatedThreatActors', 'threatActor', identityRef, created, relationships, seen);

  return relationships;
}

/**
 * 从对象数组字段（{ key, relation, note }）提取关系
 */
function extractObjectRelations(entities, entityType, fieldName, relationPrefix, identityRef, created, relationships, seen) {
  const stixType = ENTITY_TYPE_MAP[entityType];

  for (const [breakId, entity] of Object.entries(entities || {})) {
    const relations = entity[fieldName];
    if (!Array.isArray(relations)) continue;

    const sourceRef = makeStixId(stixType, breakId);
    for (const rel of relations) {
      const stixRelType = INTRA_TYPE_RELATIONS[`${relationPrefix}.${rel.relation}`];
      if (!stixRelType) continue;

      const targetRef = makeStixId(stixType, rel.key);
      const dedupKey = `${sourceRef}|${stixRelType}|${targetRef}`;

      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);

      const relationship = {
        type: 'relationship',
        spec_version: '2.1',
        id: makeRelationshipId(sourceRef, targetRef, stixRelType),
        created,
        modified: created,
        created_by_ref: identityRef,
        relationship_type: stixRelType,
        source_ref: sourceRef,
        target_ref: targetRef,
      };
      if (rel.note) {
        relationship.description = rel.note;
      }
      relationships.push(relationship);
    }
  }
}

// ────────────────────────────────────────
// 4. BusinessScene 内部关系
// ────────────────────────────────────────

/**
 * 从 BusinessScene 的 riskScenes[].risks 提取 场景 → Risk 关系
 */
function extractBusinessSceneRelations(businessScenes, identityRef, created) {
  const relationships = [];
  const seen = new Set();

  for (const [bsId, bs] of Object.entries(businessScenes || {})) {
    const sourceRef = makeStixId('x-break-business-scene', bsId);
    for (const rs of Object.values(bs.riskScenes || {})) {
      for (const riskId of rs.risks || []) {
        const targetRef = makeStixId('x-break-risk', riskId);
        const relType = 'related-to';
        const dedupKey = `${sourceRef}|${relType}|${targetRef}`;

        if (seen.has(dedupKey)) continue;
        seen.add(dedupKey);

        relationships.push({
          type: 'relationship',
          spec_version: '2.1',
          id: makeRelationshipId(sourceRef, targetRef, relType),
          created,
          modified: created,
          created_by_ref: identityRef,
          relationship_type: relType,
          source_ref: sourceRef,
          target_ref: targetRef,
        });
      }
    }
  }
  return relationships;
}

// ────────────────────────────────────────
// 5. 主导出流程
// ────────────────────────────────────────

/**
 * 将 BREAK 数据 bundle 转换为 STIX 2.1 Bundle
 * @param {object} breakBundle - break-data.json 或 break-data-en.json 的内容
 * @returns {object} STIX 2.1 Bundle
 */
function convertToStixBundle(breakBundle) {
  const created = breakBundle.generatedAt;
  const locale = breakBundle.locale;
  const data = breakBundle.data;

  // 1. Identity
  const identity = createBreakIdentity(created);
  const identityRef = identity.id;

  // 2. Extension Definitions
  const extensions = createExtensionDefinitions(identityRef, created);

  // 3. 转换全部 SDO
  const sdos = [];

  for (const [breakId, entity] of Object.entries(data.risks || {})) {
    sdos.push(convertRisk(breakId, entity, identityRef, created));
  }
  for (const [breakId, entity] of Object.entries(data.avoidances || {})) {
    sdos.push(convertAvoidance(breakId, entity, identityRef, created));
  }
  for (const [breakId, entity] of Object.entries(data.attackTools || {})) {
    sdos.push(convertAttackTool(breakId, entity, identityRef, created));
  }
  for (const [breakId, entity] of Object.entries(data.threatActors || {})) {
    sdos.push(convertThreatActor(breakId, entity, identityRef, created));
  }
  for (const [breakId, entity] of Object.entries(data.terms || {})) {
    sdos.push(convertTerm(breakId, entity, identityRef, created));
  }
  for (const [breakId, entity] of Object.entries(data.cases || {})) {
    sdos.push(convertCase(breakId, entity, identityRef, created));
  }
  for (const [breakId, entity] of Object.entries(data.businessScenes || {})) {
    sdos.push(convertBusinessScene(breakId, entity, identityRef, created));
  }

  // 4. 提取全部关系
  const crossRels = extractCrossTypeRelations(data, identityRef, created);
  const intraRels = extractIntraTypeRelations(data, identityRef, created);
  const bsRels = extractBusinessSceneRelations(data.businessScenes, identityRef, created);

  // 5. 组装 Bundle
  const allObjects = [identity, ...extensions, ...sdos, ...crossRels, ...intraRels, ...bsRels];
  return createStixBundle(allObjects, locale);
}

// ────────────────────────────────────────
// 6. 执行导出
// ────────────────────────────────────────

ensureDir(outputDir);

// 中文 STIX Bundle
const zhDataPath = path.join(outputDir, 'break-data.json');
if (!fs.existsSync(zhDataPath)) {
  console.error('❌ 缺少 break-data.json，请先运行 npm run export:data');
  process.exit(1);
}
const zhData = readJson(zhDataPath);
const zhBundle = convertToStixBundle(zhData);
const zhStixPath = path.join(outputDir, 'break-stix-zh.json');
const zhStixJson = `${JSON.stringify(zhBundle, null, 2)}\n`;
fs.writeFileSync(zhStixPath, zhStixJson);

// 英文 STIX Bundle
const enDataPath = path.join(outputDir, 'break-data-en.json');
let enBundle = null;
if (fs.existsSync(enDataPath)) {
  const enData = readJson(enDataPath);
  enBundle = convertToStixBundle(enData);
  const enStixPath = path.join(outputDir, 'break-stix-en.json');
  const enStixJson = `${JSON.stringify(enBundle, null, 2)}\n`;
  fs.writeFileSync(enStixPath, enStixJson);
}

// 更新 manifest
const manifest = readJson(manifestPath);
const zhSha256 = crypto.createHash('sha256').update(zhStixJson).digest('hex');
manifest.files.stixZh = {
  path: 'data/break-stix-zh.json',
  bytes: Buffer.byteLength(zhStixJson),
  sha256: zhSha256,
};

if (enBundle) {
  const enStixJson = `${JSON.stringify(enBundle, null, 2)}\n`;
  const enSha256 = crypto.createHash('sha256').update(enStixJson).digest('hex');
  manifest.files.stixEn = {
    path: 'data/break-stix-en.json',
    bytes: Buffer.byteLength(enStixJson),
    sha256: enSha256,
  };
}

writeJson(manifestPath, manifest);

// 统计输出
const sdoCount = zhBundle.objects.filter((o) => o.type !== 'relationship').length;
const relCount = zhBundle.objects.filter((o) => o.type === 'relationship').length;
const extCount = zhBundle.objects.filter((o) => o.type === 'extension-definition').length;
const identityCount = zhBundle.objects.filter((o) => o.type === 'identity').length;
console.log('\n✅ STIX 2.1 导出完成');
console.log(`  中文 Bundle: ${path.relative(projectRoot, zhStixPath)}`);
if (enBundle) {
  console.log(`  英文 Bundle: ${path.relative(projectRoot, path.join(outputDir, 'break-stix-en.json'))}`);
}
console.log(`  SDO 数量: ${sdoCount}（含 ${identityCount} Identity + ${extCount} Extension Definitions）`);
console.log(`  Relationship 数量: ${relCount}`);
console.log(`  总对象数: ${zhBundle.objects.length}`);
