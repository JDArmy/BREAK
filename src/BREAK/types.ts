export interface Reference {
  link: string;
  title: string;
}

export interface Risk {
  title: string;
  keywords: string[];
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
  keywords: string[];
  category: string;
  definition: string;
  description: string;
  complexity?: string;
  limitation?: string;
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
