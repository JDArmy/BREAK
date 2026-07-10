---
title: Contribution & Maintenance
category: Reference
order: 5
slug: contribution
---

# Contribution & Maintenance

This page is for BREAK knowledge-base contributors. It covers the workflows, quality gates, and conventions for adding / modifying entities. The repo-root `CLAUDE.md` is authoritative; this page is a condensed guide.

## Adding an Entity Checklist

Adding any entity entry (Risk / Avoidance / AttackTool / ThreatActor / Term / Case) follows the common flow:

1. **Assign an ID**: the next consecutive number per the ID format (Risk = R + 4 digits, Avoidance = A + 4 digits, etc.). Sub-entities join the parent ID with `-`.
2. **Write the Chinese source file**: create `src/BREAK/{entity}/{ID}.json`, filling all required fields per schema.
3. **Sync the English translation**: create the matching translation file in `src/i18n/en/BREAK/{entity}/{ID}.json`, containing only translatable text fields.
4. **Maintain relations**: e.g. a new Avoidance must be referenced by at least one Risk or AttackTool's `avoidances` (otherwise validation blocks).
5. **Update the `updated` field**: today's date in YYYY-MM-DD.
6. **Update business domains** (Risk only): add the new Risk ID to `riskScenes[*].risks` in `src/BREAK/business-domains/*.json`. If the same Risk must be reused across multiple business domains / risk scenes, add an explicit reason to the cross-scene reason table in `scripts/validate/business-domains.mjs`.
7. **Run validation**: `npm run validate:data` must pass.
8. **Run review**: `npm run review:changed` confirms no fail.

## Adding an Entity Type (rare)

Entity metadata is centralized in `src/BREAK/entityRegistry.ts`. Routes, ID-prefix inference, i18n paths, search, and detail navigation are derived from this registry. Add the registry entry first, then add the data directory and aggregation, Zod schema, list view, English i18n, any required lazy-loading strategy, and validation scripts. Do not add new hard-coded entity maps in consumers; see [Architecture & Data Pipeline](/docs/architecture) for the ownership boundaries.

## Three-Tier Quality Gates

Entity quality gates have three tiers; see `scripts/llm/README.md` for details.

### Tier 1: Class A · Machine hard constraints (in `validate:data`)

All enumerable / regex / lookup-table rules are wired into `npm run validate:data`. Blocking behavior has two levels:

- **error blocks the build**: schema, i18n-sync, english-i18n-quality, keywords, check-entity-relations, relations, business-domains, require-references, avoidance-content, case-incident-time, admission, ui-i18n-keys, title-dedup, updated-sync-gate, content-quality, references, etc.
- **review non-blocking**: id-continuity (gaps need human confirmation), entity-granularity (split signals need semantic judgment), generic-phrase-blocklist (clichés need human judgment), etc. — report only.

### Tier 2: Class B · Subagent cross-judgment (`review:*` commands)

Rules that need to read actual entity content for semantic cross-checking use a subagent that loads existing entities to cross-judge. Commands include `review:risk-avoidance`, `review:case-relation`, `review:tool-risks`, `review:actor-consistency`, etc. **fail blocks, review warns**.

`review:should-extract` includes existing entity titles, keywords, aliases, and the current entity's referenced relations in the review context. If a proposed extraction is already covered by an existing entity, the script suppresses that duplicate suggestion as covered instead of asking contributors to add another entity. Structured `new*` suggestion objects are normalized into the same actionable suggestion pipeline, so object-shaped LLM output does not create empty-review noise.

```bash
npm run review:changed                # run full B+C on changed entities
npm run review:changed -- --base HEAD~1  # compare against the previous commit
```

### Tier 3: Class C · LLM + scraping (minimal set)

Rules that cannot be fully machine-automated: `review:case-fact` (webpage fact verification, using Scrapingdog first and falling back to direct local fetching with a browser user agent, a 30-second timeout, Chinese-page charset detection, short-body retry, and article-focused snippet selection), `review:field-density` (information density), `review:classification` (category semantic fit).

## Documentation Freshness Gate

`npm run validate:docs-freshness` checks the current working tree against `HEAD` so feature, data-model, or toolchain changes cannot land while the user manual, README, or Skill docs remain stale. This gate is wired into `npm run validate:data`.

Typical changes that require updating both `docs/zh-CN/` and `docs/en/` include: routes / menus / view components, `KnowledgeSplitView`, search and entity-resolution composables, `src/validation/` schemas, the Entity Registry, `DATA_SCHEMA.md`, `scripts/validate/*.mjs`, and `package.json` build or validation scripts.

The documentation supports Mermaid diagrams. Use a `mermaid` code block when a process, sequence, or relationship among three or more nodes is materially clearer as a diagram. Keep simple mappings, field comparisons, and short lists as tables or prose, and avoid expressing the same information twice.

When changing business-domain classification validation, also document the maintenance rule for cross-domain / cross-risk-scene reuse: cross-linking is not a multi-select tag. Add it only when a risk is genuinely reused across multiple industries or problem domains, and record an auditable cross-scene reason.

As of 2026-07-10, when adding or adjusting Risk / Avoidance entries that affect business-domain classification, also check the corresponding `riskScenes[*].risks` in `src/BREAK/business-domains/*.json` so directly relevant industry scenes or physical-consequence scenes are not missed. If relation-array changes affect derived Avoidance / AttackTool / ThreatActor lateral relations, run `npm run sync:lateral-relations` before committing. When the change only updates entity data and scene classification without changing the maintenance workflow, syncing README / Skill counts and this note is sufficient.

Run `npm run audit:risk-threat-actor-coverage` for a non-blocking Risk-ThreatActor coverage audit. Risks without a meaningful malicious actor, such as compliance, technology-evolution, and functional-safety risks, must record a specific reason in `scripts/validate/risk-threat-actor-coverage-exemptions.json`; other uncovered Risks belong in the relationship-backfill or ThreatActor-creation queue. Do not attach broad actors such as "malicious user" or "malicious hacker" merely to increase coverage.

Entity IDs and automatically matched industry terms share `EntityPopoverContent` for summaries. Keep the combined definition and supplementary description to at most five visible lines so long text does not obscure page content or overflow mobile viewports.

Typical changes that require updating `README.md` and `README_CN.md` include: public commands, build / release gates, CI workflows, data exports, STIX / JSON-LD / npm data package outputs, schema documentation, entity types, or basic project information.

When changing a `review:*` script, document the changed review policy in the user manual. If the change affects public commands, commit gates, or maintenance workflow, update the README files as well.

`review:references` fingerprints entity content, references, and the Case `category`. Changing a Case category therefore triggers a fresh review even when links stay the same, so an entry downgraded from a high-value Case to ordinary `news_report` does not reuse stale two-source / primary-source judgments.

Typical changes that require updating `SKILL.md` and `SKILL_en.md` include: `scripts/skill/` search or packaging scripts, Skill-consumable data shape, entity fields / relationships, and exported Chinese / English data bundles.

## Key Content Conventions

### Avoidance content (validated by `avoidance-content.mjs`)

- **description** ≥40 chars. AC02 (sense) / AC03 (identify) must hit a detection-signal keyword (collection side: collect/telemetry/fingerprint/log/traffic; judgment side: threshold/rule/model/baseline). Just writing "detect/identify" self-referential words is insufficient.
- **limitation** required, ≥30 chars, no placeholder clichés. AC02/AC03 must contain a "bypass method" (bypass/crack/forgery/simulate) or "false-positive scenario" (false-positive/false-negative/misjudge).

### Choosing `keywords`

Chinese keywords must verbatim include the title, supplemented with common search terms, aliases, jargon, and abbreviations. Do not use bare entity IDs as keywords, and do not force adjacent concepts into unrelated entities. English keywords should prefer real search phrases, avoiding overly broad words (security/risk/fraud spreading indiscriminately) and templated placeholders.

### references

Array elements only allow `title` + a valid URL `link`. Each URL must point to a specific page whose title matches and whose content directly supports the entity behavior or fact; root domains, news indexes, research directories, and similar placeholders are not acceptable. The 10 framework-homepage placeholders and confirmed generic organization landing pages are banned for new entries. Wikipedia is classified only as secondary background material and cannot replace government, judicial, academic, or original security-research evidence.

## Admission Standard

New entries must meet `ADMISSION-STANDARD.md`:

- **Placeholder-homepage ban**: references may not use the 10 framework-homepage placeholder links
- **Content floor**: keywords ≥3 (Term ≥4), length floors on text fields (risk description ≥60 chars, case summary ≥80 chars)
- **High-value Case sources**: criminal_verdict and 3 other categories need ≥2 sources including ≥1 primary first-hand source
- **Degradation protection**: historical entries are exempt from the initial floor, but falling below the snapshot value still errors

Case `incidentTime` normally must be a real event time in 2000 or later. For high-value historical security incidents backed by first-hand sources such as NSA, court, or regulator material, do not invent a modern date just to pass validation; explicitly register the entry in the early-year allowlist in `scripts/validate/case-incident-time.mjs` and document the reason.

## Common Command Cheatsheet

```bash
npm run validate:data              # full data validation (Class A machine constraints)
npm run validate:docs-freshness    # check user manual / README / Skill docs against relevant changes
npm run review:changed             # run B+C review on changed entities
npm run sync:lateral-relations     # recompute Avoidance/AttackTool/ThreatActor lateral relations
npm run sync:risk-assessment       # recompute Risk assessment priority
npm run audit:risk-case-coverage   # audit Risk-Case coverage (non-blocking)
npm run audit:risk-threat-actor-coverage # audit Risk-ThreatActor coverage and exemptions (non-blocking)
npm run audit:admission            # admission-standard patrol (report only, non-blocking)
npm run entity:version:bump        # bump version/updated for substantively changed entities
npm run version:sync -- --bump=patch --note="description" # sync project version, basic info, and CHANGELOG
npm run build                      # full release gate (lint→validate→test→export→build→package→audit)
```

## Version & Commit Conventions

- **Bump the version before every commit**: small changes are a patch (2.42.40 → 2.42.41), larger changes a minor (→ 2.43.0), major changes a major (→ 3.0.0). Use `npm run version:sync -- --bump=patch|minor|major --note="description"`.
- **Keep entity and project versions separate**: run `npm run entity:version:bump` for substantive entity changes. `npm run version:bump` is a compatibility alias of `version:sync`; it does not bump entity versions.
- **Run `npm run build` before every commit** to ensure the build passes.
- **The CHANGELOG filename must be all-uppercase**: `CHANGELOG.md`.
- pre-commit enables `review:changed` by default (only when there are `src/BREAK/*.json` changes); set `BREAK_REVIEW_ON_COMMIT=0` to skip temporarily.

## Immediate Entity-Issue Fixing

During any task, if you find a knowledge-base entity with a description error, relation error, or field-convention issue (whether or not related to the current task), spawn a subagent to fix it immediately — don't leave it for later. This is a data-hygiene principle that runs through all tasks.

For broad same-class issues (e.g. a batch of entities with placeholder limitations), dispatch multiple subagents in parallel per the "Keywords batch-processing" pattern.

## Maintaining Term Categories

Starting with 2.45.0, adding or changing a Term category requires updating the authoritative enum definition and both localized labels, then checking schema validation, search filters, static exports, STIX/JSON-LD, and data-package type declarations. Run `npm run validate:data` before committing to ensure every `Term.category` uses a valid key and English translation files do not duplicate structural fields.

When `BREAK_REVIEW_ON_COMMIT=0` is used because the LLM service is unavailable, pre-commit records affected entities, the reason, and a rerun command in local `research/search-reports/llm-gate-retry/`. Run the recorded `review:changed` command once service is restored. Per-entity call failures are also preserved in each review directory's `review-progress.json.failed` and are retried automatically when the fingerprint is reviewed again.
