import { describe, expect, it } from "vitest";
import {
  arrayEquals,
  buildPerspectiveQuery,
  deserializeArray,
  deserializeLineTypes,
  ENTITY_ROUTE_BY_PERSPECTIVE,
  PERSPECTIVE_ROUTE_NAME,
  serializeArray,
  serializeLineTypes,
  VIEW_TO_PERSPECTIVE,
} from "../relationRouteQuery";

describe("relationRouteQuery", () => {
  it("按目标视角白名单过滤 query", () => {
    expect(
      buildPerspectiveQuery(
        {
          nodeTypes: "risk,avoidance",
          lineTypes: "riskAvoidance",
          layout: "force",
          endType: "risk",
          endKey: "R0001",
          extra: "drop",
        },
        "risk",
      ),
    ).toEqual({
      nodeTypes: "risk,avoidance",
      lineTypes: "riskAvoidance",
      layout: "force",
    });

    expect(
      buildPerspectiveQuery(
        {
          nodeTypes: "risk",
          endType: "avoidance",
          endKey: "A0001",
          maxDepth: "3",
          maxPaths: "5",
          unrelated: "drop",
        },
        "pathExplorer",
      ),
    ).toEqual({
      endType: "avoidance",
      endKey: "A0001",
      maxDepth: "3",
      maxPaths: "5",
    });
  });

  it("序列化和比较数组 query", () => {
    expect(serializeArray(["risk", "avoidance"])).toBe("risk,avoidance");
    expect(deserializeArray("risk,,avoidance,")).toEqual(["risk", "avoidance"]);
    expect(deserializeArray("")).toEqual([]);
    expect(arrayEquals(["avoidance", "risk"], ["risk", "avoidance"])).toBe(true);
    expect(arrayEquals(["risk"], ["risk", "avoidance"])).toBe(false);
    expect(arrayEquals(["risk", "term"], ["risk", "avoidance"])).toBe(false);
  });

  it("序列化和反序列化 lineType 前缀", () => {
    expect(serializeLineTypes(["relationLine.riskAvoidance", "custom"])).toBe("riskAvoidance,custom");
    expect(deserializeLineTypes("riskAvoidance,relationLine.attackToolRisk,,")).toEqual([
      "relationLine.riskAvoidance",
      "relationLine.attackToolRisk",
    ]);
    expect(deserializeLineTypes("")).toEqual([]);
  });

  it("导出路由映射和视图映射", () => {
    expect(ENTITY_ROUTE_BY_PERSPECTIVE.risk).toBe("relationRiskEntity");
    expect(PERSPECTIVE_ROUTE_NAME.pathExplorer).toBe("relationPathExplorer");
    expect(VIEW_TO_PERSPECTIVE).toEqual({
      network: "risk",
      sankey: "attackPath",
      analysis: "defenseCoverage",
      pathExplorer: "pathExplorer",
    });
  });
});
