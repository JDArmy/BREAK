import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computed, ref } from "vue";
import { useRelationNodeActions } from "../useRelationNodeActions";
import { createRelationTypeMapping, RelationType, type Node } from "../relationTypes";

const {
  ElMessage,
  closeContextMenu,
  copyContextNodeCsv,
  copySelectedNodeCsv,
  createCopyContextNodeCsv,
  createRelationNodeContextMenu,
  handleGlobalPointerDown,
  openContextMenuAtPointer,
  openDetailNodeRouteInNewWindow,
  pushDetailNodeRoute,
  pushRelationNodeRoute,
  setContextAvailability,
} = vi.hoisted(() => ({
  ElMessage: vi.fn(),
  closeContextMenu: vi.fn(),
  copyContextNodeCsv: vi.fn(),
  copySelectedNodeCsv: vi.fn(),
  createCopyContextNodeCsv: vi.fn(),
  createRelationNodeContextMenu: vi.fn(),
  handleGlobalPointerDown: vi.fn(),
  openContextMenuAtPointer: vi.fn(),
  openDetailNodeRouteInNewWindow: vi.fn(),
  pushDetailNodeRoute: vi.fn(),
  pushRelationNodeRoute: vi.fn(),
  setContextAvailability: vi.fn(),
}));

vi.mock("element-plus", () => ({
  ElMessage,
}));

vi.mock("@/views/relation/relationNodeClipboard", () => ({
  createCopyContextNodeCsv,
}));

vi.mock("@/views/relation/relationNodeContextMenu", () => ({
  createRelationNodeContextMenu,
}));

vi.mock("@/views/relation/relationNodeRouting", () => ({
  openDetailNodeRouteInNewWindow,
  pushDetailNodeRoute,
  pushRelationNodeRoute,
}));

const nodes: Record<string, Node> = {
  R0001: {
    id: "R0001",
    type: RelationType.risk,
    text: "R0001\n风险",
    color: "#ef4444",
  },
  A0001: {
    id: "A0001",
    type: RelationType.avoidance,
    text: "A0001\n规避手段",
    color: "#22c55e",
  },
};

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const createActions = (options?: {
  lines?: unknown[];
  selectedNodeId?: string;
}) => {
  const dropdown1 = ref({ handleOpen: vi.fn() });
  const relKey = ref("R0001");
  const relType = ref(RelationType.risk);
  const selectedNetworkNodeId = ref(options?.selectedNodeId ?? "A0001");
  const selectedNetworkNode = computed(() => nodes[selectedNetworkNodeId.value] ?? null);
  const contextMenuState = {
    closeContextMenu,
    disableContextMenuAll: ref(false),
    disableContextMenuOpenAsRoot: ref(false),
    dropdownStyle: { visibility: "hidden" },
    handleGlobalPointerDown,
    nodeId: ref("A0001"),
    nodeType: ref(RelationType.avoidance),
    openContextMenuAtPointer,
    setContextAvailability,
  };
  createRelationNodeContextMenu.mockReturnValue(contextMenuState);
  createCopyContextNodeCsv
    .mockReturnValueOnce(copyContextNodeCsv)
    .mockReturnValueOnce(copySelectedNodeCsv);

  const router = {
    push: vi.fn(),
    resolve: vi.fn(() => ({ href: "/detail" })),
  };
  const genNetworkGraphData = vi.fn();
  const renderNetworkChart = vi.fn();
  const ensureRelationNode = vi.fn((type, id) => ({
    id,
    type,
    text: id,
    color: "#64748b",
  }));
  const findNodeById = vi.fn((id: string) => nodes[id]);
  const actions = useRelationNodeActions({
    t: (key) => `t:${key}`,
    router: router as never,
    contextMenuPaneRef: ref(document.createElement("div")),
    dropdown1: dropdown1 as never,
    relKey,
    relType,
    lines: (options?.lines ?? []) as never,
    selectedNetworkNode,
    selectedNetworkNodeId,
    RelationTypeMapping: createRelationTypeMapping(
      (key) => `t:${key}`,
      (type) => `color:${type}`,
    ),
    ensureRelationNode,
    findNodeById,
    buildNodeSummary: vi.fn((id: string) => ({
      id,
      isSubNode: false,
      title: `标题 ${id}`,
      type: nodes[id]?.type ?? RelationType.risk,
    })),
    isDirectRelationLine: vi.fn(() => true),
    getRelationSourceFields: vi.fn(() => ["Risk.avoidances"]),
    genNetworkGraphData,
    renderNetworkChart,
  });

  return {
    actions,
    contextMenuState,
    dropdown1,
    ensureRelationNode,
    findNodeById,
    genNetworkGraphData,
    relKey,
    relType,
    renderNetworkChart,
    router,
    selectedNetworkNodeId,
  };
};

describe("useRelationNodeActions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    copyContextNodeCsv.mockResolvedValue({ ok: true, message: "复制成功" });
    copySelectedNodeCsv.mockResolvedValue({ ok: true, message: "复制成功" });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("opens context menu, prepares missing nodes, and supports touch actions", () => {
    const { actions, dropdown1, ensureRelationNode, genNetworkGraphData, selectedNetworkNodeId } =
      createActions();
    const event = new MouseEvent("click");

    actions.nodeClick(nodes.A0001, event);
    expect(openContextMenuAtPointer).toHaveBeenCalledWith(event);
    expect(dropdown1.value?.handleOpen).toHaveBeenCalled();
    expect(setContextAvailability).toHaveBeenCalledWith(nodes.A0001);

    const prepared = actions.prepareNodeActions(RelationType.attackTool, "AT0001");
    expect(genNetworkGraphData).toHaveBeenCalledWith(
      RelationType.all,
      RelationType.risk,
      "R0001",
      { render: false },
    );
    expect(ensureRelationNode).toHaveBeenCalledWith(RelationType.attackTool, "AT0001");
    expect(prepared.id).toBe("AT0001");
    expect(selectedNetworkNodeId.value).toBe("AT0001");
    expect(setContextAvailability).toHaveBeenLastCalledWith(prepared);

    actions.handleNodeTouch(nodes.A0001);
    expect(actions.touchActionVisible.value).toBe(true);
    actions.touchActionClose();
    expect(actions.touchActionVisible.value).toBe(false);
  });

  it("runs context menu commands and relation/detail routing", () => {
    const { actions, genNetworkGraphData, router } = createActions({
      lines: [{ from: "R0001", to: "A0001", text: "规避" }],
    });

    actions.clickContextMenu(RelationType.risk);
    expect(genNetworkGraphData).toHaveBeenCalledWith(
      RelationType.risk,
      RelationType.avoidance,
      "A0001",
    );
    expect(actions.touchActionVisible.value).toBe(false);

    actions.gotoNewRelationView();
    expect(pushRelationNodeRoute).toHaveBeenCalledWith(
      router,
      RelationType.avoidance,
      "A0001",
    );

    actions.gotoItemDetailView();
    expect(pushDetailNodeRoute).toHaveBeenCalledWith(
      router,
      RelationType.avoidance,
      "A0001",
    );
  });

  it("opens selected and id based node targets while guarding missing or root nodes", () => {
    const { actions, relKey, router, selectedNetworkNodeId } = createActions();

    actions.openSelectedNodeAsRoot();
    expect(pushRelationNodeRoute).toHaveBeenCalledWith(
      router,
      RelationType.avoidance,
      "A0001",
    );

    actions.gotoSelectedNodeDetailView();
    expect(pushDetailNodeRoute).toHaveBeenCalledWith(
      router,
      RelationType.avoidance,
      "A0001",
    );

    actions.openSelectedNodeDetailInNewWindow();
    expect(openDetailNodeRouteInNewWindow).toHaveBeenCalledWith(
      router,
      RelationType.avoidance,
      "A0001",
    );

    actions.openNodeAsRootById("A0001");
    expect(pushRelationNodeRoute).toHaveBeenCalledTimes(2);

    actions.gotoNodeDetailViewById("A0001");
    expect(openDetailNodeRouteInNewWindow).toHaveBeenCalledTimes(2);

    selectedNetworkNodeId.value = relKey.value;
    actions.openSelectedNodeAsRoot();
    actions.openNodeAsRootById("R0001");
    expect(pushRelationNodeRoute).toHaveBeenCalledTimes(2);

    selectedNetworkNodeId.value = "UNKNOWN";
    actions.gotoSelectedNodeDetailView();
    actions.openSelectedNodeDetailInNewWindow();
    actions.openNodeAsRootById("UNKNOWN");
    actions.gotoNodeDetailViewById("UNKNOWN");
    expect(pushDetailNodeRoute).toHaveBeenCalledTimes(1);
    expect(openDetailNodeRouteInNewWindow).toHaveBeenCalledTimes(2);
  });

  it("opens non-neighbor nodes (not in local graph) as root / detail via type inference", () => {
    const { actions } = createActions();
    pushRelationNodeRoute.mockClear();
    openDetailNodeRouteInNewWindow.mockClear();

    // AT0097 不在局部 nodes 中（如路径探索里的全局节点），但仍应通过 ID 前缀推断类型生效
    actions.openNodeAsRootById("AT0097");
    expect(pushRelationNodeRoute).toHaveBeenCalledWith(
      expect.anything(),
      RelationType.attackTool,
      "AT0097",
    );

    actions.gotoNodeDetailViewById("TA0061");
    expect(openDetailNodeRouteInNewWindow).toHaveBeenCalledWith(
      expect.anything(),
      RelationType.threatActor,
      "TA0061",
    );
  });

  it("opens drawers, toggles filters, and renders filter changes", async () => {
    const { actions, renderNetworkChart, selectedNetworkNodeId } = createActions();
    const drawerBody = document.createElement("div");
    drawerBody.className = "el-drawer__body";
    const drawer = document.createElement("div");
    drawer.className = "relation-drawer";
    drawer.append(drawerBody);
    document.body.append(drawer);

    actions.focusNodeInDrawer("A0001");
    await flushPromises();
    expect(selectedNetworkNodeId.value).toBe("A0001");
    expect(actions.nodeDetailDrawerVisible.value).toBe(true);
    expect(drawerBody.scrollTop).toBe(0);

    actions.openContextNodeDetailDrawer();
    expect(closeContextMenu).toHaveBeenCalled();
    expect(actions.nodeDetailDrawerVisible.value).toBe(true);

    actions.openTouchNodeDetailDrawer();
    expect(actions.touchActionVisible.value).toBe(false);

    actions.toggleNodeFilter();
    actions.toggleLineFilter();
    expect(actions.nodeFilterVisible.value).toBe(false);
    expect(actions.lineFilterVisible.value).toBe(false);

    actions.doFilter();
    expect(renderNetworkChart).toHaveBeenCalledWith(true);
    drawer.remove();
  });

  it("opens the drawer for valid entity ids that are not loaded in the current graph", () => {
    const { actions, ensureRelationNode, selectedNetworkNodeId } = createActions({
      selectedNodeId: "",
    });

    actions.focusNodeInDrawer("AT0001");
    expect(ensureRelationNode).toHaveBeenCalledWith(
      RelationType.attackTool,
      "AT0001",
    );
    expect(selectedNetworkNodeId.value).toBe("AT0001");
    expect(actions.nodeDetailDrawerVisible.value).toBe(true);

    actions.nodeDetailDrawerVisible.value = false;
    actions.focusNodeInDrawer("UNKNOWN");
    expect(selectedNetworkNodeId.value).toBe("AT0001");
    expect(actions.nodeDetailDrawerVisible.value).toBe(false);
  });

  it("shows feedback for context and drawer copy results", async () => {
    const { actions } = createActions();

    await actions.copyContextNodeCsv();
    expect(closeContextMenu).toHaveBeenCalled();
    expect(actions.touchActionVisible.value).toBe(false);
    expect(ElMessage).toHaveBeenCalledWith(
      expect.objectContaining({ message: "复制成功", type: "success" }),
    );

    copyContextNodeCsv.mockResolvedValueOnce({ ok: false, message: "复制失败" });
    await actions.copyContextNodeCsv();
    expect(ElMessage).toHaveBeenCalledWith(
      expect.objectContaining({ message: "复制失败", type: "error" }),
    );

    await actions.copySelectedNodeCsv();
    expect(actions.drawerCopyFeedbackType.value).toBe("success");
    expect(actions.drawerCopyFeedbackMessage.value).toBe("复制成功");

    copySelectedNodeCsv.mockResolvedValueOnce({ ok: false, message: "复制失败" });
    await actions.copySelectedNodeCsv();
    expect(actions.drawerCopyFeedbackType.value).toBe("error");
    expect(actions.drawerCopyFeedbackMessage.value).toBe("复制失败");

    vi.advanceTimersByTime(2200);
    expect(actions.drawerCopyFeedbackMessage.value).toBe("");
  });
});
