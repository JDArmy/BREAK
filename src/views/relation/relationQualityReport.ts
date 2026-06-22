export type RelationQualitySeverity = "error" | "review" | "info";

export interface RelationQualityIssue {
  id: string;
  type: string;
  severity: RelationQualitySeverity;
  entityType: string;
  key: string;
  title: string;
  message: string;
  count?: number;
  field?: string;
  relation?: string;
  ref?: string;
}

export interface RelationQualitySummary {
  total: number;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
}

export interface RelationQualityReport {
  schemaVersion: 1;
  generatedAt: string;
  weakRelations: RelationQualityIssue[];
  missingCoverage: RelationQualityIssue[];
  sceneIssues: RelationQualityIssue[];
  i18nIssues: RelationQualityIssue[];
  summary: {
    weakRelations: RelationQualitySummary;
    missingCoverage: RelationQualitySummary;
    sceneIssues: RelationQualitySummary;
    i18nIssues: RelationQualitySummary;
  };
}

export const emptyRelationQualityReport: RelationQualityReport = {
  schemaVersion: 1,
  generatedAt: "",
  weakRelations: [],
  missingCoverage: [],
  sceneIssues: [],
  i18nIssues: [],
  summary: {
    weakRelations: { total: 0, bySeverity: {}, byType: {} },
    missingCoverage: { total: 0, bySeverity: {}, byType: {} },
    sceneIssues: { total: 0, bySeverity: {}, byType: {} },
    i18nIssues: { total: 0, bySeverity: {}, byType: {} },
  },
};

export async function loadRelationQualityReport(): Promise<RelationQualityReport> {
  const response = await fetch("/data/quality-report.json", {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`质量报告加载失败: ${response.status}`);
  }
  return (await response.json()) as RelationQualityReport;
}
