import BREAK from "@/BREAK";
import { RelationType } from "@/views/relation/relationTypes";
import {
  addRelationLine,
  addRelationNode,
  type RelationGraphBuilderContext,
} from "@/views/relation/relationGraphBuilderShared";

type TermRelationField =
  | "relatedRisks"
  | "relatedAvoidances"
  | "relatedAttackTools"
  | "relatedThreatActors";

const termRelationConfig: Record<
  TermRelationField,
  {
    type: Exclude<RelationType, RelationType.all>;
    relationKey: string;
  }
> = {
  relatedRisks: {
    type: RelationType.risk,
    relationKey: "relationLine.relatedTerm",
  },
  relatedAvoidances: {
    type: RelationType.avoidance,
    relationKey: "relationLine.relatedTerm",
  },
  relatedAttackTools: {
    type: RelationType.attackTool,
    relationKey: "relationLine.relatedTerm",
  },
  relatedThreatActors: {
    type: RelationType.threatActor,
    relationKey: "relationLine.relatedTerm",
  },
};

export const getRelatedTermKeys = (
  targetType: Exclude<RelationType, RelationType.all>,
  targetKey: string
) => {
  const fieldByType: Partial<Record<Exclude<RelationType, RelationType.all>, TermRelationField>> = {
    [RelationType.risk]: "relatedRisks",
    [RelationType.avoidance]: "relatedAvoidances",
    [RelationType.attackTool]: "relatedAttackTools",
    [RelationType.threatActor]: "relatedThreatActors",
  };
  const field = fieldByType[targetType];
  if (!field) return [];

  return Object.keys(BREAK.terms).filter((termKey) =>
    BREAK.terms[termKey as keyof typeof BREAK.terms][field].includes(targetKey as never)
  );
};

export const addRelatedTerms = (
  context: RelationGraphBuilderContext,
  targetType: Exclude<RelationType, RelationType.all>,
  targetKey: string
) => {
  getRelatedTermKeys(targetType, targetKey).forEach((termKey) => {
    addRelationNode(context, RelationType.term, termKey);
    addRelationLine(context, termKey, "relationLine.relatedTerm", targetKey);
  });
};

export const createTermRelationBuilder = (context: RelationGraphBuilderContext) => {
  const addRelatedEntities = (termKey: string) => {
    const term = BREAK.terms[termKey as keyof typeof BREAK.terms];

    (Object.keys(termRelationConfig) as TermRelationField[]).forEach((field) => {
      const config = termRelationConfig[field];
      term[field].forEach((entityKey) => {
        addRelationNode(context, config.type, entityKey);
        addRelationLine(context, termKey, config.relationKey, entityKey);
      });
    });
  };

  return {
    addRelatedEntities,
  };
};
