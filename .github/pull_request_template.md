## 变更类型

- [ ] 数据内容
- [ ] 应用功能
- [ ] 文档
- [ ] 构建/依赖

## 变更日志

- [ ] 已在 `CHANGELOG.md` 记录本次变更
- [ ] 已标注影响类型：data / app / docs / build
- [ ] 数据项新增、删除、关系变更已列出受影响实体 ID

## 数据维护检查

- [ ] 新增或修改实体已同步中英文文件
- [ ] 参考资料包含可访问的 `https?` 链接
- [ ] 关系字段引用的 ID 已存在
- [ ] 业务场景、风险、规避手段、攻击工具、威胁行为者的关联已复核
- [ ] 若影响公开数据包，已确认 `public/data` 与 npm 数据包评估产物可重新生成

## 验证

- [ ] `npm run validate:data`
- [ ] `npm run validate:schema-docs`
- [ ] `npm run export:data && npm run validate:data-export`
- [ ] `npm run export:data-package && npm run validate:data-package`
- [ ] `npm run audit:references`
- [ ] `npm run audit:metrics`
- [ ] `npm run test`
- [ ] `npm run test:coverage`
- [ ] `npm run build`

## 说明

请说明本次变更影响的实体 ID、关系或页面。
