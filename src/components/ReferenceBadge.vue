<script setup lang="ts">
defineProps<{
  type?: string;
  evidenceLevel?: string;
}>();

const typeMap: Record<string, string> = {
  standard: '标准',
  academic: '学术',
  regulatory: '监管',
  industry: '行业',
  encyclopedia: '百科'
};

const levelMap: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低'
};
</script>

<template>
  <span v-if="type" class="badge type">{{ typeMap[type] || type }}</span>
  <span v-if="evidenceLevel" class="badge level" :class="evidenceLevel">{{ levelMap[evidenceLevel] || evidenceLevel }}</span>
</template>

<style scoped>
.badge {
  display: inline-block;
  padding: 2px 8px;
  margin-right: 4px;
  border-radius: 3px;
  font-size: 12px;
}
.badge.type {
  background: #e1f3ff;
  color: #0066cc;
}
.badge.level {
  color: white;
}
.badge.level.high {
  background: #67c23a;
}
.badge.level.medium {
  background: #e6a23c;
}
.badge.level.low {
  background: #909399;
}
</style>
