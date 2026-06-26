<script lang="ts" setup>
import { computed } from "vue";
import { entityRegistry, getEntityEntryByBreakKey } from "@/BREAK/entityRegistry";

interface EntityReferenceRecord {
  title?: string;
  definition?: string;
  description?: string;
  summary?: string;
}

/**
 * 相关实体链接 section：渲染"标题 + ID/标题/简介表格"。
 *
 * 列表详情页（RisksView 等）的"相关风险/攻击工具/威胁行为者/术语/业务场景"section
 * 模板重复 20+ 次，结构同构（v-if keys.length + h3 + entity-links + router-link 三目），
 * 抽出本件复用。仅服务 View 层 router-link 场景；详情抽屉用 button 开嵌套抽屉，语义不同，不复用。
 *
 * 知识库实体统一走 detail 路由（如 /knowledges/risk/detail/R0001）。
 * businessScenes 无独立详情路由（detailRouteName === routeName），走 route + hash。
 */
const props = defineProps<{
  /** 链接 key 数组；为空则整段不渲染 */
  keys: string[];
  /** i18n 标题 key，如 "risks" / "attackTools" / "relationLine.directCauseRisk" */
  title: string;
  /** 列表路由 name，如 "knowledgesRiskList" */
  routeName: string;
  /** 详情路由 name，如 "knowledgesRiskDetail"；与 routeName 相同时走 route + hash（businessScene） */
  detailRouteName: string;
  /** 路由 param 字段名，如 "rKey" / "atKey" / "bsKey" */
  paramKey: string;
  /** section 锚点（data-detail-anchor），如 "risks" / "attack-tools" */
  anchor?: string;
  /** i18n 路径段（BREAK 键），如 "risks" / "businessScenes"；默认从 routeName 推导 */
  i18nEntityType?: string;
  /** 懒加载实体可直接传记录数据，例如 cases 不在 BREAK.cases i18n 树中 */
  entityRecords?: Record<string, EntityReferenceRecord | undefined>;
}>();

// 知识库列表路由 name → BREAK 数据键（i18n 路径段）——从 entityRegistry 动态构建
const BREAK_KEY_BY_ROUTE_NAME: Record<string, string> = Object.fromEntries(
  entityRegistry.map((e) => [e.listRouteName, e.breakKey]),
);

// i18n 路径段：显式传入优先，否则从 routeName 推导 BREAK 键；
// businessScenes 显式传 "businessScenes"（routeName=businessScene，i18n 路径=BREAK.businessScenes 复数）
const entityType = computed(
  () => props.i18nEntityType ?? BREAK_KEY_BY_ROUTE_NAME[props.routeName] ?? props.routeName,
);
// 是否走独立详情路由：businessScenes 无 detail 变体，与 routeName 相同时走 route + hash
const useDetailRoute = computed(() => props.detailRouteName && props.detailRouteName !== props.routeName);

const summaryField = computed(
  () => getEntityEntryByBreakKey(entityType.value)?.fieldPriority[0] ?? "description",
);

const to = (k: string) =>
  useDetailRoute.value
    ? { name: props.detailRouteName, params: { [props.paramKey]: k } }
    : { name: props.routeName, params: { [props.paramKey]: k }, hash: `#${k}` };

const titlePath = (k: string) => `BREAK.${entityType.value}.${k}.title`;
const summaryPath = (k: string) =>
  `BREAK.${entityType.value}.${k}.${summaryField.value}`;

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

const rows = computed(() =>
  props.keys.map((key) => ({
    key,
    to: to(key),
  })),
);
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
              <router-link :to="row.to" class="entity-reference-link">
                {{ row.key }}
              </router-link>
            </td>
            <td class="entity-reference-title">
              <router-link :to="row.to" class="entity-reference-link">
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
