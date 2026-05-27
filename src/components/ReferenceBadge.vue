<script setup lang="ts">
defineProps<{
  type?: string;
  evidenceLevel?: string;
}>();

const typeMap: Record<string, string> = {
  standard: "标准",
  academic: "论文",
  regulation: "监管",
  regulatory: "监管",
  vendor: "厂商",
  news: "新闻",
  encyclopedia: "百科",
  blog: "博客",
  tool: "工具",
  industry: "行业",
};

const levelMap: Record<string, string> = {
  high: "高",
  medium: "中",
  low: "低",
};
</script>

<template>
  <span v-if="type" class="badge type">{{ typeMap[type] || type }}</span>
  <span v-if="evidenceLevel" class="badge level" :class="evidenceLevel">
    {{ levelMap[evidenceLevel] || evidenceLevel }}
  </span>
</template>

<style scoped>
.badge {
  display: inline-block;
  padding: 1px 6px;
  margin-left: 4px;
  border-radius: 3px;
  font-size: 12px;
  line-height: 1.5;
  white-space: nowrap;
}

.badge.type {
  background: #eef5ff;
  color: #2264a8;
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
