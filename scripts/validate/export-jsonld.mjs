/**
 * JSON-LD 导出脚本
 *
 * 将 BREAK 全部实体导出为 JSON-LD 格式，面向语义网和知识图谱消费场景。
 * 每个实体作为 @graph 中的一个节点，关系通过 @id 引用表达。
 *
 * 使用方式：
 *   node scripts/validate/export-jsonld.mjs
 *
 * 产物：
 *   public/data/break-ld-zh.jsonld  — 中文 JSON-LD
 *   public/data/break-ld-en.jsonld  — 英文 JSON-LD
 *
 * 前置条件：
 *   需要先执行 export:data、export:data-en、export:stix
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ensureDir, projectRoot, readJson, writeJson } from '../search/common.mjs';
import { ENTITY_TYPE_MAP, makeStixId } from './stix-utils.mjs';

const outputDir = path.join(projectRoot, 'public/data');
const manifestPath = path.join(outputDir, 'break-manifest.json');

// BREAK 实体 URI 基础路径
const ENTITY_BASE_URI = 'https://break.jd.army/entity';
const SCHEMA_BASE_URI = 'https://break.jd.army/schema';

// ────────────────────────────────────────
// 1. @context 定义
// ────────────────────────────────────────

function buildContext() {
  return {
    '@vocab': `${SCHEMA_BASE_URI}/`,
    break: `${SCHEMA_BASE_URI}/`,
    schema: 'https://schema.org/',
    stix: 'https://docs.oasis-open.org/cti/stix/v2.1/',
    // 类型映射
    Risk: 'break:Risk',
    Avoidance: 'break:Avoidance',
    AttackTool: 'break:AttackTool',
    ThreatActor: 'break:ThreatActor',
    Term: 'break:Term',
    Case: 'break:Case',
    BusinessScene: 'break:BusinessScene',
    // 属性映射 → schema.org
    title: 'schema:name',
    description: 'schema:description',
    keywords: 'schema:keywords',
    // 引用关系（@id 引用，表示指向其他实体）
    mitigatedBy: { '@id': 'break:mitigatedBy', '@type': '@id', '@container': '@set' },
    directlyCauses: { '@id': 'break:directlyCauses', '@type': '@id', '@container': '@set' },
    indirectlySupports: { '@id': 'break:indirectlySupports', '@type': '@id', '@container': '@set' },
    buildsTools: { '@id': 'break:buildsTools', '@type': '@id', '@container': '@set' },
    usesTools: { '@id': 'break:usesTools', '@type': '@id', '@container': '@set' },
    relatedRisks: { '@id': 'break:relatedRisks', '@type': '@id', '@container': '@set' },
    relatedAvoidances: { '@id': 'break:relatedAvoidances', '@type': '@id', '@container': '@set' },
    relatedAttackTools: { '@id': 'break:relatedAttackTools', '@type': '@id', '@container': '@set' },
    relatedThreatActors: { '@id': 'break:relatedThreatActors', '@type': '@id', '@container': '@set' },
    relatedBusinessScenes: { '@id': 'break:relatedBusinessScenes', '@type': '@id', '@container': '@set' },
    relatedCases: { '@id': 'break:relatedCases', '@type': '@id', '@container': '@set' },
    // 引用列表
    references: { '@id': 'schema:citation', '@container': '@set' },
    // STIX 互映射
    stixId: { '@id': 'break:stixId' },
    stixType: { '@id': 'break:stixType' },
  };
}

// ────────────────────────────────────────
// 2. 实体 URI 生成
// ────────────────────────────────────────

function entityUri(breakId) {
  return `${ENTITY_BASE_URI}/${breakId}`;
}

// ────────────────────────────────────────
// 3. 实体节点转换
// ────────────────────────────────────────

function convertRiskNode(breakId, entity, relatedCaseIds) {
  const node = {
    '@id': entityUri(breakId),
    '@type': 'Risk',
    breakId,
    stixId: makeStixId('x-break-risk', breakId),
    stixType: 'x-break-risk',
    title: entity.title,
    definition: entity.definition,
    description: entity.description,
    complexity: entity.complexity,
    influence: entity.influence,
    keywords: entity.keywords,
    mitigatedBy: (entity.avoidances || []).map(entityUri),
    references: convertReferences(entity.references),
    updated: entity.updated,
    version: entity.version ?? 1,
  };
  if (relatedCaseIds && relatedCaseIds.length > 0) {
    node.relatedCases = relatedCaseIds.map(entityUri);
  }
  return node;
}

function convertAvoidanceNode(breakId, entity) {
  const node = {
    '@id': entityUri(breakId),
    '@type': 'Avoidance',
    breakId,
    stixId: makeStixId('course-of-action', breakId),
    stixType: 'course-of-action',
    title: entity.title,
    definition: entity.definition,
    description: entity.description,
    category: entity.category,
    keywords: entity.keywords,
    references: convertReferences(entity.references),
    updated: entity.updated,
    version: entity.version ?? 1,
  };
  if (entity.effectiveness) node.effectiveness = entity.effectiveness;
  if (entity.limitation) node.limitation = entity.limitation;
  return node;
}

function convertAttackToolNode(breakId, entity) {
  return {
    '@id': entityUri(breakId),
    '@type': 'AttackTool',
    breakId,
    stixId: makeStixId('tool', breakId),
    stixType: 'tool',
    title: entity.title,
    description: entity.description,
    keywords: entity.keywords,
    directlyCauses: (entity.directCauseRisks || []).map(entityUri),
    indirectlySupports: (entity.indirectSupportRisks || []).map(entityUri),
    mitigatedBy: (entity.avoidances || []).map(entityUri),
    references: convertReferences(entity.references),
    updated: entity.updated,
    version: entity.version ?? 1,
  };
}

function convertThreatActorNode(breakId, entity) {
  return {
    '@id': entityUri(breakId),
    '@type': 'ThreatActor',
    breakId,
    stixId: makeStixId('threat-actor', breakId),
    stixType: 'threat-actor',
    title: entity.title,
    description: entity.description,
    keywords: entity.keywords,
    buildsTools: (entity.buildAttackTools || []).map(entityUri),
    usesTools: (entity.useAttackTools || []).map(entityUri),
    directlyCauses: (entity.directCauseRisks || []).map(entityUri),
    indirectlySupports: (entity.indirectSupportRisks || []).map(entityUri),
    references: convertReferences(entity.references),
    updated: entity.updated,
    version: entity.version ?? 1,
  };
}

function convertTermNode(breakId, entity) {
  return {
    '@id': entityUri(breakId),
    '@type': 'Term',
    breakId,
    stixId: makeStixId('x-break-term', breakId),
    stixType: 'x-break-term',
    title: entity.title,
    definition: entity.definition,
    description: entity.description,
    aliases: entity.aliases || [],
    category: entity.category,
    keywords: entity.keywords,
    usageExample: entity.usageExample || '',
    relatedRisks: (entity.relatedRisks || []).map(entityUri),
    relatedAvoidances: (entity.relatedAvoidances || []).map(entityUri),
    relatedAttackTools: (entity.relatedAttackTools || []).map(entityUri),
    relatedThreatActors: (entity.relatedThreatActors || []).map(entityUri),
    relatedBusinessScenes: (entity.relatedBusinessScenes || []).map(entityUri),
    references: convertReferences(entity.references),
    updated: entity.updated,
    version: entity.version ?? 1,
  };
}

function convertCaseNode(breakId, entity) {
  return {
    '@id': entityUri(breakId),
    '@type': 'Case',
    breakId,
    stixId: makeStixId('report', breakId),
    stixType: 'report',
    title: entity.title,
    summary: entity.summary,
    description: entity.description || '',
    caseCategory: entity.category,
    incidentTime: entity.incidentTime || '',
    keywords: entity.keywords,
    relatedRisks: (entity.relatedRisks || []).map(entityUri),
    relatedAttackTools: (entity.relatedAttackTools || []).map(entityUri),
    relatedThreatActors: (entity.relatedThreatActors || []).map(entityUri),
    references: convertReferences(entity.references),
    updated: entity.updated,
    version: entity.version ?? 1,
  };
}

function convertBusinessSceneNode(breakId, entity) {
  // 展开 riskScenes 中的 risks 为扁平引用
  const sceneRisks = [];
  for (const rs of Object.values(entity.riskScenes || {})) {
    for (const rId of rs.risks || []) {
      sceneRisks.push(entityUri(rId));
    }
  }
  return {
    '@id': entityUri(breakId),
    '@type': 'BusinessScene',
    breakId,
    stixId: makeStixId('x-break-business-scene', breakId),
    stixType: 'x-break-business-scene',
    title: entity.title,
    description: entity.description || '',
    relatedRisks: [...new Set(sceneRisks)],
    updated: entity.updated,
    version: entity.version ?? 1,
  };
}

// ────────────────────────────────────────
// 4. 辅助函数
// ────────────────────────────────────────

function convertReferences(refs) {
  return (refs || []).map((ref) => ({
    '@type': 'schema:CreativeWork',
    'schema:name': ref.title,
    'schema:url': ref.link,
  }));
}

// ────────────────────────────────────────
// 5. 主转换函数
// ────────────────────────────────────────

function convertToJsonLd(breakBundle) {
  const data = breakBundle.data;
  const graph = [];

  // 构建 Case → Risk 倒排索引（哪些 Case 引用了某个 Risk）
  const riskToCases = {};
  for (const [caseId, caseEntity] of Object.entries(data.cases || {})) {
    for (const riskId of caseEntity.relatedRisks || []) {
      if (!riskToCases[riskId]) riskToCases[riskId] = [];
      riskToCases[riskId].push(caseId);
    }
  }

  for (const [id, entity] of Object.entries(data.risks || {})) {
    graph.push(convertRiskNode(id, entity, riskToCases[id] || []));
  }
  for (const [id, entity] of Object.entries(data.avoidances || {})) {
    graph.push(convertAvoidanceNode(id, entity));
  }
  for (const [id, entity] of Object.entries(data.attackTools || {})) {
    graph.push(convertAttackToolNode(id, entity));
  }
  for (const [id, entity] of Object.entries(data.threatActors || {})) {
    graph.push(convertThreatActorNode(id, entity));
  }
  for (const [id, entity] of Object.entries(data.terms || {})) {
    graph.push(convertTermNode(id, entity));
  }
  for (const [id, entity] of Object.entries(data.cases || {})) {
    graph.push(convertCaseNode(id, entity));
  }
  for (const [id, entity] of Object.entries(data.businessScenes || {})) {
    graph.push(convertBusinessSceneNode(id, entity));
  }

  return {
    '@context': buildContext(),
    '@id': 'https://break.jd.army/',
    '@type': 'schema:Dataset',
    'schema:name': 'JDARMY BREAK Knowledge Base',
    'schema:description': 'Business Risk Enumeration & Avoidance Knowledge',
    'schema:version': breakBundle.packageVersion,
    'schema:dateModified': breakBundle.generatedAt,
    'schema:inLanguage': breakBundle.locale === 'zh-CN' ? 'zh' : 'en',
    '@graph': graph,
  };
}

// ────────────────────────────────────────
// 6. 执行导出
// ────────────────────────────────────────

ensureDir(outputDir);

// 中文 JSON-LD
const zhDataPath = path.join(outputDir, 'break-data.json');
if (!fs.existsSync(zhDataPath)) {
  console.error('❌ 缺少 break-data.json，请先运行 npm run export:data');
  process.exit(1);
}
const zhData = readJson(zhDataPath);
const zhLd = convertToJsonLd(zhData);
const zhLdPath = path.join(outputDir, 'break-ld-zh.jsonld');
const zhLdJson = `${JSON.stringify(zhLd, null, 2)}\n`;
fs.writeFileSync(zhLdPath, zhLdJson);

// 英文 JSON-LD
const enDataPath = path.join(outputDir, 'break-data-en.json');
let enLd = null;
if (fs.existsSync(enDataPath)) {
  const enData = readJson(enDataPath);
  enLd = convertToJsonLd(enData);
  const enLdPath = path.join(outputDir, 'break-ld-en.jsonld');
  const enLdJson = `${JSON.stringify(enLd, null, 2)}\n`;
  fs.writeFileSync(enLdPath, enLdJson);
}

// 更新 manifest
const manifest = readJson(manifestPath);
const zhLdSha256 = crypto.createHash('sha256').update(zhLdJson).digest('hex');
manifest.files.jsonldZh = {
  path: 'data/break-ld-zh.jsonld',
  bytes: Buffer.byteLength(zhLdJson),
  sha256: zhLdSha256,
};

if (enLd) {
  const enLdJson = `${JSON.stringify(enLd, null, 2)}\n`;
  const enLdSha256 = crypto.createHash('sha256').update(enLdJson).digest('hex');
  manifest.files.jsonldEn = {
    path: 'data/break-ld-en.jsonld',
    bytes: Buffer.byteLength(enLdJson),
    sha256: enLdSha256,
  };
}

writeJson(manifestPath, manifest);

// 统计
const zhNodeCount = zhLd['@graph'].length;
console.log('\n✅ JSON-LD 导出完成');
console.log(`  中文: ${path.relative(projectRoot, zhLdPath)} (${zhNodeCount} 节点)`);
if (enLd) {
  console.log(`  英文: ${path.relative(projectRoot, path.join(outputDir, 'break-ld-en.jsonld'))} (${enLd['@graph'].length} 节点)`);
}
