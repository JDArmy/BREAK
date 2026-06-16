import { loadJsonModules } from "../utils";
import type { Term } from "../types";

interface Terms {
  [key: string]: Term;
}

const termFiles = import.meta.glob("./T*.json", { eager: true });
const allTerms = loadJsonModules<Terms>(termFiles);

const terms = {
  terms: allTerms,
};

export default terms;
export type { Terms };
