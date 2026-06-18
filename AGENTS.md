# 项目规则

## 语言规范

- 所有交流和文档必须使用中文，包括代码注释、commit 信息、文档说明等。

## 数据格式规范

BREAK 数据结构以 `src/validation/breakSchema.ts` 和 `npm run validate:data` 为准。下面规则用于协作时快速判断，不替代脚本校验。

### Risk（风险）

**文件路径**：`src/BREAK/risks/{ID}.json`  
**ID格式**：`R` + 4位数字，子风险用 `-` 连接（如 `R0001`、`R0001-001`）

```json
{
  "R0001": {
    "title": "风险标题",
    "keywords": ["关键词1", "Keyword1", "关键词2"],
    "definition": "一句话定义",
    "description": "详细描述（2-3段）",
    "complexity": "低级/中级/高级",
    "influence": "影响说明",
    "avoidances": ["A0001", "A0002"],
    "references": [
      {"link": "https://...", "title": "引用标题"}
    ],
    "updated": "2026-06-16"
  }
}
```

**英文翻译**：`src/i18n/en/BREAK/risks/{ID}.json`（只放可翻译文本，如 title, keywords, definition, description, complexity, influence, references[].title）

### Avoidance（规避手段）

**文件路径**：`src/BREAK/avoidances/{ID}.json`  
**ID格式**：`A` + 4位数字，子手段用 `-` 连接（如 `A0001`、`A0001-001`）

```json
{
  "A0001": {
    "title": "规避手段标题",
    "category": "AC01",
    "keywords": ["关键词1", "Keyword1"],
    "definition": "一句话定义",
    "description": "详细描述",
    "limitation": "局限性说明",
    "references": [
      {"link": "https://...", "title": "引用标题"}
    ],
    "updated": "2026-06-16"
  }
}
```

**英文翻译**：`src/i18n/en/BREAK/avoidances/{ID}.json`

### AttackTool（攻击工具）

**文件路径**：`src/BREAK/attack-tools/{ID}.json`  
**ID格式**：`AT` + 4位数字，子工具用 `-` 连接（如 `AT0001`、`AT0001-001`）

```json
{
  "AT0001": {
    "title": "工具标题",
    "keywords": ["关键词1", "Keyword1"],
    "description": "详细描述",
    "directCauseRisks": ["R0001"],
    "indirectSupportRisks": ["R0002"],
    "avoidances": ["A0001"],
    "references": [
      {"link": "https://...", "title": "引用标题"}
    ],
    "updated": "2026-06-16"
  }
}
```

**英文翻译**：`src/i18n/en/BREAK/attack-tools/{ID}.json`

### ThreatActor（威胁行为者）

**文件路径**：`src/BREAK/threat-actors/{ID}.json`  
**ID格式**：`TA` + 4位数字，子行为者用 `-` 连接（如 `TA0001`、`TA0001-001`）

```json
{
  "TA0001": {
    "title": "威胁行为者标题",
    "keywords": ["关键词1", "Keyword1"],
    "description": "详细描述",
    "buildAttackTools": ["AT0001"],
    "useAttackTools": ["AT0002"],
    "directCauseRisks": ["R0001"],
    "indirectSupportRisks": ["R0002"],
    "references": [
      {"link": "https://...", "title": "引用标题"}
    ],
    "updated": "2026-06-16"
  }
}
```

**英文翻译**：`src/i18n/en/BREAK/threat-actors/{ID}.json`

### Term（行业术语）

**文件路径**：`src/BREAK/terms/{ID}.json`  
**ID格式**：`T` + 4位数字（如 `T0001`）

```json
{
  "T0001": {
    "title": "术语标题",
    "aliases": ["别名1", "别名2"],
    "category": "TC01",
    "keywords": ["关键词1", "Keyword1"],
    "definition": "一句话定义",
    "description": "详细描述（2-3段）",
    "usageExample": "使用场景示例",
    "relatedRisks": ["R0001"],
    "relatedAvoidances": ["A0001"],
    "relatedAttackTools": ["AT0001"],
    "relatedThreatActors": ["TA0001"],
    "relatedBusinessScenes": ["BS01"],
    "references": [
      {"link": "https://...", "title": "引用标题"}
    ],
    "updated": "2026-06-16"
  }
}
```

**英文翻译**：`src/i18n/en/BREAK/terms/{ID}.json`（仅包含 title, aliases, keywords, definition, description, usageExample, references[].title）

### 字段说明

**通用字段与必填差异**：
- 除 BusinessScene 外，所有知识实体均需要 `title`、`keywords`、`description`、`references`。
- `definition`：Risk、Avoidance、Term 必需；AttackTool、ThreatActor 不维护该字段。
- `category`：Avoidance、Term 必需；Risk、AttackTool、ThreatActor 不维护该字段。
- `complexity`：Risk 必需且只能是 `初级`、`中级`、`高级`；Avoidance 可选。
- `influence`：Risk 必需。
- `limitation`：Avoidance 可选；Risk 当前 schema 不维护该字段。
- `updated`：建议保留，格式 YYYY-MM-DD；schema 中为可选。
- `references`：必须是数组，元素包含 `title` 与合法 URL `link`。

**关系字段**：
- Risk 的 `avoidances` 必须非空，并引用存在的 Avoidance。
- AttackTool 的 `directCauseRisks`、`indirectSupportRisks`、`avoidances` 必须非空。
- ThreatActor 的 `directCauseRisks`、`indirectSupportRisks` 必须非空；`buildAttackTools` 和 `useAttackTools` 用于区分自建与使用工具。
- Avoidance 不维护 `risks` 字段，Avoidance 与 Risk 的关系以 Risk.avoidances 和 AttackTool.avoidances 为主。
- `directCauseRisks`：直接造成的风险
- `indirectSupportRisks`：间接支持的风险
- `buildAttackTools`/`useAttackTools`：自建/使用的工具
- Term 可以维护 `relatedRisks`、`relatedAvoidances`、`relatedAttackTools`、`relatedThreatActors`、`relatedBusinessScenes`。
- 风险所属商业场景不在 Risk 实体中维护，不要给 `src/BREAK/risks/*.json` 增加 `relatedBusinessScenes`。BusinessScene 是风险场景归类的权威来源，关系维护在 `src/BREAK/business-scenes/*.json` 的 `riskScenes[*].risks` 中。
- `src/i18n/en/BREAK/business-scenes/*.json` 只维护 BusinessScene、RiskDimension、RiskScene 的英文文本翻译；不要在英文 i18n 文件里维护 `risks`、`riskScenes` 数组、`relatedBusinessScenes` 等结构关系。

### BusinessScene（商业场景）

**文件路径**：`src/BREAK/business-scenes/{ID}.json`  
**ID格式**：`BS` + 2位数字（如 `BS00`、`BS01`）

- BusinessScene 是风险到业务场景归类的权威来源。
- BusinessScene（业务场景）是行业/业务域容器，例如全场景、金融、电商、交通出行、Web3、IoT、元宇宙等；它回答“这个风险在哪类业务/行业中出现”。
- RiskScene（风险场景）是 BusinessScene 内部的风险问题域，例如接口与自动化攻击、内部与供应链安全、支付资金金融欺诈、AI 模型与数据安全、区块链基础设施与共识安全等；它回答“这个风险属于哪类风险问题”。
- RiskDimension（风险维度）是 BusinessScene 内部对 RiskScene 的上层导航分组，例如交易维度、运营维度、身份维度、对抗维度、AI 与数据维度、区块链与虚拟资产维度、物联网与设备维度、元宇宙与空间计算维度；它只组织 RiskScene，不直接承载 Risk ID。
- `riskDimensions[*].riskScenes` 维护维度包含哪些风险场景。
- `riskScenes[*].risks` 维护该风险场景覆盖哪些 Risk。
- 判断“Risk 是否已更新到业务场景”时，只看 `src/BREAK/business-scenes/*.json` 中是否存在 `BSxx.riskScenes[RSxx].risks` 引用该 Risk；不要检查或新增 Risk 实体里的 `relatedBusinessScenes`。
- 顶层 `risks` 仅用于兼容，正常情况下保持 `[]`，不要把已分配主场景的风险重复放到顶层。
- 新增、删除、调整 Risk 后，必须同步检查 BusinessScene 覆盖：

```bash
node scripts/validate/business-scenes.mjs
node scripts/validate/metrics.mjs
```

**术语专用**：
- `aliases`：别名数组
- `usageExample`：使用场景示例

**注意事项**：
- 所有数组字段为空时也必须保留（写为 `[]`）
- 英文翻译文件不包含结构数据（如ID数组、references[].link、updated）
- 中文结构文件是结构关系的唯一数据源，英文文件只包含翻译文本
- 不要把纯实体 ID（如 `R0222`、`A0195`、`T0522`）放入 `keywords`

## 组件架构

### 知识库详情页面的两种实现

项目中知识库条目的详情展示有两种不同的实现方式，请注意区分：

#### 1. 列表详情页（主要使用）

**位置：** `src/views/`
- `RisksView.vue` - 风险列表详情页
- `AvoidancesView.vue` - 规避手段列表详情页
- `AttackToolsView.vue` - 攻击工具列表详情页
- `ThreatActorsView.vue` - 威胁行为者列表详情页

**路由：**
- `/risks` → 风险列表页
- `/avoidances` → 规避手段列表页
- `/attack-tools` → 攻击工具列表页
- `/threat-actors` → 威胁行为者列表页

**特点：**
- 左右分栏布局（左侧列表，右侧详情）
- 使用 `KnowledgeSplitView` 组件
- 通过 URL hash 定位具体条目（如 `/risks#R0001`）
- **显示内容**：包含关键词（keywords）和更新时间（updated）

#### 2. 抽屉详情页（辅助使用）

**位置：** `src/components/`
- `RiskDetail.vue` - 风险抽屉
- `AvoidanceDetail.vue` - 规避手段抽屉
- `AttackToolDetail.vue` - 攻击工具抽屉
- `ThreatActorDetail.vue` - 威胁行为者抽屉

**路由：**
- `/risks/:rKey` → 打开风险抽屉
- `/avoidances/:aKey` → 打开规避手段抽屉
- `/attack-tools/:atKey` → 打开攻击工具抽屉
- `/threat-actors/:taKey` → 打开威胁行为者抽屉

**特点：**
- Drawer 抽屉形式，从右侧滑出
- 主要在首页点击风险时弹出
- 所有路由都指向 `HomeView.vue`，由其控制抽屉显示
- **显示内容**：简化版信息，**不显示**关键词和更新时间
- 节点ID可点击跳转到对应的列表详情页

**使用场景区别：**
- 列表详情页：用户主动浏览知识库条目时使用（完整信息）
- 抽屉详情页：从首页快速查看风险时使用（简化信息）

## 版本更新

- 每次版本更新时，要更新 `CHANGELOG.md` 文件（注意：文件名必须全大写），记录版本更新内容和变更日志。
- 更新 `package.json` 中的版本号时，要同步更新 `src/BREAK/basic-info/main.json` 中的 `version` 和 `updated` 字段。

## 国际化同步

- 当 `src/BREAK/` 下的任何 JSON 文件发生修改（新增、编辑、删除条目）时，必须同步更新 `src/i18n/en/BREAK/` 下对应文件中的**文本翻译字段**（如 title, description, definition, complexity, influence, references[].title；具体字段以对应实体实际 schema 为准）。
- 英文翻译文件只需包含可翻译的文本字段，结构数据（ID 数组、references[].link、updated 等）会在运行时从中文源自动合并。
- 中文内容在 `src/BREAK/` 中维护（唯一数据源），英文翻译在 `src/i18n/en/BREAK/` 中维护，两者的 key 结构必须完全对应。
- i18n 运行时合并机制：`mergeWithStructure(中文源数据, 英文翻译)` → 中文结构字段 + 英文翻译文本。
- `keywords` 和 `aliases` 在英文翻译中按完整数组替换，不要求与中文数组长度一致，也不能为了对齐长度生成占位词。
- 英文翻译不得包含中文残留；不得包含 `title + controls/policy/pattern/...`、`keyword 1`、`alias 1` 这类模板化文本。
- BusinessScene 英文文件只翻译 `title`、`description`、`riskDimensions[*].title`、`riskScenes[*].title`；风险 ID 列表只在中文结构文件中维护。
- 文件名和 key 同步、英文中文残留、模板化 keyword/alias 都由 `npm run validate:data` 覆盖；修改数据后必须运行该命令。

## LLM 调用记录

- 可用于翻译、润色、术语 gloss 生成等文本工作。
- OpenAI 兼容接口：
  - `api_url = "http://ai-api.jdcloud.com/v1/chat/completions"`
  - `api_key_env = "DIGITALSANG_LLM_API_KEY"`
  - `model = "DeepSeek-V4-Pro"`
- 使用要求：
  - 优先从环境变量读取 key，不要把明文 key 写入仓库。
  - 适合批量生成英文术语标题、英文 gloss、说明文案润色等。
  - 对结构化输出，优先使用可解析的纯文本 TSV 或 JSON，并在落盘前做严格校验。
- 当前项目中的相关脚本：
  - `scripts/import/generate-term-en-glossary.mjs`：调用该 LLM 批量生成 `term id -> 英文 gloss`
  - `scripts/import/generate-term-en-content-overrides.mjs`：调用该 LLM 批量生成 `term id -> 英文 definition / description / usageExample / 引用标题`
  - `scripts/import/import-terms-from-text.mjs`：导入黑话后优先使用 `scripts/import/term-en-glossary.json`、`scripts/import/term-en-glossary-overrides.json`、`scripts/import/term-en-content-overrides.json` 生成纯英文 terms

## Keywords 批处理规范

- `keywords` 是站内搜索的重要字段，适合用分批方式集中回刷，不适合零散手改。
- 批量处理时，优先按 `scripts/validate/keyword-batches.mjs` 生成的分组执行，默认每 `50` 个文件一组：

```bash
node scripts/validate/keyword-batches.mjs --batch 1
node scripts/validate/keyword-batches.mjs --json
```

- 推荐流程：
  1. 先按批次分组。
  2. 用子代理分别处理互不重叠的批次。
  3. 子代理只允许改各自文件里的 `keywords` 字段，不能碰其他字段。
  4. 所有批次完成后，再统一执行审计和构建。

- 中文关键词取舍原则：
  - 保留标题本身。
  - 补充常见搜法、别名、黑话、缩写、上下游分工称呼、攻击/风控语境高频词。
  - 避免把邻近概念硬塞进不相关实体，例如验证码、人机验证、木马等泛词乱扩散。
  - 多子实体文件必须逐项单独判断，不能整文件复用同一套词。
  - 不要用纯实体 ID 充当关键词，例如 `R0222`、`A0195`、`T0522`。

- 英文关键词取舍原则：
  - 保留标题本身。
  - 不要添加仅仅是 title 的 lowercase 复写。
  - 优先真实英文检索短语、缩写、术语、常见别名。
  - 避免 `security`、`risk`、`fraud`、`attack`、`attacker`、`hacker` 这类过宽泛词无差别扩散。
  - 尽量避免中式直译，要偏向真实会被搜索的英文 phrase。
  - 严禁用模板化占位词补数，例如 ``${title} controls``、``${title} monitoring``、``${title} policy``、``${title} pattern``、``${title} indicators``、``${title} mitigation``、``${title} keyword 1``。
  - 英文 `aliases` 也必须是真实别名或常见叫法，严禁生成 ``${title} alias 1`` 这类占位内容；没有可靠英文别名时宁可保留 `[]`。
  - 如果修复脚本缺少语义关键词来源，必须失败并人工补词，不能退化成 `[title]` 或标题拼接词。

- 关键词回刷完成后的固定收口步骤：

```bash
npm run audit:keywords
npm run validate:data
npm run build
```

- 说明：
  - `audit:keywords` 只负责输出规范化和去重建议，不允许直接写入实体数据；是否修改由 AI/人工判断后再精确编辑。
  - `fix:keywords` 当前仅作为兼容别名，行为必须等同 `audit:keywords`，不能带 `--write`。
  - `audit:keywords` / `validate:data` 必须通过，尤其要防止大小写意义上的重复关键词。


- 每次 commit 前都要进行版本更新：小的变化和改动进行补丁版本更新（如 1.2.0 → 1.2.1），较大的变化进行次版本更新（如 1.2.0 → 1.3.0），重大变化进行主版本更新（如 1.2.0 → 2.0.0）。
- 每次 commit 前，都需要执行 `npm run build` 确保构建通过。

## Scrapingdog API 用法

使用 Scrapingdog API 进行网页抓取和数据收集。

- **文档地址**: https://docs.scrapingdog.com/
- **认证方式**: API 密钥存储在环境变量 `SCRAPINGDOG_API_KEY` 中
- **使用方法**:
  - Node.js: `process.env.SCRAPINGDOG_API_KEY`
  - Python: `os.getenv('SCRAPINGDOG_API_KEY')`

### 正确的 API 调用方式

**重要**：优先使用专门的搜索 API，而不是通用抓取 API，这样可以直接获得结构化 JSON 数据。

**1. 百度搜索 API**

```python
import requests

url = "https://api.scrapingdog.com/baidu/search"
params = {
    "api_key": "YOUR_API_KEY",
    "query": "搜索关键词"
}
response = requests.get(url, params=params)
data = response.json()
```

**2. Google 搜索 API**

```python
import requests

url = "https://api.scrapingdog.com/google"
params = {
    "api_key": "YOUR_API_KEY",
    "query": "search keywords",
    "country": "cn",
    "domain": "google.com"
}
response = requests.get(url, params=params)
data = response.json()
```

**3. 必应搜索 API**

```python
import requests

url = "https://api.scrapingdog.com/bing/search"
params = {
    "api_key": "YOUR_API_KEY",
    "query": "search keywords"
}
response = requests.get(url, params=params)
data = response.json()
```

**4. Google Scholar 学术搜索 API**

```python
import requests

url = "https://api.scrapingdog.com/google_scholar"
params = {
    "api_key": "YOUR_API_KEY",
    "query": "academic keywords",
    "results": 10,
    "page": 0,
    "language": "en"
}
response = requests.get(url, params=params)
data = response.json()
```

**5. 通用搜索 API**

```python
import requests

url = "https://api.scrapingdog.com/search"
params = {
    "api_key": "YOUR_API_KEY",
    "query": "keywords",
    "country": "us",
    "language": "en"
}
response = requests.get(url, params=params)
data = response.json()
```

### 支持的 API 服务

**搜索引擎**
- Google 搜索（通用、轻量、AI 模式、AI 概览）
- 百度搜索
- Bing 搜索
- DuckDuckGo 搜索

**Google 专业服务**
- Google 购物、地图（搜索/评论/照片/地点/帖子）、酒店、航班
- Google 图片、Lens、新闻、视频、Shorts
- Google 趋势、招聘、财经、专利、学术

**电商平台**
- Amazon（产品、搜索、报价）
- Walmart（产品、搜索）
- eBay（产品、搜索）
- Flipkart、Myntra（印度市场）

**社交媒体**
- LinkedIn（个人、公司、帖子、招聘）
- X/Twitter（帖子、个人资料、URL）
- Instagram（个人资料、帖子、帖子详情）
- TikTok（个人资料、帖子、广告）
- Facebook（帖子、个人资料、广告库）
- YouTube（搜索、频道、视频、评论、字幕）

**LLM 与工具**
- ChatGPT 抓取器
- 截图 API
- 数据中心代理
- Google Sheets 插件

### 经验教训

**错误方式**：使用通用抓取 API `/scrape` 端点。

```python
# 这种方式返回 HTML，需要手动解析，数据质量差
url = "https://api.scrapingdog.com/scrape"
params = {
    "api_key": API_KEY,
    "url": "https://www.baidu.com/s?wd=关键词",
    "dynamic": "false"
}
response = requests.get(url, params=params)
html = response.text
```

问题：
- 返回原始 HTML，需要复杂的解析逻辑
- 数据质量不稳定，容易遗漏关键信息
- 难以提取结构化数据（标题、链接、摘要等）
- 浪费 token 在 HTML 解析上

**正确方式**：使用专门的搜索 API 端点。

```python
# 直接返回结构化 JSON，无需解析
url = "https://api.scrapingdog.com/baidu/search"
params = {
    "api_key": API_KEY,
    "query": "关键词"
}
response = requests.get(url, params=params)
data = response.json()
results = data.get('Baidu_data', [])
```

优势：
- 返回结构化 JSON，直接可用
- 数据完整且格式统一
- 无需 HTML 解析，节省开发时间和 token
- 支持多种搜索引擎（百度、Google、Bing、Scholar 等）
