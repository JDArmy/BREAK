# BREAK 框架升级计划

> 文档版本：1.4
> 制定日期：2026-06-20，修订日期：2026-06-22，基于 v2.21.11 现状校准
> 关联文档：`VISUAL_ANALYSIS_EXPLAINABILITY_PLAN.md`（关系页专项，本计划引用其 P0/P1 项）
> 评估结论：先进性 4.5/5，完善性 4.5/5——先进且工程成熟；风险内容质量首轮断层已清零，距「完善」主要差案例来源质量分级、引用待复核闭环、回归门禁强约束、可视化算法深化

## 0. 评估结论回顾

BREAK 是业务风险对抗领域具备明显先进性、工程化达开源一线水平的知识框架。核心优势：知识模型四维分层闭环、关系可视化解释层（证据可追溯 + 防御覆盖缺口）业界独特、类型安全优秀、构建门禁完备。

三大短板（拉低完善性）：
1. **内容质量治理进入第二阶段**：风险侧首轮质量断层已清零（def==desc 0、单关键词 0、generic influence 0），引用健康审计已建立且 broken=0；剩余主要是高价值案例缺少 primary source 分级标记、152 条反爬/权限类 review、150 条 timeout、66 条 connection_error 需要分批复核。单源率（1784/1797，99.28%）作为观察指标保留，不再作为全量治理 KPI。
2. **自动化回归网已建立但仍需收紧**：5 个 Playwright/Lighthouse 脚本已接入 CI/Deploy，关键 .vue 组件已破零，当前 20 个测试文件 / 141 条测试；relation-stability 已进入 PR 浏览器回归，覆盖率 include 已扩展到 composables + relation；剩余问题是浏览器回归仍以 `continue-on-error` / 条件运行为主，需观察稳定后转 hard fail，并继续扩大组件/控制器测试覆盖。
3. **可视化算法已完成第一阶段但仍需深化**：已补 BFS 路径发现、ECharts force + 度数感知初始布局、实体语义关系解释；剩余短板是完整路径发现交互、大图性能/截图基线、攻击路径步骤级 method/action 解释。

次要短板：风险间无关联、Avoidance category 非枚举、i18n-sync 虽已进入 strict 链路但仍缺字段级校验、relationAttackPath 1155 行过大、CI 仍可继续优化、useSearch 潜在 bug。

## 1. 升级原则

1. **先补短板后上台阶**：P0 内容质量 + 回归网是"补"（投入产出比高），P2 可视化算法是"上台阶"（决定从解释型走向推理型）。
2. **数据质量优先**：内容质量是知识框架的根基，先于功能扩展。
3. **回归网先于新功能**：在加新能力前，先有自动化保障防回归。
4. **不破坏既有优势**：类型安全、构建门禁、懒加载分层、关系解释层在升级中保持。
5. **可量化验收**：每项有明确验收标准，可脚本/测试验证。

## 2. 分阶段计划

### Phase 0（P0 前置）：规划校准 + 脚本规范修复（已完成）

> 目标：先消除规划与当前仓库状态之间的偏差，避免后续 Phase A/B 按过期假设执行。  
> 状态：已完成，详见 `research/search-reports/phase-0-baseline.md`。

#### 0.1 当前基线复核

> v2.21.11 现状：计划已从 v2.21.1 初评校准到当前仓库；`validate:data` 已包含 `i18n-sync.mjs --strict` 和英文质量校验；A1 引用可达性检测与首轮 broken 清理已完成，A2/A3 风险内容质量治理已完成，A5 自动化回归网第一阶段、C1/C2/C3 可视化算法第一阶段已完成；A4 已从“全量多源率”调整为“来源质量分级 + 高价值案例 primary source 补强”，A6/B3/B5 仍需继续推进。

目标：形成可追踪的执行基线。

方案：
- 重新记录当前版本、测试数量、实体数量、引用数量、质量指标和 CI workflow 状态。
- 把“新增”类任务改成“增强/接入/去重/结构化输出”类任务，避免重复建设。
- 对 A1/A5/B3/B5 的现状描述按当前仓库状态校准（A5 已完成第一阶段）。

落点：`UPGRADE_PLAN.md`、`research/search-reports/phase-0-baseline.md`。

验收：
- ✅ 计划中的现状描述与 v2.21.11 仓库一致。
- ✅ 每个后续任务都能映射到明确文件、脚本或 workflow。

工作量：0.5 天。

#### 0.2 Keywords 脚本规范修复（已完成）

> v2.21.11 现状：`fix:keywords` 已改为 `node scripts/validate/keywords.mjs`，与 `audit:keywords` 等价，只审计不写入。

目标：修复脚本语义，避免误触发关键词批量写入。

已完成：
- `package.json` 中 `fix:keywords` 已与 `audit:keywords` 完全一致。
- `keywords.mjs` 不再通过兼容别名产生写入行为。

落点：`package.json`。

验收：
- ✅ `npm run fix:keywords` 与 `npm run audit:keywords` 行为一致，只审计不写入。
- ✅ `npm run validate:data` 通过。

工作量：0.5 天。

---

### Phase A（P0）：内容质量治理 + 自动化回归网

> 目标：消除内容质量断层，建立自动化回归保障。这是"完善性"最直接的提升。

#### A1. 引用 URL 可达性检测增强（已完成第一阶段）

> v2.21.11 现状：已新增 `audit:references-health`，全量检测 2517 个唯一引用链接并输出 `research/search-reports/reference-health.json/.md`；审计脚本区分 ok/review/broken/timeout/connection_error，已将 403/412/429/521 等防护或权限类状态归为 review，避免反爬误判为 broken；首轮 broken 已清理至 0。当前剩余待治理：review 152、timeout 150、connection_error 66，其中大量为反爬、微信、学术库、站点防护或偶发网络问题，需分域名/分类型复核。

目标：引用可达性可批量检测、可周期性审计、坏链可追踪。

已完成：
- 新增 `scripts/validate/references-health.mjs` 和 `npm run audit:references-health`，输出结构化 JSON 与 Markdown 报告。
- 使用 fetch + Playwright/Chrome 对 412/521 等疑似反爬状态做抽样复核，明确其进入 review 而非 broken。
- 修复首批真实 404 引用：AT0083、TA0049、AT0084、TA0050、R0211、R0217、R0218、A0006-005。
- 清理剩余真实 broken 引用：C1423、C0412、C1389、C1145、C0693、C1131、C1542、AT0034、TA0045、A0043、AT0039-001、A0048、A0046、R0064。
- 全量复扫确认 `broken: 0`。

剩余工作：
- 增强 `link-check.yml`：调用可达性检测脚本，失败建 Issue（含坏链明细 + 去重）。
- 对 review/timeout/connection_error 按域名批次治理：优先官方源和高价值案例，反爬类用 Playwright/Chrome 复核后标注或替换。
- 对 `mps.gov.cn`、`mp.weixin.qq.com`、ACM、OWASP cheatsheet 等慢站点建立域名级策略，减少重复噪声。

落点：`scripts/validate/references-health.mjs`（新增或改造）、`.github/workflows/link-check.yml`、受影响实体 JSON。

验收：
- ✅ `audit:references-health` 可批量检测 2517 个唯一引用链接并输出报告。
- ✅ 首轮真实 broken 清理至 0。
- ⏳ link-check Issue 含坏链明细且去重。
- ⏳ review/timeout/connection_error 分批复核策略落地。

工作量：第一阶段已完成；link-check 去重与待复核链接治理预计 2-4 天。

#### A2. influence 字段去模板化（已完成）

> v2.21.11 现状：风险 influence 模板化已清零，`audit:content-quality` 显示 `zhGenericInfluence: 0`、`enGenericInfluence: 0`。

目标：每条 Risk 的 influence 反映其具体影响，无批量复制。

已完成：
- 批量识别并修复模板化 influence。
- 同步英文 i18n influence。
- 新增 `audit:content-quality`，持续输出 generic influence 指标。

落点：`src/BREAK/risks/*.json`、`src/i18n/en/BREAK/risks/*.json`。

验收：
- ✅ 重复/通用 influence 风险数为 0。
- ✅ validate:data 通过。

工作量：已完成；后续通过 `audit:content-quality` 防回归。

#### A3. 后期风险内容质量补强（已完成）

> v2.21.11 现状：风险 definition==description 和单关键词问题已清零，`audit:content-quality` 显示 `zhDefinitionEqualsDescription: 0`、`zhSingleKeyword: 0`、`enDefinitionEqualsDescription: 0`、`enSingleKeyword: 0`。

目标：后期风险内容深度与早期一致。

已完成：
- 新增内容质量审计脚本，持续扫描 risk def==desc、单关键词、generic influence 和案例单源率。
- 修复 R0193-R0255 等后期风险 description、keywords、influence。
- 补齐 R0160-R0192 英文风险关键词。
- 同步英文 i18n。

落点：`src/BREAK/risks/R0196*.json` 及其它低质量风险、`src/i18n/en/BREAK/risks/`。

验收：
- ✅ 0 条 def==desc 风险。
- ✅ 0 条单关键词风险。
- ✅ audit:keywords + validate:data 通过。

工作量：已完成；后续通过 `audit:content-quality` 防回归。

#### A4. 案例来源质量分级与 primary source 补强（已完成第一阶段）

> v2.21.13 现状：案例多源化已完成两批小规模治理，为 C0010、C0012、C0014、C0032、C0046、C0090、C0106、C0139、C0162、C0168、C0201、C0210、C0275 补充多源。进一步复盘后，将 A4 从“提高全量多源率”调整为“来源质量分级 + 高价值案例 primary source 补强”：外部链接长期都会失效，单纯追求多源率会变成无止境维护。`singleSourceCases: 1784`、`singleSourceCaseRate: 99.28%` 继续作为观察指标，但不作为全量 KPI。第一阶段已新增 `audit:case-source-quality`，可按来源等级统计高价值案例 primary 覆盖率和待复核清单；当前审计基线为 `caseCount: 1797`、`highValueCaseCount: 1079`、`primaryCoveredCases: 487`、`highValuePrimaryCoveredCases: 202`、`highValuePrimaryCoverageRate: 18.72%`。

目标：高价值案例具备可信 primary source 或明确的来源质量标记；普通长尾案例不强制补多源。

方案：
- 为 references 增加或外部维护来源质量分级（第一阶段已在审计报告中派生）：`primary`（法院/公安/检察院/监管/厂商公告/论文/CVE/NVD/GitHub 原始仓库）、`secondary`（可信媒体/安全厂商分析）、`mirror`（转载/备份）、`weak`（低可信或易失来源）、`unknown`（规则无法可靠判定，需人工复核或扩充域名规则）。
- 高价值案例优先补 primary source：`criminal_verdict` 优先法院/检察院/公安/裁判文书；`security_incident` 优先厂商公告、链上分析、官方通报；`vulnerability_advisory` 优先 CVE/NVD/厂商安全公告/论文。
- 普通长尾案例保持单源可接受；若只有 secondary/weak 来源，标记为 `secondary_only` 或 `weak_source`，进入待复核队列，而不是强制补第 2-3 条引用。
- 引用健康审计只做发现和分级，不追求永久 `broken=0`；坏链修复优先级由案例价值和来源等级决定。
- 同步英文 title；若后续 schema 增加 `references[].sourceType`，英文 i18n 不维护结构字段。

落点：`scripts/validate/case-source-quality.mjs`、`research/search-reports/case-source-quality.*`、后续高价值补源涉及的 `src/BREAK/cases/*.json` 与 `src/i18n/en/BREAK/cases/*.json`。

验收：
- ✅ 首批 13 个案例完成多源化并同步英文 title。
- ✅ 来源质量分级规则已落地到审计报告，schema 暂不扩展。
- ✅ 高价值案例中 `primary` 覆盖率可统计。
- ✅ `secondary_only` / `weak_source` / `unknown_only` 案例可被质量报告或待复核清单追踪。
- ⏳ 核心高价值案例按审计清单分批补 primary source。
- ✅ validate:data + i18n-sync 通过。

工作量：来源分级脚本已完成；高价值案例 primary source 补强预计 4-6 天（分批，可并行）。

#### A5. 自动化回归网建立（已完成第一阶段）

> v2.21.11 现状：5 个 Playwright/Lighthouse 脚本已接入自动化链路；PR CI 新增 `browser-regression` job，运行 `test:smoke`、`test:performance`、`test:relation-stability`；Deploy 接入 `test:lighthouse` 与 `audit:lighthouse-sankey`，并按相关前端/关系页/构建脚本变更条件运行。`.vue` 单测已破零，新增 6 个关键组件测试，当前 20 个测试文件 / 141 条测试。`vitest.config.ts` 覆盖率 include 已扩展到 `src/composables/**/*.ts`、`src/views/relation/**/*.ts` 和关键 `.vue` 组件，当前扩大范围后的基线约为 lines 45.43%、statements 44.24%、functions 43.96%、branches 43.18%。`audit:lighthouse-sankey` 曾在 CI 输出报告后卡住，已通过显式退出修复。

目标：建立分层回归网，防 UI/性能/关系图谱回归。

已完成：
- **CI 接入轻量 e2e**：`site-smoke`、`site-performance`、`relation-stability` 已进入 PR `browser-regression` job，当前 `continue-on-error`。
- **Lighthouse 性能基线**：`lighthouse-baseline`、`lighthouse-sankey` 已进入 Deploy，按相关代码变更条件运行；手动 `workflow_dispatch` 强制运行。
- **.vue 关键组件单测**：已引入 `@vue/test-utils`，覆盖 `KnowledgeSplitView`、`EntityLinkSection`、`RiskDetail`、`AvoidanceDetail`、`RelationSelectorBar`、`RelationNodeDetailDrawer`。
- **覆盖率 include 扩展**：已扩展到 composables、relation 模块和关键 `.vue` 组件，并建立 40% 初始阈值。
- **浏览器审计稳定性**：修复 `lighthouse-sankey-trace.mjs` 输出报告后 CI 卡住的问题。

剩余工作：
- 浏览器回归稳定观察 1-2 个版本后，将 `site-smoke` 优先转 hard fail；`relation-stability` 和 Lighthouse 继续按稳定性逐步收紧。
- 继续补 `RelationView`、`HomeView`、关系图控制器和视图模型测试，逐步提高覆盖率阈值。
- **link-check Issue 去重**：失败建 Issue 前查已存在同标题 Issue（与 A1 引用可达性增强一起做）。

落点：`.github/workflows/ci.yml`、`.github/workflows/deploy.yml`、`vitest.config.ts`、`package.json`（加 @vue/test-utils）、新增 `src/views/relation/__tests__/` 组件测试。

验收：
- ✅ site-smoke + site-performance + relation-stability 在 PR CI 运行（continue-on-error）。
- ✅ lighthouse-baseline + lighthouse-sankey 在 Deploy 条件运行，手动触发强制运行。
- ✅ 至少 5 个 .vue 组件有单测（当前 6 个关键组件）。
- ✅ 覆盖率 include 已扩展且初始阈值达标。
- ⏳ link-check Issue 去重待 A1 一并完成。

工作量：第一阶段已完成；浏览器回归 hard fail、补测和 link-check 去重预计 2-3 天。

#### A6. 前端可消费质量报告 JSON（已完成第一阶段）

> v2.21.16 现状：已新增 `scripts/validate/quality-report.mjs` 和 `npm run audit:quality-report`，`npm run export:data` 会生成 `public/data/quality-report.json` 并在 manifest 中记录 hash/bytes；`validate:data-export` 和 npm 数据包评估产物已纳入该文件校验。报告结构稳定为 `weakRelations`、`missingCoverage`、`sceneIssues`、`i18nIssues`、`generatedAt`、`summary`，当前基线四类问题均为 0。前端已新增 `relationQualityReport.ts` 类型与加载入口，B6 可直接消费。

目标：将审计关键问题转为稳定 JSON，供关系页高亮和列表消费。

已完成：
- 新增脚本生成 `public/data/quality-report.json` 和 `research/search-reports/quality-report.json`，结构包含 `weakRelations`、`missingCoverage`、`sceneIssues`、`i18nIssues`、`generatedAt`、`summary`。
- 前端新增 `RelationQualityReport` 类型和 `loadRelationQualityReport()`，后续质量治理视图只消费静态报告结果，不在运行时重新执行重型审计逻辑。
- 报告生成纳入 `export:data`，并由 `validate:data-export` 校验 public/dist 同步、manifest hash、bytes 和四类数组契约。
- npm 数据包评估产物同步包含 `data/quality-report.json`、运行时导出和类型声明，避免 manifest 指向不存在的文件。

剩余工作：
- B6 中接入关系页质量治理列表、节点/边高亮和点击定位。
- 若 A1 引用健康报告后续也要进入前端，需要扩展质量报告的 `references`/`missingReference` 维度。

落点：`scripts/validate/`（新增质量报告生成脚本或扩展 metrics.mjs/maintenance.mjs）、`public/data/quality-report.json`、`src/views/relation/`（消费方）。

验收：
- ✅ `public/data/quality-report.json` 含四分类稳定结构。
- ✅ 前端已有类型和加载入口，可用于节点/边标记和列表。
- ✅ 报告随数据变化自动刷新（`export:data` / build 链）。
- ⏳ 关系页质量治理 UI 待 B6 完成。

工作量：第一阶段已完成；B6 前端消费预计 4-5 天。

---

### Phase B（P1）：知识模型完善 + 工程债清理

> 目标：补齐知识模型短板，清理工程债。在 Phase A 回归网保障下进行。

#### B1. 风险间关联建模

> 现状：Risk 之间无 prerequisite/co-occurrence/escalation 关系（如 R0001 流程自动化常伴随 R0005 设备指纹绕过），攻击路径只能靠 ThreatActor 串联，图谱推理深度受限。ATT&CK/D3FEND 有技术间关系。

目标：支持风险间关联，增强图谱推理。

方案：
- Schema 扩展：Risk 增加可选 `relatedRisks: { key, relation, note }[]`（relation 枚举：prerequisite/co-occurrence/escalation/variant）。
- 在 relationGraphBuilder 增加风险间边渲染。
- 校验脚本：relations.mjs 增加风险间关联的 dangling/双向一致性检查。
- 先小范围试点（10-20 条高价值关联），验证价值再扩展。

落点：`src/validation/breakSchema.ts`、`src/BREAK/risks/*.json`、`src/views/relation/relationGraphBuilder.ts`、`scripts/validate/relations.mjs`。

验收：
- Schema 支持风险间关联。
- 至少 20 条关联录入并校验通过。
- 关系图谱能渲染风险间边。

工作量：3-4 天。

#### B2. Avoidance category 枚举化 + 量化有效性

> 现状：Avoidance 的 category 是自由字符串（schema 仅 nonEmptyString），靠 avoidanceCategories.json 约定 AC01-AC04 但 schema 不约束，存在漂移风险。limitation 是定性描述，无量化有效性评级，无法支撑"优先部署哪个规避"决策。

目标：category 枚举强约束，有效性可量化排序。

方案：
- Schema：avoidanceSchema.category 改为 `z.enum`（与 risk.complexity 一致），值来自 avoidanceCategories。
- Avoidance 增加可选 `effectiveness: "high" | "medium" | "low"`（定性三级，不伪造精确分数，遵循"不伪造置信度"原则）。
- 校验：category 必须在枚举内。
- 关系页防御覆盖分析消费 effectiveness，排序展示。

落点：`src/validation/breakSchema.ts`、`src/BREAK/avoidances/*.json`、`src/views/relation/relationCoverageAnalysis.ts`。

验收：
- category 枚举强约束，0 漂移。
- effectiveness 字段录入（可分批）。
- 防御覆盖按 effectiveness 排序。

工作量：3-4 天。

#### B3. i18n-sync 字段级校验 + 英文结构字段清理

> 现状：`validate:data` 已执行 `i18n-sync.mjs --strict`，但 strict 目前只比对实体 ID 集合，不校验字段级对应；terms 英文文件可能携带 relatedRisks/updated 等结构字段（违反"英文仅含翻译文本"约定）却仍可判同步通过。mergeWithStructure 双份实现（TS + JS）有漂移风险。

目标：i18n-sync 字段级严格校验，英文文件干净。

方案：
- 增强 `i18n-sync.mjs --strict`：除 ID 集合外，校验英文文件不携带结构字段（ID 数组/link/updated/关系字段），只含可翻译文本。
- 先审计所有英文 i18n 文件，确认多余结构字段范围，再批量清理（脚本 + 人工复核）。
- mergeWithStructure 统一为单一实现（JS 版 import TS 版，或抽公共）。
- CLAUDE.md 的"key 结构必须完全对应"约定与脚本一致。

落点：`scripts/validate/i18n-sync.mjs`、`src/i18n/en/BREAK/terms/*.json`、`src/i18n/index.ts`。

验收：
- i18n-sync --strict 校验英文无结构字段。
- 英文 i18n 文件多余结构字段清理完成。
- mergeWithStructure 单一实现。

工作量：2-3 天。

#### B4. 关系页工程债清理

> 现状：relationAttackPath.ts 1155 行过大（路径构建/解释/Sankey/覆盖/过滤全挤一个文件）；relationExplanation.ts 四函数（getRelationSourceFields/getRelationExplanationText/getRelationImpactHint/getRelationEvidenceLevel）对同一组 lineKey 各写一遍 switch/if，应收敛为数据驱动配置表；Node.type/GraphNode.type 是 string 而非 RelationType 联合（多处 as 断言）；useSearch watch(cases, deep:false) 潜在失效 bug；useCases watch(locale) 每次调用重复注册。

目标：关系页可维护性提升，潜在 bug 修复。

方案：
- 拆分 relationAttackPath.ts：路径构建 / 路径解释 / Sankey 数据 / 覆盖汇总 / 过滤器分文件。
- relationExplanation.ts 四函数收敛为单一数据驱动配置表（lineKey → {sourceFields, explanation, impactHint, evidenceLevel}）。
- Node.type/GraphNode.type 改为 RelationType 联合，消除 as 断言。
- 核实并修复 useSearch watch(cases, deep:false)：若 useCases 原地 mutate 引用不变，改为 deep:true 或显式触发；或 useCases 改为替换引用。
- useCases watch(locale) 提到模块级单次注册。

落点：`src/views/relation/relationAttackPath*.ts`（拆分）、`src/views/relation/relationExplanation.ts`、`src/views/relation/relationTypes.ts`、`src/composables/useSearch.ts`、`src/composables/useCases.ts`。

验收：
- relationAttackPath 拆分后单文件 ≤ 400 行。
- relationExplanation 配置表化，四函数合一。
- Node.type 强类型，as 断言减少。
- useSearch 案例索引刷新 bug 修复（有测试覆盖）。
- 125 测试全过。

工作量：4-5 天。

#### B5. CI 优化

> 现状：ci.yml 与 deploy.yml 13 步完全重复（PR 一遍 + main push 一遍）；CI 全串行单 job；link-check workflow 已存在但 Issue 不去重、body 不含坏链明细；PR CI 无 concurrency 取消旧 run。

目标：CI 提效，去重复。

方案：
- ci.yml 加 `concurrency` 取消旧 PR run。
- lint/type-check/test 与 build 拆并行 job（无依赖部分）。
- deploy.yml 与 ci.yml 抽取可复用 workflow 或复用统一校验 job，避免重复维护同一组命令。
- link-check Issue 去重 + body 含坏链明细。

落点：`.github/workflows/ci.yml`、`.github/workflows/deploy.yml`、`.github/workflows/link-check.yml`。

验收：
- CI run 时间减少 ≥ 30%。
- deploy 不重复跑校验。
- link-check Issue 去重。

工作量：2 天。

#### B6. 质量治理前端视图（含节点质量提示）

> 现状：无质量治理组件、无质量问题状态、无"仅看 X"筛选、无从列表定位图谱节点。节点级有零散覆盖缺口提示（RelationNodeCoverageBlock），但非列表视图 + 图谱定位。节点详情缺"缺引用"维度，"弱关系"未节点级化，不消费审计报告（仅运行时按关系推导）。依赖 A6 质量报告 JSON。

目标：让维护者在可视化页面直接看到数据质量问题，定位到图谱节点/关系；节点详情显示完整质量提示。

方案：
- 新增质量治理列表组件（如 RelationQualityPanel），展示弱关系、缺覆盖、场景异常、i18n 异常。
- 前端加载质量报告 JSON（A6）后，在图谱中标记相关节点和边。
- 增加"仅看待复核关系""仅看缺覆盖风险""仅看场景异常""仅看 i18n 异常"筛选。
- 支持从问题列表点击定位到图谱节点/关系边/分析解读详情。
- 节点详情补全质量提示：补充"缺引用"维度（references 质量从审计报告读取），"弱关系"作为节点级提示，统一质量标记体系。
- 质量标记体系（统一稳定 key）：missingRelation / weakRelation / missingAvoidance / sceneIssue / i18nIssue。

落点：`src/components/relation/`（新增 RelationQualityPanel / RelationIssueList）、`src/views/relation/relationViewState.ts`、`src/views/relation/useRelationViewModel.ts`、`src/components/relation/RelationFilterPanels.vue`、`src/components/relation/RelationNodeDetailDrawer.vue` / `RelationNodeAnalysisBlock.vue`、`src/views/relation/relationGraphInsights.ts`、`src/views/relation/relationQualityFlags.ts`（新增）。

验收：
- 审计报告可被前端消费（依赖 A6）。
- 质量问题可从列表定位到图谱节点。
- 五种质量标记作为统一 key 在节点/边展示。
- 节点详情显示"弱关系/缺引用/缺关联/待复核"四类完整提示，来源含审计报告。

工作量：4-5 天。

#### B7. 任务型分析视角切换

> 现状：RelationSelectorBar 只有关系类型下拉和实体 key 下拉，无视角切换；viewModel/state 无 perspective 概念；src 内 0 处视角切换代码（grep "perspective|视角" 仅命中内容数据文案）。

目标：从单一实体中心图，升级为面向任务的分析视角。

方案：
- 在 RelationSelectorBar 增加视角切换控件。
- 每个视角定义默认节点类型、默认关系类型、默认布局和解释模板。视角：风险视角（Risk/AttackTool/ThreatActor/Avoidance）、攻击者视角（ThreatActor/use-build 工具/造成风险）、防御视角（Avoidance/Risk/AttackTool/覆盖缺口）、薄弱关系视角（weak relation/missing coverage/review flags）。
- 将质量报告（A6）和 audit:metrics/relations 关键结果转成前端可消费数据。
- 对薄弱关系视角提供列表 + 图谱高亮。

落点：`src/components/relation/RelationSelectorBar.vue`、`src/components/relation/RelationFilterPanels.vue`、`src/views/relation/useRelationViewModel.ts`、`src/views/relation/relationViewState.ts`、`public/data/quality-report.json`（A6 产物）。

验收：
- 用户可选择至少 3 个分析视角：风险、攻击路径、防御覆盖。
- 不同视角有不同默认筛选和说明。
- 视角切换不破坏现有 URL 路由和实体跳转。

工作量：3-4 天。

---

### Phase C（P2）：可视化算法升级 + 标准化

> 目标：从"解释型"走向"推理型"，对标 BloodHound/ATT&CK。工程量最大，在 Phase A/B 基础上推进。

#### C1. 图算法路径发现（已完成第一阶段）

> v2.21.11 现状：已新增通用 `findRelationPaths` BFS 路径发现模块，支持任意起止节点、限定跳数、最大路径数、方向图/无向图和关系优先级排序；节点分析层已接入可达路径摘要。预定义 TA→AT→Risk→Avoidance 攻击路径仍保留，用于标准四元组解释。

目标：支持任意两节点间的路径发现与可达性分析。

已完成：
- 自实现 BFS 路径发现，限定 `maxDepth` / `maxPaths` 防止路径爆炸。
- 支持无向可达性和方向图路径发现。
- 支持按关系优先级稳定排序。
- 与现有预定义攻击路径并存，节点分析可消费算法发现的多路径摘要。

剩余工作：
- 新增显式"路径发现"交互面板，支持用户选择任意起止节点并切换排序策略。
- 在 UI 中展示完整多路径列表，而不是只在节点分析中提示摘要。

落点：`src/views/relation/relationPathDiscovery.ts`、`src/views/relation/relationGraphInsights.ts`，后续可新增 `src/components/relation/RelationPathExplorer.vue`。

验收：
- ✅ 任意两节点可发现路径（限定跳数）。
- ✅ 路径排序可用。
- ✅ 不破坏现有预定义攻击路径。
- ⏳ 完整路径发现交互面板待后续迭代。

工作量：第一阶段已完成；交互面板预计 2-3 天。

#### C2. 力导向布局（已完成第一阶段）

> v2.21.11 现状：ECharts graph 已使用 `layout: "force"`；数据层不再复用 radial 初始坐标，改为按实体类型分区、关系度数拉近中心的 force 初始布局。horizontal/lanes/split/radial/hierarchical 仍作为固定布局保留。

目标：真正的力导向布局，大规模图自适应。

已完成：
- 继续使用 ECharts 原生 graph force，避免额外引入 d3-force 依赖。
- `relationNetworkLayout.ts` 新增 force 专用初始布局，不再调用 radial。
- 高连接节点在初始状态更靠近中心，低连接节点按类型分区外展。
- 单测锁定 force 与 radial 坐标不同、未拖拽节点在 force 中保持可移动。

剩余工作：
- 大规模图默认策略与性能预算仍需通过 relation-stability / performance 基线继续校准。
- 补充截图对比和大图可读性指标。

落点：`src/views/relation/relationNetworkLayout.ts`、`src/views/relation/relationNetworkChartController.ts`。

验收：
- ✅ force 布局为真力导向（ECharts force）。
- ✅ force 初始布局不再复用 radial，并有单测覆盖。
- ⏳ 大规模图截图对比和性能预算待后续回归基线补充。

工作量：第一阶段已完成；性能基线与截图对比预计 1-2 天。

#### C3. 动态解释生成（已完成第一阶段）

> v2.21.11 现状：关系解释新增 `semanticExplanation`，会把关系两端实体标题、ID 和关系类型注入说明；连线信息已合并到 hover tooltip，点击连线不再打开重复的右下角详情面板。原 `explanation` 模板保留用于抽象关系说明。

目标：解释文本结合具体实体语义，非纯模板。

已完成：
- 关系解释模板增加实体变量插值，输出如"攻击工具 A 被记录为会直接造成风险 B"。
- 中英文 i18n 同步补齐 `semanticExplanation`。
- hover tooltip 优先展示实体语义说明，点击连线不再打开重复的右下角详情面板；原模板说明保留作兼容字段。

剩余工作：
- 从 AttackTool/Risk 描述与关键词中抽取 method/action，进一步生成"通过某手法造成某风险"级别解释。
- 攻击路径 `attackIntent` / `defensiveMeaning` 仍可继续升级为实体语义驱动。

落点：`src/views/relation/relationAttackPath.ts`、`src/views/relation/relationExplanation.ts`、`src/i18n/`。

验收：
- ✅ 单条关系解释含具体实体语义（非纯模板）。
- ✅ 中英文同步。
- ✅ 解释准确性可回到实体 ID、标题和来源字段。
- ⏳ 攻击路径步骤级 method/action 抽取待后续迭代。

工作量：第一阶段已完成；method/action 抽取和攻击路径解释升级预计 2-3 天。

#### C4. 标准化与互操作（STIX/版本化）

> 现状：updated 是单日期，无字段级变更历史、无 STIX/JSON-LD 标准化表示，限制与外部威胁情报平台（SIEM/CTI）互操作。ATT&CK 有 STIX 表示与版本号。

目标：支持标准化导出，提升互操作。

方案：
- 评估 STIX 2.1 映射（Risk→vulnerability/custom、Avoidance→course-of-action、AttackTool→tool、ThreatActor→intrusion-set）。
- 新增 `export:stix` 脚本，生成 STIX bundle。
- 实体增加可选 `version` 字段（语义化版本，如 1.0.0）。
- 变更日志可追溯（CHANGELOG 已有，可结构化）。

落点：`scripts/validate/export-stix.mjs`（新增）、`src/validation/breakSchema.ts`。

验收：
- `export:stix` 生成合法 STIX 2.1 bundle。
- 实体有 version 字段。
- STIX bundle 可被标准 STIX 解析器读取。

工作量：5-7 天。

#### C5. 业务场景图谱（可选）

> 现状：首页已有业务场景矩阵（场景→风险维度→风险场景→风险）+ `/business-scene/:bsKey` 路由，从业务场景看风险已能做。本项为"从 BusinessScene/RiskScene 进入解释型关系图谱"，价值有限，列为可选探索。

目标：支持从业务场景进入解释型关系图谱（非必做，首页矩阵已覆盖核心需求）。

方案：
- 新增 `relationBusinessSceneGraph.ts` 生成业务场景图谱数据。
- 新增 `/relation/business-scene/:bsKey` 路由，首页矩阵可进入。
- 展示 BusinessScene → RiskDimension → RiskScene → Risk → AttackTool/Avoidance。
- 补充 `relationBusinessSceneGraph.test.ts`。
- 约束：不在 Risk 实体维护 relatedBusinessScenes，中文业务场景为结构权威。

落点：`src/views/relation/relationBusinessSceneGraph.ts`（新增）、`src/views/relation/relationGraphBuilder.ts`、`src/views/relation/relationTypes.ts`、`src/router/index.ts`、`src/views/HomeView.vue`。

验收：
- 用户能从业务场景进入对应风险图谱。
- 业务场景视图能解释该场景主要风险暴露面。
- `relationBusinessSceneGraph.test.ts` 通过。

工作量：4-5 天。

---

## 3. 优先级矩阵

| 项 | 优先级 | 工作量 | 收益 | 依赖 |
|---|---|---|---|---|
| 0.1 当前基线复核 | P0 前置 | 0.5d | 高（防偏航） | 无 |
| 0.2 Keywords 脚本规范修复 | P0 前置 | 0.5d | 高（防误写） | 无 |
| A1 引用可达性检测增强 | P0 | 已完成第一阶段，剩余 2-4d | 高（最易补） | Phase 0 |
| A2 influence 去模板化 | P0 | 已完成 | 高 | 无 |
| A3 后期风险补强 | P0 | 已完成 | 高 | 无 |
| A4 案例来源质量分级 | P0 | 已完成方向调整，剩余 4-6d | 中高 | A1/A6 |
| A5 自动化回归网 | P0 | 已完成第一阶段 | 高（防回归） | Phase 0 |
| A6 质量报告 JSON | P0 | 已完成第一阶段 | 高（B6 前置） | 无 |
| B1 风险间关联 | P1 | 3-4d | 中 | A5 已就绪 |
| B2 Avoidance 枚举化 | P1 | 3-4d | 中 | 无 |
| B3 i18n-sync 字段级 | P1 | 2-3d | 中 | 无 |
| B4 关系页工程债 | P1 | 4-5d | 中高 | A5 已就绪 |
| B5 CI 优化 | P1 | 2d | 中 | 无 |
| B6 质量治理前端视图 | P1 | 4-5d | 高（治理闭环） | A6 |
| B7 任务型分析视角 | P1 | 3-4d | 中高 | A6 |
| C1 图算法路径发现 | P2 | 已完成第一阶段，剩余 2-3d | 高（上台阶） | B4 |
| C2 力导向布局 | P2 | 已完成第一阶段，剩余 1-2d | 中高 | A5 已就绪 |
| C3 动态解释生成 | P2 | 已完成第一阶段，剩余 2-3d | 中高 | B4 |
| C4 STIX 标准化 | P2 | 5-7d | 中（互操作） | 无 |
| C5 业务场景图谱 | P2 | 4-5d | 低（可选） | 无 |

**剩余工作量估算**：Phase 0 已完成，Phase A 剩余约 10-16 天，Phase B 约 21-26 天，Phase C 剩余约 12-17 天，合计约 43-59 天（可并行压缩；A1/A5 与 C1/C2/C3 第一阶段已完成，A2/A3 已完成，A4 已完成方向调整）。

## 4. 验收标准（整体）

升级完成后，BREAK 应达到：

| 维度 | 当前 | 目标 |
|---|---|---|
| 规划基线 | 基于 v2.21.11 校准，A1/A5 与 C1/C2/C3 第一阶段已回写状态，A2/A3 已完成 | 持续随版本更新校准 |
| Keywords 脚本 | 已与 `audit:keywords` 等价，只审计 | 保持不写入 |
| 引用可达性 | `audit:references-health` 已建立，broken=0；review/timeout/connection_error 待复核 | 周期审计 + 坏链追踪 + 分域名复核策略 |
| influence 模板化 | 0 条 | 保持 ≤ 2 条 |
| 后期风险关键词 | 单关键词 0 条 | 保持单关键词 ≤ 5，后期 avg ≥ 5 |
| 案例来源质量 | 13 个案例完成多源化，整体单源率 99.28%；尚无来源等级 | 高价值案例 primary 覆盖率可统计，secondary_only/weak_source 可追踪 |
| CI e2e 回归 | PR 已运行 site-smoke/site-performance/relation-stability（非阻断） | 稳定后逐步 hard fail |
| Lighthouse 回归 | Deploy 条件运行 lighthouse-baseline/lighthouse-sankey | 保持条件运行，关键回归 hard fail |
| .vue 单测 | 6 个关键组件，20 文件 / 141 测试 | 继续覆盖 RelationView/HomeView/控制器 |
| 覆盖率 include | composables + relation + 关键 .vue，初始阈值 40% | 阈值随测试增长逐步收紧 |
| 质量报告 JSON | 无 | 四分类稳定 JSON |
| 质量治理视图 | 无 | 列表 + 定位 + 五种标记 |
| 任务型视角 | 0 个 | ≥ 3 个视角 |
| 风险间关联 | 无 | ≥ 20 条 |
| Avoidance category | 自由字符串 | 枚举强约束 |
| i18n-sync | strict 已接入但仍为 ID 级 | 字段级 + 无结构字段 |
| relationAttackPath | 1155 行 | ≤ 400 行/文件 |
| 路径发现 | 已有 BFS 可达路径摘要 | 完整任意节点路径发现面板 |
| 布局 | ECharts force + 度数感知初始布局 | 大图默认策略 + 性能/截图基线 |
| 解释 | 单条关系已支持实体语义说明 | 攻击路径步骤级 method/action 解释 |
| STIX 导出 | 无 | 合法 STIX 2.1 |
| 业务场景图谱 | 无（首页矩阵已有） | 可选：从场景进关系图 |

工程验收（不可回退）：type-check / validate:data / 141+ 测试 / build 通过；类型安全不降级（零 any）；构建门禁不削弱。

## 5. 风险与约束

| 风险 | 说明 | 应对 |
|---|---|---|
| 内容治理工作量大 | A4 高价值案例仍需逐条核实 primary source | LLM/搜索辅助候选，人工复核；不追求全量多源，按来源等级和案例价值排序 |
| 外部链接长期失效 | 追求所有链接永久可访问会变成无止境维护 | 接受链接会坏；引用审计做发现和分级，优先维护 primary/high-value 来源 |
| 回归网引入 CI 不稳定 | e2e/像素断言和 Lighthouse 易抖动；桑基审计曾出现输出后进程不退出 | 已先 continue-on-error / 条件运行；`lighthouse-sankey` 已显式退出；稳定后转 hard fail；fixture 固定 |
| Schema 扩展破坏既有数据 | B1/B2 改 schema | 可选字段优先；校验脚本同步；渐进迁移 |
| 可视化算法性能 | C1/C2 图算法/力导向对大规模图耗时 | 限定跳数/节点数；性能基线；按需计算 |
| 标准化映射损失语义 | C4 STIX 映射可能不完整 | custom 对象保留 BREAK 特有字段；不强制全量映射 |
| 升级周期长 | 44-60 天剩余工作量 | 分阶段独立交付；每阶段可单独验证；不阻塞线上 |

## 6. 执行建议

1. **Phase 0 已完成主要校准**：`fix:keywords` 已修正，v2.21.11 基线已回写；后续每个阶段完成后继续更新本计划。
2. **Phase A 下一步优先 A6 + A4 来源质量分级，A1 做待复核闭环**：A1/A5 第一阶段已完成，A2/A3 已完成；A6（质量报告 JSON）为 B6 前置，A4 不再追求全量多源率，而是建立 source quality 规则和高价值案例 primary 覆盖；A1 后续重点是 link-check Issue 去重和 review/timeout/connection_error 分批复核。
3. **内容治理并行推进**：A4 可按案例类别和来源等级分批并行；涉及 `src/BREAK/` 数据时必须同步英文 i18n 并跑 `audit:keywords` / `validate:data`。
4. **Phase B 可在现有 A5 回归网保护下启动**：B1/B4 改关系页已有 smoke/performance/relation-stability/组件单测基础保障；B3/B5 可较早独立推进。
5. **Phase C 按价值排序**：C1（路径发现）价值最高，C2（力导向）次之，C3（动态解释）依赖 B4，C4（STIX）互操作价值取决于是否有外部消费方。
6. **每项独立 PR**：便于 review 和回滚，husky pre-commit + CI 门禁保障。
7. **内容治理可借 LLM/搜索但必须人工复核**：A2/A3 已完成；A4 只用 LLM/搜索生成候选来源和英文标题，不自动认定来源等级，primary/secondary/weak 必须按页面事实人工确认。

## 7. 规划整合说明

原 `VISUAL_ANALYSIS_EXPLAINABILITY_PLAN.md`（关系页专项未完成项：质量报告 JSON / 质量治理视图 / 任务型视角 / 业务场景图谱）已整合进本计划，分别对应 A6 / B6 / B7 / C5，该独立文件已删除并移除 git 跟踪。本计划现为 BREAK 框架唯一的升级规划，统一管理内容质量、回归网、知识模型、工程债、可视化算法、标准化各维度。

本计划完成后，BREAK 从"先进且工程成熟"走向"完善"，评估分目标 4.3 → 4.7+。
