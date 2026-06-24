# BREAK 框架未完成升级计划

> 文档版本：2.2
> 修订日期：2026-06-24
> 范围：仅保留尚未收口或需要持续推进的升级项；既往阶段、验收记录和历史流水账不再维护在本文档中。
> 评估结论：BREAK 已具备较成熟的知识模型、关系可视化、数据校验和构建门禁。后续重点不是继续堆功能，而是收紧内容质量闭环，并把可视化从解释型推进到更强的推理型。

## 0. 当前未完成短板

1. **内容与引用治理仍需闭环**：review 152 + timeout 150 + connection_error 66 条问题链接仍需按域名策略分批复核；高价值案例 primary source 覆盖率为 53.20%（505 个缺口），其中 criminal_verdict 类仍是最大短板。
2. **可视化推理能力仍可深化**：缺少完整路径发现交互面板（算法已完成，UI 未实现）；业务场景图谱仅有影响分析模块，独立图谱未开发。

## 1. 执行原则

1. **先治理后扩展**：内容质量、引用健康、回归门禁优先于新增公开功能。
2. **公开页面只承载用户价值**：内部质量治理、弱来源、缺失覆盖等维护信号应进入审计脚本、报告或受控入口，不进入普通对外关系页。
3. **可量化验收**：每项任务都应落到脚本、测试、workflow、schema 或明确数据指标。
4. **渐进式 schema 变更**：新增字段优先可选，先试点再扩大，避免一次性破坏既有数据。
5. **保持数据源边界**：中文 `src/BREAK/` 是结构和关系唯一来源；英文 i18n 只维护可翻译文本。
6. **每个任务独立交付**：尽量拆成可单独 review、验证和回滚的小 PR。

## 2. 未完成任务

### P0. 内容质量与审计闭环

#### P0-1. 引用健康持续治理

目标：把引用健康从”能检测”推进到”能持续治理、少噪声、可追踪”。

已完成：工具链已闭环（`references-health.mjs` → `reference-domain-plan.mjs` → `check-403-with-browser.mjs` → `link-check.yml`），92 个域名已分 P0/P1/P2 三级，broken=0，5 个 npm 审计命令形成完整链路。

未完成工作：
- review 152 + timeout 150 + connection_error 66 条问题链接，按 `reference-domain-plan` 的域名策略分批复核，优先 P1 域名（dl.acm.org 61、mp.weixin.qq.com 39、cisa.gov 32、mps.gov.cn 23、chinacourt.org 21）。
- 继续处理剩余 `mps.gov.cn` 521 链接；剩余 7 条因未找到高置信替代源继续保留复核队列。
- 对 `justice.gov`、`moj.gov.cn` 等 connection_error 域名保留复测记录，避免重复误报。

落点：`research/search-reports/reference-health.*`、`src/BREAK/*/.*json`。

验收：
- review/timeout/connection_error 按域名策略分批收敛，关键 P1 域名有处理记录或复测结论。

#### P0-2. 高价值案例 primary source 补强

目标：让核心案例优先具备可信 primary source，避免用全量多源率作为低收益 KPI。

已完成：审计工具链已建成（`case-source-quality.mjs`），可按类别统计高价值案例 primary 覆盖率；当前全量覆盖率 50.58%，高价值覆盖率 53.20%，并已将 `view.inews.qq.com` 归入 secondary 来源以减少 unknown 噪声。

未完成工作：
- 高价值 1,079 案例中 505 个缺 primary source。按类别分批补源：
  - `criminal_verdict`：38.90%（366 个缺口，最大短板），优先法院、检察院、公安、监管通报。
  - `administrative_enforcement`：45.96%（87 个缺口），优先各级市场监管局、网信办官网。
  - `news_report`：13.40%（349 个缺口），价值相对低，按需处理。
  - `security_incident`：79.76%，`academic_research`：89.21%，`vulnerability_advisory`：97.01% — 已较好。
- 下一批继续处理 `C0027`、`C0034` 以及审计队列中仍缺 primary 的司法/执法案例；`C0130`、`C0179`、`C0188`、`C0191`、`C0211`、`C0217`、`C0218`、`C0261` 已复核但暂未找到高置信同案 primary，不硬补。
- 补源时同步英文 references title，保持英文 i18n 不写结构字段。

落点：`scripts/validate/case-source-quality.mjs`、`src/BREAK/cases/*.json`、`src/i18n/en/BREAK/cases/*.json`。

验收：
- 高价值案例 primary 覆盖率持续提升。
- `secondary_only`、`weak_source`、`unknown_only` 可追踪。
- 修改数据后 `npm run validate:data` 通过。

### P2. 可视化推理与标准化

#### P2-1. 完整路径发现交互面板

目标：把已有路径发现能力从内部摘要升级为用户可操作的分析工具。

已完成：`relationPathDiscovery.ts`（BFS 路径发现算法）、`relationGraphInsights.ts`（图谱洞察分析）已实现。路径展示目前由 `RelationAnalysisPathColumn.vue` 承载。

未完成工作：
- 新增 `RelationPathExplorer.vue` 独立路径发现面板，支持选择任意起止节点。
- 支持最大跳数、最大路径数、方向图/无向图、排序策略等参数的 UI 控件。
- 在 UI 中展示完整多路径列表，并能定位或高亮对应路径。

落点：`src/components/relation/RelationPathExplorer.vue`、`src/views/relation/relationPathDiscovery.ts`、`src/views/relation/relationGraphInsights.ts`。

验收：
- 用户能发现任意两节点路径。
- 路径列表稳定排序，节点和边可回到图上定位。
- 不破坏现有预定义攻击路径。

#### P2-5. 业务场景图谱

目标：从 BusinessScene/RiskScene 进入解释型关系图谱。本项价值低于前述任务，作为可选探索。

已完成：`relationBusinessSceneImpact.ts`（8.5KB 商业场景影响分析模块）已实现。BusinessScene 详情路由 `/business-scene/:bsKey` 已有。

未完成工作：
- 新增 `relationBusinessSceneGraph.ts` 业务场景图谱构建模块。
- 支持 BusinessScene → RiskDimension → RiskScene → Risk → AttackTool/Avoidance 的解释型展示。
- 保持 BusinessScene 中文结构文件为权威来源，不在 Risk 实体新增 relatedBusinessScenes。

落点：`src/views/relation/relationBusinessSceneGraph.ts`、`src/views/relation/relationGraphBuilder.ts`、`src/views/relation/relationTypes.ts`、`src/router/index.ts`。

验收：
- 可从业务场景进入对应风险图谱。
- 图谱能解释该场景的主要风险暴露面。
- 有专门测试覆盖业务场景关系构建。

## 3. 优先级建议

| 项 | 优先级 | 估算 | 主要收益 |
|---|---|---:|---|
| P0-1 引用健康持续治理 | P0 | 2-4 天 | 收敛问题链接 |
| P0-2 高价值案例 primary source 补强 | P0 | 4-6 天 | 提升核心案例可信度 |
| P2-1 完整路径发现交互面板 | P2 | 2-3 天 | 强化推理型分析 |
| P2-5 业务场景图谱 | P2 可选 | 4-5 天 | 场景入口增强 |

推荐顺序：
1. 先继续做 P0-1、P0-2，收紧内容质量和引用可信度。
2. 最后按外部需求选择 P2 项。

## 4. 整体验收标准

| 维度 | 目标 |
|---|---|
| 引用健康 | review/timeout/connection_error 有分域名复核策略，按治理计划分批收敛 |
| 案例来源 | 高价值案例 primary 覆盖率可统计并持续提升；弱来源可追踪 |
| 路径发现 | 任意起止节点路径发现有完整交互 |
| 公开关系页 | 不暴露内部质量治理入口 |

工程验收不可回退：
- `npm run type-check` 通过。
- `npm run validate:data` 通过。
- `npm run test:coverage` 通过。
- `npm run build` 通过。
- 涉及 `src/BREAK/` 数据修改时同步英文 i18n。
- commit 前按项目规则更新版本和 CHANGELOG。

## 5. 风险与约束

| 风险 | 说明 | 应对 |
|---|---|---|
| 高价值案例补源工作量大 | primary source 需要逐条核实 | 按类别和来源等级分批；搜索或 LLM 只作候选，最终人工确认 |
| 外部链接长期失效 | 永久 broken=0 不现实 | 按来源等级和案例价值维护，接受普通长尾链接进入待复核 |

## 6. 维护规则

- 本文件只记录未完成项。任务完成后，应从本文移除，必要时把结果写入 `CHANGELOG.md` 或对应技术文档。
- 不再保留阶段性收口记录、验收记录这类历史段落。
- 如果某项范围发生变化，应直接更新目标、落点和验收标准，而不是追加历史说明。
- 每次版本更新或大任务完成后，重新检查本文是否仍只包含未完成工作。
