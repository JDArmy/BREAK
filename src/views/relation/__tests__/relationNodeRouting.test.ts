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
    href: `/resolved/${String(route.name)}${route.hash ?? ""}${
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

    pushRelationNodeRoute(router as never, RelationType.attackTool, "AT0001");

    expect(router.push).toHaveBeenCalledWith({
      name: "relation",
      params: {
        type: RelationType.attackTool,
        key: "AT0001",
      },
    });
  });

  it.each([
    [RelationType.risk, "R0001", "risks"],
    [RelationType.avoidance, "A0001", "avoidances"],
    [RelationType.attackTool, "AT0001", "attackTools"],
    [RelationType.threatActor, "TA0001", "threatActors"],
    [RelationType.term, "T0001", "terms"],
  ])("pushes detail routes for %s", (type, id, routeName) => {
    const router = createRouter();

    pushDetailNodeRoute(router as never, type, id);

    expect(router.push).toHaveBeenCalledWith({
      name: routeName,
      hash: `#${id}`,
    });
  });

  it("adds detail anchors without dropping the detail hash route", () => {
    const router = createRouter();

    pushDetailNodeRouteWithAnchor(router as never, RelationType.risk, "R0001", "avoidances");

    expect(router.push).toHaveBeenCalledWith({
      name: "risks",
      hash: "#R0001",
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
      name: "terms",
      hash: "#T0001",
      query: {
        detailAnchor: "references",
      },
    });
    expect(open).toHaveBeenCalledWith(
      "/resolved/terms#T0001?detailAnchor=references",
      "_blank",
      "noopener"
    );
  });
});
