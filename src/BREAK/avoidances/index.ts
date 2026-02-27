import { loadJsonModules } from "../utils";

interface Avoidance {
  title: string;
  category: string;
  definition: string;
  description: string;
  limitation: string;
  references: {
    title: string;
    description: string;
    link: string;
  }[];
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
