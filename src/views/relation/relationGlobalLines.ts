import BREAK from "@/BREAK";
import {
  getRelationLineKey,
  type Line,
  RelationType,
  type RelationEntityType,
} from "@/views/relation/relationTypes";
import type {
  DiscoveredRelationPath,
} from "@/views/relation/relationPathDiscovery";
import { inferEntityType, getEntityEntry } from "@/BREAK/entityRegistry";
import type { RelationSummary } from "@/components/relation/relationNodeDrawerRelationFilters";
import type {
  NodeAnalysisSummary,
  NodeRelatedEntitySummary,
  RootPathSummary,
} from "@/components/relation/relationNodeDrawerInsightTypes";
import { i18n } from "@/i18n";

type Translate = (key: string, params?: Record<string, unknown>) => string;

/**
 * 全局关系边构建：从 BREAK 数据枚举所有跨类型关系。
 * relationKey 统一使用完整 `relationLine.*` key（与网络图谱 builder 一致），
 * 使 isDirectRelationLine / getRelationSourceFields / explainRelation / getRelationPriority
 * 等规则函数能正确匹配（短 key 无法匹配规则，会导致 directness/sourceFields 失效）。
 *
 * text 字段使用 i18n 翻译，随 locale 变化自动更新。
 */
const buildGlobalLines = (): Line[] => {
  const t = i18n.global.t;
  const lines: Line[] = [];

  // Risk → Avoidance
  for (const [rKey, risk] of Object.entries(BREAK.risks)) {
    for (const aKey of risk.avoidances ?? []) {
      lines.push({
        from: rKey,
        to: aKey,
        text: t("relationLine.avoidanceMeans"),
        relationKey: "relationLine.avoidanceMeans",
      });
    }
  }

  // AttackTool → Risk (直接/间接), AttackTool → Avoidance
  for (const [atKey, tool] of Object.entries(BREAK.attackTools)) {
    for (const rKey of tool.directCauseRisks ?? []) {
      lines.push({
        from: atKey,
        to: rKey,
        text: t("relationLine.directCauseRisk"),
        relationKey: "relationLine.directCauseRisk",
      });
    }
    for (const rKey of tool.indirectSupportRisks ?? []) {
      lines.push({
        from: atKey,
        to: rKey,
        text: t("relationLine.indirectSupportRisk"),
        relationKey: "relationLine.indirectSupportRisk",
      });
    }
    for (const aKey of tool.avoidances ?? []) {
      lines.push({
        from: atKey,
        to: aKey,
        text: t("relationLine.avoidanceMeans"),
        relationKey: "relationLine.avoidanceMeans",
      });
    }
  }

  // ThreatActor → Risk (直接/间接), ThreatActor → AttackTool (构建/使用)
  for (const [taKey, actor] of Object.entries(BREAK.threatActors)) {
    for (const rKey of actor.directCauseRisks ?? []) {
      lines.push({
        from: taKey,
        to: rKey,
        text: t("relationLine.directCauseRisk"),
        relationKey: "relationLine.directCauseRisk",
      });
    }
    for (const rKey of actor.indirectSupportRisks ?? []) {
      lines.push({
        from: taKey,
        to: rKey,
        text: t("relationLine.indirectSupportRisk"),
        relationKey: "relationLine.indirectSupportRisk",
      });
    }
    for (const atKey of actor.buildAttackTools ?? []) {
      lines.push({
        from: taKey,
        to: atKey,
        text: t("relationLine.buildAttackTool"),
        relationKey: "relationLine.buildAttackTool",
      });
    }
    for (const atKey of actor.useAttackTools ?? []) {
      lines.push({
        from: taKey,
        to: atKey,
        text: t("relationLine.useAttackTool"),
        relationKey: "relationLine.useAttackTool",
      });
    }
  }

  // Term → 各实体
  for (const [tKey, term] of Object.entries(BREAK.terms)) {
    for (const rKey of term.relatedRisks ?? []) {
      lines.push({
        from: tKey,
        to: rKey,
        text: t("relationLine.relatedTerm"),
        relationKey: "relationLine.relatedTerm",
      });
    }
    for (const aKey of term.relatedAvoidances ?? []) {
      lines.push({
        from: tKey,
        to: aKey,
        text: t("relationLine.relatedTerm"),
        relationKey: "relationLine.relatedTerm",
      });
    }
    for (const atKey of term.relatedAttackTools ?? []) {
      lines.push({
        from: tKey,
        to: atKey,
        text: t("relationLine.relatedTerm"),
        relationKey: "relationLine.relatedTerm",
      });
    }
    for (const taKey of term.relatedThreatActors ?? []) {
      lines.push({
        from: tKey,
        to: taKey,
        text: t("relationLine.relatedTerm"),
        relationKey: "relationLine.relatedTerm",
      });
    }
  }

  return lines;
};

// 全局缓存：locale 变化时重建
let globalLinesCache: Line[] | null = null;
let globalLinesCacheLocale: string | null = null;
export const getGlobalLines = (): Line[] => {
  const currentLocale = i18n.global.locale.value;
  if (!globalLinesCache || globalLinesCacheLocale !== currentLocale) {
    globalLinesCache = buildGlobalLines();
    globalLinesCacheLocale = currentLocale;
  }
  return globalLinesCache;
};

/** 由实体 ID 前缀推断类型（从 entityRegistry 派生，不依赖网络图局部 nodes） */
export const getNodeTypeById = (id: string): RelationEntityType => {
  const entry = inferEntityType(id);
  if (entry) {
    const reg = getEntityEntry(entry);
    return reg.relationKey as RelationEntityType;
  }
  return RelationType.risk;
};

/** 取某节点在全局关系图中作为 from 或 to 的所有边（去重） */
export const buildNodeGlobalRelationEdges = (
  nodeId: string,
  globalLines: Line[],
): Line[] => {
  const seen = new Set<string>();
  const edges: Line[] = [];
  for (const line of globalLines) {
    if (line.from !== nodeId && line.to !== nodeId) continue;
    const dedupKey = `${line.from}::${getRelationLineKey(line)}::${line.to}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);
    edges.push(line);
  }
  return edges;
};

/** 全局关系计数：incoming / outgoing */
export const buildGlobalNodeRelationCounts = (
  nodeId: string,
  globalLines: Line[],
): { incoming: number; outgoing: number } => {
  let incoming = 0;
  let outgoing = 0;
  for (const line of buildNodeGlobalRelationEdges(nodeId, globalLines)) {
    if (line.from === nodeId) outgoing += 1;
    if (line.to === nodeId) incoming += 1;
  }
  return { incoming, outgoing };
};

interface BuildGlobalNodeRelationsOptions {
  nodeId: string;
  globalLines: Line[];
  getNodeTitle: (type: RelationEntityType, key: string) => string;
  getNodeTypeTitle: (type: string) => string;
  isDirectRelationLine: (lineKey: string) => boolean;
  getRelationSourceFields: (
    line: Line,
    sourceType?: string,
    targetType?: string,
  ) => string[];
  getRelationPriority: (lineKey: string) => number;
  explainRelation: (
    line: Line,
    sourceType?: string,
    targetType?: string,
  ) => {
    evidenceLevel: string;
    explanation: string;
    impactHint: string;
    qualityFlags: string[];
  };
  formatEvidenceLevel: (level: string) => string;
  t: Translate;
}

/**
 * 构建节点全局关系列表。
 * 与 buildRelationSummary 的关键区别：邻居类型/标题用 getNodeTypeById + getNodeTitle 回退
 * （非空，不依赖局部 nodes）；explainRelation / getRelationSourceFields 传入推断类型，
 * 避免全局邻居不在局部 nodeById 时 sourceFields 丢失。
 */
export const buildGlobalNodeRelations = ({
  nodeId,
  globalLines,
  getNodeTitle,
  getNodeTypeTitle,
  isDirectRelationLine,
  getRelationSourceFields,
  getRelationPriority,
  explainRelation,
  formatEvidenceLevel,
  t,
}: BuildGlobalNodeRelationsOptions): RelationSummary[] => {
  const edges = buildNodeGlobalRelationEdges(nodeId, globalLines);
  return edges
    .map((line) => {
      const otherNodeId = line.from === nodeId ? line.to : line.from;
      const fromType = getNodeTypeById(line.from);
      const toType = getNodeTypeById(line.to);
      const otherType = line.from === nodeId ? toType : fromType;
      const relationLineKey = getRelationLineKey(line);
      const explanation = explainRelation(line, fromType, toType);
      return {
        relationKey: `${line.from}::${relationLineKey}::${line.to}`,
        relationLineKey,
        direction:
          line.from === nodeId
            ? t("relationView.outgoing")
            : t("relationView.incoming"),
        directionKey: line.from === nodeId ? "outgoing" : "incoming",
        text: t(relationLineKey),
        directness: isDirectRelationLine(relationLineKey)
          ? t("relationView.direct")
          : t("relationView.indirect"),
        directnessKey: isDirectRelationLine(relationLineKey)
          ? "direct"
          : "indirect",
        otherNodeId,
        otherNodeType: getNodeTypeTitle(otherType),
        otherNodeTitle: getNodeTitle(otherType, otherNodeId),
        sourceFields: getRelationSourceFields(line, fromType, toType),
        evidenceLabel: formatEvidenceLevel(explanation.evidenceLevel),
        explanation: explanation.explanation,
        impactHint: explanation.impactHint,
        qualityFlags: explanation.qualityFlags,
        priority: getRelationPriority(relationLineKey),
      };
    })
    .sort(
      (first, second) =>
        first.priority - second.priority ||
        first.otherNodeId.localeCompare(second.otherNodeId),
    );
};

interface BuildGlobalNodeAnalysisSummaryOptions {
  node: { id: string; type: string } | null;
  globalLines: Line[];
  getNodeTitle: (type: RelationEntityType, key: string) => string;
  getNodeTypeTitle: (type: string) => string;
  t: Translate;
  selectedNodeRootPath?: RootPathSummary | null;
  selectedNodeDiscoveredPaths?: DiscoveredRelationPath[];
}

/**
 * 构建节点概览（全局关系版）：复刻 relationGraphInsights.selectedNodeAnalysisSummary 的
 * 计数 / highlights / notices 逻辑，但邻居类型用 getNodeTypeById 推断（不查局部 nodeById）。
 */
export const buildGlobalNodeAnalysisSummary = ({
  node,
  globalLines,
  getNodeTitle,
  getNodeTypeTitle,
  t,
  selectedNodeRootPath,
  selectedNodeDiscoveredPaths,
}: BuildGlobalNodeAnalysisSummaryOptions): NodeAnalysisSummary | null => {
  if (!node) return null;

  const relatedNodeIds = new Set<string>();
  let incoming = 0;
  let outgoing = 0;

  for (const line of buildNodeGlobalRelationEdges(node.id, globalLines)) {
    if (line.from === node.id) {
      outgoing += 1;
      relatedNodeIds.add(line.to);
    }
    if (line.to === node.id) {
      incoming += 1;
      relatedNodeIds.add(line.from);
    }
  }

  const relatedTypeGroups = [...relatedNodeIds].reduce<
    Record<string, string[]>
  >((groups, nodeId) => {
    const type = getNodeTypeById(nodeId);
    groups[type] = [...(groups[type] ?? []), nodeId];
    return groups;
  }, {});
  const relatedTypeCounts = Object.fromEntries(
    Object.entries(relatedTypeGroups).map(([type, ids]) => [type, ids.length]),
  );

  const getCount = (type: RelationType) => relatedTypeCounts[type] ?? 0;
  const relationCount = incoming + outgoing;
  const typeTitle = getNodeTypeTitle(node.type);
  const title = getNodeTitle(node.type as RelationEntityType, node.id);
  const params = {
    title,
    type: typeTitle,
    incoming,
    outgoing,
    relations: relationCount,
    risks: getCount(RelationType.risk),
    avoidances: getCount(RelationType.avoidance),
    attackTools: getCount(RelationType.attackTool),
    threatActors: getCount(RelationType.threatActor),
    terms: getCount(RelationType.term),
  };

  const summaryKey = `relationView.nodeAnalysis.${node.type}`;
  const highlights = Object.entries(relatedTypeCounts)
    .filter(([, count]) => count > 0)
    .sort(([firstType], [secondType]) => firstType.localeCompare(secondType))
    .map(([relatedType, count]) => ({
      label: t("relationView.nodeAnalysisRelatedCount", {
        type: getNodeTypeTitle(relatedType),
        count,
      }),
      type: relatedType,
      ids: [...(relatedTypeGroups[relatedType] ?? [])].sort(),
    }));

  const notices: string[] = [];
  if (relationCount >= 8) {
    notices.push(t("relationView.nodeAnalysisNotice.highConnectivity"));
  }
  if (relationCount <= 1) {
    notices.push(t("relationView.nodeAnalysisNotice.lowConnectivity"));
  }
  if (
    node.type === RelationType.risk &&
    getCount(RelationType.avoidance) === 0
  ) {
    notices.push(t("relationView.nodeAnalysisNotice.missingAvoidance"));
  }
  if (
    node.type === RelationType.attackTool &&
    getCount(RelationType.risk) === 0
  ) {
    notices.push(t("relationView.nodeAnalysisNotice.missingRiskLink"));
  }
  if (selectedNodeRootPath && selectedNodeRootPath.hopCount > 1) {
    notices.push(
      t("relationView.nodeAnalysisNotice.rootPath", {
        count: selectedNodeRootPath.hopCount,
      }),
    );
  }
  if (selectedNodeDiscoveredPaths && selectedNodeDiscoveredPaths.length > 1) {
    notices.push(
      t("relationView.nodeAnalysisNotice.discoveredPath", {
        count: selectedNodeDiscoveredPaths.length,
        hops: selectedNodeDiscoveredPaths[0]?.hopCount ?? 0,
      }),
    );
  }

  return {
    summary: t(summaryKey, params),
    highlights,
    notices,
  };
};

interface BuildGlobalNodeRelatedEntitySummaryOptions {
  nodeId: string;
  getNodeTitle: (type: RelationEntityType, key: string) => string;
  getNodeTypeTitle: (type: string) => string;
  t: Translate;
}

/**
 * 构建同类型相关实体（全局版）：直读 BREAK 实体的 related* 字段。
 * 局部版依赖图谱构建期打的 isRelatedEntity 标记，全局邻居无此标记，故改为直读 BREAK。
 */
export const buildGlobalNodeRelatedEntitySummary = ({
  nodeId,
  getNodeTitle,
  getNodeTypeTitle,
  t,
}: BuildGlobalNodeRelatedEntitySummaryOptions): NodeRelatedEntitySummary | null => {
  const nodeType = getNodeTypeById(nodeId);

  const translateRelation = (relation: string): string => {
    const key = `relationView.entityRelation.${relation}`;
    const translated = t(key);
    // 如果翻译 key 不存在，t() 返回 key 本身，此时退回原始值
    return translated === key ? relation : translated;
  };

  const collectPairs = (): Array<{
    otherId: string;
    relationText: string;
    relationKey: string;
  }> => {
    const pairs: Array<{
      otherId: string;
      relationText: string;
      relationKey: string;
    }> = [];
    if (nodeType === RelationType.risk) {
      const entity = BREAK.risks[nodeId as keyof typeof BREAK.risks];
      entity?.relatedRisks?.forEach((r) =>
        pairs.push({
          otherId: r.key,
          relationText: translateRelation(r.relation),
          relationKey: "relationLine.riskVariant",
        }),
      );
    } else if (nodeType === RelationType.avoidance) {
      const entity = BREAK.avoidances[nodeId as keyof typeof BREAK.avoidances];
      entity?.relatedAvoidances?.forEach((r) =>
        pairs.push({
          otherId: r.key,
          relationText: translateRelation(r.relation),
          relationKey: "relationLine.subAvoidance",
        }),
      );
    } else if (nodeType === RelationType.attackTool) {
      const entity = BREAK.attackTools[nodeId as keyof typeof BREAK.attackTools];
      entity?.relatedAttackTools?.forEach((r) =>
        pairs.push({
          otherId: r.key,
          relationText: translateRelation(r.relation),
          relationKey: "relationLine.subAttackTool",
        }),
      );
    } else if (nodeType === RelationType.threatActor) {
      const entity =
        BREAK.threatActors[nodeId as keyof typeof BREAK.threatActors];
      entity?.relatedThreatActors?.forEach((r) =>
        pairs.push({
          otherId: r.key,
          relationText: translateRelation(r.relation),
          relationKey: "relationLine.subThreatActor",
        }),
      );
    }
    return pairs;
  };

  const seen = new Set<string>();
  const items = collectPairs()
    .filter((pair) => {
      if (seen.has(pair.otherId)) return false;
      seen.add(pair.otherId);
      return true;
    })
    .map((pair) => ({
      id: pair.otherId,
      title: getNodeTitle(nodeType, pair.otherId),
      type: nodeType,
      relationKey: pair.relationKey,
      relationText: pair.relationText,
      direction: t("relationView.outgoing"),
      sourceFields: [],
    }))
    .sort((first, second) => first.id.localeCompare(second.id));

  if (items.length === 0) return null;

  return {
    title: t("relationView.relatedEntityTitle", {
      type: getNodeTypeTitle(nodeType),
    }),
    summary: t("relationView.relatedEntitySummary", {
      count: items.length,
      type: getNodeTypeTitle(nodeType),
    }),
    items,
  };
};
