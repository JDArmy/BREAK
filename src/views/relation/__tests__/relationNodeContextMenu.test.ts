import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { createRelationNodeContextMenu } from "../relationNodeContextMenu";
import {
  createRelationTypeMapping,
  RelationType,
  type Node,
  type RelationEntityType,
} from "../relationTypes";

const createMenu = () => {
  const pane = document.createElement("div");
  pane.getBoundingClientRect = vi.fn(() => ({
    bottom: 500,
    height: 500,
    left: 100,
    right: 700,
    top: 50,
    width: 600,
    x: 100,
    y: 50,
    toJSON: () => ({}),
  }));
  const dropdown = {
    handleClose: vi.fn(),
  };
  const mapping = createRelationTypeMapping(
    (key) => `t:${key}`,
    (type: RelationEntityType) => `color:${type}`,
  );
  const menu = createRelationNodeContextMenu({
    contextMenuPaneRef: ref(pane),
    dropdown1: ref(dropdown) as never,
    relKey: ref("R0001"),
    RelationTypeMapping: mapping,
  });

  return { dropdown, mapping, menu, pane };
};

const node = (id: string, type: RelationEntityType): Node => ({
  id,
  type,
  text: id,
  color: "#64748b",
});

describe("relationNodeContextMenu", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("positions menu relative to the relation pane and clamps to pane bounds", () => {
    const { menu } = createMenu();

    menu.openContextMenuAtPointer(new MouseEvent("contextmenu", {
      clientX: 680,
      clientY: 480,
    }));

    expect(menu.dropdownStyle.visibility).toBe("visible");
    expect(menu.dropdownStyle.left).toBe("328px");
    expect(menu.dropdownStyle.top).toBe("96px");
  });

  it("closes visible menu on outside pointerdown but keeps it open inside dropdown poppers", () => {
    const { dropdown, menu } = createMenu();
    const outside = document.createElement("button");
    const popper = document.createElement("div");
    popper.className = "el-popper";
    document.body.append(outside, popper);

    menu.openContextMenuAtPointer(new MouseEvent("contextmenu", {
      clientX: 120,
      clientY: 80,
    }));
    menu.handleGlobalPointerDown(new PointerEvent("pointerdown", { bubbles: true }));
    expect(dropdown.handleClose).toHaveBeenCalledTimes(1);
    expect(menu.dropdownStyle.visibility).toBe("hidden");

    menu.openContextMenuAtPointer(new MouseEvent("contextmenu", {
      clientX: 120,
      clientY: 80,
    }));
    popper.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    menu.handleGlobalPointerDown(new PointerEvent("pointerdown", {
      bubbles: true,
    }));
    expect(dropdown.handleClose).toHaveBeenCalledTimes(2);
  });

  it("updates context availability by node type and disables opening the current root as root", () => {
    const { mapping, menu } = createMenu();

    menu.setContextAvailability(node("R0002", RelationType.risk));
    expect(menu.nodeType.value).toBe(RelationType.risk);
    expect(menu.nodeId.value).toBe("R0002");
    expect(mapping[RelationType.risk].disableContextMenu.value).toBe(true);
    expect(mapping[RelationType.avoidance].disableContextMenu.value).toBe(false);
    expect(menu.disableContextMenuOpenAsRoot.value).toBe(false);

    menu.setContextAvailability(node("A0001", RelationType.avoidance));
    expect(mapping[RelationType.risk].disableContextMenu.value).toBe(false);
    expect(mapping[RelationType.avoidance].disableContextMenu.value).toBe(true);
    expect(mapping[RelationType.attackTool].disableContextMenu.value).toBe(true);
    expect(mapping[RelationType.threatActor].disableContextMenu.value).toBe(true);
    expect(mapping[RelationType.term].disableContextMenu.value).toBe(false);

    menu.setContextAvailability(node("AT0001", RelationType.attackTool));
    expect(mapping[RelationType.attackTool].disableContextMenu.value).toBe(true);
    expect(mapping[RelationType.threatActor].disableContextMenu.value).toBe(false);

    menu.setContextAvailability(node("TA0001", RelationType.threatActor));
    expect(mapping[RelationType.avoidance].disableContextMenu.value).toBe(true);
    expect(mapping[RelationType.threatActor].disableContextMenu.value).toBe(true);

    menu.setContextAvailability(node("T0001", RelationType.term));
    expect(mapping[RelationType.term].disableContextMenu.value).toBe(true);

    menu.setContextAvailability(node("R0001", RelationType.risk));
    expect(menu.disableContextMenuOpenAsRoot.value).toBe(true);
  });

  it("ignores pointer positioning and close requests when no pane or menu is hidden", () => {
    const dropdown = { handleClose: vi.fn() };
    const menu = createRelationNodeContextMenu({
      contextMenuPaneRef: ref(undefined),
      dropdown1: ref(dropdown) as never,
      relKey: ref("R0001"),
      RelationTypeMapping: createRelationTypeMapping(
        (key) => `t:${key}`,
        (type: RelationEntityType) => `color:${type}`,
      ),
    });

    menu.openContextMenuAtPointer(new MouseEvent("contextmenu"));
    expect(menu.dropdownStyle.visibility).toBe("hidden");
    menu.handleGlobalPointerDown(new PointerEvent("pointerdown"));
    expect(dropdown.handleClose).not.toHaveBeenCalled();
  });
});
