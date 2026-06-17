import fs from 'node:fs';
import path from 'node:path';
import { ensureDir, projectRoot, readJson, writeJson } from '../search/common.mjs';

const packageJson = readJson(path.join(projectRoot, 'package.json'));
const publicDataPath = path.join(projectRoot, 'public/data/break-data.json');
const publicManifestPath = path.join(projectRoot, 'public/data/break-manifest.json');
const packageDir = path.join(projectRoot, 'dist/break-data-package');
const dataPackageName = '@jdarmy/break-data';

const data = readJson(publicDataPath);
const manifest = readJson(publicManifestPath);

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
}

export interface BreakRisk extends BreakBaseEntity {
  complexity: string;
  influence: string;
  avoidances: string[];
  businessScenes: string[];
}

export interface BreakAvoidance extends BreakBaseEntity {
  limitation?: string;
  category: string;
}

export interface BreakAttackTool extends BreakBaseEntity {
  avoidances: string[];
  directCauseRisks: string[];
  indirectSupportRisks: string[];
}

export interface BreakThreatActor extends BreakBaseEntity {
  buildAttackTools: string[];
  useAttackTools: string[];
  directCauseRisks: string[];
  indirectSupportRisks: string[];
}

export interface BreakTerm extends BreakBaseEntity {
  aliases?: string[];
  usageExample?: string;
  relatedRisks: string[];
  relatedAvoidances: string[];
  relatedAttackTools: string[];
  relatedThreatActors: string[];
}

export interface BreakBusinessScene {
  title: string;
  description: string;
}

export interface BreakAvoidanceCategory {
  title: string;
  description: string;
}

export interface BreakDataCollections {
  risks: Record<string, BreakRisk>;
  avoidances: Record<string, BreakAvoidance>;
  attackTools: Record<string, BreakAttackTool>;
  threatActors: Record<string, BreakThreatActor>;
  terms: Record<string, BreakTerm>;
  businessScenes: Record<string, BreakBusinessScene>;
  avoidanceCategories: Record<string, BreakAvoidanceCategory>;
}

export interface BreakDataBundle {
  schemaVersion: 1;
  packageVersion: string;
  generatedAt: string;
  locale: 'zh-CN';
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
  };
  counts: Record<keyof BreakDataCollections, BreakEntityCount>;
}

export const breakData: BreakDataBundle;
export const breakManifest: BreakDataManifest;
export default breakData;
`;

const readme = `# ${dataPackageName}

Static BREAK data bundle for consumers that need the knowledge base without the web app.

## Package Boundary

- Data only: no Vue runtime, no ECharts runtime, no browser app code.
- Locale: zh-CN canonical data bundle.
- Schema: follows \`schemaVersion: 1\` from \`break-data.json\`.
- Files:
  - \`data/break-data.json\`
  - \`data/break-manifest.json\`
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
import { breakData, breakManifest } from '${dataPackageName}';

const bundle = breakData as BreakDataBundle;
console.log(Object.keys(bundle.data.risks).length);
console.log(breakManifest.files.data.sha256);
\`\`\`
`;

const runtimeEntry = `import breakData from './data/break-data.json' with { type: 'json' };
import breakManifest from './data/break-manifest.json' with { type: 'json' };

export { breakData, breakManifest };
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
    'data/break-manifest.json',
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
    './data/break-manifest.json': './data/break-manifest.json',
    './package.json': './package.json',
  },
  types: './index.d.ts',
};

fs.rmSync(packageDir, { recursive: true, force: true });
ensureDir(path.join(packageDir, 'data'));
writeJson(path.join(packageDir, 'package.json'), packageBoundary);
writeJson(path.join(packageDir, 'data/break-data.json'), data);
writeJson(path.join(packageDir, 'data/break-manifest.json'), manifest);
fs.writeFileSync(path.join(packageDir, 'index.js'), runtimeEntry);
fs.writeFileSync(path.join(packageDir, 'index.d.ts'), typeDefinitions);
fs.writeFileSync(path.join(packageDir, 'README.md'), readme);

console.log('\n✅ npm 数据包评估产物已生成');
console.log(`package=${path.relative(projectRoot, packageDir)}`);
console.log(`name=${dataPackageName}`);
console.log(`version=${packageJson.version}`);
