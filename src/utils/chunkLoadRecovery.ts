import { defineAsyncComponent, type AsyncComponentLoader, type Component } from "vue";
import { ElMessage } from "element-plus";
import AsyncComponentError from "@/components/AsyncComponentError.vue";
import AsyncComponentLoading from "@/components/AsyncComponentLoading.vue";
import {
  applyPendingAppUpdate,
  hasPendingAppUpdate,
} from "@/utils/appUpdate";

const CHUNK_RELOAD_KEY = "__break_chunk_reload__";
const CHUNK_RELOAD_COOLDOWN_MS = 2 * 60 * 1000;

interface ChunkReloadRecord {
  path: string;
  time: number;
}

const getCurrentPath = () =>
  window.location.hash.slice(1) || window.location.pathname || "/";

const getLoadFailedMessage = () =>
  navigator.language?.startsWith("en")
    ? "Page resources were updated. Reloading the page."
    : "页面资源已更新，正在重新加载。";

const getManualReloadMessage = () =>
  navigator.language?.startsWith("en")
    ? "Page resources failed to load. Please refresh the page."
    : "页面资源加载失败，请刷新页面。";

const readReloadRecord = (): ChunkReloadRecord | null => {
  const raw = sessionStorage.getItem(CHUNK_RELOAD_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<ChunkReloadRecord>;
    if (typeof parsed.path === "string" && typeof parsed.time === "number") {
      return { path: parsed.path, time: parsed.time };
    }
  } catch {
    // 兼容旧版本只存路径的格式。
    return { path: raw, time: Date.now() };
  }

  return null;
};

const writeReloadRecord = (path: string) => {
  sessionStorage.setItem(
    CHUNK_RELOAD_KEY,
    JSON.stringify({ path, time: Date.now() } satisfies ChunkReloadRecord),
  );
};

export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message;
  return (
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Loading chunk [\w.-]+ failed/i.test(msg) ||
    /Loading CSS chunk [\w.-]+ failed/i.test(msg) ||
    /Importing a module script failed/i.test(msg)
  );
}

export function recoverFromChunkLoadError(error: unknown, source = "unknown") {
  if (!isChunkLoadError(error)) return false;

  const currentPath = getCurrentPath();
  const reloadRecord = readReloadRecord();
  console.warn("[BREAK] Chunk 加载失败:", {
    source,
    path: currentPath,
    error: error instanceof Error ? error.message : String(error),
  });

  if (
    !reloadRecord ||
    reloadRecord.path !== currentPath ||
    Date.now() - reloadRecord.time > CHUNK_RELOAD_COOLDOWN_MS
  ) {
    writeReloadRecord(currentPath);
    ElMessage({
      message: getLoadFailedMessage(),
      type: "info",
      plain: true,
      duration: 1800,
      grouping: true,
    });
    window.setTimeout(() => window.location.reload(), 100);
    return true;
  }

  sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  ElMessage({
    message: getManualReloadMessage(),
    type: "error",
    plain: true,
    duration: 8000,
    grouping: true,
  });
  return true;
}

export function clearChunkReloadMark() {
  sessionStorage.removeItem(CHUNK_RELOAD_KEY);
}

export function createRecoverableAsyncComponent<T extends Component = Component>(
  loader: AsyncComponentLoader<T>,
  errorComponent: Component = AsyncComponentError,
  source = "async-component",
) {
  return defineAsyncComponent({
    loader: () => {
      if (hasPendingAppUpdate() && applyPendingAppUpdate(`async:${source}`)) {
        return new Promise<T>(() => {
          // 页面即将由新 Service Worker 接管并刷新，不再请求旧版本 chunk。
        });
      }
      return loader();
    },
    loadingComponent: AsyncComponentLoading,
    errorComponent,
    delay: 150,
    onError(error, _retry, fail) {
      if (recoverFromChunkLoadError(error, source)) {
        return;
      }
      fail();
    },
  });
}
