import {
  createRelationTypeMapping,
  type Line,
  type Node,
  type RelationType,
} from "@/views/relation/relationTypes";

export type Translate = (key: string, params?: Record<string, unknown>) => string;

export interface RelationGraphBuilderContext {
  t: Translate;
  nodes: Node[];
  lines: Line[];
  RelationTypeMapping: ReturnType<typeof createRelationTypeMapping>;
  getGraphNodeText: (type: Exclude<RelationType, RelationType.all>, key: string) => string;
}

export const addRelationNode = (
  context: RelationGraphBuilderContext,
  type: Exclude<RelationType, RelationType.all>,
  id: string,
  options?: { isSubNode?: boolean }
) => {
  context.nodes.push({
    id,
    type,
    text: context.getGraphNodeText(type, id),
    color: "",
    data: options?.isSubNode ? { isSubNode: true } : undefined,
  } as Node);
};

export const addRelationLine = (
  context: RelationGraphBuilderContext,
  from: string,
  relationKey: string,
  to: string
) => {
  context.lines.push({
    from,
    text: context.t(relationKey),
    to,
  } as Line);
};
