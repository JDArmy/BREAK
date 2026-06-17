# BREAK 可视化分析解释能力工作规划

> 文档版本：1.0  
> 制定日期：2026-06-17  
> 适用范围：关系图谱、攻击路径、节点详情、关系解释、分析视角、质量治理视图  
> 当前阶段：专项规划，等待拆分实施任务

## 1. 背景与目标

BREAK 当前已经具备关系图谱和攻击路径可视化能力，用户可以从 Risk、Avoidance、AttackTool、ThreatActor、Term 等实体进入关系页，查看网络图和 Sankey 攻击路径。这说明项目已经完成了“关系可见”的第一阶段。

当前主要短板不在图形渲染本身，而在解释能力：用户能看到“谁和谁有关”，但还不能高效判断“为什么有关”“关系强弱如何”“这条攻击路径为什么成立”“应该优先处理哪里”“哪些关系需要继续治理”。因此，本专项的目标是把可视化分析从展示型图谱升级为解释型分析工具。

最终目标：

- 关系图谱不仅展示实体关联，还能解释关系来源、关系语义、关系价值和风险影响。
- 攻击路径不仅展示 ThreatActor -> AttackTool -> Risk -> Avoidance 链路，还能解释每一步的攻击意图、成立依据、可观测信号和阻断点。
- 节点详情不仅展示实体信息，还能提供上下游摘要、业务场景影响和防御优先级。
- 系统能围绕风险、攻击者、业务场景、防御覆盖、薄弱关系提供稳定的分析视角。
- 可视化能力与数据质量治理闭环联动，帮助维护者发现弱关系、缺证据关系和路径覆盖缺口。

## 2. 当前基础

### 2.1 已具备能力

| 能力 | 当前状态 |
|------|----------|
| 关系图谱 | 已使用 ECharts Graph 展示实体关系，支持节点类型、关系类型、布局切换、筛选、缩放、全屏、PNG 下载 |
| 攻击路径 | 已使用 ECharts Sankey 展示 ThreatActor -> AttackTool -> Risk -> Avoidance 链路 |
| 节点详情 | 已有节点详情抽屉，能展示节点基础信息、关系统计、根节点路径和攻击路径角色说明 |
| 关系来源 | 网络图中已能展示部分关系来源字段，如 `AttackTool.directCauseRisks`、`ThreatActor.useAttackTools` |
| 工程结构 | 关系页已拆分为 builder、insight、controller、state、effect、component 等模块 |
| 测试基础 | 已有 `relationGraphBuilder`、`relationAttackPath`、`relationGraphInsights`、`relationNetworkLayout` 等单元测试 |
| 数据审计 | `audit:relations`、`audit:metrics`、`audit:maintenance` 已能输出关系和维护质量报告 |

### 2.2 主要缺口

| 缺口 | 影响 |
|------|------|
| 边关系解释不足 | 用户看到连线，但不能快速判断关系语义、强度、来源和可信度 |
| 攻击路径解释不足 | Sankey 可展示路径，但不能完整说明路径成立依据、攻击意图和防御点 |
| 节点分析摘要不足 | 节点详情偏信息展示，缺少“为什么重要”和“应优先关注什么” |
| 分析视角不足 | 目前主要按当前实体展开，缺少风险视角、攻击者视角、业务场景视角、防御视角和薄弱关系视角 |
| 质量治理联动不足 | 审计脚本有报告，但可视化页面还没有把弱关系、缺证据关系、覆盖缺口明确暴露出来 |
| 路径选择能力不足 | 复杂实体下 Sankey 路径较多，用户难以锁定单条路径进行解释 |

## 3. 设计原则

1. 解释优先于堆图表  
   不新增没有明确分析问题的图表。每个新视图必须回答一个具体问题。

2. 数据可追溯  
   所有解释必须能回到现有 JSON 字段、实体关系、审计脚本结果或明确的推导规则。

3. 不伪造置信度  
   当前数据没有结构化证据强度字段时，不应假装有精确置信度。可以先使用“直接关系 / 间接关系 / 推导关系 / 待复核关系”等离散标签。

4. 先复用现有数据模型  
   优先基于现有 Risk、Avoidance、AttackTool、ThreatActor、BusinessScene 和关系字段构建解释，不急于扩展复杂 Schema。

5. 分析结果可测试  
   路径生成、关系解释、节点摘要、覆盖判断应尽量沉淀为纯函数，并配套单元测试。

6. 中文和英文同步设计  
   所有新增 UI 文案、解释模板和关系类型文案必须同步维护中英文 i18n。

## 4. 目标用户与使用场景

### 4.1 目标用户

| 用户 | 诉求 |
|------|------|
| 安全分析人员 | 快速理解某个风险的攻击链、相关工具、攻击者和规避手段 |
| 业务风险负责人 | 从业务场景理解主要风险暴露面和优先处置项 |
| 数据维护者 | 发现弱关系、缺证据关系、覆盖不足和异常路径 |
| 项目评审者 | 判断 BREAK 框架是否具备体系化、可解释和可审计能力 |
| 外部使用方 | 通过图谱理解 BREAK 数据集的结构和分析价值 |

### 4.2 核心分析问题

关系图谱和攻击路径应优先回答这些问题：

| 问题 | 对应能力 |
|------|----------|
| 这个实体为什么重要？ | 节点解释、上下游摘要、中心性提示 |
| 这两个实体为什么有关？ | 边关系解释、来源字段、关系类型说明 |
| 这条攻击路径为什么成立？ | 路径详情、逐段依据、路径角色说明 |
| 哪一步最适合检测或阻断？ | 防御覆盖解释、阻断点标记 |
| 这个风险覆盖了哪些业务场景？ | 业务场景视角、风险场景关联 |
| 哪些关系质量较弱？ | 薄弱关系视角、审计报告联动 |
| 哪些风险缺少有效规避？ | 防御视角、覆盖缺口提示 |

## 5. 信息架构规划

### 5.1 关系页一级结构

建议将关系页逐步收敛为 4 个分析入口：

| 入口 | 目标 | 当前基础 | 后续改造 |
|------|------|----------|----------|
| 关系网络 | 看实体之间的整体关系 | 已有 Graph | 增强边解释、节点摘要、弱关系标记 |
| 攻击路径 | 看攻击者到规避措施的链路 | 已有 Sankey | 增强路径筛选、单条路径详情、逐段依据 |
| 防御覆盖 | 看风险和规避措施的覆盖关系 | 部分由关系网络推导 | 新增覆盖摘要和缺口提示 |
| 质量治理 | 看弱关系、缺证据关系、覆盖异常 | 审计脚本已有报告 | 将报告结果转为可交互列表或图谱高亮 |

### 5.2 节点详情抽屉结构

节点详情建议固定为以下信息区块：

| 区块 | 内容 |
|------|------|
| 基础信息 | ID、类型、标题、定义摘要、跳转入口 |
| 为什么重要 | 关联数量、涉及业务场景、关键上下游、是否处于攻击路径中间层 |
| 直接关系 | 入向/出向直接关系，带关系类型和来源字段 |
| 路径角色 | 当前节点在攻击路径中的角色，如攻击者、工具、风险、规避 |
| 相关路径 | 与当前节点相关的高价值路径摘要 |
| 防御/风险提示 | 对 Risk 显示规避覆盖，对 Avoidance 显示覆盖风险，对 AttackTool 显示造成风险 |
| 数据质量提示 | 弱关系、缺引用、缺关联、待复核关系 |

### 5.3 边详情结构

每条边都应具备可解释信息：

| 字段 | 说明 |
|------|------|
| `relationType` | 关系类型，如直接导致、间接关联、使用工具、制作工具、规避风险 |
| `sourceFields` | 来源字段，如 `AttackTool.directCauseRisks` |
| `direction` | 关系方向，说明 from/to 的语义 |
| `explanation` | 面向用户的自然语言解释 |
| `evidenceLevel` | 初期可用 direct / indirect / inferred / review 四档 |
| `qualityFlags` | 是否缺少反向关系、是否缺少引用、是否来自弱覆盖项 |
| `impactHint` | 对分析和处置的意义 |

## 6. 数据与推导模型

### 6.1 不新增实体字段的第一阶段

第一阶段不强制修改实体 JSON Schema，优先通过现有字段推导解释：

| 来源字段 | 可推导解释 |
|----------|------------|
| `Risk.avoidances` | 风险可被哪些规避措施覆盖 |
| `Risk.attackTools` 或相关工具字段 | 风险可能由哪些攻击工具造成 |
| `AttackTool.directCauseRisks` | 工具直接导致哪些风险 |
| `AttackTool.indirectCauseRisks` | 工具间接关联哪些风险 |
| `AttackTool.avoidances` | 工具可被哪些规避措施限制 |
| `ThreatActor.useAttackTools` | 攻击者使用哪些攻击工具 |
| `ThreatActor.buildAttackTools` | 攻击者制作或维护哪些攻击工具 |
| `BusinessScene.riskDimensions[].riskScenes[].risks` | 风险属于哪些业务场景和风险场景 |

### 6.2 派生分析对象

建议在关系模块中引入派生对象，不直接污染实体数据：

```ts
interface RelationExplanation {
  relationKey: string;
  fromId: string;
  toId: string;
  relationType: string;
  sourceFields: string[];
  evidenceLevel: "direct" | "indirect" | "inferred" | "review";
  explanation: string;
  impactHint: string;
  qualityFlags: string[];
}

interface AttackPathExplanation {
  pathKey: string;
  threatActorId?: string;
  attackToolId?: string;
  riskId?: string;
  avoidanceId?: string;
  steps: AttackPathStepExplanation[];
  summary: string;
  defensiveFocus: string[];
  qualityFlags: string[];
}

interface AttackPathStepExplanation {
  fromId: string;
  toId: string;
  relationType: string;
  sourceFields: string[];
  attackIntent: string;
  defensiveMeaning: string;
}
```

### 6.3 关系解释分层

| 层级 | 说明 | 示例 |
|------|------|------|
| 直接关系 | 两个实体由明确字段直接连接 | `AttackTool.directCauseRisks` |
| 间接关系 | 通过中间实体形成关联 | ThreatActor -> AttackTool -> Risk |
| 路径关系 | 多段关系形成攻击链 | ThreatActor -> AttackTool -> Risk -> Avoidance |
| 质量关系 | 审计脚本发现的弱关系或异常关系 | 单向引用、缺少覆盖、关系过少 |

## 7. 功能规划

### 7.1 P1：边关系解释

目标：用户点击或悬停任意关系边时，可以理解这条边为什么存在。

工作内容：

- 在 `Line` 或图谱 link 派生数据中补充 `sourceFields`、`evidenceLevel`、`qualityFlags`。
- 完善 `getRelationSourceFields`，确保所有主要关系类型都有来源字段。
- 为主要关系类型提供自然语言解释模板。
- 在 tooltip、节点详情关系列表、复制 CSV 中显示关系来源和解释摘要。
- 对直接关系、间接关系、路径关系使用不同视觉标记。

落点：

- `src/views/relation/relationTypes.ts`
- `src/views/relation/relationGraphBuilder*.ts`
- `src/views/relation/relationGraphRelationSummary.ts`
- `src/components/relation/RelationNodeDrawerRelations.vue`
- `src/views/relation/relationNodeClipboard.ts`
- `src/i18n/*`

验收标准：

- 每条主要关系边都能显示关系类型、来源字段和解释文案。
- 用户可以区分直接关系、间接关系和推导关系。
- 单元测试覆盖 Risk、AttackTool、ThreatActor、Avoidance 四类核心关系。

### 7.2 P1：攻击路径详情与逐段解释

目标：用户能选择一条路径，并看到完整链路解释。

工作内容：

- 在 Sankey 数据生成时保留完整路径对象，而不只是 nodes/links。
- 支持点击 Sankey link 或节点组合后定位相关路径。
- 新增路径详情面板，展示 ThreatActor -> AttackTool -> Risk -> Avoidance。
- 每一段展示来源字段、攻击意图、防御意义。
- 支持“仅显示包含当前节点的路径”“仅显示完整四段路径”“仅显示缺规避路径”。

落点：

- `src/views/relation/relationAttackPath.ts`
- `src/views/relation/relationSankeyChartController.ts`
- `src/components/relation/RelationSankeyPane.vue`
- `src/components/relation/RelationNodeDrawerInsights.vue`
- `src/views/relation/__tests__/relationAttackPath.test.ts`
- `src/i18n/*`

验收标准：

- 至少支持从 ThreatActor、AttackTool、Risk 三种入口查看路径详情。
- 复杂实体下可以选择并解释单条路径。
- 路径详情能列出每段关系的来源字段。
- 对缺少 Avoidance 的路径显示覆盖缺口。

### 7.3 P1：节点分析摘要

目标：节点详情从“信息列表”升级为“分析摘要”。

工作内容：

- 为每类节点生成固定摘要：
  - Risk：涉及业务场景、相关工具、相关攻击者、规避覆盖情况。
  - AttackTool：直接/间接造成风险、相关攻击者、可被哪些规避限制。
  - ThreatActor：使用/制作工具、影响风险范围、路径覆盖情况。
  - Avoidance：覆盖风险、覆盖工具、覆盖缺口。
  - Term：关联实体和术语上下文。
- 给高关联节点增加“关键节点”提示。
- 给低覆盖节点增加“待补充关系”提示。
- 将摘要逻辑放入可测试的 insight 模块。

落点：

- `src/views/relation/relationGraphInsights.ts`
- `src/views/relation/relationGraphRootAnalysis.ts`
- `src/components/relation/RelationNodeDrawerInsights.vue`
- `src/views/relation/__tests__/relationGraphInsights.test.ts`

验收标准：

- 任意核心实体节点点开后，能看到一句可读的“为什么重要”摘要。
- 摘要不依赖硬编码具体 ID，而由关系数据推导。
- 高关联、低覆盖、路径中间层等提示有测试覆盖。

### 7.4 P2：分析视角切换

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

- 在关系页增加视角切换控件。
- 每个视角定义默认节点类型、默认关系类型、默认布局和解释模板。
- 将 `audit:metrics` 和 `audit:relations` 中的关键结果转成前端可消费数据。
- 对薄弱关系视角提供列表 + 图谱高亮。

落点：

- `src/components/relation/RelationSelectorBar.vue`
- `src/components/relation/RelationFilterPanels.vue`
- `src/views/relation/useRelationViewModel.ts`
- `src/views/relation/relationViewState.ts`
- `scripts/validate/metrics.mjs`
- `public/data/*` 或构建时生成的派生报告

验收标准：

- 用户可选择至少 3 个分析视角：风险、攻击路径、防御覆盖。
- 不同视角有不同默认筛选和说明。
- 视角切换不破坏现有 URL 路由和实体跳转。

### 7.5 P2：防御覆盖分析

目标：帮助用户判断风险是否有足够规避措施覆盖。

工作内容：

- 对 Risk 计算直接规避覆盖、工具规避覆盖、路径末端规避覆盖。
- 对 Avoidance 计算覆盖风险数、覆盖工具数、覆盖场景数。
- 对 AttackTool 显示可用规避措施及其覆盖范围。
- 对缺少规避措施或只有间接规避的风险给出提示。

覆盖类型建议：

| 类型 | 说明 |
|------|------|
| 直接覆盖 | Risk 显式关联 Avoidance |
| 工具覆盖 | AttackTool 关联 Avoidance，间接缓解相关 Risk |
| 路径覆盖 | 攻击路径末端存在 Avoidance |
| 缺口 | Risk 或路径没有可用 Avoidance |

验收标准：

- Risk 节点可显示覆盖状态。
- Avoidance 节点可显示覆盖范围。
- 攻击路径详情中可标记阻断点。
- 覆盖缺口可进入维护报告。

### 7.6 P2：质量治理联动

目标：让维护者在可视化页面直接看到数据质量问题。

工作内容：

- 将 `audit:metrics` 的维护任务、弱关系、场景问题输出为稳定 JSON。
- 前端加载质量报告后，在图谱中标记相关节点和边。
- 增加“仅看待复核关系”“仅看缺覆盖风险”“仅看场景异常”的筛选。
- 节点详情中显示质量提示和建议动作。

质量标记：

| 标记 | 含义 |
|------|------|
| `missingRelation` | 缺少关键关系 |
| `weakRelation` | 关系覆盖不足或仅有弱推导 |
| `missingAvoidance` | 风险缺少规避覆盖 |
| `sceneIssue` | 业务场景或风险场景分类异常 |
| `i18nIssue` | 中英文结构或文案同步异常 |

验收标准：

- 审计报告可被前端消费。
- 质量问题可以从列表定位到图谱节点。
- 质量标记不影响普通浏览体验。

### 7.7 P3：业务场景图谱

目标：把 BusinessScene 和 RiskScene 纳入解释型可视化，而不是只在首页矩阵展示。

工作内容：

- 新增从 BusinessScene / RiskScene 出发的关系视图。
- 展示 BusinessScene -> RiskDimension -> RiskScene -> Risk -> AttackTool / Avoidance。
- 支持按业务场景查看风险密度、规避覆盖、攻击工具集中度。
- 保持中文业务场景为结构权威，英文文件只维护翻译。

验收标准：

- 用户能从业务场景进入对应风险图谱。
- 业务场景视图能解释该场景主要风险暴露面。
- 不在 Risk 实体中重新维护 `relatedBusinessScenes`。

## 8. 实施阶段

### Phase 0：基线确认，1-2 天

任务：

- 复核当前关系图谱和 Sankey 的数据生成链路。
- 列出所有关系类型、来源字段和当前解释覆盖情况。
- 选定 8-10 个代表实体作为验收样本。
- 建立当前截图和交互基线。

建议样本：

- 高关联 Risk 2 个
- 低覆盖 Risk 2 个
- 高关联 AttackTool 2 个
- ThreatActor 2 个
- Avoidance 2 个
- 业务场景 1-2 个

交付物：

- 关系类型清单
- 来源字段覆盖清单
- 验收样本清单
- 当前问题截图或记录

### Phase 1：关系解释核心，3-5 天

任务：

- 完成 RelationExplanation 派生结构。
- 完成主要关系类型解释模板。
- 改造 tooltip、节点详情关系列表和 CSV 复制。
- 补充关系解释单元测试。

交付物：

- 边关系解释能力
- 关系来源字段完整显示
- 单元测试通过

### Phase 2：攻击路径解释，5-8 天

任务：

- 在 Sankey 生成逻辑中保留路径对象。
- 增加路径筛选和路径详情。
- 增加逐段攻击意图和防御意义解释。
- 标记缺少规避措施的路径。
- 补充攻击路径测试。

交付物：

- 可选择单条攻击路径
- 可解释路径成立依据
- 可定位阻断点和覆盖缺口

### Phase 3：节点摘要与防御覆盖，4-6 天

任务：

- 为 Risk、AttackTool、ThreatActor、Avoidance 生成分析摘要。
- 增加防御覆盖状态。
- 将覆盖缺口纳入节点详情。
- 补充 insight 测试。

交付物：

- 节点详情具备“为什么重要”说明
- 风险和规避的覆盖关系清晰可见
- 覆盖缺口可被维护者识别

### Phase 4：分析视角与质量治理，6-10 天

任务：

- 增加风险视角、攻击者视角、防御视角。
- 接入维护报告 JSON。
- 增加薄弱关系和覆盖缺口筛选。
- 图谱中标记质量问题。

交付物：

- 关系页支持任务型视角切换
- 审计报告能驱动可视化治理
- 维护者可以从问题列表定位到实体和关系

### Phase 5：业务场景图谱，5-8 天

任务：

- 增加业务场景入口。
- 构建 BusinessScene -> RiskScene -> Risk 的图谱数据。
- 展示场景内风险、工具、规避覆盖摘要。
- 与首页业务场景矩阵保持一致。

交付物：

- 业务场景可进入解释型图谱
- 风险场景与风险实体关系清晰
- 中英文业务场景结构规则不被破坏

## 9. 验收标准

### 9.1 功能验收

| 项目 | 标准 |
|------|------|
| 边解释 | 任意主要关系边可显示关系类型、来源字段、解释文案 |
| 路径解释 | 任意完整攻击路径可展示逐段说明和来源字段 |
| 节点摘要 | 核心实体节点有可读的分析摘要 |
| 防御覆盖 | Risk 和 Avoidance 能显示覆盖关系和缺口 |
| 视角切换 | 至少支持风险、攻击路径、防御覆盖 3 个视角 |
| 质量治理 | 弱关系或缺覆盖问题能在可视化中定位 |
| i18n | 新增文案中英文同步，英文文件不混入中文 |

### 9.2 工程验收

| 项目 | 标准 |
|------|------|
| 类型检查 | `npm run type-check` 通过 |
| 数据校验 | `npm run validate:data` 通过 |
| 单元测试 | 关系图谱、攻击路径、insight 相关测试通过 |
| 构建 | `npm run build` 通过 |
| 性能 | 不引入明显超预算 bundle；关系页交互不卡顿 |
| 可维护性 | 解释逻辑沉淀为纯函数或 composable，不堆在 Vue 模板中 |

### 9.3 内容验收

| 项目 | 标准 |
|------|------|
| 解释准确性 | 所有解释能回到明确字段或推导规则 |
| 不过度推断 | 不把弱关系描述成确定事实 |
| 业务场景一致性 | 风险场景分类以 `src/BREAK/business-scenes/*.json` 为权威 |
| 英文同步 | `src/i18n/en/BREAK/business-scenes/*.json` 只维护翻译，不维护结构性风险清单 |

## 10. 推荐源码改造边界

### 10.1 建议新增模块

| 模块 | 责任 |
|------|------|
| `relationExplanation.ts` | 生成边关系解释 |
| `relationAttackPathExplanation.ts` | 生成攻击路径解释 |
| `relationCoverageAnalysis.ts` | 生成风险和规避覆盖分析 |
| `relationQualityFlags.ts` | 消费审计结果并生成质量标记 |
| `relationBusinessSceneGraph.ts` | 生成业务场景图谱数据 |

### 10.2 建议避免的做法

| 做法 | 原因 |
|------|------|
| 在 Vue 模板里直接写复杂推导 | 难测试、难复用、难维护 |
| 为了解释能力大量新增实体字段 | 容易扩大数据维护成本，应先用派生逻辑验证 |
| 用脚本直接改实体关系 | 关系和关键词应由脚本提出建议，再由 AI 或人工判断后修改 |
| 在 Risk 实体里维护业务场景反向字段 | 业务场景分类权威应保持在 `business-scenes` 中 |
| 用精确分数伪装关系置信度 | 当前证据模型不足，先用离散状态更稳 |

## 11. 测试计划

### 11.1 单元测试

| 测试文件 | 覆盖内容 |
|----------|----------|
| `relationExplanation.test.ts` | 边关系解释、来源字段、直接/间接/推导分类 |
| `relationAttackPath.test.ts` | 路径生成、路径筛选、逐段来源字段 |
| `relationCoverageAnalysis.test.ts` | Risk/Avoidance 覆盖状态、缺口判断 |
| `relationGraphInsights.test.ts` | 节点摘要、关键节点、低覆盖提示 |
| `relationBusinessSceneGraph.test.ts` | 业务场景到风险场景、风险实体的图谱生成 |

### 11.2 交互测试

至少覆盖：

- 从 Risk 进入关系页，查看边解释和防御覆盖。
- 从 AttackTool 进入关系页，查看直接/间接造成风险。
- 从 ThreatActor 进入攻击路径，筛选一条路径并查看逐段解释。
- 从 Avoidance 进入关系页，查看覆盖风险和覆盖工具。
- 从业务场景进入场景图谱，查看场景风险暴露面。

### 11.3 视觉和性能检查

至少检查：

- 桌面宽屏
- 桌面窄屏
- 移动端
- 暗色主题
- 高关联实体
- 空关系或低关系实体

## 12. 数据治理联动

### 12.1 与现有脚本关系

| 脚本 | 用途 |
|------|------|
| `npm run audit:relations` | 关系覆盖审计 |
| `npm run audit:metrics` | 内容规模、弱关系、场景问题、维护任务 |
| `npm run audit:maintenance` | 统一维护汇总 |
| `npm run validate:data` | 数据结构和中英文同步基础校验 |
| `npm run validate:docs-build` | 静态站构建产物同步校验 |

### 12.2 建议新增输出

将维护报告拆出前端可消费 JSON：

```json
{
  "weakRelations": [],
  "missingCoverage": [],
  "sceneIssues": [],
  "i18nIssues": [],
  "generatedAt": "2026-06-17"
}
```

前端只消费报告结果，不在运行时重新执行重型审计逻辑。

## 13. 风险与约束

| 风险 | 说明 | 应对 |
|------|------|------|
| 解释过度推断 | 数据字段不足时容易写出看似确定的结论 | 明确区分 direct、indirect、inferred、review |
| UI 信息过载 | 详情抽屉加入太多解释会变难读 | 使用摘要优先、详情折叠、分组展示 |
| 性能下降 | 高关联图谱增加解释数据可能变慢 | 解释按需计算、缓存派生结果、避免深层响应式大对象 |
| 中英文不同步 | 新增大量说明文案容易漏翻译 | 每个功能 PR 强制校验 i18n key |
| 维护报告耦合过重 | 前端直接依赖 Markdown 报告不稳定 | 输出稳定 JSON，Markdown 只给人读 |
| 数据模型膨胀 | 为视觉效果新增太多字段 | 先用派生对象验证，再决定是否进入 Schema |

## 14. 优先级建议

第一优先级：

- 边关系解释
- 攻击路径详情
- 攻击路径逐段来源字段
- 节点“为什么重要”摘要

第二优先级：

- 防御覆盖分析
- 路径筛选
- 质量治理标记
- 关系解释单元测试扩充

第三优先级：

- 多分析视角
- 业务场景图谱
- 维护报告前端消费
- 高关联实体性能基线

暂不建议优先做：

- 新增大量统计图表
- 重做 ECharts 之外的新图谱引擎
- 复杂图算法或自动评分模型
- 需要大量人工标注的新 Schema 字段

## 15. 近期执行清单

建议从下面 10 个任务开始：

1. 梳理所有关系类型和来源字段，生成关系解释覆盖清单。
2. 新增 `relationExplanation.ts`，统一生成边解释。
3. 改造节点详情关系列表，显示来源字段和解释。
4. 改造 Sankey 数据结构，保留完整路径对象。
5. 新增路径详情面板，展示逐段解释。
6. 为 Risk 节点生成规避覆盖摘要。
7. 为 AttackTool 节点生成直接/间接风险摘要。
8. 为 ThreatActor 节点生成使用/制作工具摘要。
9. 将弱关系和缺覆盖问题整理为前端可消费 JSON。
10. 补齐 relation explanation、attack path explanation、coverage analysis 单元测试。

## 16. 结论

BREAK 的可视化分析下一阶段不应以“图更大、布局更多”为核心，而应以“解释更深、路径更清楚、关系更可审计”为核心。

本规划建议先完成边关系解释和攻击路径解释，再补节点摘要、防御覆盖、质量治理和业务场景图谱。这样可以在不大幅扩张数据模型的前提下，把当前已有的关系网络和攻击路径能力升级为真正的分析能力。
