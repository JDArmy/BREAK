---
title: Data Model & Field Reference
category: Reference
order: 4
slug: data-model
---

# Data Model & Field Reference

This page is the field reference for BREAK's six entity types and their relationships. The data structure is authoritative in `src/validation/breakSchema.ts` and `npm run validate:data`; this page is for quick lookup.

## Entity Overview

| Entity | File path | ID format | Required text fields |
|--------|-----------|-----------|----------------------|
| Risk | `src/BREAK/risks/{ID}.json` | R + 4 digits (sub-risks joined by `-`) | title, keywords, definition, description, influence, references |
| Avoidance | `src/BREAK/avoidances/{ID}.json` | A + 4 digits | title, keywords, definition, description, limitation, references |
| AttackTool | `src/BREAK/attack-tools/{ID}.json` | AT + 4 digits | title, keywords, description, references |
| ThreatActor | `src/BREAK/threat-actors/{ID}.json` | TA + 4 digits | title, keywords, description, references |
| Term | `src/BREAK/terms/{ID}.json` | T + 4 digits | title, aliases, keywords, definition, description, usageExample, references |
| Case | `src/BREAK/cases/{ID}.json` | C + 4 digits | title, keywords, summary, references |

Sub-entities join the parent ID with `-`, e.g. `R0001-001` is a sub-risk of R0001. Case has no sub-cases.

## Risk

Risk is the core entity. Beyond the common fields:

- **`definition`**: one-line definition (required)
- **`complexity`**: `basic` / `intermediate` / `advanced` (required, **stored as English enum values in the Chinese source**, not "初级/中级/高级")
- **`influence`**: impact statement (required)
- **`avoidances`**: array of Avoidance IDs that can mitigate this risk (required, non-empty)
- **`relatedRisks`**: semantic links between risks (**manually maintained**, see relation types below)
- **`updated`**: YYYY-MM-DD; must be updated when modifying substantive content

Risk does **not** maintain `relatedBusinessDomains` — a risk's business-domain membership is authoritative in BusinessDomain; the relation lives in `src/BREAK/business-domains/*.json` under `riskScenes[*].risks`.

## Avoidance

- **`category`**: `AC01` (prevent) / `AC02` (sense) / `AC03` (identify) / `AC04` (dispose), required
- **`effectiveness`**: `high` / `medium` / `low`, optional, indicates effectiveness strength
- **`limitation`**: **required**, ≥30 chars, no placeholder clichés. AC02/AC03 must contain "bypass method" or "false-positive scenario"
- **`description`**: ≥40 chars. AC02/AC03 must hit a detection-signal keyword (collect/telemetry/fingerprint/threshold/model, etc.)

The lateral-relation fields `relatedAvoidances` / `relatedAttackTools` / `relatedThreatActors` are **auto-maintained** by `sync:lateral-relations` — do not hand-edit.

## AttackTool

Relation fields (all required, non-empty):

- **`directCauseRisks`**: risks directly caused
- **`indirectSupportRisks`**: risks indirectly supported
- **`avoidances`**: measures that can constrain this tool

## ThreatActor

- **`buildAttackTools`**: tools the actor builds
- **`useAttackTools`**: tools the actor uses
- **`directCauseRisks`** / **`indirectSupportRisks`**: both required, non-empty

`buildAttackTools` vs `useAttackTools` distinguishes "build" from "use" — key to attack-path inference.

## Term

- **`category`**: free string (e.g. "Data collection", "Business fraud", "Underground services"), reuse existing values
- **`aliases`**: alias array
- **`usageExample`**: usage scenario example (required), must contain at least one of title or aliases (front-end highlights it)
- May maintain `relatedRisks` / `relatedAvoidances` / `relatedAttackTools` / `relatedThreatActors` / `relatedBusinessDomains`

## Case

- **Does not maintain `description`** (removed from schema); factual descriptions go in `summary` (80–150 words)
- **`category`**: `criminal_verdict` / `administrative_enforcement` / `security_incident` / `vulnerability_advisory` / `academic_research` / `news_report` (stored as key, mapped via locale)
- **`incidentTime`**: incident time
- **`relatedRisks`**: at least 1 (required); `relatedAttackTools` / `relatedThreatActors` optional
- Cases are lazily loaded (1782+ entries); the home page does not load them — they load only on `/cases`, search, or related-cases reverse query

## Relation Field Semantics

### Primary relations (manually maintained, authoritative)

| Field | From → To | Meaning |
|-------|-----------|---------|
| `Risk.avoidances` | Risk → Avoidance | measures mitigating this risk |
| `AttackTool.directCauseRisks` | Tool → Risk | risks the tool directly causes |
| `AttackTool.indirectSupportRisks` | Tool → Risk | risks the tool indirectly supports |
| `AttackTool.avoidances` | Tool → Avoidance | measures constraining this tool |
| `ThreatActor.buildAttackTools` | Actor → Tool | tools the actor builds |
| `ThreatActor.useAttackTools` | Actor → Tool | tools the actor uses |
| `ThreatActor.directCauseRisks` / `indirectSupportRisks` | Actor → Risk | risks the actor causes |
| `Case.relatedRisks` etc. | Case → * | entities the case involves (**maintained only on the Case side**) |

### Risk.relatedRisks link types

Links between Risks (**manually maintained**, note is hand-written, not auto-derived by a script):

- **prerequisite**: a prerequisite risk — A must occur before B triggers
- **co-occurrence**: co-occurring risk — A and B often appear together
- **escalation**: escalating risk — A escalates into B
- **variant**: variant risk — B is a variant of A

### Lateral relations (script-maintained)

`relatedAvoidances` / `relatedAttackTools` / `relatedThreatActors` are auto-generated by `npm run sync:lateral-relations` by reverse-deriving from primary relations (count of jointly-covered risks, jointly-constrained tools). **Do not hand-edit; the next sync will overwrite them.** Their changes do not trigger an entity `updated` bump.

## Internationalization (i18n) Merge Mechanism

The Chinese source (`src/BREAK/`) is the single source of truth for structural relations; English translations (`src/i18n/en/BREAK/`) contain only translatable text fields. At runtime `mergeWithStructure(Chinese source, English translation)` merges: structural fields (ID arrays, `updated`, `category` key, `complexity` enum) come from the Chinese source; text fields come from the English translation.

Per-entity English translation file field lists:

- **Avoidance EN**: title, definition, description, limitation, references, keywords
- **Risk EN**: title, definition, description, influence, references, keywords (`complexity` is not maintained — already an English enum, merged at runtime)
- **AttackTool EN**: title, description, references, keywords
- **ThreatActor EN**: title, description, references, keywords
- **Term EN**: title, aliases, keywords, definition, description, usageExample, references, category (free string, must be translated)
- **Case EN**: title, keywords, summary, references (`category` is a key, not translated)

## references Rules

`references` is an array whose elements **only allow `title` and a valid URL `link`** (schema strict; extra fields are rejected). `sourceType` is a runtime grading return value and **must not be written into entity data**. Each entity needs ≥1 reference; URLs should point to a specific accessible page (avoid root-domain / homepage placeholder links).

## keywords Rules

- Chinese entity keywords must **verbatim include the title** (enforced by `data-integrity.test.ts`)
- Do not put bare entity IDs (e.g. `R0222`) into keywords
- English keywords must not have case-insensitive duplicates, no Chinese residue, no templated placeholder words
