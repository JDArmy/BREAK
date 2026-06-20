# BREAK 可视化分析解释能力工作规划（未完成待办）

> 文档版本：2.0（精简为仅未完成项）
> 核查时间：2026-06-20，对应代码版本 2.21.0
> 适用范围：质量治理、任务型分析视角、业务场景图谱、性能治理、截图基线
> 已落地能力不在此列：边关系解释、攻击路径逐段解释、节点分析摘要、防御覆盖分析、业务场景影响摘要、抽屉子组件拆分、英文 i18n 质量校验均已实现并测试覆盖

## 0. 核查结论

经逐项代码核查（非文档自评），以下能力在当前代码版本中**尚未实现或仅部分实现**，列为后续待办。已完成项（边解释 `relationExplanation.ts`、攻击路径解释 `relationAttackPath.ts`、防御覆盖 `relationCoverageAnalysis.ts`、业务场景影响 `relationBusinessSceneImpact.ts`、节点洞察 `relationGraphInsights.ts` 及对应测试）不再纳入本规划。

| # | 规划项 | 状态 | 关键缺口 |
|---|--------|------|----------|
| 1 | 质量治理前端视图 | ❌ 未实现 | 无质量列表组件、无"仅看 X"筛选、无从列表定位图谱节点、无五种稳定质量标记体系 |
| 2 | 任务型分析视角切换 | ❌ 未实现 | RelationSelectorBar 无视角控件、viewModel/state 无 perspective 概念、src 内 0 处视角切换代码 |
| 3 | 业务场景图谱 | ❌ 未实现 | 无 `relationBusinessSceneGraph.ts` 及测试、builder 无 businessScene 分支、无 `/relation/business-scene/:key` 路由、首页矩阵不进关系页 |
| 4 | 前端可消费质量报告 JSON | ❌ 未实现 | `public/data` 无质量 JSON；审计 JSON 在 `research/search-reports` 不被前端 import；schema 缺 missingCoverage/i18nIssues |
| 5 | 节点详情质量提示补全 | ⚠️ 部分 | 缺"缺引用"维度、"弱关系"未节点级化、不消费审计报告（仅运行时推导） |
| 6 | 关系页首屏性能专项 | ⚠️ 部分 | 英文 BREAK 整包懒加载但内部 eager 不分片；无独立关系页截图/性能基线文档 |
| 7 | 截图基线与交互回归 | ⚠️ 部分 | 缺独立截图基线文档，抽屉/tooltip/筛选/三栏/移动端布局未固化 Playwright 截图基线 |

## 1. 背景与目标

BREAK 关系页已完成"关系可见 + 关系可解释"阶段：网络图、Sankey 攻击路径、边关系解释、路径逐段解释、节点分析摘要、防御覆盖、业务场景影响均已落地。

下一阶段目标是把可视化分析从"解释型"升级为"可治理、可定位、可分视角"：

- 质量治理闭环：审计脚本发现的问题能直接在前端定位到节点和关系。
- 任务型视角：从单一实体中心图升级为面向任务的分析视角（风险/攻击者/防御/薄弱关系）。
- 业务场景图谱：从 BusinessScene / RiskScene 出发的解释型关系图谱。
- 性能可控：关系页首屏和语言切换不因英文 BREAK 全量翻译加载而明显变慢。

## 2. 设计原则（沿用）

1. 解释优先于堆图表：每个新视图必须回答一个具体分析问题。
2. 数据可追溯：所有解释必须能回到现有 JSON 字段、实体关系、审计脚本结果或明确推导规则。
3. 不伪造置信度：使用 direct / indirect / inferred / review 离散标签，不用精确分数。
4. 先复用现有数据模型：优先基于现有字段推导，不急于扩展 Schema。
5. 分析结果可测试：路径生成、关系解释、覆盖判断沉淀为纯函数并配套单测。
6. 中英文同步：所有新增 UI 文案、解释模板同步维护 i18n。

## 3. 未完成功能规划

### 3.1 P0：前端可消费质量报告 JSON

> 当前状态：❌ 未实现。`public/data/` 仅有 break-data.json / break-manifest.json；审计脚本（metrics/relations/references/maintenance）的 JSON 输出在 `research/search-reports/`，仅供人读，前端零 import。metrics-baseline.json 有 weakRelations/sceneIssues 但缺 missingCoverage/i18nIssues；maintenance-summary.json 是任务列表形态，非四分类稳定契约。

目标：将 `audit:relations`、`audit:metrics`、`audit:maintenance` 的关键问题转为稳定 JSON，供关系页高亮和列表消费。

工作内容：

- 新增脚本生成 `public/data/quality-report.json`（或纳入 export:data），结构：
  ```json
  {
    "weakRelations": [],
    "missingCoverage": [],
    "sceneIssues": [],
    "i18nIssues": [],
    "generatedAt": "2026-06-20"
  }
  ```
- 前端只消费报告结果，不在运行时重新执行重型审计逻辑。
- 报告生成纳入 build 链（export:data 阶段），CI 部署时刷新。

落点：

- `scripts/validate/`（新增质量报告生成脚本或扩展 metrics.mjs/maintenance.mjs 输出前端契约 JSON）
- `public/data/quality-report.json`（生成产物）
- `src/views/relation/`（消费方）

验收标准：

- `public/data/quality-report.json` 含四分类稳定结构。
- 前端可 import 并用于节点/边标记和列表。
- 报告随数据变化自动刷新（build 链或 CI）。

### 3.2 P1：质量治理前端视图

> 当前状态：❌ 未实现。无质量治理组件、无质量问题状态、无"仅看 X"筛选、无从列表定位图谱节点。节点级有零散覆盖缺口提示（RelationNodeCoverageBlock），但非计划要求的列表视图 + 图谱定位。

目标：让维护者在可视化页面直接看到数据质量问题，并定位到图谱节点/关系。

工作内容：

- 新增质量治理列表组件（如 RelationQualityPanel），展示弱关系、缺覆盖、场景异常、i18n 异常。
- 前端加载质量报告 JSON（依赖 3.1）后，在图谱中标记相关节点和边。
- 增加"仅看待复核关系""仅看缺覆盖风险""仅看场景异常""仅看 i18n 异常"筛选。
- 节点详情中显示质量提示和建议动作。
- 支持从问题列表点击定位到图谱节点/关系边/分析解读详情。

质量标记体系（统一稳定 key）：

| 标记 | 含义 |
|------|------|
| `missingRelation` | 缺少关键关系 |
| `weakRelation` | 关系覆盖不足或仅有弱推导 |
| `missingAvoidance` | 风险缺少规避覆盖 |
| `sceneIssue` | 业务场景或风险场景分类异常 |
| `i18nIssue` | 中英文结构或文案同步异常 |

落点：

- `src/components/relation/`（新增 RelationQualityPanel / RelationIssueList）
- `src/views/relation/relationViewState.ts`（质量问题状态）
- `src/views/relation/useRelationViewModel.ts`（质量筛选逻辑）
- `src/components/relation/RelationFilterPanels.vue`（"仅看 X"筛选）
- `src/components/relation/RelationNodeDetailDrawer.vue`（节点质量提示）

验收标准：

- 审计报告可被前端消费（依赖 3.1）。
- 质量问题可从列表定位到图谱节点。
- 质量标记不影响普通浏览体验。
- 五种质量标记作为统一 key 在节点/边展示。

### 3.3 P1：任务型分析视角切换

> 当前状态：❌ 未实现。RelationSelectorBar 只有关系类型下拉和实体 key 下拉，无视角切换；viewModel/state 无 perspective 概念；src 内 0 处视角切换代码（grep "perspective|视角" 仅命中内容数据文案）。

目标：从单一实体中心图，升级为面向任务的分析视角。

建议视角：

| 视角 | 入口问题 | 展示重点 |
|------|----------|----------|
| 风险视角 | 这个风险从哪里来，如何缓解？ | Risk、AttackTool、ThreatActor、Avoidance |
| 攻击者视角 | 这个攻击者怎么行动？ | ThreatActor、use/build 工具、造成风险 |
| 业务场景视角 | 这个场景暴露哪些风险？ | BusinessScene、RiskScene、Risk、Avoidance |
| 防御视角 | 这个规避措施覆盖了什么？ | Avoidance、Risk、AttackTool、覆盖缺口 |
| 薄弱关系视角 | 哪些关系需要维护？ | weak relation、missing coverage、review flags |

工作内容：

- 在 RelationSelectorBar 增加视角切换控件。
- 每个视角定义默认节点类型、默认关系类型、默认布局和解释模板。
- 将质量报告（3.1）和 audit:metrics/relations 关键结果转成前端可消费数据。
- 对薄弱关系视角提供列表 + 图谱高亮。

落点：

- `src/components/relation/RelationSelectorBar.vue`
- `src/components/relation/RelationFilterPanels.vue`
- `src/views/relation/useRelationViewModel.ts`
- `src/views/relation/relationViewState.ts`
- `scripts/validate/metrics.mjs`
- `public/data/quality-report.json`（3.1 产物）

验收标准：

- 用户可选择至少 3 个分析视角：风险、攻击路径、防御覆盖。
- 不同视角有不同默认筛选和说明。
- 视角切换不破坏现有 URL 路由和实体跳转。

### 3.4 P1：业务场景图谱

> 当前状态：❌ 未实现。无 `relationBusinessSceneGraph.ts` 及测试；relationGraphBuilder 仅处理 risk/avoidance/attackTool/threatActor/term 五类，无 businessScene 分支；路由无 `/relation/business-scene/:key`；首页业务场景矩阵不链接到关系页。业务场景影响是反向实现的（从实体推导命中场景），非"从场景出发的图谱"。

目标：把 BusinessScene 和 RiskScene 纳入解释型可视化，而不是只在首页矩阵展示。

工作内容：

- 新增 `relationBusinessSceneGraph.ts` 生成业务场景图谱数据。
- 新增从 BusinessScene / RiskScene 出发的关系视图。
- 展示 BusinessScene -> RiskDimension -> RiskScene -> Risk -> AttackTool / Avoidance。
- 支持按业务场景查看风险密度、规避覆盖、攻击工具集中度。
- 新增路由 `/relation/business-scene/:bsKey`，首页矩阵可进入。
- 补充 `relationBusinessSceneGraph.test.ts`。
- 保持中文业务场景为结构权威，英文文件只维护翻译。

落点：

- `src/views/relation/relationBusinessSceneGraph.ts`（新增）
- `src/views/relation/relationGraphBuilder.ts`（增加 businessScene 分支）
- `src/views/relation/relationTypes.ts`（RelationType 增加 businessScene）
- `src/router/index.ts`（新增路由）
- `src/views/HomeView.vue`（矩阵入口链接）
- `src/views/relation/__tests__/relationBusinessSceneGraph.test.ts`（新增）

验收标准：

- 用户能从业务场景进入对应风险图谱。
- 业务场景视图能解释该场景主要风险暴露面。
- 不在 Risk 实体中重新维护 `relatedBusinessScenes`。
- `relationBusinessSceneGraph.test.ts` 通过。

### 3.5 P2：节点详情质量提示补全

> 当前状态：⚠️ 部分实现。relationGraphInsights.ts 已有 notices（highConnectivity/lowConnectivity/missingAvoidance/missingRiskLink/rootPath），边级有 qualityFlags（缺来源/待复核）。但缺"缺引用"维度，"弱关系"未节点级化，且不消费审计报告（仅运行时按关系推导）。

目标：节点详情抽屉显示完整的质量提示集合。

工作内容：

- 补充"缺引用"维度（references 质量从审计报告读取，进节点详情）。
- "弱关系"作为节点级提示（当前仅边级 qualityFlags）。
- 节点质量提示消费质量报告 JSON（3.1），而非仅运行时推导。
- 统一质量提示与 3.2 的质量标记体系。

落点：

- `src/views/relation/relationGraphInsights.ts`
- `src/components/relation/RelationNodeAnalysisBlock.vue`
- `src/components/relation/RelationNodeDetailContent.vue`

验收标准：

- 节点详情显示"弱关系/缺引用/缺关联/待复核"四类完整提示。
- 提示来源包含审计报告（不只运行时推导）。

### 3.6 P2：关系页首屏性能专项

> 当前状态：⚠️ 部分实现。英文 BREAK 整包动态 import 懒加载（i18n/index.ts ensureEnLocaleMessages），但 en/BREAK/index.ts 内部用 `import.meta.glob({ eager: true })`，即整包懒加载但内部不分片；cases(1799)/terms(602) 目录大，该 chunk 较重。有性能基线脚本（site-performance/lighthouse-baseline/relation-stability/bundle-budget），但无独立关系页性能基线文档。

目标：降低关系页首次进入和语言切换时的等待时间。

工作内容：

- 评估英文 BREAK 翻译数据按实体/按关系图可见节点加载（替代整包 eager glob）。
- 评估预生成聚合语言包，减少大量 JSON 模块导入。
- 给关系页首屏建立性能基线：首次加载、网络图出图、语言切换重绘。
- 对高关联实体建立布局和渲染耗时样本。
- 形成独立关系页性能基线文档。

验收标准：

- 明确当前瓶颈归因和可量化指标。
- 至少形成一种可落地的翻译数据加载策略。
- 性能优化不破坏中英文动态切换和知识库详情展示。

### 3.7 P2：截图基线与交互回归

> 当前状态：⚠️ 部分实现。缺独立截图基线文档；抽屉、tooltip、筛选、三栏分析解读、移动端布局未固化 Playwright 截图基线。

目标：固化关键交互的视觉基线，防止回归。

工作内容：

- 建立当前截图和交互基线，覆盖关系网络、攻击路径、分析解读三栏、知识库详情、移动端提示、暗色主题。
- 固化高关联实体、低覆盖实体、空关系或低关系实体样本。
- Playwright 截图基线脚本或人工验收清单。

落点：

- `scripts/validate/`（截图基线脚本）
- 验收样本清单文档

验收标准：

- 关键页面有截图基线。
- 回归时可对比发现视觉变化。

## 4. 实施阶段（仅未完成）

### Phase 4：分析视角与质量治理（部分开始，核心未完成）

任务：

- 增加风险视角、攻击者视角、防御视角、薄弱关系视角（3.3）。
- 接入维护报告 JSON（3.1）并驱动质量治理视图（3.2）。
- 增加薄弱关系和覆盖缺口筛选。
- 图谱中标记质量问题。
- 将质量治理列表与中部/右侧 pane 的筛选、定位和详情组件打通。
- 补全节点详情质量提示（3.5）。

交付物：

- 关系页支持任务型视角切换，或在"分析解读"中提供等价的任务型过滤入口。
- 审计报告能驱动可视化治理：问题列表、节点定位、关系定位、详情解释。
- 维护者可从问题列表定位到实体和关系。

### Phase 5：业务场景图谱（未开始）

任务：

- 增加业务场景入口和路由。
- 构建 BusinessScene -> RiskScene -> Risk 的图谱数据（3.4）。
- 展示场景内风险、工具、规避覆盖摘要。
- 与首页业务场景矩阵保持一致。

交付物：

- 业务场景可进入解释型图谱。
- 风险场景与风险实体关系清晰。
- 中英文业务场景结构规则不被破坏。
- `relationBusinessSceneGraph.test.ts` 通过。

### Phase 6：关系页性能专项（未开始）

任务：

- 建立首屏加载和语言切换性能基线（3.6）。
- 评估英文 BREAK 翻译数据按需加载或预聚合。
- 高关联实体下验证网络图和分析解读渲染耗时。

交付物：

- 性能基线记录。
- 翻译数据加载策略结论。
- 可落地的首屏优化任务拆分。

## 5. 验收标准（仅未达成项）

| 项目 | 标准 | 当前 |
|------|------|------|
| 视角切换 | 至少支持风险、攻击路径、防御覆盖 3 个视角 | ❌ 0 个 |
| 质量治理 | 弱关系或缺覆盖问题能在可视化中定位 | ❌ 未实现 |
| 质量报告 | 前端可消费四分类稳定 JSON | ❌ 未实现 |
| 业务场景图谱 | 从业务场景进入解释型图谱 | ❌ 未实现 |
| 节点质量提示 | 含缺引用维度、消费审计报告 | ⚠️ 缺缺引用、不消费报告 |
| 性能基线 | 关系页首屏/语言切换可量化、有加载策略 | ⚠️ 无独立基线文档 |
| 截图基线 | 关键交互视觉基线固化 | ⚠️ 缺 |

工程验收（沿用）：type-check / validate:data / 单元测试 / build 通过；解释逻辑沉淀为纯函数或 composable，不堆在 Vue 模板中。

## 6. 近期执行清单

1. [ ] 新增脚本生成 `public/data/quality-report.json`（weakRelations/missingCoverage/sceneIssues/i18nIssues 四分类），纳入 build 链（3.1）。
2. [ ] 新增质量治理列表组件，展示四类问题并支持"仅看 X"筛选（3.2）。
3. [ ] 支持从质量治理列表定位到关系网络节点、关系边和分析解读详情（3.2）。
4. [ ] 为任务型视角定义默认筛选：风险、攻击者、防御、薄弱关系视角（3.3）。
5. [ ] 设计 BusinessScene / RiskScene 出发的业务场景图谱数据结构，新增 `relationBusinessSceneGraph.ts`（3.4）。
6. [ ] 补充 `relationBusinessSceneGraph.test.ts`（3.4）。
7. [ ] 新增 `/relation/business-scene/:bsKey` 路由，首页矩阵可进入（3.4）。
8. [ ] 节点详情补全"缺引用"维度并消费质量报告（3.5）。
9. [ ] 建立关系页首屏性能基线，记录英文 BREAK 全量 JSON 加载与合并耗时（3.6）。
10. [ ] 评估英文翻译数据按实体/按可见节点加载，或预生成聚合语言包（3.6）。
11. [ ] 建立关系页截图基线，覆盖关系网络、攻击路径、分析解读三栏、暗色主题、移动端（3.7）。

## 7. 建议新增模块（仅未完成）

| 模块 | 责任 | 状态 |
|------|------|------|
| `relationQualityFlags.ts` | 消费审计结果并生成质量标记 | ❌ 待新增 |
| `relationBusinessSceneGraph.ts` | 生成业务场景图谱数据 | ❌ 待新增 |

已存在不再列入：`relationExplanation.ts`、`relationAttackPath.ts`、`relationCoverageAnalysis.ts`、`relationBusinessSceneImpact.ts`、`relationGraphInsights.ts`。

## 8. 风险与约束（未变）

| 风险 | 说明 | 应对 |
|------|------|------|
| 解释过度推断 | 数据字段不足时易写看似确定的结论 | 明确区分 direct/indirect/inferred/review |
| UI 信息过载 | 质量治理加入太多列表会变难读 | 摘要优先、详情折叠、分组展示 |
| 性能下降 | 质量报告 + 视角切换增加计算 | 按需计算、缓存派生结果、避免深层响应式大对象 |
| 中英文不同步 | 新增说明文案易漏翻译 | 每个功能 PR 强制校验 i18n key |
| 维护报告耦合过重 | 前端直接依赖 Markdown 报告不稳定 | 输出稳定 JSON，Markdown 只给人读 |
| 关系页首屏加载慢 | 英文 BREAK 翻译整包加载与中文结构合并 | 短期预加载拆包；中期按实体加载或预生成聚合语言包 |

## 9. 优先级建议

第一优先级（P0）：前端可消费质量报告 JSON（3.1）——是 3.2/3.5 的前置依赖。

第二优先级（P1）：质量治理前端视图（3.2）、任务型分析视角（3.3）、业务场景图谱（3.4）。

第三优先级（P2）：节点质量提示补全（3.5）、关系页性能专项（3.6）、截图基线（3.7）。

暂不建议：新增大量统计图表、重做 ECharts 之外的新图谱引擎、复杂图算法或自动评分模型、需要大量人工标注的新 Schema 字段。
