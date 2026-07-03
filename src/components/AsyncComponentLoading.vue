<template>
  <div class="async-component-loading" aria-busy="true">
    <span class="async-component-loading__spinner" aria-hidden="true"></span>
    <span>{{ $t("loading") }}</span>
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
