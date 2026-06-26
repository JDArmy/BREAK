// 所有类型均由 Zod schema 推导（唯一类型来源），此文件仅作为导出入口保持向后兼容。
// 规范来源: src/validation/breakSchema.ts

export type {
  Reference,
  RiskRelationType,
  RiskRelation,
  RiskComplexity,
  Risk,
  AvoidanceCategory,
  AvoidanceEffectiveness,
  AvoidanceRelationType,
  AvoidanceRelation,
  Avoidance,
  AttackToolRelationType,
  AttackToolRelation,
  AttackTool,
  ThreatActorRelationType,
  ThreatActorRelation,
  ThreatActor,
  Term,
  CaseCategory,
  CaseEntity,
} from "@/validation/breakSchema";
