import { computed, ref, toValue, watch, type MaybeRefOrGetter } from "vue";

interface IncrementalVisibleListOptions {
  initialLimit: number;
  step?: number;
  enabled?: MaybeRefOrGetter<boolean>;
}

export function useIncrementalVisibleList<T>(
  items: MaybeRefOrGetter<T[]>,
  {
    initialLimit,
    step = 50,
    enabled = true,
  }: IncrementalVisibleListOptions
) {
  const visibleLimit = ref(initialLimit);
  const sourceItems = computed(() => toValue(items));
  const isEnabled = computed(() => toValue(enabled));

  const visibleItems = computed(() => {
    if (!isEnabled.value) return sourceItems.value;
    return sourceItems.value.slice(0, visibleLimit.value);
  });

  const hiddenCount = computed(() =>
    Math.max(0, sourceItems.value.length - visibleItems.value.length)
  );

  const hasExpanded = computed(() => visibleLimit.value > initialLimit);

  const reset = () => {
    visibleLimit.value = initialLimit;
  };

  const showMoreOrReset = () => {
    if (hiddenCount.value <= 0) {
      reset();
      return;
    }

    visibleLimit.value += step;
  };

  watch([sourceItems, isEnabled], reset);

  return {
    hiddenCount,
    hasExpanded,
    reset,
    showMoreOrReset,
    visibleItems,
  };
}
