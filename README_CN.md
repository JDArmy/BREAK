# JDArmy BREAK - 业务风险枚举与规避知识框架

[English](./README.md) | 中文

## 框架线上地址：<https://break.jd.army/>

## 介绍

JDArmy BREAK 是英文 "Business Risk Enumeration & Avoidance Knowledge" 的缩写，是一个开放式"业务风险枚举与规避知识"框架。该框架通过对各种业务风险进行分类、介绍与枚举，为使用者提供了一个完整的业务风险全景图，并对业务规避风险、提升能力提供了规避知识。

> JDArmy BREAK 由JD.Army创建、拥有和进行管理。JD.Army是专注于挖掘和解决企业安全运行风险隐患的专业型红队。JD.Army保留自行决定定期更新 BREAK 和本文档的权利。虽然JD.Army拥有 BREAK 的所有权利和利益，但它许可公众自由使用，遵循相关开源协议。

## 背景

随着信息安全能力对业务的覆盖与落地，以及业务对安全需求的加深，如果安全还是单单停留在网络安全范畴，仅仅是提前发现和修复各种漏洞，显然是无法保证业务正常的安全运营的，也无法满足业务安全的更高需求。

为此，JDArmy根据多年以来对业务安全的理解和积累，推出 BREAK - "业务风险枚举与规避知识框架"，旨在为企业蓝军在开展业务安全评估过程中提供指导和依据，同时框架中的业务风险规避知识也为安全能力建设、业务安全运营、风控能力提升提供指引。

## 方法

框架整体按照：风险维度、风险场景、风险点的划分原则，框架包含若干风险维度，每个风险维度包含若干风险场景，每个风险场景包含若干风险点。

目前框架共收集和整理风险点 350 个、规避手段 300 个、攻击工具 110 个、威胁行为者 70 个、行业术语 600 个、业务场景 18 个、规避手段分类 4 个，后续会根据情况和反馈进行动态添加、升级或调整。每个风险点由风险编号、风险标题、风险定义、风险描述、风险复杂度、风险影响、规避手段、参考资料和攻击工具等组成。风险编号通过 R00xx 的方式来进行唯一编号（效仿Mitre ATT&CK），以便后期交流和情报传递。而攻击描述可以指引企业蓝军更好地进行安全能力评估，规避手段可以帮助企业红军或业务风控来加强安全能力建设，以降低业务风险。

**主要注意的是：** 业务风险和漏洞不是一回事情。一般来说漏洞是由于业务编码的缺陷导致的，可以通过修改代码去除缺陷来修复漏洞；而业务风险很大程度上并不是由编码缺陷造成的，只是攻击者对正常业务逻辑的一种非预期的利用。也因此，在大部分情况下，并不能完全消除风险，只能将风险降低到一定的可接受范围。所以并不一定可以通过直接修改代码来修复漏洞，通常业务风险需要外挂安全能力、构造风控模型来减缓攻击、降低攻击ROI或缩小攻击面。

## 协作 & 贡献

本框架采用JSON格式进行了系统描述，详见`/src/BREAK`文件夹。其中：

- `basic-info` 文件夹中存放本知识框架的基础信息
- `risks` 文件夹中存放风险列表
- `avoidances` 文件夹中存放规避手段
- `avoidance-categories` 文件夹中存放规避手段分类
- `business-scenes` 文件夹中存放业务场景
  - `riskDimensions` 字段为该业务场景所涉及的风险维度
  - `riskScenes` 字段为该业务场景所涉及的风险场景及相关风险
- `attack-tools` 文件夹中存放攻击工具列表
- `threat-actors` 文件夹中存放威胁行为者列表
- `terms` 文件夹中存放行业术语与黑话词汇表
- `utils.ts` 提供了通用的数据加载工具函数

各协作者可以通过直接修改各 JSON 文件来与我们进行该系统框架的协作开发。数据变更应通过 Schema 校验、i18n 同步检查和测试。亦可通过在 GitHub 上提 issue 来给我们提供意见或建议。

### 致谢

- 感谢团长、we1h0提供的建议

## 链接

- Github：<https://github.com/JDArmy/BREAK>

## 开发

需要 Node.js 20.19+ 或 22.12+。

```shell
npm install
npm run dev
```

### 校验

```shell
npm run validate:data
npm run audit:metrics
npm run audit:references
npm run audit:maintenance
npm run test
npm run test:coverage
npm run validate:schema-docs
npm run schema:docs:write
npm run export:data
npm run validate:data-export
npm run validate:docs-build
npm run test:smoke
npm run test:performance
npm run test:relation-stability
npm run build
npm run audit:bundle
npm run audit:bundle:check
npm run build-only
npm run lint
npm run type-check
```

`npm run validate:data` 会执行 JSON Schema 校验、i18n key 同步检查、关系覆盖审计和生成式 Schema 文档同步检查。
`npm run build` 会执行 `lint`、`type-check`、`validate:data`、`test`、`test:coverage`、`validate:schema-docs`、`validate:docs-build`、`export:data`、`build-only`、`audit:bundle:check`、`validate:data-export`、`test:smoke`、`test:performance` 和 `test:relation-stability`。
`npm run test:coverage` 会对关系分析、搜索、安全 i18n 和 BREAK 数据工具执行核心逻辑覆盖率门禁。
`npm run validate:schema-docs` 会检查 [DATA_SCHEMA.md](./DATA_SCHEMA.md) 是否与 `src/validation/breakSchema.ts` 同步。
`npm run schema:docs:write` 会在 Schema 变更后重新生成 [DATA_SCHEMA.md](./DATA_SCHEMA.md)。
`npm run export:data` 会生成 `public/data/break-data.json` 和 `public/data/break-manifest.json` 静态数据包。
`npm run validate:data-export` 会检查公共数据包、manifest hash、实体计数、版本号和 GitHub Pages 产物同步状态。
`npm run validate:docs-build` 会检查已提交的 `docs/` GitHub Pages 产物是否与当前构建输出一致。
`npm run test:smoke`、`npm run test:performance` 和 `npm run test:relation-stability` 会使用 Playwright 验证生成后的静态站点。
`npm run audit:metrics` 会生成内容可信度、关系覆盖、分类分布和业务场景覆盖基线报告。
`npm run audit:bundle` 会基于 `docs/assets` 检查构建产物是否超过 bundle 预算。
`npm run audit:maintenance` 会刷新审计报告并生成统一维护汇总。

### 静态数据

- Manifest：<https://break.jd.army/data/break-manifest.json>
- 数据包：<https://break.jd.army/data/break-data.json>

静态数据包提供当前中文 BREAK 数据，并包含版本、生成信息、实体计数、字节数和 SHA-256 校验值，便于外部工具直接消费。
