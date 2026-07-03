import { computed, ref } from "vue";

const activeTasks = new Set<string>();
const pendingShowTimers = new Map<string, ReturnType<typeof window.setTimeout>>();
const active = ref(false);
const progress = ref(0);
let trickleTimer: ReturnType<typeof window.setInterval> | null = null;
let hideTimer: ReturnType<typeof window.setTimeout> | null = null;

interface StartTopLoadingOptions {
  delayMs?: number;
}

const stopTrickle = () => {
  if (trickleTimer !== null) {
    window.clearInterval(trickleTimer);
    trickleTimer = null;
  }
};

const startTrickle = () => {
  if (trickleTimer !== null) return;
  trickleTimer = window.setInterval(() => {
    if (!active.value) return;
    if (progress.value < 70) {
      progress.value += 4;
    } else if (progress.value < 88) {
      progress.value += 1;
    }
  }, 450);
};

const show = (initialProgress = 12) => {
  if (hideTimer !== null) {
    window.clearTimeout(hideTimer);
    hideTimer = null;
  }
  active.value = true;
  progress.value = Math.max(progress.value, initialProgress);
  startTrickle();
};

export const topLoadingState = {
  active: computed(() => active.value),
  progress: computed(() => progress.value),
};

const cancelPendingShow = (taskId: string) => {
  const timer = pendingShowTimers.get(taskId);
  if (timer === undefined) return;
  window.clearTimeout(timer);
  pendingShowTimers.delete(taskId);
};

export function startTopLoading(
  taskId: string,
  initialProgress = 12,
  options: StartTopLoadingOptions = {},
) {
  activeTasks.add(taskId);
  cancelPendingShow(taskId);
  if (options.delayMs && options.delayMs > 0 && !active.value) {
    const timer = window.setTimeout(() => {
      pendingShowTimers.delete(taskId);
      if (activeTasks.has(taskId)) {
        show(initialProgress);
      }
    }, options.delayMs);
    pendingShowTimers.set(taskId, timer);
    return;
  }
  show(initialProgress);
}

export function setTopLoadingProgress(taskId: string, nextProgress: number) {
  if (!activeTasks.has(taskId)) return;
  progress.value = Math.max(progress.value, Math.min(96, Math.max(0, nextProgress)));
}

export function finishTopLoading(taskId: string) {
  cancelPendingShow(taskId);
  if (!activeTasks.delete(taskId)) return;
  if (activeTasks.size > 0) return;

  stopTrickle();
  progress.value = 100;
  hideTimer = window.setTimeout(() => {
    active.value = false;
    progress.value = 0;
    hideTimer = null;
  }, 220);
}
