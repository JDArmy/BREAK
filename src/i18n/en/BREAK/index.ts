import { loadJsonModules } from "@/BREAK/utils";
import basicInfo from "./basic-info/main.json";

const avoidanceCategoryFiles = import.meta.glob("./avoidance-categories/*.json", { eager: true });
const riskFiles = import.meta.glob("./risks/*.json", { eager: true });
const avoidanceFiles = import.meta.glob("./avoidances/*.json", { eager: true });
const businessDomainFiles = import.meta.glob("./business-domains/*.json", { eager: true });
const attackToolFiles = import.meta.glob("./attack-tools/*.json", { eager: true });
const threatActorFiles = import.meta.glob("./threat-actors/*.json", { eager: true });
const termFiles = import.meta.glob("./terms/*.json", { eager: true });
const termCategoryFiles = import.meta.glob("./term-categories/*.json", { eager: true });
const caseFiles = import.meta.glob("./cases/*.json", { eager: true });

const BREAK = {
  ...basicInfo,
  risks: loadJsonModules(riskFiles),
  avoidances: loadJsonModules(avoidanceFiles),
  avoidanceCategories: loadJsonModules(avoidanceCategoryFiles),
  businessDomains: loadJsonModules(businessDomainFiles),
  attackTools: loadJsonModules(attackToolFiles),
  threatActors: loadJsonModules(threatActorFiles),
  terms: loadJsonModules(termFiles),
  termCategories: loadJsonModules(termCategoryFiles),
  cases: loadJsonModules(caseFiles),
};

export default BREAK;
