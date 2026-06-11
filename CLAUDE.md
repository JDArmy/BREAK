# 项目规则

## 语言规范

- 所有交流和文档必须使用中文，包括代码注释、commit 信息、文档说明等。

## 版本更新

- 每次版本更新时，要更新 `CHANGELOG.md` 文件（注意：文件名必须全大写），记录版本更新内容和变更日志。
- 更新 `package.json` 中的版本号时，要同步更新 `src/BREAK/basic-info/main.json` 中的 `version` 和 `updated` 字段。

## 国际化同步

- 当 `src/BREAK/` 下的任何 JSON 文件发生修改（新增、编辑、删除条目）时，必须同步更新 `src/i18n/en/BREAK/` 下对应文件中的**文本翻译字段**（title, description, definition, complexity, influence, limitation, references[].title 等）。
- 英文翻译文件只需包含可翻译的文本字段，结构数据（ID 数组、references[].link、updated 等）会在运行时从中文源自动合并。
- 中文内容在 `src/BREAK/` 中维护（唯一数据源），英文翻译在 `src/i18n/en/BREAK/` 中维护，两者的 key 结构必须完全对应。
- i18n 运行时合并机制：`mergeWithStructure(中文源数据, 英文翻译)` → 中文结构字段 + 英文翻译文本。


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
