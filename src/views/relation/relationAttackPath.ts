import { computed, type ComputedRef, type Ref } from "vue";
import BREAK from "@/BREAK";
import {
  createRelationTypeMapping,
  isRelationEntityType,
  RelationType,
  type AttackPath,
  type AttackPathDetail,
  type AttackPathFilterOption,
  type AttackPathFilters,
  type AttackPathFilterType,
  type AttackPathNodeRef,
  type AttackPathSegment,
  type Node,
} from "@/views/relation/relationTypes";

type Translate = (key: string, params?: Record<string, unknown>) => string;

interface CreateRelationAttackPathOptions {
  t: Translate;
  isMobile?: Ref<boolean>;
  relType: Ref<RelationType>;
  relKey: Ref<string>;
  attackPathFilters: Ref<AttackPathFilters>;
  selectedAttackPathId: Ref<string>;
  selectedNetworkNode: ComputedRef<Node | null>;
  RelationTypeMapping: ReturnType<typeof createRelationTypeMapping>;
  getSankeyNodeName: (type: Exclude<RelationType, RelationType.all>, key: string) => string;
  getNodeTitle: (type: Exclude<RelationType, RelationType.all>, key: string) => string;
}

export const createRelationAttackPathData = ({
  t,
  isMobile,
  relType,
  relKey,
  attackPathFilters,
  selectedAttackPathId,
  selectedNetworkNode,
  RelationTypeMapping,
  getSankeyNodeName,
  getNodeTitle,
}: CreateRelationAttackPathOptions) => {
  const isMobileView = () => isMobile?.value === true;
  const filterTypes: AttackPathFilterType[] = [
    RelationType.threatActor,
    RelationType.attackTool,
    RelationType.risk,
    RelationType.avoidance,
  ];

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

  const getPathKey = (path: AttackPath, type: AttackPathFilterType) => {
    if (type === RelationType.threatActor) return path.threatActorKey;
    if (type === RelationType.attackTool) return path.attackToolKey;
    if (type === RelationType.risk) return path.riskKey;
    return path.avoidanceKey;
  };

  const matchesPathFilters = (path: AttackPath) =>
    filterTypes.every((type) => {
      const filterValue = attackPathFilters.value[type];
      return !filterValue || getPathKey(path, type) === filterValue;
    });

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

  const entityExists = (type: AttackPathFilterType, key?: string) => {
    if (!key) return false;
    const breakKey = RelationTypeMapping[type].BreakKey as keyof typeof BREAK;
    return key in BREAK[breakKey];
  };

  const getEntityLabel = (type: AttackPathFilterType, key: string) => {
    const title = getNodeTitle(type, key);
    return `${key} ${title}`;
  };

  const getPathNodeRef = (type: AttackPathFilterType, key: string): AttackPathNodeRef => {
    const title = getNodeTitle(type, key);
    return {
      type,
      key,
      title,
      label: `${RelationTypeMapping[type].title}: ${key} ${title}`,
    };
  };

  const getThreatActorToolFields = (threatActorKey: string, attackToolKey: string) => {
    const threatActor = BREAK.threatActors[threatActorKey as keyof typeof BREAK.threatActors];
    const fields: string[] = [];
    if (threatActor.buildAttackTools.includes(attackToolKey)) fields.push("ThreatActor.buildAttackTools");
    if (threatActor.useAttackTools.includes(attackToolKey)) fields.push("ThreatActor.useAttackTools");
    return fields;
  };

  const getThreatActorRiskFields = (threatActorKey: string, riskKey: string) => {
    const threatActor = BREAK.threatActors[threatActorKey as keyof typeof BREAK.threatActors];
    const fields: string[] = [];
    if (threatActor.directCauseRisks.includes(riskKey)) fields.push("ThreatActor.directCauseRisks");
    if (threatActor.indirectSupportRisks.includes(riskKey)) fields.push("ThreatActor.indirectSupportRisks");
    return fields;
  };

  const getAttackToolRiskFields = (attackToolKey: string, riskKey: string) => {
    const attackTool = BREAK.attackTools[attackToolKey as keyof typeof BREAK.attackTools];
    const fields: string[] = [];
    if (attackTool.directCauseRisks.includes(riskKey)) fields.push("AttackTool.directCauseRisks");
    if (attackTool.indirectSupportRisks.includes(riskKey)) fields.push("AttackTool.indirectSupportRisks");
    return fields;
  };

  const getRiskAvoidanceFields = (riskKey: string, avoidanceKey: string) => {
    const risk = BREAK.risks[riskKey as keyof typeof BREAK.risks];
    return risk.avoidances.includes(avoidanceKey) ? ["Risk.avoidances"] : [];
  };

  const getSegmentRelation = (fields: string[]) => {
    if (fields.includes("ThreatActor.buildAttackTools")) return t("relationLine.buildAttackTool");
    if (fields.includes("ThreatActor.useAttackTools")) return t("relationLine.useAttackTool");
    if (fields.includes("AttackTool.directCauseRisks") || fields.includes("ThreatActor.directCauseRisks")) {
      return t("relationLine.directCauseRisk");
    }
    if (fields.includes("AttackTool.indirectSupportRisks") || fields.includes("ThreatActor.indirectSupportRisks")) {
      return t("relationLine.indirectSupportRisk");
    }
    if (fields.includes("Risk.avoidances")) return t("relationLine.avoidanceMeans");
    return t("relationLine.causeRisk");
  };

  const getSegmentReason = (fields: string[]) => {
    if (fields.includes("ThreatActor.buildAttackTools") && fields.includes("ThreatActor.useAttackTools")) {
      return t("relationView.pathReasonBuildAndUseTool");
    }
    if (fields.includes("ThreatActor.buildAttackTools")) return t("relationView.pathReasonBuildTool");
    if (fields.includes("ThreatActor.useAttackTools")) return t("relationView.pathReasonUseTool");
    if (fields.some((field) => field.endsWith(".directCauseRisks"))) return t("relationView.pathReasonDirectRisk");
    if (fields.some((field) => field.endsWith(".indirectSupportRisks"))) return t("relationView.pathReasonIndirectRisk");
    if (fields.includes("Risk.avoidances")) return t("relationView.pathReasonRiskAvoidance");
    return t("relationView.pathReasonRelated");
  };

  const buildSegment = (
    source: AttackPathNodeRef,
    target: AttackPathNodeRef,
    sourceFields: string[]
  ): AttackPathSegment => ({
    source,
    target,
    relation: getSegmentRelation(sourceFields),
    sourceFields,
    reason: getSegmentReason(sourceFields),
  });

  const getAttackPathId = (path: AttackPath) =>
    [
      path.threatActorKey ?? "-",
      path.attackToolKey ?? "-",
      path.riskKey,
      path.avoidanceKey ?? "-",
    ].join("|");

  const buildAttackPathDetail = (path: AttackPath): AttackPathDetail => {
    const nodes: AttackPathNodeRef[] = [];
    const segments: AttackPathSegment[] = [];

    if (path.threatActorKey) nodes.push(getPathNodeRef(RelationType.threatActor, path.threatActorKey));
    if (path.attackToolKey) nodes.push(getPathNodeRef(RelationType.attackTool, path.attackToolKey));
    nodes.push(getPathNodeRef(RelationType.risk, path.riskKey));
    if (path.avoidanceKey) nodes.push(getPathNodeRef(RelationType.avoidance, path.avoidanceKey));

    if (path.threatActorKey && path.attackToolKey) {
      segments.push(
        buildSegment(
          getPathNodeRef(RelationType.threatActor, path.threatActorKey),
          getPathNodeRef(RelationType.attackTool, path.attackToolKey),
          getThreatActorToolFields(path.threatActorKey, path.attackToolKey)
        )
      );
    }
    if (path.attackToolKey) {
      segments.push(
        buildSegment(
          getPathNodeRef(RelationType.attackTool, path.attackToolKey),
          getPathNodeRef(RelationType.risk, path.riskKey),
          getAttackToolRiskFields(path.attackToolKey, path.riskKey)
        )
      );
    } else if (path.threatActorKey) {
      segments.push(
        buildSegment(
          getPathNodeRef(RelationType.threatActor, path.threatActorKey),
          getPathNodeRef(RelationType.risk, path.riskKey),
          getThreatActorRiskFields(path.threatActorKey, path.riskKey)
        )
      );
    }
    if (path.avoidanceKey) {
      segments.push(
        buildSegment(
          getPathNodeRef(RelationType.risk, path.riskKey),
          getPathNodeRef(RelationType.avoidance, path.avoidanceKey),
          getRiskAvoidanceFields(path.riskKey, path.avoidanceKey)
        )
      );
    }

    return {
      id: getAttackPathId(path),
      label: nodes.map((node) => node.key).join(" -> "),
      path,
      nodes,
      segments,
    };
  };

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

  const attackPaths = computed(() => buildAttackPaths());
  const filteredAttackPaths = computed(() => attackPaths.value.filter(matchesPathFilters));
  const attackPathDetails = computed(() => filteredAttackPaths.value.map(buildAttackPathDetail));

  const getAttackPathFilterOptions = (type: AttackPathFilterType): AttackPathFilterOption[] => {
    const counts = new Map<string, number>();
    attackPaths.value.forEach((path) => {
      const key = getPathKey(path, type);
      if (!entityExists(type, key)) return;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    return [...counts.entries()]
      .map(([key, count]) => ({
        key,
        label: getEntityLabel(type, key),
        count,
      }))
      .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  };

  const attackPathFilterOptions = computed<Record<AttackPathFilterType, AttackPathFilterOption[]>>(() => ({
    [RelationType.threatActor]: getAttackPathFilterOptions(RelationType.threatActor),
    [RelationType.attackTool]: getAttackPathFilterOptions(RelationType.attackTool),
    [RelationType.risk]: getAttackPathFilterOptions(RelationType.risk),
    [RelationType.avoidance]: getAttackPathFilterOptions(RelationType.avoidance),
  }));

  const hasActiveAttackPathFilters = computed(() =>
    filterTypes.some((type) => Boolean(attackPathFilters.value[type]))
  );

  const selectedAttackPathDetail = computed(() => {
    const details = attackPathDetails.value;
    return details.find((detail) => detail.id === selectedAttackPathId.value) ?? details[0] ?? null;
  });

  const resetAttackPathFilters = () => {
    attackPathFilters.value = {};
    selectedAttackPathId.value = "";
  };

  const selectAttackPath = (pathId: string) => {
    selectedAttackPathId.value = pathId;
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
    filteredAttackPaths.value.forEach(sankey.addPath);

    return sankey.toData();
  };

  const selectedNodeAttackPathSummary = computed(() => {
    const node = selectedNetworkNode.value;
    if (!node || !isRelationEntityType(node.type)) return [];
    if (node.type === RelationType.term) return [];

    const matchingPaths = attackPaths.value.filter((path) => {
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
    attackPathDetails,
    attackPathFilterOptions,
    attackPaths,
    filteredAttackPaths,
    hasActiveAttackPathFilters,
    resetAttackPathFilters,
    sankeyChartHeight,
    sankeyData,
    selectAttackPath,
    selectedAttackPathDetail,
    selectedNodeAttackPathDescription,
    selectedNodeAttackPathSummary,
  };
};
