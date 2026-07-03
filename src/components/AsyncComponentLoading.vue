<script setup lang="ts">
import { onBeforeUnmount, ref } from "vue";

const slow = ref(false);

const slowTimer = window.setTimeout(() => {
  slow.value = true;
}, 3000);

onBeforeUnmount(() => {
  window.clearTimeout(slowTimer);
});
</script>

<template>
  <div class="async-component-loading" aria-busy="true" role="status">
    <span class="async-component-loading__spinner" aria-hidden="true"></span>
    <span class="async-component-loading__content">
      <span class="async-component-loading__title">{{ $t("loading") }}</span>
      <span v-if="slow" class="async-component-loading__hint">网络较慢，正在继续加载资源。</span>
    </span>
  </div>
</template>

<style scoped>
.async-component-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  color: var(--break-text-muted);
  font-size: 13px;
}

.async-component-loading__content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.async-component-loading__title {
  color: var(--break-text-muted);
}

.async-component-loading__hint {
  color: var(--break-text-weak);
  font-size: 12px;
}

.async-component-loading__spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--break-border);
  border-top-color: var(--break-link);
  border-radius: 50%;
  animation: async-loading-spin 0.8s linear infinite;
  flex-shrink: 0;
}

@keyframes async-loading-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
