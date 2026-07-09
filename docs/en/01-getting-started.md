---
title: Getting Started
category: Getting Started
order: 1
slug: index
---

# Getting Started

BREAK (Business Risk Enumeration & Avoidance Knowledge) is a knowledge framework for business security that decomposes "business risk" into six enumerable entity types and links them with relationships into a searchable, reason-about-able network. This page helps you build a mental model in 5 minutes.

## What BREAK Is

BREAK is not a vulnerability database, nor a CVE list. It focuses on **risks caused by the unintended exploitation of business logic** — account registration automation, credential stuffing, payment fraud, traffic/review manipulation, workflow automation abuse — and the corresponding avoidance measures, attack tools, threat actors, industry terms, and real-world cases.

One-line positioning: **Risk is the core; the other five entity types are organized around it** — Avoidance defends against Risk, AttackTool creates Risk, ThreatActor uses tools to create Risk, Term explains Risk, and Case proves a Risk actually happened.

## The Six Entity Types

| Entity | ID Format | Question it answers | Typical example |
|--------|-----------|---------------------|-----------------|
| Risk | R0001 | What bad thing did the attacker do via business logic | Registration automation, payment channel abuse |
| Avoidance | A0001 | How to defend / how to detect | CAPTCHA, device fingerprint, behavior analysis |
| AttackTool | AT0001 | What tool is used to carry out the attack | CAPTCHA-solving platform, SMS-receiving platform, proxy pool |
| ThreatActor | TA0001 | Who did it (role category) | Wool-pullers, scalpers, SIM vendors |
| Term | T0001 | What does this concept noun mean | Credential stuffing, account farming |
| Case | C0001 | A specific event that happened | A public-security DDoS takedown |

**Definitional boundaries are what BREAK cares about most**: Risk is "the risk itself", not a defense (→Avoidance); Avoidance is "a concrete measure", not a vague concept; Case is "a specific event", not a trend report. Understanding the boundaries is prerequisite to correct search and attribution.

## Three Core Entry Points

### 1. Home: Risk Alerts & Relationship Graph

The home page shows current high-priority risk alert cards and provides entry to the relationship graph. The graph has four perspectives:

- **Risk Relation**: prerequisite / co-occurrence / escalation / variant links between Risks
- **Attack Path**: forward inference of Risk → AttackTool → ThreatActor
- **Defense Coverage**: reverse mapping of Risk → Avoidance
- **Path Explorer**: free-form exploration of relationship chains from any starting point

Click any risk card on the home page to open the risk drawer for a quick view of definition, influence, and related entities; click an entity ID in the drawer to jump to the corresponding list/detail page.

### 2. Knowledge Base List Pages

The top "Knowledge Base" dropdown provides list pages for the six entity types (`/knowledges/{entity}/list`). Each list page is a split view: a left panel with the entity list (searchable, filterable by dimension) and a right panel with full details of the selected entity. URLs can be deep-linked via hash, e.g. `/knowledges/risk/list#R0001`.

### 3. Site Search

Press `⌘K` (macOS) or `Ctrl+K` (Windows) to invoke global search, which fuzzily searches across all six entity types by keyword, alias, or ID. Results are grouped by entity type; click to jump to the corresponding detail.

## Bilingual (Chinese / English)

The site is bilingual. The language switcher in the top-right toggles the entire site (including entity titles, descriptions, menus). Chinese is the single source of truth (`src/BREAK/`); English translations live in `src/i18n/en/BREAK/` and are merged with structural fields at runtime. The docs page is also bilingual and switches automatically with the site language.

## Where to Read Next

- **Defenders**: read the [Defender Guide](/docs/defender-guide)
- **Red team / attackers**: read the [Red Team Guide](/docs/redteam-guide)
- **To understand the data model**: read the [Data Model & Field Reference](/docs/data-model)
- **To contribute**: read the [Contribution & Maintenance](/docs/contribution)
