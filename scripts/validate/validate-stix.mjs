/**
 * STIX 2.1 Bundle 校验脚本
 *
 * 三层校验：
 *   Layer 1：结构校验（STIX 对象必填字段、ID 格式、类型合法性、标准 SDO/SRO 关键属性）
 *   Layer 2：引用完整性（source_ref / target_ref / object_refs 均指向 bundle 内对象）
 *   Layer 3：BREAK 业务规则（实体数量一致、Relationship 数量与源数据关系引用总数一致、
 *            中英文 UUID 一致、Extension Definition 存在）
 *   JSON-LD：@context/@graph/@id/@type/stixId 结构校验 + jsonld npm 包 expansion 规范级校验
 *
 * 使用方式：
 *   node scripts/validate/validate-stix.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import jsonld from 'jsonld';
import { projectRoot, readJson } from '../search/common.mjs';

const outputDir = path.join(projectRoot, 'public/data');
const issues = [];
let issueCount = 0;

function addIssue(level, message) {
  issues.push({ level, message });
  issueCount++;
}

// ────────────────────────────────────────
// 1. 加载 Bundle
// ────────────────────────────────────────

const zhStixPath = path.join(outputDir, 'break-stix-zh.json');
if (!fs.existsSync(zhStixPath)) {
  console.error('❌ 缺少 break-stix-zh.json，请先运行 npm run export:stix');
  process.exit(1);
}
const zhBundle = readJson(zhStixPath);

const enStixPath = path.join(outputDir, 'break-stix-en.json');
const enBundle = fs.existsSync(enStixPath) ? readJson(enStixPath) : null;

const zhDataPath = path.join(outputDir, 'break-data.json');
const zhData = fs.existsSync(zhDataPath) ? readJson(zhDataPath) : null;

// ────────────────────────────────────────
// 2. Layer 1：结构校验
// ────────────────────────────────────────

function validateStructure(bundle, label) {
  if (bundle.type !== 'bundle') {
    addIssue('L1', `[${label}] 顶层 type 必须是 "bundle"，实际: ${bundle.type}`);
  }

  if (!bundle.id || !bundle.id.startsWith('bundle--')) {
    addIssue('L1', `[${label}] bundle id 格式错误: ${bundle.id}`);
  }

  if (!Array.isArray(bundle.objects) || bundle.objects.length === 0) {
    addIssue('L1', `[${label}] objects 必须是非空数组`);
    return;
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

  for (let i = 0; i < bundle.objects.length; i++) {
    const obj = bundle.objects[i];
    const prefix = `[${label}] objects[${i}]`;

    // type 必须存在
    if (!obj.type || typeof obj.type !== 'string') {
      addIssue('L1', `${prefix}: 缺少 type 字段`);
      continue;
    }

    // id 格式：{type}--{uuid}
    if (!obj.id) {
      addIssue('L1', `${prefix} (${obj.type}): 缺少 id`);
    } else {
      const expectedPrefix = `${obj.type}--`;
      if (!obj.id.startsWith(expectedPrefix)) {
        addIssue('L1', `${prefix}: id 前缀与 type 不匹配 (id=${obj.id}, type=${obj.type})`);
      }
      const uuid = obj.id.slice(expectedPrefix.length);
      if (!uuidRegex.test(uuid)) {
        addIssue('L1', `${prefix}: id 中的 UUID 格式非法 (${uuid})`);
      }
    }

    // spec_version（非 bundle 对象需要）
    if (obj.type !== 'bundle' && obj.spec_version !== '2.1') {
      addIssue('L1', `${prefix} (${obj.type}): spec_version 应为 "2.1"，实际: ${obj.spec_version}`);
    }

    // created / modified
    if (!obj.created) {
      addIssue('L1', `${prefix} (${obj.type} ${obj.id}): 缺少 created`);
    }
    if (!obj.modified) {
      addIssue('L1', `${prefix} (${obj.type} ${obj.id}): 缺少 modified`);
    }

    // Relationship 特有字段
    if (obj.type === 'relationship') {
      if (!obj.relationship_type) {
        addIssue('L1', `${prefix} (${obj.id}): 缺少 relationship_type`);
      }
      if (!obj.source_ref) {
        addIssue('L1', `${prefix} (${obj.id}): 缺少 source_ref`);
      }
      if (!obj.target_ref) {
        addIssue('L1', `${prefix} (${obj.id}): 缺少 target_ref`);
      }
    }

    // report 对象必须有 object_refs
    if (obj.type === 'report') {
      if (!Array.isArray(obj.object_refs) || obj.object_refs.length === 0) {
        addIssue('L1', `${prefix} (${obj.id}): report 缺少 object_refs`);
      }
      if (!obj.published) {
        addIssue('L1', `${prefix} (${obj.id}): report 缺少 published`);
      }
      if (!Array.isArray(obj.report_types) || obj.report_types.length === 0) {
        addIssue('L1', `${prefix} (${obj.id}): report 缺少 report_types`);
      }
    }

    // 标准类型的关键必填属性校验（STIX 2.1 规范）
    // identity: name 必填
    if (obj.type === 'identity' && !obj.name) {
      addIssue('L1', `${prefix} (${obj.id}): identity 缺少 name`);
    }
    // extension-definition: name / schema / extension_types 必填
    if (obj.type === 'extension-definition') {
      if (!obj.name) addIssue('L1', `${prefix} (${obj.id}): extension-definition 缺少 name`);
      if (!obj.schema) addIssue('L1', `${prefix} (${obj.id}): extension-definition 缺少 schema`);
      if (!Array.isArray(obj.extension_types) || obj.extension_types.length === 0) {
        addIssue('L1', `${prefix} (${obj.id}): extension-definition 缺少 extension_types`);
      }
    }
    // threat-actor: name 必填（threat_actor_types 已在导出时填充）
    if (obj.type === 'threat-actor' && !obj.name) {
      addIssue('L1', `${prefix} (${obj.id}): threat-actor 缺少 name`);
    }
    // tool: name 必填
    if (obj.type === 'tool' && !obj.name) {
      addIssue('L1', `${prefix} (${obj.id}): tool 缺少 name`);
    }
    // course-of-action: name 必填
    if (obj.type === 'course-of-action' && !obj.name) {
      addIssue('L1', `${prefix} (${obj.id}): course-of-action 缺少 name`);
    }
    // 自定义 SDO（x-break-*）: name 必填
    if (obj.type?.startsWith('x-break-') && !obj.name) {
      addIssue('L1', `${prefix} (${obj.id}): ${obj.type} 缺少 name`);
    }
    // 自定义 SDO 必须通过 extensions 声明其 Extension Definition（new-sdo）
    if (obj.type?.startsWith('x-break-')) {
      if (!obj.extensions || Object.keys(obj.extensions).length === 0) {
        addIssue('L1', `${prefix} (${obj.id}): ${obj.type} 缺少 extensions 声明`);
      }
    }
  }
}

// ────────────────────────────────────────
// 3. Layer 2：引用完整性
// ────────────────────────────────────────

function validateReferences(bundle, label) {
  const objectIds = new Set(bundle.objects.map((o) => o.id));

  for (let i = 0; i < bundle.objects.length; i++) {
    const obj = bundle.objects[i];
    const prefix = `[${label}] objects[${i}]`;

    // created_by_ref
    if (obj.created_by_ref && !objectIds.has(obj.created_by_ref)) {
      addIssue('L2', `${prefix} (${obj.id}): created_by_ref 引用不存在: ${obj.created_by_ref}`);
    }

    // Relationship source_ref / target_ref
    if (obj.type === 'relationship') {
      if (obj.source_ref && !objectIds.has(obj.source_ref)) {
        addIssue('L2', `${prefix} (${obj.id}): source_ref 引用不存在: ${obj.source_ref}`);
      }
      if (obj.target_ref && !objectIds.has(obj.target_ref)) {
        addIssue('L2', `${prefix} (${obj.id}): target_ref 引用不存在: ${obj.target_ref}`);
      }
    }

    // report object_refs
    if (obj.type === 'report' && Array.isArray(obj.object_refs)) {
      for (const ref of obj.object_refs) {
        if (!objectIds.has(ref)) {
          addIssue('L2', `${prefix} (${obj.id}): object_refs 引用不存在: ${ref}`);
        }
      }
    }

    // extension-definition 引用
    if (obj.extensions) {
      for (const extId of Object.keys(obj.extensions)) {
        if (!objectIds.has(extId)) {
          addIssue('L2', `${prefix} (${obj.id}): extension 引用不存在: ${extId}`);
        }
      }
    }
  }
}

// ────────────────────────────────────────
// 4. Layer 3：BREAK 业务规则
// ────────────────────────────────────────

function validateBusinessRules(bundle, label) {
  const objects = bundle.objects;

  // 必须有 Identity
  const identities = objects.filter((o) => o.type === 'identity');
  if (identities.length === 0) {
    addIssue('L3', `[${label}] 缺少 Identity SDO`);
  } else if (!identities[0].name.includes('BREAK')) {
    addIssue('L3', `[${label}] Identity name 应包含 "BREAK"，实际: ${identities[0].name}`);
  }

  // 必须有 7 个 Extension Definition
  const extDefs = objects.filter((o) => o.type === 'extension-definition');
  if (extDefs.length !== 7) {
    addIssue('L3', `[${label}] Extension Definition 数量应为 7，实际: ${extDefs.length}`);
  }

  // 与 break-data.json 的实体数量对比
  if (zhData) {
    const data = zhData.data;
    const typeCounts = {
      'x-break-risk': Object.keys(data.risks || {}).length,
      'course-of-action': Object.keys(data.avoidances || {}).length,
      'tool': Object.keys(data.attackTools || {}).length,
      'threat-actor': Object.keys(data.threatActors || {}).length,
      'x-break-term': Object.keys(data.terms || {}).length,
      'report': Object.keys(data.cases || {}).length,
      'x-break-business-scene': Object.keys(data.businessScenes || {}).length,
    };

    for (const [stixType, expectedCount] of Object.entries(typeCounts)) {
      const actualCount = objects.filter((o) => o.type === stixType).length;
      if (actualCount !== expectedCount) {
        addIssue('L3', `[${label}] ${stixType} 数量不匹配：STIX ${actualCount} vs BREAK ${expectedCount}`);
      }
    }

    // Relationship 数量与源数据关系引用总数交叉校验
    const actualRelCount = objects.filter((o) => o.type === 'relationship').length;
    const expectedRelCount = countExpectedRelationships(data);
    if (actualRelCount !== expectedRelCount) {
      addIssue('L3', `[${label}] Relationship 数量不匹配：STIX ${actualRelCount} vs 源数据预期 ${expectedRelCount}`);
    }
  }
}

/**
 * 统计源数据中应当导出的关系引用总数（与 export-stix.mjs 的去重逻辑一致）
 */
function countExpectedRelationships(data) {
  const seen = new Set();

  // 辅助：统计 ID 数组字段产生的关系数（去重）
  function countArrayField(entities, sourcePrefix, fieldName, relType, targetPrefix) {
    for (const [id, entity] of Object.entries(entities || {})) {
      const arr = entity[fieldName];
      if (!Array.isArray(arr)) continue;
      for (const targetId of arr) {
        const key = `${sourcePrefix}:${id}|${relType}|${targetPrefix}:${targetId}`;
        seen.add(key);
      }
    }
  }

  // 辅助：统计对象数组字段（{ key, relation }）产生的关系数（去重）
  function countObjectField(entities, prefix, fieldName) {
    for (const [id, entity] of Object.entries(entities || {})) {
      const arr = entity[fieldName];
      if (!Array.isArray(arr)) continue;
      for (const rel of arr) {
        const key = `${prefix}:${id}|${rel.relation}|${prefix}:${rel.key}`;
        seen.add(key);
      }
    }
  }

  // 跨类型关系
  countArrayField(data.risks, 'R', 'avoidances', 'mitigated-by', 'A');
  countArrayField(data.attackTools, 'AT', 'directCauseRisks', 'x-break-directly-causes', 'R');
  countArrayField(data.attackTools, 'AT', 'indirectSupportRisks', 'x-break-indirectly-supports', 'R');
  countArrayField(data.attackTools, 'AT', 'avoidances', 'mitigated-by', 'A');
  countArrayField(data.threatActors, 'TA', 'buildAttackTools', 'x-break-builds', 'AT');
  countArrayField(data.threatActors, 'TA', 'useAttackTools', 'uses', 'AT');
  countArrayField(data.threatActors, 'TA', 'directCauseRisks', 'x-break-directly-causes', 'R');
  countArrayField(data.threatActors, 'TA', 'indirectSupportRisks', 'x-break-indirectly-supports', 'R');
  countArrayField(data.cases, 'C', 'relatedRisks', 'related-to', 'R');
  countArrayField(data.cases, 'C', 'relatedAttackTools', 'related-to', 'AT');
  countArrayField(data.cases, 'C', 'relatedThreatActors', 'related-to', 'TA');
  countArrayField(data.terms, 'T', 'relatedRisks', 'related-to', 'R');
  countArrayField(data.terms, 'T', 'relatedAvoidances', 'related-to', 'A');
  countArrayField(data.terms, 'T', 'relatedAttackTools', 'related-to', 'AT');
  countArrayField(data.terms, 'T', 'relatedThreatActors', 'related-to', 'TA');
  countArrayField(data.terms, 'T', 'relatedBusinessScenes', 'related-to', 'BS');

  // 同类型内部关系
  countObjectField(data.risks, 'R', 'relatedRisks');
  countObjectField(data.avoidances, 'A', 'relatedAvoidances');
  countObjectField(data.attackTools, 'AT', 'relatedAttackTools');
  countObjectField(data.threatActors, 'TA', 'relatedThreatActors');

  // BusinessScene → Risk（riskScenes.*.risks）
  for (const [bsId, bs] of Object.entries(data.businessScenes || {})) {
    for (const rs of Object.values(bs.riskScenes || {})) {
      for (const riskId of rs.risks || []) {
        const key = `BS:${bsId}|related-to|R:${riskId}`;
        seen.add(key);
      }
    }
  }

  return seen.size;
}

// ────────────────────────────────────────
// 5. 中英文 UUID 一致性校验
// ────────────────────────────────────────

function validateBilingualConsistency() {
  if (!enBundle) return;

  const zhIds = new Set(zhBundle.objects.map((o) => o.id));
  const enIds = new Set(enBundle.objects.map((o) => o.id));

  // 检查两边 ID 集合是否一致
  for (const id of zhIds) {
    if (!enIds.has(id)) {
      addIssue('L3', `[双语一致性] 中文 Bundle 含 ${id}，但英文 Bundle 不含`);
    }
  }
  for (const id of enIds) {
    if (!zhIds.has(id)) {
      addIssue('L3', `[双语一致性] 英文 Bundle 含 ${id}，但中文 Bundle 不含`);
    }
  }

  // 检查总对象数一致
  if (zhBundle.objects.length !== enBundle.objects.length) {
    addIssue('L3', `[双语一致性] 对象数不一致：中文 ${zhBundle.objects.length} vs 英文 ${enBundle.objects.length}`);
  }
}

// ────────────────────────────────────────
// 6. JSON-LD 校验
// ────────────────────────────────────────

const zhLdPath = path.join(outputDir, 'break-ld-zh.jsonld');
const enLdPath = path.join(outputDir, 'break-ld-en.jsonld');
const zhLd = fs.existsSync(zhLdPath) ? readJson(zhLdPath) : null;
const enLd = fs.existsSync(enLdPath) ? readJson(enLdPath) : null;

function validateJsonLd(ld, label) {
  if (!ld) return;

  // @context 必须存在
  if (!ld['@context'] || typeof ld['@context'] !== 'object') {
    addIssue('LD', `[${label}] 缺少 @context`);
  }

  // @graph 必须存在且非空
  if (!Array.isArray(ld['@graph']) || ld['@graph'].length === 0) {
    addIssue('LD', `[${label}] @graph 必须是非空数组`);
    return;
  }

  // 检查每个节点有 @id 和 @type
  const nodeIds = new Set();
  for (let i = 0; i < ld['@graph'].length; i++) {
    const node = ld['@graph'][i];
    if (!node['@id']) {
      addIssue('LD', `[${label}] @graph[${i}]: 缺少 @id`);
    } else {
      nodeIds.add(node['@id']);
    }
    if (!node['@type']) {
      addIssue('LD', `[${label}] @graph[${i}] (${node['@id']}): 缺少 @type`);
    }
    // 验证 stixId 存在
    if (!node.stixId) {
      addIssue('LD', `[${label}] @graph[${i}] (${node['@id']}): 缺少 stixId`);
    }
  }

  // 验证 stixId 与 STIX Bundle 的对应关系
  if (label.includes('zh') && zhBundle) {
    const stixIds = new Set(zhBundle.objects.filter((o) => o.type !== 'relationship' && o.type !== 'extension-definition' && o.type !== 'identity').map((o) => o.id));
    for (const node of ld['@graph']) {
      if (node.stixId && !stixIds.has(node.stixId)) {
        addIssue('LD', `[${label}] 节点 ${node['@id']} 的 stixId ${node.stixId} 在 STIX Bundle 中不存在`);
      }
    }
  }
}

/**
 * 使用 jsonld npm 包对 JSON-LD 文档进行 expansion 规范级校验
 * 验证 @context 合法性和文档结构可被正确解析
 */
async function validateJsonLdExpansion(ld, label) {
  if (!ld) return;
  try {
    const expanded = await jsonld.expand(ld);
    if (!Array.isArray(expanded) || expanded.length === 0) {
      addIssue('LD', `[${label}] jsonld.expand() 返回空结果，文档可能结构异常`);
    }
  } catch (err) {
    addIssue('LD', `[${label}] jsonld.expand() 失败: ${err.message}`);
  }
}

function validateJsonLdBilingualConsistency() {
  if (!zhLd || !enLd) return;

  const zhIds = new Set(zhLd['@graph'].map((n) => n['@id']));
  const enIds = new Set(enLd['@graph'].map((n) => n['@id']));

  if (zhIds.size !== enIds.size) {
    addIssue('LD', `[双语一致性] JSON-LD 节点数不一致：中文 ${zhIds.size} vs 英文 ${enIds.size}`);
  }

  for (const id of zhIds) {
    if (!enIds.has(id)) {
      addIssue('LD', `[双语一致性] 中文 JSON-LD 含 ${id}，但英文不含`);
    }
  }
}

// ────────────────────────────────────────
// 7. 执行校验
// ────────────────────────────────────────

async function runValidation() {
  console.log('🔍 STIX 2.1 Bundle 校验...\n');

  // 中文 Bundle
  console.log('Layer 1: 结构校验 (zh-CN)...');
  validateStructure(zhBundle, 'zh-CN');

  console.log('Layer 2: 引用完整性 (zh-CN)...');
  validateReferences(zhBundle, 'zh-CN');

  console.log('Layer 3: 业务规则 (zh-CN)...');
  validateBusinessRules(zhBundle, 'zh-CN');

  // 英文 Bundle
  if (enBundle) {
    console.log('Layer 1: 结构校验 (en)...');
    validateStructure(enBundle, 'en');

    console.log('Layer 2: 引用完整性 (en)...');
    validateReferences(enBundle, 'en');

    console.log('Layer 3: 业务规则 (en)...');
    validateBusinessRules(enBundle, 'en');

    console.log('Layer 3: 双语一致性...');
    validateBilingualConsistency();
  }

  // JSON-LD 校验
  if (zhLd) {
    console.log('JSON-LD: 结构校验 (zh-CN)...');
    validateJsonLd(zhLd, 'zh-CN');
    console.log('JSON-LD: expansion 校验 (zh-CN)...');
    await validateJsonLdExpansion(zhLd, 'zh-CN');
  }
  if (enLd) {
    console.log('JSON-LD: 结构校验 (en)...');
    validateJsonLd(enLd, 'en');
    console.log('JSON-LD: expansion 校验 (en)...');
    await validateJsonLdExpansion(enLd, 'en');
  }
  if (zhLd && enLd) {
    console.log('JSON-LD: 双语一致性...');
    validateJsonLdBilingualConsistency();
  }

  // 输出结果
  if (issueCount === 0) {
    const zhObjCount = zhBundle.objects.length;
    const enObjCount = enBundle ? enBundle.objects.length : 0;
    const zhRelCount = zhBundle.objects.filter((o) => o.type === 'relationship').length;
    console.log(`\n✅ STIX Bundle + JSON-LD 校验通过`);
    console.log(`  STIX 中文 Bundle: ${zhObjCount} 个对象 (${zhRelCount} Relationships)`);
    if (enBundle) {
      console.log(`  STIX 英文 Bundle: ${enObjCount} 个对象`);
    }
    if (zhLd) {
      console.log(`  JSON-LD 中文: ${zhLd['@graph'].length} 个节点 (expansion ✓)`);
    }
    if (enLd) {
      console.log(`  JSON-LD 英文: ${enLd['@graph'].length} 个节点 (expansion ✓)`);
    }
  } else {
    console.log(`\n❌ 校验失败（${issueCount} 个问题）：\n`);
    const byLevel = {};
    for (const issue of issues) {
      if (!byLevel[issue.level]) byLevel[issue.level] = [];
      byLevel[issue.level].push(issue.message);
    }
    for (const [level, msgs] of Object.entries(byLevel)) {
      console.log(`  [${level}] ${msgs.length} 个问题:`);
      // 限制输出行数，避免刷屏
      const show = msgs.slice(0, 20);
      for (const msg of show) {
        console.log(`    - ${msg}`);
      }
      if (msgs.length > 20) {
        console.log(`    ... 还有 ${msgs.length - 20} 个同类问题`);
      }
    }
    process.exit(1);
  }
}

runValidation();
