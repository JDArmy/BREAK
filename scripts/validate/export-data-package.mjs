import fs from 'node:fs';
import path from 'node:path';
import { ensureDir, projectRoot, readJson, writeJson } from '../search/common.mjs';

const packageJson = readJson(path.join(projectRoot, 'package.json'));
const publicDataPath = path.join(projectRoot, 'public/data/break-data.json');
const publicDataEnPath = path.join(projectRoot, 'public/data/break-data-en.json');
const publicManifestPath = path.join(projectRoot, 'public/data/break-manifest.json');
const publicQualityReportPath = path.join(projectRoot, 'public/data/quality-report.json');
const packageDir = path.join(projectRoot, 'dist/break-data-package');
const dataPackageName = '@jdarmy/break-data';

const data = readJson(publicDataPath);
const dataEn = readJson(publicDataEnPath);
const manifest = readJson(publicManifestPath);
const qualityReport = readJson(publicQualityReportPath);

const typeDefinitions = `export interface BreakReference {
  title: string;
  link?: string;
}

export interface BreakBaseEntity {
  definition?: string;
  description?: string;
  references?: BreakReference[];
  keywords?: string[];
  updated?: string;
  version?: number;
}

export type BreakRiskRelationType = 'prerequisite' | 'co-occurrence' | 'escalation' | 'variant';

export interface BreakRiskRelation {
  key: string;
  relation: BreakRiskRelationType;
  note?: string;
}

export type BreakRiskSeverity = 'low' | 'medium' | 'high' | 'critical';
export type BreakRiskPriority = 'P0' | 'P1' | 'P2' | 'P3';

export interface BreakRiskAssessment {
  likelihood: BreakRiskSeverity;
  businessLoss: BreakRiskSeverity;
  attackCost: BreakRiskSeverity;
  detectionDifficulty: BreakRiskSeverity;
  defenseMaturity: BreakRiskSeverity;
  priority?: BreakRiskPriority;
  observables: string[];
  priorityNote?: string;
  priorityOverride?: boolean;
  assessedAt?: string;
}

export interface BreakRisk extends BreakBaseEntity {
  complexity: string;
  influence: string;
  avoidances: string[];
  relatedRisks: BreakRiskRelation[];
  riskAssessment?: BreakRiskAssessment;
  businessDomains: string[];
}

export type BreakAvoidanceCategoryId = 'prevention' | 'perception' | 'detection' | 'disposition';
export type BreakAvoidanceEffectiveness = 'high' | 'medium' | 'low';
export type BreakAvoidanceRelationType = 'prerequisite' | 'complement' | 'alternative' | 'mitigates-gap';

export interface BreakAvoidanceRelation {
  key: string;
  relation: BreakAvoidanceRelationType;
  note?: string;
}

export interface BreakAvoidance extends BreakBaseEntity {
  limitation?: string;
  category: BreakAvoidanceCategoryId;
  effectiveness?: BreakAvoidanceEffectiveness;
  relatedAvoidances: BreakAvoidanceRelation[];
}

export interface BreakAttackTool extends BreakBaseEntity {
  avoidances: string[];
  directCauseRisks: string[];
  indirectSupportRisks: string[];
  relatedAttackTools: BreakAttackToolRelation[];
}

export type BreakAttackToolRelationType = 'prerequisite' | 'co-used' | 'alternative' | 'capability-upgrade';

export interface BreakAttackToolRelation {
  key: string;
  relation: BreakAttackToolRelationType;
  note?: string;
}

export interface BreakThreatActor extends BreakBaseEntity {
  buildAttackTools: string[];
  useAttackTools: string[];
  directCauseRisks: string[];
  indirectSupportRisks: string[];
  relatedThreatActors: BreakThreatActorRelation[];
}

export type BreakThreatActorRelationType = 'co-involved';

export interface BreakThreatActorRelation {
  key: string;
  relation: BreakThreatActorRelationType;
  note?: string;
}

export interface BreakTerm extends BreakBaseEntity {
  aliases?: string[];
  usageExample?: string;
  category: string;
  relatedRisks: string[];
  relatedAvoidances: string[];
  relatedAttackTools: string[];
  relatedThreatActors: string[];
}

export interface BreakTermCategoryGroup {
  title: string;
  description: string;
  order: number;
}

export interface BreakTermCategoryItem {
  title: string;
  description: string;
  group: string;
  order: number;
}

export interface BreakTermCategoryRegistry {
  groups: Record<string, BreakTermCategoryGroup>;
  categories: Record<string, BreakTermCategoryItem>;
}

export interface BreakBusinessDomain {
  title: string;
  description: string;
}

export interface BreakAvoidanceCategory {
  title: string;
  description: string;
  keyword: string;
  order: number;
}

export interface BreakCase {
  title: string;
  keywords: string[];
  summary: string;
  description?: string;
  category: string;
  incidentTime?: string;
  relatedRisks: string[];
  references?: BreakReference[];
  updated?: string;
  version?: number;
}

export interface BreakDataCollections {
  risks: Record<string, BreakRisk>;
  avoidances: Record<string, BreakAvoidance>;
  attackTools: Record<string, BreakAttackTool>;
  threatActors: Record<string, BreakThreatActor>;
  terms: Record<string, BreakTerm>;
  termCategories: BreakTermCategoryRegistry;
  businessDomains: Record<string, BreakBusinessDomain>;
  avoidanceCategories: Record<string, BreakAvoidanceCategory>;
  cases: Record<string, BreakCase>;
}

export interface BreakDataBundle {
  schemaVersion: 1;
  packageVersion: string;
  generatedAt: string;
  locale: 'zh-CN' | 'en';
  data: BreakDataCollections;
}

export interface BreakEntityCount {
  main: number;
  sub: number;
  total: number;
}

export interface BreakDataManifest {
  schemaVersion: 1;
  packageVersion: string;
  generatedAt: string;
  locale: 'zh-CN';
  files: {
    data: {
      path: 'data/break-data.json';
      bytes: number;
      sha256: string;
    };
    dataEn?: {
      path: 'data/break-data-en.json';
      bytes: number;
      sha256: string;
    };
    qualityReport: {
      path: 'data/quality-report.json';
      bytes: number;
      sha256: string;
    };
    stixZh?: {
      path: 'data/break-stix-zh.json';
      bytes: number;
      sha256: string;
    };
    stixEn?: {
      path: 'data/break-stix-en.json';
      bytes: number;
      sha256: string;
    };
    jsonldZh?: {
      path: 'data/break-ld-zh.jsonld';
      bytes: number;
      sha256: string;
    };
    jsonldEn?: {
      path: 'data/break-ld-en.jsonld';
      bytes: number;
      sha256: string;
    };
  };
  counts: Record<keyof BreakDataCollections, BreakEntityCount>;
}

export type BreakQualitySeverity = 'error' | 'review' | 'info';

export interface BreakQualityIssue {
  id: string;
  type: string;
  severity: BreakQualitySeverity;
  entityType: string;
  key: string;
  title: string;
  message: string;
  count?: number;
  field?: string;
  relation?: string;
  ref?: string;
  link?: string;
  domain?: string;
  status?: number;
  issue?: string;
  referenceCount?: number;
  checkedAt?: string;
  category?: string;
  file?: string;
  strongestSourceType?: string;
  sourceTypes?: string[];
  qualityFlags?: string[];
  referenceDomains?: string[];
}

export interface BreakQualitySummary {
  total: number;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
}

export interface BreakReferenceHealthSummary {
  generatedAt: string | null;
  stale: boolean;
  timeoutMs?: number;
  concurrency?: number;
  stats: Record<string, number>;
  byIssue: Record<string, number>;
  byDomain: Record<string, {
    total: number;
    byIssue: Record<string, number>;
  }>;
  domainGroups: Array<{
    domain: string;
    total: number;
    issues: Record<string, number>;
    statuses: Record<string, number>;
    entityTypes: Record<string, number>;
    referenceCount: number;
    examples: unknown[];
    strategy: {
      action: string;
      priority: string;
      note: string;
    };
  }>;
}

export interface BreakCaseSourceQualitySummary {
  generatedAt: string | null;
  stale: boolean;
  stats: Record<string, number>;
  statsByCategory: Record<string, Record<string, number>>;
  highValueCategories: string[];
}

export interface BreakQualityReport {
  schemaVersion: 1;
  generatedAt: string;
  embeddedIssueLimit: number;
  sourceReports: {
    referenceHealth: BreakReferenceHealthSummary;
    caseSourceQuality: BreakCaseSourceQualitySummary;
  };
  weakRelations: BreakQualityIssue[];
  missingCoverage: BreakQualityIssue[];
  sceneIssues: BreakQualityIssue[];
  i18nIssues: BreakQualityIssue[];
  referenceHealthIssues: BreakQualityIssue[];
  caseSourceIssues: BreakQualityIssue[];
  summary: {
    weakRelations: BreakQualitySummary;
    missingCoverage: BreakQualitySummary;
    sceneIssues: BreakQualitySummary;
    i18nIssues: BreakQualitySummary;
    referenceHealthIssues: BreakQualitySummary;
    caseSourceIssues: BreakQualitySummary;
  };
}

export const breakData: BreakDataBundle;
export const breakDataEn: BreakDataBundle;
export const breakManifest: BreakDataManifest;
export const breakQualityReport: BreakQualityReport;
export default breakData;
`;

const readme = `# ${dataPackageName}

Static BREAK data bundle for consumers that need the knowledge base without the web app.

## Package Boundary

- Data only: no Vue runtime, no ECharts runtime, no browser app code.
- Locale: zh-CN canonical data bundle and en translated data bundle.
- Schema: follows \`schemaVersion: 1\` from \`break-data.json\`.
- Files:
  - \`data/break-data.json\`
  - \`data/break-data-en.json\`
  - \`data/break-manifest.json\`
  - \`data/quality-report.json\`
  - \`data/break-stix-zh.json\` (STIX 2.1 Bundle, zh-CN)
  - \`data/break-stix-en.json\` (STIX 2.1 Bundle, en)
  - \`data/break-ld-zh.jsonld\` (JSON-LD, zh-CN)
  - \`data/break-ld-en.jsonld\` (JSON-LD, en)
  - \`index.js\`
  - \`index.d.ts\`

## Version Strategy

- The package version mirrors the BREAK application version: \`${packageJson.version}\`.
- Data additions, relationship changes, and schema-compatible content edits use normal application version bumps.
- A breaking JSON shape or \`schemaVersion\` change requires a major version bump and migration notes.
- Consumers should verify \`break-manifest.json.files.data.sha256\` before caching or mirroring the bundle.

## Usage

\`\`\`ts
import type { BreakDataBundle } from '${dataPackageName}';
import { breakData, breakDataEn, breakManifest, breakQualityReport } from '${dataPackageName}';

const bundle = breakData as BreakDataBundle;
const enBundle = breakDataEn as BreakDataBundle;
console.log(Object.keys(bundle.data.risks).length);
console.log(enBundle.locale);
console.log(breakManifest.files.data.sha256);
console.log(breakQualityReport.summary.weakRelations.total);
\`\`\`
`;

const runtimeEntry = `import breakData from './data/break-data.json' with { type: 'json' };
import breakDataEn from './data/break-data-en.json' with { type: 'json' };
import breakManifest from './data/break-manifest.json' with { type: 'json' };
import breakQualityReport from './data/quality-report.json' with { type: 'json' };

export { breakData, breakDataEn, breakManifest, breakQualityReport };
export default breakData;
`;

const packageBoundary = {
  name: dataPackageName,
  version: packageJson.version,
  description: 'Static BREAK business risk data bundle.',
  private: false,
  type: 'module',
  license: packageJson.license || 'MIT',
  sideEffects: false,
  main: './index.js',
  files: [
    'data/break-data.json',
    'data/break-data-en.json',
    'data/break-manifest.json',
    'data/quality-report.json',
    'data/break-stix-zh.json',
    'data/break-stix-en.json',
    'data/break-ld-zh.jsonld',
    'data/break-ld-en.jsonld',
    'index.js',
    'index.d.ts',
    'README.md',
  ],
  exports: {
    '.': {
      types: './index.d.ts',
      default: './index.js',
    },
    './data/break-data.json': './data/break-data.json',
    './data/break-data-en.json': './data/break-data-en.json',
    './data/break-manifest.json': './data/break-manifest.json',
    './data/quality-report.json': './data/quality-report.json',
    './data/break-stix-zh.json': './data/break-stix-zh.json',
    './data/break-stix-en.json': './data/break-stix-en.json',
    './data/break-ld-zh.jsonld': './data/break-ld-zh.jsonld',
    './data/break-ld-en.jsonld': './data/break-ld-en.jsonld',
    './package.json': './package.json',
  },
  types: './index.d.ts',
};

fs.rmSync(packageDir, { recursive: true, force: true });
ensureDir(path.join(packageDir, 'data'));
writeJson(path.join(packageDir, 'package.json'), packageBoundary);
writeJson(path.join(packageDir, 'data/break-data.json'), data);
writeJson(path.join(packageDir, 'data/break-data-en.json'), dataEn);
writeJson(path.join(packageDir, 'data/break-manifest.json'), manifest);
writeJson(path.join(packageDir, 'data/quality-report.json'), qualityReport);

// 复制 STIX/JSON-LD 产物（如果存在）
const stixZhPath = path.join(projectRoot, 'public/data/break-stix-zh.json');
const stixEnPath = path.join(projectRoot, 'public/data/break-stix-en.json');
const ldZhPath = path.join(projectRoot, 'public/data/break-ld-zh.jsonld');
const ldEnPath = path.join(projectRoot, 'public/data/break-ld-en.jsonld');
if (fs.existsSync(stixZhPath)) fs.copyFileSync(stixZhPath, path.join(packageDir, 'data/break-stix-zh.json'));
if (fs.existsSync(stixEnPath)) fs.copyFileSync(stixEnPath, path.join(packageDir, 'data/break-stix-en.json'));
if (fs.existsSync(ldZhPath)) fs.copyFileSync(ldZhPath, path.join(packageDir, 'data/break-ld-zh.jsonld'));
if (fs.existsSync(ldEnPath)) fs.copyFileSync(ldEnPath, path.join(packageDir, 'data/break-ld-en.jsonld'));

fs.writeFileSync(path.join(packageDir, 'index.js'), runtimeEntry);
fs.writeFileSync(path.join(packageDir, 'index.d.ts'), typeDefinitions);
fs.writeFileSync(path.join(packageDir, 'README.md'), readme);

console.log('\n✅ npm 数据包评估产物已生成');
console.log(`package=${path.relative(projectRoot, packageDir)}`);
console.log(`name=${dataPackageName}`);
console.log(`version=${packageJson.version}`);
