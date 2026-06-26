<template>
  <div class="relation-pane-error">
    <p>{{ $t("error.componentLoadFailed") }}</p>
  </div>
</template>

<style scoped>
.relation-pane-error {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 200px;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}
</style>
