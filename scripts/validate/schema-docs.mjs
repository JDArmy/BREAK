import fs from 'node:fs';
import path from 'node:path';
import { projectRoot, readJson } from '../search/common.mjs';

const writeMode = process.argv.includes('--write');
const outputPath = path.join(projectRoot, 'DATA_SCHEMA.md');
const packageJson = readJson(path.join(projectRoot, 'package.json'));

const entityDocs = [
  {
    key: 'risks',
    title: 'Risk',
    dir: 'src/BREAK/risks',
    filePattern: 'R0001.json',
    idPattern: 'R0001 or R0001-001',
    schemaName: 'risk',
    purpose: '业务风险条目，描述攻击或滥用行为对业务造成的风险。',
  },
  {
    key: 'avoidances',
    title: 'Avoidance',
    dir: 'src/BREAK/avoidances',
    filePattern: 'A0001.json',
    idPattern: 'A0001 or A0001-001',
    schemaName: 'avoidance',
    purpose: '规避手段条目，描述可用于降低风险的控制措施。',
  },
  {
    key: 'attackTools',
    title: 'AttackTool',
    dir: 'src/BREAK/attack-tools',
    filePattern: 'AT0001.json',
    idPattern: 'AT0001 or AT0001-001',
    schemaName: 'attackTool',
    purpose: '攻击工具条目，描述黑灰产、自动化或攻击链路中的工具能力。',
  },
  {
    key: 'threatActors',
    title: 'ThreatActor',
    dir: 'src/BREAK/threat-actors',
    filePattern: 'TA0001.json',
    idPattern: 'TA0001 or TA0001-001',
    schemaName: 'threatActor',
    purpose: '威胁行为者条目，描述实施、组织或支撑攻击行为的角色。',
  },
  {
    key: 'terms',
    title: 'Term',
    dir: 'src/BREAK/terms',
    filePattern: 'T0001.json',
    idPattern: 'T0001',
    schemaName: 'term',
    purpose: '行业术语条目，解释黑灰产、业务风控和安全运营中的关键概念。',
  },
  {
    key: 'businessScenes',
    title: 'BusinessScene',
    dir: 'src/BREAK/business-scenes',
    filePattern: 'BS00.json',
    idPattern: 'BS00',
    schemaName: 'businessScene',
    purpose: '业务场景条目，组织风险维度、风险场景和场景下的风险引用。',
  },
  {
    key: 'cases',
    title: 'Case',
    dir: 'src/BREAK/cases',
    filePattern: 'C0001.json',
    idPattern: 'C0001',
    schemaName: 'case',
    purpose: '典型案例条目，描述与风险相关的真实案例/事件/判例/通报/研究。',
  },
];

const fieldDescriptions = {
  title: '展示标题。',
  keywords: '搜索关键词；必须非空，且不能重复。',
  definition: '简短定义。',
  description: '详细说明。',
  complexity: '复杂度或实施难度 key。',
  influence: '业务影响。',
  avoidances: '关联规避手段 ID 列表。',
  relatedRisks: '相关风险 ID 列表；Risk 中为风险间关联对象列表。',
  riskAssessment: '风险分级评估对象，含 5 维度评分（发生概率/业务损失/攻击成本/检测难度/防御成熟度）、处置优先级、可观测信号与覆盖说明；英文 i18n 只维护 observables/priorityNote。',
  category: '分类 ID。',
  effectiveness: '规避手段有效性分级，用于防御覆盖排序。',
  limitation: '控制措施局限性。',
  references: '参考资料列表。',
  updated: '最近更新日期，建议使用 YYYY-MM-DD。',
  directCauseRisks: '该工具或行为者可直接造成的风险 ID 列表。',
  indirectSupportRisks: '该工具或行为者可间接支撑的风险 ID 列表。',
  buildAttackTools: '行为者可制作或维护的攻击工具 ID 列表。',
  useAttackTools: '行为者会使用的攻击工具 ID 列表。',
  aliases: '别名列表。',
  usageExample: '使用示例。',
  summary: '案例摘要，80-150 字事实性描述。',
  incidentTime: '案例发生时间，YYYY、YYYY-MM 或 YYYY-MM-DD。',
  relatedAvoidances: '相关规避手段列表；Avoidance 中为规避手段间关联对象列表。',
  relatedAttackTools: '相关攻击工具列表；AttackTool 中为攻击工具间关联对象列表。',
  relatedThreatActors: '相关威胁行为者列表；ThreatActor 中为威胁行为者间关联对象列表，Term 中为威胁行为者 ID 列表。',
  relatedBusinessScenes: '相关业务场景 ID 列表。',
  risks: '业务场景直接引用的风险 ID 列表。',
  riskDimensions: '风险维度映射；key 为风险维度 ID，value 包含标题和风险场景 ID 列表。',
  riskScenes: '风险场景映射；key 为风险场景 ID，value 包含标题和风险 ID 列表。',
};

const relationTargets = {
  avoidances: 'Avoidance',
  directCauseRisks: 'Risk',
  indirectSupportRisks: 'Risk',
  buildAttackTools: 'AttackTool',
  useAttackTools: 'AttackTool',
  relatedRisks: 'Risk',
  relatedAvoidances: 'Avoidance',
  relatedAttackTools: 'AttackTool',
  relatedThreatActors: 'ThreatActor',
  relatedBusinessScenes: 'BusinessScene',
  risks: 'Risk',
};

const enumValues = {
  complexity: ['basic', 'intermediate', 'advanced'],
  riskSeverity: ['low', 'medium', 'high', 'critical'],
  riskPriority: ['P0', 'P1', 'P2', 'P3'],
  avoidanceCategorySchema: ['AC01', 'AC02', 'AC03', 'AC04'],
  avoidanceEffectivenessSchema: ['high', 'medium', 'low'],
  category: ['criminal_verdict', 'administrative_enforcement', 'security_incident', 'vulnerability_advisory', 'academic_research', 'news_report'],
};

function loadSchemaSource() {
  const source = fs.readFileSync(path.join(projectRoot, 'src/validation/breakSchema.ts'), 'utf8');
  const schemaBlocks = {};
  for (const match of source.matchAll(/export const (\w+)Schema = z\.object\(\{([\s\S]*?)\n\}\)(\.\w+\(\))*;/g)) {
    schemaBlocks[match[1]] = match[2];
  }
  return schemaBlocks;
}

function extractFields(block) {
  return [...block.matchAll(/^\s{2}([A-Za-z][A-Za-z0-9]*):\s*([^\n]+)/gm)].map((match) => ({
    name: match[1],
    expression: match[2].trim(),
  }));
}

function countRecords(relativeDir) {
  const dir = path.join(projectRoot, relativeDir);
  const keys = fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .flatMap((file) => Object.keys(readJson(path.join(dir, file))));
  const main = keys.filter((key) => !key.includes('-')).length;
  return {
    main,
    sub: keys.length - main,
    total: keys.length,
  };
}

function typeFor({ name, expression }) {
  if (expression.includes('riskRelationSchema')) return 'RiskRelation[]';
  if (expression.includes('riskAssessmentSchema')) return 'RiskAssessment';
  if (expression.includes('avoidanceRelationSchema')) return 'AvoidanceRelation[]';
  if (expression.includes('attackToolRelationSchema')) return 'AttackToolRelation[]';
  if (expression.includes('avoidanceCategorySchema')) {
    return enumValues.avoidanceCategorySchema.map((item) => `"${item}"`).join(' | ');
  }
  if (expression.includes('avoidanceEffectivenessSchema')) {
    return enumValues.avoidanceEffectivenessSchema.map((item) => `"${item}"`).join(' | ');
  }
  if (expression.includes('z.enum')) {
    return enumValues[name]?.map((item) => `"${item}"`).join(' | ') || 'enum';
  }
  if (expression.includes('referenceSchema')) return 'Reference[]';
  if (expression.includes('z.record') && name === 'riskDimensions') return 'Record<RiskDimensionId, RiskDimension>';
  if (expression.includes('z.record') && name === 'riskScenes') return 'Record<RiskSceneId, RiskScene>';
  if (expression.includes('z.array')) return 'string[]';
  return 'string';
}

function requirementFor({ expression }) {
  if (expression.includes('.default(')) return 'optional, defaults to empty array';
  if (expression.includes('.optional()')) return 'optional';
  return 'required';
}

function descriptionFor(name) {
  return fieldDescriptions[name] || 'Schema field.';
}

function relationFor(name) {
  return relationTargets[name] ? ` Target: ${relationTargets[name]}.` : '';
}

function escapeCell(value) {
  return String(value).replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}

function fieldTable(fields) {
  const rows = [
    '| Field | Type | Requirement | Description |',
    '|-------|------|-------------|-------------|',
  ];
  for (const field of fields) {
    rows.push(
      `| \`${field.name}\` | ${escapeCell(typeFor(field))} | ${requirementFor(field)} | ${escapeCell(descriptionFor(field.name) + relationFor(field.name))} |`
    );
  }
  return rows.join('\n');
}

function generateMarkdown() {
  const schemaBlocks = loadSchemaSource();
  const generatedAt = new Date('2026-06-17T00:00:00.000Z').toISOString().slice(0, 10);
  const lines = [
    '# BREAK Data Schema',
    '',
    `> Generated from \`src/validation/breakSchema.ts\` for package version \`${packageJson.version}\`.`,
    `> Last schema doc review: ${generatedAt}. Run \`npm run schema:docs:write\` after schema changes.`,
    '',
    'This document describes the committed JSON data model used by the BREAK knowledge base. The source of truth is the Zod schema in `src/validation/breakSchema.ts`; `npm run validate:schema-docs` checks this document against that source.',
    '',
    '## File And ID Rules',
    '',
    '| Entity | Directory | File pattern | ID pattern | Current records |',
    '|--------|-----------|--------------|------------|-----------------|',
  ];

  for (const doc of entityDocs) {
    const counts = countRecords(doc.dir);
    lines.push(
      `| ${doc.title} | \`${doc.dir}\` | \`${doc.filePattern}\` | \`${doc.idPattern}\` | ${counts.total} total (${counts.main} main, ${counts.sub} sub) |`
    );
  }

  lines.push(
    '',
    'Parent and child records live in the parent JSON file. For example, `R0001-001` belongs in `src/BREAK/risks/R0001.json`.',
    '',
    '## Shared Types',
    '',
    '### Reference',
    '',
    '| Field | Type | Requirement | Description |',
    '|-------|------|-------------|-------------|',
    '| `title` | string | required | Reference title. |',
    '| `link` | URL string | required | Valid absolute URL. |',
    '',
    '### Keyword Rules',
    '',
    '- `keywords` must be a non-empty array of unique, non-empty strings.',
    '- Pure entity IDs such as `R0001`, `A0001`, `AT0001`, `TA0001`, or `T0001` are not accepted as standalone keywords.',
    '- Use `npm run audit:keywords` to check keyword quality and `npm run fix:keywords` to normalize whitespace and duplicates.',
    '',
    '## Entity Schemas',
    ''
  );

  for (const doc of entityDocs) {
    const fields = extractFields(schemaBlocks[doc.schemaName]);
    lines.push(`### ${doc.title}`, '', doc.purpose, '', fieldTable(fields), '');
  }

  lines.push(
    '## Relationship Semantics',
    '',
    '| Field | Direction | Meaning |',
    '|-------|-----------|---------|',
    '| `Risk.avoidances` | Risk -> Avoidance | Direct mitigations for the risk. |',
    '| `Risk.relatedRisks` | Risk -> Risk | Semantic relations between risks, including prerequisites, co-occurrence, escalation, and variants. |',
    '| `Avoidance.relatedAvoidances` | Avoidance -> Avoidance | Semantic relations between mitigation controls, including prerequisites, complements, alternatives, and controls that mitigate known gaps. |',
    '| `AttackTool.directCauseRisks` | AttackTool -> Risk | Risks directly caused by the tool. |',
    '| `AttackTool.indirectSupportRisks` | AttackTool -> Risk | Risks indirectly supported by the tool. |',
    '| `AttackTool.avoidances` | AttackTool -> Avoidance | Controls that mitigate the tool. |',
    '| `AttackTool.relatedAttackTools` | AttackTool -> AttackTool | Semantic relations between attack tools, including prerequisites, co-use, alternatives, and capability upgrades. |',
    '| `ThreatActor.buildAttackTools` | ThreatActor -> AttackTool | Tools the actor can build or maintain. |',
    '| `ThreatActor.useAttackTools` | ThreatActor -> AttackTool | Tools the actor uses. |',
    '| `ThreatActor.directCauseRisks` | ThreatActor -> Risk | Risks directly caused by the actor. |',
    '| `ThreatActor.indirectSupportRisks` | ThreatActor -> Risk | Risks indirectly supported by the actor. |',
    '| `ThreatActor.relatedThreatActors` | ThreatActor -> ThreatActor | Derived top related actors by shared risks and shared attack tools. |',
    '| `Term.related*` | Term -> Entity | Conceptual references used for navigation and search. |',
    '| `BusinessScene.riskScenes.*.risks` | BusinessScene -> Risk | Risks grouped under a scene-specific risk scene. |',
    '',
    'Relationship integrity is enforced by `npm run validate:data` through schema validation, i18n synchronization, keyword audit, entity relation checks, relationship coverage audit, business scene audit, reference coverage, and documentation consistency checks.',
    '',
    '## English i18n Boundary',
    '',
    'Chinese files under `src/BREAK/` are the only source of structure and relationships. English files under `src/i18n/en/BREAK/` must only contain translatable display fields. `npm run validate:data` runs `scripts/validate/i18n-sync.mjs --strict`, which checks both entity key synchronization and field-level structure pollution.',
    '',
    'Allowed English translation fields are:',
    '',
    '| Entity | Allowed English fields |',
    '| --- | --- |',
    '| Risk | `title`, `keywords`, `definition`, `description`, `complexity`, `influence`, `references[].title`, `references[].link`, `riskAssessment.observables`, `riskAssessment.priorityNote` |',
    '| Avoidance | `title`, `keywords`, `definition`, `description`, `complexity`, `limitation`, `references[].title`, `references[].link` |',
    '| AttackTool | `title`, `keywords`, `description`, `references[].title`, `references[].link` |',
    '| ThreatActor | `title`, `keywords`, `description`, `references[].title`, `references[].link` |',
    '| Term | `title`, `keywords`, `aliases`, `category`, `definition`, `description`, `usageExample`, `references[].title`, `references[].link` |',
    '| BusinessScene | `title`, `description`, `riskDimensions[*].title`, `riskScenes[*].title` |',
    '| Case | `title`, `keywords`, `summary`, `references[].title`, `references[].link` |',
    '',
    'English files must not contain relationship fields, ID arrays, `updated`, or BusinessScene structural arrays such as `riskDimensions[*].riskScenes` and `riskScenes[*].risks`.',
    ''
  );

  return `${lines.join('\n')}\n`;
}

const next = generateMarkdown();
const current = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf8') : '';

if (writeMode) {
  fs.writeFileSync(outputPath, next);
  console.log(`✅ 数据 Schema 文档已生成: ${path.relative(projectRoot, outputPath)}`);
} else if (current !== next) {
  console.error('\n❌ 数据 Schema 文档未同步');
  console.error('请运行 npm run schema:docs:write 并提交 DATA_SCHEMA.md。');
  process.exit(1);
} else {
  console.log('\n✅ 数据 Schema 文档已同步');
}
