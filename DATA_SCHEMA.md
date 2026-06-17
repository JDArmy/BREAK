# BREAK Data Schema

> Generated from `src/validation/breakSchema.ts` for package version `2.14.2`.
> Last schema doc review: 2026-06-17. Run `npm run schema:docs:write` after schema changes.

This document describes the committed JSON data model used by the BREAK knowledge base. The source of truth is the Zod schema in `src/validation/breakSchema.ts`; `npm run validate:schema-docs` checks this document against that source.

## File And ID Rules

| Entity | Directory | File pattern | ID pattern | Current records |
|--------|-----------|--------------|------------|-----------------|
| Risk | `src/BREAK/risks` | `R0001.json` | `R0001 or R0001-001` | 350 total (255 main, 95 sub) |
| Avoidance | `src/BREAK/avoidances` | `A0001.json` | `A0001 or A0001-001` | 300 total (222 main, 78 sub) |
| AttackTool | `src/BREAK/attack-tools` | `AT0001.json` | `AT0001 or AT0001-001` | 110 total (97 main, 13 sub) |
| ThreatActor | `src/BREAK/threat-actors` | `TA0001.json` | `TA0001 or TA0001-001` | 70 total (61 main, 9 sub) |
| Term | `src/BREAK/terms` | `T0001.json` | `T0001` | 600 total (600 main, 0 sub) |
| BusinessScene | `src/BREAK/business-scenes` | `BS00.json` | `BS00` | 18 total (18 main, 0 sub) |

Parent and child records live in the parent JSON file. For example, `R0001-001` belongs in `src/BREAK/risks/R0001.json`.

## Shared Types

### Reference

| Field | Type | Requirement | Description |
|-------|------|-------------|-------------|
| `title` | string | required | Reference title. |
| `link` | URL string | required | Valid absolute URL. |

### Keyword Rules

- `keywords` must be a non-empty array of unique, non-empty strings.
- Pure entity IDs such as `R0001`, `A0001`, `AT0001`, `TA0001`, or `T0001` are not accepted as standalone keywords.
- Use `npm run audit:keywords` to check keyword quality and `npm run fix:keywords` to normalize whitespace and duplicates.

## Entity Schemas

### Risk

业务风险条目，描述攻击或滥用行为对业务造成的风险。

| Field | Type | Requirement | Description |
|-------|------|-------------|-------------|
| `title` | string | required | 展示标题。 |
| `keywords` | string | required | 搜索关键词；必须非空，且不能重复。 |
| `definition` | string | required | 简短定义。 |
| `description` | string | required | 详细说明。 |
| `complexity` | "初级" \| "中级" \| "高级" | required | 复杂度或实施难度。 |
| `influence` | string | required | 业务影响。 |
| `avoidances` | string | required | 关联规避手段 ID 列表。 Target: Avoidance. |
| `references` | Reference[] | optional, defaults to empty array | 参考资料列表。 |
| `updated` | string | optional | 最近更新日期，建议使用 YYYY-MM-DD。 |

### Avoidance

规避手段条目，描述可用于降低风险的控制措施。

| Field | Type | Requirement | Description |
|-------|------|-------------|-------------|
| `title` | string | required | 展示标题。 |
| `keywords` | string | required | 搜索关键词；必须非空，且不能重复。 |
| `category` | string | required | 分类 ID 或分类名称。 |
| `definition` | string | required | 简短定义。 |
| `description` | string | required | 详细说明。 |
| `complexity` | string | optional | 复杂度或实施难度。 |
| `limitation` | string | optional | 控制措施局限性。 |
| `references` | Reference[] | optional, defaults to empty array | 参考资料列表。 |
| `updated` | string | optional | 最近更新日期，建议使用 YYYY-MM-DD。 |

### AttackTool

攻击工具条目，描述黑灰产、自动化或攻击链路中的工具能力。

| Field | Type | Requirement | Description |
|-------|------|-------------|-------------|
| `title` | string | required | 展示标题。 |
| `keywords` | string | required | 搜索关键词；必须非空，且不能重复。 |
| `description` | string | required | 详细说明。 |
| `references` | Reference[] | optional, defaults to empty array | 参考资料列表。 |
| `avoidances` | string | required | 关联规避手段 ID 列表。 Target: Avoidance. |
| `directCauseRisks` | string | required | 该工具或行为者可直接造成的风险 ID 列表。 Target: Risk. |
| `indirectSupportRisks` | string | required | 该工具或行为者可间接支撑的风险 ID 列表。 Target: Risk. |
| `updated` | string | optional | 最近更新日期，建议使用 YYYY-MM-DD。 |

### ThreatActor

威胁行为者条目，描述实施、组织或支撑攻击行为的角色。

| Field | Type | Requirement | Description |
|-------|------|-------------|-------------|
| `title` | string | required | 展示标题。 |
| `keywords` | string | required | 搜索关键词；必须非空，且不能重复。 |
| `description` | string | required | 详细说明。 |
| `references` | Reference[] | optional, defaults to empty array | 参考资料列表。 |
| `buildAttackTools` | string | required | 行为者可制作或维护的攻击工具 ID 列表。 Target: AttackTool. |
| `useAttackTools` | string | required | 行为者会使用的攻击工具 ID 列表。 Target: AttackTool. |
| `directCauseRisks` | string | required | 该工具或行为者可直接造成的风险 ID 列表。 Target: Risk. |
| `indirectSupportRisks` | string | required | 该工具或行为者可间接支撑的风险 ID 列表。 Target: Risk. |
| `updated` | string | optional | 最近更新日期，建议使用 YYYY-MM-DD。 |

### Term

行业术语条目，解释黑灰产、业务风控和安全运营中的关键概念。

| Field | Type | Requirement | Description |
|-------|------|-------------|-------------|
| `title` | string | required | 展示标题。 |
| `keywords` | string | required | 搜索关键词；必须非空，且不能重复。 |
| `aliases` | string[] | optional, defaults to empty array | 别名列表。 |
| `category` | string | required | 分类 ID 或分类名称。 |
| `definition` | string | required | 简短定义。 |
| `description` | string | required | 详细说明。 |
| `usageExample` | string | optional | 使用示例。 |
| `relatedRisks` | string | required | 相关风险 ID 列表。 Target: Risk. |
| `relatedAvoidances` | string | required | 相关规避手段 ID 列表。 Target: Avoidance. |
| `relatedAttackTools` | string | required | 相关攻击工具 ID 列表。 Target: AttackTool. |
| `relatedThreatActors` | string | required | 相关威胁行为者 ID 列表。 Target: ThreatActor. |
| `relatedBusinessScenes` | string | required | 相关业务场景 ID 列表。 Target: BusinessScene. |
| `references` | Reference[] | optional, defaults to empty array | 参考资料列表。 |
| `updated` | string | optional | 最近更新日期，建议使用 YYYY-MM-DD。 |

### BusinessScene

业务场景条目，组织风险维度、风险场景和场景下的风险引用。

| Field | Type | Requirement | Description |
|-------|------|-------------|-------------|
| `title` | string | required | 展示标题。 |
| `description` | string | optional | 详细说明。 |
| `risks` | string | optional | 业务场景直接引用的风险 ID 列表。 Target: Risk. |
| `riskDimensions` | Record<RiskDimensionId, RiskDimension> | required | 风险维度映射；key 为风险维度 ID，value 包含标题和风险场景 ID 列表。 |
| `riskScenes` | Record<RiskSceneId, RiskScene> | required | 风险场景映射；key 为风险场景 ID，value 包含标题和风险 ID 列表。 |
| `updated` | string | optional | 最近更新日期，建议使用 YYYY-MM-DD。 |

## Relationship Semantics

| Field | Direction | Meaning |
|-------|-----------|---------|
| `Risk.avoidances` | Risk -> Avoidance | Direct mitigations for the risk. |
| `AttackTool.directCauseRisks` | AttackTool -> Risk | Risks directly caused by the tool. |
| `AttackTool.indirectSupportRisks` | AttackTool -> Risk | Risks indirectly supported by the tool. |
| `AttackTool.avoidances` | AttackTool -> Avoidance | Controls that mitigate the tool. |
| `ThreatActor.buildAttackTools` | ThreatActor -> AttackTool | Tools the actor can build or maintain. |
| `ThreatActor.useAttackTools` | ThreatActor -> AttackTool | Tools the actor uses. |
| `ThreatActor.directCauseRisks` | ThreatActor -> Risk | Risks directly caused by the actor. |
| `ThreatActor.indirectSupportRisks` | ThreatActor -> Risk | Risks indirectly supported by the actor. |
| `Term.related*` | Term -> Entity | Conceptual references used for navigation and search. |
| `BusinessScene.riskScenes.*.risks` | BusinessScene -> Risk | Risks grouped under a scene-specific risk scene. |

Relationship integrity is enforced by `npm run validate:data` through schema validation, i18n synchronization, keyword audit, entity relation checks, relationship coverage audit, business scene audit, reference coverage, and documentation consistency checks.

