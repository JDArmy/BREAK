import BREAK from "@/BREAK";
import type { EntityType } from "@/BREAK/entityRegistry";

export type BusinessDomainImpactRisk = {
  id: string;
  title: string;
  sourceFields: string[];
};

export type BusinessDomainImpactRiskScene = {
  id: string;
  title: string;
  riskCount: number;
  risks: BusinessDomainImpactRisk[];
};

export type BusinessDomainImpactItem = {
  id: string;
  title: string;
  dimensionTitles: string[];
  riskCount: number;
  riskSceneCount: number;
  riskScenes: BusinessDomainImpactRiskScene[];
};

export type BusinessDomainImpactSummary = {
  title: string;
  summary: string;
  metrics: Array<{ label: string; value: number }>;
  items: BusinessDomainImpactItem[];
  risks: BusinessDomainImpactRisk[];
  notice?: string;
};

type Translate = (key: string, params?: Record<string, unknown>) => string;

type RiskSceneLocation = {
  businessDomainId: string;
  riskDimensionId: string;
  riskSceneId: string;
};

const IMPACTED_RISK_PREVIEW_LIMIT = 12;
const unique = (values: string[]) => [...new Set(values)];
const sortById = <T extends { id: string }>(values: T[]) =>
  [...values].sort((first, second) =>
    first.id.localeCompare(second.id, undefined, { numeric: true, sensitivity: "base" }),
  );

const buildBusinessDomainIndex = () => {
  const riskToLocations = new Map<string, RiskSceneLocation[]>();
  const parentToChildren = new Map<string, string[]>();

  Object.keys(BREAK.risks).forEach((riskKey) => {
    if (!riskKey.includes("-")) return;
    const parentKey = riskKey.split("-")[0];
    parentToChildren.set(parentKey, [...(parentToChildren.get(parentKey) ?? []), riskKey]);
  });

  const addLocation = (riskKey: string, location: RiskSceneLocation) => {
    riskToLocations.set(riskKey, [...(riskToLocations.get(riskKey) ?? []), location]);
  };

  Object.entries(BREAK.businessDomains).forEach(([businessDomainId, domain]) => {
    Object.entries(domain.riskDimensions).forEach(([riskDimensionId, dimension]) => {
      dimension.riskScenes.forEach((riskSceneId) => {
        const riskScene = domain.riskScenes[riskSceneId];
        if (!riskScene) return;
        const risksInScene = new Set(riskScene.risks);

        riskScene.risks.forEach((riskKey) => {
          const location = { businessDomainId, riskDimensionId, riskSceneId };
          addLocation(riskKey, location);
          parentToChildren.get(riskKey)?.forEach((childKey) => {
            if (!risksInScene.has(childKey)) addLocation(childKey, location);
          });
        });
      });
    });
  });

  return riskToLocations;
};

const riskToLocations = buildBusinessDomainIndex();

const collectImpactedRisks = (
  entityType: EntityType,
  entityId: string,
  getRiskTitle: (riskId: string) => string,
  caseRelatedRisks: string[],
) => {
  const risks = new Map<string, BusinessDomainImpactRisk>();
  const addRisk = (riskId: string, sourceFields: string[]) => {
    if (!(riskId in BREAK.risks)) return;
    const existing = risks.get(riskId);
    if (existing) {
      existing.sourceFields = unique([...existing.sourceFields, ...sourceFields]);
      return;
    }
    risks.set(riskId, { id: riskId, title: getRiskTitle(riskId), sourceFields });
  };

  if (entityType === "risk") addRisk(entityId, ["selected node"]);
  if (entityType === "avoidance") {
    Object.entries(BREAK.risks).forEach(([riskId, risk]) => {
      if (risk.avoidances.includes(entityId)) addRisk(riskId, ["Risk.avoidances"]);
    });
  }
  if (entityType === "attackTool") {
    const entity = BREAK.attackTools[entityId as keyof typeof BREAK.attackTools];
    entity?.directCauseRisks.forEach((riskId) => addRisk(riskId, ["AttackTool.directCauseRisks"]));
    entity?.indirectSupportRisks.forEach((riskId) => addRisk(riskId, ["AttackTool.indirectSupportRisks"]));
  }
  if (entityType === "threatActor") {
    const entity = BREAK.threatActors[entityId as keyof typeof BREAK.threatActors];
    entity?.directCauseRisks.forEach((riskId) => addRisk(riskId, ["ThreatActor.directCauseRisks"]));
    entity?.indirectSupportRisks.forEach((riskId) => addRisk(riskId, ["ThreatActor.indirectSupportRisks"]));
  }
  if (entityType === "term") {
    BREAK.terms[entityId as keyof typeof BREAK.terms]?.relatedRisks.forEach((riskId) =>
      addRisk(riskId, ["Term.relatedRisks"]),
    );
  }
  if (entityType === "case") {
    caseRelatedRisks.forEach((riskId) => addRisk(riskId, ["Case.relatedRisks"]));
  }

  return sortById([...risks.values()]);
};

const aggregateBusinessDomains = (risks: BusinessDomainImpactRisk[], t: Translate) => {
  const domains = new Map<string, BusinessDomainImpactItem>();

  risks.forEach((risk) => {
    (riskToLocations.get(risk.id) ?? []).forEach((location) => {
      const domain = domains.get(location.businessDomainId) ?? {
        id: location.businessDomainId,
        title: t(`BREAK.businessDomains.${location.businessDomainId}.title`),
        dimensionTitles: [],
        riskCount: 0,
        riskSceneCount: 0,
        riskScenes: [],
      };
      const dimensionTitle = t(
        `BREAK.businessDomains.${location.businessDomainId}.riskDimensions.${location.riskDimensionId}.title`,
      );
      if (!domain.dimensionTitles.includes(dimensionTitle)) domain.dimensionTitles.push(dimensionTitle);

      const riskScene = domain.riskScenes.find((item) => item.id === location.riskSceneId);
      if (riskScene) {
        if (!riskScene.risks.some((item) => item.id === risk.id)) riskScene.risks.push(risk);
      } else {
        domain.riskScenes.push({
          id: location.riskSceneId,
          title: t(
            `BREAK.businessDomains.${location.businessDomainId}.riskScenes.${location.riskSceneId}.title`,
          ),
          riskCount: 0,
          risks: [risk],
        });
      }
      domains.set(location.businessDomainId, domain);
    });
  });

  return sortById([...domains.values()]).map((domain) => ({
    ...domain,
    dimensionTitles: [...domain.dimensionTitles].sort(),
    riskCount: unique(domain.riskScenes.flatMap((scene) => scene.risks.map((risk) => risk.id))).length,
    riskSceneCount: domain.riskScenes.length,
    riskScenes: sortById(domain.riskScenes).map((scene) => ({
      ...scene,
      riskCount: scene.risks.length,
      risks: sortById(scene.risks).slice(0, IMPACTED_RISK_PREVIEW_LIMIT),
    })),
  }));
};

export const buildBusinessDomainImpact = ({
  entityType,
  entityId,
  entityTitle,
  getRiskTitle,
  t,
  caseRelatedRisks = [],
}: {
  entityType: EntityType;
  entityId: string;
  entityTitle: string;
  getRiskTitle: (riskId: string) => string;
  t: Translate;
  caseRelatedRisks?: string[];
}): BusinessDomainImpactSummary => {
  const risks = collectImpactedRisks(entityType, entityId, getRiskTitle, caseRelatedRisks);
  const items = aggregateBusinessDomains(risks, t);
  const riskSceneCount = unique(items.flatMap((item) => item.riskScenes.map((scene) => scene.id))).length;

  return {
    title: t("relationView.businessDomainImpactTitle", { title: entityTitle }),
    summary: items.length
      ? t("relationView.businessDomainImpactSummary", {
          businessDomains: items.length,
          dimensions: unique(items.flatMap((item) => item.dimensionTitles)).length,
        })
      : t("relationView.businessDomainImpactSummaryEmpty"),
    metrics: [
      { label: t("relationView.businessDomainImpactMetricBusinessDomain"), value: items.length },
      { label: t("relationView.businessDomainImpactMetricRiskScene"), value: riskSceneCount },
      { label: t("relationView.businessDomainImpactMetricRisk"), value: risks.length },
    ],
    items,
    risks,
    notice: items.length ? undefined : t("relationView.businessDomainImpactNoticeEmpty"),
  };
};
