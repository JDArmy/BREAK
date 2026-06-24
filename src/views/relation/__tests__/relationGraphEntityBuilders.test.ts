import { describe, expect, it, vi } from "vitest";
import { createRelationTypeMapping, RelationType, type Line, type Node } from "../relationTypes";
import {
  addRelationLine,
  addRelationNode,
  type RelationGraphBuilderContext,
} from "../relationGraphBuilderShared";
import { createRiskRelationBuilder } from "../relationGraphRiskBuilder";
import { createAvoidanceRelationBuilder } from "../relationGraphAvoidanceBuilder";
import { createAttackToolRelationBuilder } from "../relationGraphAttackToolBuilder";
import { createThreatActorRelationBuilder } from "../relationGraphThreatActorBuilder";
import {
  addRelatedTerms,
  createTermRelationBuilder,
  getRelatedTermKeys,
} from "../relationGraphTermBuilder";

const mockBreak = vi.hoisted(() => ({
  risks: {
    R0001: {
      avoidances: ["A0001", "A0002"],
      relatedRisks: [
        { key: "R0002", relation: "prerequisite" },
        { key: "R9999", relation: "variant" },
      ],
    },
    "R0001-001": {
      avoidances: ["A0002"],
    },
    R0002: {
      avoidances: ["A0003"],
    },
    R0003: {
      avoidances: ["A0001"],
    },
  },
  avoidances: {
    A0001: {
      relatedAvoidances: [
        { key: "A0002", relation: "complement" },
        { key: "A9999", relation: "alternative" },
      ],
    },
    "A0001-001": {},
    A0002: {},
    A0003: {},
  },
  attackTools: {
    AT0001: {
      avoidances: ["A0001"],
      directCauseRisks: ["R0001"],
      indirectSupportRisks: ["R0003"],
      relatedAttackTools: [
        { key: "AT0002", relation: "co-used" },
        { key: "AT9999", relation: "alternative" },
      ],
    },
    "AT0001-001": {
      avoidances: [],
      directCauseRisks: [],
      indirectSupportRisks: [],
    },
    AT0002: {
      avoidances: ["A0002"],
      directCauseRisks: [],
      indirectSupportRisks: ["R0001"],
    },
  },
  threatActors: {
    TA0001: {
      buildAttackTools: ["AT0001"],
      useAttackTools: ["AT0002"],
      directCauseRisks: ["R0001"],
      indirectSupportRisks: ["R0003"],
      relatedThreatActors: [
        { key: "TA0002", relation: "co-involved" },
        { key: "TA9999", relation: "co-involved" },
      ],
    },
    "TA0001-001": {
      buildAttackTools: [],
      useAttackTools: [],
      directCauseRisks: [],
      indirectSupportRisks: [],
    },
    TA0002: {
      buildAttackTools: [],
      useAttackTools: ["AT0001"],
      directCauseRisks: [],
      indirectSupportRisks: ["R0001"],
    },
  },
  terms: {
    T0001: {
      relatedRisks: ["R0001"],
      relatedAvoidances: ["A0001"],
      relatedAttackTools: ["AT0001"],
      relatedThreatActors: ["TA0001"],
    },
    T0002: {
      relatedRisks: ["R0002"],
      relatedAvoidances: [],
      relatedAttackTools: [],
      relatedThreatActors: [],
    },
  },
}));

vi.mock("@/BREAK", () => ({
  default: mockBreak,
}));

const createContext = (): RelationGraphBuilderContext => ({
  t: (key) => `t:${key}`,
  nodes: [],
  lines: [],
  RelationTypeMapping: createRelationTypeMapping((key) => `t:${key}`, () => "#111"),
  getGraphNodeText: (type, key) => `${type}:${key}`,
});

const line = (lines: Line[], from: string, relationKey: string, to: string) =>
  lines.find((item) => item.from === from && item.relationKey === relationKey && item.to === to);

const node = (nodes: Node[], id: string) => nodes.find((item) => item.id === id);

describe("relationGraphBuilderShared", () => {
  it("应该添加普通节点、标记节点和本地化连线", () => {
    const context = createContext();

    addRelationNode(context, RelationType.risk, "R0001");
    addRelationNode(context, RelationType.risk, "R0001-001", { isSubNode: true });
    addRelationNode(context, RelationType.avoidance, "A0001", { isRelatedEntity: true });
    addRelationLine(context, "R0001", "relationLine.subRisk", "R0001-001");

    expect(context.nodes).toEqual([
      expect.objectContaining({ id: "R0001", text: "risk:R0001", data: undefined }),
      expect.objectContaining({ id: "R0001-001", data: { isSubNode: true } }),
      expect.objectContaining({ id: "A0001", data: { isRelatedEntity: true } }),
    ]);
    expect(context.lines).toEqual([
      {
        from: "R0001",
        relationKey: "relationLine.subRisk",
        text: "t:relationLine.subRisk",
        to: "R0001-001",
      },
    ]);
  });
});

describe("关系图实体构建器", () => {
  it("应该构建风险的规避、工具、行为者、子风险、相关风险和术语关系", () => {
    const context = createContext();
    const builder = createRiskRelationBuilder(context);

    builder.addAvoidance("R0001");
    builder.addAttackTool("R0001");
    builder.addAvoidanceAttackToolRelation("R0001");
    builder.addThreatActor("R0001");
    builder.addThreatActorAttackToolRelation("R0001");
    builder.addSubrisk("R0001");
    builder.addRelatedRisk("R0001");
    builder.addTerm("R0001");

    expect(node(context.nodes, "A0001")).toEqual(expect.objectContaining({ type: RelationType.avoidance }));
    expect(node(context.nodes, "AT0001")).toEqual(expect.objectContaining({ type: RelationType.attackTool }));
    expect(node(context.nodes, "TA0001")).toEqual(expect.objectContaining({ type: RelationType.threatActor }));
    expect(node(context.nodes, "R0001-001")).toEqual(expect.objectContaining({ data: { isSubNode: true } }));
    expect(node(context.nodes, "R0002")).toEqual(expect.objectContaining({ data: { isRelatedEntity: true } }));
    expect(node(context.nodes, "R9999")).toBeUndefined();
    expect(node(context.nodes, "T0001")).toEqual(expect.objectContaining({ type: RelationType.term }));

    expect(line(context.lines, "R0001", "relationLine.avoidanceMeans", "A0001")).toBeTruthy();
    expect(line(context.lines, "AT0001", "relationLine.directCauseRisk", "R0001")).toBeTruthy();
    expect(line(context.lines, "AT0002", "relationLine.indirectSupportRisk", "R0001")).toBeTruthy();
    expect(line(context.lines, "A0001", "relationLine.avoidanceMeans", "AT0001")).toBeTruthy();
    expect(line(context.lines, "TA0001", "relationLine.directCauseRisk", "R0001")).toBeTruthy();
    expect(line(context.lines, "TA0002", "relationLine.indirectSupportRisk", "R0001")).toBeTruthy();
    expect(line(context.lines, "TA0001", "relationLine.buildAttackTool", "AT0001")).toBeTruthy();
    expect(line(context.lines, "TA0001", "relationLine.useAttackTool", "AT0002")).toBeTruthy();
    expect(line(context.lines, "R0001", "relationLine.subRisk", "R0001-001")).toBeTruthy();
    expect(line(context.lines, "R0001", "relationLine.riskPrerequisite", "R0002")).toBeTruthy();
    expect(line(context.lines, "T0001", "relationLine.relatedTerm", "R0001")).toBeTruthy();
  });

  it("应该构建规避手段的风险、子手段、相关手段和术语关系", () => {
    const context = createContext();
    const builder = createAvoidanceRelationBuilder(context);

    builder.addRisk("A0001");
    builder.addSubavoidance("A0001");
    builder.addRelatedAvoidance("A0001");
    builder.addTerm("A0001");

    expect(node(context.nodes, "R0001")).toEqual(expect.objectContaining({ type: RelationType.risk }));
    expect(node(context.nodes, "A0001-001")).toEqual(expect.objectContaining({ data: { isSubNode: true } }));
    expect(node(context.nodes, "A0002")).toEqual(expect.objectContaining({ data: { isRelatedEntity: true } }));
    expect(node(context.nodes, "A9999")).toBeUndefined();
    expect(node(context.nodes, "T0001")).toEqual(expect.objectContaining({ type: RelationType.term }));
    expect(line(context.lines, "R0001", "relationLine.avoidanceMeans", "A0001")).toBeTruthy();
    expect(line(context.lines, "A0001", "relationLine.subAvoidance", "A0001-001")).toBeTruthy();
    expect(line(context.lines, "A0001", "relationLine.avoidanceComplement", "A0002")).toBeTruthy();
    expect(line(context.lines, "T0001", "relationLine.relatedTerm", "A0001")).toBeTruthy();
  });

  it("应该构建攻击工具的风险、防护、行为者、子工具和相关工具关系", () => {
    const context = createContext();
    const builder = createAttackToolRelationBuilder(context);

    builder.addRisk("AT0001");
    builder.addAvoidance("AT0001");
    builder.addRiskAvoidanceRelation("AT0001");
    builder.addThreatActor("AT0001");
    builder.addThreatActorRiskRelation("AT0001");
    builder.addSubattackTool("AT0001");
    builder.addRelatedAttackTool("AT0001");
    builder.addTerm("AT0001");

    expect(node(context.nodes, "R0001")).toEqual(expect.objectContaining({ type: RelationType.risk }));
    expect(node(context.nodes, "A0001")).toEqual(expect.objectContaining({ type: RelationType.avoidance }));
    expect(node(context.nodes, "TA0001")).toEqual(expect.objectContaining({ type: RelationType.threatActor }));
    expect(node(context.nodes, "AT0001-001")).toEqual(expect.objectContaining({ data: { isSubNode: true } }));
    expect(node(context.nodes, "AT0002")).toEqual(expect.objectContaining({ data: { isRelatedEntity: true } }));
    expect(node(context.nodes, "AT9999")).toBeUndefined();
    expect(node(context.nodes, "T0001")).toEqual(expect.objectContaining({ type: RelationType.term }));
    expect(line(context.lines, "AT0001", "relationLine.directCauseRisk", "R0001")).toBeTruthy();
    expect(line(context.lines, "AT0001", "relationLine.indirectSupportRisk", "R0003")).toBeTruthy();
    expect(line(context.lines, "AT0001", "relationLine.avoidanceMeans", "A0001")).toBeTruthy();
    expect(line(context.lines, "R0001", "relationLine.avoidanceMeans", "A0001")).toBeTruthy();
    expect(line(context.lines, "TA0001", "relationLine.buildAttackTool", "AT0001")).toBeTruthy();
    expect(line(context.lines, "TA0002", "relationLine.useAttackTool", "AT0001")).toBeTruthy();
    expect(line(context.lines, "R0001", "relationLine.attackToolMaker", "TA0001")).toBeTruthy();
    expect(line(context.lines, "TA0002", "relationLine.causeRisk", "R0001")).toBeTruthy();
    expect(line(context.lines, "AT0001", "relationLine.subAttackTool", "AT0001-001")).toBeTruthy();
    expect(line(context.lines, "AT0001", "relationLine.attackToolCoUsed", "AT0002")).toBeTruthy();
    expect(line(context.lines, "T0001", "relationLine.relatedTerm", "AT0001")).toBeTruthy();
  });

  it("应该构建威胁行为者的风险、工具、工具到风险、子行为者和相关行为者关系", () => {
    const context = createContext();
    const builder = createThreatActorRelationBuilder(context);

    builder.addRisk("TA0001");
    builder.addAttackTool("TA0001");
    builder.addAttackToolRiskRelation("TA0001");
    builder.addSubthreatActor("TA0001");
    builder.addRelatedThreatActor("TA0001");
    builder.addTerm("TA0001");

    expect(node(context.nodes, "R0001")).toEqual(expect.objectContaining({ type: RelationType.risk }));
    expect(node(context.nodes, "AT0001")).toEqual(expect.objectContaining({ type: RelationType.attackTool }));
    expect(node(context.nodes, "TA0001-001")).toEqual(expect.objectContaining({ data: { isSubNode: true } }));
    expect(node(context.nodes, "TA0002")).toEqual(expect.objectContaining({ data: { isRelatedEntity: true } }));
    expect(node(context.nodes, "TA9999")).toBeUndefined();
    expect(node(context.nodes, "T0001")).toEqual(expect.objectContaining({ type: RelationType.term }));
    expect(line(context.lines, "TA0001", "relationLine.directCauseRisk", "R0001")).toBeTruthy();
    expect(line(context.lines, "TA0001", "relationLine.indirectSupportRisk", "R0003")).toBeTruthy();
    expect(line(context.lines, "TA0001", "relationLine.buildAttackTool", "AT0001")).toBeTruthy();
    expect(line(context.lines, "TA0001", "relationLine.useAttackTool", "AT0002")).toBeTruthy();
    expect(line(context.lines, "AT0001", "relationLine.causeRisk", "R0001")).toBeTruthy();
    expect(line(context.lines, "TA0001", "relationLine.subThreatActor", "TA0001-001")).toBeTruthy();
    expect(line(context.lines, "TA0001", "relationLine.threatActorCoInvolved", "TA0002")).toBeTruthy();
    expect(line(context.lines, "T0001", "relationLine.relatedTerm", "TA0001")).toBeTruthy();
  });

  it("应该构建术语的实体关系并按实体类型反查术语", () => {
    const context = createContext();
    const builder = createTermRelationBuilder(context);

    builder.addRelatedEntities("T0001");
    addRelatedTerms(context, RelationType.risk, "R0002");

    expect(getRelatedTermKeys(RelationType.risk, "R0001")).toEqual(["T0001"]);
    expect(getRelatedTermKeys(RelationType.term, "T0001")).toEqual([]);
    expect(node(context.nodes, "R0001")).toEqual(expect.objectContaining({ type: RelationType.risk }));
    expect(node(context.nodes, "A0001")).toEqual(expect.objectContaining({ type: RelationType.avoidance }));
    expect(node(context.nodes, "AT0001")).toEqual(expect.objectContaining({ type: RelationType.attackTool }));
    expect(node(context.nodes, "TA0001")).toEqual(expect.objectContaining({ type: RelationType.threatActor }));
    expect(node(context.nodes, "T0002")).toEqual(expect.objectContaining({ type: RelationType.term }));
    expect(line(context.lines, "T0001", "relationLine.relatedTerm", "R0001")).toBeTruthy();
    expect(line(context.lines, "T0001", "relationLine.relatedTerm", "A0001")).toBeTruthy();
    expect(line(context.lines, "T0001", "relationLine.relatedTerm", "AT0001")).toBeTruthy();
    expect(line(context.lines, "T0001", "relationLine.relatedTerm", "TA0001")).toBeTruthy();
    expect(line(context.lines, "T0002", "relationLine.relatedTerm", "R0002")).toBeTruthy();
  });
});
