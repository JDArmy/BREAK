---
title: Release & Maintenance
category: Maintenance
order: 8
slug: release-maintenance
---

# Release & Maintenance

BREAK maintains both project versions and entity versions. They serve different purposes and must be handled separately.

## Entity Versions

After changing an entity's definition, description, keywords, references, or primary relations, run:

```shell
npm run entity:version:bump
```

The script detects substantive changes against the Git base, increments the entity `version`, and refreshes `updated`. Automatically generated lateral relations do not trigger entity-version changes.

## Project Version

After choosing the release level, run:

```shell
npm run version:sync -- --bump=patch --note="fix description"
```

Valid levels are `patch`, `minor`, and `major`. The command updates `package.json`, `src/BREAK/basic-info/main.json`, and `CHANGELOG.md` together. `npm run version:bump` is a compatibility alias with the same project-version meaning; it does not increment entity versions.

## Release Checklist

1. Run `npm run entity:version:bump` when entities changed substantively.
2. Run `npm run sync:lateral-relations` when primary relations changed.
3. Run `npm run version:sync -- --bump=... --note="..."`.
4. Complete `CHANGELOG.md` and label data / app / docs / build impact.
5. Run `npm run build`.
6. Review `git diff` and ensure `.env`, generated caches, and temporary audit reports are not committed.

## CI and Deployment

Pull-request CI runs static checks, unit tests, data exports, the site build, and the smoke, relation-stability, Lighthouse, performance, and visual browser checks. After a merge to `main`, the Deploy workflow runs `npm run deploy:build` and publishes GitHub Pages. Patch releases do not create a GitHub Release; minor or major versions with `patch=0` create a Release with downloadable data artifacts.

## Troubleshooting

- Playwright cannot find a browser: run `npx playwright install chromium`; Linux CI uses `npx playwright install --with-deps chromium`.
- Documentation output is stale: run `npm run generate:docs`, then `npm run validate:docs`.
- Schema documentation is stale: run `npm run schema:docs:write`.
- Static-data validation fails: rerun the relevant `export:*` command instead of editing generated files.
- Do not rewrite an already published version after a failed release. Fix the issue, publish a new patch version, and document it in the changelog.

## 2.45.0 Category Migration Check

For the Term category enum migration, verify localized category labels, list filters, search, static datasets, STIX/JSON-LD, and npm data-package output in addition to the normal build. Legacy free-text categories and the separate allowlist must not remain in source or generated artifacts.
