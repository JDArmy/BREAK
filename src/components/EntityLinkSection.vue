<script lang="ts" setup>
import { computed } from "vue";
import {
  entityRegistry,
  getEntityEntry,
  getEntityEntryByBreakKey,
  type EntityType,
} from "@/BREAK/entityRegistry";

interface EntityReferenceRecord {
  title?: string;
  definition?: string;
  description?: string;
  summary?: string;
}

/**
 * 相关实体链接 section：渲染"标题 + ID/标题/简介表格"。
 *
 * 统一服务两种场景：
 * - 列表详情页（RisksView 等）：不传 onNavigate，标题列用 router-link 页内导航
 * - 详情抽屉（RiskDetail 等）：传 onNavigate，标题列用 button 触发回调（开嵌套抽屉/新窗口）
 *
 * 知识库实体传 entityType（强类型，从 entityRegistry 推导 breakKey/fieldPriority/路由）。
 * businessScene 无 EntityType（不在 registry），传 i18nEntityType + routeName/paramKey 逃生舱（走 route + hash）。
 * ID 列为纯文本，仅标题列可点击跳转。
 */
const props = defineProps<{
  /** 链接 key 数组；为空则整段不渲染 */
  keys: string[];
  /** i18n 标题 key，如 "risks" / "attackTools" / "relationLine.directCauseRisk" */
  title: string;
  /** 实体类型（强类型）；传此值时从 registry 自动推导 breakKey/fieldPriority/detailRouteName/paramKey */
  entityType?: EntityType;
  /** 点击导航回调；传=button 模式（抽屉），不传=router-link 模式（列表页） */
  onNavigate?: (key: string) => void;
  /** section 锚点（data-detail-anchor），如 "risks" / "attack-tools" */
  anchor?: string;
  /** i18n 路径段（BREAK 键），如 "businessScenes"；businessScene 不在 registry，用此逃生舱 */
  i18nEntityType?: string;
  /** businessScene hash 模式用：列表路由 name（与 detailRouteName 相同时走 route + hash） */
  routeName?: string;
  /** businessScene hash 模式用：路由 param 字段名 */
  paramKey?: string;
  /** 懒加载实体可直接传记录数据，例如 cases 不在 BREAK.cases i18n 树中 */
  entityRecords?: Record<string, EntityReferenceRecord | undefined>;
}>();

// 知识库列表路由 name → BREAK 数据键——从 entityRegistry 动态构建（businessScene 逃生舱用）
const BREAK_KEY_BY_ROUTE_NAME: Record<string, string> = Object.fromEntries(
  entityRegistry.map((e) => [e.listRouteName, e.breakKey]),
);

// breakKey：entityType 优先，其次 i18nEntityType，最后从 routeName 推导（businessScene）
const breakKey = computed(() => {
  if (props.entityType) return getEntityEntry(props.entityType)?.breakKey ?? props.entityType;
  return props.i18nEntityType ?? (props.routeName ? BREAK_KEY_BY_ROUTE_NAME[props.routeName] : undefined) ?? props.i18nEntityType ?? "";
});

// registry entry：entityType 有则取，businessScene 无则按 breakKey 反查
const entry = computed(() => {
  if (props.entityType) return getEntityEntry(props.entityType);
  return getEntityEntryByBreakKey(breakKey.value);
});

const summaryField = computed(() => entry.value?.fieldPriority[0] ?? "description");

const to = (k: string) => {
  if (props.entityType) {
    const e = getEntityEntry(props.entityType);
    if (!e) return {};
    return { name: e.detailRouteName, params: { [e.paramKey]: k } };
  }
  // businessScene hash 模式
  return { name: props.routeName, params: { [props.paramKey ?? "bsKey"]: k }, hash: `#${k}` };
};

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
              <span class="entity-reference-id-text">{{ row.key }}</span>
            </td>
            <td class="entity-reference-title">
              <!-- 抽屉模式：button 触发 onNavigate -->
              <button
                v-if="onNavigate"
                type="button"
                class="entity-reference-link entity-reference-link--button"
                @click="onNavigate(row.key)"
              >
                {{ getRecordTitle(row.key) ?? $t(titlePath(row.key)) }}
              </button>
              <!-- 列表页模式：router-link 页内导航 -->
              <router-link v-else :to="to(row.key)" class="entity-reference-link">
                {{ getRecordTitle(row.key) ?? $t(titlePath(row.key)) }}
              </router-link>
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
