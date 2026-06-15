import { nextTick, reactive, ref, type ComputedRef, type Ref } from "vue";
import { ElMessage } from "element-plus";
import type { DropdownInstance } from "element-plus";
import type { Router } from "vue-router";
import { RelationType, type Line, type Node, isRelationEntityType, createRelationTypeMapping } from "@/views/relation/relationTypes";

type Translate = (key: string, params?: Record<string, unknown>) => string;

interface NodeSummary {
  id: string;
  type: string;
  title: string;
  isSubNode: boolean;
}

interface UseRelationNodeActionsOptions {
  t: Translate;
  router: Router;
  networkPaneRef: Ref<HTMLDivElement | undefined>;
  dropdown1: Ref<DropdownInstance | undefined>;
  relKey: Ref<string>;
  lines: Line[];
  selectedNetworkNode: ComputedRef<Node | null>;
  selectedNetworkNodeId: Ref<string>;
  RelationTypeMapping: ReturnType<typeof createRelationTypeMapping>;
  findNodeById: (id: string) => Node | undefined;
  buildNodeSummary: (nodeId: string) => NodeSummary;
  isDirectRelationLine: (lineText: string) => boolean;
  getRelationSourceFields: (line: Line) => string[];
  genNetworkGraphData: (reqType: RelationType, currentNodeType: RelationType, currentNodeId: string) => void;
  renderNetworkChart: (notMerge?: boolean) => void;
}

export const useRelationNodeActions = ({
  t,
  router,
  networkPaneRef,
  dropdown1,
  relKey,
  lines,
  selectedNetworkNode,
  selectedNetworkNodeId,
  RelationTypeMapping,
  findNodeById,
  buildNodeSummary,
  isDirectRelationLine,
  getRelationSourceFields,
  genNetworkGraphData,
  renderNetworkChart,
}: UseRelationNodeActionsOptions) => {
  const dropdownStyle = reactive({
    position: "absolute",
    zIndex: 65535,
    top: "0px",
    left: "0px",
    width: "0px",
    height: "0px",
    visibility: "hidden",
  });

  const contextMenuSize = {
    width: 264,
    height: 396,
  };

  const disableContextMenuAll = ref(false);
  const disableContextMenuOpenAsRoot = ref(false);
  const nodeType = ref("" as RelationType);
  const nodeId = ref("" as string);
  const touchActionVisible = ref(false);
  const nodeDetailDrawerVisible = ref(false);
  const nodeFilterVisible = ref(true);
  const lineFilterVisible = ref(true);

  const closeContextMenu = () => {
    dropdown1.value?.handleClose?.();
    dropdownStyle.visibility = "hidden";
  };

  const touchActionClose = () => {
    touchActionVisible.value = false;
  };

  const toCsvCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, "\"\"")}"`;

  const copyContextNodeCsv = async () => {
    const node = findNodeById(nodeId.value);
    if (!node) {
      ElMessage.error(t("relationView.copyFailed"));
      return;
    }

    const centerNode = buildNodeSummary(node.id);
    const relationLines = lines.filter((line) => line.from === node.id || line.to === node.id);
    const relatedNodes = new Map<string, NodeSummary>();
    relatedNodes.set(centerNode.id, centerNode);

    const relationRows = relationLines.map((line) => {
      const sourceNode = buildNodeSummary(line.from);
      const targetNode = buildNodeSummary(line.to);
      relatedNodes.set(sourceNode.id, sourceNode);
      relatedNodes.set(targetNode.id, targetNode);
      return [
        sourceNode.id,
        sourceNode.type,
        sourceNode.title,
        line.text,
        isDirectRelationLine(line.text) ? t("relationView.direct") : t("relationView.indirect"),
        targetNode.id,
        targetNode.type,
        targetNode.title,
        getRelationSourceFields(line).join(" | "),
      ];
    });

    const nodeRows = [...relatedNodes.values()]
      .sort((a, b) => (a.id === centerNode.id ? -1 : b.id === centerNode.id ? 1 : a.id.localeCompare(b.id)))
      .map((item) => [
        item.id,
        item.type,
        item.title,
        item.id === centerNode.id ? t("relationView.csvRoleRoot") : t("relationView.csvRoleRelated"),
        item.isSubNode ? t("relationView.csvYes") : t("relationView.csvNo"),
      ]);

    const csvSections = [
      t("relationView.csvNodes"),
      [
        t("relationView.csvHeaderId"),
        t("relationView.csvHeaderType"),
        t("relationView.csvHeaderTitle"),
        t("relationView.csvHeaderRole"),
        t("relationView.csvHeaderIsSubNode"),
      ].map(toCsvCell).join(","),
      ...nodeRows.map((row) => row.map(toCsvCell).join(",")),
      "",
      t("relationView.csvRelations"),
      [
        t("relationView.csvHeaderSourceId"),
        t("relationView.csvHeaderSourceType"),
        t("relationView.csvHeaderSourceTitle"),
        t("relationView.csvHeaderRelation"),
        t("relationView.csvHeaderDirectness"),
        t("relationView.csvHeaderTargetId"),
        t("relationView.csvHeaderTargetType"),
        t("relationView.csvHeaderTargetTitle"),
        t("relationView.csvHeaderSourceFields"),
      ].map(toCsvCell).join(","),
      ...relationRows.map((row) => row.map(toCsvCell).join(",")),
    ];

    try {
      await navigator.clipboard.writeText(csvSections.join("\n"));
      closeContextMenu();
      touchActionClose();
      ElMessage.success(t("relationView.copySuccess"));
    } catch {
      ElMessage.error(t("relationView.copyFailed"));
    }
  };

  const applyContextMenuPosition = (rawLeft: number, rawTop: number) => {
    const pane = networkPaneRef.value;
    if (!pane) return;

    const rect = pane.getBoundingClientRect();
    const maxLeft = Math.max(8, rect.width - contextMenuSize.width - 8);
    const maxTop = Math.max(8, rect.height - contextMenuSize.height - 8);

    dropdownStyle.left = `${Math.min(Math.max(8, rawLeft), maxLeft)}px`;
    dropdownStyle.top = `${Math.min(Math.max(8, rawTop), maxTop)}px`;
    dropdownStyle.visibility = "visible";
  };

  const openContextMenuAtPointer = (e: MouseEvent) => {
    const pane = networkPaneRef.value;
    if (!pane) return;

    const rect = pane.getBoundingClientRect();
    applyContextMenuPosition(e.clientX - rect.left + 12, e.clientY - rect.top + 16);
  };

  const handleGlobalPointerDown = (event: PointerEvent) => {
    if (dropdownStyle.visibility === "hidden") return;

    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      closeContextMenu();
      return;
    }

    if (target.closest(".el-dropdown-menu") || target.closest(".el-popper")) return;
    closeContextMenu();
  };

  const setContextAvailability = (node: Node) => {
    switch (node.type) {
      case RelationType.risk: {
        RelationTypeMapping[RelationType.risk].disableContextMenu.value = true;
        RelationTypeMapping[RelationType.avoidance].disableContextMenu.value = false;
        RelationTypeMapping[RelationType.attackTool].disableContextMenu.value = false;
        RelationTypeMapping[RelationType.threatActor].disableContextMenu.value = false;
        disableContextMenuAll.value = false;
        disableContextMenuOpenAsRoot.value = false;
        break;
      }
      case RelationType.avoidance: {
        RelationTypeMapping[RelationType.risk].disableContextMenu.value = false;
        RelationTypeMapping[RelationType.avoidance].disableContextMenu.value = true;
        RelationTypeMapping[RelationType.attackTool].disableContextMenu.value = true;
        RelationTypeMapping[RelationType.threatActor].disableContextMenu.value = true;
        disableContextMenuAll.value = false;
        disableContextMenuOpenAsRoot.value = false;
        break;
      }
      case RelationType.attackTool: {
        RelationTypeMapping[RelationType.risk].disableContextMenu.value = false;
        RelationTypeMapping[RelationType.avoidance].disableContextMenu.value = false;
        RelationTypeMapping[RelationType.attackTool].disableContextMenu.value = true;
        RelationTypeMapping[RelationType.threatActor].disableContextMenu.value = false;
        disableContextMenuAll.value = false;
        disableContextMenuOpenAsRoot.value = false;
        break;
      }
      case RelationType.threatActor: {
        RelationTypeMapping[RelationType.risk].disableContextMenu.value = false;
        RelationTypeMapping[RelationType.avoidance].disableContextMenu.value = true;
        RelationTypeMapping[RelationType.attackTool].disableContextMenu.value = false;
        RelationTypeMapping[RelationType.threatActor].disableContextMenu.value = true;
        disableContextMenuAll.value = false;
        disableContextMenuOpenAsRoot.value = false;
        break;
      }
    }

    if (node.id == relKey.value) {
      disableContextMenuOpenAsRoot.value = true;
    }

    nodeType.value = node.type as RelationType;
    nodeId.value = node.id;
  };

  const nodeClick = (node: Node, e: MouseEvent) => {
    openContextMenuAtPointer(e);
    dropdown1.value?.handleOpen();
    setContextAvailability(node);
  };

  const scrollDrawerToTop = () => {
    nextTick(() => {
      const drawerBody = document.querySelector(".relation-drawer .el-drawer__body");
      if (drawerBody instanceof HTMLElement) {
        drawerBody.scrollTop = 0;
      }
    });
  };

  const focusNodeInDrawer = (nodeId: string) => {
    if (!findNodeById(nodeId)) return;
    selectedNetworkNodeId.value = nodeId;
    nodeDetailDrawerVisible.value = true;
    scrollDrawerToTop();
  };

  const openContextNodeDetailDrawer = () => {
    closeContextMenu();
    focusNodeInDrawer(nodeId.value);
  };

  const handleNodeTouch = (node: Node) => {
    setContextAvailability(node);
    touchActionVisible.value = true;
  };

  const clickContextMenu = (reqType: RelationType) => {
    genNetworkGraphData(reqType, nodeType.value, nodeId.value);
    touchActionVisible.value = false;
  };

  const gotoNewRelationView = () => {
    touchActionVisible.value = false;
    router.push({
      name: "relation",
      params: {
        type: nodeType.value,
        key: nodeId.value,
      },
    });
  };

  const gotoItemDetailView = () => {
    touchActionVisible.value = false;
    let routeName = "";
    switch (nodeType.value) {
      case RelationType.risk: {
        routeName = "riskDetail";
        router.push({
          name: routeName,
          params: {
            rKey: nodeId.value,
          },
        });
        return;
      }
      case RelationType.avoidance: {
        routeName = "avoidances";
        break;
      }
      case RelationType.attackTool: {
        routeName = "attackTools";
        break;
      }
      case RelationType.threatActor: {
        routeName = "threatActors";
        break;
      }
    }
    router.push({
      name: routeName,
      hash: `#${nodeId.value}`,
    });
  };

  const openTouchNodeDetailDrawer = () => {
    touchActionClose();
    focusNodeInDrawer(nodeId.value);
  };

  const openSelectedNodeAsRoot = () => {
    const node = selectedNetworkNode.value;
    if (!node || !isRelationEntityType(node.type) || node.id === relKey.value) return;
    router.push({
      name: "relation",
      params: {
        type: node.type,
        key: node.id,
      },
    });
  };

  const gotoSelectedNodeDetailView = () => {
    const node = selectedNetworkNode.value;
    if (!node || !isRelationEntityType(node.type)) return;

    switch (node.type) {
      case RelationType.risk:
        router.push({
          name: "riskDetail",
          params: {
            rKey: node.id,
          },
        });
        return;
      case RelationType.avoidance:
        router.push({
          name: "avoidances",
          hash: `#${node.id}`,
        });
        return;
      case RelationType.attackTool:
        router.push({
          name: "attackTools",
          hash: `#${node.id}`,
        });
        return;
      case RelationType.threatActor:
        router.push({
          name: "threatActors",
          hash: `#${node.id}`,
        });
        return;
    }
  };

  const openNodeAsRootById = (nodeId: string) => {
    const node = findNodeById(nodeId);
    if (!node || !isRelationEntityType(node.type) || node.id === relKey.value) return;
    router.push({
      name: "relation",
      params: {
        type: node.type,
        key: node.id,
      },
    });
  };

  const toggleNodeFilter = () => {
    nodeFilterVisible.value = !nodeFilterVisible.value;
  };

  const toggleLineFilter = () => {
    lineFilterVisible.value = !lineFilterVisible.value;
  };

  const openNodeDetailDrawer = () => {
    nodeDetailDrawerVisible.value = true;
  };

  const doFilter = () => {
    renderNetworkChart(true);
  };

  return {
    clickContextMenu,
    closeContextMenu,
    copyContextNodeCsv,
    disableContextMenuAll,
    disableContextMenuOpenAsRoot,
    doFilter,
    dropdownStyle,
    focusNodeInDrawer,
    gotoItemDetailView,
    gotoNewRelationView,
    gotoSelectedNodeDetailView,
    handleGlobalPointerDown,
    handleNodeTouch,
    lineFilterVisible,
    nodeClick,
    nodeDetailDrawerVisible,
    nodeFilterVisible,
    openContextNodeDetailDrawer,
    openNodeAsRootById,
    openNodeDetailDrawer,
    openSelectedNodeAsRoot,
    openTouchNodeDetailDrawer,
    toggleLineFilter,
    toggleNodeFilter,
    touchActionClose,
    touchActionVisible,
  };
};
