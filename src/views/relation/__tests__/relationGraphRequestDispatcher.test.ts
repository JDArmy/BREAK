import { describe, expect, it, vi } from "vitest";
import { createRelationGraphRequestDispatcher } from "../relationGraphRequestDispatcher";
import { RelationType } from "../relationTypes";

const createBuilders = () => {
  const riskBuilder = {
    addAttackTool: vi.fn(),
    addAvoidance: vi.fn(),
    addAvoidanceAttackToolRelation: vi.fn(),
    addRelatedRisk: vi.fn(),
    addSubrisk: vi.fn(),
    addTerm: vi.fn(),
    addThreatActor: vi.fn(),
    addThreatActorAttackToolRelation: vi.fn(),
  };
  const avoidanceBuilder = {
    addRelatedAvoidance: vi.fn(),
    addRisk: vi.fn(),
    addSubavoidance: vi.fn(),
    addTerm: vi.fn(),
  };
  const attackToolBuilder = {
    addAvoidance: vi.fn(),
    addRelatedAttackTool: vi.fn(),
    addRisk: vi.fn(),
    addRiskAvoidanceRelation: vi.fn(),
    addSubattackTool: vi.fn(),
    addTerm: vi.fn(),
    addThreatActor: vi.fn(),
    addThreatActorRiskRelation: vi.fn(),
  };
  const threatActorBuilder = {
    addAttackTool: vi.fn(),
    addAttackToolRiskRelation: vi.fn(),
    addRelatedThreatActor: vi.fn(),
    addRisk: vi.fn(),
    addSubthreatActor: vi.fn(),
    addTerm: vi.fn(),
  };
  const termBuilder = {
    addRelatedEntities: vi.fn(),
  };

  return {
    attackToolBuilder,
    avoidanceBuilder,
    dispatcher: createRelationGraphRequestDispatcher({
      attackToolBuilder,
      avoidanceBuilder,
      riskBuilder,
      termBuilder,
      threatActorBuilder,
    }),
    riskBuilder,
    termBuilder,
    threatActorBuilder,
  };
};

describe("relationGraphRequestDispatcher", () => {
  it("分发风险节点 all 请求到完整风险关系构建链路", () => {
    const { dispatcher, riskBuilder } = createBuilders();

    dispatcher.dispatch(RelationType.all, RelationType.risk, "R0001");

    expect(riskBuilder.addAvoidance).toHaveBeenCalledWith("R0001");
    expect(riskBuilder.addAttackTool).toHaveBeenCalledWith("R0001");
    expect(riskBuilder.addAvoidanceAttackToolRelation).toHaveBeenCalledWith(
      "R0001",
    );
    expect(riskBuilder.addThreatActor).toHaveBeenCalledWith("R0001");
    expect(riskBuilder.addThreatActorAttackToolRelation).toHaveBeenCalledWith(
      "R0001",
    );
    expect(riskBuilder.addRelatedRisk).toHaveBeenCalledWith("R0001");
    expect(riskBuilder.addSubrisk).toHaveBeenCalledWith("R0001");
    expect(riskBuilder.addTerm).toHaveBeenCalledWith("R0001");
  });

  it("按请求类型分发规避、攻击工具和威胁行为者的单项关系", () => {
    const {
      attackToolBuilder,
      avoidanceBuilder,
      dispatcher,
      threatActorBuilder,
    } = createBuilders();

    dispatcher.dispatch(RelationType.risk, RelationType.avoidance, "A0001");
    dispatcher.dispatch(
      RelationType.avoidance,
      RelationType.attackTool,
      "AT0001",
    );
    dispatcher.dispatch(
      RelationType.attackTool,
      RelationType.threatActor,
      "TA0001",
    );

    expect(avoidanceBuilder.addRisk).toHaveBeenCalledWith("A0001");
    expect(attackToolBuilder.addAvoidance).toHaveBeenCalledWith("AT0001");
    expect(threatActorBuilder.addAttackTool).toHaveBeenCalledWith("TA0001");
  });

  it("术语节点只对可关联实体请求构建关系", () => {
    const { dispatcher, termBuilder } = createBuilders();

    dispatcher.dispatch(RelationType.risk, RelationType.term, "T0001");
    dispatcher.dispatch(RelationType.term, RelationType.term, "T0001");

    expect(termBuilder.addRelatedEntities).toHaveBeenCalledTimes(1);
    expect(termBuilder.addRelatedEntities).toHaveBeenCalledWith("T0001");
  });

  it("未知或不支持的请求组合不调用任何构建器", () => {
    const {
      attackToolBuilder,
      avoidanceBuilder,
      dispatcher,
      riskBuilder,
      termBuilder,
      threatActorBuilder,
    } = createBuilders();

    dispatcher.dispatch(RelationType.risk, RelationType.all, "R0001");
    dispatcher.dispatch(
      RelationType.avoidance,
      RelationType.threatActor,
      "TA0001",
    );

    [
      riskBuilder,
      avoidanceBuilder,
      attackToolBuilder,
      threatActorBuilder,
      termBuilder,
    ].forEach((builder) => {
      Object.values(builder).forEach((spy) => {
        expect(spy).not.toHaveBeenCalled();
      });
    });
  });
});
