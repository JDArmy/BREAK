<script lang="ts" setup>
import { computed } from "vue";
import { getEntityEntry, type EntityType } from "@/BREAK/entityRegistry";

interface EntityReferenceRecord {
  title?: string;
  definition?: string;
  description?: string;
  summary?: string;
}

/**
 * 抽屉版相关实体链接 section：渲染"标题 + ID/标题/简介表格"。
 *
 * 与 EntityLinkSection.vue 的区别：EntityLinkSection 用 router-link 服务列表详情页（页内导航）；
 * 本件用 button 触发 onNavigate 回调，由父级抽屉决定开嵌套抽屉还是新窗口（抽屉嵌套语义）。
 * 表格样式复用全局 .detail-section + .entity-reference-table-wrap/.entity-reference-table。
 */
const props = defineProps<{
  /** 链接 key 数组；为空则整段不渲染 */
  keys: string[];
  /** i18n 标题 key，如 "attackTools" / "relationLine.directCauseRisk" */
  title: string;
  /** 实体类型（EntityType），用于从 entityRegistry 取 i18nPath/fieldPriority */
  entityType: EntityType;
  /** 点击导航回调：父组件决定开嵌套抽屉还是新窗口 */
  onNavigate: (key: string) => void;
  /** section 锚点（data-detail-anchor），抽屉内通常不需要，可选 */
  anchor?: string;
  /** 懒加载实体（如 cases）可直接传记录数据 */
  entityRecords?: Record<string, EntityReferenceRecord | undefined>;
}>();

const entry = computed(() => getEntityEntry(props.entityType));
// i18n 路径段（BREAK 键，如 "risks" / "cases"）
const breakKey = computed(() => entry.value?.breakKey ?? props.entityType);
const summaryField = computed(() => entry.value?.fieldPriority[0] ?? "description");

const titlePath = (k: string) => `BREAK.${breakKey.value}.${k}.title`;
const summaryPath = (k: string) => `BREAK.${breakKey.value}.${k}.${summaryField.value}`;

const getRecordTitle = (key: string) => props.entityRecords?.[key]?.title;
const getRecordSummary = (key: string) => {
  const record = props.entityRecords?.[key];
  if (!record) return undefined;
  return (
    record[summaryField.value as keyof EntityReferenceRecord] ??
    record.summary ??
    record.definition ??
    record.description
  );
};

const rows = computed(() => props.keys.map((key) => ({ key })));
</script>

<template>
  <section v-if="keys.length" class="detail-section" :data-detail-anchor="anchor">
    <h3>{{ $t(title) }}</h3>
    <div class="entity-reference-table-wrap">
      <table class="entity-reference-table">
        <colgroup>
          <col class="entity-reference-id-col" />
          <col class="entity-reference-title-col" />
          <col class="entity-reference-intro-col" />
        </colgroup>
        <thead>
          <tr>
            <th>{{ $t("ID") }}</th>
            <th>{{ $t("title") }}</th>
            <th>{{ $t("entityIntro") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.key">
            <td class="entity-reference-id">
              <button
                type="button"
                class="entity-reference-link entity-reference-link--button"
                @click="onNavigate(row.key)"
              >
                {{ row.key }}
              </button>
            </td>
            <td class="entity-reference-title">
              <button
                type="button"
                class="entity-reference-link entity-reference-link--button"
                @click="onNavigate(row.key)"
              >
                {{ getRecordTitle(row.key) ?? $t(titlePath(row.key)) }}
              </button>
            </td>
            <td class="entity-reference-intro">
              <el-tooltip
                :content="getRecordSummary(row.key) ?? $t(summaryPath(row.key))"
                effect="break-theme"
                :show-after="1000"
                placement="top"
                popper-class="entity-reference-intro-tooltip"
              >
                <span class="entity-reference-intro-text">
                  {{ getRecordSummary(row.key) ?? $t(summaryPath(row.key)) }}
                </span>
              </el-tooltip>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
/* button 重置为视觉与 router-link 一致（全局 .entity-reference-link 提供蓝色加粗） */
.entity-reference-link--button {
  background: none;
  border: 0;
  padding: 0;
  font: inherit;
  color: inherit;
  cursor: pointer;
  text-align: inherit;
  display: inline;
}
</style>
