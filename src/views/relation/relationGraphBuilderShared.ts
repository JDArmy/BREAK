import {
  createRelationTypeMapping,
  type Line,
  type Node,
  type RelationEntityType,
} from "@/views/relation/relationTypes";

export type Translate = (
  key: string,
  params?: Record<string, unknown>,
) => string;

export interface RelationGraphBuilderContext {
  t: Translate;
  nodes: Node[];
  lines: Line[];
  RelationTypeMapping: ReturnType<typeof createRelationTypeMapping>;
  getGraphNodeText: (type: RelationEntityType, key: string) => string;
}

export const addRelationNode = (
  context: RelationGraphBuilderContext,
  type: RelationEntityType,
  id: string,
  options?: { isSubNode?: boolean; isRelatedEntity?: boolean },
) => {
  context.nodes.push({
    id,
    type,
    text: context.getGraphNodeText(type, id),
    color: "",
    data:
      options?.isSubNode || options?.isRelatedEntity
        ? {
            ...(options?.isSubNode ? { isSubNode: true } : {}),
            ...(options?.isRelatedEntity ? { isRelatedEntity: true } : {}),
          }
        : undefined,
  } as Node);
};

export const addRelationLine = (
  context: RelationGraphBuilderContext,
  from: string,
  relationKey: string,
  to: string,
) => {
  context.lines.push({
    from,
    relationKey,
    text: context.t(relationKey),
    to,
  } as Line);
};
