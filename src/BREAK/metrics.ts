import BREAK from "@/BREAK";

type ReferenceCarrier = {
  title?: string;
  references?: unknown[];
  [key: string]: unknown;
};

type RecordMap<T = ReferenceCarrier> = Record<string, T>;

interface BusinessSceneEntity extends ReferenceCarrier {
  risks?: string[];
  riskDimensions?: Record<string, unknown>;
  riskScenes?: Record<string, { risks?: string[] }>;
}

interface EntitySummary {
  key: string;
  total: number;
  main: number;
  sub: number;
  withReferences: number;
  references: number;
  referenceCoverageRate: number;
}

interface CoverageSummary {
  name: string;
  total: number;
  covered: number;
  empty: number;
  rate: number;
}

interface DashboardMetrics {
  generatedAt: string;
  entities: {
    risks: EntitySummary;
    avoidances: EntitySummary;
    attackTools: EntitySummary;
    threatActors: EntitySummary;
    businessScenes: {
      key: string;
      total: number;
      main: number;
      sub: number;
      withReferences: number;
      references: number;
      referenceCoverageRate: number;
    };
  };
  reference: {
    total: number;
    entitiesWithReferences: number;
    entitiesChecked: number;
    coverageRate: number;
  };
  riskComplexity: {
    key: string;
    label: string;
    count: number;
    rate: number;
  }[];
  avoidanceCategories: {
    key: string;
    label: string;
    count: number;
    rate: number;
  }[];
  relationCoverage: CoverageSummary[];
  businessSceneCoverage: {
    key: string;
    title: string;
    riskCount: number;
    uniqueRiskCount: number;
    duplicateRiskCount: number;
    dimensionCount: number;
    sceneCount: number;
  }[];
  highDegreeNodes: {
    type: "risk" | "avoidance" | "attackTool" | "threatActor";
    key: string;
    degree: number;
  }[];
}

const percent = (part: number, total: number) =>
  total ? Number(((part / total) * 100).toFixed(2)) : 0;

const isSubEntity = (key: string) => key.includes("-");

const valuesOf = <T>(records: RecordMap<T>) =>
  Object.entries(records).map(([key, entity]) => ({ key, entity }));

const hasArrayValues = (entity: Record<string, unknown>, field: string) =>
  Array.isArray(entity[field]) && (entity[field] as unknown[]).length > 0;

const summarizeEntity = (key: string, records: RecordMap): EntitySummary => {
  const entries = valuesOf(records);
  const withReferences = entries.filter(
    ({ entity }) => Array.isArray(entity.references) && entity.references.length > 0
  ).length;
  const references = entries.reduce(
    (count, { entity }) => count + (Array.isArray(entity.references) ? entity.references.length : 0),
    0
  );

  return {
    key,
    total: entries.length,
    main: entries.filter(({ key: entityKey }) => !isSubEntity(entityKey)).length,
    sub: entries.filter(({ key: entityKey }) => isSubEntity(entityKey)).length,
    withReferences,
    references,
    referenceCoverageRate: percent(withReferences, entries.length),
  };
};

const summarizeCoverage = (
  name: string,
  records: RecordMap<Record<string, unknown>>,
  field: string
): CoverageSummary => {
  const entries = Object.values(records);
  const covered = entries.filter((entity) => hasArrayValues(entity, field)).length;

  return {
    name,
    total: entries.length,
    covered,
    empty: entries.length - covered,
    rate: percent(covered, entries.length),
  };
};

const unique = (values: string[]) => [...new Set(values.filter(Boolean))].sort();

const collectBusinessSceneRisks = (scene: BusinessSceneEntity) => [
  ...(Array.isArray(scene.risks) ? scene.risks : []),
  ...Object.values(scene.riskScenes || {}).flatMap((riskScene) =>
    Array.isArray(riskScene.risks) ? riskScene.risks : []
  ),
];

const titleFor = (records: RecordMap, key: string) => records[key]?.title || key;

export function buildDashboardMetrics(): DashboardMetrics {
  const riskEntries = valuesOf(BREAK.risks);
  const avoidanceEntries = valuesOf(BREAK.avoidances);
  const attackToolEntries = valuesOf(BREAK.attackTools);
  const threatActorEntries = valuesOf(BREAK.threatActors);
  const businessSceneEntries = valuesOf(BREAK.businessScenes);

  const entitySummaries = {
    risks: summarizeEntity("risks", BREAK.risks),
    avoidances: summarizeEntity("avoidances", BREAK.avoidances),
    attackTools: summarizeEntity("attackTools", BREAK.attackTools),
    threatActors: summarizeEntity("threatActors", BREAK.threatActors),
    businessScenes: {
      key: "businessScenes",
      total: businessSceneEntries.length,
      main: businessSceneEntries.length,
      sub: 0,
      withReferences: 0,
      references: 0,
      referenceCoverageRate: 0,
    },
  };

  const referenceEntities = [
    entitySummaries.risks,
    entitySummaries.avoidances,
    entitySummaries.attackTools,
    entitySummaries.threatActors,
  ];
  const referenceTotal = referenceEntities.reduce((sum, item) => sum + item.references, 0);
  const entitiesWithReferences = referenceEntities.reduce((sum, item) => sum + item.withReferences, 0);
  const entitiesChecked = referenceEntities.reduce((sum, item) => sum + item.total, 0);

  const complexityCounts = riskEntries.reduce<Record<string, number>>((acc, { entity }) => {
    const key = String(entity.complexity || "unknown").trim() || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const riskComplexity = Object.entries(complexityCounts)
    .map(([key, count]) => ({ key, label: key, count, rate: percent(count, riskEntries.length) }))
    .sort((a, b) => b.count - a.count);

  const avoidanceCategories = valuesOf(BREAK.avoidanceCategories)
    .map(({ key, entity }) => {
      const count = avoidanceEntries.filter(({ entity: avoidance }) => avoidance.category === key).length;
      return {
        key,
        label: entity.title || key,
        count,
        rate: percent(count, avoidanceEntries.length),
      };
    })
    .sort((a, b) => b.count - a.count);

  const relationCoverage = [
    summarizeCoverage("Risk.avoidances", BREAK.risks, "avoidances"),
    summarizeCoverage("AttackTool.directCauseRisks", BREAK.attackTools, "directCauseRisks"),
    summarizeCoverage("AttackTool.indirectSupportRisks", BREAK.attackTools, "indirectSupportRisks"),
    summarizeCoverage("AttackTool.avoidances", BREAK.attackTools, "avoidances"),
    summarizeCoverage("ThreatActor.buildAttackTools", BREAK.threatActors, "buildAttackTools"),
    summarizeCoverage("ThreatActor.useAttackTools", BREAK.threatActors, "useAttackTools"),
    summarizeCoverage("ThreatActor.directCauseRisks", BREAK.threatActors, "directCauseRisks"),
    summarizeCoverage("ThreatActor.indirectSupportRisks", BREAK.threatActors, "indirectSupportRisks"),
  ];

  const businessSceneCoverage = businessSceneEntries
    .map(({ key, entity }) => {
      const risks = collectBusinessSceneRisks(entity);
      const uniqueRisks = unique(risks);
      return {
        key,
        title: entity.title || key,
        riskCount: risks.length,
        uniqueRiskCount: uniqueRisks.length,
        duplicateRiskCount: risks.length - uniqueRisks.length,
        dimensionCount: Object.keys(entity.riskDimensions || {}).length,
        sceneCount: Object.keys(entity.riskScenes || {}).length,
      };
    })
    .sort((a, b) => b.uniqueRiskCount - a.uniqueRiskCount);

  const degreeMap = new Map<string, { type: DashboardMetrics["highDegreeNodes"][number]["type"]; key: string; degree: number }>();
  const addDegree = (type: DashboardMetrics["highDegreeNodes"][number]["type"], key: string, amount = 1) => {
    const id = `${type}:${key}`;
    const current = degreeMap.get(id) || { type, key, degree: 0 };
    current.degree += amount;
    degreeMap.set(id, current);
  };

  riskEntries.forEach(({ key, entity }) => {
    addDegree("risk", key, entity.avoidances?.length || 0);
    (entity.avoidances || []).forEach((avoidanceKey: string) => addDegree("avoidance", avoidanceKey));
  });
  attackToolEntries.forEach(({ key, entity }) => {
    const riskRefs = [...(entity.directCauseRisks || []), ...(entity.indirectSupportRisks || [])];
    const avoidanceRefs = entity.avoidances || [];
    addDegree("attackTool", key, riskRefs.length + avoidanceRefs.length);
    riskRefs.forEach((riskKey: string) => addDegree("risk", riskKey));
    avoidanceRefs.forEach((avoidanceKey: string) => addDegree("avoidance", avoidanceKey));
  });
  threatActorEntries.forEach(({ key, entity }) => {
    const toolRefs = [...(entity.buildAttackTools || []), ...(entity.useAttackTools || [])];
    const riskRefs = [...(entity.directCauseRisks || []), ...(entity.indirectSupportRisks || [])];
    addDegree("threatActor", key, toolRefs.length + riskRefs.length);
    toolRefs.forEach((attackToolKey: string) => addDegree("attackTool", attackToolKey));
    riskRefs.forEach((riskKey: string) => addDegree("risk", riskKey));
  });

  const highDegreeNodes = [...degreeMap.values()]
    .filter(({ degree }) => degree > 0)
    .sort((a, b) => b.degree - a.degree)
    .slice(0, 12);

  return {
    generatedAt: new Date().toISOString(),
    entities: entitySummaries,
    reference: {
      total: referenceTotal,
      entitiesWithReferences,
      entitiesChecked,
      coverageRate: percent(entitiesWithReferences, entitiesChecked),
    },
    riskComplexity,
    avoidanceCategories,
    relationCoverage,
    businessSceneCoverage,
    highDegreeNodes: highDegreeNodes.map((item) => ({
      ...item,
      key: `${item.key} ${titleFor(
        item.type === "risk"
          ? BREAK.risks
          : item.type === "avoidance"
            ? BREAK.avoidances
            : item.type === "attackTool"
              ? BREAK.attackTools
              : BREAK.threatActors,
        item.key
      )}`,
    })),
  };
}

export type { DashboardMetrics, EntitySummary, CoverageSummary };
