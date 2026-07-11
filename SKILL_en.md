---
name: break
description: BREAK Business Risk Enumeration & Avoidance Knowledge — query business security risks, avoidances, attack tools, threat actors, terms, and cases, or get answers to business security questions based on the knowledge base
argument-hint: "[query] — keywords, entity ID (e.g. R0001), or security question"
arguments: [query]
allowed-tools: Bash
---

# BREAK Knowledge Base Skill

<!-- 2026-07-11: Internal Avoidance-category key migration; no visible Skill invocation change. -->

BREAK (Business Risk Enumeration & Avoidance Knowledge) is an open knowledge framework for business security risks, containing 3,416 entries across the following entity types:

| Type           | Count | ID Format          | Description                                   |
| -------------- | ----- | ------------------ | --------------------------------------------- |
| Risk           | 400   | R0001, R0001-001   | Business security risk definitions and impact |
| Avoidance      | 350   | A0001, A0001-001   | Defensive measures against risks              |
| AttackTool     | 125   | AT0001, AT0001-001 | Tools used by threat actors                   |
| ThreatActor    | 83    | TA0001, TA0001-001 | Groups that carry out attacks                 |
| Term           | 657   | T0001              | Business security terminology                 |
| Case           | 1781  | C0001              | Real-world security incident cases            |
| BusinessDomain | 20    | BD00               | Industry/business domain categories           |

Maintenance note: the Skill invocation workflow is unchanged; entity counts stay synchronized with knowledge-base case facts, source-quality updates, and relationship updates.

## How to Invoke

Execute the search script via Bash. The script is located at `break_search.mjs` in the same directory as this SKILL file.

### Basic Command Format

```bash
node <skill_dir>/break_search.mjs "<query>" [options]
```

Where `<skill_dir>` is the directory containing this SKILL file.

### Parameters

| Parameter        | Description                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| `<query>`        | Required. Search keywords, entity ID, or security question                                      |
| `--lang zh\|en`  | Language. Auto-detected by default: CJK characters→zh, otherwise→en                             |
| `--type <types>` | Comma-separated entity type filter (risks, avoidances, attackTools, threatActors, terms, cases) |
| `--limit N`      | Max results per type, default 5                                                                 |
| `--detail`       | Verbose mode, shows all fields and relationships                                                |

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

The 2026-07-10 ThreatActor coverage update adds logistics arbitrage, malicious logistics worker, market manipulation, malicious quantitative trading, AI agent attack, abusive platform rule operation, and communications abuse service roles. The new `audit:risk-threat-actor-coverage` command separates actionable relationship gaps from explicitly exempt risks without changing Skill invocation parameters, search fields, or result formats.

The 2026-07-10 ThreatActor reference audit reclassifies Wikipedia as secondary background material, flags generic organization homepages, news indexes, and research directories, and strengthens actor evidence with government, judicial, academic, and original security-research sources. It does not change Skill invocation parameters, search fields, result formats, or entity structure.

The 2026-07-10 entity-granularity review removes unrelated Term relationships from R0285 and a duplicate Avoidance reference from R0159. This maintenance does not change Skill invocation parameters, search fields, return format, or entity structure.

The 2026-07-10 atomic-entity cleanup splits A0124 into Rug Pull on-chain detection and loss compensation / fund recovery, consolidates and removes duplicate A0142/A0160 entries, and removes AT0093 because it does not satisfy the concrete-tool admission boundary. Relationships are migrated to existing atomic entities without changing Skill invocation parameters or result formats.

Term categories use centralized registry keys. Classification fixes update only the Chinese structural source and the entity version; Skill search and display merge English text at runtime, so English entity files do not repeat `category`.

When clearing Case fact-review items, keep each `summary` limited to the subject, time, conduct, enforcement outcome, and impact directly supported by the referenced article text. Details such as amounts, counts, judgments, or regulatory measures that are only title-supported, fail to crawl, or are not covered by the source should be backed by a stable source before being retained, or rewritten as a more conservative factual statement.

When strengthening references for high-value Cases, first look for primary sources such as enforcement agencies, courts, prosecutors, regulators, or vendor advisories. If the original public page is unavailable, use crawlable authoritative media, local justice / police channels, or stable reposts for cross-checking, and avoid retaining details in `summary` that only the unavailable original source would support. Items whose original source is confirmed unavailable but are backed by multiple stable sources can be recorded in the resolved pending list instead of inventing a source to satisfy the gate.

The 2026-07-09 Case P1 reference-quality maintenance only strengthens the references / summary and English translations for C0066, C0130, and C0248; it does not change Skill invocation parameters, search fields, return format, or entity structure.

Case fact review sends scraped article text to the LLM. `review-case-fact.mjs` uses Scrapingdog first, falls back to direct local fetching when scraping fails or returns empty text, and handles UTF-8 / GBK / GB18030 according to page declarations. When maintaining it, keep the submitted snippet long enough to cover key article sections; when clearing P2 items in bulk, create checkpoints after roughly 100 changes and run `validate:data` / `review:changed` before committing, so large batches do not accumulate unverified changes.

The 2026-07-09 Case P2 fact-review maintenance only strengthens or narrows Case `summary` / `references` / English translations; it does not change Skill invocation parameters, search fields, return format, or entity structure.

The second 2026-07-09 Case P2 fact-review checkpoint continues narrowing C0249, C0310, C0401, C0588, C0595, C0635, C0687, C0697, C0705, C0715, C0753, C0755, C0766, C0796, C0797, C0803, C0805, C0819, C0821, C0833, and C0948 `summary`, `incidentTime`, `references`, and English translations; it does not change Skill invocation parameters, search fields, return format, or entity structure.

The 2026-07-10 C0354 maintenance adds a court-system source and changes the Case category to security incident to better match the facts; it does not change Skill invocation parameters, search fields, return format, or entity structure.

The 2026-07-10 C0446 maintenance adds the Shimen County People's Court official WeChat source and syncs the English translation; it does not change Skill invocation parameters, search fields, return format, or entity structure.

The third 2026-07-10 Case P2 fact-review checkpoint continues strengthening or narrowing C0463, C0521, C0522, C0558, C0565, C0571, C0577, C0579, C0593, C0630, C0642-C0720, C0728, C0735, C0744, C0749, C0772, C0781, C0785, C0791, and related Case `summary`, `references`, `incidentTime`, and English translations, and expands R0290 avoidance coverage; it does not change Skill invocation parameters, search fields, return format, or entity structure.

The fourth 2026-07-10 Case P2 fact-review maintenance continues narrowing C0654, C0657, C0684, C1160, C1198, C1235, and related Case `summary`, `incidentTime`, and English translations, and records C0226, C0410, C0792, C0798, and similar items as resolved when already supported by stable existing sources; it does not change Skill invocation parameters, search fields, return format, or entity structure.

The 2026-07-10 P1 reference-quality and follow-up P2 fact-review maintenance strengthens R0081, R0196, TA0030, C0484, C0493, C0502, C0508, C0518, C0538, C0802, C0810, C0812, C0813, C0816, C0851, C0878, C0938, C0996, C1050, C1061, C1062, C1075, C1079, C1084, C1090, C1160, C1198, and related `references`, `summary`, `incidentTime`, and English translations, and synchronizes source / avoidance-relation fixes for A0225 and R0267; it does not change Skill invocation parameters, search fields, return format, or entity structure.

The 2026-07-10 P1 reference-quality pass further replaces or adds authoritative sources for AT0076, A0124, A0270, R0168, R0177, and TA0058, removes the weak forum source from R0168, and syncs the English translations; it does not change Skill invocation parameters, search fields, return format, or entity structure.

The 2026-07-10 AI data-poisoning relationship review corrects AT0108's direct causal relationship to R0273, removes unrelated avoidance and TA0058 Case / Risk attributions, and aligns TA0058's description across training, feedback, and retrieval knowledge pipelines; it does not change Skill invocation parameters, search fields, return format, or entity structure.

The follow-up 2026-07-10 Case P2 fact-review maintenance strengthens crawlable sources, `summary`, `incidentTime`, and English translations for C1056, C1060, C1064, C1067, C1069, C1077, C1100, C1102, and related cases; it does not change Skill invocation parameters, search fields, return format, or entity structure.

The 2026-07-10 Case P2 fact-review checkpoint further revises `summary`, `references`, `incidentTime`, relationships, and English translations for C1482, C1484, C1485, C1488, C1490, C1493, C1495, C1498, C1500, C1501, C1504, C1505, C1511, C1512, C1518, C1519, C1521, C1523, C1528, and C1531, and adds an e-commerce platform product-inspection source for A0222-001; it does not change Skill invocation parameters, search fields, return format, or entity structure.

The 2026-07-11 P2 cleanup batch revises factual summaries and sources for C1190, C1251, C1287, C1366, C1377, C1380, C1384, C1386, C1391, C1392, C1393, C1396, C1400, C1401, C1404, C1406, C1407, C1412, C1414, and C1416, resolves five actor-consistency and five Risk-Avoidance relationship items, and adds terms for human-operated boosting, call bombing, traceability, DEX, privacy coins, zero-shot voice cloning, PII, social engineering, account washing, and Tor; it does not change Skill invocation parameters, search fields, return format, or entity structure.

The 2026-07-11 follow-up P1 reference-quality maintenance strengthens official or incident-specific sources for C1377, C1384, C1401, C1406, C1414, and C1416, and narrows C1384 to the source-supported supply-chain tampering risk; it does not change Skill invocation parameters, search fields, return format, or entity structure.

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
