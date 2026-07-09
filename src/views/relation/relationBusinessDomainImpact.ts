import { computed, type ComputedRef } from "vue";
import BREAK from "@/BREAK";
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

type ImpactRisk = {
  id: string;
  title: string;
  sourceFields: string[];
};

type RiskSceneLocation = {
  businessDomainId: string;
  riskDimensionId: string;
  riskSceneId: string;
};

type AggregatedRiskScene = {
  id: string;
  title: string;
  riskCount: number;
  risks: ImpactRisk[];
};

type AggregatedBusinessDomain = {
  id: string;
  title: string;
  dimensionTitles: string[];
  riskScenes: AggregatedRiskScene[];
};

const IMPACTED_RISK_PREVIEW_LIMIT = 12;

const unique = (values: string[]) => [...new Set(values)];

const sortById = <T extends { id: string }>(values: T[]) =>
  [...values].sort((first, second) =>
    first.id.localeCompare(second.id, undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );

const mergeSourceFields = (existing: string[], incoming: string[]) =>
  unique([...existing, ...incoming]);

const buildBusinessDomainIndex = () => {
  const riskToLocations = new Map<string, RiskSceneLocation[]>();

  // 预计算父风险 → 子风险映射，用于将父风险的业务域归类自动扩展到子风险
  const parentToChildren = new Map<string, string[]>();
  Object.keys(BREAK.risks).forEach((riskKey) => {
    if (!riskKey.includes("-")) return;
    const parentKey = riskKey.split("-")[0];
    const children = parentToChildren.get(parentKey) ?? [];
    children.push(riskKey);
    parentToChildren.set(parentKey, children);
  });

  const addLocation = (riskKey: string, location: RiskSceneLocation) => {
    const locations = riskToLocations.get(riskKey) ?? [];
    locations.push(location);
    riskToLocations.set(riskKey, locations);
  };

  Object.entries(BREAK.businessDomains).forEach(([businessDomainId, scene]) => {
    Object.entries(scene.riskDimensions).forEach(
      ([riskDimensionId, dimension]) => {
        dimension.riskScenes.forEach((riskSceneId) => {
          const riskScene = scene.riskScenes[riskSceneId];
          if (!riskScene) return;

          const risksInScene = new Set(riskScene.risks);

          riskScene.risks.forEach((riskKey) => {
            const location: RiskSceneLocation = {
              businessDomainId,
              riskDimensionId,
              riskSceneId,
            };
            addLocation(riskKey, location);

            // 父风险的业务域归类自动扩展到子风险（BD 数据中只保留父风险 ID，
            // 子风险由此处自动继承，避免数据层重复维护）
            const children = parentToChildren.get(riskKey);
            if (children) {
              children.forEach((childKey) => {
                if (!risksInScene.has(childKey)) {
                  addLocation(childKey, location);
                }
              });
            }
          });
        });
      },
    );
  });

  return { riskToLocations };
};

const businessDomainIndex = buildBusinessDomainIndex();

const buildRisk = (
  id: string,
  sourceFields: string[],
  getNodeTitle: CreateRelationBusinessDomainImpactOptions["getNodeTitle"],
): ImpactRisk => ({
  id,
  title: getNodeTitle(RelationType.risk, id),
  sourceFields,
});

const collectImpactedRisks = (
  relType: RelationType,
  relKey: string,
  getNodeTitle: CreateRelationBusinessDomainImpactOptions["getNodeTitle"],
): ImpactRisk[] => {
  const riskMap = new Map<string, ImpactRisk>();
  const addRisk = (riskKey: string, sourceFields: string[]) => {
    if (!(riskKey in BREAK.risks)) return;
    const existing = riskMap.get(riskKey);
    if (existing) {
      existing.sourceFields = mergeSourceFields(
        existing.sourceFields,
        sourceFields,
      );
      return;
    }
    riskMap.set(riskKey, buildRisk(riskKey, sourceFields, getNodeTitle));
  };

  if (relType === RelationType.risk) {
    addRisk(relKey, ["selected node"]);
  }

  if (relType === RelationType.avoidance) {
    Object.entries(BREAK.risks).forEach(([riskKey, risk]) => {
      if (risk.avoidances.includes(relKey)) {
        addRisk(riskKey, ["Risk.avoidances"]);
      }
    });
  }

  if (relType === RelationType.attackTool) {
    const attackTool =
      BREAK.attackTools[relKey as keyof typeof BREAK.attackTools];
    attackTool?.directCauseRisks.forEach((riskKey) =>
      addRisk(riskKey, ["AttackTool.directCauseRisks"]),
    );
    attackTool?.indirectSupportRisks.forEach((riskKey) =>
      addRisk(riskKey, ["AttackTool.indirectSupportRisks"]),
    );
  }

  if (relType === RelationType.threatActor) {
    const threatActor =
      BREAK.threatActors[relKey as keyof typeof BREAK.threatActors];
    threatActor?.directCauseRisks.forEach((riskKey) =>
      addRisk(riskKey, ["ThreatActor.directCauseRisks"]),
    );
    threatActor?.indirectSupportRisks.forEach((riskKey) =>
      addRisk(riskKey, ["ThreatActor.indirectSupportRisks"]),
    );
  }

  if (relType === RelationType.term) {
    const term = BREAK.terms[relKey as keyof typeof BREAK.terms];
    term?.relatedRisks.forEach((riskKey) =>
      addRisk(riskKey, ["Term.relatedRisks"]),
    );
  }

  return sortById([...riskMap.values()]);
};

const aggregateBusinessDomains = (risks: ImpactRisk[], t: Translate) => {
  const sceneMap = new Map<string, AggregatedBusinessDomain>();

  risks.forEach((risk) => {
    const locations = businessDomainIndex.riskToLocations.get(risk.id) ?? [];
    locations.forEach((location) => {
      const sceneEntry = sceneMap.get(location.businessDomainId) ?? {
        id: location.businessDomainId,
        title: t(`BREAK.businessDomains.${location.businessDomainId}.title`),
        dimensionTitles: [],
        riskScenes: [],
      };

      const dimensionTitle = t(
        `BREAK.businessDomains.${location.businessDomainId}.riskDimensions.${location.riskDimensionId}.title`,
      );
      if (!sceneEntry.dimensionTitles.includes(dimensionTitle)) {
        sceneEntry.dimensionTitles.push(dimensionTitle);
      }

      const riskSceneEntry = sceneEntry.riskScenes.find(
        (item) => item.id === location.riskSceneId,
      );
      if (riskSceneEntry) {
        if (!riskSceneEntry.risks.some((item) => item.id === risk.id)) {
          riskSceneEntry.risks.push(risk);
        }
      } else {
        sceneEntry.riskScenes.push({
          id: location.riskSceneId,
          title: t(
            `BREAK.businessDomains.${location.businessDomainId}.riskScenes.${location.riskSceneId}.title`,
          ),
          riskCount: 0,
          risks: [risk],
        });
      }

      sceneMap.set(location.businessDomainId, sceneEntry);
    });
  });

  return sortById([...sceneMap.values()]).map((scene) => ({
    id: scene.id,
    title: scene.title,
    dimensionTitles: [...scene.dimensionTitles].sort((first, second) =>
      first.localeCompare(second, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    ),
    riskCount: unique(
      scene.riskScenes.flatMap((riskScene) =>
        riskScene.risks.map((risk) => risk.id),
      ),
    ).length,
    riskSceneCount: scene.riskScenes.length,
    riskScenes: sortById(scene.riskScenes).map((riskScene) => ({
      ...riskScene,
      riskCount: riskScene.risks.length,
      risks: sortById(riskScene.risks).slice(0, IMPACTED_RISK_PREVIEW_LIMIT),
    })),
  }));
};

const getSelectedNodeTitle = (
  node: Node,
  getNodeTitle: CreateRelationBusinessDomainImpactOptions["getNodeTitle"],
) => getNodeTitle(node.type, node.id);

export const createRelationBusinessDomainImpact = ({
  t,
  selectedNetworkNode,
  getNodeTitle,
}: CreateRelationBusinessDomainImpactOptions) => {
  const selectedNodeBusinessDomainImpactSummary =
    computed<NodeBusinessDomainImpactSummary | null>(() => {
      const node = selectedNetworkNode.value;
      if (!node) return null;

      const impactedRisks = collectImpactedRisks(
        node.type,
        node.id,
        getNodeTitle,
      );
      const items = aggregateBusinessDomains(impactedRisks, t);
      const riskSceneCount = unique(
        items.flatMap((item) =>
          item.riskScenes.map((riskScene) => riskScene.id),
        ),
      ).length;
      const title = getSelectedNodeTitle(node, getNodeTitle);

      return {
        title: t("relationView.businessDomainImpactTitle", { title }),
        summary:
          items.length > 0
            ? t("relationView.businessDomainImpactSummary", {
                businessDomains: items.length,
                dimensions: unique(
                  items.flatMap((item) => item.dimensionTitles),
                ).length,
              })
            : t("relationView.businessDomainImpactSummaryEmpty"),
        metrics: [
          {
            label: t("relationView.businessDomainImpactMetricBusinessDomain"),
            value: items.length,
          },
          {
            label: t("relationView.businessDomainImpactMetricRiskScene"),
            value: riskSceneCount,
          },
          {
            label: t("relationView.businessDomainImpactMetricRisk"),
            value: impactedRisks.length,
          },
        ],
        items,
        risks: impactedRisks,
        notice:
          items.length === 0
            ? t("relationView.businessDomainImpactNoticeEmpty")
            : undefined,
      };
    });

  return {
    selectedNodeBusinessDomainImpactSummary,
  };
};
