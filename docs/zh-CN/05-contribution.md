---
title: 贡献与维护
category: 参考
order: 5
slug: contribution
---

# 贡献与维护

本文面向 BREAK 知识库的贡献者，讲清楚新增 / 修改实体要走哪些流程、过哪些质量门禁、遵循哪些规范。项目规则以仓库根目录 `CLAUDE.md` 为准，本文是精简版指南。

## 新增实体检查清单

新增一个实体条目（无论 Risk / Avoidance / AttackTool / ThreatActor / Term / Case），通用流程：

1. **确定 ID**：按 ID 格式分配下一个连续号（Risk 用 R + 4位，Avoidance 用 A + 4位，依此类推）。子实体用 `-` 连接父 ID。
2. **写中文源文件**：在 `src/BREAK/{entity}/{ID}.json` 创建，按 schema 填全必填字段。
3. **同步英文翻译**：在 `src/i18n/en/BREAK/{entity}/{ID}.json` 创建对应翻译文件，只含可翻译文本字段。
4. **维护关系**：如新增 Avoidance，必须被至少一个 Risk 或 AttackTool 的 `avoidances` 引用（否则校验阻断）。
5. **更新 `updated` 字段**：YYYY-MM-DD 当日日期。
6. **更新业务域**（仅 Risk）：在 `src/BREAK/business-domains/*.json` 的 `riskScenes[*].risks` 中加上新 Risk ID。若同一 Risk 需要跨多个业务域 / 风险场景复用，必须在 `scripts/validate/business-domains.mjs` 的跨挂理由表中补充明确原因。
7. **跑校验**：`npm run validate:data` 必须通过。
8. **跑评审**：`npm run review:changed` 确认无 fail。

## 新增实体类型（罕见）

如果需要新增第 7 种实体类型，要改 11 处（见 `CLAUDE.md`「新增实体类型检查清单」）：数据目录、`src/BREAK/index.ts`、`breakSchema.ts`、`entityRoute.ts`、`router/index.ts`、View 组件、`useSearch.ts`、`useEntityResolver.ts`、`autoLinkerCore.ts`、i18n 目录、验证脚本。一年新增 3+ 个时才考虑提取 Entity Registry 模式，当前手动维护成本可控。

## 三层质量门禁

实体质量门禁分三层，详见 `scripts/llm/README.md`：

### 第一层：A 类·机器强约束（接入 `validate:data`）

所有可枚举 / 可正则 / 可查表的规则，接入 `npm run validate:data`。阻断行为分两档：

- **error 阻断 build**：schema、i18n-sync、english-i18n-quality、keywords、check-entity-relations、relations、business-domains、require-references、avoidance-content、case-incident-time、admission、ui-i18n-keys、title-dedup、updated-sync-gate、content-quality、references 等。
- **review 不阻断**：id-continuity（跳号需人工确认）、entity-granularity（拆分信号需语义终判）、generic-phrase-blocklist（套话需人工判断）等，只产报告。

### 第二层：B 类·subagent 交叉判断（`review:*` 命令）

需要读实体实际内容做语义交叉的规则，用 subagent 加载已有实体交叉判断。命令包括 `review:risk-avoidance`、`review:case-relation`、`review:tool-risks`、`review:actor-consistency` 等。**fail 阻断、review 提示**。

`review:should-extract` 会把全库已有实体的 title、keywords、aliases 和当前实体已引用关系一起纳入上下文；如果建议抽取的概念已由现有实体覆盖，会自动降噪为已覆盖项，避免重复新增实体。脚本会把结构化 `new*` 建议对象归一到同一条可执行建议链路，避免 LLM 返回对象形态时出现空 review 噪声。

```bash
npm run review:changed                # 变更实体跑全套 B+C 类
npm run review:changed -- --base HEAD~1  # 对比上一次提交
```

### 第三层：C 类·LLM + 抓取（最小集）

不可机器化的规则：`review:case-fact`（网页抓取事实核验，Scrapingdog 优先，失败时使用带浏览器 UA、30 秒超时和中文页面编码识别的本地直连抓取）、`review:field-density`（信息密度）、`review:classification`（category 语义贴切）。

## 文档新鲜度门禁

`npm run validate:docs-freshness` 会检查当前工作区相对 `HEAD` 的变更，避免功能、数据模型或工具链已经变化而使用手册、README、Skill 文档没有同步更新。该门禁已接入 `npm run validate:data`。

需要推动 `docs/zh-CN/` 与 `docs/en/` 使用手册更新的典型变更包括：路由 / 菜单 / 页面组件、`KnowledgeSplitView`、搜索与实体解析 composable、`src/validation/` schema、Entity Registry、`DATA_SCHEMA.md`、`scripts/validate/*.mjs`、`package.json` 构建或校验脚本。

修改业务域归类校验时，尤其要同步说明跨业务域 / 跨风险场景复用的维护规则：跨挂不是多选标签，只有风险确实在多个行业或问题域复用时才添加，并给出可审计的跨挂理由。

2026-07-10 起，新增或调整 Risk / Avoidance 并影响业务域归类时，需要同步检查 `src/BREAK/business-domains/*.json` 中对应 `riskScenes[*].risks`，避免遗漏直接对应的行业场景或物理后果场景；若关系数组变化影响 Avoidance / AttackTool / ThreatActor 横向关系，应在提交前运行 `npm run sync:lateral-relations`。仅补充实体数据和场景归类、不改变维护流程时，同步 README / Skill 统计与本文说明即可。

需要推动 `README.md` 与 `README_CN.md` 更新的典型变更包括：公共命令、构建 / 发布门禁、CI 工作流、数据导出、STIX / JSON-LD / npm 数据包、Schema 文档、实体类型或基础信息。

修改 `review:*` 评审脚本时，需要在使用手册中说明评审口径变化；若影响公共命令、提交门禁或维护流程，也要同步 README。

`review:references` 会按实体内容、references 以及 Case `category` 生成缓存指纹。修改 Case 分类时，即使引用链接未变化，也会触发重新评审，避免从高价值 Case 降为普通 `news_report` 后继续复用旧的两源 / primary 要求判断。

需要推动 `SKILL.md` 与 `SKILL_en.md` 更新的典型变更包括：`scripts/skill/` 搜索或打包脚本、Skill 可消费的数据结构、实体字段 / 关系、导出的中英文数据包。

## 关键内容规范

### Avoidance 内容规范（由 `avoidance-content.mjs` 校验）

- **description** ≥ 40 字。AC02（感知）/ AC03（识别）必须命中检测信号词（采集端：采集/埋点/指纹/日志/流量；判定端：阈值/规则/模型/基线）。仅写「检测/识别」等自指词不达标。
- **limitation** 必填，≥ 30 字，不得占位套话。AC02/AC03 必须含「被绕过方式」（绕过/破解/伪造/模拟）或「误报场景」（误报/漏报/误判/误伤）。

### keywords 取舍

中文 keywords 必须逐字包含 title，补充常见搜法、别名、黑话、缩写。不要把纯实体 ID 充当关键词，不要把邻近概念硬塞进不相关实体。英文 keywords 优先真实检索短语，避免过宽泛词（security/risk/fraud 无差别扩散）和模板化占位词。

### references

数组元素只允许 `title` + 合法 URL `link`。URL 指向具体可访问页面，避免根域名 / 首页占位链接。框架首页占位链接（nist.gov/cyberframework 等 10 种）禁止用于新条目。

## 准入标准

新增条目须满足 `ADMISSION-STANDARD.md`：

- **占位首页禁令**：references 禁用 10 种框架首页占位链接
- **内容下限**：keywords ≥ 3（Term ≥ 4）、各文本字段长度下限（risk description ≥ 60 字、case summary ≥ 80 字）
- **高价值 Case 来源**：criminal_verdict 等 4 类需 ≥ 2 源且含 ≥ 1 primary 一手来源
- **退化保护**：历史条目豁免初始下限，但低于快照值仍报错

Case 的 `incidentTime` 默认必须为 2000 年及之后的真实事件时间；确有 NSA、法院、监管机构等一手来源支撑的高价值历史安全事件，不能为了通过门禁伪造现代日期，应在 `scripts/validate/case-incident-time.mjs` 的早年例外清单中显式登记并写明理由。

## 常用命令速查

```bash
npm run validate:data              # 全量数据校验（A 类机器强约束）
npm run validate:docs-freshness    # 检查使用手册 / README / Skill 是否随相关变更同步
npm run review:changed             # 变更实体跑 B+C 类评审
npm run sync:lateral-relations     # 重算 Avoidance/AttackTool/ThreatActor 横向关系
npm run sync:risk-assessment       # 重算 Risk 风险分级 priority
npm run audit:risk-case-coverage   # 审计 Risk-Case 覆盖（非阻断）
npm run audit:admission            # 准入标准巡检（仅报告不阻断）
npm run build                      # 完整发布门禁（lint→校验→测试→导出→构建→打包→审计）
```

## 版本与提交约定

- **每次 commit 前进行版本更新**：小变化补丁版本（2.42.40 → 2.42.41），较大变化次版本（→ 2.43.0），重大变化主版本（→ 3.0.0）。用 `npm run version:sync -- --bump=patch|minor|major --note="说明"`。
- **每次 commit 前执行 `npm run build`** 确保构建通过。
- **CHANGELOG 文件名必须全大写**：`CHANGELOG.md`。
- pre-commit 默认开启 `review:changed`（仅当有 `src/BREAK/*.json` 变更时跑），设 `BREAK_REVIEW_ON_COMMIT=0` 可临时跳过。

## 实体问题即时修复

执行任何任务过程中，一旦发现知识库实体存在描述错误、关联错误、字段不规范等问题（无论是否与当前任务直接相关），都要起一个 subagent 及时修复，不留到以后。这是贯穿所有任务的数据卫生原则。

涉及面广的同类问题（如一批实体 limitation 占位），按「Keywords 批处理规范」的分批模式派多个 subagent 并行处理。
