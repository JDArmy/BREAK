# BREAK 项目进化路线图

> 版本：1.2 | 创建日期：2026-06-11 | 最后更新：2026-06-11 | Phase 1 已完成 ✅

---

## 目录

- [项目现状](#项目现状)
- [总体愿景](#总体愿景)
- [Phase 1：数据质量修复](#phase-1数据质量修复12周)
- [Phase 2：核心功能与工程化](#phase-2核心功能与工程化24周)
- [Phase 3：可视化增强](#phase-3可视化增强12个月)
- [Phase 4：生态扩展](#phase-4生态扩展长期)
- [优先级矩阵](#优先级矩阵)
- [关键指标](#关键指标)
- [风险与依赖](#风险与依赖)

---

## 项目现状

### 数据规模

| 实体 | 主条目 | 子条目 | 总计 | 关联字段空值率 |
|------|--------|--------|------|----------------|
| 风险 (Risk) | 158 | 95 | 253 | influence 全部有值 ✅ |
| 规避手段 (Avoidance) | 93 | 78 | 171 | 孤儿条目 0 ✅ |
| 攻击工具 (AttackTool) | 75 | 13 | 88 | directCauseRisks 空 8.0% ✅，indirectSupportRisks 空 6.8% ✅ |
| 威胁行为者 (ThreatActor) | 44 | 9 | 53 | buildAttackTools 空 26.4% ✅，indirectSupportRisks 空 0% ✅ |
| 业务场景 (BusinessScene) | 15 | 0 | 15 | — |
| 规避分类 (AvoidanceCategory) | 4 | 0 | 4 | — |

### 技术栈

- 前端框架：Vue 3.5 + TypeScript 5.8
- UI 组件库：Element Plus 2.10
- 关系图谱：relation-graph 2.2
- 构建工具：Vite 7.0
- 国际化：vue-i18n 11.4（中英双语，覆盖率 100%）
- 部署：GitHub Pages 静态站
- 测试：**无**
- CI/CD：**无**

### 已知问题清单

| # | 问题 | 影响范围 | 严重度 | 状态 |
|---|------|----------|--------|------|
| DQ-01 | Risk complexity 值不一致（"中"/"高" vs "中级"/"高级"） | 2 条记录 | 中 | ✅ 已修复 |
| DQ-02 | R0017-002 缺少 influence 字段 | 1 条记录 | 中 | ✅ 已修复 |
| DQ-03 | ThreatActor 1 条缺少 updated 字段 | 1 条记录 | 低 | ✅ 已修复 |
| DQ-04 | Reference type 标注率仅 19.1% | 643 条参考 | 高 | ✅ 策略变更：精简为 link+title |
| DQ-05 | Reference evidenceLevel 标注率仅 19.1% | 643 条参考 | 高 | ✅ 策略变更：精简为 link+title |
| DQ-06 | Reference language 标注率仅 19.0% | 644 条参考 | 中 | ✅ 策略变更：精简为 link+title |
| DQ-07 | Reference collectedBy 标注率 0% | 795 条参考 | 低 | ✅ 策略变更：精简为 link+title |
| DQ-08 | AttackTool directCauseRisks 空值率 31.8% → 8.0% | 7 条记录 | 高 | ✅ 已达标 |
| DQ-09 | AttackTool indirectSupportRisks 空值率 50% → 6.8% | 6 条记录 | 高 | ✅ 已达标 |
| DQ-10 | ThreatActor buildAttackTools 空值率 60.4% → 26.4% | 14 条记录 | 中 | ✅ 已达标 |
| DQ-11 | ThreatActor indirectSupportRisks 空值率 73.6% → 0% | 0 条记录 | 中 | ✅ 已达标 |
| DQ-12 | 21 个 Avoidance 孤儿条目 → 0 | 0 条记录 | 中 | ✅ 已全部关联 |
| DQ-13 | 36 个 Risk 孤儿条目 → 0 | 0 条记录 | 中 | ✅ 已全部关联 |
| DQ-14 | 111 个不可达引用链接 | 795 条参考 | 高 | ✅ 已全部替换 |
| UX-01 | 无搜索功能，用户只能浏览和锚点导航 | 全站 | 高 | — |
| UX-02 | 无数据统计可视化，首页仅4个数字卡片 | 首页 | 中 | — |
| UX-03 | 关系图谱功能基础，缺乏分析能力 | 关系图谱页 | 中 | — |
| UX-04 | 无暗色主题 | 全站 | 低 | — |
| ENG-01 | 零测试覆盖 | 全项目 | 高 | — |
| ENG-02 | 无 CI/CD 流水线 | 全项目 | 高 | — |
| ENG-03 | 无数据 Schema 运行时验证 | 数据层 | 中 | — |
| ENG-04 | 数据 eager 全量加载，首屏性能可优化 | 全站 | 中 | — |
| ECO-01 | 仅中英双语 | 国际化 | 低 | — |
| ECO-02 | 无 API/SDK 输出，数据封闭 | 生态 | 中 | — |
| ECO-03 | 无 OWASP/ATT&CK 映射 | 国际认知 | 中 | — |
| ECO-04 | 无真实攻击案例，框架偏理论 | 内容深度 | 中 | — |
| ECO-05 | 无社区贡献机制 | 社区 | 低 | — |

---

## 总体愿景

将 BREAK 从一个**静态知识展示站**进化为**交互式业务安全知识平台**：

```
当前状态                          目标状态
┌─────────────────┐          ┌─────────────────────────┐
│  静态数据展示     │          │  可搜索、可分析、可交互    │
│  手动维护数据     │   ──→    │  自动化数据质量保障       │
│  无测试/无 CI     │          │  完善测试 + CI/CD        │
│  单一可视化       │          │  多维可视化 + 统计仪表盘  │
│  封闭数据        │          │  API 开放 + 社区贡献     │
└─────────────────┘          └─────────────────────────┘
```

---

## Phase 1：数据质量修复（1-2周）

> 目标：消除数据一致性问题，补全关键字段，为后续功能开发奠定数据基础。
>
> **当前状态：已完成（v2.4.0），总完成度 100%**

### 1.1 修复数据一致性问题 ✅ 已完成

| 任务 | 状态 | 说明 |
|------|------|------|
| 统一 Risk complexity 枚举值 | ✅ | R0146 "中"→"中级"，R0147 "高"→"高级" |
| 补充 R0017-002 的 influence 字段 | ✅ | 已补充 |
| 补充缺失的 ThreatActor updated 字段 | ✅ | TA0025-001 已补充，日期格式统一 |
| 同步更新英文 i18n 文件 | ✅ | 已同步 |

**验收结果**：
- ✅ 所有 Risk complexity 值 ∈ {"初级", "中级", "高级"}
- ✅ 所有 Risk 条目均有 influence 字段
- ✅ 所有 ThreatActor 条目均有 updated 字段
- ✅ i18n 中英文条目一一对应

### 1.2 Reference 元数据 ✅ 策略变更完成

> **策略变更**：原计划为 Reference 补全 type/evidenceLevel/language/collectedBy 等字段。
> 经评估，这些字段属于过度设计，增加维护负担但实际价值有限。
> 决定精简 Reference 为仅 `link` + `title`，删除所有多余字段。

| 任务 | 状态 | 说明 |
|------|------|------|
| 删除 Reference 中 9 个多余字段 | ✅ | 清理 427 个 JSON 文件中的 3910 个字段 |
| 移除 ReferenceBadge.vue 组件 | ✅ | 前端组件简化 |
| 精简 ReferenceList.vue | ✅ | 仅展示链接和标题 |
| 精简编辑器参考资料显示 | ✅ | 表单简化为 title + link |
| 移除多余类型定义 | ✅ | ReferenceType/EvidenceLevel/AcademicReferenceMeta |
| 替换 111 个不可达链接 | ✅ | 百家号23个、知乎18个、搜狐8个等全部替换为有效来源 |
| 同步英文 i18n | ✅ | 已同步 |

**验收结果**：
- ✅ Reference 仅保留 link + title，无旧字段残留
- ✅ 所有引用链接均指向可访问的域名（反爬域名已全部替换）
- ✅ 前端展示和编辑器均已适配新结构

### 1.3 补全实体关联关系 ✅ 已完成

| 任务 | 状态 | 空值率变化 | 说明 |
|------|------|-----------|------|
| 补全 AT directCauseRisks | ✅ | 31.8% → 8.0% | 基于共享规避手段推导 |
| 补全 AT indirectSupportRisks | ✅ | 50% → 6.8% | 基于共享规避手段推导，每个AT最多10个间接风险 |
| 补全 TA buildAttackTools | ✅ | 60.4% → 26.4% | 基于领域知识严格映射17个TA，剩余14个为合理空值 |
| 补全 TA indirectSupportRisks | ✅ | 73.6% → 0% | 基于使用的AT关联推导，51个TA全部补充 |
| 审查孤儿 Avoidance 条目 | ✅ | 21 → 0 | 全部关联到对应 Risk |
| 审查孤儿 Risk 条目 | ✅ | 29 → 0 | 全部关联到 BusinessScene 和/或 AT |

**验收结果**：
- ✅ AttackTool directCauseRisks 空值率 8.0% < 10%
- ✅ AttackTool indirectSupportRisks 空值率 6.8% < 20%
- ✅ ThreatActor buildAttackTools 空值率 26.4% < 30%
- ✅ ThreatActor indirectSupportRisks 空值率 0% < 30%
- ✅ 孤儿 Avoidance 全部已关联
- ✅ 孤儿 Risk 全部已关联

### Phase 1 完成度总结

| 子阶段 | 完成度 | 说明 |
|--------|--------|------|
| 1.1 数据一致性 | 100% | 全部达标 |
| 1.2 Reference 元数据 | 100% | 策略变更后达标（精简 + 链接替换） |
| 1.3 实体关联关系 | 100% | 全部达标，所有验收标准通过 |

**Phase 1 总完成度：100% ✅**

---

## Phase 2：核心功能与工程化（2-4周）

> 目标：补齐最关键的用户体验缺口（搜索），建立质量保障基础设施（测试 + CI）。

### 2.1 全文搜索功能

| 任务 | 详情 | 预计工时 |
|------|------|----------|
| 技术选型 | Fuse.js（轻量前端方案）vs MeiliSearch（后端方案） | 2h |
| 安装与配置 Fuse.js | `npm install fuse.js`，配置索引字段和权重 | 1h |
| 构建搜索索引 | 聚合所有实体，提取可搜索字段（title/definition/description） | 4h |
| 搜索 UI 组件 | 全局搜索框（Cmd+K 唤起）+ 搜索结果下拉面板 | 8h |
| 搜索结果分类 | 按实体类型分组显示（风险/规避/攻击工具/威胁行为者） | 4h |
| 搜索结果跳转 | 点击结果跳转到对应列表页并高亮 + 打开详情 | 4h |
| 搜索结果高亮 | 匹配关键词高亮显示 | 2h |
| i18n 适配 | 中英文分别建立索引，随语言切换 | 3h |
| 集成到导航栏 | MenuList 组件中添加搜索入口 | 2h |

**技术方案**：

```
┌─────────────────────────────────────────────┐
│  MenuList                                    │
│  ┌─────────────────────────────────────────┐ │
│  │ 🔍 搜索风险、规避手段、攻击工具...  ⌘K  │ │
│  └─────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────┐ │
│  │ 📋 风险                                  │ │
│  │   R0001 营销羊毛风险                     │ │
│  │   R0002 合规处罚风险                     │ │
│  │ 🛡️ 规避手段                              │ │
│  │   A0001 风控规则引擎                     │ │
│  │ 🔧 攻击工具                              │ │
│  │   AT0001 打码平台                        │ │
│  │ 👤 威胁行为者                            │ │
│  │   TA0001 黑产工作室                      │ │
│  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**验收标准**：
- Cmd+K 可唤起搜索，ESC 可关闭
- 中英文搜索均可用
- 搜索结果按类型分组，匹配关键词高亮
- 点击结果可跳转到对应页面并打开详情
- 搜索响应时间 < 100ms

### 2.2 测试体系建设

| 任务 | 详情 | 预计工时 |
|------|------|----------|
| 安装 Vitest | `npm install -D vitest`，配置 `vitest.config.ts` | 1h |
| 数据完整性测试 | 交叉引用有效性、必填字段完整、枚举值合法、i18n 同步 | 8h |
| 工具函数测试 | `loadJsonModules`、数据校验逻辑 | 2h |
| 组件测试 | `@vue/test-utils`，覆盖搜索、筛选、详情展开 | 8h |
| 集成到构建流程 | `npm run build` 前自动运行测试 | 1h |

**数据完整性测试用例**：

```
✓ 所有 Risk 条目均含 title, definition, description, complexity, influence, avoidances
✓ Risk complexity 值 ∈ {"初级", "中级", "高级"}
✓ 所有 Risk.avoidances 引用的 ID 在 Avoidance 中存在
✓ 所有 AttackTool.directCauseRisks 引用的 ID 在 Risk 中存在
✓ 所有 AttackTool.indirectSupportRisks 引用的 ID 在 Risk 中存在
✓ 所有 AttackTool.avoidances 引用的 ID 在 Avoidance 中存在
✓ 所有 ThreatActor.buildAttackTools 引用的 ID 在 AttackTool 中存在
✓ 所有 ThreatActor.useAttackTools 引用的 ID 在 AttackTool 中存在
✓ 所有 ThreatActor.directCauseRisks 引用的 ID 在 Risk 中存在
✓ 所有 ThreatActor.indirectSupportRisks 引用的 ID 在 Risk 中存在
✓ 中英文 i18n 条目数一致（Risks/Avoidances/AttackTools/ThreatActors）
✓ 所有 Reference 均含 link 和 title
✓ BusinessScene 引用的 Risk ID 均存在
```

**验收标准**：
- 核心数据完整性测试覆盖率达 100%（指测试场景覆盖，非代码行覆盖）
- `npm run build` 自动运行测试且全部通过
- 测试执行时间 < 30s

### 2.3 CI/CD 流水线

| 任务 | 详情 | 预计工时 |
|------|------|----------|
| 创建 GitHub Actions 配置 | `.github/workflows/ci.yml` | 2h |
| PR 检查流水线 | lint + type-check + test + build | 2h |
| 自动部署流水线 | main 分支推送后自动部署到 GitHub Pages | 2h |
| 链接健康检查定时任务 | 每周运行 `scripts/validate/references.mjs`，生成报告 | 2h |
| i18n 同步检查 | PR 中自动检测中英文条目数差异 | 2h |

**CI 流水线设计**：

```
PR 提交
  └── CI Check
       ├── ESLint
       ├── TypeScript 类型检查
       ├── Vitest 数据完整性测试
       ├── Vite 构建
       └── i18n 同步检查

main 分支合并
  └── Deploy
       ├── CI Check（同上）
       └── 部署到 GitHub Pages

每周一 09:00 (CST)
  └── 链接健康检查
       └── 生成报告 → 创建 Issue
```

**验收标准**：
- PR 提交自动触发 CI，失败则阻止合并
- main 分支合并后自动部署
- 链接健康检查自动生成 Issue

### 2.4 暗色主题

| 任务 | 详情 | 预计工时 |
|------|------|----------|
| Element Plus 暗色配置 | 引入 `element-plus/theme-chalk/dark/css-vars.css` | 1h |
| 自定义暗色样式 | 覆盖导航栏、卡片、表格等组件颜色 | 4h |
| 主题切换组件 | 导航栏添加明/暗切换按钮 | 2h |
| 跟随系统偏好 | `prefers-color-scheme` 媒体查询 | 1h |
| 主题偏好持久化 | localStorage 存储用户选择 | 0.5h |
| 关系图谱暗色适配 | relation-graph 节点/连线颜色调整 | 2h |

**验收标准**：
- 明/暗主题一键切换，视觉一致
- 刷新页面后主题偏好保持
- 跟随系统偏好自动适配
- 关系图谱在暗色主题下可读性良好

---

## Phase 3：可视化增强（1-2个月）

> 目标：从"数据展示"升级为"数据分析"，让用户能从数据中获得洞察。

### 3.1 统计仪表盘

| 任务 | 详情 | 预计工时 |
|------|------|----------|
| 引入 ECharts | `npm install echarts`，配置按需导入 | 1h |
| 风险维度雷达图 | 按 4 大维度展示风险分布 | 4h |
| 规避覆盖率热力图 | 每个风险的规避手段覆盖情况 | 6h |
| 攻击路径桑基图 | ThreatActor → AttackTool → Risk → Avoidance | 8h |
| 复杂度/影响散点图 | 风险按复杂度和影响分布 | 4h |
| 规避分类饼图 | AC01-AC04 规避手段分布 | 2h |
| 仪表盘页面布局 | 新增 `/dashboard` 路由，网格布局 | 4h |
| 图表 i18n 适配 | 标签和图例随语言切换 | 2h |
| 图表交互 | 点击图表区域跳转到对应实体 | 4h |

**仪表盘布局设计**：

```
┌──────────────────────────────────────────────────────┐
│  统计概览卡片（风险/规避/工具/行为者 + 趋势箭头）       │
├───────────────────────┬──────────────────────────────┤
│                       │                              │
│   风险维度雷达图       │    规避分类饼图               │
│                       │                              │
├───────────────────────┼──────────────────────────────┤
│                       │                              │
│   复杂度/影响散点图    │    规避覆盖率热力图           │
│                       │                              │
├───────────────────────┴──────────────────────────────┤
│                                                      │
│   攻击路径桑基图（ThreatActor → AttackTool → Risk →  │
│   Avoidance 全链路可视化）                            │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**验收标准**：
- 6 种图表均正常渲染
- 图表支持中英文切换
- 点击图表区域可跳转到对应实体
- 图表数据与 JSON 数据源实时同步

### 3.2 关系图谱增强

| 任务 | 详情 | 预计工时 |
|------|------|----------|
| 攻击路径模拟 | 选择 ThreatActor，自动生成到 Risk 的最短路径 | 8h |
| 规避覆盖分析 | 选择 Risk，高亮已覆盖/未覆盖规避手段 | 6h |
| 图导出功能 | PNG/SVG/PDF 导出 | 4h |
| 层级布局算法 | 增加以 Risk 为中心的层级布局 | 6h |
| 环形布局算法 | 增加 ThreatActor 在中心的环形布局 | 4h |
| 迷你地图 | 大型关系图的缩略导航 | 6h |
| 节点详情卡片 | 悬停节点显示摘要信息 | 4h |
| 图例增强 | 节点颜色/连线类型图例说明 | 2h |

**验收标准**：
- 攻击路径模拟可自动计算并高亮显示
- 规避覆盖分析以颜色区分覆盖状态
- 支持导出 PNG/SVG
- 至少提供 2 种布局算法
- 迷你地图可点击快速定位

### 3.3 性能优化

| 任务 | 详情 | 预计工时 |
|------|------|----------|
| 数据懒加载 | `import.meta.glob` 改为动态导入，列表页按需加载 | 6h |
| 虚拟滚动 | 列表页使用 `el-table-v2` 虚拟化表格 | 8h |
| 关系图按需加载 | 初始只加载直接关系，展开时再加载 | 4h |
| 构建产物分析 | 集成 rollup-plugin-visualizer 分析包体积 | 2h |
| 图片/资源压缩 | 优化静态资源 | 2h |

**验收标准**：
- 首屏加载体积减少 30%+（通过懒加载）
- 列表页滚动帧率 ≥ 60fps
- Lighthouse Performance 评分 ≥ 85

### 3.4 数据 Schema 验证

| 任务 | 详情 | 预计工时 |
|------|------|----------|
| 引入 Zod | `npm install zod` | 0.5h |
| 定义实体 Schema | Risk/Avoidance/AttackTool/ThreatActor/Reference | 4h |
| 构建时校验 | `npm run build` 前自动运行数据校验 | 2h |
| 编辑器集成 | editor/HomeView 实时校验输入 | 4h |
| 友好错误提示 | 校验失败时输出具体字段和原因 | 2h |

**验收标准**：
- 所有实体类型均有 Zod Schema
- 构建时自动校验，非法数据阻止构建
- 编辑器中实时校验，输入不合法时即时提示

---

## Phase 4：生态扩展（长期）

> 目标：扩大 BREAK 的影响力和可用性，从项目升级为生态。

### 4.1 OWASP / MITRE ATT&CK 映射

| 任务 | 详情 | 预计工时 |
|------|------|----------|
| 研究映射可行性 | 分析 BREAK Risk 与 OWASP Top 10 / ATT&CK 的对应关系 | 8h |
| 设计映射数据模型 | 新增 `mappings` 字段或实体 | 4h |
| 创建初始映射 | 逐条建立映射关系 | 16h |
| 映射可视化 | 在关系图谱中叠加外部框架节点 | 8h |
| 映射对比视图 | 并排展示 BREAK 与 OWASP/ATT&CK 覆盖差异 | 8h |

**价值**：
- 帮助国际用户理解 BREAK 与已知框架的关系
- 便于安全团队将 BREAK 纳入现有合规体系
- 提升项目在国际安全社区的知名度

### 4.2 API / SDK 输出

| 任务 | 详情 | 预计工时 |
|------|------|----------|
| REST API 设计 | 基于 Express，提供 `/api/risks`、`/api/avoidances` 等端点 | 8h |
| API 文档 | Swagger/OpenAPI 规范 | 4h |
| npm 包 `@jdarmy/break-data` | 打包 BREAK JSON 数据为 npm 包 | 4h |
| 版本化策略 | 语义化版本 + Changelog 自动生成 | 4h |
| CDN 输出 | 通过 jsDelivr/unpkg 提供 CDN 访问 | 2h |

### 4.3 多语言扩展

| 任务 | 详情 | 预计工时 |
|------|------|----------|
| i18n 架构重构 | 支持动态语言包加载，避免首屏加载全部语言 | 8h |
| 日文翻译 | 社区或专业翻译 | 40h |
| 韩文翻译 | 社区或专业翻译 | 40h |
| 翻译管理平台 | 集成 Crowdin/Transifex | 8h |

### 4.4 攻击案例库

| 任务 | 详情 | 预计工时 |
|------|------|----------|
| 设计 CaseStudy 数据模型 | 新增实体类型，关联 Risk/AttackTool/ThreatActor | 4h |
| 创建初始案例 | 基于公开安全事件（如携程数据泄露、拼多多百亿补贴羊毛等） | 16h |
| 案例展示页面 | 新增 `/cases` 路由 | 8h |
| 案例时间线视图 | 按时间线展示攻击事件链 | 8h |
| 案例在关系图谱中的展示 | 案例作为节点出现在关系图中 | 6h |

**CaseStudy 数据模型草案**：

```typescript
interface CaseStudy {
  id: string              // CS0001
  title: string           // 案例标题
  summary: string         // 案例摘要
  timeline: string        // 事件时间线
  industry: string        // 所属行业
  impact: string          // 影响描述
  lossEstimate?: string   // 损失估计
  risks: string[]         // 关联的风险 ID
  attackTools: string[]   // 使用的攻击工具 ID
  threatActors: string[]  // 威胁行为者 ID
  avoidances: string[]    // 采取的规避手段 ID
  references: Reference[] // 参考资料
  updated: string         // 更新日期
}
```

### 4.5 社区贡献机制

| 任务 | 详情 | 预计工时 |
|------|------|----------|
| GitHub Issue 模板 | 新增风险/规避/工具/行为者的标准化提交模板 | 4h |
| PR 审核流程 | 数据变更的审核检查清单 | 2h |
| 贡献者指南 | `CONTRIBUTING.md` | 4h |
| 在线编辑器增强 | Web 端编辑 → 自动生成 PR | 16h |
| 数据评审工作流 | 新增条目的专家评审机制（GitHub Review） | 4h |

---

## 优先级矩阵

```
                     高影响
                       │
   Phase 2.1 搜索 ─────┼───── Phase 1 数据质量
   Phase 2.2 测试 ─────┤
   Phase 2.3 CI/CD ────┤
                       │
   Phase 3.1 仪表盘 ───┼───── Phase 3.2 关系图谱增强
   Phase 3.4 Schema ───┤
                       │
   Phase 4.1 映射 ─────┼───── Phase 4.4 案例库
   Phase 4.2 API ──────┤
                       │
低投入 ─────────────────┼──────────────────── 高投入
                       │
```

---

## 关键指标

| 指标 | 当前值(v2.4.0) | Phase 1 目标 | Phase 2 目标 | Phase 3 目标 |
|------|----------------|-------------|-------------|-------------|
| Reference 模型 | ✅ 精简为 link+title | ✅ 已完成 | — | — |
| AttackTool directCauseRisks 空值率 | 8.0% | < 10% ✅ | < 5% | < 5% |
| AttackTool indirectSupportRisks 空值率 | 6.8% | < 20% ✅ | < 10% | < 5% |
| ThreatActor buildAttackTools 空值率 | 26.4% | < 30% ✅ | < 25% | < 20% |
| ThreatActor indirectSupportRisks 空值率 | 0% | < 30% ✅ | < 10% | < 5% |
| 孤子 Avoidance 数 | 0 | 0 ✅ | 0 | 0 |
| 孤子 Risk 数 | 0 | 0 ✅ | 0 | 0 |
| 不可达链接数 | 0 ✅ | 0 ✅ | 0 | 0 |
| 测试覆盖 | 0% | 0% | 核心场景 100% | 核心场景 100% |
| CI/CD | 无 | 无 | 完整流水线 | 完整流水线 |
| 搜索功能 | 无 | 无 | 已上线 | 已上线 |
| 可视化图表 | 0 | 0 | 0 | 6 种 |
| Lighthouse 性能分 | 未测 | ≥ 75 | ≥ 80 | ≥ 85 |
| 国际化语言数 | 2 | 2 | 2 | 2 |

---

## 风险与依赖

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| 关联关系补全依赖领域专家判断 | 高 | 中 | 分批处理，优先补全高置信度条目，低置信度标记待确认 |
| Fuse.js 搜索性能随数据增长下降 | 低 | 低 | 数据量增长到 500+ 条目时评估迁移 MeiliSearch |
| ECharts 包体积过大影响首屏性能 | 中 | 中 | 按需导入 + 仪表盘页独立 chunk |
| 关系图谱复杂度增加导致交互卡顿 | 中 | 中 | 限制可视节点数量 + 按需加载 + WebWorker 计算布局 |
| 多语言翻译质量难以保证 | 高 | 中 | 引入社区审核机制 + 翻译管理平台 |

---

## 附录：技术选型参考

| 需求 | 候选方案 | 推荐方案 | 理由 |
|------|----------|----------|------|
| 前端搜索 | Fuse.js / FlexSearch / MeiliSearch | **Fuse.js** | 轻量、零依赖、支持模糊搜索，数据量 <1000 时性能充足 |
| 图表库 | ECharts / Chart.js / D3.js | **ECharts** | 功能全面、中文文档完善、支持按需导入 |
| 数据验证 | Zod / Yup / JSON Schema | **Zod** | TypeScript 一等支持、类型推断、轻量 |
| 测试框架 | Vitest / Jest | **Vitest** | 与 Vite 原生集成、配置复用、速度快 |
| E2E 测试 | Playwright / Cypress | **Playwright** | 多浏览器支持、速度更快、社区活跃 |
| 翻译管理 | Crowdin / Transifex / Lokalise | **Crowdin** | 开源项目免费、GitHub 集成、社区翻译功能 |
| 虚拟滚动 | el-table-v2 / vue-virtual-scroller | **el-table-v2** | Element Plus 原生支持、迁移成本低 |
