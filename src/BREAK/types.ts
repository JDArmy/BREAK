export type ReferenceType =
  | "standard"
  | "academic"
  | "regulation"
  | "regulatory"
  | "vendor"
  | "news"
  | "encyclopedia"
  | "blog"
  | "tool"
  | "industry";

export type EvidenceLevel = "high" | "medium" | "low";

export interface AcademicReferenceMeta {
  year?: string;
  venue?: string;
  doi?: string;
  scholarId?: string;
  citesId?: string;
  clusterId?: string;
  citedBy?: number;
  pdf?: string;
}

export interface Reference {
  link: string;
  title: string;
  type?: ReferenceType;
  source?: string;
  language?: "zh-CN" | "en" | string;
  evidenceLevel?: EvidenceLevel;
  collectedBy?: "manual" | "scrapingdog" | "import" | string;
  collectedAt?: string;
  verifiedAt?: string;
  note?: string;
  academic?: AcademicReferenceMeta;
}

export interface Risk {
  title: string;
  definition: string;
  description: string;
  complexity: string;
  influence: string;
  avoidances: string[];
  references: Reference[];
  updated?: string;
}

export interface Avoidance {
  title: string;
  category: string;
  definition: string;
  description: string;
  limitation?: string;
  references: Reference[];
  updated?: string;
}

export interface AttackTool {
  title: string;
  description: string;
  avoidances: string[];
  directCauseRisks: string[];
  indirectSupportRisks: string[];
  references: Reference[];
  updated?: string;
}

export interface ThreatActor {
  title: string;
  description: string;
  directCauseRisks: string[];
  indirectSupportRisks: string[];
  buildAttackTools: string[];
  useAttackTools: string[];
  references: Reference[];
  updated?: string;
}
