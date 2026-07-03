<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { inferEntityType, getEntityEntry } from "@/BREAK/entityRegistry";
import { buildIssueUrl } from "@/utils/feedback";

// 详情页"反馈/纠正"入口：点击在新窗口打开 GitHub issue 新建页，
// 预填实体类型/ID/标题与当前页面 URL。entityId 用于反推类型，entityTitle 由父组件传入。
const props = defineProps<{
  entityId: string;
  entityTitle: string;
}>();

const { t } = useI18n();

const issueUrl = computed(() => {
  const type = inferEntityType(props.entityId);
  if (!type) return "";
  const entry = getEntityEntry(type);
  return buildIssueUrl({
    entityId: props.entityId,
    entityTitle: props.entityTitle,
    entityTypeLabel: t(entry.typeLabelKey),
    pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
  });
});
</script>

<template>
  <el-button
    v-if="issueUrl"
    tag="a"
    :href="issueUrl"
    target="_blank"
    rel="noopener noreferrer"
    size="small"
    :title="t('feedback')"
  >
    {{ t("feedback") }}
  </el-button>
</template>
