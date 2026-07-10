import { computed, type ComputedRef } from "vue";
import { buildBusinessDomainImpact } from "@/utils/businessDomainImpact";
import {
  RelationType,
  type Node,
  type NodeBusinessDomainImpactSummary,
  type RelationEntityType,
} from "@/views/relation/relationTypes";

type Translate = (key: string, params?: Record<string, unknown>) => string;

interface CreateRelationBusinessDomainImpactOptions {
  t: Translate;
  selectedNetworkNode: ComputedRef<Node | null>;
  getNodeTitle: (type: RelationEntityType, key: string) => string;
}

const toEntityType = (type: RelationEntityType) => {
  if (type === RelationType.attackTool) return "attackTool" as const;
  if (type === RelationType.threatActor) return "threatActor" as const;
  return type;
};

export const createRelationBusinessDomainImpact = ({
  t,
  selectedNetworkNode,
  getNodeTitle,
}: CreateRelationBusinessDomainImpactOptions) => {
  const selectedNodeBusinessDomainImpactSummary = computed<NodeBusinessDomainImpactSummary | null>(() => {
    const node = selectedNetworkNode.value;
    if (!node) return null;

    return buildBusinessDomainImpact({
      entityType: toEntityType(node.type),
      entityId: node.id,
      entityTitle: getNodeTitle(node.type, node.id),
      getRiskTitle: (riskId) => getNodeTitle(RelationType.risk, riskId),
      t,
    });
  });

  return { selectedNodeBusinessDomainImpactSummary };
};
