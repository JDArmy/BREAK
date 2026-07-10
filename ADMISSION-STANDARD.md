# BREAK 新条目准入标准

本标准定义 6 类知识实体（Risk / Avoidance / AttackTool / ThreatActor / Term / Case）新增条目的准入门槛。**机器能卡的由 `scripts/validate/admission.mjs` 卡死（接入 `validate:data` build 链）；语义判断（是否值得录入、是否重复、是否泛泛）靠本标准文档 + `discover` skill 落盘前 7 项评审关。**

> 原则：**宁可漏掉，不可错收。** 任何一项存疑、边界模糊、信息不足、来源存疑 → 一律 reject，不得放行落盘。

## 0. 目的与适用范围

现有校验（`validate:data` 28 道门禁 + `data-integrity.test.ts`）已覆盖结构完整性、命名/ID/枚举、交叉引用、孤儿检测、keywords 含 title、i18n 同步、BD 归类、riskAssessment、title 去重/格式、updated 同步、ID 连续性、套话短语、Case.category 域名一致性、Risk.complexity AC 覆盖、Case.summary 关联交叉、Term.category 枚举、实体粒度初筛。本标准补 6 个准入空白：

| 空白 | 机器卡（admission.mjs） | 人判（文档 + discover 评审关） |
|---|---|---|
| ① 是否值得录入 | — | ✅ 评审关第1项 |
| ② 是否与现有重复 | — | ✅ 评审关第3项 |
| ③ 是否泛泛（内容单薄） | ✅ 新增条目文本长度下限 | ✅ 评审关第1项 |
| ④ keywords 数量下限 | ✅ ≥3 / Term ≥4 | — |
| ⑤ references 占位污染 | ✅ 禁框架首页占位 | — |
| ⑥ 高价值 Case 来源质量 | ✅ ≥2源且含1primary | — |

**作用范围**：admission.mjs 全量扫描 6 类，历史条目由 `admission-baseline.json` 豁免新增条目下限；新增条目（不在 baseline `exemptIds` 内）严格执行所有下限。全库中英文宽松上限由 `entity-text-length.mjs` 独立校验，历史条目允许合理精简，不再与历史长度快照比较。

## 1. 通用准入门槛（全类型适用）

### 1.1 必要性：是否值得录入（人判）

- 是否有真实业务域/案例佐证该实体存在且值得独立成条？
- 是否有可观测的具体特征（攻击手法/防御手段/工具实体/角色行为模式/术语定义）？
- 是否与现有条目有明确区分（不是现有条目的子集或换个说法）？
- 泛泛概念、临时新闻用语、产品宣传、趋势综述 → 不录入。

### 1.2 查重：跨实体语义去重（人判）

- 新条目 title 与现有库 title 是否高度相似或同义？
- 新条目定义/描述是否与现有条目大面积重叠？
- 是否更适合做某现有实体的子实体（子风险 `-NNN` / 子手段）而非独立条目？
- discover 评审关第3/4项负责，machine 层无跨实体语义去重。

### 1.3 内容长度：合理下限 + 宽松上限（机器卡）

见 §2 各类型阈值表。中文按**去空白 Unicode 字符数**计，英文按单词数计。新增中文条目执行下限，全部中英文实体执行上限。

### 1.4 references 质量：禁占位首页 + 来源分级（机器卡）

- **禁止框架首页占位链接**（见 §3 黑名单 10 种）。新条目 references 不得仅用框架首页当引用。
- references 至少 1 条合法 URL（`require-references.mjs` 已管全库）。
- **references 元素只允许 `title` + `link` 两个字段**（`referenceSchema.strict()` 强制）。`sourceType`（primary/secondary/mirror/weak/unknown）是 `source-classify.mjs` 的**运行时分级返回值，不得持久化到实体数据**——它每次从 link/title 动态计算，写入 references 会被 schema 以 `Unrecognized key: "sourceType"` 拒绝。case-fact/references 评审脚本若在内存中用 sourceType 标注，落盘前必须丢弃该字段。
- 来源分级（primary/secondary/mirror/weak/unknown）由 `source-classify.mjs` 判定，高价值 Case 需 ≥1 primary（见 §4）。

### 1.5 关系要求（复用现有门禁）

- 复用 `check-entity-relations.mjs` / discover `RELATION_GUIDE` / `requiredRelations`（已有门禁，本标准不重复）。
- Risk.avoidances 非空；AttackTool 三类 risks+avoidances 非空；ThreatActor 两类 risks 非空；Case.relatedRisks≥1；Avoidance 须被 Risk/AttackTool 引用（非孤儿）。

## 2. 各类型专属标准

每类"是什么/不是什么"复用 discover `write-drafts.mjs` 的 `ENTITY_STANDARD`，此处只列准入阈值与补充要求。

### 2.1 Risk（业务风险点）

| 字段 | 中文下限（新增） | 中文上限（全库） | 英文上限（全库） |
|---|---:|---:|---:|
| keywords | ≥3（含 title 本身） | - | - |
| definition | 20 字 | 160 字 | 80 词 |
| description | 60 字 | 600 字 | 300 词 |
| influence | 15 字 | 250 字 | 120 词 |
| references | ≥1 合法 + 禁占位 |

**必要性**：业务逻辑被非预期利用的具体风险点，有可观测攻击手法。非 CVE 通报/趋势报告/具体事件（→Case）。

### 2.2 Avoidance（规避手段）

| 字段 | 中文下限（新增） | 中文上限（全库） | 英文上限（全库） |
|---|---:|---:|---:|
| keywords | ≥3 | - | - |
| definition | 20 字 | 160 字 | 80 词 |
| description | 60 字 | 600 字 | 300 词 |
| limitation | 30 字 | 200 字 | 150 词 |
| references | ≥1 合法 + 禁占位 |

**必要性**：可落地的具体防御/风控/检测手段。泛泛"AI 防御""反欺诈"概念无具体落地 → 不录入。

### 2.3 AttackTool（攻击工具）

| 字段 | 中文下限（新增） | 中文上限（全库） | 英文上限（全库） |
|---|---:|---:|---:|
| keywords | ≥3 | - | - |
| description | 80 字 | 600 字 | 300 词 |
| references | ≥1 合法 + 禁占位 |

**必要性**：可识别的具体工具/平台/资源。泛泛"恶意软件"概念无可识别工具实体 → 不录入。

### 2.4 ThreatActor（威胁行为者）

| 字段 | 中文下限（新增） | 中文上限（全库） | 英文上限（全库） |
|---|---:|---:|---:|
| keywords | ≥3 | - | - |
| description | 80 字 | 450 字 | 220 词 |
| references | ≥1 合法 + 禁占位 |

**必要性**：可归类的**角色类型**（如羊毛党、卡商、内鬼）。具体组织名（APT28/Lazarus）不归 TA，归 Case。仅有具体组织名而无角色归类价值 → 不录入。

### 2.5 Term（行业术语）

| 字段 | 中文下限（新增） | 中文上限（全库） | 英文上限（全库） |
|---|---:|---:|---:|
| keywords | ≥4 | - | - |
| definition | 20 字 | 100 字 | 60 词 |
| description | 60 字 | 400 字 | 220 词 |
| usageExample | - | 120 字 | 80 词 |
| references | ≥1 合法 + 禁占位 |

**必要性**：行业稳定使用的具体术语/黑话/缩写，有明确定义。临时新闻用语/泛泛词组/产品名 → 不录入。

### 2.6 Case（典型案例）

| 字段 | 中文下限（新增） | 中文上限（全库） | 英文上限（全库） |
|---|---:|---:|---:|
| keywords | ≥3 | - | - |
| summary | 80 字 | 300 字 | 180 词 |
| references | 高价值类别≥2源且含≥1primary；其余≥1合法+禁占位 |

**高价值 Case 类别**（复用 `highValueCategories`）：`criminal_verdict` / `administrative_enforcement` / `security_incident` / `vulnerability_advisory`。

**必要性**：真实发生的具体事件，有明确时间、主体、事实。月度/季度态势综述/律师普法/指导性案例发布通知（无具体案情）→ 不录入。BREAK 无 vulnerability 类型，具体漏洞通报归 `case(vulnerability_advisory)`。

## 3. references 占位首页黑名单（10 种）

以下框架首页链接**禁止用于新条目 references**（admission.mjs 精确匹配，normalizeSlash 去尾斜杠后比较）。源于 `scripts/import/expand-coverage-batch.mjs` 批量生成时映射到首页常量的历史技术债，新条目不得再用。

| 占位 link（首页） | 应替换为什么样的具体页面 |
|---|---|
| `https://www.nist.gov/cyberframework` | NIST CSF 的具体 Function/Category 页（如 `/framework/basic`）或主题对应的具体文档 |
| `https://www.nist.gov/itl/ai-risk-management-framework` | AI RMF 的具体章节/Playbook 页 |
| `https://owasp.org/API-Security/editions/2023/en/0x00-header/` | API1:2023 等具体漏洞条目页（`/0x10-api1-2023`） |
| `https://owasp.org/www-project-top-10-for-large-language-model-applications/` | LLM01 等具体风险条目页 |
| `https://owasp.org/www-project-top-10-ci-cd-security-risks/` | CICD-01 等具体风险条目页 |
| `https://www.pcisecuritystandards.org/standards/pci-dss/` | PCI DSS 具体 Requirement 条目页 |
| `https://www.cisa.gov/topics/information-communications-technology-supply-chain-security/sbom` | CISA SBOM 具体指南/事实清单页 |
| `https://www.cisa.gov/securebydesign` | Secure by Design 具体指南/产品页 |
| `https://www.iso.org/standard/70918.html` | ISO/SAE 21434 具体条款页或厂商解读 |
| `https://www.w3.org/TR/did-core/` | DID 具体章节锚点 |

**说明**：占位 link 的域名本身合法权威（nist.gov/owasp.org 等都在 `source-classify.mjs` 的 primary 白名单里），故 `classifySource` 会判为 primary——**占位禁令必须用本黑名单显式匹配**，不能依赖分级。精确匹配首页不误伤 `nist.gov/cyberframework/framework/basic` 这类具体页。

## 4. 来源分级定义（复用 `source-classify.mjs`）

| 分级 | 定义 |
|---|---|
| primary | 官方/原始/高稳定来源：法院/监管/公安/厂商公告、论文、CVE/NVD、原始代码仓库、`primaryReferenceLinks` 白名单认定的具体一手链接 |
| secondary | 可信媒体或安全厂商分析，可佐证但不等同原始证据（thepaper/cctv/thehackernews/bleepingcomputer 等） |
| mirror | 转载/社交平台/备份入口（mp.weixin.qq.com 等政务号托管页、toutiao 等），可补充，不宜作唯一高价值证据 |
| weak | 低可信/用户生成来源（baike.baidu/csdn/jianshu/zhihu 等），需优先替换或补 primary |
| unknown | 当前规则无法可靠判定，需人工复核 |

**高价值 Case（criminal_verdict 等 4 类）**：新条目需 ≥2 源且含 ≥1 primary 一手来源。历史高价值 Case 缺 primary 是已公示技术债（admission.mjs 报 warning 不阻断，由 `audit:case-source-quality` 跟踪）。

## 5. 历史占位引用修复工单

`admission-baseline.json` 的 `placeholderExempt` 记录 218 个含占位 link 的历史实体 ID（技术债公示）。这些条目跳过占位禁令，由历史修复工单处理（混合策略：能找到权威主题对应具体页的直接替换，找不到的补一条具体来源 + 保留占位作辅助）。修复后已彻底替换/删除占位的 ID 从 `placeholderExempt` 移除。

工单文件：`research/placeholder-fix-todo.json`（gitignore，记录每文件修复状态）。

## 6. 与现有门禁的关系（不重复表）

| 门禁 | 职责 | 是否阻断 |
|---|---|---|
| `require-references.mjs` | references ≥1 + 合法 URL 结构 | ✅ build 链 |
| `case-source-quality.mjs` | Case 来源质量审计报告（分级统计） | ❌ exit 0 |
| `keywords.mjs` + `data-integrity.test.ts` | keywords 非空/去重/含 title/无纯 ID | ✅ |
| `avoidance-content.mjs --strict` | avoidance description≥40/limitation≥30 全库 + 套话/信号词 | ✅ build 链 |
| `entity-text-length.mjs` | 全库中文字符数与英文单词数宽松上限 | ✅ build 链 |
| `check-entity-relations.mjs` | 交叉引用有效性/孤儿检测/关系合法性 | ✅ |
| **`admission.mjs`（本标准）** | 占位禁令 + keywords≥3/4 + 文本长度下限（新增条目）+ 高价值 Case ≥2源含primary | ✅ build 链 |

分工：admission 不重复查"references ≥1 + 合法 URL"（require-references 管）；不重复查 keywords 含 title（test 管）；不重复查 avoidance 全库 description≥40（avoidance-content 管，admission 对新增 avoidance 更严 ≥60）。admission 只补：占位禁令、数量/长度下限和高价值 Case 源质量；全库上限统一由 entity-text-length 管理。

## 7. discover 衔接

- **标准注入评审关**：`write-drafts.mjs` 的 `ENTITY_STANDARD` 6 类各追加【内容下限】段，`buildReviewPrompt` 评审第1项"质量"引用本标准阈值，`buildDraftPrompt` 补 references 禁占位 + 高价值 Case ≥2源。
- **build 链自动跑到**：admission.mjs 接入 `validate:data`，discover `verify.mjs` 阶段7 第4步 `npm run validate:data` 自动卡准入。discover 落盘的新条目不在 baseline `exemptIds`，严格执行所有下限；评审关 + Zod 预校验 + admission 三层卡。
- **失败回滚**：admission 卡住 → verify.mjs 失败 → 提示回滚 worktree。故 `ENTITY_STANDARD`/`buildDraftPrompt` 约束补丁必须与 admission.mjs 同步上线。
