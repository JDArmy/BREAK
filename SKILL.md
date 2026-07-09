---
name: break
description: BREAK 业务风险枚举与规避知识库 — 查询业务安全风险、规避手段、攻击工具、威胁行为者、行业术语和典型案例，或基于知识库回答业务安全问题
argument-hint: "[query] — 关键词、实体 ID（如 R0001）或安全问题描述"
arguments: [query]
allowed-tools: Bash
---

# BREAK 知识库 Skill

BREAK (Business Risk Enumeration & Avoidance Knowledge) 是一个开放的业务风险枚举与规避知识框架，包含 3363 条业务安全风险知识条目，涵盖以下实体类型：

| 类型 | 数量 | ID 格式 | 说明 |
|------|------|---------|------|
| Risk（风险） | 393 | R0001, R0001-001 | 业务安全风险定义和影响 |
| Avoidance（规避手段） | 344 | A0001, A0001-001 | 应对风险的防御措施 |
| AttackTool（攻击工具） | 120 | AT0001, AT0001-001 | 黑灰产使用的工具 |
| ThreatActor（威胁行为者） | 76 | TA0001, TA0001-001 | 实施攻击的人群 |
| Term（术语） | 624 | T0001 | 业务安全领域术语 |
| Case（案例） | 1782 | C0001 | 真实的安全事件案例 |
| BusinessDomain（业务域） | 20 | BD00 | 行业/业务域分类 |

维护说明：本 Skill 的调用方式保持不变，实体统计与知识库数据关系补强同步更新。

## 调用方式

使用 Bash 执行搜索脚本。脚本路径位于 skill 目录下的 `break_search.mjs`。

### 基本命令格式

```bash
node <skill_dir>/break_search.mjs "<query>" [options]
```

其中 `<skill_dir>` 为本 SKILL.md 所在的目录路径。

### 参数说明

| 参数 | 说明 |
|------|------|
| `<query>` | 必填。搜索关键词、实体 ID 或安全问题描述 |
| `--lang zh\|en` | 语言。默认自动检测：含中文字符→zh，否则→en |
| `--type <types>` | 逗号分隔的实体类型过滤（risks, avoidances, attackTools, threatActors, terms, cases） |
| `--limit N` | 每类型最大返回数，默认 5 |
| `--detail` | 详细模式，显示完整字段和关联关系 |

## 工作流程

收到 `$query` 后，按以下流程处理：

### 第一步：判断用户意图

1. **ID 查询**：`$query` 匹配实体 ID 格式（如 R0001、AT0034-001 等）→ 直接精确查询
2. **关键词查询**：`$query` 是简短的关键词或术语（如"验证码"、"DDoS"）→ 搜索模式
3. **问题咨询**：`$query` 是一段描述性问题（如"我们网站被爬虫爬了怎么办"）→ 问答模式

### 第二步：执行搜索

#### ID 查询

直接执行：
```bash
node <skill_dir>/break_search.mjs "<ID>" --lang zh
```

返回该条目的完整详情，包括关联关系展开。直接呈现给用户。

#### 关键词搜索

```bash
node <skill_dir>/break_search.mjs "<关键词>" --lang zh
```

如需限定范围：
```bash
node <skill_dir>/break_search.mjs "<关键词>" --type risks,avoidances --lang zh
```

将搜索结果整理后呈现给用户。

#### 问题咨询（核心场景）

这是最重要的使用模式。用户描述业务安全问题时：

**步骤 1：提取关键词**

从用户问题中提取 1~3 组搜索关键词。例如：
- "我们公司网站被爬虫爬了" → 关键词："爬虫"、"数据爬取"、"反爬"
- "用户账号总是被盗" → 关键词："账号盗用"、"撞库"、"凭证填充"
- "有人在我们平台薅羊毛" → 关键词："薅羊毛"、"营销欺诈"、"黑产"

**步骤 2：多轮搜索**

对每组关键词分别调用搜索脚本。可以多次调用：

```bash
# 第一轮：直接搜索问题关键词
node <skill_dir>/break_search.mjs "爬虫" --lang zh

# 第二轮：搜索相关风险和防御手段
node <skill_dir>/break_search.mjs "反爬" --type avoidances --lang zh

# 第三轮：如有需要，搜索其他相关领域
node <skill_dir>/break_search.mjs "数据泄露" --type risks,cases --lang zh
```

**步骤 3：深入查询**

从搜索结果中找到最相关的条目 ID，进行精确查询以获取详细信息：

```bash
# 查看爬虫风险的详情和关联规避手段
node <skill_dir>/break_search.mjs R0027 --lang zh

# 查看具体规避手段的详情
node <skill_dir>/break_search.mjs A0003 --lang zh
```

**步骤 4：综合回答**

基于所有检索到的知识，给出结构化回答：

```
## 问题分析

根据 BREAK 知识库，你描述的问题涉及以下风险：
- **[R0027] 爬虫风险**：...（引用定义和描述）
- **[R0027-001] xxx**：...

## 防御建议

针对上述风险，BREAK 推荐以下规避手段：
1. **[A0003] 云端反爬**：...（引用定义）
2. **[A0004] 频率限制**：...
3. ...

## 可能涉及的攻击工具

- **[AT0005] 爬虫工具**：...

## 相关案例

- **[C0xxx] xxx案例**：...

> 以上信息来源于 BREAK 知识库 (https://break.jd.army/)
```

## 重要原则

1. **永远先检索再回答**：不要凭记忆回答业务安全问题，必须通过搜索脚本查询 BREAK 知识库
2. **引用来源**：回答中必须标注具体的 BREAK 条目 ID（如 R0027、A0003）
3. **多次检索**：如果第一轮搜索结果不足或不够精确，换关键词再搜
4. **关系展开**：找到相关风险后，查看其 avoidances 字段获取防御手段；找到攻击工具后，查看其 directCauseRisks 字段了解关联风险
5. **中英文适配**：如果用户使用中文提问，用 `--lang zh` 检索并用中文回答；反之亦然

## 文档新鲜度门禁

当 `scripts/skill/` 搜索 / 打包脚本、导出的中英文数据包、实体字段 / 关系结构、Skill 调用参数或搜索结果格式发生变化时，必须同步更新 `SKILL.md` 与 `SKILL_en.md`。`npm run validate:docs-freshness` 已接入 `npm run validate:data`，会在相关变更缺少 Skill 文档更新时阻断。

数据治理改动也会影响 Skill 检索结果。修复 Case 的 `references` / `summary` 事实核验问题或调整 Risk 的 `avoidances` 关系时，应同步维护英文翻译文件，并确保前两条 Case references 尽量指向可抓取正文的稳定页面，避免 Skill 返回的案例事实无法被复核。

清理 Case 事实待办时，`summary` 只保留来源正文直接支撑的主体、时间、行为、处置和影响信息；抓取失败、仅有标题支撑或来源未覆盖的金额、数量、判决结果、监管措施等细节，应补充稳定来源后再保留，或收敛为更保守的事实表述。

补强高价值 Case references 时，优先查找执法机关、法院、检察院、监管机构、厂商公告等一手来源；若公开原始页面不可得，应使用可抓取的权威媒体、地方政法/公安频道或稳定转载交叉验证，并在 `summary` 中避免写入只有失效原文才支撑的细节。经检索确认原始来源不可得且已有多源支撑的项，可在待办吸纳清单中记录，不为满足门禁编造来源。

2026-07-09 的 Case P1 引用质量维护仅补强 C0066、C0130、C0248 的 references / summary 与英文翻译；未改变 Skill 调用参数、搜索字段、返回格式或实体结构。

Case 事实核验使用抓取正文送入 LLM。维护 `review-case-fact.mjs` 时需保证送审片段足够覆盖正文关键段落；大批量清理 P2 待办时按约 100 个改动设置 checkpoint，先跑 `validate:data` / `review:changed` 再提交，避免长时间积累未验证变更。

`review:should-extract` 会用全库实体 title、keywords、aliases 以及当前实体已引用关系识别已覆盖的候选实体；维护该脚本时，应保持重复抽取建议被降噪，避免 Skill 检索结果中出现语义重复的新增实体。

## 实体关系图谱

理解实体间的关联关系有助于给出更完整的回答：

```
ThreatActor（谁）
    ├── buildAttackTools → AttackTool（自建工具）
    ├── useAttackTools → AttackTool（使用工具）
    ├── directCauseRisks → Risk（直接造成的风险）
    └── indirectSupportRisks → Risk（间接支持的风险）

AttackTool（用什么工具）
    ├── directCauseRisks → Risk（直接造成的风险）
    ├── indirectSupportRisks → Risk（间接支持的风险）
    └── avoidances → Avoidance（可被什么手段规避）

Risk（什么风险）
    └── avoidances → Avoidance（如何规避）

Case（案例）
    ├── relatedRisks → Risk
    ├── relatedAttackTools → AttackTool
    └── relatedThreatActors → ThreatActor

Term（术语）
    └── related* → 所有其他实体类型

BusinessDomain（业务域）
    ├── riskDimensions → RiskScene（按业务风险域组织风险场景）
    └── riskScenes → Risk（场景下的风险列表；父风险可代表其子风险）
```
