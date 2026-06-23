import { computed, type ComputedRef, type Ref } from "vue";
import {
  createRelationTypeMapping,
  RelationType,
  type AttackPath,
  type RelationEntityType,
  type SankeyLink,
  type SankeyNode,
} from "@/views/relation/relationTypes";

type BuildAttackPaths = () => AttackPath[];

type SankeyNodeNameGetter = (type: RelationEntityType, key: string) => string;

interface CreateRelationAttackPathSankeyOptions {
  buildAttackPaths: BuildAttackPaths;
  getSankeyNodeName: SankeyNodeNameGetter;
  isMobile: ComputedRef<boolean> | Ref<boolean>;
  RelationTypeMapping: ReturnType<typeof createRelationTypeMapping>;
}

const createEmptySankeyData = ({
  getSankeyNodeName,
  RelationTypeMapping,
}: Pick<
  CreateRelationAttackPathSankeyOptions,
  "getSankeyNodeName" | "RelationTypeMapping"
>) => {
  const nodeMap = new Map<string, SankeyNode>();
  const linkMap = new Map<string, SankeyLink>();

  const addNode = (type: RelationEntityType, key: string, depth: number) => {
    const nodeKey = `${type}:${key}`;
    const existingNode = nodeMap.get(nodeKey);
    if (existingNode) {
      return existingNode.name;
    }

    const name = getSankeyNodeName(type, key);
    nodeMap.set(nodeKey, {
      name,
      depth,
      entityType: type,
      entityKey: key,
      itemStyle: {
        color: RelationTypeMapping[type].color,
      },
    });
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

  const addPath = (path: AttackPath) => {
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
  };

  return {
    addPath,
    toData: () => ({
      nodes: [...nodeMap.values()],
      links: [...linkMap.values()],
    }),
  };
};

export const createRelationAttackPathSankey = ({
  buildAttackPaths,
  getSankeyNodeName,
  isMobile,
  RelationTypeMapping,
}: CreateRelationAttackPathSankeyOptions) => {
  const sankeyData = computed(() => {
    const sankey = createEmptySankeyData({
      getSankeyNodeName,
      RelationTypeMapping,
    });
    buildAttackPaths().forEach(sankey.addPath);
    return sankey.toData();
  });

  const sankeyChartHeight = computed(() => {
    const nodesByDepth = sankeyData.value.nodes.reduce<Record<number, number>>(
      (acc, node) => {
        const depth = node.depth ?? 0;
        acc[depth] = (acc[depth] ?? 0) + 1;
        return acc;
      },
      {},
    );
    const maxLayerNodeCount = Math.max(1, ...Object.values(nodesByDepth));

    if (isMobile.value) {
      return Math.min(Math.max(620, maxLayerNodeCount * 34 + 140), 5200);
    }

    return Math.min(Math.max(520, maxLayerNodeCount * 24 + 96), 3200);
  });

  return {
    sankeyChartHeight,
    sankeyData,
  };
};
