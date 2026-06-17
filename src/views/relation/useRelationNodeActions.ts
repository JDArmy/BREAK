import { nextTick, ref, type ComputedRef, type Ref } from "vue";
import { ElMessage } from "element-plus";
import type { DropdownInstance } from "element-plus";
import type { Router } from "vue-router";
import { createCopyContextNodeCsv } from "@/views/relation/relationNodeClipboard";
import { createRelationNodeContextMenu } from "@/views/relation/relationNodeContextMenu";
import {
  openDetailNodeRouteInNewWindow,
  pushDetailNodeRoute,
  pushRelationNodeRoute,
} from "@/views/relation/relationNodeRouting";
import {
  type NodeSummary,
  type Translate,
} from "@/views/relation/relationNodeActionShared";
import {
  RelationType,
  type Line,
  type Node,
  isRelationEntityType,
  createRelationTypeMapping,
} from "@/views/relation/relationTypes";

interface UseRelationNodeActionsOptions {
  t: Translate;
  router: Router;
  contextMenuPaneRef: Ref<HTMLDivElement | undefined>;
  dropdown1: Ref<DropdownInstance | undefined>;
  relKey: Ref<string>;
  relType: Ref<RelationType>;
  lines: Line[];
  selectedNetworkNode: ComputedRef<Node | null>;
  selectedNetworkNodeId: Ref<string>;
  RelationTypeMapping: ReturnType<typeof createRelationTypeMapping>;
  ensureRelationNode: (
    type: Exclude<RelationType, RelationType.all>,
    key: string
  ) => Node;
  findNodeById: (id: string) => Node | undefined;
  buildNodeSummary: (nodeId: string) => NodeSummary;
  isDirectRelationLine: (lineText: string) => boolean;
  getRelationSourceFields: (line: Line) => string[];
  genNetworkGraphData: (
    reqType: RelationType,
    currentNodeType: RelationType,
    currentNodeId: string,
    options?: { render?: boolean }
  ) => void;
  renderNetworkChart: (notMerge?: boolean) => void;
}

export const useRelationNodeActions = ({
  t,
  router,
  contextMenuPaneRef,
  dropdown1,
  relKey,
  relType,
  lines,
  selectedNetworkNode,
  selectedNetworkNodeId,
  RelationTypeMapping,
  ensureRelationNode,
  findNodeById,
  buildNodeSummary,
  isDirectRelationLine,
  getRelationSourceFields,
  genNetworkGraphData,
  renderNetworkChart,
}: UseRelationNodeActionsOptions) => {
  const {
    closeContextMenu,
    disableContextMenuAll,
    disableContextMenuOpenAsRoot,
    dropdownStyle,
    handleGlobalPointerDown,
    nodeId,
    nodeType,
    openContextMenuAtPointer,
    setContextAvailability,
  } = createRelationNodeContextMenu({
    contextMenuPaneRef,
    dropdown1,
    relKey,
    RelationTypeMapping,
  });
  const touchActionVisible = ref(false);
  const nodeDetailDrawerVisible = ref(false);
  const nodeFilterVisible = ref(true);
  const lineFilterVisible = ref(true);
  const drawerCopyFeedbackMessage = ref("");
  const drawerCopyFeedbackType = ref<"success" | "error">("success");
  let drawerCopyFeedbackTimer: ReturnType<typeof setTimeout> | undefined;

  const showCopyMessage = (message: string, type: "success" | "error") => {
    ElMessage({
      message,
      type,
      plain: true,
      duration: type === "success" ? 1400 : 2200,
      grouping: true,
    });
  };

  const touchActionClose = () => {
    touchActionVisible.value = false;
  };
  const copyContextNodeCsv = createCopyContextNodeCsv({
    t,
    relKey,
    lines,
    RelationTypeMapping,
    findNodeById,
    buildNodeSummary,
    isDirectRelationLine,
    getRelationSourceFields,
    getContextNodeId: () => nodeId.value,
  });
  const copySelectedNodeCsv = createCopyContextNodeCsv({
    t,
    relKey,
    lines,
    RelationTypeMapping,
    findNodeById,
    buildNodeSummary,
    isDirectRelationLine,
    getRelationSourceFields,
    getContextNodeId: () => selectedNetworkNodeId.value,
  });

  const nodeClick = (node: Node, e: MouseEvent) => {
    openContextMenuAtPointer(e);
    dropdown1.value?.handleOpen();
    setContextAvailability(node);
  };

  const prepareNodeActions = (
    type: Exclude<RelationType, RelationType.all>,
    id: string
  ) => {
    const hasCurrentRootRelations = lines.length > 0;
    if (!hasCurrentRootRelations) {
      genNetworkGraphData(RelationType.all, relType.value, relKey.value, {
        render: false,
      });
    }
    const node = findNodeById(id) ?? ensureRelationNode(type, id);
    selectedNetworkNodeId.value = id;
    setContextAvailability(node);
    return node;
  };

  const scrollDrawerToTop = () => {
    nextTick(() => {
      const drawerBody = document.querySelector(
        ".relation-drawer .el-drawer__body"
      );
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
    pushRelationNodeRoute(router, nodeType.value, nodeId.value);
  };

  const gotoItemDetailView = () => {
    touchActionVisible.value = false;
    pushDetailNodeRoute(router, nodeType.value, nodeId.value);
  };

  const openTouchNodeDetailDrawer = () => {
    touchActionClose();
    focusNodeInDrawer(nodeId.value);
  };

  const handleCopyResult = (result: { ok: boolean; message: string }) => {
    if (result.ok) {
      showCopyMessage(result.message, "success");
    } else {
      showCopyMessage(result.message, "error");
    }
  };

  const copyContextNodeCsvWithFeedback = async () => {
    const result = await copyContextNodeCsv();
    if (result.ok) {
      closeContextMenu();
      touchActionClose();
    }
    handleCopyResult(result);
  };

  const copySelectedNodeCsvWithFeedback = async () => {
    const result = await copySelectedNodeCsv();
    drawerCopyFeedbackType.value = result.ok ? "success" : "error";
    drawerCopyFeedbackMessage.value = result.message;
    if (drawerCopyFeedbackTimer) {
      clearTimeout(drawerCopyFeedbackTimer);
    }
    drawerCopyFeedbackTimer = setTimeout(
      () => {
        drawerCopyFeedbackMessage.value = "";
      },
      result.ok ? 1500 : 2200
    );
    return result;
  };

  const openSelectedNodeAsRoot = () => {
    const node = selectedNetworkNode.value;
    if (!node || !isRelationEntityType(node.type) || node.id === relKey.value)
      return;
    pushRelationNodeRoute(router, node.type, node.id);
  };

  const gotoSelectedNodeDetailView = () => {
    const node = selectedNetworkNode.value;
    if (!node || !isRelationEntityType(node.type)) return;
    pushDetailNodeRoute(router, node.type, node.id);
  };

  const openSelectedNodeDetailInNewWindow = () => {
    const node = selectedNetworkNode.value;
    if (!node || !isRelationEntityType(node.type)) return;
    openDetailNodeRouteInNewWindow(router, node.type, node.id);
  };

  const openNodeAsRootById = (nodeId: string) => {
    const node = findNodeById(nodeId);
    if (!node || !isRelationEntityType(node.type) || node.id === relKey.value)
      return;
    pushRelationNodeRoute(router, node.type, node.id);
  };

  const gotoNodeDetailViewById = (nodeId: string) => {
    const node = findNodeById(nodeId);
    if (!node || !isRelationEntityType(node.type)) return;
    openDetailNodeRouteInNewWindow(router, node.type, node.id);
  };

  const toggleNodeFilter = () => {
    nodeFilterVisible.value = !nodeFilterVisible.value;
  };

  const toggleLineFilter = () => {
    lineFilterVisible.value = !lineFilterVisible.value;
  };

  const openNodeDetailDrawer = () => {
    focusNodeInDrawer(selectedNetworkNodeId.value);
  };

  const doFilter = () => {
    renderNetworkChart(true);
  };

  return {
    clickContextMenu,
    closeContextMenu,
    copyContextNodeCsv: copyContextNodeCsvWithFeedback,
    copySelectedNodeCsv: copySelectedNodeCsvWithFeedback,
    drawerCopyFeedbackMessage,
    drawerCopyFeedbackType,
    disableContextMenuAll,
    disableContextMenuOpenAsRoot,
    doFilter,
    dropdownStyle,
    focusNodeInDrawer,
    gotoItemDetailView,
    gotoNodeDetailViewById,
    gotoNewRelationView,
    openSelectedNodeDetailInNewWindow,
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
    prepareNodeActions,
    toggleLineFilter,
    toggleNodeFilter,
    touchActionClose,
    touchActionVisible,
  };
};
