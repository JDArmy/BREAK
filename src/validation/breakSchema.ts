import { z } from "zod";

const nonEmptyString = z.string().trim().min(1, "不能为空");
const idArray = z.array(nonEmptyString);
const keywordArray = z
  .array(nonEmptyString)
  .min(1, "keywords 不能为空")
  .refine((items) => new Set(items).size === items.length, {
    message: "keywords 不能重复",
  });
const avoidanceCategorySchema = z.enum(["AC01", "AC02", "AC03", "AC04"]);
const avoidanceEffectivenessSchema = z.enum(["high", "medium", "low"]);
const riskComplexitySchema = z.enum(["basic", "intermediate", "advanced"]);
// 风险分级维度刻度：low/medium/high/critical，映射权重 1/2/3/4
const riskSeveritySchema = z.enum(["low", "medium", "high", "critical"]);
// 处置优先级：P0 最高（立即处置）→ P3 最低（持续监控）
const riskPrioritySchema = z.enum(["P0", "P1", "P2", "P3"]);
const riskRelationTypeSchema = z.enum(["prerequisite", "co-occurrence", "escalation", "variant"]);
// 风险分级评估对象：5 维度评分 + 优先级 + 可观测信号 + 覆盖机制
// 5 维度与 priority 用英文枚举 key（不翻译），observables/priorityNote 为可翻译文本
const riskAssessmentSchema = z.object({
  likelihood: riskSeveritySchema,
  businessLoss: riskSeveritySchema,
  attackCost: riskSeveritySchema,
  detectionDifficulty: riskSeveritySchema,
  defenseMaturity: riskSeveritySchema,
  priority: riskPrioritySchema.optional(),
  observables: z.array(nonEmptyString).default([]),
  priorityNote: nonEmptyString.optional(),
  priorityOverride: z.boolean().optional(),
  assessedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "assessedAt 格式必须为 YYYY-MM-DD").optional(),
});
const avoidanceRelationTypeSchema = z.enum(["prerequisite", "complement", "alternative", "mitigates-gap"]);
const attackToolRelationTypeSchema = z.enum(["prerequisite", "co-used", "alternative", "capability-upgrade"]);
const threatActorRelationTypeSchema = z.enum(["co-involved"]);
const caseCategorySchema = z.enum([
  "criminal_verdict",
  "administrative_enforcement",
  "security_incident",
  "vulnerability_advisory",
  "academic_research",
  "news_report",
]);
const riskRelationSchema = z.object({
  key: nonEmptyString,
  relation: riskRelationTypeSchema,
  note: nonEmptyString.optional(),
});
const avoidanceRelationSchema = z.object({
  key: nonEmptyString,
  relation: avoidanceRelationTypeSchema,
  note: nonEmptyString.optional(),
});
const attackToolRelationSchema = z.object({
  key: nonEmptyString,
  relation: attackToolRelationTypeSchema,
  note: nonEmptyString.optional(),
});
const threatActorRelationSchema = z.object({
  key: nonEmptyString,
  relation: threatActorRelationTypeSchema,
  note: nonEmptyString.optional(),
});

export const referenceSchema = z.object({
  title: nonEmptyString,
  link: nonEmptyString.url("必须是合法 URL"),
});

export const entityVersionSchema = z.number().int().positive().optional();

export const riskSchema = z.object({
  title: nonEmptyString,
  keywords: keywordArray,
  definition: nonEmptyString,
  description: nonEmptyString,
  complexity: riskComplexitySchema,
  influence: nonEmptyString,
  avoidances: idArray,
  relatedRisks: z.array(riskRelationSchema).default([]),
  riskAssessment: riskAssessmentSchema.optional(),
  references: z.array(referenceSchema).default([]),
  updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "updated 格式必须为 YYYY-MM-DD").optional(),
  version: entityVersionSchema,
});

export const avoidanceSchema = z.object({
  title: nonEmptyString,
  keywords: keywordArray,
  category: avoidanceCategorySchema,
  effectiveness: avoidanceEffectivenessSchema.optional(),
  definition: nonEmptyString,
  description: nonEmptyString,
  complexity: nonEmptyString.optional(),
  limitation: z.string().optional(),
  relatedAvoidances: z.array(avoidanceRelationSchema).default([]),
  references: z.array(referenceSchema).default([]),
  updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "updated 格式必须为 YYYY-MM-DD").optional(),
  version: entityVersionSchema,
});

export const attackToolSchema = z.object({
  title: nonEmptyString,
  keywords: keywordArray,
  description: nonEmptyString,
  references: z.array(referenceSchema).default([]),
  avoidances: idArray,
  directCauseRisks: idArray,
  indirectSupportRisks: idArray,
  relatedAttackTools: z.array(attackToolRelationSchema).default([]),
  updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "updated 格式必须为 YYYY-MM-DD").optional(),
  version: entityVersionSchema,
});

export const threatActorSchema = z.object({
  title: nonEmptyString,
  keywords: keywordArray,
  description: nonEmptyString,
  references: z.array(referenceSchema).default([]),
  buildAttackTools: idArray,
  useAttackTools: idArray,
  directCauseRisks: idArray,
  indirectSupportRisks: idArray,
  relatedThreatActors: z.array(threatActorRelationSchema).default([]),
  updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "updated 格式必须为 YYYY-MM-DD").optional(),
  version: entityVersionSchema,
});

export const termSchema = z.object({
  title: nonEmptyString,
  keywords: keywordArray,
  aliases: z.array(nonEmptyString).default([]),
  category: nonEmptyString,
  definition: nonEmptyString,
  description: nonEmptyString,
  usageExample: z.string().optional(),
  relatedRisks: idArray,
  relatedAvoidances: idArray,
  relatedAttackTools: idArray,
  relatedThreatActors: idArray,
  relatedBusinessScenes: idArray,
  references: z.array(referenceSchema).default([]),
  updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "updated 格式必须为 YYYY-MM-DD").optional(),
  version: entityVersionSchema,
});

export const businessSceneSchema = z.object({
  title: nonEmptyString,
  description: z.string().optional(),
  risks: idArray.optional(),
  riskDimensions: z.record(
    nonEmptyString,
    z.object({
      title: nonEmptyString,
      riskScenes: idArray,
    })
  ),
  riskScenes: z.record(
    nonEmptyString,
    z.object({
      title: nonEmptyString,
      risks: idArray,
    })
  ),
  updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "updated 格式必须为 YYYY-MM-DD").optional(),
  version: entityVersionSchema,
});

export const caseSchema = z.object({
  title: nonEmptyString,
  keywords: keywordArray,
  summary: nonEmptyString,
  description: z.string().optional(),
  category: caseCategorySchema,
  incidentTime: z.string().regex(/^\d{4}(-\d{2}(-\d{2})?)?$/, "incidentTime 需为 YYYY、YYYY-MM 或 YYYY-MM-DD").optional(),
  relatedRisks: idArray.min(1, "relatedRisks 不能为空"),
  relatedAttackTools: idArray.default([]),
  relatedThreatActors: idArray.default([]),
  references: z.array(referenceSchema).default([]),
  updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "updated 格式必须为 YYYY-MM-DD").optional(),
  version: entityVersionSchema,
});

export const entitySchemas = {
  risks: riskSchema,
  avoidances: avoidanceSchema,
  attackTools: attackToolSchema,
  threatActors: threatActorSchema,
  terms: termSchema,
  businessScenes: businessSceneSchema,
  cases: caseSchema,
} as const;

export type EntitySchemaKey = keyof typeof entitySchemas;

// ── 从 Zod schema 推导的 TS 类型（唯一类型来源，消除双重维护） ──

export type Reference = z.infer<typeof referenceSchema>;

export type RiskRelationType = z.infer<typeof riskRelationTypeSchema>;
export type RiskRelation = z.infer<typeof riskRelationSchema>;
export type RiskComplexity = z.infer<typeof riskComplexitySchema>;
export type RiskSeverity = z.infer<typeof riskSeveritySchema>;
export type RiskPriority = z.infer<typeof riskPrioritySchema>;
export type RiskAssessment = z.infer<typeof riskAssessmentSchema>;
export type Risk = z.infer<typeof riskSchema>;

export type AvoidanceCategory = z.infer<typeof avoidanceCategorySchema>;
export type AvoidanceEffectiveness = z.infer<typeof avoidanceEffectivenessSchema>;
export type AvoidanceRelationType = z.infer<typeof avoidanceRelationTypeSchema>;
export type AvoidanceRelation = z.infer<typeof avoidanceRelationSchema>;
export type Avoidance = z.infer<typeof avoidanceSchema>;

export type AttackToolRelationType = z.infer<typeof attackToolRelationTypeSchema>;
export type AttackToolRelation = z.infer<typeof attackToolRelationSchema>;
export type AttackTool = z.infer<typeof attackToolSchema>;

export type ThreatActorRelationType = z.infer<typeof threatActorRelationTypeSchema>;
export type ThreatActorRelation = z.infer<typeof threatActorRelationSchema>;
export type ThreatActor = z.infer<typeof threatActorSchema>;

export type Term = z.infer<typeof termSchema>;

export type CaseCategory = z.infer<typeof caseCategorySchema>;
export type CaseEntity = z.infer<typeof caseSchema>;

export function formatZodIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
    return `${path}: ${issue.message}`;
  });
}
