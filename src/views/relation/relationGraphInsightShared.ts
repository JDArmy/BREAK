import { isRelationEntityType, RelationType, type Line, type Node } from "@/views/relation/relationTypes";

type Translate = (key: string, params?: Record<string, unknown>) => string;

export interface RelationGraphInsightBaseOptions {
  t: Translate;
  nodes: Node[];
  lines: Line[];
  getNodeTitle: (type: Exclude<RelationType, RelationType.all>, key: string) => string;
  getNodeTypeTitle: (type: string) => string;
  getRelationPriority: (lineText: string) => number;
  isDirectRelationLine: (lineText: string) => boolean;
  getRelationSourceFields: (line: Line) => string[];
}

export const createRelationGraphInsightHelpers = ({
  t,
  nodes,
  getNodeTitle,
  getNodeTypeTitle,
  getRelationPriority,
  isDirectRelationLine,
  getRelationSourceFields,
}: RelationGraphInsightBaseOptions) => {
  const findNodeById = (id: string) => nodes.find((node) => node.id === id);

  const buildRelationSummary = (line: Line, nodeId: string) => {
    const otherNodeId = line.from === nodeId ? line.to : line.from;
    const otherNode = findNodeById(otherNodeId);
    return {
      relationKey: `${line.from}::${line.text}::${line.to}`,
      direction: line.from === nodeId ? t("relationView.outgoing") : t("relationView.incoming"),
      text: line.text,
      priority: getRelationPriority(line.text),
      directness: isDirectRelationLine(line.text) ? t("relationView.direct") : t("relationView.indirect"),
      otherNodeId,
      otherNodeType: otherNode ? getNodeTypeTitle(otherNode.type) : "",
      otherNodeTitle:
        otherNode && isRelationEntityType(otherNode.type) ? getNodeTitle(otherNode.type, otherNode.id) : "",
      sourceFields: getRelationSourceFields(line),
    };
  };

  const buildNodeSummary = (nodeId: string) => {
    const node = findNodeById(nodeId);
    return {
      id: nodeId,
      rawType: node?.type ?? "",
      isSubNode: Boolean(node?.data?.isSubNode),
      type: node ? getNodeTypeTitle(node.type) : "",
      title: node && isRelationEntityType(node.type) ? getNodeTitle(node.type, node.id) : "",
    };
  };

  return {
    buildNodeSummary,
    buildRelationSummary,
    findNodeById,
  };
};
