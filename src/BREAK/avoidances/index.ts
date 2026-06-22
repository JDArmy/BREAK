import { loadJsonModules } from "../utils";

interface Avoidance {
  title: string;
  keywords: string[];
  category: string;
  effectiveness?: "high" | "medium" | "low";
  definition: string;
  description: string;
  complexity?: string;
  limitation?: string;
  relatedAvoidances?: {
    key: string;
    relation: "prerequisite" | "complement" | "alternative" | "mitigates-gap";
    note?: string;
  }[];
  references: {
    title: string;
    link: string;
  }[];
  updated?: string;
}

interface Avoidances {
  [key: string]: Avoidance;
}

const avoidanceFiles = import.meta.glob("./A*.json", { eager: true });
const allAvoidances = loadJsonModules<Avoidances>(avoidanceFiles);

export default {
  avoidances: allAvoidances,
};
export type { Avoidance, Avoidances };
