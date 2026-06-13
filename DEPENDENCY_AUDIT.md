# Dependency Audit

> Last reviewed: 2026-06-13

## Direct Dependencies In Use

| Package | Usage |
|---------|-------|
| `axios` | GitHub API panel and local editor save requests |
| `echarts` | Relation graph and attack path visualization |
| `element-plus` | UI component library |
| `fuse.js` | Client-side full-text search |
| `vue`, `vue-router`, `vue-i18n` | Core application runtime |
| `zod` | Data schema validation |

## Dev Dependencies In Use

| Package | Usage |
|---------|-------|
| `express` | Local JSON editor save server |
| `cors` | Local editor server support |
| `happy-dom` | Vitest browser-like test environment |
| `rollup-plugin-visualizer` | `npm run analyze` bundle analysis |
| `vite`, `vitest`, `vue-tsc`, `typescript`, ESLint packages | Build, test, lint, and type checking |
| `unplugin-auto-import`, `unplugin-vue-components` | Element Plus auto import setup |

## Removed During Follow-Up

| Package | Observation | Recommendation |
|---------|-------------|----------------|
| `brace-expansion` | No direct source import found | Removed as a direct dependency |
| `shell-quote` | No direct source import found | Removed as a direct dependency |
| `npm-run-all` | No npm script used it | Removed from devDependencies |
| `@vue/test-utils` | Current tests do not mount Vue components | Removed from devDependencies; re-add when component tests are introduced |

## Security Follow-Up

| Item | Result |
|------|--------|
| Vite/esbuild audit finding | Upgraded Vite to 8.0.x and compatible Vite plugins |
| `npm audit --omit=optional` | 0 vulnerabilities after cleanup |

## Commands Used

```shell
npm ls brace-expansion shell-quote axios express @vue/test-utils npm-run-all --depth=0
rg -n "brace-expansion|shell-quote|npm-run-all|@vue/test-utils|axios|express|cors|happy-dom" . -g'!*node_modules*' -g'!*docs/assets*' -g'!*package-lock.json'
npm audit --omit=optional
```
