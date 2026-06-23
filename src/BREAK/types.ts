export interface Reference {
  link: string;
  title: string;
}

export type RiskRelationType = "prerequisite" | "co-occurrence" | "escalation" | "variant";

export interface RiskRelation {
  key: string;
  relation: RiskRelationType;
  note?: string;
}

export type AvoidanceCategory = "AC01" | "AC02" | "AC03" | "AC04";
export type AvoidanceEffectiveness = "high" | "medium" | "low";
export type AvoidanceRelationType =
  | "prerequisite"
  | "complement"
  | "alternative"
  | "mitigates-gap";

export interface AvoidanceRelation {
  key: string;
  relation: AvoidanceRelationType;
  note?: string;
}

export type AttackToolRelationType =
  | "prerequisite"
  | "co-used"
  | "alternative"
  | "capability-upgrade";

export interface AttackToolRelation {
  key: string;
  relation: AttackToolRelationType;
  note?: string;
}

export type ThreatActorRelationType = "co-involved";

export interface ThreatActorRelation {
  key: string;
  relation: ThreatActorRelationType;
  note?: string;
}

export interface Risk {
  title: string;
  keywords: string[];
  definition: string;
  description: string;
  complexity: string;
  influence: string;
  avoidances: string[];
  relatedRisks: RiskRelation[];
  references: Reference[];
  updated?: string;
}

export interface Avoidance {
  title: string;
  keywords: string[];
  category: AvoidanceCategory;
  effectiveness?: AvoidanceEffectiveness;
  definition: string;
  description: string;
  complexity?: string;
  limitation?: string;
  relatedAvoidances: AvoidanceRelation[];
  references: Reference[];
  updated?: string;
}

export interface AttackTool {
  title: string;
  keywords: string[];
  description: string;
  avoidances: string[];
  directCauseRisks: string[];
  indirectSupportRisks: string[];
  relatedAttackTools: AttackToolRelation[];
  references: Reference[];
  updated?: string;
}

export interface ThreatActor {
  title: string;
  keywords: string[];
  description: string;
  directCauseRisks: string[];
  indirectSupportRisks: string[];
  buildAttackTools: string[];
  useAttackTools: string[];
  relatedThreatActors: ThreatActorRelation[];
  references: Reference[];
  updated?: string;
}

export interface Term {
  title: string;
  keywords: string[];
  aliases: string[];
  category: string;
  definition: string;
  description: string;
  usageExample?: string;
  relatedRisks: string[];
  relatedAvoidances: string[];
  relatedAttackTools: string[];
  relatedThreatActors: string[];
  relatedBusinessScenes: string[];
  references: Reference[];
  updated?: string;
}

export type CaseCategory =
  | "criminal_verdict"
  | "administrative_enforcement"
  | "security_incident"
  | "vulnerability_advisory"
  | "academic_research"
  | "news_report";

export interface CaseEntity {
  title: string;
  keywords: string[];
  summary: string;
  description?: string;
  category: CaseCategory;
  incidentTime?: string;
  relatedRisks: string[];
  relatedAttackTools: string[];
  relatedThreatActors: string[];
  references: Reference[];
  updated?: string;
}
