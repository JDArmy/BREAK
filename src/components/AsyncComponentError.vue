<template>
  <div class="async-component-error">
    <span class="async-component-error__icon" aria-hidden="true">!</span>
    <span>{{ $t("error.componentLoadFailed") }}</span>
  </div>
</template>

<style scoped>
.async-component-error {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  color: var(--break-text-muted);
  font-size: 13px;
}

.async-component-error__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--break-danger, #f56c6c);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}
</style>
