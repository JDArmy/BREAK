# BREAK 框架未完成升级计划

> 文档版本：2.1
> 修订日期：2026-06-24
> 范围：仅保留尚未收口或需要持续推进的升级项；既往阶段、验收记录和历史流水账不再维护在本文档中。
> 评估结论：BREAK 已具备较成熟的知识模型、关系可视化、数据校验和构建门禁。后续重点不是继续堆功能，而是收紧内容质量闭环、补齐知识模型短板、降低关系页工程复杂度，并把可视化从解释型推进到更强的推理型。

## 0. 当前未完成短板

1. **内容与引用治理仍需闭环**：真实 broken 链接已清理，但 review、timeout、connection_error 仍需按域名和来源价值分批复核；高价值案例的 primary source 覆盖率仍偏低，需要继续补强。
2. **回归门禁已收紧，测试深度仍需继续补齐**：浏览器 smoke、关系稳定性、Lighthouse、静态站性能和视觉巡检已全部转为每个 PR 的独立 hard-fail job；`RelationView`、`HomeView`、基础布局/主题/案例 composables 已补页面组合与状态测试，coverage 阈值已提升到 65%；后续重点是继续观察 CI 耗时、稳定性和视觉 warning 噪声，并补关键交互组件、控制器和复杂关系分支测试。
3. **质量治理应留在审计链路**：质量报告 JSON 已纳入引用健康、案例来源等级、字段级 i18n、弱来源等规则；后续重点是按报告分批治理，不在公开关系页暴露“质量治理”入口。
4. **关系页工程债偏重**：路径、解释、Sankey、覆盖、过滤等逻辑仍需继续拆分；复杂分析流程、页面组合入口和关键交互仍需要更多组件、控制器和视图模型测试覆盖。
5. **可视化推理能力仍可深化**：已有路径发现和 force 布局基础，但缺少完整路径发现交互面板、大图截图/性能基线、攻击路径步骤级 method/action 解释。
6. ~~**标准化互操作尚未开始**~~：已实现 STIX 2.1 和 JSON-LD 双格式导出，支持实体级 version 字段，外部 CTI/SIEM 消费能力已具备（v2.23.0）。

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
- P1 官方源复测后，继续处理剩余 `mps.gov.cn` 521 链接；已将 23 条中的 16 条替换为新华社、中国政府网、央视网、中国警察网、使领馆、光明网、解放日报等可访问来源，剩余 7 条因未找到高置信替代源继续保留复核队列。`justice.gov`/`moj.gov.cn` connection_error 已确认浏览器忽略证书错误后可访问，后续保留复核记录即可。

落点：`.github/workflows/link-check.yml`、`scripts/validate/references-health.mjs`、`scripts/validate/reference-domain-plan.mjs`、`research/search-reports/reference-health.*`。

验收：
- `npm run audit:reference-domain-plan` 可生成 P1/P2 域名治理批次。
- review/timeout/connection_error 按域名策略分批收敛，关键 P1 域名有处理记录或复测结论。

#### P0-2. 高价值案例 primary source 补强

目标：让核心案例优先具备可信 primary source，避免用全量多源率作为低收益 KPI。

未完成工作：
- 基于 `npm run audit:case-source-quality` 输出的高价值清单，按类别分批补 primary source。
- `criminal_verdict` 优先法院、检察院、公安、监管通报；`security_incident` 优先厂商公告、官方通报、链上分析；`vulnerability_advisory` 优先 CVE/NVD、厂商安全公告、论文或原始仓库。
- 对只有 secondary、weak、unknown 来源的高价值案例进入复核队列；已扩充英文原始/学术/厂商来源、稳定媒体 secondary 识别和窄口径公安系统 primary 识别，并为 `C0009`、`C0010`、`C0013`、`C0026`、`C0031`、`C0032`、`C0033`、`C0036`、`C0038`、`C0039`、`C0041`、`C0043`、`C0045`、`C0046`、`C0047`、`C0051`、`C0056`、`C0057`、`C0059`、`C0060`、`C0062`、`C0063`、`C0064`、`C0065`、`C0066`、`C0067`、`C0071`、`C0072`、`C0073`、`C0077`、`C0078`、`C0079`、`C0081`、`C0086`、`C0089`、`C0095`、`C0096`、`C0110`、`C0111`、`C0114`、`C0119`、`C0123`、`C0129`、`C0131`、`C0134`、`C0135`、`C0139`、`C0140`、`C0141`、`C0142`、`C0143`、`C0145`、`C0154`、`C0155`、`C0156`、`C0158`、`C0159`、`C0160`、`C0164`、`C0165`、`C0166`、`C0167`、`C0168`、`C0169`、`C0180`、`C0183`、`C0186`、`C0200`、`C0201`、`C0202`、`C0203`、`C0205`、`C0207`、`C0208`、`C0210`、`C0236`、`C0284`、`C0305`、`C0307`、`C0337`、`C0351`、`C0409`、`C0783`、`C0792`、`C0794`、`C0804`、`C0809`、`C0822`、`C0864`、`C0892`、`C1173`、`C1161`、`C1162`、`C1187`、`C1188`、`C1228`、`C1229`、`C1234`、`C1271`、`C1301`、`C1302`、`C1303`、`C1381`、`C1419`、`C1467`、`C1506`、`C1520`、`C1591`、`C1635`、`C1689`、`C1698`、`C1789`、`C0294`、`C0782`、`C0795`、`C0803`、`C0806`、`C0811`、`C0812`、`C1269`、`C1298`、`C1300`、`C1366`、`C1454`、`C1473`、`C1484`、`C1519`、`C1675`、`C1676`、`C1358`、`C1360`、`C1363`、`C1365`、`C1507`、`C1518`、`C1553`、`C1679`、`C1680`、`C1686`、`C0807`、`C0872`、`C1018`、`C1019`、`C1135`、`C1183`、`C1184`、`C1294`、`C1316`、`C1334`、`C1357`、`C1463`、`C1470`、`C1539`、`C1541`、`C1551`、`C1696`、`C1757`、`C0786`、`C0842`、`C1293`、`C1330`、`C1433`、`C1439`、`C1441`、`C1631`、`C1361`、`C1374`、`C1376`、`C1390`、`C1394`、`C1413`、`C1422`、`C1424`、`C1426`、`C1436`、`C1455`、`C1522`、`C1525`、`C1540`、`C1543`、`C0417`、`C0708`、`C0716`、`C1210`、`C1270`、`C1332`、`C1354`、`C1359`、`C1364`、`C1369`、`C1396`、`C1423`、`C1656`、`C1658`、`C1758`、`C1767`、`C0153`、`C0216`、`C0433`、`C0430`、`C0206`、`C0264`、`C0025`、`C0235`、`C0760`、`C0260`、`C0084`、`C0213`、`C0219`、`C0220`、`C0221`、`C0226`、`C0230`、`C0234`、`C0246`、`C0253`、`C0255`、`C0259`、`C0263`、`C0269`、`C0270`、`C0289`、`C1272`、`C1299`、`C1475`、`C1661`、`C0044`、`C0113`、`C0157`、`C0178`、`C0212`、`C0215`、`C0225`、`C0228`、`C0262`、`C0283`、`C0214`、`C0222`、`C0229`、`C0233`、`C0238`、`C0247`、`C0271`、`C0288`、`C0320`、`C0331`、`C0359`、`C0355`、`C0358`、`C0360`、`C0361`、`C0363`、`C0367`、`C0387`、`C0407`、`C0710`、`C0711`、`C0713`、`C0714`、`C0715`、`C0718`、`C0049`、`C0128`、`C0237`、`C0268`、`C0480`、`C0927`、`C0980`、`C0981`、`C0984`、`C0986`、`C0987`、`C0988`、`C1155`、`C1158`、`C0492`、`C0521`、`C0317`、`C0338`、`C0455`、`C0523`、`C0459`、`C0429`、`C1212`、`C1389`、`C1406` 补充法院、检察院、公安、市场监管、网信、平台官方、厂商研究、执法机构、监管机构、漏洞库、链上安全分析、官方 postmortem、作者原始披露和原始研究等 primary source，为 `C0023`、`C0024`、`C0025` 补充稳定媒体来源。当前 `npm run audit:case-source-quality` 指标为 primary 覆盖 851、高价值 primary 覆盖 528、primary 覆盖率 47.36%、高价值 primary 覆盖率 48.93%。下一批继续处理 `C0027`、`C0034`、`C0120`、`C0211`、`C0239` 以及审计队列中仍缺 official source 的司法/执法案例和可由厂商、CERT、NVD、原始研究补强的安全事件；未找到同案 primary 或官方链接无法稳定核验时不使用相似案例硬补。
- 最新进展：继续为 `C1160`、`C1233`、`C1235`、`C1392` 补充 CNPD、市场监管总局、上海市场监管局和美国司法部官方来源；当前 `npm run audit:case-source-quality` 指标为 primary 覆盖 855、高价值 primary 覆盖 532、primary 覆盖率 47.58%、高价值 primary 覆盖率 49.30%。
- 最新进展：继续为 `C1550` 补充 Multichain 官方停运说明；当前 `npm run audit:case-source-quality` 指标为 primary 覆盖 856、高价值 primary 覆盖 533、primary 覆盖率 47.63%、高价值 primary 覆盖率 49.40%。
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
- 已补 `RelationView` 页面组合测试，覆盖桌面/移动端预加载、卸载清理、详情抽屉状态和网络面板事件转发；已补 `HomeView` 页面测试，覆盖首页统计、风险详情路由、业务场景详情关闭、非法路由回退和异步实体抽屉。
- 已补 `useBreakpoints`、`useTheme`、`useDrawerWidth`、`useCasesByRisk`、`useLazyCasesSection`、`useRelationGraph` 测试，覆盖断点监听、主题同步、抽屉宽度、案例倒排索引、滚动懒加载和关系图路由跳转。
- `site-visual-review` 已将首页英文矩阵受控横向滚动、移动端关系图画布、抽屉打开态等 warning 分类为 `knownWarnings`；后续继续处理未知 warning，并把真实布局问题转为阻断项。
- coverage 阈值已从 62% 提升到 65%；后续优先补 `relationCoverageAnalysis`、`relationGraphBuilder`、图表控制器和关键交互组件分支，再评估继续上调。
- CI/deploy/link-check 已增加 job 级 `timeout-minutes`，后续观察 hard-fail 浏览器 job 的耗时和偶发失败，再决定是否拆分缓存或复用 workflow。

落点：`vitest.config.ts`、`src/views/**/__tests__`、`src/components/**/__tests__`、`scripts/validate/site-visual-review.mjs`。

验收：
- 关键页面组合入口和高风险交互有稳定单测或浏览器巡检覆盖。
- 视觉巡检 warning 有分类处置或明确允许名单，未知 warning 数量持续收敛。
- coverage 阈值随实际覆盖提升逐步上调，且 `npm run test:coverage` 稳定通过。
- CI 浏览器类 job 有明确超时上限，避免长时间挂死。

#### P1-2. CI workflow 优化

目标：减少重复校验、提升 CI 反馈速度。

未完成工作：
- 继续评估是否抽取可复用 workflow 或统一校验 job，减少后续 ci/deploy 重复命令维护。

落点：`.github/workflows/ci.yml`、`.github/workflows/deploy.yml`、`.github/workflows/link-check.yml`。

验收：
- CI 总耗时明显下降。
- ci/deploy 重复步骤继续减少。

#### P1-3. 任务型分析视角切换

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
| P1-3 任务型分析视角切换 | P1 | 3-4 天 | 提升关系页分析效率 |
| P2-1 完整路径发现交互面板 | P2 | 2-3 天 | 强化推理型分析 |
| P2-2 大图性能与截图基线 | P2 | 1-2 天 | 降低可视化回归风险 |
| P2-3 攻击路径步骤级解释 | P2 | 2-3 天 | 提升解释可信度 |
| P2-5 业务场景图谱 | P2 可选 | 4-5 天 | 场景入口增强 |

推荐顺序：
1. 先继续做 P0-1、P0-2，收紧内容质量和引用可信度。
2. 同步推进 P1-1、P1-2，降低回归噪声和 CI 维护成本。
3. 然后推进 P1-3，补齐关系页分析方式。
4. 最后按外部需求选择 P2 项。

## 4. 整体验收标准

| 维度 | 目标 |
|---|---|
| 引用健康 | link-check Issue 去重；review/timeout/connection_error 有分域名复核策略 |
| 案例来源 | 高价值案例 primary 覆盖率可统计并持续提升；弱来源可追踪 |
| 回归门禁 | 浏览器 smoke、关系稳定性、Lighthouse、性能和视觉巡检均为 PR hard fail；关系页核心逻辑有测试覆盖 |
| 质量报告 | `audit:quality-report` 覆盖引用、案例来源、i18n、弱关系等治理维度，并进入静态数据与 npm 包校验 |
| 公开关系页 | 不暴露内部质量治理入口 |
| 关系页工程 | 继续拆分复杂分析模块，补控制器、视图模型和交互测试 |
| CI | PR 旧 run 可取消；重复 workflow 明显减少 |
| 任务型视角 | 至少支持风险、攻击路径、防御覆盖 3 个视角 |
| 路径发现 | 任意起止节点路径发现有完整交互 |
| 大图稳定性 | 有性能预算和截图基线 |
| 动态解释 | 攻击路径步骤解释包含可追溯 method/action |
| 标准化 | ~~可导出合法 STIX 2.1 bundle~~ ✅ v2.23.0 已实现 STIX 2.1 + JSON-LD 双格式导出 |

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
