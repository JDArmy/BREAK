// B 类 subagent 交叉判断：是否应从实体提炼新实体（建议新增维度）
// 规则：should_extract_new — 变更实体内容 + 全库已有实体，判断是否应提炼新风险/规避手段/攻击工具/威胁行为者/术语/案例

import { getChangedEntities, parseArgs } from './changed-entities.mjs';
import { loadAllEntities, normalizeTitle } from './llm-review-helpers.mjs';
import { runSubagentReview, exitCodeFor } from '../llm/subagent-review.mjs';

const opts = parseArgs(process.argv.slice(2));
const REVIEW_POLICY_VERSION = 'entity-index-v5-independent-structured-only';
const ENTITY_TYPES = ['risks', 'avoidances', 'attack-tools', 'threat-actors', 'terms'];
const STRUCTURED_SUGGESTION_FIELDS = {
  newRisks: 'risks',
  newAvoidances: 'avoidances',
  newAttackTools: 'attack-tools',
  newThreatActors: 'threat-actors',
  newTerms: 'terms',
};
const TYPE_LABELS = {
  risks: 'Risk',
  avoidances: 'Avoidance',
  'attack-tools': 'AttackTool',
  'threat-actors': 'ThreatActor',
  terms: 'Term',
};
const SUGGESTION_TYPE_ALIASES = {
  risk: 'risks',
  risks: 'risks',
  Risk: 'risks',
  newRisk: 'risks',
  newRisks: 'risks',
  avoid: 'avoidances',
  avoidance: 'avoidances',
  avoidances: 'avoidances',
  Avoidance: 'avoidances',
  newAvoidance: 'avoidances',
  newAvoidances: 'avoidances',
  AttackTool: 'attack-tools',
  attackTool: 'attack-tools',
  attackTools: 'attack-tools',
  'attack-tool': 'attack-tools',
  'attack-tools': 'attack-tools',
  newAttackTool: 'attack-tools',
  newAttackTools: 'attack-tools',
  ThreatActor: 'threat-actors',
  threatActor: 'threat-actors',
  threatActors: 'threat-actors',
  'threat-actor': 'threat-actors',
  'threat-actors': 'threat-actors',
  newThreatActor: 'threat-actors',
  newThreatActors: 'threat-actors',
  term: 'terms',
  terms: 'terms',
  Term: 'terms',
  newTerm: 'terms',
  newTerms: 'terms',
  风险: 'risks',
  规避手段: 'avoidances',
  攻击工具: 'attack-tools',
  威胁行为者: 'threat-actors',
  术语: 'terms',
};

let items;
if (opts.full) {
  const types = ['risks', 'avoidances', 'attack-tools', 'threat-actors', 'terms'];
  items = types.flatMap((t) => loadAllEntities(t).map((r) => ({ key: r.key, type: t, entity: r.entity })));
} else {
  const changed = await getChangedEntities({ baseRef: opts.baseRef, stagedOnly: opts.stagedOnly });
  items = changed
    .filter((c) => ['risks', 'avoidances', 'attack-tools', 'threat-actors', 'terms'].includes(c.type) && (c.isNew || c.hasContentChange))
    .map((c) => ({ key: c.key, type: c.type, entity: c.entity }));
}
if (opts.type) items = items.filter((it) => it.type === opts.type);
if (opts.keys) {
  const set = new Set(opts.keys);
  items = items.filter((it) => set.has(it.key));
}
if (opts.limit > 0) items = items.slice(0, opts.limit);

function prepareContext(item) {
  return {
    ...item,
    entity: { ...item.entity, _shouldExtractReviewVersion: REVIEW_POLICY_VERSION },
    existingTitles: existingTitleSamples,
    matchedExistingEntities: findExistingEntityMentions(item),
    referencedExistingEntities: findReferencedExistingEntities(item),
  };
}

function buildPrompt(item) {
  const { entity, existingTitles, matchedExistingEntities, referencedExistingEntities } = item;
  const sys = `你是 BREAK 知识库的实体抽取评审员。判断是否应从给定实体提炼新的独立实体。
严格规则：
1. 只输出 JSON 对象。
2. shouldExtractNew：
   - newRisks: 建议提炼的新风险（含 suggestedTitle + reason + 已存在与否）
   - newAvoidances: 建议提炼的新规避手段
   - newAttackTools: 建议提炼的新攻击工具
   - newThreatActors: 建议提炼的新威胁行为者
   - newTerms: 建议抽象的新术语（实体文本反复出现某概念但无对应 Term）
   - newCases: 建议补充的新案例（某风险缺典型案例）
   - 每条建议需检查 existingTitles、matchedExistingEntities、referencedExistingEntities，若 title/keywords/aliases 已覆盖则标注 existing:true，不要把它作为 review/fail 的理由
3. shouldAbstractTerm：该实体文本是否反复出现某概念但无对应 Term？给候选 term title。
4. 只有存在“未被现有实体覆盖”的候选实体时，verdict 才能是 review/fail。
5. 新候选必须同时满足：有明确 suggestedTitle 和实体类型；能写出区别于来源实体的独立定义；不是来源实体的实现步骤、组件能力、协议参数、产品功能、示例、同义词或过细子技术。仅“可以考虑”“建议评估”或罗列若干关键词时必须 pass。
6. 所有未覆盖候选必须写入 shouldExtractNew 对应的结构化数组；自由文本 suggestions 只用于解释，不得作为新增实体待办的唯一依据。
7. verdict：pass(无需提炼、候选已覆盖或不具独立建模价值)/review(存在结构化、未覆盖且边界独立的候选)/fail(明显应提炼未做)。
8. reason: 一句话。suggestions: 数组。`;
  const user = `【实体】${item.type} ${item.key} ${entity.title}
【definition】${entity.definition || ''}
【description】${String(entity.description || '').slice(0, 500)}

【当前文本/关系已命中的现有实体】
${formatEntityHints([...(matchedExistingEntities || []), ...(referencedExistingEntities || [])]) || '无'}

【全库已有实体 title（用于判断建议新增的是否已存在，节选各 20 个）】
risks: ${(existingTitles?.risks || []).slice(0, 20).join(', ')}
avoidances: ${(existingTitles?.avoidances || []).slice(0, 20).join(', ')}
attack-tools: ${(existingTitles?.['attack-tools'] || []).slice(0, 20).join(', ')}
threat-actors: ${(existingTitles?.['threat-actors'] || []).slice(0, 20).join(', ')}
terms: ${(existingTitles?.terms || []).slice(0, 20).join(', ')}

请判断是否应提炼新实体，输出 JSON。`;
  return [
    { role: 'system', content: sys },
    { role: 'user', content: user },
  ];
}

function validateResult(data, item) {
  if (!data || typeof data !== 'object') throw new Error('返回非对象');
  if (!['pass', 'review', 'fail'].includes(data.verdict)) throw new Error(`verdict 非法: ${data.verdict}`);
  if (typeof data.reason !== 'string' || !data.reason.trim()) throw new Error('reason 必须非空');
  if (!Array.isArray(data.suggestions)) data.suggestions = data.suggestions ? [data.suggestions] : [];
  if (!data.shouldExtractNew || typeof data.shouldExtractNew !== 'object') data.shouldExtractNew = {};
  absorbNestedSuggestionObjects(data);
  suppressCoveredSuggestions(data, item);
}

function addIndexEntry(index, alias, record, matchedBy) {
  const norm = normalizeAlias(alias);
  if (!norm) return;
  if (!index.has(norm)) index.set(norm, []);
  index.get(norm).push({ ...record, matchedBy, alias: String(alias) });
}

function normalizeAlias(value) {
  return normalizeTitle(
    String(value || '')
      .replace(/[“”"‘’'《》「」『』【】\[\]]/g, '')
      .replace(/^(?:新增|新建|提炼|抽象|评估|建议|候选|独立|新的|新)?(?:风险|规避手段|攻击工具|威胁行为者|术语|实体)?[:：]/, ''),
  );
}

function buildExistingEntityIndex() {
  const index = new Map();
  const recordsByKey = new Map();
  const titleSamples = {};
  for (const type of ENTITY_TYPES) {
    const records = loadAllEntities(type);
    titleSamples[type] = records.map((r) => r.entity.title).filter(Boolean);
    for (const { key, entity } of records) {
      const record = { key, type, title: entity.title };
      recordsByKey.set(`${type}:${key}`, record);
      addIndexEntry(index, entity.title, record, 'title');
      for (const keyword of entity.keywords || []) addIndexEntry(index, keyword, record, 'keywords');
      for (const alias of entity.aliases || []) addIndexEntry(index, alias, record, 'aliases');
    }
  }
  return { index, recordsByKey, titleSamples };
}

const existingEntityIndex = buildExistingEntityIndex();
const existingTitleSamples = existingEntityIndex.titleSamples;

function findExistingMatches(candidate, expectedType) {
  const norm = normalizeAlias(candidate);
  if (!norm) return [];
  const exact = (existingEntityIndex.index.get(norm) || []).filter((r) => !expectedType || r.type === expectedType);
  if (exact.length) return dedupeMatches(exact, candidate, 'exact');

  const fuzzy = [];
  for (const [aliasNorm, records] of existingEntityIndex.index.entries()) {
    if (!isLikelySameConcept(norm, aliasNorm)) continue;
    for (const record of records) {
      if (expectedType && record.type !== expectedType) continue;
      fuzzy.push({ ...record, candidate, match: 'similar' });
    }
  }
  return dedupeMatches(fuzzy, candidate, 'similar').slice(0, 5);
}

function isLikelySameConcept(a, b) {
  if (!a || !b || Math.min(a.length, b.length) < 4) return false;
  if (a.includes(b) || b.includes(a)) return Math.min(a.length, b.length) >= 4;
  if (Math.min(a.length, b.length) < 6) return false;
  const aChars = new Set([...a]);
  const bChars = new Set([...b]);
  const intersection = [...aChars].filter((ch) => bChars.has(ch)).length;
  const overlap = intersection / Math.min(aChars.size, bChars.size);
  return overlap >= 0.72 && sharesDomainSuffix(a, b);
}

function sharesDomainSuffix(a, b) {
  const suffixes = ['风险', '套利', '滥用', '篡改', '绕过', '校验', '审计', '监控', '沙箱', '分析', '领取', '欺诈', '攻击', '工具'];
  return suffixes.some((suffix) => a.includes(suffix) && b.includes(suffix));
}

function dedupeMatches(matches, candidate, match) {
  const seen = new Set();
  const out = [];
  for (const m of matches) {
    const id = `${m.type}:${m.key}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ ...m, candidate, match });
  }
  return out;
}

function findExistingEntityMentions(item) {
  const text = [item.entity?.title, item.entity?.definition, item.entity?.description, ...(item.entity?.keywords || [])].filter(Boolean).join('\n');
  const mentions = [];
  for (const [aliasNorm, records] of existingEntityIndex.index.entries()) {
    if (aliasNorm.length < 3 || !normalizeAlias(text).includes(aliasNorm)) continue;
    for (const record of records) {
      if (record.key === item.key && record.type === item.type) continue;
      mentions.push({ ...record, candidate: record.alias, match: record.matchedBy });
    }
  }
  return dedupeEntityHints(mentions).slice(0, 30);
}

function findReferencedExistingEntities(item) {
  const references = [];
  const relationsByType = {
    risks: [...(item.entity?.directCauseRisks || []), ...(item.entity?.indirectSupportRisks || []), ...(item.entity?.relatedRisks || []).map((r) => r.key).filter(Boolean)],
    avoidances: [...(item.entity?.avoidances || []), ...(item.entity?.relatedAvoidances || []).map((r) => r.key).filter(Boolean), ...(item.entity?.relatedAvoidances || [])],
    'attack-tools': [...(item.entity?.buildAttackTools || []), ...(item.entity?.useAttackTools || []), ...(item.entity?.relatedAttackTools || []).map((r) => r.key).filter(Boolean)],
    'threat-actors': [...(item.entity?.relatedThreatActors || []).map((r) => r.key).filter(Boolean)],
    terms: [],
  };
  for (const [type, keys] of Object.entries(relationsByType)) {
    for (const keyOrRelation of keys) {
      const key = typeof keyOrRelation === 'string' ? keyOrRelation : keyOrRelation?.key;
      if (!key) continue;
      const record = existingEntityIndex.recordsByKey.get(`${type}:${key}`);
      if (record) references.push({ ...record, candidate: key, match: 'relation' });
    }
  }
  return dedupeEntityHints(references).slice(0, 30);
}

function dedupeEntityHints(records) {
  const seen = new Set();
  const out = [];
  for (const record of records) {
    if (!record || !record.type || !record.key) continue;
    const id = `${record.type}:${record.key}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(record);
  }
  return out;
}

function formatEntityHints(records) {
  return dedupeEntityHints(records)
    .slice(0, 40)
    .map((r) => `- ${TYPE_LABELS[r.type] || r.type} ${r.key} ${r.title}（命中：${r.candidate || r.match || ''}）`)
    .join('\n');
}

function suppressCoveredSuggestions(data, item) {
  const covered = collectStructuredCoveredMatches(data);
  const keptSuggestions = [];
  for (const suggestion of data.suggestions) {
    const candidates = extractCandidateTitles(suggestion);
    if (!candidates.length) {
      keptSuggestions.push(suggestion);
      continue;
    }
    const matchesByCandidate = candidates.map((candidate) => findExistingMatches(candidate.title, candidate.type));
    if (matchesByCandidate.every((matches) => matches.length > 0)) {
      covered.push(...matchesByCandidate.flat());
    } else {
      keptSuggestions.push(suggestion);
    }
  }

  const actionableStructured = countActionableStructuredSuggestions(data);
  const coveredByExistingEntities = dedupeEntityHints([...(data.coveredByExistingEntities || []), ...covered]);
  if (coveredByExistingEntities.length) data.coveredByExistingEntities = coveredByExistingEntities;

  if (actionableStructured === 0) {
    data.verdict = 'pass';
    data.reason = coveredByExistingEntities.length
      ? `建议提炼的概念已由现有实体覆盖：${coveredByExistingEntities.map((r) => `${r.key} ${r.title}`).join('、')}`
      : '未给出结构化、边界独立且未被现有实体覆盖的新增候选。';
    data.suggestions = [];
    return;
  }

  if (data.verdict === 'review' && keptSuggestions.length === 0 && actionableStructured === 0) {
    data.verdict = 'pass';
    data.reason = coveredByExistingEntities.length
      ? `建议提炼的概念已由现有实体覆盖：${coveredByExistingEntities.map((r) => `${r.key} ${r.title}`).join('、')}`
      : '未给出明确、可执行且未被现有实体覆盖的新增候选。';
    data.suggestions = [];
    data.shouldExtractNew = data.shouldExtractNew || {};
    return;
  }

  if (keptSuggestions.length !== data.suggestions.length) {
    data.suggestions = keptSuggestions;
    data.reason = `${data.reason}（已自动过滤 ${coveredByExistingEntities.length} 个已有实体覆盖的重复建议。）`;
  }

  if (data.verdict !== 'pass' && data.suggestions.length === 0 && actionableStructured > 0) {
    data.suggestions = structuredSuggestionsToText(data);
  }

  if (item && data.verdict !== 'pass' && !data.suggestions.length && actionableStructured === 0) {
    throw new Error(`${item.key} verdict=${data.verdict} 但没有明确的未覆盖 suggestions`);
  }
}

function absorbNestedSuggestionObjects(data) {
  const kept = [];
  for (const suggestion of data.suggestions) {
    if (!suggestion || typeof suggestion !== 'object') {
      kept.push(suggestion);
      continue;
    }
    let absorbed = false;
    for (const field of [...Object.keys(STRUCTURED_SUGGESTION_FIELDS), 'newCases']) {
      if (!Array.isArray(suggestion[field])) continue;
      if (!Array.isArray(data.shouldExtractNew[field])) data.shouldExtractNew[field] = [];
      data.shouldExtractNew[field].push(...suggestion[field]);
      absorbed = true;
    }
    if (!absorbed) kept.push(suggestion);
  }
  data.suggestions = kept;
}

function collectStructuredCoveredMatches(data) {
  const covered = [];
  for (const [field, type] of Object.entries(STRUCTURED_SUGGESTION_FIELDS)) {
    const list = data.shouldExtractNew?.[field];
    if (!Array.isArray(list)) continue;
    const remaining = [];
    for (const entry of list) {
      const title = titleFromStructuredSuggestion(entry);
      const matches = findExistingMatches(title, type);
      const markedExisting = entry && typeof entry === 'object' && entry.existing === true;
      if (matches.length || markedExisting) {
        covered.push(...matches);
      } else {
        remaining.push(entry);
      }
    }
    data.shouldExtractNew[field] = remaining;
  }
  return covered;
}

function countActionableStructuredSuggestions(data) {
  return Object.keys(STRUCTURED_SUGGESTION_FIELDS).reduce((sum, field) => {
    const list = data.shouldExtractNew?.[field];
    return sum + (Array.isArray(list) ? list.length : 0);
  }, 0);
}

function titleFromStructuredSuggestion(entry) {
  if (!entry) return '';
  if (typeof entry === 'string') return entry;
  return entry.suggestedTitle || entry.title || entry.name || entry.termTitle || entry.candidateTitle || '';
}

function structuredSuggestionsToText(data) {
  const out = [];
  for (const [field, type] of Object.entries(STRUCTURED_SUGGESTION_FIELDS)) {
    const list = data.shouldExtractNew?.[field];
    if (!Array.isArray(list)) continue;
    for (const entry of list) {
      const title = titleFromStructuredSuggestion(entry);
      if (!title) continue;
      out.push(`建议提炼${TYPE_LABELS[type] || type}：${title}`);
    }
  }
  return out;
}

function extractCandidateTitles(suggestion) {
  if (suggestion && typeof suggestion === 'object') {
    const title = cleanCandidateTitle(titleFromStructuredSuggestion(suggestion));
    const type = normalizeSuggestionType(suggestion.type || suggestion.entityType || suggestion.category);
    return title ? [{ title, type }] : [];
  }

  const text = String(suggestion || '');
  const candidates = [];
  const quoted = text.matchAll(/[“"‘'《「『]([^”"’'》」』]{2,30})[”"’'》」』]/g);
  for (const match of quoted) candidates.push({ title: cleanCandidateTitle(match[1]), type: inferTypeFromSuggestion(text) });

  const afterColon = text.includes('：') ? text.split('：').slice(1).join('：') : text.includes(':') ? text.split(':').slice(1).join(':') : text;
  for (const part of afterColon.split(/[、,，；;。]/)) {
    const title = cleanCandidateTitle(part);
    if (title) candidates.push({ title, type: inferTypeFromSuggestion(text) });
  }
  const seen = new Set();
  return candidates.filter((c) => {
    if (!c.title || c.title.length < 2 || c.title.length > 24) return false;
    if (seen.has(`${c.type || ''}:${c.title}`)) return false;
    seen.add(`${c.type || ''}:${c.title}`);
    return true;
  });
}

function inferTypeFromSuggestion(text) {
  if (/规避手段|防御|检测|校验|监控|审计|沙箱/.test(text)) return 'avoidances';
  if (/攻击工具|工具|平台|资源/.test(text)) return 'attack-tools';
  if (/威胁行为者|行为者|团伙|角色|回收商/.test(text)) return 'threat-actors';
  if (/术语|抽象|概念/.test(text)) return 'terms';
  if (/风险/.test(text)) return 'risks';
  return undefined;
}

function normalizeSuggestionType(type) {
  return SUGGESTION_TYPE_ALIASES[String(type || '').trim()] || undefined;
}

function cleanCandidateTitle(value) {
  return String(value || '')
    .replace(/^(?:建议|将|把|新增|新建|提炼|抽象|评估|考虑|是否|需要|为|作为|独立的?|新的?)+/g, '')
    .replace(/(?:提炼|抽象|评估|考虑|是否|需要|作为|为)?(?:独立的?|新的?)?(?:risk|风险|avoidance|规避手段|攻击工具|威胁行为者|term|术语|实体).*$/i, '')
    .replace(/[“”"‘’'《》「」『』【】\[\]\s]/g, '')
    .trim();
}

const results = await runSubagentReview({
  name: 'should-extract',
  items,
  prepareContext,
  buildPrompt,
  validateResult,
  fingerprintFields: ['definition', 'description', '_shouldExtractReviewVersion'],
  model: 'multi',
  concurrency: 3,
  limit: opts.limit,
});

process.exit(exitCodeFor(results));
