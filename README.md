# JDArmy BREAK - Business Risk Enumeration & Avoidance Knowledge Framework

English | [中文](./README_CN.md)

<!-- 2026-07-11: Internal Avoidance-category key migration; no visible README workflow change. -->

## Online: <https://break.jd.army/>

## Introduction

JDArmy BREAK stands for **Business Risk Enumeration & Avoidance Knowledge** — an open framework for enumerating and mitigating business risks. By systematically classifying, describing, and cataloguing a wide range of business risks, it provides a comprehensive risk landscape and offers practical avoidance guidance to help organizations build security capabilities and reduce business risk.

> BREAK is created, owned, and managed by JD.Army — a professional red team focused on identifying and resolving enterprise security operational risks. JD.Army reserves the right to update BREAK and this documentation periodically at its sole discretion. The project is available to the public under the Apache License 2.0.

## Background

As information security capabilities increasingly cover business operations and business demands for security deepen, limiting security to the traditional network security domain — merely discovering and patching vulnerabilities — is clearly insufficient to ensure normal business security operations or meet higher business security requirements.

Drawing on years of experience and accumulated understanding of business security, JDArmy introduces BREAK — the _Business Risk Enumeration & Avoidance Knowledge Framework_ — to provide guidance and a reference basis for enterprise blue teams conducting business security assessments. The business risk avoidance knowledge in the framework also serves as a guide for building security capabilities, running business security operations, and improving risk control.

## Methodology

The framework is organized around **business domains**, **risk dimensions**, **risk scenarios**, and **risk items**. A business domain represents an industry or business area. A risk dimension is a business risk domain that groups risk scenarios into stable areas such as transaction and entitlement, content and ecosystem governance, account and identity, platform/interface automation abuse, data/algorithm/model, virtual assets and emerging technology, device/physical infrastructure, and internal supply-chain compliance. Each risk scenario contains multiple risk items.

The current framework catalogues 400 risk items, 350 avoidance measures, 125 attack tools, 83 threat actors, 632 industry terms, 20 business domains, 4 avoidance categories, and 1781 cases, with ongoing additions, upgrades, and adjustments based on developments and feedback. Each risk item consists of: a risk ID, risk title, risk definition, risk description, risk complexity, risk influence, avoidance measures, references, and associated attack tools. Risk IDs follow the format `R00xx` for unique identification (modeled after MITRE ATT&CK) to facilitate communication and intelligence sharing. Attack descriptions guide blue teams in security capability assessments, while avoidance measures help red teams and business risk control to strengthen security capabilities and reduce business risk.

**Important note:** Business risks and vulnerabilities are not the same thing. Vulnerabilities are generally caused by coding defects and can be fixed by modifying code to remove the defect. Business risks, however, are largely not caused by coding defects — they are unintended exploitations of normal business logic by attackers. As a result, it is usually impossible to completely eliminate business risks; they can only be reduced to an acceptable level. Instead of direct code fixes, business risks typically require added security capabilities and risk control models to slow attacks, reduce attack ROI, and shrink the attack surface.

### BREAK Skill

The repository also provides a Claude Code / Codex Skill definition for local knowledge-base search:

- `SKILL.md` — Chinese Skill definition
- `SKILL_en.md` — English Skill definition
- `scripts/skill/break_search.mjs` — zero-dependency Node.js search engine
- `scripts/skill/export_en_data.mjs` — English static data export
- `scripts/skill/package_skill.sh` — packaging script for a distributable Skill directory

Use it directly in this repository:

```shell
npm run export:data
npm run export:data-en
node scripts/skill/break_search.mjs "credential stuffing" --lang en
node scripts/skill/break_search.mjs R0001 --lang en --detail
node scripts/skill/break_search.mjs "爬虫" --lang zh --type risks,avoidances
```

Package it as a distributable Skill directory:

```shell
scripts/skill/package_skill.sh
```

The default output is `dist/break-skill`. Copy that directory into the target agent's Skill directory. The packaged Skill contains `SKILL.md`, `SKILL_en.md`, `break_search.mjs`, and the generated Chinese/English data bundles.

## Collaboration & Contribution

The framework is described in JSON format under the `/src/BREAK` directory:

- `basic-info` — basic information about the framework
- `risks` — risk item catalogue
- `avoidances` — avoidance measures catalogue
- `avoidance-categories` — avoidance measure categories
- `business-domains` — business domains
  - `riskDimensions` field: business risk domains covered by the domain, with the risk scene IDs under each domain
  - `riskScenes` field: risk scenarios and associated risk items for the domain; do not list a parent risk and its sub-risk in the same risk scene because the frontend expands parent risks into sub-risks
- `attack-tools` — attack tool catalogue
- `threat-actors` — threat actor catalogue
- `terms` — industry terms and slang glossary
- `termCategories` — semantic Term category registry and localized display metadata
- `cases` — typical case catalogue (real cases linked to risks)
- `utils.ts` — common data loading utility functions

Contributors are welcome to collaborate by directly editing the JSON files. Data changes should pass schema validation, i18n synchronization, and tests before submission.

### Acknowledgements

- Thanks to 团长 and we1h0 for their valuable suggestions

## Links

- GitHub: <https://github.com/JDArmy/BREAK>
- License: [Apache License 2.0](./LICENSE)

## Documentation

- Online manual: <https://break.jd.army/#/docs>
- [Contribution guide](./CONTRIBUTING.md)
- [Security reporting](./SECURITY.md)
- [Data Schema](./DATA_SCHEMA.md)
- [Admission Standard](./ADMISSION-STANDARD.md)
- [Quality Governance](./QUALITY-GOVERNANCE.md)
- [STIX 2.1 Mapping](./STIX_MAPPING.md)

## Development

Requires Node.js 24.0+. Use the version declared in `.nvmrc` when possible.

```shell
npm ci
npm run dev
```

Install Chromium before running the Playwright browser checks:

```shell
npx playwright install chromium
```

LLM semantic reviews and web scraping are optional maintenance capabilities. See [`.env.example`](./.env.example) and [`scripts/llm/README.md`](./scripts/llm/README.md) for their environment variables. Normal site development, data validation, and unit tests do not require these credentials.

### Validation

```shell
npm run validate:data
npm run validate:docs-freshness
npm run audit:metrics
npm run audit:references
npm run audit:risk-threat-actor-coverage
npm run audit:maintenance
npm run test
npm run test:coverage
npm run validate:schema-docs
npm run schema:docs:write
npm run validate:docs
npm run export:data
npm run export:data-en
npm run export:stix
npm run export:jsonld
npm run validate:stix
npm run entity:version:bump
npm run version:sync -- --bump=patch --note="description"
npm run export:data-package
npm run validate:data-export
npm run validate:data-package
npm run test:smoke
npm run test:performance
npm run test:visual-review
npm run test:relation-stability
npm run test:lighthouse
npm run build
npm run audit:bundle
npm run audit:bundle:check
npm run build-only
npm run lint
npm run type-check
```

`npm run validate:data` runs JSON Schema validation, i18n key synchronization, relationship coverage auditing, business domain checks, reference coverage, content quality checks, and generated schema documentation checks. The BusinessDomain sub-risk check only blocks duplicate display cases where a parent risk and its sub-risk are listed in the same `riskScene`.
`npm run audit:references` treats Wikipedia as secondary background material and flags confirmed organization homepages, news indexes, and research-directory placeholder links. References should point to specific pages whose titles match and whose content directly supports the entity behavior or fact.
`npm run validate:docs-freshness` blocks documentation drift: when routes, UI components, schemas, validation scripts, public commands, export pipelines, or Skill data/search behavior change, the matching user manual, README, and Skill docs must be updated in the same change.
`npm run review:changed` runs semantic review on changed entities; `review:should-extract` indexes existing entity titles, keywords, aliases, and current relations so already-covered extraction suggestions are suppressed instead of producing duplicate-modeling noise. The extraction reviewer also normalizes structured `new*` suggestion objects before deciding whether a finding is actionable. `review:case-fact` uses Scrapingdog first and falls back to direct local fetching with a browser user agent, a 30-second timeout, Chinese-page charset detection, short-body retry, and article-focused snippet selection before sending text to the LLM.
`npm run build` performs English-data generation, code checks, data and documentation validation, unit and coverage tests, changelog and multi-format exports, site compilation, service-worker version injection, data-package evaluation, and output validation. The `build` script in `package.json` is authoritative.
`npm run test:coverage` enforces the core logic coverage baseline for relation analysis, Sankey attack paths, root/path insights, search, safe i18n, and BREAK data utilities.
`npm run validate:schema-docs` checks [DATA_SCHEMA.md](./DATA_SCHEMA.md) against `src/validation/breakSchema.ts`.
`npm run schema:docs:write` regenerates [DATA_SCHEMA.md](./DATA_SCHEMA.md) after schema changes.
`npm run validate:home-counts` checks that the entity counts in `src/BREAK/home.ts` match the actual data; `npm run generate:home-counts` regenerates them (also run automatically via a pre-commit hook).
`npm run export:data` writes the Chinese static data bundle to `public/data/break-data.json`, `public/data/break-manifest.json`, and `public/data/quality-report.json`.
`npm run export:data-en` writes the English static data bundle to `public/data/break-data-en.json` by merging the Chinese structure source with English translation files.
`npm run export:stix` exports STIX 2.1 Bundles (`public/data/break-stix-zh.json` and `public/data/break-stix-en.json`) mapping all BREAK entities and relationships to STIX SDOs/SROs with Extension Definitions for BREAK-specific fields.
`npm run export:jsonld` exports JSON-LD documents (`public/data/break-ld-zh.jsonld` and `public/data/break-ld-en.jsonld`) for semantic web and knowledge graph consumption, with `stixId` cross-references to the STIX Bundle.
`npm run validate:stix` runs three-layer STIX validation (structural schema, referential integrity, business-rule cross-checks) plus JSON-LD expansion validation.
`npm run entity:version:bump` detects substantive entity changes via `git diff`, increments each entity's `version`, and updates `updated`.
`npm run version:sync -- --bump=patch|minor|major --note="description"` synchronizes `package.json`, `src/BREAK/basic-info/main.json`, and `CHANGELOG.md`. `version:bump` is only a compatibility alias for this project-version command.
`npm run export:data-package` writes an npm package evaluation artifact to `dist/break-data-package`.
`npm run validate:data-export` checks the public data bundle, manifest hash, entity counts, version, and copied GitHub Pages artifacts.
`npm run validate:data-package` checks the npm package boundary, runtime entry, type declarations, README, manifest hash, and version alignment.
`npm run test:smoke`, `npm run test:performance`, `npm run test:visual-review`, `npm run test:relation-stability`, and `npm run test:lighthouse` validate the generated static site with Playwright/Chromium. The current PR CI runs all five browser checks on every pull request. Deploy does not rerun Playwright/Lighthouse.
`npm run audit:quality-report` regenerates the frontend-consumable quality report JSON.
`npm run audit:metrics` generates the content trust, relation coverage, category distribution, and business domain coverage baseline.
`npm run audit:risk-threat-actor-coverage` reports Risk-ThreatActor coverage and separates actionable gaps from explicitly exempt compliance, technology-evolution, and functional-safety risks.
`npm run audit:bundle` checks the generated `dist/assets` bundle against the current performance budget.
`npm run audit:maintenance` refreshes the audit reports and writes a unified maintenance summary.

### Static Data

- Manifest: <https://break.jd.army/data/break-manifest.json>
- Chinese data bundle: <https://break.jd.army/data/break-data.json>
- English data bundle: <https://break.jd.army/data/break-data-en.json>
- Chinese STIX 2.1 Bundle: <https://break.jd.army/data/break-stix-zh.json>
- English STIX 2.1 Bundle: <https://break.jd.army/data/break-stix-en.json>
- Chinese JSON-LD: <https://break.jd.army/data/break-ld-zh.jsonld>
- English JSON-LD: <https://break.jd.army/data/break-ld-en.jsonld>
- Quality report: <https://break.jd.army/data/quality-report.json>

The static bundle exposes the current BREAK data with version, generation metadata, counts, byte size, SHA-256 checksum, and quality report for downstream tools. The Chinese bundle remains the canonical structure source; the English bundle keeps the same structure and replaces only translatable text fields.

### Standardized Interoperability (STIX 2.1 & JSON-LD)

BREAK provides standardized export formats for integration with external CTI/SIEM platforms and semantic web tools:

**STIX 2.1** — All 7 entity types (Risk, Avoidance, AttackTool, ThreatActor, Term, Case, BusinessDomain) are mapped to STIX SDOs with deterministic UUID v5 identifiers. Cross-entity and intra-entity relationships are mapped to STIX Relationship SROs. BREAK-specific fields are preserved through 7 Extension Definitions. Chinese and English Bundles share the same UUIDs, differing only in text content. See [STIX_MAPPING.md](./STIX_MAPPING.md) for the full mapping specification.

**JSON-LD** — Entities are exported as a `@graph` of linked data nodes using `schema.org` vocabulary and BREAK-specific terms. Each entity carries a `stixId` field for bidirectional cross-referencing with the STIX Bundle. Entity URIs follow the pattern `https://break.jd.army/entity/{ID}`.

**Entity Version** — All knowledge entities carry an integer `version` field (default `1`) that auto-increments on substantive content changes. This enables downstream consumers to detect and track entity-level evolution. Run `npm run entity:version:bump` before committing entity changes.

### npm Data Package Evaluation

`npm run export:data-package` creates `dist/break-data-package` as an evaluation artifact for a future `@jdarmy/break-data` package. The artifact is data-only: it excludes the Vue app, ECharts runtime, and browser UI code, and includes `data/break-data.json`, `data/break-manifest.json`, `data/quality-report.json`, STIX 2.1 Bundles (`data/break-stix-zh.json`, `data/break-stix-en.json`), JSON-LD documents (`data/break-ld-zh.jsonld`, `data/break-ld-en.jsonld`), `index.js`, `index.d.ts`, and its own README.

The package version mirrors the BREAK application version. The generated manifest keeps the same SHA-256 checksum and entity counts as the GitHub Pages static data bundle, so downstream users can evaluate npm consumption without changing the canonical data source.
