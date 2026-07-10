import { ElMessage } from "element-plus";

const ACTIVITY_IDLE_MS = 8000;
const UPDATE_NOTICE_DELAY_MS = 90000;
const RETRY_DELAY_MS = 2000;
const DEV_SW_RELOAD_KEY = "break-dev-sw-cleanup-reloaded";

type WaitingWorker = ServiceWorker & { postMessage(message: unknown): void };

let waitingWorker: WaitingWorker | null = null;
let refreshing = false;
let schedulePendingApply: (() => void) | null = null;

const getUpdateMessage = () =>
  navigator.language?.startsWith("en")
    ? "New version detected. It will be applied when the page is idle."
    : "发现新版本，将在页面空闲时自动更新。";

const isTextInputActive = () => {
  const active = document.activeElement as HTMLElement | null;
  if (!active) return false;
  if (active.isContentEditable) return true;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName);
};

const hasActiveOverlay = () =>
  Boolean(
    document.querySelector(
      ".el-drawer, .el-dialog, .el-message-box, [role='dialog'], [aria-modal='true']",
    ),
  );

export async function cleanupDevelopmentServiceWorker(
  reload = () => window.location.reload(),
) {
  if (!("serviceWorker" in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  const breakCacheKeys =
    "caches" in window
      ? (await caches.keys()).filter((key) => key.startsWith("break-"))
      : [];

  await Promise.all([
    ...registrations.map((registration) => registration.unregister()),
    ...breakCacheKeys.map((key) => caches.delete(key)),
  ]);

  if (!navigator.serviceWorker.controller) {
    sessionStorage.removeItem(DEV_SW_RELOAD_KEY);
    return;
  }
  if (sessionStorage.getItem(DEV_SW_RELOAD_KEY) === "1") return;

  sessionStorage.setItem(DEV_SW_RELOAD_KEY, "1");
  reload();
}

export function setupAppUpdate() {
  if (!("serviceWorker" in navigator)) return;
  if (import.meta.env.DEV) {
    void cleanupDevelopmentServiceWorker().catch((err) => {
      console.warn("[BREAK] 开发环境 Service Worker 清理失败:", err);
    });
    return;
  }

  let lastActivityAt = Date.now();
  let noticeTimer: ReturnType<typeof setTimeout> | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  const markActivity = () => {
    lastActivityAt = Date.now();
  };

  const canApplySilently = () => {
    if (document.visibilityState === "hidden") return true;
    if (isTextInputActive()) return false;
    if (hasActiveOverlay()) return false;
    return Date.now() - lastActivityAt >= ACTIVITY_IDLE_MS;
  };

  const applyWaitingWorker = () => {
    if (!waitingWorker || refreshing) return;
    refreshing = true;
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
  };

  const scheduleApply = () => {
    if (!waitingWorker || refreshing) return;
    if (canApplySilently()) {
      applyWaitingWorker();
      return;
    }
    if (retryTimer !== null) return;
    retryTimer = window.setTimeout(() => {
      retryTimer = null;
      scheduleApply();
    }, RETRY_DELAY_MS);
  };
  schedulePendingApply = scheduleApply;

  const setWaitingWorker = (worker: ServiceWorker) => {
    waitingWorker = worker as WaitingWorker;
    if (noticeTimer === null) {
      noticeTimer = window.setTimeout(() => {
        if (!waitingWorker || refreshing) return;
        ElMessage({
          message: getUpdateMessage(),
          type: "info",
          plain: true,
          duration: 6000,
          grouping: true,
        });
      }, UPDATE_NOTICE_DELAY_MS);
    }
    scheduleApply();
  };

  ["click", "keydown", "pointerdown", "scroll", "touchstart"].forEach((eventName) => {
    window.addEventListener(eventName, markActivity, { passive: true, capture: true });
  });
  document.addEventListener("visibilitychange", scheduleApply);

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!refreshing) return;
    window.location.reload();
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then((registration) => {
        if (registration.waiting && navigator.serviceWorker.controller) {
          setWaitingWorker(registration.waiting);
        }

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              setWaitingWorker(newWorker);
            }
          });
        });
      })
      .catch((err) => {
        console.warn("[BREAK] Service Worker 注册失败:", err);
      });
  });
}

export function hasPendingAppUpdate() {
  return Boolean(waitingWorker && !refreshing);
}

export function applyPendingAppUpdate(source = "manual") {
  if (!waitingWorker || refreshing) return false;

  refreshing = true;
  console.info("[BREAK] 应用待更新版本:", source);
  ElMessage({
    message: navigator.language?.startsWith("en")
      ? "New version detected. Updating now."
      : "发现新版本，正在更新。",
    type: "info",
    plain: true,
    duration: 1800,
    grouping: true,
  });
  waitingWorker.postMessage({ type: "SKIP_WAITING" });
  return true;
}

export function schedulePendingAppUpdate() {
  schedulePendingApply?.();
}
