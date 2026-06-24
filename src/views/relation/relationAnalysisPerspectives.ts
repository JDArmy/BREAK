import {
  RelationType,
  type NetworkLayoutMode,
} from "@/views/relation/relationTypes";
import type { RelationViewMode } from "@/views/relation/relationViewState";

export type RelationAnalysisPerspective =
  | "risk"
  | "attackPath"
  | "defenseCoverage";

export interface RelationAnalysisPerspectiveOption {
  key: RelationAnalysisPerspective;
  titleKey: string;
  descriptionKey: string;
  defaultView: RelationViewMode;
  networkLayout: NetworkLayoutMode;
  relationTypes: RelationType[];
  lineTypes: string[];
  showSubNode: boolean;
  showRelatedEntity: boolean;
}

export const relationAnalysisPerspectiveOptions: RelationAnalysisPerspectiveOption[] =
  [
    {
      key: "risk",
      titleKey: "relationView.perspective.risk.title",
      descriptionKey: "relationView.perspective.risk.description",
      defaultView: "network",
      networkLayout: "horizontal",
      relationTypes: [
        RelationType.risk,
        RelationType.attackTool,
        RelationType.threatActor,
        RelationType.avoidance,
      ],
      lineTypes: [
        "relationLine.directCauseRisk",
        "relationLine.indirectSupportRisk",
        "relationLine.causeRisk",
        "relationLine.avoidanceMeans",
        "relationLine.riskPrerequisite",
        "relationLine.riskCoOccurrence",
        "relationLine.riskEscalation",
      ],
      showSubNode: true,
      showRelatedEntity: true,
    },
    {
      key: "attackPath",
      titleKey: "relationView.perspective.attackPath.title",
      descriptionKey: "relationView.perspective.attackPath.description",
      defaultView: "sankey",
      networkLayout: "horizontal",
      relationTypes: [
        RelationType.threatActor,
        RelationType.attackTool,
        RelationType.risk,
        RelationType.avoidance,
      ],
      lineTypes: [
        "relationLine.buildAttackTool",
        "relationLine.useAttackTool",
        "relationLine.directCauseRisk",
        "relationLine.indirectSupportRisk",
        "relationLine.causeRisk",
        "relationLine.avoidanceMeans",
      ],
      showSubNode: false,
      showRelatedEntity: false,
    },
    {
      key: "defenseCoverage",
      titleKey: "relationView.perspective.defenseCoverage.title",
      descriptionKey: "relationView.perspective.defenseCoverage.description",
      defaultView: "analysis",
      networkLayout: "force",
      relationTypes: [
        RelationType.risk,
        RelationType.avoidance,
        RelationType.attackTool,
        RelationType.threatActor,
      ],
      lineTypes: [
        "relationLine.avoidanceMeans",
        "relationLine.directCauseRisk",
        "relationLine.indirectSupportRisk",
        "relationLine.avoidanceComplement",
        "relationLine.avoidanceAlternative",
        "relationLine.avoidanceMitigatesGap",
      ],
      showSubNode: false,
      showRelatedEntity: true,
    },
  ];

const relationAnalysisPerspectiveKeys = relationAnalysisPerspectiveOptions.map(
  (option) => option.key,
);

export const normalizeRelationAnalysisPerspective = (
  value: unknown,
  fallback: RelationAnalysisPerspective = "risk",
): RelationAnalysisPerspective =>
  typeof value === "string" &&
  relationAnalysisPerspectiveKeys.includes(
    value as RelationAnalysisPerspective,
  )
    ? (value as RelationAnalysisPerspective)
    : fallback;

export const getRelationAnalysisPerspectiveOption = (
  perspective: RelationAnalysisPerspective,
) =>
  relationAnalysisPerspectiveOptions.find((option) => option.key === perspective) ??
  relationAnalysisPerspectiveOptions[0];

export const getRelationAnalysisPerspectiveByView = (
  view: RelationViewMode,
): RelationAnalysisPerspective =>
  relationAnalysisPerspectiveOptions.find((option) => option.defaultView === view)
    ?.key ?? "risk";
