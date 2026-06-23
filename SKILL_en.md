---
name: break
description: BREAK Business Risk Enumeration & Avoidance Knowledge — query business security risks, avoidances, attack tools, threat actors, terms, and cases, or get answers to business security questions based on the knowledge base
argument-hint: "[query] — keywords, entity ID (e.g. R0001), or security question"
arguments: [query]
allowed-tools: Bash
---

# BREAK Knowledge Base Skill

BREAK (Business Risk Enumeration & Avoidance Knowledge) is an open knowledge framework for business security risks, containing 3,200+ entries across the following entity types:

| Type | Count | ID Format | Description |
|------|-------|-----------|-------------|
| Risk | 350 | R0001, R0001-001 | Business security risk definitions and impact |
| Avoidance | 300 | A0001, A0001-001 | Defensive measures against risks |
| AttackTool | 110 | AT0001, AT0001-001 | Tools used by threat actors |
| ThreatActor | 70 | TA0001, TA0001-001 | Groups that carry out attacks |
| Term | 600 | T0001 | Business security terminology |
| Case | 1797 | C0001 | Real-world security incident cases |
| BusinessScene | 18 | BS00 | Industry/business domain categories |

## How to Invoke

Execute the Python search script via Bash. The script is located at `break_search.py` in the same directory as this SKILL file.

### Basic Command Format

```bash
python3 <skill_dir>/break_search.py "<query>" [options]
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
python3 <skill_dir>/break_search.py "<ID>" --lang en
```

Returns full details including expanded relationships. Present directly to the user.

#### Keyword Search

```bash
python3 <skill_dir>/break_search.py "<keyword>" --lang en
```

To narrow scope:
```bash
python3 <skill_dir>/break_search.py "<keyword>" --type risks,avoidances --lang en
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
python3 <skill_dir>/break_search.py "scraping" --lang en

# Round 2: Search for defenses
python3 <skill_dir>/break_search.py "anti-bot" --type avoidances --lang en

# Round 3: Search related areas if needed
python3 <skill_dir>/break_search.py "data breach" --type risks,cases --lang en
```

**Step 3: Deep Dive**

Pick the most relevant entity IDs from search results for detailed lookup:

```bash
# Get full details of the scraping risk and its avoidances
python3 <skill_dir>/break_search.py R0027 --lang en

# Get details of a specific avoidance
python3 <skill_dir>/break_search.py A0003 --lang en
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

BusinessScene (Business domains)
    └── riskScenes → Risk (risks within each scene)
```
