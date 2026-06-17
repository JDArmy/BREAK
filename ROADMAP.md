# BREAK 项目进化路线图

> 文档版本：2.7 | 最后 Review：2026-06-17 | 当前项目版本：2.14.2 | 状态：Phase A/B/C 基线能力已完成，Phase D 静态数据、npm 数据包评估、贡献模板和变更日志规范已完成初版；移动端 Lighthouse 已完成两轮首屏减负（最近一轮 mobile/home LCP 6.8s、mobile/risks 5.6s、mobile/relation-sankey 6.7s），当前主要剩余项是继续压低移动端 Sankey TBT 和长期内容映射。

---

## 1. 当前结论

BREAK 已经完成了早期路线图中的大部分基础建设：数据质量修复、搜索、暗色主题、CI/CD、Schema 校验、ECharts 关系图谱和攻击路径视图都已经落地。关系页实现也已从单文件堆叠演进为 builder/controller/state/effect 拆分结构，并补上了首批图谱单元测试。继续保留旧的 Phase 1/2 任务清单会降低路线图可读性，因此本文件只保留当前状态和后续演进计划。

下一步不应再追求“堆更多图表”或“重做基础页面”，而应围绕四件事推进：

| 方向 | 为什么现在做 | 目标 |
|------|--------------|------|
| 内容可信度 | 数据量已经较大，维护成本和参考资料质量比新增字段更关键 | 让每条数据的来源、关系和变更都可审计 |
| 分析能力 | 关系网络和攻击路径已可视化，但展示型 Dashboard 价值有限 | 用检测脚本和报告回答覆盖率、路径、类别和场景层面的分析问题 |
| 维护效率 | 编辑器、CI、数据脚本和贡献模板已落地，后续重点是持续执行审核规则 | 降低新增/更新实体的出错率 |
| 性能基线 | ECharts 和全量数据已进入项目，已有测量基线；移动端首屏已拆分搜索弹窗、英文 BREAK、首页详情抽屉和关系页 ECharts 预载 | 持续提高 Lighthouse 移动端体验和运行时稳定性 |

---

## 2. 当前状态快照

### 2.1 数据规模

| 实体 | 主条目 | 子条目 | 总计 |
|------|--------|--------|------|
| Risk | 255 | 95 | 350 |
| Avoidance | 222 | 78 | 300 |
| AttackTool | 97 | 13 | 110 |
| ThreatActor | 61 | 9 | 70 |
| Term | 600 | 0 | 600 |
| BusinessScene | 18 | 0 | 18 |
| AvoidanceCategory | 4 | 0 | 4 |

参考资料总量：1068 条（以 `npm run audit:metrics` 的 reference 口径为准，统计 Risk/Avoidance/AttackTool/ThreatActor 四类参考实体）。当前 `npm run validate:data` 可通过 Schema 校验、中英文 key 同步检查和关系覆盖审计；`npm run audit:maintenance` 会在 `research/search-reports/` 下刷新统一维护汇总。

### 2.2 已具备能力

| 能力 | 当前状态 |
|------|----------|
| 数据质量 | Zod Schema、交叉引用测试、i18n key 同步、参考链接健康检查脚本 |
| 搜索 | Fuse.js 全局搜索，支持中英文、Cmd/Ctrl+K、分组结果、跳转 |
| 知识浏览 | 首页业务场景矩阵，四类实体左右分栏，局部搜索，详情关联跳转 |
| 关系图谱 | ECharts Graph，支持横向链路、泳道、左右分栏、放射布局，缩放、刷新、全屏、PNG 下载，节点详情抽屉可展示根节点路径、关系来源字段和预览统计 |
| 攻击路径 | ECharts Sankey，支持按当前实体生成 ThreatActor -> AttackTool -> Risk -> Avoidance 链路，按 ThreatActor/AttackTool/Risk/Avoidance 继续筛选，展示单条路径详情和逐段来源字段/成立原因 |
| 主题 | 明亮/暗色/跟随系统，图谱颜色适配 |
| 工程化 | Vite、TypeScript、ESLint、Vitest、GitHub Actions、GitHub Pages；本地 build、CI、Deploy 已由 `docs-consistency` 校验同步 |
| 性能 | PC 端保留知识页和关系图积极预取；移动端搜索弹窗、关系页 ECharts 和次级视图预加载已按需/延迟处理；英文 BREAK 数据按语言设置加载；首页详情抽屉异步分包，降低首屏主线程竞争 |
| 数据维护 | 本地 editor 路由、Express 保存服务、PR checklist、数据变更 Issue 模板、CHANGELOG 分类要求 |
| 关系实现结构 | `RelationView` 已拆分为 `useRelationViewModel`、graph builder、insights、chart controller、state/effects 等模块；Sankey、root path、insight、布局和复杂图谱 Playwright 稳定性均已有回归覆盖 |

### 2.3 当前验证结果

| 命令 | 结果 |
|------|------|
| `npm run validate:data` | 通过 |
| `npm run audit:relations` | 生成关系覆盖报告 |
| `npm run audit:references` | 生成参考资料质量基线报告 |
| `npm run audit:metrics` | 生成内容可信度和分析指标基线报告；当前输出 0 个维护任务、0 个弱关系项、0 个业务场景异常 |
| `npm run audit:bundle` | 检查构建产物 bundle 预算；当前无超预算问题 |
| `npm run audit:maintenance` | 刷新基础审计并生成统一维护汇总 |
| `npm run test` | 7 个测试文件，91 个用例通过 |
| `npm run test:coverage` | 核心关系分析、搜索、安全 i18n 和数据工具覆盖率门禁通过 |
| `npm run validate:docs-build` | GitHub Pages `docs/` 构建产物与当前源码构建结果同步 |
| `npm run test:smoke` | Playwright 静态站 smoke 测试通过 |
| `npm run test:performance` | Playwright 静态站运行时性能预算通过 |
| `npm run test:relation-stability` | Playwright 复杂图谱稳定性测试通过，覆盖 5 个高关联实体和 6 种布局 |
| `npm run test:lighthouse` | Lighthouse 桌面/移动端基线通过 |
| `npm run validate:schema-docs` | `DATA_SCHEMA.md` 与 Zod Schema 同步 |
| `npm run schema:docs:write` | 从 Zod Schema 重新生成 `DATA_SCHEMA.md` |
| `npm run export:data` | 生成可通过 GitHub Pages 获取的静态数据包和 manifest |
| `npm run export:data-package` | 生成 `dist/break-data-package` npm 数据包评估产物 |
| `npm run validate:data-export` | 校验静态数据包、manifest hash、实体计数、版本号和 Pages 产物同步 |
| `npm run validate:data-package` | 校验 npm 包边界、运行时入口、类型声明、README、manifest hash 和版本一致性 |
| `npm run build` | 本地脚本包含 `npm run lint`、`npm run type-check`、`npm run validate:data`、`npm run test`、`npm run test:coverage`、`npm run validate:schema-docs`、`npm run validate:docs-build`、`npm run export:data`、`npm run export:data-package`、`npm run build-only`、`npm run audit:bundle:check`、`npm run validate:data-export`、`npm run validate:data-package`、`npm run test:smoke`、`npm run test:performance`、`npm run test:relation-stability` 和 `npm run test:lighthouse` |

---

## 3. 已移除或不再优先的旧规划

| 旧规划 | 当前处理 |
|--------|----------|
| relation-graph 继续增强 | 已移除，关系图谱统一使用 ECharts |
| 大表格虚拟滚动 | 不再优先，实体页已改为轻量列表 + 详情面板 |
| 一次性建设 6 种统计图 | 不做展示型 Dashboard，收敛为检测脚本、Markdown/JSON 报告和路线图 |
| 趋势箭头/时间序列分析 | 暂不做，当前没有历史快照数据 |
| 复杂度/影响散点图 | 暂不做，`influence` 是文本，不适合直接量化 |
| 完整圆形图布局 | 不采用，当前数据下可读性差 |
| Reference 元数据字段扩展 | 不恢复，Reference 保持 `title + link`，质量评估放在审计报告中 |
| SVG/PDF 图导出 | 暂不做，PNG 已满足当前使用场景 |
| 独立后端 API 服务 | 暂不做，优先提供静态 JSON/ npm 包形态的数据输出 |

---

## 4. 下一阶段路线图

### Phase A：可信度与维护闭环（已完成初版）

目标：让数据变更、参考资料、关系推导和构建流程更可靠。这个阶段优先级最高，因为它直接影响后续内容扩张的可维护性。

| 任务 | 说明 | 状态 |
|------|------|------|
| CI 与本地 build 对齐 | CI 和 Deploy 已显式执行本地 build 中的 lint、type-check、validate、test、coverage、schema docs、docs build、data export、data package、bundle、smoke、performance、relation-stability 和 Lighthouse 门禁；`docs-consistency` 会检查 workflow 同步 | ✅ |
| 数据关系覆盖审计 | 新增 `scripts/validate/relations.mjs` 和 `npm run audit:relations`，覆盖风险场景及顶层场景风险，输出关系覆盖 Markdown/JSON 报告 | ✅ |
| 参考资料质量基线 | `scripts/validate/references.mjs` 已按 error/review/warning 分级；i18n 链接差异默认汇总，必要时可用参数展开详情；重复引用和低质量来源 warning 已清零 | ✅ |
| README 同步 | README/README_CN 已更新当前数据规模、目录说明和开发/校验命令 | ✅ |
| 编辑器体验收敛 | editor 保存、校验、参考资料错误提示改为 Element Plus Message，移除实际 `alert`/`console.log` | ✅ |
| 依赖审计 | 已完成依赖清理，移除无源码引用依赖，升级 Vite 消除 npm audit high 漏洞 | ✅ |

### Phase B：检测与报告基线（已完成，持续消费报告）

目标：从“能浏览知识”升级到“能自动发现质量问题”。不建设展示型 Dashboard，只做当前 JSON 可稳定计算、可在 CI 或维护流程中复用的检测脚本和报告。该阶段的脚本和汇总链路已完成，后续重点是保持报告随数据变更同步刷新。

| 任务 | 说明 | 状态 |
|------|------|------|
| 指标基线脚本 | `npm run audit:metrics` 输出实体规模、参考覆盖、复杂度分布、规避分类、关系覆盖、业务场景覆盖 Markdown/JSON 报告 | ✅ |
| Bundle 预算脚本 | `npm run audit:bundle` 检查最大 JS chunk、ECharts、ZRender、Element Plus 和入口 chunk 预算 | ✅ |
| 关系缺口检测 | 在 `audit:metrics` 中补充弱覆盖、空值实体、高关联节点和推荐复核优先级 | ✅ |
| 场景覆盖检测 | 输出每个 BusinessScene 的风险重复度、覆盖缺口和异常引用 | ✅ |
| 维护任务清单 | 从 metrics 报告汇总维护者下一步应处理的事项 | ✅ |
| 跨报告汇总 | `npm run audit:maintenance` 合并 reference/relations/metrics/bundle 输出统一维护报告 | ✅ |

### Phase C：关系图谱分析增强（已完成初版）

目标：保留当前 ECharts 实现，在“解释关系”和“辅助决策”上继续增强，而不是继续增加相似布局。

当前 Review 结论：关系图谱已经具备 ECharts Graph/Sankey、节点/线类型筛选、上下文菜单、全屏、缩放、下载、多布局、节点详情抽屉、根节点路径预览、来源字段说明、Sankey 筛选、单条路径解释和逐段推导依据。当前缺口已经从“功能缺失”转为“继续扩大回归样本和移动端性能优化”。

#### Phase C1：关系解释基础（已完成初版）

| 任务 | 说明 | 验收标准 |
|------|------|----------|
| 图例和关系说明 | 当前节点/连线含义主要靠颜色和 hover，移动端尤其难理解 | ✅ 网络图页内展示 4 类节点颜色、关系类型和来源字段 |
| 节点详情面板 | 当前点击/右键主要是操作菜单，缺少解释上下文 | ✅ 点击节点显示 ID、标题、类型、入向/出向关系数、关联关系和跳转入口 |
| 关系字段来源 | 连线只显示翻译后的关系名，无法知道来自哪个 JSON 字段 | ✅ 连线 tooltip 和节点详情显示来源字段，如 `AttackTool.directCauseRisks`、`ThreatActor.useAttackTools` |

#### Phase C2：攻击路径分析（已完成初版）

当前基础：Sankey 已支持按当前实体生成攻击路径，双击节点切换当前实体；节点详情抽屉也能展示攻击路径角色说明。初版已补齐“筛选一条路径”“解释这条路径为何成立”的能力，Risk 视角也已展示规避覆盖来源；复杂图谱稳定性已通过 Playwright 脚本覆盖高关联实体和布局切换。

| 任务 | 说明 | 当前状态 | 验收标准 |
|------|------|----------|----------|
| 路径筛选 | 当前 Sankey 只按当前实体过滤，复杂实体下仍然难定位 | ✅ 初版完成 | 攻击路径可按 ThreatActor/AttackTool/Risk/Avoidance 类型继续筛选 |
| 路径详情 | 当前 Sankey 只能通过 hover/双击浏览节点，缺少单条路径解释 | ✅ 初版完成 | 选择路径或节点后展示 ThreatActor -> AttackTool -> Risk -> Avoidance 的可读链路 |
| 路径成立原因 | 攻击路径由多个字段推导，当前 UI 无法说明推导依据 | ✅ 初版完成 | 路径详情列出每一段来自哪些字段，并区分直接造成/间接关联/使用工具/制作工具 |

#### Phase C3：覆盖辅助与稳定性（其次）

| 任务 | 说明 | 当前状态 | 验收标准 |
|------|------|----------|----------|
| 覆盖模式 | 选择 Risk 后应突出相关 Avoidance，并区分风险自身规避和工具规避 | ✅ 初版完成 | 用户能判断一个风险被哪些规避手段覆盖，以及覆盖来自 Risk 还是 AttackTool |
| 大图稳定性 | 节点多时仍可能遮挡，现有布局已够用但缺少可测基线 | ✅ 初版完成 | 选取 5 个高关联实体做手工验收样例，切换布局、缩放、筛选不卡顿且主要标签可读 |
| 关系图谱回归测试 | 已覆盖 builder、Sankey 攻击路径、root/path insight、布局计算和复杂图谱 Playwright 稳定性 | ✅ 初版完成 | 后续继续增加更多关键实体样本和异常数据夹具 |

### Phase D：数据产品化（中优先，1-2 个月）

目标：让 BREAK 不只是一个站点，也能作为可复用数据资产被外部工具消费。

| 任务 | 说明 | 验收标准 |
|------|------|----------|
| 静态数据导出 | 已新增 `public/data/break-data.json` 和 `public/data/break-manifest.json`，并通过 `validate:data-export` 校验 | 持续保持 GitHub Pages URL 可直接获取稳定 JSON bundle 和版本信息 |
| npm 数据包评估 | 已新增 `dist/break-data-package`，评估发布 `@jdarmy/break-data` 或等价包 | ✅ 初版完成：有 package 边界、运行时入口、类型声明和版本策略 |
| 数据 Schema 文档 | 已新增 `DATA_SCHEMA.md`，并通过 `validate:schema-docs` 与 Zod Schema 保持同步 | 持续保持字段、关系语义和实体规模随 Schema/数据变更自动校验 |
| 变更日志规范 | PR 模板要求 CHANGELOG 标注 data/app/docs/build 类型和受影响实体 ID | ✅ 初版完成：数据项新增、删除、关系变更需要可追踪 |
| 贡献流程 | Issue 模板、PR checklist、数据审核规则已补齐数据包影响和验证清单 | ✅ 初版完成：外部贡献者能按模板提交数据变更 |

### Phase E：内容扩展与外部映射（低频长期）

目标：只有在维护闭环稳定后再扩展内容边界，避免数据模型膨胀。

| 方向 | 进入条件 | 初始做法 |
|------|----------|----------|
| OWASP / MITRE ATT&CK 映射 | 有明确使用方或对外传播需求 | 先做 10-20 条高置信映射样例，验证模型 |
| 案例库 | 已有稳定 CaseStudy 数据模型和审核规则 | 从少量公开案例开始，强制关联 Risk/AttackTool/ThreatActor/Avoidance |
| 多语言扩展 | 有维护者能长期维护第三语言 | 先做动态语言包加载，再引入新语言 |
| API 服务 | 静态数据输出无法满足使用方需求 | 再评估 Express/API，而不是现在引入运行时后端 |
| 高级图算法 | Lighthouse 和交互测量证明当前布局成为瓶颈 | 再考虑 WebWorker、聚类、迷你地图 |

---

## 5. 优先级矩阵

| 优先级 | 项目 | 原因 |
|--------|------|------|
| P1 | Lighthouse 优化 | Lighthouse 已建立桌面/移动端基线；已调整为 PC 立即预取、移动端延迟/按需预取，并拆出移动端搜索弹窗、关系页 ECharts 首屏加载、英文 BREAK 懒加载和首页详情抽屉分包，后续继续减少移动端 Sankey 页 TBT |
| P2 | ThreatActor 工具关系观察项复核 | `audit:relations` 当前显示 `ThreatActor.attackTools` 整体覆盖 100%，`ThreatActor.buildAttackTools` 为观察项 65/70，按语义复核即可 |
| P2 | 关系图谱回归测试扩充 | 初版已覆盖 Sankey、insight、布局和复杂图谱稳定性；后续补更多关键实体样本和异常数据夹具 |
| P3 | OWASP/ATT&CK 映射、案例库、多语言扩展 | 价值高但需要稳定维护机制 |

---

## 6. 建议度量指标

| 指标 | 当前状态 | 下一目标 |
|------|----------|----------|
| 数据校验 | CI/Deploy 已执行 lint、type-check、validate:data、test、test:coverage、validate:schema-docs、validate:docs-build、export:data、export:data-package、build-only、audit:bundle:check、validate:data-export、validate:data-package、test:smoke、test:performance、test:relation-stability、test:lighthouse | 保持与本地 `npm run build` 对齐 |
| 测试 | 7 个测试文件，91 个用例；核心逻辑覆盖率门禁已进入 CI/Deploy | 继续增加关键实体图数据、图谱控制器和复杂交互回归测试 |
| 关系覆盖 | `audit:relations`、`audit:metrics` 和 `audit:maintenance` 可输出报告；当前 `ThreatActor.attackTools` 整体覆盖率 100%，`ThreatActor.buildAttackTools` 观察项为 65/70 | 保持关系审计随数据变更运行，再考虑纳入 PR 强制流程 |
| 参考资料 | 1068 条，覆盖率 100%，结构统一 | 保持质量分级和问题清单清零 |
| Lighthouse | 已建立桌面/移动端基线；当前预取策略避免移动端首屏过早拉取全部知识页，同时保留 PC 点击响应速度；搜索弹窗、英文 BREAK 数据、首页详情抽屉和移动端关系页 ECharts 首屏加载已拆分/延后，按语言设置只在英文模式加载英文 BREAK | 继续降低移动端 Sankey TBT，并逐步提高无障碍分数 |
| Bundle | `audit:bundle` 已设置 JS chunk、ECharts、Element Plus、入口 chunk 预算，并已进入本地 build、CI 和 Deploy 门禁，当前无超预算问题 | 随数据和依赖增长持续调整预算 |
| 文档一致性 | README、README_CN、ROADMAP、数据统计、版本号、测试基线、CI/Deploy workflow 和 build 门禁由 `docs-consistency` 校验 | 后续数据规模以 `audit:metrics` 为准，版本号和测试基线随发布同步更新 |

---

## 7. 近期不建议投入

| 项目 | 原因 |
|------|------|
| 重做 UI 框架 | 当前 Element Plus 能满足知识库形态，重做收益低 |
| 引入搜索后端 | 当前数据规模 Fuse.js 足够，部署静态站更简单 |
| 大规模新增图表 | 没有明确分析问题的图表会增加维护负担 |
| 展示型 Dashboard | 指标展示价值有限，优先用检测脚本和报告形成维护闭环 |
| 增加 Reference 复杂字段 | 已验证维护负担高，放到审计报告更合适 |
| 完整后端服务 | 当前本地编辑服务已够用，公开站点保持静态更稳 |
