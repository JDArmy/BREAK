import { RelationType } from "@/views/relation/relationTypes";

export interface RiskRelationBuilder {
  addAttackTool: (key: string) => void;
  addAvoidance: (key: string) => void;
  addAvoidanceAttackToolRelation: (key: string) => void;
  addRelatedRisk: (key: string) => void;
  addSubrisk: (key: string) => void;
  addTerm: (key: string) => void;
  addThreatActor: (key: string) => void;
  addThreatActorAttackToolRelation: (key: string) => void;
}

export interface AvoidanceRelationBuilder {
  addRelatedAvoidance: (key: string) => void;
  addRisk: (key: string) => void;
  addSubavoidance: (key: string) => void;
  addTerm: (key: string) => void;
}

export interface AttackToolRelationBuilder {
  addAvoidance: (key: string) => void;
  addRelatedAttackTool: (key: string) => void;
  addRisk: (key: string) => void;
  addRiskAvoidanceRelation: (key: string) => void;
  addSubattackTool: (key: string) => void;
  addTerm: (key: string) => void;
  addThreatActor: (key: string) => void;
  addThreatActorRiskRelation: (key: string) => void;
}

export interface ThreatActorRelationBuilder {
  addAttackTool: (key: string) => void;
  addAttackToolRiskRelation: (key: string) => void;
  addRelatedThreatActor: (key: string) => void;
  addRisk: (key: string) => void;
  addSubthreatActor: (key: string) => void;
  addTerm: (key: string) => void;
}

export interface TermRelationBuilder {
  addRelatedEntities: (key: string) => void;
}

interface RelationGraphRequestDispatcherOptions {
  attackToolBuilder: AttackToolRelationBuilder;
  avoidanceBuilder: AvoidanceRelationBuilder;
  riskBuilder: RiskRelationBuilder;
  termBuilder: TermRelationBuilder;
  threatActorBuilder: ThreatActorRelationBuilder;
}

const dispatchRiskRequest = (
  builder: RiskRelationBuilder,
  reqType: RelationType,
  currentNodeId: string,
) => {
  if (reqType === RelationType.avoidance) {
    builder.addAvoidance(currentNodeId);
  } else if (reqType === RelationType.attackTool) {
    builder.addAttackTool(currentNodeId);
  } else if (reqType === RelationType.threatActor) {
    builder.addThreatActor(currentNodeId);
  } else if (reqType === RelationType.term) {
    builder.addTerm(currentNodeId);
  } else if (reqType === RelationType.all) {
    builder.addAvoidance(currentNodeId);
    builder.addAttackTool(currentNodeId);
    builder.addAvoidanceAttackToolRelation(currentNodeId);
    builder.addThreatActor(currentNodeId);
    builder.addThreatActorAttackToolRelation(currentNodeId);
    builder.addRelatedRisk(currentNodeId);
    builder.addSubrisk(currentNodeId);
    builder.addTerm(currentNodeId);
  }
};

const dispatchAvoidanceRequest = (
  builder: AvoidanceRelationBuilder,
  reqType: RelationType,
  currentNodeId: string,
) => {
  if (reqType === RelationType.risk) {
    builder.addRisk(currentNodeId);
  } else if (reqType === RelationType.avoidance) {
    builder.addRelatedAvoidance(currentNodeId);
  } else if (reqType === RelationType.term) {
    builder.addTerm(currentNodeId);
  } else if (reqType === RelationType.all) {
    builder.addRisk(currentNodeId);
    builder.addRelatedAvoidance(currentNodeId);
    builder.addSubavoidance(currentNodeId);
    builder.addTerm(currentNodeId);
  }
};

const dispatchAttackToolRequest = (
  builder: AttackToolRelationBuilder,
  reqType: RelationType,
  currentNodeId: string,
) => {
  if (reqType === RelationType.risk) {
    builder.addRisk(currentNodeId);
  } else if (reqType === RelationType.avoidance) {
    builder.addAvoidance(currentNodeId);
  } else if (reqType === RelationType.attackTool) {
    builder.addRelatedAttackTool(currentNodeId);
  } else if (reqType === RelationType.threatActor) {
    builder.addThreatActor(currentNodeId);
  } else if (reqType === RelationType.term) {
    builder.addTerm(currentNodeId);
  } else if (reqType === RelationType.all) {
    builder.addRisk(currentNodeId);
    builder.addAvoidance(currentNodeId);
    builder.addRiskAvoidanceRelation(currentNodeId);
    builder.addRelatedAttackTool(currentNodeId);
    builder.addThreatActor(currentNodeId);
    builder.addThreatActorRiskRelation(currentNodeId);
    builder.addSubattackTool(currentNodeId);
    builder.addTerm(currentNodeId);
  }
};

const dispatchThreatActorRequest = (
  builder: ThreatActorRelationBuilder,
  reqType: RelationType,
  currentNodeId: string,
) => {
  if (reqType === RelationType.risk) {
    builder.addRisk(currentNodeId);
  } else if (reqType === RelationType.attackTool) {
    builder.addAttackTool(currentNodeId);
  } else if (reqType === RelationType.threatActor) {
    builder.addRelatedThreatActor(currentNodeId);
  } else if (reqType === RelationType.term) {
    builder.addTerm(currentNodeId);
  } else if (reqType === RelationType.all) {
    builder.addRisk(currentNodeId);
    builder.addAttackTool(currentNodeId);
    builder.addAttackToolRiskRelation(currentNodeId);
    builder.addRelatedThreatActor(currentNodeId);
    builder.addSubthreatActor(currentNodeId);
    builder.addTerm(currentNodeId);
  }
};

const dispatchTermRequest = (
  builder: TermRelationBuilder,
  reqType: RelationType,
  currentNodeId: string,
) => {
  if (
    reqType === RelationType.all ||
    reqType === RelationType.risk ||
    reqType === RelationType.avoidance ||
    reqType === RelationType.attackTool ||
    reqType === RelationType.threatActor
  ) {
    builder.addRelatedEntities(currentNodeId);
  }
};

export const createRelationGraphRequestDispatcher = ({
  attackToolBuilder,
  avoidanceBuilder,
  riskBuilder,
  termBuilder,
  threatActorBuilder,
}: RelationGraphRequestDispatcherOptions) => ({
  dispatch(
    reqType: RelationType,
    currentNodeType: RelationType,
    currentNodeId: string,
  ) {
    if (currentNodeType === RelationType.risk) {
      dispatchRiskRequest(riskBuilder, reqType, currentNodeId);
    } else if (currentNodeType === RelationType.avoidance) {
      dispatchAvoidanceRequest(avoidanceBuilder, reqType, currentNodeId);
    } else if (currentNodeType === RelationType.attackTool) {
      dispatchAttackToolRequest(attackToolBuilder, reqType, currentNodeId);
    } else if (currentNodeType === RelationType.threatActor) {
      dispatchThreatActorRequest(threatActorBuilder, reqType, currentNodeId);
    } else if (currentNodeType === RelationType.term) {
      dispatchTermRequest(termBuilder, reqType, currentNodeId);
    }
  },
});
