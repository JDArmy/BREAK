import BREAK from "@/BREAK";
import { RelationType } from "@/views/relation/relationTypes";
import {
  addRelationLine,
  addRelationNode,
  type RelationGraphBuilderContext,
} from "@/views/relation/relationGraphBuilderShared";

export const createAttackToolRelationBuilder = (context: RelationGraphBuilderContext) => {
  const addRisk = (attackToolKey: string) => {
    const attackTool = BREAK.attackTools[attackToolKey as keyof typeof BREAK.attackTools];

    attackTool.directCauseRisks.forEach((riskKey) => {
      addRelationNode(context, RelationType.risk, riskKey);
      addRelationLine(context, attackToolKey, "relationLine.directCauseRisk", riskKey);
    });
    attackTool.indirectSupportRisks.forEach((riskKey) => {
      addRelationNode(context, RelationType.risk, riskKey);
      addRelationLine(context, attackToolKey, "relationLine.indirectSupportRisk", riskKey);
    });
  };

  const addAvoidance = (attackToolKey: string) => {
    const avoidanceKeys = BREAK.attackTools[attackToolKey as keyof typeof BREAK.attackTools].avoidances;
    avoidanceKeys.forEach((avoidanceKey) => {
      addRelationNode(context, RelationType.avoidance, avoidanceKey);
      addRelationLine(context, attackToolKey, "relationLine.avoidanceMeans", avoidanceKey);
    });
  };

  const addRiskAvoidanceRelation = (attackToolKey: string) => {
    const attackTool = BREAK.attackTools[attackToolKey as keyof typeof BREAK.attackTools];
    const riskKeys = [...attackTool.directCauseRisks, ...attackTool.indirectSupportRisks];
    const avoidanceKeys = attackTool.avoidances;

    riskKeys.forEach((riskKey) => {
      BREAK.risks[riskKey as keyof typeof BREAK.risks].avoidances.forEach((avoidanceKey) => {
        if (avoidanceKeys.includes(avoidanceKey)) {
          addRelationLine(context, riskKey, "relationLine.avoidanceMeans", avoidanceKey);
        }
      });
    });
  };

  const addThreatActor = (attackToolKey: string) => {
    const builderThreatActorKeys = Object.keys(BREAK.threatActors).filter((threatActorKey) =>
      BREAK.threatActors[threatActorKey as keyof typeof BREAK.threatActors].buildAttackTools.includes(
        attackToolKey as never
      )
    );
    builderThreatActorKeys.forEach((threatActorKey) => {
      addRelationNode(context, RelationType.threatActor, threatActorKey);
      addRelationLine(context, threatActorKey, "relationLine.buildAttackTool", attackToolKey);
    });

    const userThreatActorKeys = Object.keys(BREAK.threatActors).filter((threatActorKey) =>
      BREAK.threatActors[threatActorKey as keyof typeof BREAK.threatActors].useAttackTools.includes(
        attackToolKey as never
      )
    );
    userThreatActorKeys.forEach((threatActorKey) => {
      addRelationNode(context, RelationType.threatActor, threatActorKey);
      addRelationLine(context, threatActorKey, "relationLine.useAttackTool", attackToolKey);
    });
  };

  const addThreatActorRiskRelation = (attackToolKey: string) => {
    const builderThreatActorKeys = Object.keys(BREAK.threatActors).filter((threatActorKey) =>
      BREAK.threatActors[threatActorKey as keyof typeof BREAK.threatActors].buildAttackTools.includes(
        attackToolKey as never
      )
    );
    const userThreatActorKeys = Object.keys(BREAK.threatActors).filter((threatActorKey) =>
      BREAK.threatActors[threatActorKey as keyof typeof BREAK.threatActors].useAttackTools.includes(
        attackToolKey as never
      )
    );
    const attackTool = BREAK.attackTools[attackToolKey as keyof typeof BREAK.attackTools];
    const riskKeys = [...attackTool.directCauseRisks, ...attackTool.indirectSupportRisks];

    builderThreatActorKeys.forEach((threatActorKey) => {
      riskKeys.forEach((riskKey) => {
        const threatActor = BREAK.threatActors[threatActorKey as keyof typeof BREAK.threatActors];
        if (
          threatActor.directCauseRisks.includes(riskKey) ||
          threatActor.indirectSupportRisks.includes(riskKey)
        ) {
          addRelationLine(context, riskKey, "relationLine.attackToolMaker", threatActorKey);
        }
      });
    });

    userThreatActorKeys.forEach((threatActorKey) => {
      riskKeys.forEach((riskKey) => {
        const threatActor = BREAK.threatActors[threatActorKey as keyof typeof BREAK.threatActors];
        if (
          threatActor.directCauseRisks.includes(riskKey) ||
          threatActor.indirectSupportRisks.includes(riskKey)
        ) {
          addRelationLine(context, threatActorKey, "relationLine.causeRisk", riskKey);
        }
      });
    });
  };

  const addSubattackTool = (attackToolKey: string) => {
    const subattackToolKeys = Object.keys(BREAK.attackTools).filter(
      (candidateAttackToolKey) =>
        candidateAttackToolKey.includes(attackToolKey) && candidateAttackToolKey !== attackToolKey
    );
    subattackToolKeys.forEach((subattackToolKey) => {
      addRelationNode(context, RelationType.attackTool, subattackToolKey, { isSubNode: true });
      addRelationLine(context, attackToolKey, "relationLine.subAttackTool", subattackToolKey);
    });
  };

  return {
    addAvoidance,
    addRisk,
    addRiskAvoidanceRelation,
    addSubattackTool,
    addThreatActor,
    addThreatActorRiskRelation,
  };
};
