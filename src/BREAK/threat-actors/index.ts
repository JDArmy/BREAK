import { loadJsonModules } from "../utils";

interface Reference {
  title: string;
  link: string;
}

interface ThreatActor {
  title: string;
  description: string;
  references: Reference[];
  buildAttackTools: string[];
  useAttackTools: string[];
  couseRisks: string[];
  attackTools: string[];
  updated: string;
}

interface AllThreatActors {
  [key: string]: ThreatActor;
}

interface ThreatActors {
  threatActors: {
    [key: string]: ThreatActor;
  };
}

const threatActorFiles = import.meta.glob("./T*.json", { eager: true });
const allThreatActors = loadJsonModules<AllThreatActors>(threatActorFiles);

const threatActors: ThreatActors = {
  threatActors: allThreatActors,
};
export default threatActors;
export type { ThreatActor, ThreatActors };
