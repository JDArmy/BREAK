import type { CaseEntity } from "../types";

// 案例数据量大（1797 条，~3MB），采用懒加载：不在首页 eager 加载，
// 仅在访问 /cases、搜索、相关案例反查时通过 loadCases() 按需加载。
// BREAK 主对象不含 cases，由 useCases composable 管理异步加载与缓存。

interface Cases {
  [key: string]: CaseEntity;
}

const caseFiles = import.meta.glob("./C*.json");

let cached: Cases | null = null;
let loadingPromise: Promise<Cases> | null = null;

export async function loadCases(): Promise<Cases> {
  if (cached) return cached;
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    const entries = await Promise.all(
      Object.values(caseFiles).map((loader) => loader())
    );
    const result: Cases = {};
    for (const mod of entries) {
      const data = (mod as { default: Cases }).default;
      Object.assign(result, data);
    }
    cached = result;
    return result;
  })();
  return loadingPromise;
}

export function getCases(): Cases | null {
  return cached;
}

export type { Cases };
