---
name: break
description: BREAK Business Risk Enumeration & Avoidance Knowledge — query business security risks, avoidances, attack tools, threat actors, terms, and cases, or get answers to business security questions based on the knowledge base
argument-hint: "[query] — keywords, entity ID (e.g. R0001), or security question"
arguments: [query]
allowed-tools: Bash
---

# BREAK Knowledge Base Skill

BREAK (Business Risk Enumeration & Avoidance Knowledge) is an open knowledge framework for business security risks, containing 3,363 entries across the following entity types:

| Type | Count | ID Format | Description |
|------|-------|-----------|-------------|
| Risk | 393 | R0001, R0001-001 | Business security risk definitions and impact |
| Avoidance | 344 | A0001, A0001-001 | Defensive measures against risks |
| AttackTool | 120 | AT0001, AT0001-001 | Tools used by threat actors |
| ThreatActor | 76 | TA0001, TA0001-001 | Groups that carry out attacks |
| Term | 624 | T0001 | Business security terminology |
| Case | 1782 | C0001 | Real-world security incident cases |
| BusinessDomain | 20 | BD00 | Industry/business domain categories |

Maintenance note: the Skill invocation workflow is unchanged; entity counts stay synchronized with knowledge-base relationship updates.

## How to Invoke

Execute the search script via Bash. The script is located at `break_search.mjs` in the same directory as this SKILL file.

### Basic Command Format

```bash
node <skill_dir>/break_search.mjs "<query>" [options]
```

Where `<skill_dir>` is the directory containing this SKILL file.

### Parameters

| Parameter | Description |
|-----------|-------------|
| `<query>` | Required. Search keywords, entity ID, or security question |
| `--lang zh\|en` | Language. Auto-detected by default: CJK characters→zh, otherwise→en |
| `--type <types>` | Comma-separated entity type filter (risks, avoidances, attackTools, threatActors, terms, cases) |
| `--limit N` | Max results per type, default 5 |
| `--detail` | Verbose mode, shows all fields and relationships |

## Workflow

Upon receiving `$query`, follow this workflow:

### Step 1: Determine User Intent

1. **ID Lookup**: `$query` matches an entity ID format (e.g. R0001, AT0034-001) → direct lookup
2. **Keyword Search**: `$query` is a short keyword or term (e.g. "CAPTCHA", "DDoS") → search mode
3. **Question Answering**: `$query` is a descriptive question (e.g. "Our website is being scraped, what should we do?") → Q&A mode

### Step 2: Execute Search

#### ID Lookup

```bash
node <skill_dir>/break_search.mjs "<ID>" --lang en
```

Returns full details including expanded relationships. Present directly to the user.

#### Keyword Search

```bash
node <skill_dir>/break_search.mjs "<keyword>" --lang en
```

To narrow scope:
```bash
node <skill_dir>/break_search.mjs "<keyword>" --type risks,avoidances --lang en
```

#### Question Answering (Core Scenario)

This is the most important usage mode. When users describe a business security problem:

**Step 1: Extract Keywords**

Extract 1-3 sets of search keywords from the user's question. For example:
- "Our website is being scraped" → keywords: "scraping", "crawler", "anti-bot"
- "User accounts keep getting hacked" → keywords: "account takeover", "credential stuffing", "brute force"
- "Someone is abusing our promotions" → keywords: "promotion abuse", "coupon fraud", "bot attack"

**Step 2: Multi-round Search**

Call the search script for each keyword set. Multiple calls are encouraged:

```bash
# Round 1: Search the core issue
node <skill_dir>/break_search.mjs "scraping" --lang en

# Round 2: Search for defenses
node <skill_dir>/break_search.mjs "anti-bot" --type avoidances --lang en

# Round 3: Search related areas if needed
node <skill_dir>/break_search.mjs "data breach" --type risks,cases --lang en
```

**Step 3: Deep Dive**

Pick the most relevant entity IDs from search results for detailed lookup:

```bash
# Get full details of the scraping risk and its avoidances
node <skill_dir>/break_search.mjs R0027 --lang en

# Get details of a specific avoidance
node <skill_dir>/break_search.mjs A0003 --lang en
```

**Step 4: Synthesize Answer**

Based on all retrieved knowledge, provide a structured answer:

```
## Problem Analysis

According to the BREAK knowledge base, your issue involves these risks:
- **[R0027] Scraping Risk**: ... (cite definition and description)
- **[R0027-001] xxx**: ...

## Defense Recommendations

BREAK recommends the following avoidances for these risks:
1. **[A0003] Cloud Anti-Bot**: ... (cite definition)
2. **[A0004] Rate Limiting**: ...
3. ...

## Attack Tools Involved

- **[AT0005] Web Scraping Tools**: ...

## Related Cases

- **[C0xxx] xxx Case**: ...

> Information sourced from BREAK Knowledge Base (https://break.jd.army/)
```

## Key Principles

1. **Always search before answering**: Never answer business security questions from memory alone — always query the BREAK knowledge base first
2. **Cite sources**: Always include specific BREAK entity IDs (e.g. R0027, A0003) in your answers
3. **Search multiple times**: If the first search round is insufficient, try different keywords
4. **Follow relationships**: After finding a risk, check its `avoidances` field for defenses; after finding an attack tool, check its `directCauseRisks` for related risks
5. **Language adaptation**: Match the user's language — use `--lang zh` for Chinese queries and `--lang en` for English

## Documentation Freshness Gate

When `scripts/skill/` search / packaging scripts, exported Chinese / English data bundles, entity fields / relationship structure, Skill invocation parameters, or search-result format change, update both `SKILL.md` and `SKILL_en.md` in the same change. `npm run validate:docs-freshness` is wired into `npm run validate:data` and blocks relevant changes when Skill documentation is stale.

Data-quality fixes also affect Skill search results. When fixing Case `references` / `summary` fact-check issues or adjusting Risk `avoidances` relationships, keep the English translation files in sync and make the first two Case references point to stable pages with crawlable article text whenever possible, so Skill-returned case facts remain reviewable.

When clearing Case fact-review items, keep each `summary` limited to the subject, time, conduct, enforcement outcome, and impact directly supported by the referenced article text. Details such as amounts, counts, judgments, or regulatory measures that are only title-supported, fail to crawl, or are not covered by the source should be backed by a stable source before being retained, or rewritten as a more conservative factual statement.

When strengthening references for high-value Cases, first look for primary sources such as enforcement agencies, courts, prosecutors, regulators, or vendor advisories. If the original public page is unavailable, use crawlable authoritative media, local justice / police channels, or stable reposts for cross-checking, and avoid retaining details in `summary` that only the unavailable original source would support. Items whose original source is confirmed unavailable but are backed by multiple stable sources can be recorded in the resolved pending list instead of inventing a source to satisfy the gate.

The 2026-07-09 Case P1 reference-quality maintenance only strengthens the references / summary and English translations for C0066, C0130, and C0248; it does not change Skill invocation parameters, search fields, return format, or entity structure.

Case fact review sends scraped article text to the LLM. When maintaining `review-case-fact.mjs`, keep the submitted snippet long enough to cover key article sections; when clearing P2 items in bulk, create checkpoints after roughly 100 changes and run `validate:data` / `review:changed` before committing, so large batches do not accumulate unverified changes.

The 2026-07-09 Case P2 fact-review maintenance only strengthens or narrows Case `summary` / `references` / English translations; it does not change Skill invocation parameters, search fields, return format, or entity structure.

`review:should-extract` uses existing entity titles, keywords, aliases, and the current entity's referenced relations to identify already-covered extraction candidates. When maintaining this script, keep duplicate extraction suggestions suppressed so Skill search results do not gain semantically redundant entities.

## Entity Relationship Graph

Understanding entity relationships helps provide more complete answers:

```
ThreatActor (Who)
    ├── buildAttackTools → AttackTool (tools they build)
    ├── useAttackTools → AttackTool (tools they use)
    ├── directCauseRisks → Risk (risks they directly cause)
    └── indirectSupportRisks → Risk (risks they indirectly support)

AttackTool (What tools)
    ├── directCauseRisks → Risk (risks directly caused)
    ├── indirectSupportRisks → Risk (risks indirectly supported)
    └── avoidances → Avoidance (how to defend against)

Risk (What risk)
    └── avoidances → Avoidance (how to avoid)

Case (Real-world incidents)
    ├── relatedRisks → Risk
    ├── relatedAttackTools → AttackTool
    └── relatedThreatActors → ThreatActor

Term (Terminology)
    └── related* → all other entity types

BusinessDomain (Business domains)
    ├── riskDimensions → RiskScene (risk scenes organized by business risk domains)
    └── riskScenes → Risk (risks within each scene; parent risks cover their sub-risks)
```
