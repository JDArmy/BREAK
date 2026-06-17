import { computed, type ComputedRef } from "vue";
import BREAK from "@/BREAK";
import {
  RelationType,
  type NodeBusinessSceneImpactSummary,
} from "@/views/relation/relationTypes";

type Translate = (key: string, params?: Record<string, unknown>) => string;

interface CreateRelationBusinessSceneImpactOptions {
  t: Translate;
  selectedNetworkNode: ComputedRef<{ id: string; type: string } | null>;
  getNodeTitle: (
    type: Exclude<RelationType, RelationType.all>,
    key: string
  ) => string;
}

type ImpactRisk = {
  id: string;
  title: string;
  sourceFields: string[];
};

type RiskSceneLocation = {
  businessSceneId: string;
  riskDimensionId: string;
  riskSceneId: string;
};

type AggregatedRiskScene = {
  id: string;
  title: string;
  riskCount: number;
  risks: ImpactRisk[];
};

type AggregatedBusinessScene = {
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
    })
  );

const mergeSourceFields = (existing: string[], incoming: string[]) =>
  unique([...existing, ...incoming]);

const buildBusinessSceneIndex = () => {
  const riskToLocations = new Map<string, RiskSceneLocation[]>();

  Object.entries(BREAK.businessScenes).forEach(([businessSceneId, scene]) => {
    Object.entries(scene.riskDimensions).forEach(([riskDimensionId, dimension]) => {
      dimension.riskScenes.forEach((riskSceneId) => {
        const riskScene = scene.riskScenes[riskSceneId];
        if (!riskScene) return;

        riskScene.risks.forEach((riskKey) => {
          const locations = riskToLocations.get(riskKey) ?? [];
          locations.push({
            businessSceneId,
            riskDimensionId,
            riskSceneId,
          });
          riskToLocations.set(riskKey, locations);
        });
      });
    });
  });

  return { riskToLocations };
};

const businessSceneIndex = buildBusinessSceneIndex();

const buildRisk = (
  id: string,
  sourceFields: string[],
  getNodeTitle: CreateRelationBusinessSceneImpactOptions["getNodeTitle"]
): ImpactRisk => ({
  id,
  title: getNodeTitle(RelationType.risk, id),
  sourceFields,
});

const collectImpactedRisks = (
  relType: RelationType,
  relKey: string,
  getNodeTitle: CreateRelationBusinessSceneImpactOptions["getNodeTitle"]
): ImpactRisk[] => {
  const riskMap = new Map<string, ImpactRisk>();
  const addRisk = (riskKey: string, sourceFields: string[]) => {
    if (!(riskKey in BREAK.risks)) return;
    const existing = riskMap.get(riskKey);
    if (existing) {
      existing.sourceFields = mergeSourceFields(existing.sourceFields, sourceFields);
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
    const attackTool = BREAK.attackTools[relKey as keyof typeof BREAK.attackTools];
    attackTool?.directCauseRisks.forEach((riskKey) =>
      addRisk(riskKey, ["AttackTool.directCauseRisks"])
    );
    attackTool?.indirectSupportRisks.forEach((riskKey) =>
      addRisk(riskKey, ["AttackTool.indirectSupportRisks"])
    );
  }

  if (relType === RelationType.threatActor) {
    const threatActor = BREAK.threatActors[relKey as keyof typeof BREAK.threatActors];
    threatActor?.directCauseRisks.forEach((riskKey) =>
      addRisk(riskKey, ["ThreatActor.directCauseRisks"])
    );
    threatActor?.indirectSupportRisks.forEach((riskKey) =>
      addRisk(riskKey, ["ThreatActor.indirectSupportRisks"])
    );
  }

  if (relType === RelationType.term) {
    const term = BREAK.terms[relKey as keyof typeof BREAK.terms];
    term?.relatedRisks.forEach((riskKey) =>
      addRisk(riskKey, ["Term.relatedRisks"])
    );
  }

  return sortById([...riskMap.values()]);
};

const aggregateBusinessScenes = (risks: ImpactRisk[], t: Translate) => {
  const sceneMap = new Map<string, AggregatedBusinessScene>();

  risks.forEach((risk) => {
    const locations = businessSceneIndex.riskToLocations.get(risk.id) ?? [];
    locations.forEach((location) => {
      const sceneEntry = sceneMap.get(location.businessSceneId) ?? {
        id: location.businessSceneId,
        title: t(`BREAK.businessScenes.${location.businessSceneId}.title`),
        dimensionTitles: [],
        riskScenes: [],
      };

      const dimensionTitle = t(
        `BREAK.businessScenes.${location.businessSceneId}.riskDimensions.${location.riskDimensionId}.title`
      );
      if (!sceneEntry.dimensionTitles.includes(dimensionTitle)) {
        sceneEntry.dimensionTitles.push(dimensionTitle);
      }

      const riskSceneEntry = sceneEntry.riskScenes.find(
        (item) => item.id === location.riskSceneId
      );
      if (riskSceneEntry) {
        if (!riskSceneEntry.risks.some((item) => item.id === risk.id)) {
          riskSceneEntry.risks.push(risk);
        }
      } else {
        sceneEntry.riskScenes.push({
          id: location.riskSceneId,
          title: t(
            `BREAK.businessScenes.${location.businessSceneId}.riskScenes.${location.riskSceneId}.title`
          ),
          riskCount: 0,
          risks: [risk],
        });
      }

      sceneMap.set(location.businessSceneId, sceneEntry);
    });
  });

  return sortById([...sceneMap.values()]).map((scene) => ({
    id: scene.id,
    title: scene.title,
    dimensionTitles: [...scene.dimensionTitles].sort((first, second) =>
      first.localeCompare(second, undefined, { numeric: true, sensitivity: "base" })
    ),
    riskCount: unique(
      scene.riskScenes.flatMap((riskScene) =>
        riskScene.risks.map((risk) => risk.id)
      )
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
  node: { id: string; type: string },
  getNodeTitle: CreateRelationBusinessSceneImpactOptions["getNodeTitle"]
) => {
  if (node.type === RelationType.risk) return getNodeTitle(RelationType.risk, node.id);
  if (node.type === RelationType.avoidance) return getNodeTitle(RelationType.avoidance, node.id);
  if (node.type === RelationType.attackTool) return getNodeTitle(RelationType.attackTool, node.id);
  if (node.type === RelationType.threatActor) return getNodeTitle(RelationType.threatActor, node.id);
  if (node.type === RelationType.term) return getNodeTitle(RelationType.term, node.id);
  return node.id;
};

export const createRelationBusinessSceneImpact = ({
  t,
  selectedNetworkNode,
  getNodeTitle,
}: CreateRelationBusinessSceneImpactOptions) => {
  const selectedNodeBusinessSceneImpactSummary = computed<NodeBusinessSceneImpactSummary | null>(() => {
    const node = selectedNetworkNode.value;
    const supportedTypes = [
      RelationType.risk,
      RelationType.avoidance,
      RelationType.attackTool,
      RelationType.threatActor,
      RelationType.term,
    ];
    if (!node || !supportedTypes.includes(node.type as RelationType)) return null;

    const impactedRisks = collectImpactedRisks(
      node.type as RelationType,
      node.id,
      getNodeTitle
    );
    const items = aggregateBusinessScenes(impactedRisks, t);
    const riskSceneCount = unique(
      items.flatMap((item) => item.riskScenes.map((riskScene) => riskScene.id))
    ).length;
    const title = getSelectedNodeTitle(node, getNodeTitle);

    return {
      title: t("relationView.businessSceneImpactTitle", { title }),
      summary:
        items.length > 0
          ? t("relationView.businessSceneImpactSummary", {
              businessScenes: items.length,
              dimensions: unique(items.flatMap((item) => item.dimensionTitles))
                .length,
            })
          : t("relationView.businessSceneImpactSummaryEmpty"),
      metrics: [
        {
          label: t("relationView.businessSceneImpactMetricBusinessScene"),
          value: items.length,
        },
        {
          label: t("relationView.businessSceneImpactMetricRiskScene"),
          value: riskSceneCount,
        },
        {
          label: t("relationView.businessSceneImpactMetricRisk"),
          value: impactedRisks.length,
        },
      ],
      items,
      risks: impactedRisks,
      notice:
        items.length === 0
          ? t("relationView.businessSceneImpactNoticeEmpty")
          : undefined,
    };
  });

  return {
    selectedNodeBusinessSceneImpactSummary,
  };
};
