import { describe, it, expect } from "vitest";
import { ref } from "vue";
import { createRelationGraphBuilder } from "../relationGraphBuilder";
import { createRelationTypeMapping, RelationType, type GraphLink } from "../relationTypes";

describe("relationGraphBuilder", () => {
  const mockT = (key: string) => key;
  const mockRelationTypeMapping = createRelationTypeMapping(mockT, () => "#000");

  it("应该去重节点", () => {
    const nodes = [
      { id: "R01", name: "风险1", category: 0 },
      { id: "R01", name: "风险1", category: 0 },
      { id: "R02", name: "风险2", category: 0 },
    ];
    const lines: GraphLink[] = [];

    const builder = createRelationGraphBuilder({
      t: mockT,
      relType: ref(RelationType.risk),
      relKey: ref("R01"),
      nodes,
      lines,
      jsonData: { rootId: "R01" },
      selectedNetworkNodeId: ref(""),
      RelationTypeMapping: mockRelationTypeMapping,
      relationLegendItems: ref([]),
      getGraphNodeText: () => "",
      renderNetworkChart: () => {},
    });

    builder.uniqNodes();
    expect(nodes.length).toBe(2);
    expect(nodes.map(n => n.id)).toEqual(["R01", "R02"]);
  });

  it("应该去重连线", () => {
    const nodes: { id: string; name: string; category: number }[] = [];
    const lines = [
      { source: "R01", target: "A01", text: "规避" },
      { source: "R01", target: "A01", text: "规避" },
      { source: "R02", target: "A01", text: "规避" },
    ];

    const builder = createRelationGraphBuilder({
      t: mockT,
      relType: ref(RelationType.risk),
      relKey: ref("R01"),
      nodes,
      lines,
      jsonData: { rootId: "R01" },
      selectedNetworkNodeId: ref(""),
      RelationTypeMapping: mockRelationTypeMapping,
      relationLegendItems: ref([]),
      getGraphNodeText: () => "",
      renderNetworkChart: () => {},
    });

    builder.uniqLines();
    expect(lines.length).toBe(2);
  });

  it("应该提取所有连线类型", () => {
    const nodes: { id: string; name: string; category: number }[] = [];
    const lines = [
      { source: "R01", target: "A01", relationKey: "relationLine.avoidanceMeans", text: "规避手段" },
      { source: "R01", target: "AT01", relationKey: "relationLine.directCauseRisk", text: "攻击工具" },
      { source: "R02", target: "A01", relationKey: "relationLine.avoidanceMeans", text: "规避手段" },
    ];

    const builder = createRelationGraphBuilder({
      t: mockT,
      relType: ref(RelationType.risk),
      relKey: ref("R01"),
      nodes,
      lines,
      jsonData: { rootId: "R01" },
      selectedNetworkNodeId: ref(""),
      RelationTypeMapping: mockRelationTypeMapping,
      relationLegendItems: ref([]),
      getGraphNodeText: () => "",
      renderNetworkChart: () => {},
    });

    builder.getLineType();
    expect(builder.totalLineType.value).toEqual([
      "relationLine.avoidanceMeans",
      "relationLine.directCauseRisk",
    ]);
  });
});
