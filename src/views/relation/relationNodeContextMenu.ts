import { reactive, ref, type Ref } from "vue";
import type { DropdownInstance } from "element-plus";
import {
  RelationType,
  createRelationTypeMapping,
  type Node,
} from "@/views/relation/relationTypes";

interface CreateRelationNodeContextMenuOptions {
  networkPaneRef: Ref<HTMLDivElement | undefined>;
  dropdown1: Ref<DropdownInstance | undefined>;
  relKey: Ref<string>;
  RelationTypeMapping: ReturnType<typeof createRelationTypeMapping>;
}

export const createRelationNodeContextMenu = ({
  networkPaneRef,
  dropdown1,
  relKey,
  RelationTypeMapping,
}: CreateRelationNodeContextMenuOptions) => {
  const dropdownStyle = reactive({
    position: "absolute",
    zIndex: 65535,
    top: "0px",
    left: "0px",
    width: "0px",
    height: "0px",
    visibility: "hidden",
  });
  const disableContextMenuAll = ref(false);
  const disableContextMenuOpenAsRoot = ref(false);
  const nodeType = ref(RelationType.risk);
  const nodeId = ref("");

  const contextMenuSize = {
    width: 264,
    height: 396,
  };

  const closeContextMenu = () => {
    dropdown1.value?.handleClose?.();
    dropdownStyle.visibility = "hidden";
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

  const openContextMenuAtPointer = (event: MouseEvent) => {
    const pane = networkPaneRef.value;
    if (!pane) return;

    const rect = pane.getBoundingClientRect();
    applyContextMenuPosition(event.clientX - rect.left + 12, event.clientY - rect.top + 16);
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
      case RelationType.risk:
        RelationTypeMapping[RelationType.risk].disableContextMenu.value = true;
        RelationTypeMapping[RelationType.avoidance].disableContextMenu.value = false;
        RelationTypeMapping[RelationType.attackTool].disableContextMenu.value = false;
        RelationTypeMapping[RelationType.threatActor].disableContextMenu.value = false;
        RelationTypeMapping[RelationType.term].disableContextMenu.value = false;
        disableContextMenuAll.value = false;
        disableContextMenuOpenAsRoot.value = false;
        break;
      case RelationType.avoidance:
        RelationTypeMapping[RelationType.risk].disableContextMenu.value = false;
        RelationTypeMapping[RelationType.avoidance].disableContextMenu.value = true;
        RelationTypeMapping[RelationType.attackTool].disableContextMenu.value = true;
        RelationTypeMapping[RelationType.threatActor].disableContextMenu.value = true;
        RelationTypeMapping[RelationType.term].disableContextMenu.value = false;
        disableContextMenuAll.value = false;
        disableContextMenuOpenAsRoot.value = false;
        break;
      case RelationType.attackTool:
        RelationTypeMapping[RelationType.risk].disableContextMenu.value = false;
        RelationTypeMapping[RelationType.avoidance].disableContextMenu.value = false;
        RelationTypeMapping[RelationType.attackTool].disableContextMenu.value = true;
        RelationTypeMapping[RelationType.threatActor].disableContextMenu.value = false;
        RelationTypeMapping[RelationType.term].disableContextMenu.value = false;
        disableContextMenuAll.value = false;
        disableContextMenuOpenAsRoot.value = false;
        break;
      case RelationType.threatActor:
        RelationTypeMapping[RelationType.risk].disableContextMenu.value = false;
        RelationTypeMapping[RelationType.avoidance].disableContextMenu.value = true;
        RelationTypeMapping[RelationType.attackTool].disableContextMenu.value = false;
        RelationTypeMapping[RelationType.threatActor].disableContextMenu.value = true;
        RelationTypeMapping[RelationType.term].disableContextMenu.value = false;
        disableContextMenuAll.value = false;
        disableContextMenuOpenAsRoot.value = false;
        break;
      case RelationType.term:
        RelationTypeMapping[RelationType.risk].disableContextMenu.value = false;
        RelationTypeMapping[RelationType.avoidance].disableContextMenu.value = false;
        RelationTypeMapping[RelationType.attackTool].disableContextMenu.value = false;
        RelationTypeMapping[RelationType.threatActor].disableContextMenu.value = false;
        RelationTypeMapping[RelationType.term].disableContextMenu.value = true;
        disableContextMenuAll.value = false;
        disableContextMenuOpenAsRoot.value = false;
        break;
    }

    if (node.id === relKey.value) {
      disableContextMenuOpenAsRoot.value = true;
    }

    nodeType.value = node.type as RelationType;
    nodeId.value = node.id;
  };

  return {
    closeContextMenu,
    disableContextMenuAll,
    disableContextMenuOpenAsRoot,
    dropdownStyle,
    handleGlobalPointerDown,
    nodeId,
    nodeType,
    openContextMenuAtPointer,
    setContextAvailability,
  };
};
