export interface Reference {
  link: string;
  title: string;
  type?: 'standard' | 'academic' | 'regulatory' | 'industry' | 'encyclopedia';
  evidenceLevel?: 'high' | 'medium' | 'low';
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
  couseRisks: string[];
  references: Reference[];
  updated?: string;
}

export interface ThreatActor {
  title: string;
  description: string;
  couseRisks: string[];
  buildAttackTools: string[];
  useAttackTools: string[];
  references: Reference[];
  updated?: string;
}
