const RELATION_PERF_PREFIX = "[RelationPerf]";

let navigationStart = 0;
let navigationSource = "";

const now = () =>
  typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();

const round = (value: number) => Math.round(value * 100) / 100;

export const markRelationPerfStart = (source: string, details?: Record<string, unknown>) => {
  navigationStart = now();
  navigationSource = source;
  console.info(RELATION_PERF_PREFIX, "navigation start", {
    source,
    ...details,
  });
};

export const ensureRelationPerfStart = (source: string, details?: Record<string, unknown>) => {
  if (!navigationStart) {
    markRelationPerfStart(source, details);
  }
};

export const relationPerfNow = now;

export const logRelationPerf = (
  label: string,
  details?: Record<string, unknown>,
  startedAt?: number
) => {
  const current = now();
  console.info(RELATION_PERF_PREFIX, label, {
    ...(startedAt === undefined ? {} : { durationMs: round(current - startedAt) }),
    ...(navigationStart ? { sinceNavigationStartMs: round(current - navigationStart) } : {}),
    ...(navigationSource ? { navigationSource } : {}),
    ...details,
  });
};

export const measureRelationPerf = (
  label: string,
  startedAt: number,
  details?: Record<string, unknown>
) => {
  logRelationPerf(label, details, startedAt);
};
