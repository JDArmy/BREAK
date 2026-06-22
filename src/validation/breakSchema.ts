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
const riskRelationSchema = z.object({
  key: nonEmptyString,
  relation: z.enum(["prerequisite", "co-occurrence", "escalation", "variant"]),
  note: nonEmptyString.optional(),
});

export const referenceSchema = z.object({
  title: nonEmptyString,
  link: nonEmptyString.url("必须是合法 URL"),
});

export const riskSchema = z.object({
  title: nonEmptyString,
  keywords: keywordArray,
  definition: nonEmptyString,
  description: nonEmptyString,
  complexity: riskComplexitySchema,
  influence: nonEmptyString,
  avoidances: idArray,
  relatedRisks: z.array(riskRelationSchema).default([]),
  references: z.array(referenceSchema).default([]),
  updated: z.string().optional(),
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
  references: z.array(referenceSchema).default([]),
  updated: z.string().optional(),
});

export const attackToolSchema = z.object({
  title: nonEmptyString,
  keywords: keywordArray,
  description: nonEmptyString,
  references: z.array(referenceSchema).default([]),
  avoidances: idArray,
  directCauseRisks: idArray,
  indirectSupportRisks: idArray,
  updated: z.string().optional(),
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
  updated: z.string().optional(),
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
  updated: z.string().optional(),
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
  updated: z.string().optional(),
});

export const caseSchema = z.object({
  title: nonEmptyString,
  keywords: keywordArray,
  summary: nonEmptyString,
  description: z.string().optional(),
  category: z.enum([
    "criminal_verdict",
    "administrative_enforcement",
    "security_incident",
    "vulnerability_advisory",
    "academic_research",
    "news_report",
  ]),
  incidentTime: z.string().optional(),
  relatedRisks: idArray.min(1, "relatedRisks 不能为空"),
  relatedAttackTools: idArray.default([]),
  relatedThreatActors: idArray.default([]),
  references: z.array(referenceSchema).default([]),
  updated: z.string().optional(),
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

export function formatZodIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
    return `${path}: ${issue.message}`;
  });
}
