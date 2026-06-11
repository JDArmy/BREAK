import { loadJsonModules } from "@/BREAK/utils";
import basicInfo from "./basic-info/main.json";

const avoidanceCategoryFiles = import.meta.glob("./avoidance-categories/*.json", { eager: true });
const riskFiles = import.meta.glob("./risks/*.json", { eager: true });
const avoidanceFiles = import.meta.glob("./avoidances/*.json", { eager: true });
const businessSceneFiles = import.meta.glob("./business-scenes/*.json", { eager: true });
const attackToolFiles = import.meta.glob("./attack-tools/*.json", { eager: true });
const threatActorFiles = import.meta.glob("./threat-actors/*.json", { eager: true });

const BREAK = {
  ...basicInfo,
  risks: loadJsonModules(riskFiles),
  avoidances: loadJsonModules(avoidanceFiles),
  avoidanceCategories: loadJsonModules(avoidanceCategoryFiles),
  businessScenes: loadJsonModules(businessSceneFiles),
  attackTools: loadJsonModules(attackToolFiles),
  threatActors: loadJsonModules(threatActorFiles),
};

export default BREAK;
