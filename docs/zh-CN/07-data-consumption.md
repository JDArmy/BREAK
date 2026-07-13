---
title: 数据消费指南
category: 参考
order: 7
slug: data-consumption
---

# 数据消费指南

BREAK 提供 JSON、STIX 2.1 和 JSON-LD 三类公开数据格式。外部系统应先读取 Manifest，再按需要下载数据，并使用版本号和 SHA-256 判断是否需要刷新缓存。

## 公开入口

| 格式      | 地址                                                                                                     | 适用场景                   |
| --------- | -------------------------------------------------------------------------------------------------------- | -------------------------- |
| Manifest  | `https://break.jd.army/data/break-manifest.json`                                                         | 版本、计数、哈希与生成时间 |
| 中文 JSON | `https://break.jd.army/data/break-data.json`                                                             | 完整中文结构数据           |
| 英文 JSON | `https://break.jd.army/data/break-data-en.json`                                                          | 与中文相同结构的英文文本   |
| STIX 2.1  | `https://break.jd.army/data/break-stix-zh.json` / `https://break.jd.army/data/break-stix-en.json`        | CTI、SIEM、SOAR 集成       |
| JSON-LD   | `https://break.jd.army/data/break-ld-zh.jsonld` / `https://break.jd.army/data/break-ld-en.jsonld`        | 知识图谱、RDF、语义网      |

## 最小读取示例

```js
const base = "https://break.jd.army/data";
const manifest = await fetch(`${base}/break-manifest.json`).then((r) =>
  r.json(),
);
const data = await fetch(`${base}/break-data.json`).then((r) => r.json());

console.log(manifest.packageVersion, manifest.counts);
console.log(data.data.risks.R0001);
```

生产消费方应检查 HTTP 状态、设置超时，并把上一次成功数据保留为回退缓存。Manifest 的 SHA-256 可用于验证下载内容是否完整。

## 兼容与版本

- `package.json` 与 Manifest 的 `packageVersion` 表示一次发布版本。
- 实体的整数 `version` 表示该实体的内容演进，可用于增量同步。
- 补丁版本通常保持结构兼容；次版本可能增加字段或产物；主版本可能调整结构语义。
- Schema 变更以 `DATA_SCHEMA.md`、`CHANGELOG.md` 和 Manifest 版本为判断依据，不要依赖对象字段顺序。
- 中文数据包是结构权威；英文数据包复用相同结构，只替换可翻译文本。

## 关系解析

关系字段存储实体 ID。消费方应先建立各实体集合的 ID 索引，再解析 `avoidances`、`directCauseRisks`、`relatedRisks` 等关系。Case 不在 BREAK 主对象的浏览器 eager 数据中，但公开静态数据包包含完整 Case 集合。

完整字段定义见 [数据模型与字段说明](/docs/data-model)，STIX 映射细节见仓库根目录 `STIX_MAPPING.md`。
