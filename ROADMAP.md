# BREAK 项目进化路线图

> 文档版本：2.3 | 最后 Review：2026-06-13 | 当前项目版本：2.8.0 | 状态：Phase B 检测与报告基线已完成，取消展示型 Dashboard，下一阶段继续增强关系解释、Lighthouse 和数据产品化。

---

## 1. 当前结论

BREAK 已经完成了早期路线图中的大部分基础建设：数据质量修复、搜索、暗色主题、CI/CD、Schema 校验、ECharts 关系图谱和攻击路径视图都已经落地。继续保留旧的 Phase 1/2 任务清单会降低路线图可读性，因此本文件只保留当前状态和后续演进计划。

下一步不应再追求“堆更多图表”或“重做基础页面”，而应围绕四件事推进：

| 方向 | 为什么现在做 | 目标 |
|------|--------------|------|
| 内容可信度 | 数据量已经较大，维护成本和参考资料质量比新增字段更关键 | 让每条数据的来源、关系和变更都可审计 |
| 分析能力 | 关系网络和攻击路径已可视化，但展示型 Dashboard 价值有限 | 用检测脚本和报告回答覆盖率、路径、类别和场景层面的分析问题 |
| 维护效率 | 编辑器、CI、数据脚本已有雏形，但贡献流程还不够闭环 | 降低新增/更新实体的出错率 |
| 性能基线 | ECharts 和全量数据已进入项目，需要用测量而不是猜测做优化 | 建立 Lighthouse、bundle 和运行时交互基线 |

---

## 2. 当前状态快照

### 2.1 数据规模

| 实体 | 主条目 | 子条目 | 总计 |
|------|--------|--------|------|
| Risk | 158 | 95 | 253 |
| Avoidance | 93 | 78 | 171 |
| AttackTool | 75 | 13 | 88 |
| ThreatActor | 44 | 9 | 53 |
| BusinessScene | 15 | 0 | 15 |
| AvoidanceCategory | 4 | 0 | 4 |

参考资料总量：742 条。当前 `npm run validate:data` 可通过 Schema 校验、中英文 key 同步检查和关系覆盖审计；`npm run audit:maintenance` 可刷新审计报告并生成统一维护汇总。

### 2.2 已具备能力

| 能力 | 当前状态 |
|------|----------|
| 数据质量 | Zod Schema、交叉引用测试、i18n key 同步、参考链接健康检查脚本 |
| 搜索 | Fuse.js 全局搜索，支持中英文、Cmd/Ctrl+K、分组结果、跳转 |
| 知识浏览 | 首页业务场景矩阵，四类实体左右分栏，局部搜索，详情关联跳转 |
| 关系图谱 | ECharts Graph，支持横向链路、泳道、左右分栏、放射布局，缩放、刷新、全屏、PNG 下载 |
| 攻击路径 | ECharts Sankey，支持当前实体过滤 ThreatActor -> AttackTool -> Risk -> Avoidance |
| 主题 | 明亮/暗色/跟随系统，图谱颜色适配 |
| 工程化 | Vite、TypeScript、ESLint、Vitest、GitHub Actions、GitHub Pages |
| 数据维护 | 本地 editor 路由、Express 保存服务、PR checklist、数据变更 Issue 模板 |

### 2.3 当前验证结果

| 命令 | 结果 |
|------|------|
| `npm run validate:data` | 通过 |
| `npm run audit:relations` | 生成关系覆盖报告 |
| `npm run audit:references` | 生成参考资料质量基线报告 |
| `npm run audit:metrics` | 生成内容可信度和分析指标基线报告 |
| `npm run audit:bundle` | 检查构建产物 bundle 预算 |
| `npm run audit:maintenance` | 刷新基础审计并生成统一维护汇总 |
| `npm run test` | 3 个测试文件，49 个用例通过 |
| `npm run build` | 本地脚本包含 lint、type-check、validate:data、test、build-only |

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
| CI 与本地 build 对齐 | CI 和 Deploy 已显式执行 `npm run validate:data` | ✅ |
| 数据关系覆盖审计 | 新增 `scripts/validate/relations.mjs` 和 `npm run audit:relations`，覆盖风险场景及顶层场景风险，输出关系覆盖 Markdown/JSON 报告 | ✅ |
| 参考资料质量基线 | `scripts/validate/references.mjs` 已按 error/review/warning 分级；i18n 链接差异默认汇总，必要时可用参数展开详情；重复引用和低质量来源 warning 已清零 | ✅ |
| README 同步 | README/README_CN 已更新当前数据规模、目录说明和开发/校验命令 | ✅ |
| 编辑器体验收敛 | editor 保存、校验、参考资料错误提示改为 Element Plus Message，移除实际 `alert`/`console.log` | ✅ |
| 依赖审计 | 新增 `DEPENDENCY_AUDIT.md`，移除无源码引用依赖，升级 Vite 消除 npm audit high 漏洞 | ✅ |

### Phase B：检测与报告基线（已完成初版）

目标：从“能浏览知识”升级到“能自动发现质量问题”。不建设展示型 Dashboard，只做当前 JSON 可稳定计算、可在 CI 或维护流程中复用的检测脚本和报告。

| 任务 | 说明 | 状态 |
|------|------|------|
| 指标基线脚本 | `npm run audit:metrics` 输出实体规模、参考覆盖、复杂度分布、规避分类、关系覆盖、业务场景覆盖 Markdown/JSON 报告 | ✅ |
| Bundle 预算脚本 | `npm run audit:bundle` 检查最大 JS chunk、ECharts、ZRender、Element Plus 和入口 chunk 预算 | ✅ |
| 关系缺口检测 | 在 `audit:metrics` 中补充弱覆盖、空值实体、高关联节点和推荐复核优先级 | ✅ |
| 场景覆盖检测 | 输出每个 BusinessScene 的风险重复度、覆盖缺口和异常引用 | ✅ |
| 维护任务清单 | 从 metrics 报告汇总维护者下一步应处理的事项 | ✅ |
| 跨报告汇总 | `npm run audit:maintenance` 合并 reference/relations/metrics/bundle 输出统一维护报告 | ✅ |

### Phase C：关系图谱分析增强（中优先，2-4 周）

目标：保留当前 ECharts 实现，在“解释关系”和“辅助决策”上继续增强，而不是继续增加相似布局。

| 任务 | 说明 | 验收标准 |
|------|------|----------|
| 图例和关系说明 | 当前节点/连线含义主要靠颜色和 hover | 页面内提供节点类型、连线类型说明 |
| 右侧详情面板 | 点击节点显示摘要、关联数量、入口操作 | 替代仅靠 tooltip 的信息展示 |
| 路径筛选 | 攻击路径按 ThreatActor/AttackTool/Risk/Avoidance 类型过滤 | Sankey 复杂时仍能定位路径 |
| 路径解释 | 解释一条路径为什么成立，来自哪些字段 | 用户能追溯字段来源 |
| 覆盖模式 | 选择 Risk 后突出相关 Avoidance，并区分直接/间接覆盖 | 辅助判断防护覆盖缺口 |
| 大图稳定性 | 多节点时避免标签重叠和卡顿 | 典型实体打开、切换布局、缩放不卡顿 |

### Phase D：数据产品化（中优先，1-2 个月）

目标：让 BREAK 不只是一个站点，也能作为可复用数据资产被外部工具消费。

| 任务 | 说明 | 验收标准 |
|------|------|----------|
| 静态数据导出 | 构建时输出稳定 JSON bundle 和版本信息 | 可通过 GitHub Pages URL 直接获取 |
| npm 数据包评估 | 评估发布 `@jdarmy/break-data` 或等价包 | 有 package 边界、类型声明和版本策略 |
| 数据 Schema 文档 | 从 Zod Schema 生成人类可读的数据模型说明 | README 或 docs 中可查看 |
| 变更日志规范 | 数据项新增、删除、关系变更需要可追踪 | CHANGELOG 区分 data/app/docs |
| 贡献流程 | Issue 模板、PR checklist、数据审核规则 | 外部贡献者能按模板提交数据变更 |

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
| P0 | Phase A 质量基线收尾 | 已完成：重复引用、低质量来源、主风险误报、攻击工具行为者覆盖待复核项全部清零 |
| P1 | 图谱详情面板、路径解释 | 直接提升分析价值 |
| P1 | 编辑器体验继续收敛、贡献模板维护 | 降低维护成本 |
| P2 | 静态数据导出、Schema 文档、npm 包评估 | 提升数据复用能力 |
| P3 | OWASP/ATT&CK 映射、案例库、多语言扩展 | 价值高但需要稳定维护机制 |

---

## 6. 建议度量指标

| 指标 | 当前状态 | 下一目标 |
|------|----------|----------|
| 数据校验 | Schema + i18n sync + relations 通过 | CI/Deploy 强制执行 |
| 测试 | 49 个用例 | 关键路由和图谱数据转换增加单元测试 |
| 关系覆盖 | `audit:relations`、`audit:metrics` 和 `audit:maintenance` 可输出报告 | 关系变更 PR 必跑 |
| 参考资料 | 742 条，覆盖率 100%，结构统一 | 保持质量分级和问题清单清零 |
| Lighthouse | 未建立基线 | 建立桌面/移动端基线 |
| Bundle | `audit:bundle` 已设置 JS chunk、ECharts、Element Plus、入口 chunk 预算 | 加入 CI 或 release 前检查 |
| 文档一致性 | README、ROADMAP、数据统计脚本已同步 | 后续数据规模以 `audit:metrics` 为准 |

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
