# BREAK 贡献指南

感谢参与 BREAK 的数据、应用和文档维护。提交前请先阅读在线站点中的[贡献与维护](https://break.jd.army/#/docs/contribution)以及仓库内的 [ADMISSION-STANDARD.md](./ADMISSION-STANDARD.md)。数据结构以 `src/validation/breakSchema.ts` 和 `npm run validate:data` 为准。

## 本地开发

```shell
npm ci
npm run dev
```

Node.js 版本要求为 24.0+，推荐使用 `.nvmrc`。运行浏览器测试前执行：

```shell
npx playwright install chromium
```

## 提交流程

1. 保持修改范围聚焦，不覆盖工作区中的无关改动。
2. 修改 `src/BREAK/` 实体时同步更新对应英文 i18n 文件。
3. 有实体实质变化时运行 `npm run entity:version:bump`。
4. 主关系变化后运行 `npm run sync:lateral-relations`。
5. 使用 `npm run version:sync -- --bump=patch|minor|major --note="说明"` 更新项目版本和 CHANGELOG。
6. 提交前运行 `npm run build`；至少应运行与变更范围直接相关的校验和测试。

## 变更说明

PR 应说明影响类型（data / app / docs / build）、涉及的实体 ID、关系变化、验证命令及结果。新增实体必须满足准入标准，引用链接必须落到能够直接支撑内容的具体页面。

安全漏洞或不宜公开的问题不要提交公开 Issue，请按 [SECURITY.md](./SECURITY.md) 报告。
