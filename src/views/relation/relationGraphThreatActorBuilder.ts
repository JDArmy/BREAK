import BREAK from "@/BREAK";
import { RelationType } from "@/views/relation/relationTypes";
import {
  addRelationLine,
  addRelationNode,
  type RelationGraphBuilderContext,
} from "@/views/relation/relationGraphBuilderShared";
import { addRelatedTerms } from "@/views/relation/relationGraphTermBuilder";

const threatActorRelationLineKeyMap = {
  "co-involved": "relationLine.threatActorCoInvolved",
} as const;

export const createThreatActorRelationBuilder = (context: RelationGraphBuilderContext) => {
  const addRisk = (threatActorKey: string) => {
    const threatActor = BREAK.threatActors[threatActorKey];
    if (!threatActor) return;

    threatActor.directCauseRisks.forEach((riskKey) => {
      addRelationNode(context, RelationType.risk, riskKey);
      addRelationLine(context, threatActorKey, "relationLine.directCauseRisk", riskKey);
    });
    threatActor.indirectSupportRisks.forEach((riskKey) => {
      addRelationNode(context, RelationType.risk, riskKey);
      addRelationLine(context, threatActorKey, "relationLine.indirectSupportRisk", riskKey);
    });
  };

  const addAttackTool = (threatActorKey: string) => {
    const threatActor = BREAK.threatActors[threatActorKey];
    if (!threatActor) return;
    threatActor.buildAttackTools.forEach((attackToolKey) => {
      addRelationNode(context, RelationType.attackTool, attackToolKey);
      addRelationLine(context, threatActorKey, "relationLine.buildAttackTool", attackToolKey);
    });

    threatActor.useAttackTools.forEach((attackToolKey) => {
      addRelationNode(context, RelationType.attackTool, attackToolKey);
      addRelationLine(context, threatActorKey, "relationLine.useAttackTool", attackToolKey);
    });
  };

  const addAttackToolRiskRelation = (threatActorKey: string) => {
    const threatActor = BREAK.threatActors[threatActorKey];
    if (!threatActor) return;
    const attackToolKeys = [
      ...threatActor.buildAttackTools,
      ...threatActor.useAttackTools,
    ];
    const riskKeys = [...threatActor.directCauseRisks, ...threatActor.indirectSupportRisks];

    attackToolKeys.forEach((attackToolKey) => {
      riskKeys.forEach((riskKey) => {
        const attackTool = BREAK.attackTools[attackToolKey as keyof typeof BREAK.attackTools];
        if (!attackTool) return;
        if (
          attackTool.directCauseRisks.includes(riskKey) ||
          attackTool.indirectSupportRisks.includes(riskKey)
        ) {
          addRelationLine(context, attackToolKey, "relationLine.causeRisk", riskKey);
        }
      });
    });
  };

  const addSubthreatActor = (threatActorKey: string) => {
    const subthreatActorKeys = Object.keys(BREAK.threatActors).filter(
      (candidateThreatActorKey) =>
        candidateThreatActorKey.includes(threatActorKey) && candidateThreatActorKey !== threatActorKey
    );

    subthreatActorKeys.forEach((subthreatActorKey) => {
      addRelationNode(context, RelationType.threatActor, subthreatActorKey, { isSubNode: true });
      addRelationLine(context, threatActorKey, "relationLine.subThreatActor", subthreatActorKey);
    });
  };

  const addRelatedThreatActor = (threatActorKey: string) => {
    const threatActor = BREAK.threatActors[threatActorKey as keyof typeof BREAK.threatActors];
    if (!threatActor) return;
    const relatedThreatActors = threatActor.relatedThreatActors ?? [];
    relatedThreatActors.forEach(({ key, relation }) => {
      if (!(key in BREAK.threatActors)) return;
      addRelationNode(context, RelationType.threatActor, key, { isRelatedEntity: true });
      addRelationLine(context, threatActorKey, threatActorRelationLineKeyMap[relation], key);
    });
  };

  const addTerm = (threatActorKey: string) => {
    addRelatedTerms(context, RelationType.threatActor, threatActorKey);
  };

  return {
    addAttackTool,
    addAttackToolRiskRelation,
    addRelatedThreatActor,
    addRisk,
    addSubthreatActor,
    addTerm,
  };
};
