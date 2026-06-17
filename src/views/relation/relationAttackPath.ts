import { computed, ref, type ComputedRef, type Ref } from "vue";
import BREAK from "@/BREAK";
import {
  createRelationTypeMapping,
  isRelationEntityType,
  RelationType,
  type AttackPath,
  type AttackPathDetail,
  type AttackPathDetailNode,
  type AttackPathFilterOption,
  type AttackPathFilters,
  type AttackPathFilterType,
  type AttackPathExplanation,
  type Node,
  type RiskAvoidanceCoverage,
} from "@/views/relation/relationTypes";

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
  const attackPathFilters = ref<AttackPathFilters>({});
  const selectedAttackPathId = ref("");
  const isMobileView = () => isMobile?.value === true;

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

  const buildEntitySummary = (
    type: Exclude<RelationType, RelationType.all>,
    id: string
  ) => ({
    id,
    title: getNodeTitle(type, id),
    type,
  });

  const unique = <T>(values: T[]) => [...new Set(values)];
  const sortByKey = <T extends { key: string }>(items: T[]) =>
    [...items].sort((first, second) =>
      first.key.localeCompare(second.key, undefined, {
        numeric: true,
        sensitivity: "base",
      })
    );

  const explainAttackPath = (
    path: AttackPath,
    groupedPaths: AttackPath[] = [path]
  ): AttackPathExplanation => {
    const steps: AttackPathExplanation["steps"] = [];
    const qualityFlags: string[] = [];
    const defensiveFocus: string[] = [];
    const threatActorIds = unique(
      groupedPaths
        .map((item) => item.threatActorKey)
        .filter(Boolean) as string[]
    );
    const threatActors = threatActorIds.map((id) =>
      buildEntitySummary(RelationType.threatActor, id)
    );
    const attackTool = path.attackToolKey
      ? buildEntitySummary(RelationType.attackTool, path.attackToolKey)
      : undefined;
    const risk = buildEntitySummary(RelationType.risk, path.riskKey);
    const avoidance = path.avoidanceKey
      ? buildEntitySummary(RelationType.avoidance, path.avoidanceKey)
      : undefined;

    if (path.threatActorKey && path.attackToolKey) {
      const sourceFields = unique(
        threatActorIds.flatMap((threatActorKey) =>
          getThreatActorToolFields(threatActorKey, path.attackToolKey as string)
        )
      );
      steps.push({
        fromId:
          threatActorIds.length > 1
            ? t("relationView.groupedThreatActors", {
                count: threatActorIds.length,
              })
            : path.threatActorKey,
        fromTitle:
          threatActorIds.length > 1
            ? t("relationView.groupedThreatActors", {
                count: threatActorIds.length,
              })
            : getNodeTitle(RelationType.threatActor, path.threatActorKey),
        toId: path.attackToolKey,
        toTitle: getNodeTitle(RelationType.attackTool, path.attackToolKey),
        relationType: sourceFields.includes("ThreatActor.buildAttackTools")
          ? t("relationLine.buildAttackTool")
          : t("relationLine.useAttackTool"),
        sourceFields,
        attackIntent: t("relationView.attackPathIntent.actorToTool"),
        defensiveMeaning: t("relationView.attackPathDefense.actorToTool"),
      });
      if (sourceFields.length === 0)
        qualityFlags.push(t("relationView.qualityFlagMissingSource"));
    }

    if (path.attackToolKey) {
      const sourceFields = getToolRiskFields(path.attackToolKey, path.riskKey);
      steps.push({
        fromId: path.attackToolKey,
        fromTitle: getNodeTitle(RelationType.attackTool, path.attackToolKey),
        toId: path.riskKey,
        toTitle: getNodeTitle(RelationType.risk, path.riskKey),
        relationType: sourceFields.includes("AttackTool.directCauseRisks")
          ? t("relationLine.directCauseRisk")
          : t("relationLine.indirectSupportRisk"),
        sourceFields,
        attackIntent: t("relationView.attackPathIntent.toolToRisk"),
        defensiveMeaning: t("relationView.attackPathDefense.toolToRisk"),
      });
      if (sourceFields.length === 0)
        qualityFlags.push(t("relationView.qualityFlagMissingSource"));
    } else if (path.threatActorKey) {
      const sourceFields = getThreatActorRiskFields(
        path.threatActorKey,
        path.riskKey
      );
      steps.push({
        fromId: path.threatActorKey,
        fromTitle: getNodeTitle(RelationType.threatActor, path.threatActorKey),
        toId: path.riskKey,
        toTitle: getNodeTitle(RelationType.risk, path.riskKey),
        relationType: sourceFields.includes("ThreatActor.directCauseRisks")
          ? t("relationLine.directCauseRisk")
          : t("relationLine.indirectSupportRisk"),
        sourceFields,
        attackIntent: t("relationView.attackPathIntent.actorToRisk"),
        defensiveMeaning: t("relationView.attackPathDefense.actorToRisk"),
      });
      if (sourceFields.length === 0)
        qualityFlags.push(t("relationView.qualityFlagMissingSource"));
    }

    if (path.avoidanceKey) {
      const sourceFields =
        path.avoidanceSourceFields && path.avoidanceSourceFields.length > 0
          ? path.avoidanceSourceFields
          : ["Risk.avoidances"];
      steps.push({
        fromId: path.riskKey,
        fromTitle: getNodeTitle(RelationType.risk, path.riskKey),
        toId: path.avoidanceKey,
        toTitle: getNodeTitle(RelationType.avoidance, path.avoidanceKey),
        relationType: t("relationLine.avoidanceMeans"),
        sourceFields,
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
      threatActors,
      threatActorId: path.threatActorKey,
      attackTool,
      attackToolId: path.attackToolKey,
      risk,
      riskId: path.riskKey,
      avoidance,
      avoidanceId: path.avoidanceKey,
      summary:
        groupedPaths.length > 1
          ? t("relationView.attackPathGroupedExplanationSummary", {
              pathCount: groupedPaths.length,
              actorCount: threatActorIds.length,
              stepCount: steps.length,
              risk: risk.title,
            })
          : t("relationView.attackPathExplanationSummary", {
              count: steps.length,
              risk: risk.title,
            }),
      analysisFinding: attackTool
        ? t("relationView.attackPathFinding.toolRisk", {
            actorCount: threatActorIds.length,
            tool: attackTool.title,
            risk: risk.title,
            relation:
              steps.find((step) => step.toId === path.riskKey)?.relationType ??
              t("relationLine.causeRisk"),
            avoidance:
              avoidance?.title ?? t("relationView.noAvoidanceCoverage"),
          })
        : t("relationView.attackPathFinding.actorRisk", {
            actorCount: threatActorIds.length,
            risk: risk.title,
            avoidance:
              avoidance?.title ?? t("relationView.noAvoidanceCoverage"),
          }),
      recommendedAction: attackTool
        ? t("relationView.attackPathRecommendedAction.toolRisk", {
            tool: attackTool.title,
            risk: risk.title,
            avoidance:
              avoidance?.title ?? t("relationView.noAvoidanceCoverage"),
          })
        : t("relationView.attackPathRecommendedAction.actorRisk", {
            risk: risk.title,
            avoidance:
              avoidance?.title ?? t("relationView.noAvoidanceCoverage"),
          }),
      evidenceFields: unique(steps.flatMap((step) => step.sourceFields)),
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

    return [...groupedPaths.values()].map((items) =>
      explainAttackPath(items[0], items)
    );
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

  const pathMatchesFilters = (path: AttackPath, filters: AttackPathFilters) =>
    (!filters[RelationType.threatActor] ||
      path.threatActorKey === filters[RelationType.threatActor]) &&
    (!filters[RelationType.attackTool] ||
      path.attackToolKey === filters[RelationType.attackTool]) &&
    (!filters[RelationType.risk] ||
      path.riskKey === filters[RelationType.risk]) &&
    (!filters[RelationType.avoidance] ||
      path.avoidanceKey === filters[RelationType.avoidance]);

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

  const createEmptySankeyData = () => {
    const nodeMap = new Map<
      string,
      {
        name: string;
        depth?: number;
        entityType: Exclude<RelationType, RelationType.all>;
        entityKey: string;
        itemStyle: { color: string };
      }
    >();
    const linkMap = new Map<
      string,
      { source: string; target: string; value: number }
    >();

    const addNode = (
      type: Exclude<RelationType, RelationType.all>,
      key: string,
      depth: number
    ) => {
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
        pathNodes.push(
          addNode(RelationType.threatActor, path.threatActorKey, 0)
        );
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
      attackToolKey:
        relType.value === RelationType.attackTool ? relKey.value : undefined,
      avoidanceKey:
        relType.value === RelationType.avoidance ? relKey.value : undefined,
      threatActorKey:
        relType.value === RelationType.threatActor ? relKey.value : undefined,
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

  const sankeyData = computed(() => {
    return buildSankeyData();
  });

  const allAttackPaths = computed(() => buildAttackPaths());

  const filteredAttackPaths = computed(() =>
    allAttackPaths.value.filter((path) =>
      pathMatchesFilters(path, attackPathFilters.value)
    )
  );

  const attackPathDetails = computed(() =>
    filteredAttackPaths.value.map(buildAttackPathDetail)
  );

  const hasActiveAttackPathFilters = computed(() =>
    Boolean(
      attackPathFilters.value[RelationType.threatActor] ||
        attackPathFilters.value[RelationType.attackTool] ||
        attackPathFilters.value[RelationType.risk] ||
        attackPathFilters.value[RelationType.avoidance]
    )
  );

  const buildFilterOptions = (type: AttackPathFilterType) => {
    const countMap = new Map<string, number>();
    allAttackPaths.value.forEach((path) => {
      const key =
        type === RelationType.threatActor
          ? path.threatActorKey
          : type === RelationType.attackTool
            ? path.attackToolKey
            : type === RelationType.risk
              ? path.riskKey
              : path.avoidanceKey;
      if (!key) return;
      countMap.set(key, (countMap.get(key) ?? 0) + 1);
    });

    return sortByKey(
      [...countMap.entries()].map<AttackPathFilterOption>(([key, count]) => ({
        key,
        label: getNodeTitle(type, key),
        count,
      }))
    );
  };

  const attackPathFilterOptions = computed<
    Record<AttackPathFilterType, AttackPathFilterOption[]>
  >(() => ({
    [RelationType.threatActor]: buildFilterOptions(RelationType.threatActor),
    [RelationType.attackTool]: buildFilterOptions(RelationType.attackTool),
    [RelationType.risk]: buildFilterOptions(RelationType.risk),
    [RelationType.avoidance]: buildFilterOptions(RelationType.avoidance),
  }));

  const normalizeAttackPathFilters = () => {
    const nextFilters: AttackPathFilters = {};
    (
      [
        RelationType.threatActor,
        RelationType.attackTool,
        RelationType.risk,
        RelationType.avoidance,
      ] as AttackPathFilterType[]
    ).forEach((type) => {
      const value = attackPathFilters.value[type];
      if (
        value &&
        attackPathFilterOptions.value[type].some((option) => option.key === value)
      ) {
        nextFilters[type] = value;
      }
    });
    attackPathFilters.value = nextFilters;

    if (
      selectedAttackPathId.value &&
      !attackPathDetails.value.some((detail) => detail.id === selectedAttackPathId.value)
    ) {
      selectedAttackPathId.value = "";
    }
  };

  const resetAttackPathFilters = () => {
    attackPathFilters.value = {};
    selectedAttackPathId.value = "";
  };

  const selectAttackPath = (pathId: string) => {
    selectedAttackPathId.value = pathId;
  };

  const selectedAttackPathDetail = computed(() => {
    if (selectedAttackPathId.value) {
      const selected = attackPathDetails.value.find(
        (detail) => detail.id === selectedAttackPathId.value
      );
      if (selected) return selected;
    }
    return attackPathDetails.value[0] ?? null;
  });

  const riskAvoidanceCoverage = computed<RiskAvoidanceCoverage | null>(() => {
    if (relType.value !== RelationType.risk) return null;
    const risk = BREAK.risks[relKey.value as keyof typeof BREAK.risks];
    if (!risk) return null;

    const directAvoidances = unique(risk.avoidances);
    const toolAvoidanceMap = new Map<string, string[]>();
    allAttackPaths.value.forEach((path) => {
      if (!path.avoidanceKey || !path.attackToolKey) return;
      const tools = toolAvoidanceMap.get(path.avoidanceKey) ?? [];
      if (!tools.includes(path.attackToolKey)) tools.push(path.attackToolKey);
      toolAvoidanceMap.set(path.avoidanceKey, tools);
    });

    const avoidanceKeys = unique([
      ...directAvoidances,
      ...toolAvoidanceMap.keys(),
    ]);
    if (avoidanceKeys.length === 0) return null;

    const items = sortByKey(
      avoidanceKeys.map((avoidanceKey) => {
        const fromRisk = directAvoidances.includes(avoidanceKey);
        const attackToolKeys = toolAvoidanceMap.get(avoidanceKey) ?? [];
        const fromTool = attackToolKeys.length > 0;
        const source = fromRisk && fromTool ? "both" : fromRisk ? "risk" : "attackTool";
        return {
          key: avoidanceKey,
          avoidanceKey,
          avoidanceTitle: getNodeTitle(RelationType.avoidance, avoidanceKey),
          source,
          sourceLabel:
            source === "both"
              ? t("relationView.coverageSourceBoth")
              : source === "risk"
                ? t("relationView.coverageSourceRisk")
                : t("relationView.coverageSourceAttackTool"),
          pathCount: filteredAttackPaths.value.filter(
            (path) => path.avoidanceKey === avoidanceKey
          ).length,
          attackToolLabels: attackToolKeys.map(
            (attackToolKey) =>
              `${getNodeTitle(RelationType.attackTool, attackToolKey)} (${attackToolKey})`
          ),
          sourceFields: [
            ...(fromRisk ? ["Risk.avoidances"] : []),
            ...(fromTool ? ["AttackTool.avoidances"] : []),
          ],
        };
      })
    );

    return {
      totalCount: items.length,
      directCount: items.filter((item) => item.source === "risk").length,
      attackToolCount: items.filter((item) => item.source === "attackTool").length,
      overlapCount: items.filter((item) => item.source === "both").length,
      items,
    };
  });

  const sankeyChartHeight = computed(() => {
    const nodesByDepth = sankeyData.value.nodes.reduce<Record<number, number>>(
      (acc, node) => {
        const depth = node.depth ?? 0;
        acc[depth] = (acc[depth] ?? 0) + 1;
        return acc;
      },
      {}
    );
    const maxLayerNodeCount = Math.max(1, ...Object.values(nodesByDepth));

    if (isMobileView()) {
      return Math.min(Math.max(620, maxLayerNodeCount * 34 + 140), 5200);
    }

    return Math.min(Math.max(520, maxLayerNodeCount * 24 + 96), 3200);
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
