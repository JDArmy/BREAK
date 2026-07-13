---
title: Data Consumption Guide
category: Reference
order: 7
slug: data-consumption
---

# Data Consumption Guide

BREAK publishes JSON, STIX 2.1, and JSON-LD formats. External consumers should read the Manifest first, download only the required data, and use the release version and SHA-256 values to decide whether cached data needs refreshing.

## Public Endpoints

| Format       | URL                                                                                                      | Use case                                 |
| ------------ | -------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Manifest     | `https://break.jd.army/data/break-manifest.json`                                                         | Version, counts, hashes, generation time |
| Chinese JSON | `https://break.jd.army/data/break-data.json`                                                             | Complete Chinese structured data         |
| English JSON | `https://break.jd.army/data/break-data-en.json`                                                          | English text with the same structure     |
| STIX 2.1     | `https://break.jd.army/data/break-stix-zh.json` / `https://break.jd.army/data/break-stix-en.json`        | CTI, SIEM, and SOAR integration          |
| JSON-LD      | `https://break.jd.army/data/break-ld-zh.jsonld` / `https://break.jd.army/data/break-ld-en.jsonld`        | Knowledge graphs, RDF, and semantic web  |

## Minimal Fetch Example

```js
const base = "https://break.jd.army/data";
const manifest = await fetch(`${base}/break-manifest.json`).then((r) =>
  r.json(),
);
const data = await fetch(`${base}/break-data-en.json`).then((r) => r.json());

console.log(manifest.packageVersion, manifest.counts);
console.log(data.data.risks.R0001);
```

Production consumers should check HTTP status codes, enforce timeouts, and retain the last successful data as a fallback cache. Manifest SHA-256 values can verify download integrity.

## Compatibility and Versions

- The project version in `package.json` and the Manifest `packageVersion` identifies a release.
- Each entity's integer `version` tracks content evolution and supports incremental synchronization.
- Patch releases normally preserve structure; minor releases may add fields or outputs; major releases may change structural semantics.
- Use `DATA_SCHEMA.md`, `CHANGELOG.md`, and the Manifest version to evaluate schema changes. Do not rely on object-key order.
- The Chinese bundle is structurally authoritative. The English bundle keeps the same structure and replaces translatable text.

## Resolving Relations

Relation fields store entity IDs. Build an ID index for each collection before resolving `avoidances`, `directCauseRisks`, `relatedRisks`, and similar fields. Cases are not part of the browser application's eager BREAK object, but the public static bundles contain the complete Case collection.

See [Data Model & Field Reference](/docs/data-model) for field definitions and the repository-root `STIX_MAPPING.md` for STIX details.
