import { computed, ref, watch, type ComputedRef, type Ref } from "vue";
import BREAK from "@/BREAK";
import {
  createRelationTypeMapping,
  isRelationEntityType,
  RelationType,
  type AttackPath,
  type AttackPathDetail,
  type AttackPathDetailNode,
  type AttackPathFilters,
  type AttackPathFilterType,
  type Node,
} from "@/views/relation/relationTypes";
import { createRelationAttackPathCoverage } from "@/views/relation/relationAttackPathCoverage";
import { createRelationAttackPathExplanation } from "@/views/relation/relationAttackPathExplanation";
import {
  createRelationAttackPathFilters,
  isAttackPathFilterType,
} from "@/views/relation/relationAttackPathFilters";
import { createRelationAttackPathSankey } from "@/views/relation/relationAttackPathSankey";

type Translate = (key: string, params?: Record<string, unknown>) => string;

interface CreateRelationAttackPathOptions {
  t: Translate;
  isMobile?: Ref<boolean>;
  relType: Ref<RelationType>;
  relKey: Ref<string>;
  selectedNetworkNode: ComputedRef<Node | null>;
  RelationTypeMapping: ReturnType<typeof createRelationTypeMapping>;
  getSankeyNodeName: (
    type: Exclude<RelationType, RelationType.all>,
    key: string
  ) => string;
  getNodeTitle: (
    type: Exclude<RelationType, RelationType.all>,
    key: string
  ) => string;
}

export const createRelationAttackPathData = ({
  t,
  isMobile,
  relType,
  relKey,
  selectedNetworkNode,
  RelationTypeMapping,
  getSankeyNodeName,
  getNodeTitle,
}: CreateRelationAttackPathOptions) => {
  const selectedAttackPathId = ref("");
  const isMobileView = computed(() => isMobile?.value === true);
  const rootAttackPathFilter = ref<{
    type: AttackPathFilterType;
    key: string;
  } | null>(null);

  const syncRootAttackPathFilter = () => {
    const previousRootFilter = rootAttackPathFilter.value;
    const nextFilters: AttackPathFilters = { ...attackPathFilters.value };

    if (
      previousRootFilter &&
      nextFilters[previousRootFilter.type] === previousRootFilter.key
    ) {
      delete nextFilters[previousRootFilter.type];
    }

    if (isAttackPathFilterType(relType.value) && relKey.value) {
      nextFilters[relType.value] = relKey.value;
      rootAttackPathFilter.value = {
        type: relType.value,
        key: relKey.value,
      };
    } else {
      rootAttackPathFilter.value = null;
    }

    attackPathFilters.value = nextFilters;
    selectedAttackPathId.value = "";
  };

  const describeAttackPathRole = (
    nodeType: Exclude<RelationType, RelationType.all>
  ) => {
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
      path.threatActorKey
        ? `${RelationType.threatActor}:${path.threatActorKey}`
        : "",
      path.attackToolKey
        ? `${RelationType.attackTool}:${path.attackToolKey}`
        : "",
      `${RelationType.risk}:${path.riskKey}`,
      path.avoidanceKey ? `${RelationType.avoidance}:${path.avoidanceKey}` : "",
    ]
      .filter(Boolean)
      .join("->");

  const buildPathGroupKey = (path: AttackPath) =>
    [
      path.attackToolKey
        ? `${RelationType.attackTool}:${path.attackToolKey}`
        : "no-tool",
      `${RelationType.risk}:${path.riskKey}`,
      path.avoidanceKey
        ? `${RelationType.avoidance}:${path.avoidanceKey}`
        : "no-avoidance",
    ].join("->");

  const hasPathNode = (path: AttackPath, node: Node) => {
    if (node.type === RelationType.threatActor)
      return path.threatActorKey === node.id;
    if (node.type === RelationType.attackTool)
      return path.attackToolKey === node.id;
    if (node.type === RelationType.risk) return path.riskKey === node.id;
    if (node.type === RelationType.avoidance)
      return path.avoidanceKey === node.id;
    return false;
  };

  const getToolRiskFields = (attackToolKey: string, riskKey: string) => {
    const attackTool =
      BREAK.attackTools[attackToolKey as keyof typeof BREAK.attackTools];
    const fields: string[] = [];
    if (attackTool.directCauseRisks.includes(riskKey))
      fields.push("AttackTool.directCauseRisks");
    if (attackTool.indirectSupportRisks.includes(riskKey))
      fields.push("AttackTool.indirectSupportRisks");
    return fields;
  };

  const getThreatActorToolFields = (
    threatActorKey: string,
    attackToolKey: string
  ) => {
    const threatActor =
      BREAK.threatActors[threatActorKey as keyof typeof BREAK.threatActors];
    const fields: string[] = [];
    if (threatActor.useAttackTools.includes(attackToolKey))
      fields.push("ThreatActor.useAttackTools");
    if (threatActor.buildAttackTools.includes(attackToolKey))
      fields.push("ThreatActor.buildAttackTools");
    return fields;
  };

  const getThreatActorRiskFields = (
    threatActorKey: string,
    riskKey: string
  ) => {
    const threatActor =
      BREAK.threatActors[threatActorKey as keyof typeof BREAK.threatActors];
    const fields: string[] = [];
    if (threatActor.directCauseRisks.includes(riskKey))
      fields.push("ThreatActor.directCauseRisks");
    if (threatActor.indirectSupportRisks.includes(riskKey))
      fields.push("ThreatActor.indirectSupportRisks");
    return fields;
  };

  const { explainGroupedAttackPaths } = createRelationAttackPathExplanation({
    buildPathGroupKey,
    getNodeTitle,
    getThreatActorRiskFields,
    getThreatActorToolFields,
    getToolRiskFields,
    t,
  });

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
    const attackTool =
      BREAK.attackTools[attackToolKey as keyof typeof BREAK.attackTools];
    return [
      ...new Set([
        ...attackTool.directCauseRisks,
        ...attackTool.indirectSupportRisks,
      ]),
    ];
  };

  const getThreatActorRiskKeys = (threatActorKey: string) => {
    const threatActor =
      BREAK.threatActors[threatActorKey as keyof typeof BREAK.threatActors];
    return [
      ...new Set([
        ...threatActor.directCauseRisks,
        ...threatActor.indirectSupportRisks,
      ]),
    ];
  };

  const getThreatActorAttackToolKeys = (threatActorKey: string) => {
    const threatActor =
      BREAK.threatActors[threatActorKey as keyof typeof BREAK.threatActors];
    return [
      ...new Set([
        ...threatActor.buildAttackTools,
        ...threatActor.useAttackTools,
      ]),
    ];
  };

  const attackToolRiskMap = new Map<string, string[]>();
  Object.keys(BREAK.attackTools).forEach((attackToolKey) => {
    attackToolRiskMap.set(attackToolKey, getAttackToolRiskKeys(attackToolKey));
  });

  const threatActorRiskMap = new Map<string, string[]>();
  const threatActorAttackToolMap = new Map<string, string[]>();
  Object.keys(BREAK.threatActors).forEach((threatActorKey) => {
    threatActorRiskMap.set(
      threatActorKey,
      getThreatActorRiskKeys(threatActorKey)
    );
    threatActorAttackToolMap.set(
      threatActorKey,
      getThreatActorAttackToolKeys(threatActorKey)
    );
  });

  const allRiskKeys = Object.keys(BREAK.risks);
  const addUniqueMapValue = (
    map: Map<string, string[]>,
    key: string,
    value: string
  ) => {
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
    riskKeys.forEach((riskKey) =>
      addUniqueMapValue(riskToAttackTools, riskKey, attackToolKey)
    );
  });

  threatActorRiskMap.forEach((riskKeys, threatActorKey) => {
    riskKeys.forEach((riskKey) =>
      addUniqueMapValue(riskToThreatActors, riskKey, threatActorKey)
    );
  });

  threatActorAttackToolMap.forEach((attackToolKeys, threatActorKey) => {
    attackToolKeys.forEach((attackToolKey) =>
      addUniqueMapValue(attackToolToThreatActors, attackToolKey, threatActorKey)
    );
  });

  allRiskKeys.forEach((riskKey) => {
    const risk = BREAK.risks[riskKey as keyof typeof BREAK.risks];
    risk.avoidances.forEach((avoidanceKey) =>
      addUniqueMapValue(avoidanceToRisks, avoidanceKey, riskKey)
    );
  });

  const getOrderedRiskKeys = (riskKeySet: Set<string>) =>
    allRiskKeys.filter((riskKey) => riskKeySet.has(riskKey));

  const getCandidateRiskKeys = () => {
    switch (relType.value) {
      case RelationType.risk:
        return BREAK.risks[relKey.value as keyof typeof BREAK.risks]
          ? [relKey.value]
          : [];
      case RelationType.attackTool:
        return getOrderedRiskKeys(
          new Set(attackToolRiskMap.get(relKey.value) ?? [])
        );
      case RelationType.threatActor: {
        const riskKeySet = new Set(threatActorRiskMap.get(relKey.value) ?? []);
        (threatActorAttackToolMap.get(relKey.value) ?? []).forEach(
          (attackToolKey) => {
            (attackToolRiskMap.get(attackToolKey) ?? []).forEach((riskKey) =>
              riskKeySet.add(riskKey)
            );
          }
        );
        return getOrderedRiskKeys(riskKeySet);
      }
      case RelationType.avoidance:
        return getOrderedRiskKeys(
          new Set(avoidanceToRisks.get(relKey.value) ?? [])
        );
      case RelationType.term:
        return [];
      default:
        return allRiskKeys;
    }
  };

  const buildAttackPathsForRisk = (
    riskKey: string,
    options: {
      attackToolKey?: string;
      avoidanceKey?: string;
      threatActorKey?: string;
    } = {}
  ) => {
    const paths: AttackPath[] = [];
    const risk = BREAK.risks[riskKey as keyof typeof BREAK.risks];
    if (!risk) return paths;

    const getPathAvoidances = (attackToolKey?: string) => {
      const attackTool = attackToolKey
        ? BREAK.attackTools[attackToolKey as keyof typeof BREAK.attackTools]
        : undefined;
      const attackToolAvoidances = attackTool?.avoidances ?? [];
      const riskAvoidances = risk.avoidances;
      const candidateAvoidances =
        attackToolAvoidances.length > 0
          ? attackToolAvoidances.filter((avoidanceKey) =>
              riskAvoidances.includes(avoidanceKey)
            ).length > 0
            ? attackToolAvoidances.filter((avoidanceKey) =>
                riskAvoidances.includes(avoidanceKey)
              )
            : attackToolAvoidances
          : riskAvoidances;
      const filteredAvoidances = options.avoidanceKey
        ? candidateAvoidances.includes(options.avoidanceKey)
          ? [options.avoidanceKey]
          : []
        : candidateAvoidances.length > 0
          ? candidateAvoidances
          : [undefined];

      return filteredAvoidances.map((avoidanceKey) => ({
        avoidanceKey,
        sourceFields: avoidanceKey
          ? [
              ...(attackToolAvoidances.includes(avoidanceKey)
                ? ["AttackTool.avoidances"]
                : []),
              ...(riskAvoidances.includes(avoidanceKey)
                ? ["Risk.avoidances"]
                : []),
            ]
          : [],
      }));
    };

    const indexedAttackToolKeys = riskToAttackTools.get(riskKey) ?? [];
    const relatedAttackToolKeys = options.attackToolKey
      ? indexedAttackToolKeys.includes(options.attackToolKey)
        ? [options.attackToolKey]
        : []
      : indexedAttackToolKeys;
    const relatedThreatActorKeys = riskToThreatActors.get(riskKey) ?? [];

    relatedAttackToolKeys.forEach((attackToolKey) => {
      const toolThreatActorKeys =
        attackToolToThreatActors.get(attackToolKey) ?? [];
      const candidateThreatActorKeys =
        toolThreatActorKeys.length > 0
          ? toolThreatActorKeys
          : relatedThreatActorKeys;
      const threatActorKeys = options.threatActorKey
        ? candidateThreatActorKeys.includes(options.threatActorKey)
          ? [options.threatActorKey]
          : []
        : candidateThreatActorKeys;

      if (threatActorKeys.length > 0) {
        threatActorKeys.forEach((threatActorKey) => {
          getPathAvoidances(attackToolKey).forEach(
            ({ avoidanceKey, sourceFields }) => {
              if (options.avoidanceKey && !avoidanceKey) return;
              paths.push({
                threatActorKey,
                attackToolKey,
                riskKey,
                avoidanceKey,
                avoidanceSourceFields: sourceFields,
              });
            }
          );
        });
      } else if (!options.threatActorKey) {
        getPathAvoidances(attackToolKey).forEach(
          ({ avoidanceKey, sourceFields }) => {
            if (options.avoidanceKey && !avoidanceKey) return;
            paths.push({
              attackToolKey,
              riskKey,
              avoidanceKey,
              avoidanceSourceFields: sourceFields,
            });
          }
        );
      }
    });

    if (relatedAttackToolKeys.length === 0) {
      const threatActorKeys = options.threatActorKey
        ? relatedThreatActorKeys.includes(options.threatActorKey)
          ? [options.threatActorKey]
          : []
        : relatedThreatActorKeys;

      threatActorKeys.forEach((threatActorKey) => {
        getPathAvoidances().forEach(({ avoidanceKey, sourceFields }) => {
          if (options.avoidanceKey && !avoidanceKey) return;
          paths.push({
            threatActorKey,
            riskKey,
            avoidanceKey,
            avoidanceSourceFields: sourceFields,
          });
        });
      });
    }

    return paths;
  };

  const buildAttackPaths = () => {
    const paths: AttackPath[] = [];
    const options = {
      attackToolKey:
        relType.value === RelationType.attackTool ? relKey.value : undefined,
      avoidanceKey:
        relType.value === RelationType.avoidance ? relKey.value : undefined,
      threatActorKey:
        relType.value === RelationType.threatActor ? relKey.value : undefined,
    };

    getCandidateRiskKeys().forEach((riskKey) => {
      paths.push(...buildAttackPathsForRisk(riskKey, options));
    });

    return paths.filter(matchesSelectedEntity);
  };

  const getPathNode = (
    type: AttackPathFilterType,
    key: string
  ): AttackPathDetailNode => ({
    type,
    key,
    label: `${getNodeTitle(type, key)} (${key})`,
  });

  const buildAttackPathDetail = (path: AttackPath): AttackPathDetail => {
    const nodes: AttackPathDetailNode[] = [];
    const segments: AttackPathDetail["segments"] = [];

    if (path.threatActorKey) {
      nodes.push(getPathNode(RelationType.threatActor, path.threatActorKey));
    }
    if (path.attackToolKey) {
      nodes.push(getPathNode(RelationType.attackTool, path.attackToolKey));
    }
    nodes.push(getPathNode(RelationType.risk, path.riskKey));
    if (path.avoidanceKey) {
      nodes.push(getPathNode(RelationType.avoidance, path.avoidanceKey));
    }

    if (path.threatActorKey && path.attackToolKey) {
      const sourceFields = getThreatActorToolFields(
        path.threatActorKey,
        path.attackToolKey
      );
      segments.push({
        source: getPathNode(RelationType.threatActor, path.threatActorKey),
        target: getPathNode(RelationType.attackTool, path.attackToolKey),
        relation: sourceFields.includes("ThreatActor.buildAttackTools")
          ? t("relationLine.buildAttackTool")
          : t("relationLine.useAttackTool"),
        reason:
          sourceFields.length > 1
            ? t("relationView.pathReasonBuildAndUseTool")
            : sourceFields.includes("ThreatActor.buildAttackTools")
              ? t("relationView.pathReasonBuildTool")
              : t("relationView.pathReasonUseTool"),
        sourceFields,
      });
    }

    if (path.attackToolKey) {
      const sourceFields = getToolRiskFields(path.attackToolKey, path.riskKey);
      segments.push({
        source: getPathNode(RelationType.attackTool, path.attackToolKey),
        target: getPathNode(RelationType.risk, path.riskKey),
        relation: sourceFields.includes("AttackTool.directCauseRisks")
          ? t("relationLine.directCauseRisk")
          : t("relationLine.indirectSupportRisk"),
        reason: sourceFields.includes("AttackTool.directCauseRisks")
          ? t("relationView.pathReasonDirectRisk")
          : t("relationView.pathReasonIndirectRisk"),
        sourceFields,
      });
    } else if (path.threatActorKey) {
      const sourceFields = getThreatActorRiskFields(
        path.threatActorKey,
        path.riskKey
      );
      segments.push({
        source: getPathNode(RelationType.threatActor, path.threatActorKey),
        target: getPathNode(RelationType.risk, path.riskKey),
        relation: sourceFields.includes("ThreatActor.directCauseRisks")
          ? t("relationLine.directCauseRisk")
          : t("relationLine.indirectSupportRisk"),
        reason: sourceFields.includes("ThreatActor.directCauseRisks")
          ? t("relationView.pathReasonDirectRisk")
          : t("relationView.pathReasonIndirectRisk"),
        sourceFields,
      });
    }

    if (path.avoidanceKey) {
      const sourceFields = path.avoidanceSourceFields?.length
        ? path.avoidanceSourceFields
        : ["Risk.avoidances"];
      segments.push({
        source: getPathNode(RelationType.risk, path.riskKey),
        target: getPathNode(RelationType.avoidance, path.avoidanceKey),
        relation: t("relationLine.avoidanceMeans"),
        reason: t("relationView.pathReasonRiskAvoidance"),
        sourceFields,
      });
    }

    return {
      id: buildPathKey(path),
      label: nodes.map((node) => node.label).join(" -> "),
      nodes,
      segments,
    };
  };

  const selectedNodeAttackPathSummary = computed(() => {
    const node = selectedNetworkNode.value;
    if (!node || !isRelationEntityType(node.type)) return [];
    if (node.type === RelationType.term) return [];

    const matchingPaths = buildAttackPaths().filter((path) => {
      if (node.type === RelationType.threatActor)
        return path.threatActorKey === node.id;
      if (node.type === RelationType.attackTool)
        return path.attackToolKey === node.id;
      if (node.type === RelationType.risk) return path.riskKey === node.id;
      if (node.type === RelationType.avoidance)
        return path.avoidanceKey === node.id;
      return false;
    });

    const roleSet = new Set<string>();
    if (matchingPaths.some((path) => path.threatActorKey === node.id))
      roleSet.add(t("relationView.pathRoleThreatActor"));
    if (matchingPaths.some((path) => path.attackToolKey === node.id))
      roleSet.add(t("relationView.pathRoleAttackTool"));
    if (matchingPaths.some((path) => path.riskKey === node.id))
      roleSet.add(t("relationView.pathRoleRisk"));
    if (matchingPaths.some((path) => path.avoidanceKey === node.id))
      roleSet.add(t("relationView.pathRoleAvoidance"));

    return [...roleSet];
  });

  const selectedNodeAttackPathDescription = computed(() => {
    const node = selectedNetworkNode.value;
    if (!node || !isRelationEntityType(node.type)) return "";
    return describeAttackPathRole(node.type);
  });

  const selectedNodeAttackPathExplanations = computed(() => {
    const node = selectedNetworkNode.value;
    if (
      !node ||
      !isRelationEntityType(node.type) ||
      node.type === RelationType.term
    )
      return [];

    return explainGroupedAttackPaths(
      buildAttackPaths().filter((path) => hasPathNode(path, node))
    );
  });

  const allAttackPaths = computed(() => buildAttackPaths());

  const { sankeyChartHeight, sankeyData } = createRelationAttackPathSankey({
    buildAttackPaths,
    getSankeyNodeName,
    isMobile: isMobileView,
    RelationTypeMapping,
  });

  const {
    attackPathDetails,
    attackPathFilterOptions,
    attackPathFilters,
    filteredAttackPaths,
    hasActiveAttackPathFilters,
    normalizeAttackPathFilters,
    resetAttackPathFilters: resetFilters,
  } = createRelationAttackPathFilters({
    allAttackPaths,
    buildAttackPathDetail,
    getNodeTitle,
    selectedAttackPathId,
  });

  const resetAttackPathFilters = () => {
    resetFilters();
    rootAttackPathFilter.value = null;
  };

  const selectAttackPath = (pathId: string) => {
    selectedAttackPathId.value = pathId;
  };

  watch([relType, relKey], syncRootAttackPathFilter, { immediate: true });

  const selectedAttackPathDetail = computed(() => {
    if (selectedAttackPathId.value) {
      const selected = attackPathDetails.value.find(
        (detail) => detail.id === selectedAttackPathId.value
      );
      if (selected) return selected;
    }
    return attackPathDetails.value[0] ?? null;
  });

  const { riskAvoidanceCoverage } = createRelationAttackPathCoverage({
    allAttackPaths,
    getNodeTitle,
    relKey,
    relType,
    t,
  });

  return {
    attackPathDetails,
    attackPathFilterOptions,
    attackPathFilters,
    filteredAttackPaths,
    hasActiveAttackPathFilters,
    normalizeAttackPathFilters,
    resetAttackPathFilters,
    riskAvoidanceCoverage,
    sankeyChartHeight,
    sankeyData,
    selectAttackPath,
    selectedAttackPathDetail,
    selectedNodeAttackPathDescription,
    selectedNodeAttackPathExplanations,
    selectedNodeAttackPathSummary,
  };
};
