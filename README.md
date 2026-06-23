# JDArmy BREAK - Business Risk Enumeration & Avoidance Knowledge Framework

English | [中文](./README_CN.md)

## Online: <https://break.jd.army/>

## Introduction

JDArmy BREAK stands for **Business Risk Enumeration & Avoidance Knowledge** — an open framework for enumerating and mitigating business risks. By systematically classifying, describing, and cataloguing a wide range of business risks, it provides a comprehensive risk landscape and offers practical avoidance guidance to help organizations build security capabilities and reduce business risk.

> BREAK is created, owned, and managed by JD.Army — a professional red team focused on identifying and resolving enterprise security operational risks. JD.Army reserves the right to update BREAK and this documentation periodically at its sole discretion. While JD.Army owns all rights and interests in BREAK, it licenses the public to use it freely under the relevant open source license.

## Background

As information security capabilities increasingly cover business operations and business demands for security deepen, limiting security to the traditional network security domain — merely discovering and patching vulnerabilities — is clearly insufficient to ensure normal business security operations or meet higher business security requirements.

Drawing on years of experience and accumulated understanding of business security, JDArmy introduces BREAK — the *Business Risk Enumeration & Avoidance Knowledge Framework* — to provide guidance and a reference basis for enterprise blue teams conducting business security assessments. The business risk avoidance knowledge in the framework also serves as a guide for building security capabilities, running business security operations, and improving risk control.

## Methodology

The framework is organized around three levels: **risk dimensions**, **risk scenarios**, and **risk items**. The framework contains multiple risk dimensions; each dimension contains multiple risk scenarios; and each scenario contains multiple risk items.

The current framework catalogues 350 risk items, 300 avoidance measures, 110 attack tools, 70 threat actors, 600 industry terms, 18 business scenes, 4 avoidance categories, and 1797 cases, with ongoing additions, upgrades, and adjustments based on developments and feedback. Each risk item consists of: a risk ID, risk title, risk definition, risk description, risk complexity, risk influence, avoidance measures, references, and associated attack tools. Risk IDs follow the format `R00xx` for unique identification (modeled after MITRE ATT&CK) to facilitate communication and intelligence sharing. Attack descriptions guide blue teams in security capability assessments, while avoidance measures help red teams and business risk control to strengthen security capabilities and reduce business risk.

**Important note:** Business risks and vulnerabilities are not the same thing. Vulnerabilities are generally caused by coding defects and can be fixed by modifying code to remove the defect. Business risks, however, are largely not caused by coding defects — they are unintended exploitations of normal business logic by attackers. As a result, it is usually impossible to completely eliminate business risks; they can only be reduced to an acceptable level. Instead of direct code fixes, business risks typically require added security capabilities and risk control models to slow attacks, reduce attack ROI, and shrink the attack surface.

### BREAK Skill

The repository also provides a Claude Code / Codex Skill definition for local knowledge-base search:

- `SKILL.md` — Chinese Skill definition
- `SKILL_en.md` — English Skill definition
- `scripts/skill/break_search.py` — zero-dependency Python search engine
- `scripts/skill/export_en_data.mjs` — English static data export
- `scripts/skill/package_skill.sh` — packaging script for a distributable Skill directory

Use it directly in this repository:

```shell
npm run export:data
npm run export:data-en
python3 scripts/skill/break_search.py "credential stuffing" --lang en
python3 scripts/skill/break_search.py R0001 --lang en --detail
python3 scripts/skill/break_search.py "爬虫" --lang zh --type risks,avoidances
```

Package it as a distributable Skill directory:

```shell
scripts/skill/package_skill.sh
```

The default output is `dist/break-skill`. Copy that directory into the target agent's Skill directory. The packaged Skill contains `SKILL.md`, `SKILL_en.md`, `break_search.py`, and the generated Chinese/English data bundles.

## Collaboration & Contribution

The framework is described in JSON format under the `/src/BREAK` directory:

- `basic-info` — basic information about the framework
- `risks` — risk item catalogue
- `avoidances` — avoidance measures catalogue
- `avoidance-categories` — avoidance measure categories
- `business-scenes` — business scenes
  - `riskDimensions` field: risk dimensions covered by the scene
  - `riskScenes` field: risk scenarios and associated risk items for the scene
- `attack-tools` — attack tool catalogue
- `threat-actors` — threat actor catalogue
- `terms` — industry terms and slang glossary
- `cases` — typical case catalogue (real cases linked to risks)
- `utils.ts` — common data loading utility functions

Contributors are welcome to collaborate by directly editing the JSON files. Data changes should pass schema validation, i18n synchronization, and tests before submission.

### Acknowledgements

- Thanks to 团长 and we1h0 for their valuable suggestions

## Links

- GitHub: <https://github.com/JDArmy/BREAK>

## Development

Requires Node.js 24.0+.

```shell
npm install
npm run dev
```

### Validation

```shell
npm run validate:data
npm run audit:metrics
npm run audit:references
npm run audit:maintenance
npm run test
npm run test:coverage
npm run validate:schema-docs
npm run schema:docs:write
npm run export:data
npm run export:data-en
npm run export:data-package
npm run validate:data-export
npm run validate:data-package
npm run test:smoke
npm run test:performance
npm run test:relation-stability
npm run test:lighthouse
npm run build
npm run audit:bundle
npm run audit:bundle:check
npm run build-only
npm run lint
npm run type-check
```

`npm run validate:data` runs JSON Schema validation, i18n key synchronization, relationship coverage auditing, and generated schema documentation checks.
`npm run build` runs `lint`, `type-check`, `validate:data`, `test`, `test:coverage`, `validate:schema-docs`, `validate:home-counts`, `export:data`, `export:data-en`, `build-only`, `export:data-package`, `audit:bundle:check`, `validate:data-export`, and `validate:data-package`.
`npm run test:coverage` enforces the core logic coverage baseline for relation analysis, Sankey attack paths, root/path insights, search, safe i18n, and BREAK data utilities.
`npm run validate:schema-docs` checks [DATA_SCHEMA.md](./DATA_SCHEMA.md) against `src/validation/breakSchema.ts`.
`npm run schema:docs:write` regenerates [DATA_SCHEMA.md](./DATA_SCHEMA.md) after schema changes.
`npm run validate:home-counts` checks that the entity counts in `src/BREAK/home.ts` match the actual data; `npm run generate:home-counts` regenerates them (also run automatically via a pre-commit hook).
`npm run export:data` writes the Chinese static data bundle to `public/data/break-data.json`, `public/data/break-manifest.json`, and `public/data/quality-report.json`.
`npm run export:data-en` writes the English static data bundle to `public/data/break-data-en.json` by merging the Chinese structure source with English translation files.
`npm run export:data-package` writes an npm package evaluation artifact to `dist/break-data-package`.
`npm run validate:data-export` checks the public data bundle, manifest hash, entity counts, version, and copied GitHub Pages artifacts.
`npm run validate:data-package` checks the npm package boundary, runtime entry, type declarations, README, manifest hash, and version alignment.
`npm run test:smoke`, `npm run test:performance`, `npm run test:relation-stability`, and `npm run test:lighthouse` validate the generated static site with Playwright/Chromium. These run only in the local dev environment (not in CI/Deploy) — run them manually as needed.
`npm run audit:quality-report` regenerates the frontend-consumable quality report JSON.
`npm run audit:metrics` generates the content trust, relation coverage, category distribution, and business scene coverage baseline.
`npm run audit:bundle` checks the generated `dist/assets` bundle against the current performance budget.
`npm run audit:maintenance` refreshes the audit reports and writes a unified maintenance summary.

### Static Data

- Manifest: <https://break.jd.army/data/break-manifest.json>
- Chinese data bundle: <https://break.jd.army/data/break-data.json>
- English data bundle: <https://break.jd.army/data/break-data-en.json>
- Quality report: <https://break.jd.army/data/quality-report.json>

The static bundle exposes the current BREAK data with version, generation metadata, counts, byte size, SHA-256 checksum, and quality report for downstream tools. The Chinese bundle remains the canonical structure source; the English bundle keeps the same structure and replaces only translatable text fields.

### npm Data Package Evaluation

`npm run export:data-package` creates `dist/break-data-package` as an evaluation artifact for a future `@jdarmy/break-data` package. The artifact is data-only: it excludes the Vue app, ECharts runtime, and browser UI code, and includes `data/break-data.json`, `data/break-manifest.json`, `data/quality-report.json`, `index.js`, `index.d.ts`, and its own README.

The package version mirrors the BREAK application version. The generated manifest keeps the same SHA-256 checksum and entity counts as the GitHub Pages static data bundle, so downstream users can evaluate npm consumption without changing the canonical data source.
