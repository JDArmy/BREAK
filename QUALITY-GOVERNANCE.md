# BREAK 质量治理流程

本文档说明如何吸纳 `research/` 中的审计结果，以及哪些内容可以归档清理。

## 目录定位

`research/` 是本地临时研究与审计输出目录，已被 `.gitignore` 忽略，不是运行时数据源，也不是构建输入。正式规则、脚本和文档应沉淀到 `scripts/validate/`、`package.json` 和项目文档中。

## 当前待办入口

优先使用正式脚本查看当前仍有效的质量待办：

```bash
npm run audit:pending-quality
npm run audit:case-fact-priority
```

- `audit:pending-quality` 汇总 `references-review`、`dead-links-worklist`、`highValueMissingPrimary-worklist`、关系评审、术语完整性、应抽取实体和 Case 事实核验等清单，只统计仍指向当前实体的待办。
- `audit:case-fact-priority` 将 `case-fact-review/pending-fix.json` 按 P0/P1/P2 压缩排序，避免把 LLM 的 `review` 信号直接等同于必须修改。
- 已吸纳的旧待办记录在 `scripts/validate/pending-quality-resolved.json`。当某个 `pending-fix.json` 项已落实到实体数据或判断为无需修改时，把对应实体 ID 加入该文件，避免历史清单反复报同一问题。

## 处理优先级

- P0：来源不足以支撑具体事件、主体或时间，或 Case 与定义边界冲突。优先改分类、弱化 summary、补强来源，必要时删除。
- P1：高价值实体缺 primary 来源、summary 与来源存在疑似事实不一致、死链影响事实支撑。优先补官方、法院、公安、监管、厂商公告、论文、CVE/NVD 等来源。
- P2：关系覆盖不足、术语关联不完整、脚本抓取失败、一般补强建议。按批次处理。
- P3：观察项或性能/维护建议，不阻断日常数据维护。

## 吸纳规则

- 能直接落到实体关系的待办，优先修改 `src/BREAK/` 中文结构源；若修改可翻译文本，同步更新 `src/i18n/en/BREAK/`。
- `relatedAvoidances`、`relatedAttackTools`、`relatedThreatActors` 等横向关系由 `npm run sync:lateral-relations` 生成，不手改。
- `research/*/pending-fix.json` 是审计线索，不是事实来源。修改实体前必须回看当前实体内容和引用，不直接照搬建议。
- Case 来源治理优先处理高价值类别：`criminal_verdict`、`administrative_enforcement`、`security_incident`、`vulnerability_advisory`。
- 发现新概念时先复用已有实体；只有满足准入标准且不能由现有实体表达时再新增 Risk、Avoidance、AttackTool、ThreatActor、Term 或 Case。

## 清理规则

可以归档或删除：

- `review-progress.json`、抓取缓存、截图、旧 `.md/.json` 报告、空 `pending-fix.json`。
- 已导入候选、已不存在实体对应的历史残留项。
- 可由审计脚本重新生成的 `research/search-reports/*.json` 和 `.md`。

删除前建议先运行：

```bash
npm run audit:pending-quality
npm run audit:case-fact-priority
```

只要这两个报告已经输出当前有效待办，`research/` 中其他历史材料就不应再作为唯一待办来源。
