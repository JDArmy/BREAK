---
name: search
description: 使用 Scrapingdog API 进行多搜索引擎搜索，支持百度、Google、Bing、DuckDuckGo、Google Scholar 等搜索引擎
argument-hint: "[engine] [query] — engine: baidu|google|bing|duckduckgo|scholar|general, query: 搜索关键词"
arguments: [engine, query]
allowed-tools: Bash
---

# Scrapingdog 搜索引擎调用

根据用户指定的搜索引擎和关键词，使用 Scrapingdog 专用搜索 API 进行搜索，返回结构化 JSON 数据。

## 参数说明

- `$engine`：搜索引擎类型，支持以下值：
  - `baidu` — 百度搜索
  - `google` — Google 搜索
  - `bing` — Bing 搜索
  - `duckduckgo` — DuckDuckGo 搜索
  - `scholar` — Google Scholar 学术搜索
  - `general` — 通用搜索 API
- `$query`：搜索关键词

如果 `$engine` 为空，默认使用 `baidu`。
如果 `$query` 为空，提示用户输入搜索关键词。

## API 密钥

API 密钥从环境变量获取：`$SCRAPINGDOG_API_KEY`

## 各搜索引擎调用方式

根据 `$engine` 的值，执行对应的 Python 脚本：

### 百度搜索 (baidu)

```python
import requests
import json
import os

api_key = os.getenv("SCRAPINGDOG_API_KEY")
query = "$query"

url = "https://api.scrapingdog.com/baidu/search"
params = {
    "api_key": api_key,
    "query": query
}

response = requests.get(url, params=params)
if response.status_code == 200:
    data = response.json()
    print(json.dumps(data, ensure_ascii=False, indent=2))
else:
    print(f"请求失败，状态码: {response.status_code}")
    print(response.text)
```

### Google 搜索 (google)

```python
import requests
import json
import os

api_key = os.getenv("SCRAPINGDOG_API_KEY")
query = "$query"

url = "https://api.scrapingdog.com/google"
params = {
    "api_key": api_key,
    "query": query,
    "country": "us",
    "domain": "google.com",
    "combined_output": "true"
}

response = requests.get(url, params=params)
if response.status_code == 200:
    data = response.json()
    print(json.dumps(data, ensure_ascii=False, indent=2))
else:
    print(f"请求失败，状态码: {response.status_code}")
    print(response.text)
```

### Bing 搜索 (bing)

```python
import requests
import json
import os

api_key = os.getenv("SCRAPINGDOG_API_KEY")
query = "$query"

url = "https://api.scrapingdog.com/bing/search"
params = {
    "api_key": api_key,
    "query": query
}

response = requests.get(url, params=params)
if response.status_code == 200:
    data = response.json()
    print(json.dumps(data, ensure_ascii=False, indent=2))
else:
    print(f"请求失败，状态码: {response.status_code}")
    print(response.text)
```

### DuckDuckGo 搜索 (duckduckgo)

```python
import requests
import json
import os

api_key = os.getenv("SCRAPINGDOG_API_KEY")
query = "$query"

url = "https://api.scrapingdog.com/duckduckgo/search"
params = {
    "api_key": api_key,
    "query": query
}

response = requests.get(url, params=params)
if response.status_code == 200:
    data = response.json()
    print(json.dumps(data, ensure_ascii=False, indent=2))
else:
    print(f"请求失败，状态码: {response.status_code}")
    print(response.text)
```

### Google Scholar 学术搜索 (scholar)

```python
import requests
import json
import os

api_key = os.getenv("SCRAPINGDOG_API_KEY")
query = "$query"

url = "https://api.scrapingdog.com/google_scholar"
params = {
    "api_key": api_key,
    "query": query,
    "results": 10,
    "page": 0,
    "language": "en"
}

response = requests.get(url, params=params)
if response.status_code == 200:
    data = response.json()
    print(json.dumps(data, ensure_ascii=False, indent=2))
else:
    print(f"请求失败，状态码: {response.status_code}")
    print(response.text)
```

### 通用搜索 (general)

```python
import requests
import json
import os

api_key = os.getenv("SCRAPINGDOG_API_KEY")
query = "$query"

url = "https://api.scrapingdog.com/search"
params = {
    "api_key": api_key,
    "query": query,
    "country": "us",
    "language": "en"
}

response = requests.get(url, params=params)
if response.status_code == 200:
    data = response.json()
    print(json.dumps(data, ensure_ascii=False, indent=2))
else:
    print(f"请求失败，状态码: {response.status_code}")
    print(response.text)
```

## 执行要求

1. 根据用户指定的 `$engine` 选择对应的 Python 脚本模板
2. 将 `$query` 中的内容作为搜索关键词
3. 使用 Bash 工具执行 Python 脚本，命令格式：`python3 -c '脚本内容'`
4. 解析返回的 JSON 数据，提取关键信息（标题、链接、摘要等）
5. 用中文向用户呈现搜索结果摘要
6. 如果请求失败，报告错误信息并建议用户检查 API 密钥和网络连接

## 注意事项

- **必须使用专用搜索 API 端点**，不要使用通用 `/scrape` 端点
- 专用端点直接返回结构化 JSON，无需解析 HTML
- API 密钥通过环境变量 `SCRAPINGDOG_KEY` 获取，不要硬编码
