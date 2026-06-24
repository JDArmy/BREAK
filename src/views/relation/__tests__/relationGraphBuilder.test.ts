import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { ElMessage } from "element-plus";
import { createRelationGraphBuilder } from "../relationGraphBuilder";
import {
  createRelationTypeMapping,
  RelationType,
  type Line,
  type Node,
  type RelationEntityType,
} from "../relationTypes";

const builderSpies = vi.hoisted(() => {
  const risk = {
    addAttackTool: vi.fn(),
    addAvoidance: vi.fn(),
    addAvoidanceAttackToolRelation: vi.fn(),
    addRelatedRisk: vi.fn(),
    addSubrisk: vi.fn(),
    addTerm: vi.fn(),
    addThreatActor: vi.fn(),
    addThreatActorAttackToolRelation: vi.fn(),
  };
  const avoidance = {
    addRelatedAvoidance: vi.fn(),
    addRisk: vi.fn(),
    addSubavoidance: vi.fn(),
    addTerm: vi.fn(),
  };
  const attackTool = {
    addAvoidance: vi.fn(),
    addRelatedAttackTool: vi.fn(),
    addRisk: vi.fn(),
    addRiskAvoidanceRelation: vi.fn(),
    addSubattackTool: vi.fn(),
    addTerm: vi.fn(),
    addThreatActor: vi.fn(),
    addThreatActorRiskRelation: vi.fn(),
  };
  const threatActor = {
    addAttackTool: vi.fn(),
    addAttackToolRiskRelation: vi.fn(),
    addRelatedThreatActor: vi.fn(),
    addRisk: vi.fn(),
    addSubthreatActor: vi.fn(),
    addTerm: vi.fn(),
  };
  const term = {
    addRelatedEntities: vi.fn(),
  };
  return { attackTool, avoidance, risk, term, threatActor };
});

vi.mock("element-plus", () => ({
  ElMessage: vi.fn(),
}));

vi.mock("@/views/relation/relationGraphRiskBuilder", () => ({
  createRiskRelationBuilder: () => builderSpies.risk,
}));

vi.mock("@/views/relation/relationGraphAvoidanceBuilder", () => ({
  createAvoidanceRelationBuilder: () => builderSpies.avoidance,
}));

vi.mock("@/views/relation/relationGraphAttackToolBuilder", () => ({
  createAttackToolRelationBuilder: () => builderSpies.attackTool,
}));

vi.mock("@/views/relation/relationGraphThreatActorBuilder", () => ({
  createThreatActorRelationBuilder: () => builderSpies.threatActor,
}));

vi.mock("@/views/relation/relationGraphTermBuilder", () => ({
  createTermRelationBuilder: () => builderSpies.term,
}));

describe("relationGraphBuilder", () => {
  const mockT = (key: string) => key;
  const mockRelationTypeMapping = createRelationTypeMapping(mockT, () => "#000");
  const resetBuilderSpies = () => {
    Object.values(builderSpies).forEach((builder) => {
      Object.values(builder).forEach((spy) => spy.mockClear());
    });
    vi.mocked(ElMessage).mockClear();
  };

  beforeEach(() => {
    resetBuilderSpies();
  });

  const createBuilder = (options?: {
    lines?: Line[];
    nodes?: Node[];
    relKey?: string;
    relType?: RelationType;
    renderNetworkChart?: () => void;
    selectedNetworkNodeId?: ReturnType<typeof ref<string>>;
  }) =>
    createRelationGraphBuilder({
      t: mockT,
      relType: ref(options?.relType ?? RelationType.risk),
      relKey: ref(options?.relKey ?? "R0001"),
      nodes: options?.nodes ?? [],
      lines: options?.lines ?? [],
      jsonData: { rootId: "R0001" },
      selectedNetworkNodeId: options?.selectedNetworkNodeId ?? ref(""),
      RelationTypeMapping: mockRelationTypeMapping,
      relationLegendItems: ref([]),
      getGraphNodeText: (type: RelationEntityType, key: string) =>
        `${type}:${key}`,
      renderNetworkChart: options?.renderNetworkChart ?? (() => {}),
    });

  it("应该去重节点", () => {
    const nodes: Node[] = [
      { id: "R01", type: RelationType.risk, text: "风险1", color: "" },
      { id: "R01", type: RelationType.risk, text: "风险1", color: "" },
      { id: "R02", type: RelationType.risk, text: "风险2", color: "" },
    ];
    const builder = createBuilder({ nodes });

    builder.uniqNodes();
    expect(nodes.length).toBe(2);
    expect(nodes.map(n => n.id)).toEqual(["R01", "R02"]);
  });

  it("应该去重连线", () => {
    const lines: Line[] = [
      { from: "R01", to: "A01", text: "规避" },
      { from: "R01", to: "A01", text: "规避" },
      { from: "R02", to: "A01", text: "规避" },
    ];
    const builder = createBuilder({ lines });

    builder.uniqLines();
    expect(lines.length).toBe(2);
  });

  it("应该提取所有连线类型", () => {
    const lines: Line[] = [
      { from: "R01", to: "A01", relationKey: "relationLine.avoidanceMeans", text: "规避手段" },
      { from: "R01", to: "AT01", relationKey: "relationLine.directCauseRisk", text: "攻击工具" },
      { from: "R02", to: "A01", relationKey: "relationLine.avoidanceMeans", text: "规避手段" },
    ];
    const builder = createBuilder({ lines });

    builder.getLineType();
    expect(builder.totalLineType.value).toEqual([
      "relationLine.avoidanceMeans",
      "relationLine.directCauseRisk",
    ]);
  });

  it("应该只显示当前图中存在的图例项", () => {
    const lines: Line[] = [
      { from: "R01", to: "A01", relationKey: "relationLine.avoidanceMeans", text: "规避手段" },
    ];
    const relationLegendItems = ref([
      { key: "relationLine.avoidanceMeans", color: "#1", label: "规避", fields: [] },
      { key: "relationLine.directCauseRisk", color: "#2", label: "直接造成", fields: [] },
      { color: "#3", label: "规避手段", fields: [] },
    ]);
    const builder = createRelationGraphBuilder({
      t: mockT,
      relType: ref(RelationType.risk),
      relKey: ref("R0001"),
      nodes: [],
      lines,
      jsonData: { rootId: "R0001" },
      selectedNetworkNodeId: ref(""),
      RelationTypeMapping: mockRelationTypeMapping,
      relationLegendItems,
      getGraphNodeText: (type, key) => `${type}:${key}`,
      renderNetworkChart: () => {},
    });

    builder.getLineType();
    expect(builder.visibleRelationLegendItems.value).toEqual([
      relationLegendItems.value[0],
    ]);
  });

  it("应该添加存在的根节点，并在未知 ID 时提示", () => {
    const nodes: Node[] = [];
    const validBuilder = createBuilder({ nodes, relKey: "R0001" });

    validBuilder.addRootNode();
    expect(nodes).toEqual([
      {
        id: "R0001",
        type: RelationType.risk,
        text: "risk:R0001",
        color: "",
      },
    ]);

    const missingBuilder = createBuilder({ nodes: [], relKey: "R9999-MISSING" });
    missingBuilder.addRootNode();
    expect(ElMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "unknownId",
        type: "warning",
      }),
    );
  });

  it("重建图数据时应该清空旧状态并按根节点重新生成", () => {
    const nodes: Node[] = [
      { id: "OLD", type: RelationType.risk, text: "旧节点", color: "" },
    ];
    const lines: Line[] = [
      { from: "OLD", to: "A01", text: "旧连线" },
    ];
    const selectedNetworkNodeId = ref("OLD");
    const renderNetworkChart = vi.fn();
    const builder = createBuilder({
      lines,
      nodes,
      relKey: "R0001",
      renderNetworkChart,
      selectedNetworkNodeId,
    });

    builder.draggedNodePositions.value = { OLD: { x: 1, y: 2 } };
    builder.totalLineType.value = ["old-line"];
    builder.rebuildGraphData();

    expect(selectedNetworkNodeId.value).toBe("R0001");
    expect(builder.draggedNodePositions.value).toEqual({});
    expect(nodes.map((item) => item.id)).toContain("R0001");
    expect(nodes.map((item) => item.id)).not.toContain("OLD");
    expect(lines).toEqual([]);
    expect(builderSpies.risk.addAvoidance).toHaveBeenCalledWith("R0001");
    expect(builderSpies.risk.addAttackTool).toHaveBeenCalledWith("R0001");
    expect(builderSpies.risk.addThreatActor).toHaveBeenCalledWith("R0001");
    expect(builderSpies.risk.addTerm).toHaveBeenCalledWith("R0001");
    expect(renderNetworkChart).toHaveBeenCalledTimes(1);
  });

  it("应该支持跳过图表渲染", () => {
    const renderNetworkChart = vi.fn();
    const builder = createBuilder({ renderNetworkChart });

    builder.genNetworkGraphData(
      RelationType.avoidance,
      RelationType.risk,
      "R0001",
      { render: false },
    );

    expect(builderSpies.risk.addAvoidance).toHaveBeenCalledWith("R0001");
    expect(renderNetworkChart).not.toHaveBeenCalled();
  });

  it("应该按请求类型分发风险节点关系构建", () => {
    const builder = createBuilder();

    builder.genNetworkGraphData(RelationType.attackTool, RelationType.risk, "R0001");
    builder.genNetworkGraphData(RelationType.threatActor, RelationType.risk, "R0001");
    builder.genNetworkGraphData(RelationType.term, RelationType.risk, "R0001");

    expect(builderSpies.risk.addAttackTool).toHaveBeenCalledWith("R0001");
    expect(builderSpies.risk.addThreatActor).toHaveBeenCalledWith("R0001");
    expect(builderSpies.risk.addTerm).toHaveBeenCalledWith("R0001");
  });

  it("应该按请求类型分发规避手段节点关系构建", () => {
    const builder = createBuilder();

    builder.genNetworkGraphData(RelationType.risk, RelationType.avoidance, "A0001");
    builder.genNetworkGraphData(RelationType.avoidance, RelationType.avoidance, "A0001");
    builder.genNetworkGraphData(RelationType.term, RelationType.avoidance, "A0001");
    builder.genNetworkGraphData(RelationType.all, RelationType.avoidance, "A0001");

    expect(builderSpies.avoidance.addRisk).toHaveBeenCalledWith("A0001");
    expect(builderSpies.avoidance.addRelatedAvoidance).toHaveBeenCalledWith("A0001");
    expect(builderSpies.avoidance.addSubavoidance).toHaveBeenCalledWith("A0001");
    expect(builderSpies.avoidance.addTerm).toHaveBeenCalledWith("A0001");
  });

  it("应该按请求类型分发攻击工具节点关系构建", () => {
    const builder = createBuilder();

    builder.genNetworkGraphData(RelationType.risk, RelationType.attackTool, "AT0001");
    builder.genNetworkGraphData(RelationType.avoidance, RelationType.attackTool, "AT0001");
    builder.genNetworkGraphData(RelationType.attackTool, RelationType.attackTool, "AT0001");
    builder.genNetworkGraphData(RelationType.threatActor, RelationType.attackTool, "AT0001");
    builder.genNetworkGraphData(RelationType.term, RelationType.attackTool, "AT0001");
    builder.genNetworkGraphData(RelationType.all, RelationType.attackTool, "AT0001");

    expect(builderSpies.attackTool.addRisk).toHaveBeenCalledWith("AT0001");
    expect(builderSpies.attackTool.addAvoidance).toHaveBeenCalledWith("AT0001");
    expect(builderSpies.attackTool.addRelatedAttackTool).toHaveBeenCalledWith("AT0001");
    expect(builderSpies.attackTool.addThreatActor).toHaveBeenCalledWith("AT0001");
    expect(builderSpies.attackTool.addSubattackTool).toHaveBeenCalledWith("AT0001");
    expect(builderSpies.attackTool.addTerm).toHaveBeenCalledWith("AT0001");
  });

  it("应该按请求类型分发威胁行为者节点关系构建", () => {
    const builder = createBuilder();

    builder.genNetworkGraphData(RelationType.risk, RelationType.threatActor, "TA0001");
    builder.genNetworkGraphData(RelationType.attackTool, RelationType.threatActor, "TA0001");
    builder.genNetworkGraphData(RelationType.threatActor, RelationType.threatActor, "TA0001");
    builder.genNetworkGraphData(RelationType.term, RelationType.threatActor, "TA0001");
    builder.genNetworkGraphData(RelationType.all, RelationType.threatActor, "TA0001");

    expect(builderSpies.threatActor.addRisk).toHaveBeenCalledWith("TA0001");
    expect(builderSpies.threatActor.addAttackTool).toHaveBeenCalledWith("TA0001");
    expect(builderSpies.threatActor.addRelatedThreatActor).toHaveBeenCalledWith("TA0001");
    expect(builderSpies.threatActor.addSubthreatActor).toHaveBeenCalledWith("TA0001");
    expect(builderSpies.threatActor.addTerm).toHaveBeenCalledWith("TA0001");
  });

  it("应该按请求类型分发术语节点关系构建", () => {
    const builder = createBuilder();

    builder.genNetworkGraphData(RelationType.all, RelationType.term, "T0001");
    builder.genNetworkGraphData(RelationType.risk, RelationType.term, "T0001");
    builder.genNetworkGraphData(RelationType.avoidance, RelationType.term, "T0001");
    builder.genNetworkGraphData(RelationType.attackTool, RelationType.term, "T0001");
    builder.genNetworkGraphData(RelationType.threatActor, RelationType.term, "T0001");

    expect(builderSpies.term.addRelatedEntities).toHaveBeenCalledTimes(5);
    expect(builderSpies.term.addRelatedEntities).toHaveBeenCalledWith("T0001");
  });
});
