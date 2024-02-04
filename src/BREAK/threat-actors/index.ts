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
// 合并所有 JSON 对象
const allThreatActors = Object.values(threatActorFiles).reduce(
  (allThreatActors: AllThreatActors, threatActor: any) => ({
    ...allThreatActors,
    ...threatActor.default,
  }),
  {}
);
// // console.log(threatActors);

const threatActors: ThreatActors = {
  threatActors: allThreatActors,
};
export default threatActors;
export type { ThreatActor, ThreatActors };
