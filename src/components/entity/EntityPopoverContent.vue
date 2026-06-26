<script setup lang="ts">
/**
 * 实体 Popover 卡片内容：展示实体类型、ID、标题、定义/摘要。
 * 标题可点击跳转详情页（新窗口），无需额外"查看详情"按钮。
 */
import type { EntitySummary } from "@/composables/useEntityResolver";
import { TopRight } from "@element-plus/icons-vue";

defineProps<{
  entity: EntitySummary;
}>();

/** 类型对应的 emoji 图标 */
const TYPE_ICON: Record<string, string> = {
  risk: "⚠️",
  avoidance: "🛡️",
  attackTool: "🔧",
  threatActor: "👤",
  term: "📖",
  case: "📋",
};
</script>

<template>
  <div class="entity-card">
    <!-- 头部：类型徽章 + ID -->
    <div class="entity-card__header">
      <span
        class="entity-card__type-badge"
        :class="`entity-card__type-badge--${entity.type}`"
      >
        <span class="entity-card__icon">{{ TYPE_ICON[entity.type] }}</span>
        {{ entity.typeLabel }}
      </span>
      <span class="entity-card__id">{{ entity.id }}</span>
    </div>

    <!-- 标题 -->
    <div class="entity-card__title">{{ entity.title }}</div>

    <!-- 实体不存在时的提示 -->
    <div v-if="!entity.exists" class="entity-card__not-found">
      {{ $t("entityPopover.notFound") }}
    </div>

    <!-- 定义 / 摘要 -->
    <template v-else>
      <p v-if="entity.definition" class="entity-card__definition">
        {{ entity.definition }}
      </p>
      <p v-if="entity.description" class="entity-card__description">
        {{ entity.description }}
      </p>
    </template>

    <!-- 底部操作栏 -->
    <div v-if="entity.href" class="entity-card__footer">
      <a
        :href="entity.href"
        target="_blank"
        rel="noopener"
        class="entity-card__detail-link"
      >
        {{ $t("entityPopover.viewDetail") }}
        <el-icon :size="12" class="entity-card__link-icon">
          <TopRight />
        </el-icon>
      </a>
    </div>
  </div>
</template>

<style scoped>
.entity-card {
  padding: 0; /* el-popover 自带内边距 */
  font-size: 13px;
  line-height: 1.5;
  max-width: 100%;
}

.entity-card__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.entity-card__type-badge {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 3px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.entity-card__icon {
  font-size: 12px;
}

.entity-card__id {
  font-family: "SF Mono", "Consolas", "Monaco", monospace;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.entity-card__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.entity-card__definition,
.entity-card__description {
  margin: 0 0 4px;
  font-size: 12px;
  color: var(--el-text-color-regular);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.entity-card__description {
  color: var(--el-text-color-secondary);
}

.entity-card__not-found {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  font-style: italic;
}

.entity-card__footer {
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px solid var(--el-border-color-lighter);
  text-align: right;
}

.entity-card__detail-link {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 12px;
  color: var(--el-color-primary);
  text-decoration: none;
  cursor: pointer;
}

.entity-card__detail-link:hover {
  text-decoration: underline;
}

.entity-card__link-icon {
  vertical-align: -1px;
}
</style>
