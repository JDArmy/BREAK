<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

interface KnowledgeItem {
  id: string;
  title: string;
  subtitle?: string;
}

const props = defineProps<{
  title: string;
  routeName: string;
  items: KnowledgeItem[];
  selectedKey: string;
  searchPlaceholder: string;
}>();

const emit = defineEmits<{
  select: [key: string];
}>();

const route = useRoute();
const router = useRouter();
const query = ref("");

const selectedItem = computed(() =>
  props.items.find((item) => item.id === props.selectedKey)
);

const filteredItems = computed(() => {
  const keyword = query.value.trim().toLowerCase();
  if (!keyword) return props.items;

  return props.items.filter((item) =>
    [item.id, item.title, item.subtitle]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(keyword))
  );
});

const selectItem = (key: string) => {
  if (!props.items.some((item) => item.id === key)) return;
  emit("select", key);
  router.replace({ name: props.routeName, hash: `#${key}` });
};

watch(
  () => props.selectedKey,
  (key) => {
    if (!key) return;
    nextTick(() => {
      document
        .querySelector(`[data-knowledge-key="${key}"]`)
        ?.scrollIntoView({ block: "nearest" });
    });
  },
  { immediate: true }
);

watch(
  () => route.hash,
  (hash) => {
    const key = hash.replace("#", "");
    if (
      key &&
      key !== props.selectedKey &&
      props.items.some((item) => item.id === key)
    ) {
      emit("select", key);
    }
  },
  { immediate: true }
);
</script>

<template>
  <section class="knowledge-page">
    <aside class="knowledge-sidebar">
      <div class="knowledge-header">
        <h3 class="knowledge-title">{{ title }}</h3>
        <slot name="filters" />
        <el-input
          v-model="query"
          class="knowledge-search"
          size="small"
          clearable
          :placeholder="searchPlaceholder"
        />
      </div>
      <div class="knowledge-list">
        <button
          v-for="item in filteredItems"
          :key="item.id"
          class="knowledge-list-item"
          :class="{ active: item.id === selectedKey }"
          :data-knowledge-key="item.id"
          type="button"
          @click="selectItem(item.id)"
        >
          <span class="knowledge-id">{{ item.id }}</span>
          <span class="knowledge-name">{{ item.title }}</span>
          <span v-if="item.subtitle" class="knowledge-subtitle">{{ item.subtitle }}</span>
        </button>
        <div v-if="filteredItems.length === 0" class="knowledge-empty">
          {{ $t("search.noResults") }}
        </div>
      </div>
    </aside>

    <main class="knowledge-detail">
      <template v-if="selectedItem">
        <slot :selected-key="selectedKey" />
      </template>
    </main>
  </section>
</template>

<style scoped>
.knowledge-page {
  display: grid;
  grid-template-columns: minmax(280px, 30%) 1fr;
  gap: 18px;
  height: calc(100vh - 150px);
  min-height: 520px;
}

.knowledge-sidebar,
.knowledge-detail {
  min-height: 0;
  border: 1px solid var(--break-border);
  background: var(--break-bg-card);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
}

.knowledge-sidebar {
  display: flex;
  flex-direction: column;
}

.knowledge-header {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
  padding: 16px 18px 14px;
  border-bottom: 1px solid var(--break-border);
}

.knowledge-title {
  flex: 0 0 auto;
  margin: 0;
  color: var(--break-text-primary);
  font-size: 17px;
  font-weight: 650;
}

.knowledge-search {
  flex: 1 1 120px;
  min-width: 0;
}

.knowledge-list {
  min-height: 0;
  overflow-y: auto;
  padding: 10px;
}

.knowledge-list-item {
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 74px minmax(0, 1fr);
  gap: 6px 10px;
  width: 100%;
  min-height: 42px;
  padding: 9px 12px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--break-text-secondary);
  text-align: left;
  cursor: pointer;
}

.knowledge-list-item:hover {
  background: var(--break-bg-secondary);
  border-color: var(--break-border-light);
}

.knowledge-list-item.active {
  background: var(--break-highlight-bg);
  color: var(--break-link);
  border-color: var(--break-highlight-border);
}

.knowledge-id {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.25;
  color: var(--break-text-muted);
}

.knowledge-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
  line-height: 1.25;
}

.knowledge-subtitle {
  display: block;
  grid-column: 2;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: var(--break-text-muted);
}

.knowledge-detail {
  overflow-y: auto;
  padding: 26px 30px 32px;
}

@media (max-width: 768px) {
  .knowledge-page {
    grid-template-columns: 1fr;
    height: auto;
  }

  .knowledge-sidebar {
    max-height: 320px;
  }

  .knowledge-detail {
    min-height: 420px;
  }
}
</style>
