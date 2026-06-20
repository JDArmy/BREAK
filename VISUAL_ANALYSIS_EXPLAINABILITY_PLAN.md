# BREAK 可视化分析解释能力工作规划（未完成待办）

> 文档版本：2.1（仅留存必要且有价值的规划）
> 核查时间：2026-06-20，对应代码版本 2.21.1
> 已落地能力不在此列：边关系解释、攻击路径逐段解释、节点分析摘要、防御覆盖分析、业务场景影响摘要、抽屉子组件拆分、英文 i18n 质量校验均已实现并测试覆盖

## 0. 核查结论

经逐项代码核查（非文档自评），当前代码版本中以下能力尚未实现，列为后续待办。已完成项（`relationExplanation.ts`、`relationAttackPath.ts`、`relationCoverageAnalysis.ts`、`relationBusinessSceneImpact.ts`、`relationGraphInsights.ts` 及对应测试）不再纳入。

已剔除低价值项：
- 关系页性能专项——英文 BREAK chunk 仅 104K，不是瓶颈，性能假设不成立。
- 截图基线——Playwright e2e 已从 CI/Deploy 移除，截图基线只能本地手动，ROI 低。
- 业务场景图谱降级为可选——首页已有业务场景矩阵（场景→风险维度→风险场景→风险）+ `/business-scene/:bsKey` 路由，从场景看风险已能做，关系图谱从场景进入价值有限。

| # | 规划项 | 优先级 | 关键缺口 |
|---|--------|--------|----------|
| 1 | 前端可消费质量报告 JSON | P0 | `public/data` 无质量 JSON；审计 JSON 在 `research/search-reports` 不被前端 import；缺四分类稳定契约 |
| 2 | 质量治理前端视图（含节点质量提示） | P1 | 无质量列表组件、无"仅看 X"筛选、无从列表定位图谱节点、无五种稳定质量标记体系；节点详情缺"缺引用"维度、不消费审计报告 |
| 3 | 任务型分析视角切换 | P1 | RelationSelectorBar 无视角控件、viewModel/state 无 perspective 概念、src 内 0 处视角切换代码 |

## 1. 背景与目标

BREAK 关系页已完成"关系可见 + 关系可解释"阶段：网络图、Sankey 攻击路径、边关系解释、路径逐段解释、节点分析摘要、防御覆盖、业务场景影响均已落地。

下一阶段目标是把可视化分析从"解释型"升级为"可治理、可定位、可分视角"：

- 质量治理闭环：审计脚本发现的问题能直接在前端定位到节点和关系。
- 任务型视角：从单一实体中心图升级为面向任务的分析视角（风险/攻击者/防御/薄弱关系）。

## 2. 设计原则（沿用）

1. 解释优先于堆图表：每个新视图必须回答一个具体分析问题。
2. 数据可追溯：所有解释必须能回到现有 JSON 字段、实体关系、审计脚本结果或明确推导规则。
3. 不伪造置信度：使用 direct / indirect / inferred / review 离散标签，不用精确分数。
4. 先复用现有数据模型：优先基于现有字段推导，不急于扩展 Schema。
5. 分析结果可测试：沉淀为纯函数并配套单测。
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

### 3.2 P1：质量治理前端视图（含节点质量提示）

> 当前状态：❌ 未实现。无质量治理组件、无质量问题状态、无"仅看 X"筛选、无从列表定位图谱节点。节点级有零散覆盖缺口提示（RelationNodeCoverageBlock），但非列表视图 + 图谱定位。节点详情缺"缺引用"维度，"弱关系"未节点级化，不消费审计报告（仅运行时按关系推导）。

目标：让维护者在可视化页面直接看到数据质量问题，定位到图谱节点/关系；节点详情显示完整质量提示。

工作内容：

- 新增质量治理列表组件（如 RelationQualityPanel），展示弱关系、缺覆盖、场景异常、i18n 异常。
- 前端加载质量报告 JSON（依赖 3.1）后，在图谱中标记相关节点和边。
- 增加"仅看待复核关系""仅看缺覆盖风险""仅看场景异常""仅看 i18n 异常"筛选。
- 支持从问题列表点击定位到图谱节点/关系边/分析解读详情。
- 节点详情补全质量提示：补充"缺引用"维度（references 质量从审计报告读取），"弱关系"作为节点级提示，统一质量标记体系。

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
- `src/components/relation/RelationNodeDetailDrawer.vue` / `RelationNodeAnalysisBlock.vue`（节点质量提示）
- `src/views/relation/relationGraphInsights.ts`（补"缺引用"/节点级"弱关系"）
- `src/views/relation/relationQualityFlags.ts`（新增，消费审计结果生成质量标记）

验收标准：

- 审计报告可被前端消费（依赖 3.1）。
- 质量问题可从列表定位到图谱节点。
- 质量标记不影响普通浏览体验。
- 五种质量标记作为统一 key 在节点/边展示。
- 节点详情显示"弱关系/缺引用/缺关联/待复核"四类完整提示，来源包含审计报告。

### 3.3 P1：任务型分析视角切换

> 当前状态：❌ 未实现。RelationSelectorBar 只有关系类型下拉和实体 key 下拉，无视角切换；viewModel/state 无 perspective 概念；src 内 0 处视角切换代码（grep "perspective|视角" 仅命中内容数据文案）。

目标：从单一实体中心图，升级为面向任务的分析视角。

建议视角：

| 视角 | 入口问题 | 展示重点 |
|------|----------|----------|
| 风险视角 | 这个风险从哪里来，如何缓解？ | Risk、AttackTool、ThreatActor、Avoidance |
| 攻击者视角 | 这个攻击者怎么行动？ | ThreatActor、use/build 工具、造成风险 |
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

### 3.4 可选：业务场景图谱（低优先）

> 首页已有业务场景矩阵（场景→风险维度→风险场景→风险）+ `/business-scene/:bsKey` 路由，从业务场景看风险已能做。本项为"从 BusinessScene/RiskScene 进入解释型关系图谱"，价值有限，列为可选探索，非必做。

若做：新增 `relationBusinessSceneGraph.ts` + `/relation/business-scene/:bsKey` 路由 + 首页矩阵入口，展示 BusinessScene → RiskDimension → RiskScene → Risk → AttackTool/Avoidance。约束：不在 Risk 实体维护 `relatedBusinessScenes`，中文业务场景为结构权威。

## 4. 实施阶段（仅未完成）

### Phase 4：分析视角与质量治理

任务：

- 接入维护报告 JSON（3.1）并驱动质量治理视图（3.2）。
- 增加风险视角、攻击者视角、防御视角、薄弱关系视角（3.3）。
- 增加薄弱关系和覆盖缺口筛选，图谱中标记质量问题。
- 将质量治理列表与中部/右侧 pane 的筛选、定位和详情组件打通。
- 补全节点详情质量提示（3.2）。

交付物：

- 审计报告能驱动可视化治理：问题列表、节点定位、关系定位、详情解释。
- 关系页支持任务型视角切换，或在"分析解读"中提供等价的任务型过滤入口。
- 维护者可从问题列表定位到实体和关系。

## 5. 验收标准（仅未达成项）

| 项目 | 标准 | 当前 |
|------|------|------|
| 质量报告 | 前端可消费四分类稳定 JSON | ❌ 未实现 |
| 质量治理 | 弱关系或缺覆盖问题能在可视化中定位 | ❌ 未实现 |
| 节点质量提示 | 含缺引用维度、消费审计报告 | ⚠️ 缺缺引用、不消费报告 |
| 视角切换 | 至少支持风险、攻击路径、防御覆盖 3 个视角 | ❌ 0 个 |

工程验收（沿用）：type-check / validate:data / 单元测试 / build 通过；解释逻辑沉淀为纯函数或 composable，不堆在 Vue 模板中。

## 6. 近期执行清单

1. [ ] 新增脚本生成 `public/data/quality-report.json`（weakRelations/missingCoverage/sceneIssues/i18nIssues 四分类），纳入 build 链（3.1）。
2. [ ] 新增质量治理列表组件，展示四类问题并支持"仅看 X"筛选（3.2）。
3. [ ] 支持从质量治理列表定位到关系网络节点、关系边和分析解读详情（3.2）。
4. [ ] 节点详情补全"缺引用"维度、节点级"弱关系"，消费质量报告（3.2）。
5. [ ] 为任务型视角定义默认筛选：风险、攻击者、防御、薄弱关系视角（3.3）。

## 7. 建议新增模块（仅未完成）

| 模块 | 责任 | 状态 |
|------|------|------|
| `relationQualityFlags.ts` | 消费审计结果并生成质量标记 | ❌ 待新增 |

已存在不再列入：`relationExplanation.ts`、`relationAttackPath.ts`、`relationCoverageAnalysis.ts`、`relationBusinessSceneImpact.ts`、`relationGraphInsights.ts`。

## 8. 风险与约束

| 风险 | 说明 | 应对 |
|------|------|------|
| 解释过度推断 | 数据字段不足时易写看似确定的结论 | 明确区分 direct/indirect/inferred/review |
| UI 信息过载 | 质量治理加入太多列表会变难读 | 摘要优先、详情折叠、分组展示 |
| 中英文不同步 | 新增说明文案易漏翻译 | 每个功能 PR 强制校验 i18n key |
| 维护报告耦合过重 | 前端直接依赖 Markdown 报告不稳定 | 输出稳定 JSON，Markdown 只给人读 |

## 9. 优先级建议

第一优先级（P0）：前端可消费质量报告 JSON（3.1）——是 3.2 的前置依赖。

第二优先级（P1）：质量治理前端视图（3.2）、任务型分析视角（3.3）。

可选（低优先）：业务场景图谱（3.4）。

暂不建议：新增大量统计图表、重做 ECharts 之外的新图谱引擎、复杂图算法或自动评分模型、需要大量人工标注的新 Schema 字段。
