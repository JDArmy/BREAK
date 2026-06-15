import { computed, type ComputedRef, type Ref } from "vue";
import BREAK from "@/BREAK";
import {
  createRelationTypeMapping,
  isRelationEntityType,
  type AttackPath,
  type Node,
  type RelationType,
} from "@/views/relation/relationTypes";

type Translate = (key: string, params?: Record<string, unknown>) => string;

interface CreateRelationAttackPathOptions {
  t: Translate;
  relType: Ref<RelationType>;
  relKey: Ref<string>;
  selectedNetworkNode: ComputedRef<Node | null>;
  RelationTypeMapping: ReturnType<typeof createRelationTypeMapping>;
  getSankeyNodeName: (type: Exclude<RelationType, RelationType.all>, key: string) => string;
}

export const createRelationAttackPathData = ({
  t,
  relType,
  relKey,
  selectedNetworkNode,
  RelationTypeMapping,
  getSankeyNodeName,
}: CreateRelationAttackPathOptions) => {
  const describeAttackPathRole = (nodeType: Exclude<RelationType, RelationType.all>) => {
    switch (nodeType) {
      case RelationType.threatActor:
        return t("relationView.pathRoleThreatActorDesc");
      case RelationType.attackTool:
        return t("relationView.pathRoleAttackToolDesc");
      case RelationType.risk:
        return t("relationView.pathRoleRiskDesc");
      case RelationType.avoidance:
        return t("relationView.pathRoleAvoidanceDesc");
    }
  };

  const matchesSelectedEntity = (path: AttackPath) => {
    switch (relType.value) {
      case RelationType.threatActor:
        return path.threatActorKey === relKey.value;
      case RelationType.attackTool:
        return path.attackToolKey === relKey.value;
      case RelationType.risk:
        return path.riskKey === relKey.value;
      case RelationType.avoidance:
        return path.avoidanceKey === relKey.value;
      default:
        return true;
    }
  };

  const getAttackToolRiskKeys = (attackToolKey: string) => {
    const attackTool = BREAK.attackTools[attackToolKey as keyof typeof BREAK.attackTools];
    return [...new Set([...attackTool.directCauseRisks, ...attackTool.indirectSupportRisks])];
  };

  const getThreatActorRiskKeys = (threatActorKey: string) => {
    const threatActor = BREAK.threatActors[threatActorKey as keyof typeof BREAK.threatActors];
    return [...new Set([...threatActor.directCauseRisks, ...threatActor.indirectSupportRisks])];
  };

  const getThreatActorAttackToolKeys = (threatActorKey: string) => {
    const threatActor = BREAK.threatActors[threatActorKey as keyof typeof BREAK.threatActors];
    return [...new Set([...threatActor.buildAttackTools, ...threatActor.useAttackTools])];
  };

  const buildAttackPaths = () => {
    const paths: AttackPath[] = [];

    Object.keys(BREAK.risks).forEach((riskKey) => {
      const risk = BREAK.risks[riskKey as keyof typeof BREAK.risks];
      const riskAvoidances = risk.avoidances.length > 0 ? risk.avoidances : [undefined];

      const relatedAttackToolKeys = Object.keys(BREAK.attackTools).filter((attackToolKey) =>
        getAttackToolRiskKeys(attackToolKey).includes(riskKey)
      );
      const relatedThreatActorKeys = Object.keys(BREAK.threatActors).filter((threatActorKey) =>
        getThreatActorRiskKeys(threatActorKey).includes(riskKey)
      );

      relatedAttackToolKeys.forEach((attackToolKey) => {
        const toolThreatActorKeys = Object.keys(BREAK.threatActors).filter((threatActorKey) =>
          getThreatActorAttackToolKeys(threatActorKey).includes(attackToolKey)
        );
        const threatActorKeys = toolThreatActorKeys.length > 0 ? toolThreatActorKeys : relatedThreatActorKeys;

        if (threatActorKeys.length > 0) {
          threatActorKeys.forEach((threatActorKey) => {
            riskAvoidances.forEach((avoidanceKey) => {
              paths.push({ threatActorKey, attackToolKey, riskKey, avoidanceKey });
            });
          });
        } else {
          riskAvoidances.forEach((avoidanceKey) => {
            paths.push({ attackToolKey, riskKey, avoidanceKey });
          });
        }
      });

      if (relatedAttackToolKeys.length === 0) {
        relatedThreatActorKeys.forEach((threatActorKey) => {
          riskAvoidances.forEach((avoidanceKey) => {
            paths.push({ threatActorKey, riskKey, avoidanceKey });
          });
        });
      }
    });

    return paths.filter(matchesSelectedEntity);
  };

  const selectedNodeAttackPathSummary = computed(() => {
    const node = selectedNetworkNode.value;
    if (!node || !isRelationEntityType(node.type)) return [];

    const matchingPaths = buildAttackPaths().filter((path) => {
      if (node.type === RelationType.threatActor) return path.threatActorKey === node.id;
      if (node.type === RelationType.attackTool) return path.attackToolKey === node.id;
      if (node.type === RelationType.risk) return path.riskKey === node.id;
      if (node.type === RelationType.avoidance) return path.avoidanceKey === node.id;
      return false;
    });

    const roleSet = new Set<string>();
    if (matchingPaths.some((path) => path.threatActorKey === node.id)) roleSet.add(t("relationView.pathRoleThreatActor"));
    if (matchingPaths.some((path) => path.attackToolKey === node.id)) roleSet.add(t("relationView.pathRoleAttackTool"));
    if (matchingPaths.some((path) => path.riskKey === node.id)) roleSet.add(t("relationView.pathRoleRisk"));
    if (matchingPaths.some((path) => path.avoidanceKey === node.id)) roleSet.add(t("relationView.pathRoleAvoidance"));

    return [...roleSet];
  });

  const selectedNodeAttackPathDescription = computed(() => {
    const node = selectedNetworkNode.value;
    if (!node || !isRelationEntityType(node.type)) return "";
    return describeAttackPathRole(node.type);
  });

  const sankeyData = computed(() => {
    const nodeMap = new Map<string, {
      name: string;
      depth?: number;
      entityType: Exclude<RelationType, RelationType.all>;
      entityKey: string;
      itemStyle: { color: string };
    }>();
    const linkMap = new Map<string, { source: string; target: string; value: number }>();
    const paths = buildAttackPaths();

    const addNode = (type: Exclude<RelationType, RelationType.all>, key: string, depth: number) => {
      const name = getSankeyNodeName(type, key);
      if (!nodeMap.has(name)) {
        nodeMap.set(name, {
          name,
          depth,
          entityType: type,
          entityKey: key,
          itemStyle: {
            color: RelationTypeMapping[type].color,
          },
        });
      }
      return name;
    };

    const addLink = (source: string, target: string) => {
      const linkKey = `${source}->${target}`;
      const existing = linkMap.get(linkKey);
      if (existing) {
        existing.value += 1;
      } else {
        linkMap.set(linkKey, { source, target, value: 1 });
      }
    };

    paths.forEach((path) => {
      const pathNodes: string[] = [];
      if (path.threatActorKey) {
        pathNodes.push(addNode(RelationType.threatActor, path.threatActorKey, 0));
      }
      if (path.attackToolKey) {
        pathNodes.push(addNode(RelationType.attackTool, path.attackToolKey, 1));
      }
      pathNodes.push(addNode(RelationType.risk, path.riskKey, 2));
      if (path.avoidanceKey) {
        pathNodes.push(addNode(RelationType.avoidance, path.avoidanceKey, 3));
      }

      pathNodes.forEach((nodeName, index) => {
        const nextNodeName = pathNodes[index + 1];
        if (nextNodeName) {
          addLink(nodeName, nextNodeName);
        }
      });
    });

    return {
      nodes: [...nodeMap.values()],
      links: [...linkMap.values()],
    };
  });

  const sankeyChartHeight = computed(() => {
    const nodesByDepth = sankeyData.value.nodes.reduce<Record<number, number>>((acc, node) => {
      const depth = node.depth ?? 0;
      acc[depth] = (acc[depth] ?? 0) + 1;
      return acc;
    }, {});
    const maxLayerNodeCount = Math.max(1, ...Object.values(nodesByDepth));

    return Math.min(Math.max(520, maxLayerNodeCount * 24 + 96), 3200);
  });

  return {
    sankeyChartHeight,
    sankeyData,
    selectedNodeAttackPathDescription,
    selectedNodeAttackPathSummary,
  };
};
