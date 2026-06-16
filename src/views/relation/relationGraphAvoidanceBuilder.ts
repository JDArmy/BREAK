import BREAK from "@/BREAK";
import { RelationType } from "@/views/relation/relationTypes";
import {
  addRelationLine,
  addRelationNode,
  type RelationGraphBuilderContext,
} from "@/views/relation/relationGraphBuilderShared";
import { addRelatedTerms } from "@/views/relation/relationGraphTermBuilder";

export const createAvoidanceRelationBuilder = (context: RelationGraphBuilderContext) => {
  const addRisk = (avoidanceKey: string) => {
    const riskKeys = Object.keys(BREAK.risks).filter((riskKey) =>
      BREAK.risks[riskKey as keyof typeof BREAK.risks].avoidances.includes(avoidanceKey as never)
    );

    riskKeys.forEach((riskKey) => {
      addRelationNode(context, RelationType.risk, riskKey);
      addRelationLine(context, riskKey, "relationLine.avoidanceMeans", avoidanceKey);
    });
  };

  const addSubavoidance = (avoidanceKey: string) => {
    const subavoidanceKeys = Object.keys(BREAK.avoidances).filter(
      (candidateAvoidanceKey) =>
        candidateAvoidanceKey.includes(avoidanceKey) && candidateAvoidanceKey !== avoidanceKey
    );

    subavoidanceKeys.forEach((subavoidanceKey) => {
      addRelationNode(context, RelationType.avoidance, subavoidanceKey, { isSubNode: true });
      addRelationLine(context, avoidanceKey, "relationLine.subAvoidance", subavoidanceKey);
    });
  };

  const addTerm = (avoidanceKey: string) => {
    addRelatedTerms(context, RelationType.avoidance, avoidanceKey);
  };

  return {
    addRisk,
    addSubavoidance,
    addTerm,
  };
};
