# BREAK LLM 评审体系

三层门禁架构，让新增/修改实体默认完善。严进严出。

## 三层架构

### 第一层：A 类·机器强约束（接入 `validate:data` 硬链）

所有可枚举/可正则/可查表/可编辑距离的规则，接入 `npm run validate:data`，**error 阻断 build**。

| 脚本 | 规则 | verdict |
| --- | --- | --- |
| `title-dedup.mjs` | title 精确/归一化重复 + 编辑距离≤2 近义 | error(精确非父子)/review |
| `title-format.mjs` | Term.title 含括号/间隔号/顿号/过长 | error/review |
| `updated-sync-gate.mjs` | 内容变更但 updated 未刷新到今日 | error |
| `id-continuity.mjs` | 主 ID 序列跳号 | review |
| `content-quality.mjs` | definition==description/influence 套话/description≈title | error/review |
| `references.mjs` | URL 合法性/weak 域名/title-domain 不一致/根域首页 | error/review/warning |
| `generic-phrase-blocklist.mjs` | 套话短语黑名单（"需重点关注"等） | review |
| `case-category-domain-consistency.mjs` | Case.category 与 refs 域名特征 | review |
| `risk-complexity-coverage.mjs` | Risk.complexity 与 AC 覆盖 | review |
| `case-summary-relation-consistency.mjs` | Case.summary 与 related* 交叉 | review |
| `term-category-enum.mjs` | Term.category 沿用已有取值 | review |
| `entity-granularity.mjs` | description 多场景拆分/父子 title | review |

### 第二层：B 类·subagent 交叉判断（`review:*` 命令）

需要读实体实际内容做语义交叉的规则，用 subagent 加载知识库已有实体内容做判断。**fail 阻断、review 提示**。

每个 subagent 评审：主进程加载被审实体 + 相关实体内容（通过 `llm-review-helpers`）→ 拼入 prompt → LLM 基于知识库内容交叉判断 → 返回结构化 verdict。

| 命令 | 规则 | 模型 |
| --- | --- | --- |
| `review:risk-avoidance` | 规避手段是否真能缓解风险 + 漏加规避 | multi |
| `review:risk-scene` | 风险是否应加其他业务域 | multi |
| `review:case-relation` | Case 与关联风险是否匹配 | multi |
| `review:tool-risks` | directCause/indirectSupport 划分 + 漏加规避 | multi |
| `review:actor-consistency` | 自建/使用工具划分 | multi |
| `review:term-completeness` | Term related* 是否漏挂 | multi |
| `review:granularity` | 实体合并/拆分双向 + title 近义终判 | multi |
| `review:should-extract` | 是否应提炼新风险/手段/工具/行为者/术语/案例 | multi |
| `review:references` | references 权威性应补源 | text |

### 第三层：C 类·LLM+抓取（最小集）

确实不可机器化的规则：

| 命令 | 规则 | 模型 |
| --- | --- | --- |
| `review:case-fact` | Case summary 与 Scrapingdog 抓取网页事实核验 | multi |
| `review:field-density` | 字段信息密度深层判断 | text |
| `review:classification` | category 语义贴切度 | text |

## 常用命令

```bash
# 全套变更评审（B+C 类，按变更实体类型分派）
npm run review:changed                      # 对比 HEAD
npm run review:changed -- --base HEAD~1     # 对比上一次提交
npm run review:changed -- --keys=R0001      # 仅指定实体
npm run review:changed -- --skip=case-fact  # 跳过抓取重的

# 全库指纹增量兜底（周期性扫描）
npm run review:full
npm run review:full -- --type=risks --limit=20

# 单独跑某类评审
npm run review:risk-avoidance -- --full --limit=5
npm run review:case-fact -- --keys=C0001

# pre-commit 可选触发（默认关）
BREAK_REVIEW_ON_COMMIT=1 git commit
```

## verdict 语义

- `pass`：通过，不阻断
- `review`：提示，不阻断（人工复核）
- `fail`：阻断（`review:changed` exit 1，pre-commit 中止提交）

## 环境配置（.env，gitignored）

```
LLM_API_URL=http://ai-api.jdcloud.com/v1/chat/completions
LLM_API_KEY=pk-...
LLM_TEXT_MODEL=GLM-5.2      # 轻量文本判断
LLM_MULTI_MODEL=GPT-5.5     # 重型跨实体推理（不支持自定义 temperature）
SCRAPINGDOG_API_KEY=...     # Case 事实核验抓取
```

## 双模型分工

- **MODEL_TEXT (GLM-5.2)**：单实体文本判断（字段密度、分类、references 权威性）
- **MODEL_MULTI (GPT-5.5)**：跨实体交叉判断（subagent 评审）、Case 事实核验（看抓取网页）

## 成本控制

- 仅变更实体评审（git diff 检测，含 untracked 新文件）
- 内容指纹增量（sha256 前 16 位，内容不变不重评）
- 双模型分工（轻量用 GLM-5.2，重型才用 GPT-5.5）
- Case 抓取缓存到 `research/search-reports/case-fact-review/scraped/` 避免重抓
- `--limit` 限量

## 输出目录（均 gitignored）

```
research/search-reports/
├── review-changed/{summary.json,summary.md}     # 编排器汇总
├── {name}-review/{review-report.json,.md,review-progress.json,pending-fix.json}
└── case-fact-review/scraped/                    # Scrapingdog 抓取缓存
```

## 基础设施

- `scripts/llm/llm-client.mjs` — 统一 LLM client（双模型 + chatJson + withRetry）
- `scripts/llm/llm-review-runner.mjs` — C 类纯 LLM 评审运行器
- `scripts/llm/subagent-review.mjs` — B 类 subagent 交叉判断运行器
- `scripts/validate/changed-entities.mjs` — 变更实体检测共享模块
- `scripts/validate/llm-review-helpers.mjs` — 全库加载 + title 索引 + 相关实体加载
- `scripts/research/llm.mjs` — 兼容层（re-export llm-client，保护旧脚本）

## 机器初筛 + subagent 终判 + LLM 兜底

- title 近义：A 类 `title-dedup` 初筛 → B 类 `review:granularity` subagent 终判
- references：A 类 `references` 域名分级 → B 类 `review:references` 应补源 → C 类抓取核实
- 字段完善性：A 类 `generic-phrase` 套话黑名单 → C 类 `review:field-density` 信息密度
- 分类：A 类 `case-category-domain`/`risk-complexity` 强信号 → C 类 `review:classification` 语义贴切
