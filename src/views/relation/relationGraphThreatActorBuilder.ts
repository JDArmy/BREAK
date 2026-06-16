import BREAK from "@/BREAK";
import { RelationType } from "@/views/relation/relationTypes";
import {
  addRelationLine,
  addRelationNode,
  type RelationGraphBuilderContext,
} from "@/views/relation/relationGraphBuilderShared";
import { addRelatedTerms } from "@/views/relation/relationGraphTermBuilder";

export const createThreatActorRelationBuilder = (context: RelationGraphBuilderContext) => {
  const addRisk = (threatActorKey: string) => {
    const threatActor = BREAK.threatActors[threatActorKey];

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
    BREAK.threatActors[threatActorKey].buildAttackTools.forEach((attackToolKey) => {
      addRelationNode(context, RelationType.attackTool, attackToolKey);
      addRelationLine(context, threatActorKey, "relationLine.buildAttackTool", attackToolKey);
    });

    BREAK.threatActors[threatActorKey].useAttackTools.forEach((attackToolKey) => {
      addRelationNode(context, RelationType.attackTool, attackToolKey);
      addRelationLine(context, threatActorKey, "relationLine.useAttackTool", attackToolKey);
    });
  };

  const addAttackToolRiskRelation = (threatActorKey: string) => {
    const attackToolKeys = [
      ...BREAK.threatActors[threatActorKey].buildAttackTools,
      ...BREAK.threatActors[threatActorKey].useAttackTools,
    ];
    const threatActor = BREAK.threatActors[threatActorKey];
    const riskKeys = [...threatActor.directCauseRisks, ...threatActor.indirectSupportRisks];

    attackToolKeys.forEach((attackToolKey) => {
      riskKeys.forEach((riskKey) => {
        const attackTool = BREAK.attackTools[attackToolKey as keyof typeof BREAK.attackTools];
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

  const addTerm = (threatActorKey: string) => {
    addRelatedTerms(context, RelationType.threatActor, threatActorKey);
  };

  return {
    addAttackTool,
    addAttackToolRiskRelation,
    addRisk,
    addSubthreatActor,
    addTerm,
  };
};
