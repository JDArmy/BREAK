import { computed, ref } from "vue";
import { describe, expect, it } from "vitest";
import { useIncrementalVisibleList } from "@/composables/useIncrementalVisibleList";

describe("useIncrementalVisibleList", () => {
  it("按初始数量展示，并每次最多增加一个 step", () => {
    const items = ref(Array.from({ length: 120 }, (_, index) => index + 1));
    const list = useIncrementalVisibleList(items, {
      initialLimit: 8,
      step: 50,
    });

    expect(list.visibleItems.value).toHaveLength(8);
    expect(list.hiddenCount.value).toBe(112);
    expect(list.hasExpanded.value).toBe(false);

    list.showMoreOrReset();
    expect(list.visibleItems.value).toHaveLength(58);
    expect(list.hiddenCount.value).toBe(62);
    expect(list.hasExpanded.value).toBe(true);

    list.showMoreOrReset();
    expect(list.visibleItems.value).toHaveLength(108);
    expect(list.hiddenCount.value).toBe(12);

    list.showMoreOrReset();
    expect(list.visibleItems.value).toHaveLength(120);
    expect(list.hiddenCount.value).toBe(0);

    list.showMoreOrReset();
    expect(list.visibleItems.value).toHaveLength(8);
    expect(list.hiddenCount.value).toBe(112);
  });

  it("禁用时展示全部，启用状态变化后重置默认数量", async () => {
    const items = ref(Array.from({ length: 20 }, (_, index) => index));
    const enabled = ref(false);
    const list = useIncrementalVisibleList(items, {
      initialLimit: 5,
      enabled,
    });

    expect(list.visibleItems.value).toHaveLength(20);
    expect(list.hiddenCount.value).toBe(0);

    enabled.value = true;
    await Promise.resolve();

    expect(list.visibleItems.value).toHaveLength(5);
    expect(list.hiddenCount.value).toBe(15);
  });

  it("数据源变化时重置默认数量", async () => {
    const rawItems = ref(Array.from({ length: 80 }, (_, index) => index));
    const evenItems = computed(() =>
      rawItems.value.filter((item) => item % 2 === 0)
    );
    const list = useIncrementalVisibleList(evenItems, {
      initialLimit: 10,
      step: 50,
    });

    list.showMoreOrReset();
    expect(list.visibleItems.value).toHaveLength(40);

    rawItems.value = Array.from({ length: 12 }, (_, index) => index);
    await Promise.resolve();

    expect(list.visibleItems.value).toHaveLength(6);
    expect(list.hasExpanded.value).toBe(false);
  });

  it("初始数量支持响应式变化并重置展示数量", async () => {
    const items = ref(Array.from({ length: 30 }, (_, index) => index));
    const initialLimit = ref(10);
    const list = useIncrementalVisibleList(items, {
      initialLimit,
      step: 50,
    });

    expect(list.visibleItems.value).toHaveLength(10);

    initialLimit.value = 6;
    await Promise.resolve();

    expect(list.visibleItems.value).toHaveLength(6);
    expect(list.hiddenCount.value).toBe(24);
    expect(list.hasExpanded.value).toBe(false);
  });
});
