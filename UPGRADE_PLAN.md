# BREAK 框架未完成升级计划

> 文档版本：2.1
> 修订日期：2026-06-24
> 范围：仅保留尚未收口或需要持续推进的升级项；既往阶段、验收记录和历史流水账不再维护在本文档中。
> 评估结论：BREAK 已具备较成熟的知识模型、关系可视化、数据校验和构建门禁。后续重点不是继续堆功能，而是收紧内容质量闭环、补齐知识模型短板、降低关系页工程复杂度，并把可视化从解释型推进到更强的推理型。

## 0. 当前未完成短板

1. **内容与引用治理仍需闭环**：review、timeout、connection_error 仍需按域名和来源价值分批复核；高价值案例的 primary source 覆盖率仍偏低，需要继续补强。
2. **回归测试深度仍需继续补齐**：后续重点是继续观察 CI 耗时、稳定性和视觉 warning 噪声，并补关键交互组件、控制器和复杂关系分支测试。
3. **质量治理应留在审计链路**：后续重点是按质量报告分批治理引用健康、案例来源等级、字段级 i18n 和弱来源问题，不在公开关系页暴露“质量治理”入口。
4. **关系页工程债偏重**：路径、解释、Sankey、覆盖、过滤等逻辑仍需继续拆分；后续重点转向分析面板、节点关系抽屉和覆盖分析 helper 的小步拆分。
5. **可视化推理能力仍可深化**：缺少完整路径发现交互面板、大图截图/性能基线、攻击路径步骤级 method/action 解释。

## 1. 执行原则

1. **先治理后扩展**：内容质量、引用健康、回归门禁优先于新增公开功能。
2. **公开页面只承载用户价值**：内部质量治理、弱来源、缺失覆盖等维护信号应进入审计脚本、报告或受控入口，不进入普通对外关系页。
3. **可量化验收**：每项任务都应落到脚本、测试、workflow、schema 或明确数据指标。
4. **渐进式 schema 变更**：新增字段优先可选，先试点再扩大，避免一次性破坏既有数据。
5. **保持数据源边界**：中文 `src/BREAK/` 是结构和关系唯一来源；英文 i18n 只维护可翻译文本。
6. **每个任务独立交付**：尽量拆成可单独 review、验证和回滚的小 PR。

## 2. 未完成任务

### P0. 内容质量与审计闭环

#### P0-1. 引用健康复核与 link-check 去重

目标：把引用健康从“能检测”推进到“能持续治理、少噪声、可追踪”。

未完成工作：
- 基于 `reference-health.domainGroups` 按策略分批处理 review、timeout、connection_error，优先官方源、高价值案例和 primary source。
- 对 `manual_review_preserve`、`retry_with_long_timeout_preserve`、`replace_or_add_primary` 等策略建立固定处理流程，减少误报和重复复核成本。
- 继续处理剩余 `mps.gov.cn` 521 链接；剩余 7 条因未找到高置信替代源继续保留复核队列。
- 对 `justice.gov`、`moj.gov.cn` 等 connection_error 域名保留复测记录，避免重复误报。

落点：`.github/workflows/link-check.yml`、`scripts/validate/references-health.mjs`、`scripts/validate/reference-domain-plan.mjs`、`research/search-reports/reference-health.*`。

验收：
- `npm run audit:reference-domain-plan` 可生成 P1/P2 域名治理批次。
- review/timeout/connection_error 按域名策略分批收敛，关键 P1 域名有处理记录或复测结论。

#### P0-2. 高价值案例 primary source 补强

目标：让核心案例优先具备可信 primary source，避免用全量多源率作为低收益 KPI。

未完成工作：
- 基于 `npm run audit:case-source-quality` 输出的高价值清单，按类别分批补 primary source。
- `criminal_verdict` 优先法院、检察院、公安、监管通报；`security_incident` 优先厂商公告、官方通报、链上分析；`vulnerability_advisory` 优先 CVE/NVD、厂商安全公告、论文或原始仓库。
- 对只有 secondary、weak、unknown 来源的高价值案例进入复核队列；下一批继续处理 `C0027`、`C0034`、`C0120`、`C0211`、`C0239` 以及审计队列中仍缺 official source 的司法/执法案例和可由厂商、CERT、NVD、原始研究补强的安全事件；未找到同案 primary 或官方链接无法稳定核验时不使用相似案例硬补。
- 补源时同步英文 references title，保持英文 i18n 不写结构字段。

落点：`scripts/validate/case-source-quality.mjs`、`src/BREAK/cases/*.json`、`src/i18n/en/BREAK/cases/*.json`。

验收：
- 高价值案例 primary 覆盖率可持续统计。
- `secondary_only`、`weak_source`、`unknown_only` 可追踪。
- 修改数据后 `npm run validate:data` 通过。

### P1. 知识模型与工程债

#### P1-1. 测试覆盖与视觉巡检噪声治理

目标：在回归门禁已 hard fail 的基础上，继续提升高风险页面和交互的测试深度，降低视觉巡检 warning 的人工复核成本。

未完成工作：
- 继续补关键交互组件分支，再评估继续上调 coverage 阈值。
- 继续处理 `site-visual-review` 未知 warning，并把真实布局问题转为阻断项。
- 继续观察 hard-fail 浏览器 job 的耗时和偶发失败，再决定是否拆分缓存或复用 workflow。

落点：`vitest.config.ts`、`src/views/**/__tests__`、`src/components/**/__tests__`、`scripts/validate/site-visual-review.mjs`。

验收：
- 关键页面组合入口和高风险交互有稳定单测或浏览器巡检覆盖。
- 视觉巡检 warning 有分类处置或明确允许名单，未知 warning 数量持续收敛。
- coverage 阈值随实际覆盖提升逐步上调，且 `npm run test:coverage` 稳定通过。
- CI 浏览器类 job 有明确超时上限，避免长时间挂死。

#### P1-2. CI workflow 优化

目标：减少重复校验、提升 CI 反馈速度。

未完成工作：
- 后续观察 GitHub Actions 实际耗时和 artifact 传输成本；如瓶颈仍明显，再评估 composite action 或 reusable workflow 收敛 `checkout/setup-node/npm ci/playwright install/download artifact` 公共步骤。

落点：`.github/workflows/ci.yml`、`.github/workflows/deploy.yml`、`.github/workflows/link-check.yml`。

验收：
- CI 总耗时和 Playwright 安装耗时在后续 PR 中可观察。
- ci/deploy 重复步骤继续减少。

#### P1-3. 关系页工程债治理

目标：把关系页从“功能已可用但大文件耦合重”推进到“核心分析逻辑有测试保护、控制器职责清晰、组件可小步维护”的状态。

未完成工作：
- `RelationAnalysisPane.vue`：展示 contract 测试已覆盖空态、覆盖分析、专项洞察、路径摘要、筛选、移动端展开折叠和详情事件转发；后续拆出覆盖卡片、专项洞察区、路径摘要区等子组件，并保持现有 contract 不回退。
- `RelationNodeDrawerRelations.vue`：主要展示状态、空状态、跳转事件、可点击 ID、多实体类型组合、筛选和增量展开折叠 contract 测试已覆盖；后续拆分关系分组渲染和节点跳转控制，并保持现有 contract 不回退。
- `relationCoverageAnalysis.ts`：已抽出节点 item builder、规避手段排序、洞察 section builder、跨实体反查 helper 和 risk/avoidance/tool/actor coverage builder；后续继续拆出 special insight builder，并保持现有测试不回退。
- `relationGraphBuilder.ts`：覆盖已稳定后，评估是否抽出实体分发/请求分发 helper，并保持现有测试不回退。
- 继续用 `npm run test:coverage` 观察关系目录覆盖率和分支覆盖率；只有在分支余量稳定后再继续上调全局 coverage 阈值。

落点：`src/views/relation/relationGraphBuilder.ts`、`src/views/relation/relationNetworkChartController.ts`、`src/views/relation/relationSankeyChartController.ts`、`src/views/relation/relationCoverageAnalysis.ts`、`src/components/relation/RelationAnalysisPane.vue`、`src/components/relation/RelationNodeDrawerRelations.vue`、对应 `__tests__`。

验收：
- `relationGraphBuilder`、网络图控制器、Sankey 控制器的关键分支均有单测覆盖，`npm run test:coverage` 在 72% 全局阈值下稳定通过。
- `RelationAnalysisPane` 和 `RelationNodeDrawerRelations` 已覆盖主要展示状态、空状态和交互事件；后续拆分不降低现有 contract 覆盖。
- 拆分后的子模块保持纯函数或窄组件输入输出，关系页 URL、节点选择、筛选、图表渲染和抽屉交互不回退。
- 关系目录覆盖率不低于当前水平，新增拆分不降低全局 coverage 阈值。

#### P1-4. 任务型分析视角切换

目标：从单一实体中心图升级为面向任务的分析入口。

未完成工作：
- 在 RelationSelectorBar 或合适位置增加视角切换控件。
- 至少支持风险视角、攻击路径视角、防御覆盖视角。
- 每个视角定义默认节点类型、关系类型、布局和说明模板。
- “薄弱关系”类维护信号如要展示，必须放在内部或受控入口，不作为公开默认视角。

落点：`src/components/relation/RelationSelectorBar.vue`、`src/components/relation/RelationFilterPanels.vue`、`src/views/relation/useRelationViewModel.ts`、`src/views/relation/relationViewState.ts`。

验收：
- 至少 3 个任务型视角可切换。
- 视角切换不破坏 URL 路由、实体跳转和现有筛选。
- 公开页面不暴露内部质量治理视角。

### P2. 可视化推理与标准化

#### P2-1. 完整路径发现交互面板

目标：把已有路径发现能力从内部摘要升级为用户可操作的分析工具。

未完成工作：
- 新增路径发现面板，支持选择任意起止节点。
- 支持最大跳数、最大路径数、方向图/无向图、排序策略等参数。
- 在 UI 中展示完整多路径列表，并能定位或高亮对应路径。

落点：`src/views/relation/relationPathDiscovery.ts`、`src/views/relation/relationGraphInsights.ts`、`src/components/relation/RelationPathExplorer.vue`。

验收：
- 用户能发现任意两节点路径。
- 路径列表稳定排序，节点和边可回到图上定位。
- 不破坏现有预定义攻击路径。

#### P2-2. 大图性能与截图基线

目标：为大规模关系图建立可持续的性能和视觉回归基线。

未完成工作：
- 基于 relation-stability/performance 脚本补充大图场景。
- 增加关键布局截图基线或截图对比流程。
- 明确大图默认策略，例如节点上限、按需加载、默认筛选或布局降级。

落点：`scripts/audit/relation-stability*.mjs`、`scripts/audit/site-performance*.mjs`、`src/views/relation/relationNetworkLayout.ts`、`src/views/relation/relationNetworkChartController.ts`。

验收：
- 大图场景有稳定性能预算。
- 布局关键状态可截图对比。
- 大图默认策略有代码和测试约束。

#### P2-3. 攻击路径步骤级 method/action 解释

目标：从“某实体与某实体存在关系”推进到“通过何种手法造成何种风险”的解释。

未完成工作：
- 从 AttackTool、Risk、Avoidance 描述和关键词中提取 method/action 候选。
- 将攻击路径的 attackIntent、defensiveMeaning 升级为实体语义驱动。
- 保持解释可回溯到实体 ID、标题、字段和关系类型，避免生成不可追溯的推断。

落点：`src/views/relation/relationAttackPath*.ts`、`src/views/relation/relationExplanation.ts`、`src/i18n/**`。

验收：
- 攻击路径步骤解释包含具体 method/action。
- 中英文解释同步。
- 解释来源可追溯，不引入无依据推断。

#### P2-5. 业务场景图谱

目标：从 BusinessScene/RiskScene 进入解释型关系图谱。本项价值低于前述任务，作为可选探索。

未完成工作：
- 新增业务场景图谱构建模块。
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
| P0-1 引用健康复核与 link-check 去重 | P0 | 2-4 天 | 降低坏链与 CI 噪声 |
| P0-2 高价值案例 primary source 补强 | P0 | 4-6 天 | 提升核心案例可信度 |
| P1-1 测试覆盖与视觉巡检噪声治理 | P1 | 2-3 天 | 降低 UI/关系页回归和人工复核成本 |
| P1-2 CI workflow 优化 | P1 | 1 天 | 提升反馈速度 |
| P1-3 关系页工程债治理 | P1 | 3-5 天 | 降低关系页拆分和交互回归风险 |
| P1-4 任务型分析视角切换 | P1 | 3-4 天 | 提升关系页分析效率 |
| P2-1 完整路径发现交互面板 | P2 | 2-3 天 | 强化推理型分析 |
| P2-2 大图性能与截图基线 | P2 | 1-2 天 | 降低可视化回归风险 |
| P2-3 攻击路径步骤级解释 | P2 | 2-3 天 | 提升解释可信度 |
| P2-5 业务场景图谱 | P2 可选 | 4-5 天 | 场景入口增强 |

推荐顺序：
1. 先继续做 P0-1、P0-2，收紧内容质量和引用可信度。
2. 同步推进 P1-1、P1-2，降低回归噪声和 CI 维护成本。
3. 然后推进 P1-3，先稳住关系页工程债和测试保护。
4. 在 P1-3 稳定后推进 P1-4，补齐关系页分析方式。
5. 最后按外部需求选择 P2 项。

## 4. 整体验收标准

| 维度 | 目标 |
|---|---|
| 引用健康 | link-check Issue 去重；review/timeout/connection_error 有分域名复核策略 |
| 案例来源 | 高价值案例 primary 覆盖率可统计并持续提升；弱来源可追踪 |
| 回归门禁 | 浏览器 smoke、关系稳定性、Lighthouse、性能和视觉巡检均为 PR hard fail；关系页核心逻辑有测试覆盖 |
| 质量报告 | `audit:quality-report` 覆盖引用、案例来源、i18n、弱关系等治理维度，并进入静态数据与 npm 包校验 |
| 公开关系页 | 不暴露内部质量治理入口 |
| 关系页工程 | 继续小步拆分分析面板、节点关系抽屉和覆盖分析 helper，并保持现有测试 contract 不回退 |
| CI | PR 旧 run 可取消；重复 workflow 明显减少 |
| 任务型视角 | 至少支持风险、攻击路径、防御覆盖 3 个视角 |
| 路径发现 | 任意起止节点路径发现有完整交互 |
| 大图稳定性 | 有性能预算和截图基线 |
| 动态解释 | 攻击路径步骤解释包含可追溯 method/action |

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
| 浏览器回归抖动 | e2e、Lighthouse、截图都可能不稳定 | hard fail 后持续观察耗时和噪声，真实问题修复，误报进入明确允许名单 |
| schema 变更影响面大 | 后续 version 等字段仍会涉及数据和校验 | 可选字段先行，试点后再扩大 |
| 关系页拆分引入回归 | 大文件拆分容易改变行为 | 先补测试，再小步拆分 |
| 可视化算法性能 | 路径发现和大图布局可能耗时 | 限定跳数、节点数和默认筛选，按需计算 |

## 6. 维护规则

- 本文件只记录未完成项。任务完成后，应从本文移除，必要时把结果写入 `CHANGELOG.md` 或对应技术文档。
- 不再保留阶段性收口记录、验收记录这类历史段落。
- 如果某项范围发生变化，应直接更新目标、落点和验收标准，而不是追加历史说明。
- 每次版本更新或大任务完成后，重新检查本文是否仍只包含未完成工作。
