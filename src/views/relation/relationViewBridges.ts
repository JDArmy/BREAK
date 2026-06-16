import { ref } from "vue";
import type { DropdownInstance } from "element-plus";

export const createRenderNetworkChartBridge = () => ({
  current: () => {},
});

export const createNetworkInteractionsBridge = <TContextNode>() => ({
  handleNodeTouch: (() => {}) as (node: TContextNode) => void,
  openNodeDetail: (() => {}) as (node: TContextNode) => void,
  nodeClick: (() => {}) as (node: TContextNode, event: MouseEvent) => void,
});

export const createRelationDropdownRef = () => ref<DropdownInstance>();

export const createRelationDropdownBinder = (dropdownRef: ReturnType<typeof createRelationDropdownRef>) => (
  instance: DropdownInstance | undefined
) => {
  dropdownRef.value = instance;
};
