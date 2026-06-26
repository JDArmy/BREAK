import { describe, expect, it, vi, afterEach } from "vitest";
import {
  openDetailNodeRouteInNewWindow,
  pushDetailNodeRoute,
  pushDetailNodeRouteWithAnchor,
  pushRelationNodeRoute,
} from "../relationNodeRouting";
import { RelationType } from "../relationTypes";

const createRouter = () => ({
  push: vi.fn(),
  resolve: vi.fn((route) => ({
    href: `/resolved/${String(route.name)}${
      route.query?.detailAnchor ? `?detailAnchor=${route.query.detailAnchor}` : ""
    }`,
  })),
});

describe("relationNodeRouting", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("pushes relation routes with entity type and key params", () => {
    const router = createRouter();

    // attack-tool 主角色视角为攻击路径
    pushRelationNodeRoute(router as never, RelationType.attackTool, "AT0001");

    expect(router.push).toHaveBeenCalledWith({
      name: "relationAttackPathEntity",
      params: {
        entity: RelationType.attackTool,
        id: "AT0001",
      },
    });
  });

  it("falls back to risk perspective for types without a perspective route", () => {
    const router = createRouter();

    // term 没有关系图视角路由，兜底到风险视角
    pushRelationNodeRoute(router as never, RelationType.term, "T0001");

    expect(router.push).toHaveBeenCalledWith({
      name: "relationRiskEntity",
      params: {
        entity: RelationType.term,
        id: "T0001",
      },
    });
  });

  it.each([
    [RelationType.risk, "R0001", "knowledgesRiskDetail", "rKey"],
    [RelationType.avoidance, "A0001", "knowledgesAvoidanceDetail", "aKey"],
    [RelationType.attackTool, "AT0001", "knowledgesAttackToolDetail", "atKey"],
    [RelationType.threatActor, "TA0001", "knowledgesThreatActorDetail", "taKey"],
    [RelationType.term, "T0001", "knowledgesTermDetail", "tKey"],
  ])("pushes detail routes for %s", (type, id, routeName, paramKey) => {
    const router = createRouter();

    pushDetailNodeRoute(router as never, type, id);

    expect(router.push).toHaveBeenCalledWith({
      name: routeName,
      params: { [paramKey]: id },
    });
  });

  it("falls back to risk detail route for unregistered entity types", () => {
    const router = createRouter();

    // "all" 不在 entityRegistry 中，兜底到 risk 的 detail 路由
    pushDetailNodeRoute(router as never, RelationType.all, "R0001");

    expect(router.push).toHaveBeenCalledWith({
      name: "knowledgesRiskDetail",
      params: { rKey: "R0001" },
    });
  });

  it("adds detail anchors without dropping the detail route", () => {
    const router = createRouter();

    pushDetailNodeRouteWithAnchor(router as never, RelationType.risk, "R0001", "avoidances");

    expect(router.push).toHaveBeenCalledWith({
      name: "knowledgesRiskDetail",
      params: { rKey: "R0001" },
      query: {
        detailAnchor: "avoidances",
      },
    });
  });

  it("opens resolved detail routes in a new noopener window", () => {
    const router = createRouter();
    const open = vi.spyOn(window, "open").mockImplementation(() => null);

    openDetailNodeRouteInNewWindow(router as never, RelationType.term, "T0001", "references");

    expect(router.resolve).toHaveBeenCalledWith({
      name: "knowledgesTermDetail",
      params: { tKey: "T0001" },
      query: {
        detailAnchor: "references",
      },
    });
    expect(open).toHaveBeenCalledWith(
      "/resolved/knowledgesTermDetail?detailAnchor=references",
      "_blank",
      "noopener"
    );
  });
});
