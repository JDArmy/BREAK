import { loadJsonModules } from "../utils";

interface Reference {
  title: string;
  link: string;
}

type RiskSeverity = "low" | "medium" | "high" | "critical";
type RiskPriority = "P0" | "P1" | "P2" | "P3";

interface RiskAssessment {
  likelihood: RiskSeverity;
  businessLoss: RiskSeverity;
  attackCost: RiskSeverity;
  detectionDifficulty: RiskSeverity;
  defenseMaturity: RiskSeverity;
  priority?: RiskPriority;
  observables: string[];
  priorityNote?: string;
  priorityOverride?: boolean;
  assessedAt?: string;
}

interface Risk {
  title: string;
  keywords: string[];
  definition: string;
  description: string;
  complexity: string;
  influence: string;
  avoidances: string[];
  relatedRisks?: {
    key: string;
    relation: "prerequisite" | "co-occurrence" | "escalation" | "variant";
    note?: string;
  }[];
  riskAssessment?: RiskAssessment;
  references: Reference[];
}
interface AllRisks {
  [key: string]: Risk;
}

interface Risks {
  risks: {
    [key: string]: Risk;
  };
}

const riskFiles = import.meta.glob("./R*.json", { eager: true });
const allRisks = loadJsonModules<AllRisks>(riskFiles);

const risks: Risks = {
  risks: allRisks,
};
export default risks;
export type { Risk, Risks, RiskAssessment, RiskSeverity, RiskPriority };
