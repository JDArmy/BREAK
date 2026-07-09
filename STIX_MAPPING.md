# BREAK → STIX 2.1 映射规范

> 版本：1.0.0
> 日期：2026-06-23
> 适用范围：`npm run export:stix` 生成的 STIX 2.1 Bundle

本文档描述 BREAK 框架实体与 STIX 2.1 标准之间的映射规则，供外部 CTI/SIEM 平台消费方参考。

## 1. 总体原则

- **标准优先**：能用 STIX 2.1 标准 SDO 表达的用标准类型（如 `course-of-action`、`tool`、`threat-actor`、`report`）
- **自定义补充**：无标准匹配的用 `x-break-*` 自定义 SDO（如 `x-break-risk`、`x-break-term`、`x-break-business-domain`）
- **扩展字段**：BREAK 特有字段通过 STIX Extension Definition 保留全部语义
- **确定性 ID**：所有 STIX UUID 使用 UUID v5 确定性生成，中英文 Bundle 共享相同 ID

## 2. ID 生成策略

```
BREAK_NAMESPACE = UUIDv5("break.jd.army", DNS_NAMESPACE)
STIX_ID = "{stix-type}--" + UUIDv5("{stix-type}:{break-id}", BREAK_NAMESPACE)
```

示例：
- `R0001` → `x-break-risk--2c0a4fa3-ee11-584e-9f67-08906caa2a35`
- `A0001` → `course-of-action--ce6da351-7df5-58b3-b190-a47246c208bd`

## 3. 实体映射

| BREAK 实体 | BREAK ID 示例 | STIX 类型 | 映射策略 |
|---|---|---|---|
| Risk | R0001 | `x-break-risk` | 自定义 SDO — 标准 `vulnerability` 仅适用软件漏洞，不匹配"业务风险"语义 |
| Avoidance | A0001 | `course-of-action` | 标准 SDO — 语义精确匹配"风险规避/缓解措施" |
| AttackTool | AT0001 | `tool` | 标准 SDO — 语义匹配"攻击工具/软件" |
| ThreatActor | TA0001 | `threat-actor` | 标准 SDO — 语义匹配 |
| Term | T0001 | `x-break-term` | 自定义 SDO — 术语/知识条目无标准匹配 |
| Case | C0001 | `report` | 标准 SDO — 可表达安全事件报告/案例 |
| BusinessDomain | BD01 | `x-break-business-domain` | 自定义 SDO — 业务域分类无标准匹配 |

## 4. Extension Definitions

Bundle 中包含 7 个 Extension Definition，承载 BREAK 特有字段：

| Extension Key | 类型 | 扩展属性 |
|---|---|---|
| `x-break-risk-ext` | `new-sdo` | `x_break_definition`, `x_break_complexity`, `x_break_influence`, `x_break_keywords`, `x_break_version` |
| `x-break-avoidance-ext` | `property-extension` | `x_break_definition`, `x_break_category`, `x_break_effectiveness`, `x_break_limitation`, `x_break_keywords`, `x_break_version` |
| `x-break-attack-tool-ext` | `property-extension` | `x_break_keywords`, `x_break_version` |
| `x-break-threat-actor-ext` | `property-extension` | `x_break_keywords`, `x_break_version` |
| `x-break-term-ext` | `new-sdo` | `x_break_definition`, `x_break_aliases`, `x_break_category`, `x_break_keywords`, `x_break_usage_example`, `x_break_version` |
| `x-break-case-ext` | `property-extension` | `x_break_summary`, `x_break_case_category`, `x_break_incident_time`, `x_break_keywords`, `x_break_version` |
| `x-break-business-domain-ext` | `new-sdo` | `x_break_risk_dimensions`, `x_break_risk_scenes`, `x_break_version` |

## 5. 关系映射

### 5.1 跨类型关系

| BREAK 关系 | STIX relationship_type | 方向 |
|---|---|---|
| Risk.avoidances | `mitigated-by` (标准) | Risk → Avoidance |
| AttackTool.directCauseRisks | `x-break-directly-causes` | AttackTool → Risk |
| AttackTool.indirectSupportRisks | `x-break-indirectly-supports` | AttackTool → Risk |
| AttackTool.avoidances | `mitigated-by` (标准) | AttackTool → Avoidance |
| ThreatActor.buildAttackTools | `x-break-builds` | ThreatActor → AttackTool |
| ThreatActor.useAttackTools | `uses` (标准) | ThreatActor → AttackTool |
| ThreatActor.directCauseRisks | `x-break-directly-causes` | ThreatActor → Risk |
| ThreatActor.indirectSupportRisks | `x-break-indirectly-supports` | ThreatActor → Risk |
| Case.relatedRisks | `related-to` (标准) | Case → Risk |
| Case.relatedAttackTools | `related-to` (标准) | Case → AttackTool |
| Case.relatedThreatActors | `related-to` (标准) | Case → ThreatActor |
| Term.related* | `related-to` (标准) | Term → 对应实体 |
| BusinessDomain → Risk (via riskScenes) | `related-to` (标准) | BusinessDomain → Risk |

### 5.2 同类型内部关系

| BREAK relation 枚举 | STIX relationship_type |
|---|---|
| Risk: `prerequisite` | `x-break-prerequisite-of` |
| Risk: `co-occurrence` | `x-break-co-occurs-with` |
| Risk: `escalation` | `x-break-escalates-to` |
| Risk: `variant` | `variant-of` (标准) |
| Avoidance: `prerequisite` | `x-break-prerequisite-of` |
| Avoidance: `complement` | `x-break-complements` |
| Avoidance: `alternative` | `x-break-alternative-to` |
| Avoidance: `mitigates-gap` | `x-break-mitigates-gap-of` |
| AttackTool: `prerequisite` | `x-break-prerequisite-of` |
| AttackTool: `co-used` | `x-break-co-used-with` |
| AttackTool: `alternative` | `x-break-alternative-to` |
| AttackTool: `capability-upgrade` | `x-break-capability-upgrade-of` |
| ThreatActor: `co-involved` | `x-break-co-involved-with` |

## 6. Bundle 结构

```json
{
  "type": "bundle",
  "id": "bundle--<deterministic-uuid>",
  "objects": [
    // 1. Identity（BREAK 框架标识，1 个）
    { "type": "identity", "name": "JDARMY BREAK", ... },
    // 2. Extension Definition（7 个）
    { "type": "extension-definition", ... },
    // 3. SDO（全部实体）
    { "type": "x-break-risk", ... },
    { "type": "course-of-action", ... },
    { "type": "tool", ... },
    { "type": "threat-actor", ... },
    { "type": "x-break-term", ... },
    { "type": "report", ... },
    { "type": "x-break-business-domain", ... },
    // 4. Relationship SRO
    { "type": "relationship", ... }
  ]
}
```

## 7. 双语产物

| 文件 | 语言 | 说明 | 下载地址 |
|---|---|---|---|
| `break-stix-zh.json` | zh-CN | 中文 STIX Bundle | <https://break.jd.army/data/break-stix-zh.json> |
| `break-stix-en.json` | en | 英文 STIX Bundle | <https://break.jd.army/data/break-stix-en.json> |

两个 Bundle 共享完全相同的 STIX UUID 集合，仅 `name`、`description` 等文本内容不同。

## 8. 外部工具验证

```python
# Python (需要 stix2 库)
from stix2 import parse
import json

with open('break-stix-zh.json') as f:
    bundle = parse(json.load(f), allow_custom=True)
print(f"Objects: {len(bundle.objects)}")
```

## 9. 注意事项

- STIX 2.1 标准工具消费时需开启 `allow_custom=True` 以支持 `x-break-*` 自定义类型
- `x_break_version` 字段追踪实体变更版本，默认值为 1
- `external_references` 中第一条始终为 BREAK 来源标识（`source_name: "BREAK"`）
- `report` (Case) 的 `published` 字段取自 `incidentTime`；若缺失则使用 bundle 生成时间
