import { type Ref } from "vue";
import BREAK from "@/BREAK";
import { RelationType, type AttackPath } from "@/views/relation/relationTypes";

interface CreateRelationAttackPathBuilderOptions {
  relKey: Ref<string>;
  relType: Ref<RelationType>;
}

interface BuildAttackPathsForRiskOptions {
  attackToolKey?: string;
  avoidanceKey?: string;
  threatActorKey?: string;
}

const getAttackToolRiskKeys = (attackToolKey: string) => {
  const attackTool =
    BREAK.attackTools[attackToolKey as keyof typeof BREAK.attackTools];
  return [
    ...new Set([
      ...attackTool.directCauseRisks,
      ...attackTool.indirectSupportRisks,
    ]),
  ];
};

const getThreatActorRiskKeys = (threatActorKey: string) => {
  const threatActor =
    BREAK.threatActors[threatActorKey as keyof typeof BREAK.threatActors];
  return [
    ...new Set([
      ...threatActor.directCauseRisks,
      ...threatActor.indirectSupportRisks,
    ]),
  ];
};

const getThreatActorAttackToolKeys = (threatActorKey: string) => {
  const threatActor =
    BREAK.threatActors[threatActorKey as keyof typeof BREAK.threatActors];
  return [
    ...new Set([
      ...threatActor.buildAttackTools,
      ...threatActor.useAttackTools,
    ]),
  ];
};

const addUniqueMapValue = (
  map: Map<string, string[]>,
  key: string,
  value: string
) => {
  const values = map.get(key);
  if (values) {
    if (!values.includes(value)) values.push(value);
    return;
  }
  map.set(key, [value]);
};

const createAttackPathIndexes = () => {
  const attackToolRiskMap = new Map<string, string[]>();
  Object.keys(BREAK.attackTools).forEach((attackToolKey) => {
    attackToolRiskMap.set(attackToolKey, getAttackToolRiskKeys(attackToolKey));
  });

  const threatActorRiskMap = new Map<string, string[]>();
  const threatActorAttackToolMap = new Map<string, string[]>();
  Object.keys(BREAK.threatActors).forEach((threatActorKey) => {
    threatActorRiskMap.set(
      threatActorKey,
      getThreatActorRiskKeys(threatActorKey)
    );
    threatActorAttackToolMap.set(
      threatActorKey,
      getThreatActorAttackToolKeys(threatActorKey)
    );
  });

  const riskToAttackTools = new Map<string, string[]>();
  const riskToThreatActors = new Map<string, string[]>();
  const attackToolToThreatActors = new Map<string, string[]>();
  const avoidanceToRisks = new Map<string, string[]>();

  attackToolRiskMap.forEach((riskKeys, attackToolKey) => {
    riskKeys.forEach((riskKey) =>
      addUniqueMapValue(riskToAttackTools, riskKey, attackToolKey)
    );
  });

  threatActorRiskMap.forEach((riskKeys, threatActorKey) => {
    riskKeys.forEach((riskKey) =>
      addUniqueMapValue(riskToThreatActors, riskKey, threatActorKey)
    );
  });

  threatActorAttackToolMap.forEach((attackToolKeys, threatActorKey) => {
    attackToolKeys.forEach((attackToolKey) =>
      addUniqueMapValue(attackToolToThreatActors, attackToolKey, threatActorKey)
    );
  });

  Object.keys(BREAK.risks).forEach((riskKey) => {
    const risk = BREAK.risks[riskKey as keyof typeof BREAK.risks];
    risk.avoidances.forEach((avoidanceKey) =>
      addUniqueMapValue(avoidanceToRisks, avoidanceKey, riskKey)
    );
  });

  return {
    attackToolRiskMap,
    attackToolToThreatActors,
    avoidanceToRisks,
    riskToAttackTools,
    riskToThreatActors,
    threatActorAttackToolMap,
    threatActorRiskMap,
  };
};

export const createRelationAttackPathBuilder = ({
  relKey,
  relType,
}: CreateRelationAttackPathBuilderOptions) => {
  const allRiskKeys = Object.keys(BREAK.risks);
  const {
    attackToolRiskMap,
    attackToolToThreatActors,
    avoidanceToRisks,
    riskToAttackTools,
    riskToThreatActors,
    threatActorAttackToolMap,
    threatActorRiskMap,
  } = createAttackPathIndexes();

  const getOrderedRiskKeys = (riskKeySet: Set<string>) =>
    allRiskKeys.filter((riskKey) => riskKeySet.has(riskKey));

  const getCandidateRiskKeys = () => {
    switch (relType.value) {
      case RelationType.risk:
        return BREAK.risks[relKey.value as keyof typeof BREAK.risks]
          ? [relKey.value]
          : [];
      case RelationType.attackTool:
        return getOrderedRiskKeys(
          new Set(attackToolRiskMap.get(relKey.value) ?? [])
        );
      case RelationType.threatActor: {
        const riskKeySet = new Set(threatActorRiskMap.get(relKey.value) ?? []);
        (threatActorAttackToolMap.get(relKey.value) ?? []).forEach(
          (attackToolKey) => {
            (attackToolRiskMap.get(attackToolKey) ?? []).forEach((riskKey) =>
              riskKeySet.add(riskKey)
            );
          }
        );
        return getOrderedRiskKeys(riskKeySet);
      }
      case RelationType.avoidance:
        return getOrderedRiskKeys(
          new Set(avoidanceToRisks.get(relKey.value) ?? [])
        );
      case RelationType.term:
        return [];
      default:
        return allRiskKeys;
    }
  };

  const buildAttackPathsForRisk = (
    riskKey: string,
    options: BuildAttackPathsForRiskOptions = {}
  ) => {
    const paths: AttackPath[] = [];
    const risk = BREAK.risks[riskKey as keyof typeof BREAK.risks];
    if (!risk) return paths;

    const getPathAvoidances = (attackToolKey?: string) => {
      const attackTool = attackToolKey
        ? BREAK.attackTools[attackToolKey as keyof typeof BREAK.attackTools]
        : undefined;
      const attackToolAvoidances = attackTool?.avoidances ?? [];
      const riskAvoidances = risk.avoidances;
      const overlappingAvoidances = attackToolAvoidances.filter((avoidanceKey) =>
        riskAvoidances.includes(avoidanceKey)
      );
      const candidateAvoidances =
        attackToolAvoidances.length > 0
          ? overlappingAvoidances.length > 0
            ? overlappingAvoidances
            : attackToolAvoidances
          : riskAvoidances;
      const filteredAvoidances = options.avoidanceKey
        ? candidateAvoidances.includes(options.avoidanceKey)
          ? [options.avoidanceKey]
          : []
        : candidateAvoidances.length > 0
          ? candidateAvoidances
          : [undefined];

      return filteredAvoidances.map((avoidanceKey) => ({
        avoidanceKey,
        sourceFields: avoidanceKey
          ? [
              ...(attackToolAvoidances.includes(avoidanceKey)
                ? ["AttackTool.avoidances"]
                : []),
              ...(riskAvoidances.includes(avoidanceKey)
                ? ["Risk.avoidances"]
                : []),
            ]
          : [],
      }));
    };

    const indexedAttackToolKeys = riskToAttackTools.get(riskKey) ?? [];
    const relatedAttackToolKeys = options.attackToolKey
      ? indexedAttackToolKeys.includes(options.attackToolKey)
        ? [options.attackToolKey]
        : []
      : indexedAttackToolKeys;
    const relatedThreatActorKeys = riskToThreatActors.get(riskKey) ?? [];

    relatedAttackToolKeys.forEach((attackToolKey) => {
      const toolThreatActorKeys =
        attackToolToThreatActors.get(attackToolKey) ?? [];
      const candidateThreatActorKeys =
        toolThreatActorKeys.length > 0
          ? toolThreatActorKeys
          : relatedThreatActorKeys;
      const threatActorKeys = options.threatActorKey
        ? candidateThreatActorKeys.includes(options.threatActorKey)
          ? [options.threatActorKey]
          : []
        : candidateThreatActorKeys;

      if (threatActorKeys.length > 0) {
        threatActorKeys.forEach((threatActorKey) => {
          getPathAvoidances(attackToolKey).forEach(
            ({ avoidanceKey, sourceFields }) => {
              if (options.avoidanceKey && !avoidanceKey) return;
              paths.push({
                threatActorKey,
                attackToolKey,
                riskKey,
                avoidanceKey,
                avoidanceSourceFields: sourceFields,
              });
            }
          );
        });
      } else if (!options.threatActorKey) {
        getPathAvoidances(attackToolKey).forEach(
          ({ avoidanceKey, sourceFields }) => {
            if (options.avoidanceKey && !avoidanceKey) return;
            paths.push({
              attackToolKey,
              riskKey,
              avoidanceKey,
              avoidanceSourceFields: sourceFields,
            });
          }
        );
      }
    });

    if (relatedAttackToolKeys.length === 0) {
      const threatActorKeys = options.threatActorKey
        ? relatedThreatActorKeys.includes(options.threatActorKey)
          ? [options.threatActorKey]
          : []
        : relatedThreatActorKeys;

      threatActorKeys.forEach((threatActorKey) => {
        getPathAvoidances().forEach(({ avoidanceKey, sourceFields }) => {
          if (options.avoidanceKey && !avoidanceKey) return;
          paths.push({
            threatActorKey,
            riskKey,
            avoidanceKey,
            avoidanceSourceFields: sourceFields,
          });
        });
      });
    }

    return paths;
  };

  const matchesSelectedEntity = (path: AttackPath) => {
    switch (relType.value) {
      case RelationType.threatActor:
        return path.threatActorKey === relKey.value;
      case RelationType.attackTool:
        return path.attackToolKey === relKey.value;
      case RelationType.risk:
        return path.riskKey === relKey.value;
      case RelationType.avoidance:
        return path.avoidanceKey === relKey.value;
      case RelationType.term:
        return false;
      default:
        return true;
    }
  };

  const buildAttackPaths = () => {
    const paths: AttackPath[] = [];
    const options = {
      attackToolKey:
        relType.value === RelationType.attackTool ? relKey.value : undefined,
      avoidanceKey:
        relType.value === RelationType.avoidance ? relKey.value : undefined,
      threatActorKey:
        relType.value === RelationType.threatActor ? relKey.value : undefined,
    };

    getCandidateRiskKeys().forEach((riskKey) => {
      paths.push(...buildAttackPathsForRisk(riskKey, options));
    });

    return paths.filter(matchesSelectedEntity);
  };

  return {
    buildAttackPaths,
    buildAttackPathsForRisk,
    getCandidateRiskKeys,
  };
};
