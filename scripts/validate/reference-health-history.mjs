const DAY_MS = 24 * 60 * 60 * 1000;

export function isReusableOkResult(item, { nowMs = Date.now(), ttlDays = 365 } = {}) {
  if (!item || item.issue !== 'ok') return false;
  const checkedAtMs = Date.parse(item.checkedAt || '');
  if (!Number.isFinite(checkedAtMs)) return false;
  const ageMs = nowMs - checkedAtMs;
  return ageMs >= 0 && ageMs <= ttlDays * DAY_MS;
}

export function reuseHistoryResult(reference, historyItem) {
  return {
    ...reference,
    ok: true,
    status: historyItem.status,
    finalUrl: historyItem.finalUrl || reference.link,
    issue: 'ok',
    checkedAt: historyItem.checkedAt,
    reused: true,
  };
}

export function toHistoryResult(item) {
  const result = {
    link: item.link,
    ok: Boolean(item.ok),
    status: item.status || 0,
    finalUrl: item.finalUrl || '',
    issue: item.issue || 'unknown',
    checkedAt: item.checkedAt || '',
  };
  if (item.error) result.error = item.error;
  return result;
}

export function mergeHistoryResults(existingResults, checkedResults) {
  const byLink = new Map();
  for (const item of existingResults || []) {
    if (item?.link) byLink.set(item.link, toHistoryResult(item));
  }
  for (const item of checkedResults || []) {
    if (item?.link) byLink.set(item.link, toHistoryResult(item));
  }
  return [...byLink.values()].sort((a, b) => a.link.localeCompare(b.link));
}
