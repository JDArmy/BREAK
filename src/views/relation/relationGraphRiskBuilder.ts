import BREAK from "@/BREAK";
import { RelationType } from "@/views/relation/relationTypes";
import {
  addRelationLine,
  addRelationNode,
  type RelationGraphBuilderContext,
} from "@/views/relation/relationGraphBuilderShared";
import { addRelatedTerms } from "@/views/relation/relationGraphTermBuilder";

export const createRiskRelationBuilder = (context: RelationGraphBuilderContext) => {
  const addAvoidance = (riskKey: string) => {
    const avoidanceKeys = BREAK.risks[riskKey as keyof typeof BREAK.risks].avoidances;
    avoidanceKeys.forEach((avoidanceKey) => {
      addRelationNode(context, RelationType.avoidance, avoidanceKey);
      addRelationLine(context, riskKey, "relationLine.avoidanceMeans", avoidanceKey);
    });
  };

  const addAttackTool = (riskKey: string) => {
    const directAttackToolKeys = Object.keys(BREAK.attackTools).filter((attackToolKey) =>
      BREAK.attackTools[attackToolKey as keyof typeof BREAK.attackTools].directCauseRisks.includes(riskKey)
    );
    const indirectAttackToolKeys = Object.keys(BREAK.attackTools).filter((attackToolKey) =>
      BREAK.attackTools[attackToolKey as keyof typeof BREAK.attackTools].indirectSupportRisks.includes(riskKey)
    );

    directAttackToolKeys.forEach((attackToolKey) => {
      addRelationNode(context, RelationType.attackTool, attackToolKey);
      addRelationLine(context, attackToolKey, "relationLine.directCauseRisk", riskKey);
    });
    indirectAttackToolKeys.forEach((attackToolKey) => {
      addRelationNode(context, RelationType.attackTool, attackToolKey);
      addRelationLine(context, attackToolKey, "relationLine.indirectSupportRisk", riskKey);
    });
  };

  const addAvoidanceAttackToolRelation = (riskKey: string) => {
    const avoidanceKeys = BREAK.risks[riskKey as keyof typeof BREAK.risks].avoidances;
    const attackToolKeys = Object.keys(BREAK.attackTools).filter((attackToolKey) => {
      const attackTool = BREAK.attackTools[attackToolKey as keyof typeof BREAK.attackTools];
      return (
        attackTool.directCauseRisks.includes(riskKey) || attackTool.indirectSupportRisks.includes(riskKey)
      );
    });

    attackToolKeys.forEach((attackToolKey) => {
      avoidanceKeys.forEach((avoidanceKey) => {
        if (
          BREAK.attackTools[attackToolKey as keyof typeof BREAK.attackTools].avoidances.includes(avoidanceKey)
        ) {
          addRelationLine(context, avoidanceKey, "relationLine.avoidanceMeans", attackToolKey);
        }
      });
    });
  };

  const addThreatActor = (riskKey: string) => {
    const directThreatActorKeys = Object.keys(BREAK.threatActors).filter((threatActorKey) =>
      BREAK.threatActors[threatActorKey as keyof typeof BREAK.threatActors].directCauseRisks.includes(riskKey)
    );
    const indirectThreatActorKeys = Object.keys(BREAK.threatActors).filter((threatActorKey) =>
      BREAK.threatActors[threatActorKey as keyof typeof BREAK.threatActors].indirectSupportRisks.includes(riskKey)
    );

    directThreatActorKeys.forEach((threatActorKey) => {
      addRelationNode(context, RelationType.threatActor, threatActorKey);
      addRelationLine(context, threatActorKey, "relationLine.directCauseRisk", riskKey);
    });
    indirectThreatActorKeys.forEach((threatActorKey) => {
      addRelationNode(context, RelationType.threatActor, threatActorKey);
      addRelationLine(context, threatActorKey, "relationLine.indirectSupportRisk", riskKey);
    });
  };

  const addThreatActorAttackToolRelation = (riskKey: string) => {
    const threatActorKeys = Object.keys(BREAK.threatActors).filter((threatActorKey) => {
      const threatActor = BREAK.threatActors[threatActorKey as keyof typeof BREAK.threatActors];
      return (
        threatActor.directCauseRisks.includes(riskKey) || threatActor.indirectSupportRisks.includes(riskKey)
      );
    });
    const attackToolKeys = Object.keys(BREAK.attackTools).filter((attackToolKey) => {
      const attackTool = BREAK.attackTools[attackToolKey as keyof typeof BREAK.attackTools];
      return (
        attackTool.directCauseRisks.includes(riskKey) || attackTool.indirectSupportRisks.includes(riskKey)
      );
    });

    threatActorKeys.forEach((threatActorKey) => {
      attackToolKeys.forEach((attackToolKey) => {
        const threatActor = BREAK.threatActors[threatActorKey as keyof typeof BREAK.threatActors];
        if (threatActor.useAttackTools.includes(attackToolKey)) {
          addRelationLine(context, threatActorKey, "relationLine.useAttackTool", attackToolKey);
        } else if (threatActor.buildAttackTools.includes(attackToolKey)) {
          addRelationLine(context, threatActorKey, "relationLine.buildAttackTool", attackToolKey);
        }
      });
    });
  };

  const addSubrisk = (riskKey: string) => {
    const subriskKeys = Object.keys(BREAK.risks).filter(
      (candidateRiskKey) => candidateRiskKey.includes(riskKey) && candidateRiskKey !== riskKey
    );
    subriskKeys.forEach((subriskKey) => {
      addRelationNode(context, RelationType.risk, subriskKey, { isSubNode: true });
      addRelationLine(context, riskKey, "relationLine.subRisk", subriskKey);
    });
  };

  const addTerm = (riskKey: string) => {
    addRelatedTerms(context, RelationType.risk, riskKey);
  };

  return {
    addAttackTool,
    addAvoidance,
    addAvoidanceAttackToolRelation,
    addSubrisk,
    addTerm,
    addThreatActor,
    addThreatActorAttackToolRelation,
  };
};
