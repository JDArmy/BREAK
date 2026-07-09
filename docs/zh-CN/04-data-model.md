---
title: 数据模型与字段说明
category: 参考
order: 4
slug: data-model
---

# 数据模型与字段说明

本文是 BREAK 六大实体及其关系的字段参考。数据结构以 `src/validation/breakSchema.ts` 和 `npm run validate:data` 为准，本文用于快速查阅。

## 实体总览

| 实体 | 文件路径 | ID 格式 | 必填文本字段 |
|------|---------|---------|-------------|
| Risk | `src/BREAK/risks/{ID}.json` | R + 4位（子风险用 `-` 连接） | title, keywords, definition, description, influence, references |
| Avoidance | `src/BREAK/avoidances/{ID}.json` | A + 4位 | title, keywords, definition, description, limitation, references |
| AttackTool | `src/BREAK/attack-tools/{ID}.json` | AT + 4位 | title, keywords, description, references |
| ThreatActor | `src/BREAK/threat-actors/{ID}.json` | TA + 4位 | title, keywords, description, references |
| Term | `src/BREAK/terms/{ID}.json` | T + 4位 | title, aliases, keywords, definition, description, usageExample, references |
| Case | `src/BREAK/cases/{ID}.json` | C + 4位 | title, keywords, summary, references |

子实体用 `-` 连接父 ID，如 `R0001-001` 是 R0001 的子风险。Case 无子案例。

## Risk（风险）

Risk 是核心实体。除通用字段外，特有字段：

- **`definition`**：一句话定义（必填）
- **`complexity`**：`basic` / `intermediate` / `advanced`（必填，**中文源存英文枚举值**，不写「初级/中级/高级」）
- **`influence`**：影响说明（必填）
- **`avoidances`**：能缓解该风险的 Avoidance ID 数组（必填非空）
- **`relatedRisks`**：风险间语义关联（**手维护**，见下文关系类型）
- **`updated`**：YYYY-MM-DD，修改实质内容时必须同步更新

Risk **不维护** `relatedBusinessDomains`——风险所属业务域以 BusinessDomain 为权威，关系在 `src/BREAK/business-domains/*.json` 的 `riskScenes[*].risks` 中。

## Avoidance（规避手段）

- **`category`**：`AC01`（防止）/ `AC02`（感知）/ `AC03`（识别）/ `AC04`（处置），必填
- **`effectiveness`**：`high` / `medium` / `low`，可选，表示有效性强度
- **`limitation`**：**必填**，≥30 字，不得占位套话。AC02/AC03 必须含「被绕过方式」或「误报场景」
- **`description`**：≥40 字。AC02/AC03 必须命中检测信号词（采集/埋点/指纹/阈值/模型等）

横向关系字段 `relatedAvoidances` / `relatedAttackTools` / `relatedThreatActors` 由 `sync:lateral-relations` **自动维护**，不要手改。

## AttackTool（攻击工具）

关系字段（均必填非空）：

- **`directCauseRisks`**：直接造成的风险
- **`indirectSupportRisks`**：间接支持的风险
- **`avoidances`**：能限制该工具的规避手段

## ThreatActor（威胁行为者）

- **`buildAttackTools`**：自建的工具
- **`useAttackTools`**：使用的工具
- **`directCauseRisks`** / **`indirectSupportRisks`**：均必填非空

`buildAttackTools` 和 `useAttackTools` 区分「自建」与「使用」，是攻击路径推演的关键。

## Term（行业术语）

- **`category`**：自由字符串（如「数据采集」「业务欺诈」「黑产服务」），沿用已有取值
- **`aliases`**：别名数组
- **`usageExample`**：使用场景示例（必填），必须含 title 或 aliases 中至少一个词（前端高亮）
- 可维护 `relatedRisks` / `relatedAvoidances` / `relatedAttackTools` / `relatedThreatActors` / `relatedBusinessDomains`

## Case（典型案例）

- **不维护 `description`**（schema 已移除），事实性描述统一写入 `summary`（80–150 字）
- **`category`**：`criminal_verdict` / `administrative_enforcement` / `security_incident` / `vulnerability_advisory` / `academic_research` / `news_report`（存 key，中英文通过 locale 映射）
- **`incidentTime`**：事件时间
- **`relatedRisks`**：至少 1 个（必填）；`relatedAttackTools` / `relatedThreatActors` 可选
- Case 懒加载（1797+ 条），首页不加载，访问 `/cases` / 搜索 / 相关案例反查时才触发

## 关系字段语义

### 主关系（手维护，权威来源）

| 字段 | 所在实体 | 含义 |
|------|---------|------|
| `Risk.avoidances` | Risk → Avoidance | 缓解该风险的手段 |
| `AttackTool.directCauseRisks` | Tool → Risk | 工具直接造成的风险 |
| `AttackTool.indirectSupportRisks` | Tool → Risk | 工具间接支持的风险 |
| `AttackTool.avoidances` | Tool → Avoidance | 限制该工具的手段 |
| `ThreatActor.buildAttackTools` | Actor → Tool | 角色自建的工具 |
| `ThreatActor.useAttackTools` | Actor → Tool | 角色使用的工具 |
| `ThreatActor.directCauseRisks` / `indirectSupportRisks` | Actor → Risk | 角色造成的风险 |
| `Case.relatedRisks` 等 | Case → * | 案例涉及的实体（**仅 Case 侧维护**） |

### Risk.relatedRisks 关联类型

Risk 之间的关联（**手维护**，note 为手写说明，不由脚本自动重算）：

- **prerequisite**：前置风险——要先发生 A 才会触发 B
- **co-occurrence**：共现风险——A 和 B 常一起出现
- **escalation**：升级风险——A 会升级演变为 B
- **variant**：变体风险——B 是 A 的变种

### 横向关系（脚本自动维护）

`relatedAvoidances` / `relatedAttackTools` / `relatedThreatActors` 由 `npm run sync:lateral-relations` 基于主关系反推（共同覆盖的风险数、共同限制的工具数）自动生成，**不要手改，会被下次同步覆盖**。它们的变化不触发实体 `updated` 更新。

## 国际化（i18n）合并机制

中文源（`src/BREAK/`）是结构关系唯一数据源，英文翻译（`src/i18n/en/BREAK/`）只含可翻译文本字段。运行时 `mergeWithStructure(中文源, 英文翻译)` 合并：结构字段（ID 数组、`updated`、`category` key、`complexity` 枚举）从中文源取，文本字段从英文翻译取。

各实体英文翻译文件字段清单：

- **Avoidance 英文**：title, definition, description, limitation, references, keywords
- **Risk 英文**：title, definition, description, influence, references, keywords（`complexity` 不维护，已是英文枚举值运行时合并）
- **AttackTool 英文**：title, description, references, keywords
- **ThreatActor 英文**：title, description, references, keywords
- **Term 英文**：title, aliases, keywords, definition, description, usageExample, references, category（自由字符串需翻译）
- **Case 英文**：title, keywords, summary, references（`category` 存 key 不翻译）

## references 规范

`references` 是数组，元素**只允许 `title` 与合法 URL `link` 两个字段**（schema strict，多余字段会被拒）。`sourceType` 是运行时分级返回值，**不得写入实体数据**。每个实体至少 1 条引用，URL 应指向具体可访问页面（避免根域名 / 首页占位链接）。

## keywords 规范

- 中文实体 keywords 必须**逐字包含 title**（`data-integrity.test.ts` 强制校验）
- 不要把纯实体 ID（如 `R0222`）放入 keywords
- 英文 keywords 不得大小写意义上的重复、不得有中文残留、不得有模板化占位词
