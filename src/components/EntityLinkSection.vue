<script lang="ts" setup>
import { computed } from "vue";
import { useBreakpoints } from "@/composables/useBreakpoints";

/**
 * 相关实体链接 section：渲染"标题 + 一组 router-link"。
 *
 * 列表详情页（RisksView 等）的"相关风险/攻击工具/威胁行为者/术语/业务场景"section
 * 模板重复 20+ 次，结构同构（v-if keys.length + h3 + entity-links + router-link 三目），
 * 抽出本件复用。仅服务 View 层 router-link 场景；详情抽屉用 button 开嵌套抽屉，语义不同，不复用。
 *
 * PC 端走列表路由 + hash（同页滚动定位），移动端走独立详情路由。
 * businessScenes 无独立详情路由（detailRouteName === routeName），移动端也走 route + hash。
 */
const props = defineProps<{
  /** 链接 key 数组；为空则整段不渲染 */
  keys: string[];
  /** i18n 标题 key，如 "risks" / "attackTools" / "relationLine.directCauseRisk" */
  title: string;
  /** PC 端列表路由 name，如 "risks" */
  routeName: string;
  /** 移动端详情路由 name，如 "risksDetail"；与 routeName 相同时移动端也走 route + hash */
  detailRouteName: string;
  /** 路由 param 字段名，如 "rKey" / "atKey" / "bsKey" */
  paramKey: string;
  /** section 锚点（data-detail-anchor），如 "risks" / "attack-tools" */
  anchor?: string;
  /** i18n 路径段，默认等于 routeName；businessScenes 显式传 "businessScenes" */
  i18nEntityType?: string;
}>();

const { isMobile } = useBreakpoints();
// i18n 路径段：绝大多数实体等于 routeName（BREAK.risks/BREAK.attackTools/...），
// 唯一例外 businessScenes（routeName=businessScene 单数，i18n 路径=BREAK.businessScenes 复数）
const entityType = computed(() => props.i18nEntityType ?? props.routeName);
// 移动端是否走独立详情路由：businessScenes 无 detail 变体，与 routeName 相同时走 route + hash
const useDetailRoute = computed(
  () => isMobile.value && props.detailRouteName && props.detailRouteName !== props.routeName,
);

const to = (k: string) =>
  useDetailRoute.value
    ? { name: props.detailRouteName, params: { [props.paramKey]: k } }
    : props.detailRouteName === props.routeName
      ? { name: props.routeName, params: { [props.paramKey]: k }, hash: `#${k}` }
    : { name: props.routeName, hash: `#${k}` };
</script>

<template>
  <section v-if="keys.length" class="detail-section" :data-detail-anchor="anchor">
    <h3>{{ $t(title) }}</h3>
    <div class="entity-links">
      <router-link
        v-for="k in keys"
        :key="k"
        :to="to(k)"
        class="entity-link"
      >
        {{ k }}: {{ $t(`BREAK.${entityType}.${k}.title`) }}
      </router-link>
    </div>
  </section>
</template>
