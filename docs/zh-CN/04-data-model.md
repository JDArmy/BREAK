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
| 风险（`Risk`） | `src/BREAK/risks/{ID}.json` | R + 4位（子风险用 `-` 连接） | `title`, `keywords`, `definition`, `description`, `influence`, `references` |
| 规避手段（`Avoidance`） | `src/BREAK/avoidances/{ID}.json` | A + 4位 | `title`, `keywords`, `definition`, `description`, `limitation`, `references` |
| 攻击工具（`AttackTool`） | `src/BREAK/attack-tools/{ID}.json` | AT + 4位 | `title`, `keywords`, `description`, `references` |
| 威胁行为者（`ThreatActor`） | `src/BREAK/threat-actors/{ID}.json` | TA + 4位 | `title`, `keywords`, `description`, `references` |
| 行业术语（`Term`） | `src/BREAK/terms/{ID}.json` | T + 4位 | `title`, `aliases`, `keywords`, `definition`, `description`, `usageExample`, `references` |
| 典型案例（`Case`） | `src/BREAK/cases/{ID}.json` | C + 4位 | `title`, `keywords`, `summary`, `references` |

子实体用 `-` 连接父 ID，如 `R0001-001` 是 R0001 的子风险。典型案例无子案例。

## 风险（`Risk`）

风险是核心实体。除通用字段外，特有字段：

- **`definition`**：一句话定义（必填）
- **`complexity`**：`basic` / `intermediate` / `advanced`（必填，**中文源存英文枚举值**，不写「初级/中级/高级」）
- **`influence`**：影响说明（必填）
- **`avoidances`**：能缓解该风险的规避手段 ID 数组（必填非空）
- **`relatedRisks`**：风险间语义关联（**手维护**，见下文关系类型）
- **`updated`**：YYYY-MM-DD，修改实质内容时必须同步更新

风险**不维护** `relatedBusinessDomains`——风险所属业务域以业务域（`BusinessDomain`）为权威，关系在 `src/BREAK/business-domains/*.json` 的 `riskScenes[*].risks` 中。

## 规避手段（`Avoidance`）

- **`category`**：`AC01`（防止）/ `AC02`（感知）/ `AC03`（识别）/ `AC04`（处置），必填
- **`effectiveness`**：`high` / `medium` / `low`，可选，表示有效性强度
- **`limitation`**：**必填**，中文 30-200 字、英文不超过 150 个单词，不得占位套话。AC02/AC03 必须含「被绕过方式」或「误报场景」
- **`description`**：≥40 字。AC02/AC03 必须命中检测信号词（采集/埋点/指纹/阈值/模型等）

横向关系字段 `relatedAvoidances` / `relatedAttackTools` / `relatedThreatActors` 由 `sync:lateral-relations` **自动维护**，不要手改。

## 攻击工具（`AttackTool`）

关系字段（均必填非空）：

- **`directCauseRisks`**：直接造成的风险
- **`indirectSupportRisks`**：间接支持的风险
- **`avoidances`**：能限制该工具的规避手段

## 威胁行为者（`ThreatActor`）

- **`buildAttackTools`**：自建的工具
- **`useAttackTools`**：使用的工具
- **`directCauseRisks`** / **`indirectSupportRisks`**：均必填非空

`buildAttackTools` 和 `useAttackTools` 区分「自建」与「使用」，是攻击路径推演的关键。

## 行业术语（`Term`）

- **`category`**：自由字符串（如「数据采集」「业务欺诈」「黑产服务」），沿用已有取值
- **`aliases`**：别名数组
- **`usageExample`**：使用场景示例（必填），必须含标题（`title`）或别名（`aliases`）中的至少一个词（前端高亮）
- 可维护 `relatedRisks` / `relatedAvoidances` / `relatedAttackTools` / `relatedThreatActors` / `relatedBusinessDomains`

## 典型案例（`Case`）

- **不维护 `description`**（数据结构已移除），事实性描述统一写入 `summary`（中文 80-300 字，英文不超过 180 个单词）
- **`category`**：`criminal_verdict` / `administrative_enforcement` / `security_incident` / `vulnerability_advisory` / `academic_research` / `news_report`（存储枚举键，中英文通过本地化映射展示）
- **`incidentTime`**：事件时间
- **`relatedRisks`**：至少 1 个（必填）；`relatedAttackTools` / `relatedThreatActors` 可选
- 典型案例懒加载（1781+ 条），首页不加载，访问 `/knowledges/case/list`、使用全局搜索或执行相关案例反查时才触发

## 关系字段语义

### 主关系（手维护，权威来源）

| 字段 | 所在实体 | 含义 |
|------|---------|------|
| `Risk.avoidances` | 风险 → 规避手段 | 缓解该风险的手段 |
| `AttackTool.directCauseRisks` | 攻击工具 → 风险 | 工具直接造成的风险 |
| `AttackTool.indirectSupportRisks` | 攻击工具 → 风险 | 工具间接支持的风险 |
| `AttackTool.avoidances` | 攻击工具 → 规避手段 | 限制该工具的手段 |
| `ThreatActor.buildAttackTools` | 威胁行为者 → 攻击工具 | 角色自建的工具 |
| `ThreatActor.useAttackTools` | 威胁行为者 → 攻击工具 | 角色使用的工具 |
| `ThreatActor.directCauseRisks` / `indirectSupportRisks` | 威胁行为者 → 风险 | 角色造成的风险 |
| `Case.relatedRisks` 等 | 典型案例 → 相关实体 | 案例涉及的实体（**仅典型案例侧维护**） |

### `Risk.relatedRisks` 关联类型

风险之间的关联（**手维护**，`note` 为手写说明，不由脚本自动重算）：

- **前置（`prerequisite`）**：要先发生 A 才会触发 B
- **共现（`co-occurrence`）**：A 和 B 常一起出现
- **升级（`escalation`）**：A 会升级演变为 B
- **变体（`variant`）**：B 是 A 的变种

### 横向关系（脚本自动维护）

`relatedAvoidances` / `relatedAttackTools` / `relatedThreatActors` 由 `npm run sync:lateral-relations` 基于主关系反推（共同覆盖的风险数、共同限制的工具数）自动生成，**不要手改，会被下次同步覆盖**。它们的变化不触发实体 `updated` 更新。

## 国际化（i18n）合并机制

中文源（`src/BREAK/`）是结构关系唯一数据源，英文翻译（`src/i18n/en/BREAK/`）只含可翻译文本字段。运行时 `mergeWithStructure(中文源, 英文翻译)` 合并：结构字段（ID 数组、`updated`、`category` key、`complexity` 枚举）从中文源取，文本字段从英文翻译取。

各实体英文翻译文件字段清单：

- **规避手段英文文件**：`title`, `definition`, `description`, `limitation`, `references`, `keywords`
- **风险英文文件**：`title`, `definition`, `description`, `influence`, `references`, `keywords`（不维护 `complexity`，该字段已是英文枚举值，由运行时合并）
- **攻击工具英文文件**：`title`, `description`, `references`, `keywords`
- **威胁行为者英文文件**：`title`, `description`, `references`, `keywords`
- **行业术语英文文件**：`title`, `aliases`, `keywords`, `definition`, `description`, `usageExample`, `references`, `category`（自由字符串需翻译）
- **典型案例英文文件**：`title`, `keywords`, `summary`, `references`（`category` 存枚举键，不翻译）

## 引用（`references`）规范

`references` 是数组，元素**只允许 `title` 与合法 URL `link` 两个字段**（严格数据结构会拒绝多余字段）。`sourceType` 是运行时分级返回值，**不得写入实体数据**。每个实体至少 1 条引用，URL 应指向具体可访问页面（避免根域名 / 首页占位链接）。

## 关键词（`keywords`）规范

- 中文实体的 `keywords` 必须**逐字包含 `title`**（`data-integrity.test.ts` 强制校验）
- 不要把纯实体 ID（如 `R0222`）放入 `keywords`
- 英文 `keywords` 不得大小写意义上的重复、不得有中文残留、不得有模板化占位词
