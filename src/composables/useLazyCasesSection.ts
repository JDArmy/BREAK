import { nextTick, onBeforeUnmount, ref, watch, type Ref } from "vue";

// 相关案例 section 滚动懒加载：section 进入详情滚动容器可视区时触发一次加载。
// 详情区是 KnowledgeSplitView 内部的 .knowledge-detail（overflow-y: auto），
// 故 IntersectionObserver 的 root 用 section 最近的 .knowledge-detail 祖先，
// 而非 viewport（否则视口永远可见，无法区分是否滚到）。
// 触发一次后 disconnect；组件卸载时清理 observer。

interface UseLazyCasesSectionReturn {
  sectionRef: Ref<HTMLElement | undefined>;
}

export function useLazyCasesSection(
  trigger: () => void | Promise<void>
): UseLazyCasesSectionReturn {
  const sectionRef = ref<HTMLElement>();
  let observer: IntersectionObserver | null = null;

  const setup = () => {
    const el = sectionRef.value;
    if (!el || observer) return;
    // 滚动根：PC 与移动端详情区都带 .knowledge-detail class
    const root = el.closest<HTMLElement>(".knowledge-detail") ?? null;
    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void trigger();
          observer?.disconnect();
          observer = null;
        }
      },
      { root, rootMargin: "0px 0px 200px 0px" }
    );
    observer.observe(el);
  };

  // section 由 v-if 控制挂载/卸载，watch 其 ref 变化重新建立观察
  watch(
    sectionRef,
    (el) => {
      if (el) nextTick(setup);
    },
    { flush: "post" }
  );

  onBeforeUnmount(() => {
    observer?.disconnect();
    observer = null;
  });

  return { sectionRef };
}
