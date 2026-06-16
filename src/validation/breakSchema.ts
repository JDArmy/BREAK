import { z } from "zod";

const nonEmptyString = z.string().trim().min(1, "不能为空");
const idArray = z.array(nonEmptyString);
const keywordArray = z
  .array(nonEmptyString)
  .min(1, "keywords 不能为空")
  .refine((items) => new Set(items).size === items.length, {
    message: "keywords 不能重复",
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
  complexity: z.enum(["初级", "中级", "高级"]),
  influence: nonEmptyString,
  avoidances: idArray,
  references: z.array(referenceSchema).default([]),
  updated: z.string().optional(),
});

export const avoidanceSchema = z.object({
  title: nonEmptyString,
  keywords: keywordArray,
  category: nonEmptyString,
  definition: nonEmptyString,
  description: nonEmptyString,
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

export const entitySchemas = {
  risks: riskSchema,
  avoidances: avoidanceSchema,
  attackTools: attackToolSchema,
  threatActors: threatActorSchema,
  terms: termSchema,
  businessScenes: businessSceneSchema,
} as const;

export type EntitySchemaKey = keyof typeof entitySchemas;

export function formatZodIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
    return `${path}: ${issue.message}`;
  });
}
