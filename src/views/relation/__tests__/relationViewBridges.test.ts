import { describe, expect, it, vi } from "vitest";
import { toRaw } from "vue";
import {
  createNetworkInteractionsBridge,
  createRelationDropdownBinder,
  createRelationDropdownRef,
  createRenderNetworkChartBridge,
} from "../relationViewBridges";

describe("relationViewBridges", () => {
  it("creates no-op render and interaction bridges that can be replaced by view controllers", () => {
    const renderBridge = createRenderNetworkChartBridge();
    expect(() => renderBridge.current()).not.toThrow();

    const renderNetworkChart = vi.fn();
    renderBridge.current = renderNetworkChart;
    renderBridge.current(true);
    expect(renderNetworkChart).toHaveBeenCalledWith(true);

    const interactionsBridge = createNetworkInteractionsBridge<{ id: string }>();
    expect(() => interactionsBridge.handleNodeTouch({ id: "R0001" })).not.toThrow();
    expect(() => interactionsBridge.openNodeDetail({ id: "R0001" })).not.toThrow();
    expect(() => interactionsBridge.openRelationDetail({ source: "R0001" })).not.toThrow();

    const nodeClick = vi.fn();
    interactionsBridge.nodeClick = nodeClick;
    const event = new MouseEvent("click");
    interactionsBridge.nodeClick({ id: "R0001" }, event);
    expect(nodeClick).toHaveBeenCalledWith({ id: "R0001" }, event);
  });

  it("binds and clears relation dropdown instances through a shared ref", () => {
    const dropdownRef = createRelationDropdownRef();
    const bindDropdown = createRelationDropdownBinder(dropdownRef);
    const instance = { handleOpen: vi.fn() };

    bindDropdown(instance as never);
    expect(toRaw(dropdownRef.value)).toBe(instance);

    bindDropdown(undefined);
    expect(dropdownRef.value).toBeUndefined();
  });
});
