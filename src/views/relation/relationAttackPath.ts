import { computed, type ComputedRef, type Ref } from "vue";
import BREAK from "@/BREAK";
import {
  createRelationTypeMapping,
  isRelationEntityType,
  RelationType,
  type AttackPath,
  type AttackPathExplanation,
  type Node,
} from "@/views/relation/relationTypes";

type Translate = (key: string, params?: Record<string, unknown>) => string;

interface CreateRelationAttackPathOptions {
  t: Translate;
  isMobile?: Ref<boolean>;
  relType: Ref<RelationType>;
  relKey: Ref<string>;
  selectedNetworkNode: ComputedRef<Node | null>;
  RelationTypeMapping: ReturnType<typeof createRelationTypeMapping>;
  getSankeyNodeName: (type: Exclude<RelationType, RelationType.all>, key: string) => string;
}

export const createRelationAttackPathData = ({
  t,
  isMobile,
  relType,
  relKey,
  selectedNetworkNode,
  RelationTypeMapping,
  getSankeyNodeName,
}: CreateRelationAttackPathOptions) => {
  const isMobileView = () => isMobile?.value === true;

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
      case RelationType.term:
        return "";
    }
  };

  const buildPathKey = (path: AttackPath) =>
    [
      path.threatActorKey ? `${RelationType.threatActor}:${path.threatActorKey}` : "",
      path.attackToolKey ? `${RelationType.attackTool}:${path.attackToolKey}` : "",
      `${RelationType.risk}:${path.riskKey}`,
      path.avoidanceKey ? `${RelationType.avoidance}:${path.avoidanceKey}` : "",
    ]
      .filter(Boolean)
      .join("->");

  const buildPathGroupKey = (path: AttackPath) =>
    [
      path.attackToolKey ? `${RelationType.attackTool}:${path.attackToolKey}` : "no-tool",
      `${RelationType.risk}:${path.riskKey}`,
      path.avoidanceKey ? `${RelationType.avoidance}:${path.avoidanceKey}` : "no-avoidance",
    ].join("->");

  const hasPathNode = (path: AttackPath, node: Node) => {
    if (node.type === RelationType.threatActor) return path.threatActorKey === node.id;
    if (node.type === RelationType.attackTool) return path.attackToolKey === node.id;
    if (node.type === RelationType.risk) return path.riskKey === node.id;
    if (node.type === RelationType.avoidance) return path.avoidanceKey === node.id;
    return false;
  };

  const getToolRiskFields = (attackToolKey: string, riskKey: string) => {
    const attackTool = BREAK.attackTools[attackToolKey as keyof typeof BREAK.attackTools];
    const fields: string[] = [];
    if (attackTool.directCauseRisks.includes(riskKey)) fields.push("AttackTool.directCauseRisks");
    if (attackTool.indirectSupportRisks.includes(riskKey)) fields.push("AttackTool.indirectSupportRisks");
    return fields;
  };

  const getThreatActorToolFields = (threatActorKey: string, attackToolKey: string) => {
    const threatActor = BREAK.threatActors[threatActorKey as keyof typeof BREAK.threatActors];
    const fields: string[] = [];
    if (threatActor.useAttackTools.includes(attackToolKey)) fields.push("ThreatActor.useAttackTools");
    if (threatActor.buildAttackTools.includes(attackToolKey)) fields.push("ThreatActor.buildAttackTools");
    return fields;
  };

  const getThreatActorRiskFields = (threatActorKey: string, riskKey: string) => {
    const threatActor = BREAK.threatActors[threatActorKey as keyof typeof BREAK.threatActors];
    const fields: string[] = [];
    if (threatActor.directCauseRisks.includes(riskKey)) fields.push("ThreatActor.directCauseRisks");
    if (threatActor.indirectSupportRisks.includes(riskKey)) fields.push("ThreatActor.indirectSupportRisks");
    return fields;
  };

  const explainAttackPath = (path: AttackPath, groupedPaths: AttackPath[] = [path]): AttackPathExplanation => {
    const steps: AttackPathExplanation["steps"] = [];
    const qualityFlags: string[] = [];
    const defensiveFocus: string[] = [];
    const threatActorIds = [...new Set(groupedPaths.map((item) => item.threatActorKey).filter(Boolean) as string[])];

    if (path.threatActorKey && path.attackToolKey) {
      const sourceFields = [
        ...new Set(threatActorIds.flatMap((threatActorKey) => getThreatActorToolFields(threatActorKey, path.attackToolKey as string))),
      ];
      steps.push({
        fromId: threatActorIds.length > 1 ? t("relationView.groupedThreatActors", { count: threatActorIds.length }) : path.threatActorKey,
        toId: path.attackToolKey,
        relationType: sourceFields.includes("ThreatActor.buildAttackTools")
          ? t("relationLine.buildAttackTool")
          : t("relationLine.useAttackTool"),
        sourceFields,
        attackIntent: t("relationView.attackPathIntent.actorToTool"),
        defensiveMeaning: t("relationView.attackPathDefense.actorToTool"),
      });
      if (sourceFields.length === 0) qualityFlags.push(t("relationView.qualityFlagMissingSource"));
    }

    if (path.attackToolKey) {
      const sourceFields = getToolRiskFields(path.attackToolKey, path.riskKey);
      steps.push({
        fromId: path.attackToolKey,
        toId: path.riskKey,
        relationType: sourceFields.includes("AttackTool.directCauseRisks")
          ? t("relationLine.directCauseRisk")
          : t("relationLine.indirectSupportRisk"),
        sourceFields,
        attackIntent: t("relationView.attackPathIntent.toolToRisk"),
        defensiveMeaning: t("relationView.attackPathDefense.toolToRisk"),
      });
      if (sourceFields.length === 0) qualityFlags.push(t("relationView.qualityFlagMissingSource"));
    } else if (path.threatActorKey) {
      const sourceFields = getThreatActorRiskFields(path.threatActorKey, path.riskKey);
      steps.push({
        fromId: path.threatActorKey,
        toId: path.riskKey,
        relationType: sourceFields.includes("ThreatActor.directCauseRisks")
          ? t("relationLine.directCauseRisk")
          : t("relationLine.indirectSupportRisk"),
        sourceFields,
        attackIntent: t("relationView.attackPathIntent.actorToRisk"),
        defensiveMeaning: t("relationView.attackPathDefense.actorToRisk"),
      });
      if (sourceFields.length === 0) qualityFlags.push(t("relationView.qualityFlagMissingSource"));
    }

    if (path.avoidanceKey) {
      steps.push({
        fromId: path.riskKey,
        toId: path.avoidanceKey,
        relationType: t("relationLine.avoidanceMeans"),
        sourceFields: ["Risk.avoidances"],
        attackIntent: t("relationView.attackPathIntent.riskToAvoidance"),
        defensiveMeaning: t("relationView.attackPathDefense.riskToAvoidance"),
      });
      defensiveFocus.push(path.avoidanceKey);
    } else {
      qualityFlags.push(t("relationView.qualityFlagMissingAvoidance"));
    }

    return {
      pathKey: buildPathGroupKey(path),
      pathCount: groupedPaths.length,
      threatActorIds,
      threatActorId: path.threatActorKey,
      attackToolId: path.attackToolKey,
      riskId: path.riskKey,
      avoidanceId: path.avoidanceKey,
      summary:
        groupedPaths.length > 1
          ? t("relationView.attackPathGroupedExplanationSummary", {
              pathCount: groupedPaths.length,
              actorCount: threatActorIds.length,
              stepCount: steps.length,
              risk: path.riskKey,
            })
          : t("relationView.attackPathExplanationSummary", {
              count: steps.length,
              risk: path.riskKey,
            }),
      defensiveFocus,
      qualityFlags,
      steps,
    };
  };

  const explainGroupedAttackPaths = (paths: AttackPath[]) => {
    const groupedPaths = new Map<string, AttackPath[]>();

    paths.forEach((path) => {
      const groupKey = buildPathGroupKey(path);
      const existingPaths = groupedPaths.get(groupKey);
      if (existingPaths) {
        existingPaths.push(path);
      } else {
        groupedPaths.set(groupKey, [path]);
      }
    });

    return [...groupedPaths.values()].map((items) => explainAttackPath(items[0], items));
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
      case RelationType.term:
        return false;
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

  const attackToolRiskMap = new Map<string, string[]>();
  Object.keys(BREAK.attackTools).forEach((attackToolKey) => {
    attackToolRiskMap.set(attackToolKey, getAttackToolRiskKeys(attackToolKey));
  });

  const threatActorRiskMap = new Map<string, string[]>();
  const threatActorAttackToolMap = new Map<string, string[]>();
  Object.keys(BREAK.threatActors).forEach((threatActorKey) => {
    threatActorRiskMap.set(threatActorKey, getThreatActorRiskKeys(threatActorKey));
    threatActorAttackToolMap.set(threatActorKey, getThreatActorAttackToolKeys(threatActorKey));
  });

  const allRiskKeys = Object.keys(BREAK.risks);
  const addUniqueMapValue = (map: Map<string, string[]>, key: string, value: string) => {
    const values = map.get(key);
    if (values) {
      if (!values.includes(value)) values.push(value);
      return;
    }
    map.set(key, [value]);
  };

  const riskToAttackTools = new Map<string, string[]>();
  const riskToThreatActors = new Map<string, string[]>();
  const attackToolToThreatActors = new Map<string, string[]>();
  const avoidanceToRisks = new Map<string, string[]>();

  attackToolRiskMap.forEach((riskKeys, attackToolKey) => {
    riskKeys.forEach((riskKey) => addUniqueMapValue(riskToAttackTools, riskKey, attackToolKey));
  });

  threatActorRiskMap.forEach((riskKeys, threatActorKey) => {
    riskKeys.forEach((riskKey) => addUniqueMapValue(riskToThreatActors, riskKey, threatActorKey));
  });

  threatActorAttackToolMap.forEach((attackToolKeys, threatActorKey) => {
    attackToolKeys.forEach((attackToolKey) => addUniqueMapValue(attackToolToThreatActors, attackToolKey, threatActorKey));
  });

  allRiskKeys.forEach((riskKey) => {
    const risk = BREAK.risks[riskKey as keyof typeof BREAK.risks];
    risk.avoidances.forEach((avoidanceKey) => addUniqueMapValue(avoidanceToRisks, avoidanceKey, riskKey));
  });

  const getOrderedRiskKeys = (riskKeySet: Set<string>) => allRiskKeys.filter((riskKey) => riskKeySet.has(riskKey));

  const getCandidateRiskKeys = () => {
    switch (relType.value) {
      case RelationType.risk:
        return BREAK.risks[relKey.value as keyof typeof BREAK.risks] ? [relKey.value] : [];
      case RelationType.attackTool:
        return getOrderedRiskKeys(new Set(attackToolRiskMap.get(relKey.value) ?? []));
      case RelationType.threatActor: {
        const riskKeySet = new Set(threatActorRiskMap.get(relKey.value) ?? []);
        (threatActorAttackToolMap.get(relKey.value) ?? []).forEach((attackToolKey) => {
          (attackToolRiskMap.get(attackToolKey) ?? []).forEach((riskKey) => riskKeySet.add(riskKey));
        });
        return getOrderedRiskKeys(riskKeySet);
      }
      case RelationType.avoidance:
        return getOrderedRiskKeys(new Set(avoidanceToRisks.get(relKey.value) ?? []));
      case RelationType.term:
        return [];
      default:
        return allRiskKeys;
    }
  };

  const buildAttackPathsForRisk = (
    riskKey: string,
    options: { attackToolKey?: string; avoidanceKey?: string; threatActorKey?: string } = {}
  ) => {
    const paths: AttackPath[] = [];
    const risk = BREAK.risks[riskKey as keyof typeof BREAK.risks];
    if (!risk) return paths;

    const riskAvoidances = options.avoidanceKey
      ? risk.avoidances.includes(options.avoidanceKey)
        ? [options.avoidanceKey]
        : []
      : risk.avoidances.length > 0
        ? risk.avoidances
        : [undefined];
    if (riskAvoidances.length === 0) return paths;

    const indexedAttackToolKeys = riskToAttackTools.get(riskKey) ?? [];
    const relatedAttackToolKeys = options.attackToolKey
      ? indexedAttackToolKeys.includes(options.attackToolKey)
        ? [options.attackToolKey]
        : []
      : indexedAttackToolKeys;
    const relatedThreatActorKeys = riskToThreatActors.get(riskKey) ?? [];

    relatedAttackToolKeys.forEach((attackToolKey) => {
      const toolThreatActorKeys = attackToolToThreatActors.get(attackToolKey) ?? [];
      const candidateThreatActorKeys = toolThreatActorKeys.length > 0 ? toolThreatActorKeys : relatedThreatActorKeys;
      const threatActorKeys = options.threatActorKey
        ? candidateThreatActorKeys.includes(options.threatActorKey)
          ? [options.threatActorKey]
          : []
        : candidateThreatActorKeys;

      if (threatActorKeys.length > 0) {
        threatActorKeys.forEach((threatActorKey) => {
          riskAvoidances.forEach((avoidanceKey) => {
            paths.push({ threatActorKey, attackToolKey, riskKey, avoidanceKey });
          });
        });
      } else if (!options.threatActorKey) {
        riskAvoidances.forEach((avoidanceKey) => {
          paths.push({ attackToolKey, riskKey, avoidanceKey });
        });
      }
    });

    if (relatedAttackToolKeys.length === 0) {
      const threatActorKeys = options.threatActorKey
        ? relatedThreatActorKeys.includes(options.threatActorKey)
          ? [options.threatActorKey]
          : []
        : relatedThreatActorKeys;

      threatActorKeys.forEach((threatActorKey) => {
        riskAvoidances.forEach((avoidanceKey) => {
          paths.push({ threatActorKey, riskKey, avoidanceKey });
        });
      });
    }

    return paths;
  };

  const buildAttackPaths = () => {
    const paths: AttackPath[] = [];
    const options = {
      attackToolKey: relType.value === RelationType.attackTool ? relKey.value : undefined,
      avoidanceKey: relType.value === RelationType.avoidance ? relKey.value : undefined,
      threatActorKey: relType.value === RelationType.threatActor ? relKey.value : undefined,
    };

    getCandidateRiskKeys().forEach((riskKey) => {
      paths.push(...buildAttackPathsForRisk(riskKey, options));
    });

    return paths.filter(matchesSelectedEntity);
  };

  const createEmptySankeyData = () => {
    const nodeMap = new Map<string, {
      name: string;
      depth?: number;
      entityType: Exclude<RelationType, RelationType.all>;
      entityKey: string;
      itemStyle: { color: string };
    }>();
    const linkMap = new Map<string, { source: string; target: string; value: number }>();

    const addNode = (type: Exclude<RelationType, RelationType.all>, key: string, depth: number) => {
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

  const buildSankeyData = () => {
    const sankey = createEmptySankeyData();
    const options = {
      attackToolKey: relType.value === RelationType.attackTool ? relKey.value : undefined,
      avoidanceKey: relType.value === RelationType.avoidance ? relKey.value : undefined,
      threatActorKey: relType.value === RelationType.threatActor ? relKey.value : undefined,
    };

    getCandidateRiskKeys().forEach((riskKey) => {
      buildAttackPathsForRisk(riskKey, options).forEach(sankey.addPath);
    });

    return sankey.toData();
  };

  const selectedNodeAttackPathSummary = computed(() => {
    const node = selectedNetworkNode.value;
    if (!node || !isRelationEntityType(node.type)) return [];
    if (node.type === RelationType.term) return [];

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

  const selectedNodeAttackPathExplanations = computed(() => {
    const node = selectedNetworkNode.value;
    if (!node || !isRelationEntityType(node.type) || node.type === RelationType.term) return [];

    return explainGroupedAttackPaths(buildAttackPaths().filter((path) => hasPathNode(path, node))).slice(0, 3);
  });

  const sankeyData = computed(() => {
    return buildSankeyData();
  });

  const sankeyChartHeight = computed(() => {
    const nodesByDepth = sankeyData.value.nodes.reduce<Record<number, number>>((acc, node) => {
      const depth = node.depth ?? 0;
      acc[depth] = (acc[depth] ?? 0) + 1;
      return acc;
    }, {});
    const maxLayerNodeCount = Math.max(1, ...Object.values(nodesByDepth));

    if (isMobileView()) {
      return Math.min(Math.max(620, maxLayerNodeCount * 34 + 140), 5200);
    }

    return Math.min(Math.max(520, maxLayerNodeCount * 24 + 96), 3200);
  });

  return {
    sankeyChartHeight,
    sankeyData,
    selectedNodeAttackPathDescription,
    selectedNodeAttackPathExplanations,
    selectedNodeAttackPathSummary,
  };
};
