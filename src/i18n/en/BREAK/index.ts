import { loadJsonModules } from "@/BREAK/utils";

const basicInfo = { name: "JDARMY BREAK", title: "Business Risk Enumeration & Avoidance Knowledge", description: "BREAK (Business Risk Enumeration & Avoidance Knowledge) is an open knowledge framework", rights: "The BREAK framework is created, owned, and managed by JD.Army. JD.Army is a professional red team focused on identifying and resolving enterprise security operational risks. JD.Army reserves the right to update BREAK periodically at its sole discretion. While JD.Army owns all rights and interests in BREAK, it licenses the public to use it freely under the relevant open source license." };

const avoidanceCategoryFiles = import.meta.glob("./avoidance-categories/*.json", { eager: true });
const riskFiles = import.meta.glob("./risks/*.json", { eager: true });
const avoidanceFiles = import.meta.glob("./avoidances/*.json", { eager: true });
const businessSceneFiles = import.meta.glob("./business-scenes/*.json", { eager: true });
const attackToolFiles = import.meta.glob("./attack-tools/*.json", { eager: true });
const threatActorFiles = import.meta.glob("./threat-actors/*.json", { eager: true });
const abilityProviderFiles = import.meta.glob("./ability-providers/*.json", { eager: true });

const BREAK = {
  ...basicInfo,
  risks: loadJsonModules(riskFiles),
  avoidances: loadJsonModules(avoidanceFiles),
  avoidanceCategories: loadJsonModules(avoidanceCategoryFiles),
  businessScenes: loadJsonModules(businessSceneFiles),
  attackTools: loadJsonModules(attackToolFiles),
  threatActors: loadJsonModules(threatActorFiles),
  abilityProviders: loadJsonModules(abilityProviderFiles),
};

export default BREAK;
