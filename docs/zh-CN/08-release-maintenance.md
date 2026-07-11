---
title: 发布与维护
category: 维护
order: 8
slug: release-maintenance
---

# 发布与维护

<!-- 2026-07-11：规避分类语义 key 内部迁移，无新增公开发布或维护流程。 -->

BREAK 同时维护项目版本和实体版本。两者用途不同，必须分别处理。

## 实体版本

修改实体的定义、描述、关键词、引用或主关系后运行：

```shell
npm run entity:version:bump
```

脚本会检测相对 Git 基准的实质变化，递增实体 `version` 并刷新 `updated`。自动重算的横向关系不触发实体版本变化。

## 项目版本

确定发布级别后运行：

```shell
npm run version:sync -- --bump=patch --note="修复说明"
```

可选级别为 `patch`、`minor`、`major`。该命令同步更新 `package.json`、`src/BREAK/basic-info/main.json` 和 `CHANGELOG.md`。`npm run version:bump` 是兼容别名，含义相同，不用于实体版本递增。

## 发布检查

1. 运行 `npm run entity:version:bump`（有实体实质变化时）。
2. 运行 `npm run sync:lateral-relations`（主关系变化时）。
3. 运行 `npm run version:sync -- --bump=... --note="..."`。
4. 完善 `CHANGELOG.md`，标明 data / app / docs / build 影响。
5. 运行 `npm run build`。
6. 检查 `git diff`，确认没有误提交 `.env`、生成缓存或审计临时文件。

## CI 与部署

PR CI 会运行静态检查、单元测试、数据导出、站点构建，以及 smoke、关系稳定性、Lighthouse、性能和视觉检查。合并到 `main` 后，Deploy workflow 运行 `npm run deploy:build` 并发布 GitHub Pages；补丁版本不创建 GitHub Release，`patch=0` 的次版本或主版本会创建 Release 并附带数据产物。

## 故障处理

- Playwright 找不到浏览器：运行 `npx playwright install chromium`；Linux CI 环境使用 `npx playwright install --with-deps chromium`。
- 文档产物过期：运行 `npm run generate:docs`，再运行 `npm run validate:docs`。
- Schema 文档过期：运行 `npm run schema:docs:write`。
- 静态数据校验失败：重新运行对应 `export:*` 命令，不要手工修改生成文件。
- 发布失败时不要重写已公开版本；修复后递增补丁版本重新发布，并在 CHANGELOG 说明。

## 2.45.0 分类迁移检查

术语分类枚举迁移发布时，除常规构建外还需确认中英文分类标签、列表筛选、搜索、静态数据、STIX/JSON-LD 与 npm 数据包输出一致。旧的自由文本分类和独立 allowlist 不应残留在源码或生成产物中。

LLM 门禁因外部服务故障跳过时，不得只记录在终端输出。检查 `research/search-reports/llm-gate-retry/` 的待重跑清单，待服务恢复后执行记录的命令并保留结果，再继续发布流程。

`review:should-extract` 的失败实体会写入 `should-extract-review/review-progress.json.failed`。批量重跑应复用检查点，只重试失败或指纹变化的实体；结构化候选策略变化时需同步更新策略版本，并重新生成当前质量待办审计。

历史 LLM 门禁关闭前，应确认各 `pending-fix.json` 无 fail、各评审当前指纹均有成功结果，并完成 `case-fact` 的格式错误重试。确认后可删除被 Git 忽略的 `research/`，后续审计脚本会按需重建目录。

`review:case-fact` 的正文抓取、直连和搜索摘要回退均属于门禁证据链。调整回退策略时应同步递增评审指纹和缓存版本，防止旧空缓存或不可读 PDF 内容掩盖新的抓取结果。
