import type { DropdownInstance } from "element-plus";
import type { Ref } from "vue";
import { createRelationTypeMapping, RelationType, type Line, type Node } from "@/views/relation/relationTypes";

export type Translate = (key: string, params?: Record<string, unknown>) => string;

export interface NodeSummary {
  id: string;
  type: string;
  title: string;
  isSubNode: boolean;
}

export interface RelationNodeActionBaseOptions {
  t: Translate;
  relKey: Ref<string>;
  lines: Line[];
  RelationTypeMapping: ReturnType<typeof createRelationTypeMapping>;
  findNodeById: (id: string) => Node | undefined;
  buildNodeSummary: (nodeId: string) => NodeSummary;
  isDirectRelationLine: (lineText: string) => boolean;
  getRelationSourceFields: (line: Line) => string[];
}

export interface RelationNodeContextState {
  dropdown1: Ref<DropdownInstance | undefined>;
  disableContextMenuAll: Ref<boolean>;
  disableContextMenuOpenAsRoot: Ref<boolean>;
  nodeType: Ref<RelationType>;
  nodeId: Ref<string>;
}
