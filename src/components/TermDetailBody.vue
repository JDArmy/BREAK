<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import BREAK from "@/BREAK";
import ReferenceList from "@/components/ReferenceList.vue";
import FeedbackLink from "@/components/FeedbackLink.vue";
import EntityLinkSection from "@/components/EntityLinkSection.vue";
import BusinessDomainImpactBlock from "@/components/BusinessDomainImpactBlock.vue";

import { TopRight } from "@element-plus/icons-vue";

import { entityDetailHref } from "@/utils/entityRoute";
import { getMessageStringArray, getNestedMessageValue } from "@/utils/i18nMessage";

/**
 * 术语详情 body（统一列表页 + 抽屉）。
 *
 * mode='list'：列表页纯文本 detail-id、FeedbackLink（无关系图按钮）、router-link 关联表格
 * mode='drawer'：抽屉 a detail-id+icon、viewDetail 按钮（无关系图按钮）、button 触发 onNavigate
 *
 * 与其他实体差异：
 * - Term 无 relation-list（无 relatedTerms 同类关联）
 * - Term 无 cases section（useRelatedCases 不支持 term）
 * - Term 无关系图按钮（entityRegistry 中 term.relationPerspectiveRouteName 为空）
 * - Term 有 category（在 definition 之后）、aliases、usageExample（title+aliases 高亮）
 * - Term 关联实体均由正向字段维护（relatedThreatActors/relatedAttackTools/relatedRisks/relatedAvoidances/relatedBusinessDomains），无需反查
 * - Term→Risk 走新窗口（emit navigate-risk 由调用方开新窗口，不嵌套回主抽屉）
 * - businessDomains 无 EntityType，两端都用 router-link 模式（跳页，不传 onNavigate）
 */
const props = defineProps<{
  tKey: string;
  mode: "list" | "drawer";
}>();

const emit = defineEmits<{
  /** 抽屉模式：点击关联威胁行为者（嵌套） */
  (e: "navigate-threatActor", key: string): void;
  /** 抽屉模式：点击关联攻击工具（嵌套） */
  (e: "navigate-attackTool", key: string): void;
  /** 抽屉模式：点击关联风险（新窗口，不嵌套回主抽屉） */
  (e: "navigate-risk", key: string): void;
  /** 抽屉模式：点击关联手段（嵌套） */
  (e: "navigate-avoidance", key: string): void;
}>();

const router = useRouter();
const { locale, messages } = useI18n();

const isDrawer = computed(() => props.mode === "drawer");

const selectedTerm = computed(() => BREAK.terms[props.tKey as keyof typeof BREAK.terms]);

const localeMessages = computed(() => messages.value[locale.value] as Record<string, unknown>);
const getTermString = (termKey: string, field: string) =>
  String(getNestedMessageValue(localeMessages.value, `BREAK.terms.${termKey}.${field}`) || "");

const aliases = computed(() =>
  getMessageStringArray(localeMessages.value, `BREAK.terms.${props.tKey}.aliases`),
);
const keywords = computed(() =>
  getMessageStringArray(localeMessages.value, `BREAK.terms.${props.tKey}.keywords`),
);

/**
 * 对 usageExample 文本中出现的术语名（title + aliases）进行高亮标记。
 * 列表页用蓝色高亮（--link），抽屉用琥珀色高亮（--bg-highlight），通过 modifier class 区分。
 */
const highlightedUsageExample = computed(() => {
  const text = getTermString(props.tKey, "usageExample");
  if (!text) return "";

  const title = getTermString(props.tKey, "title");
  const highlightKeywords = [title, ...aliases.value].filter(Boolean) as string[];
  if (!highlightKeywords.length) return escapeHtml(text);

  // 按长度降序排列，优先匹配更长的词
  highlightKeywords.sort((a, b) => b.length - a.length);
  const escaped = highlightKeywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`(${escaped.join("|")})`, "g");

  const modifier = isDrawer.value ? "usage-highlight--amber" : "usage-highlight--link";
  return escapeHtml(text).replace(regex, `<mark class="usage-highlight ${modifier}">$1</mark>`);
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// 导航工具函数
const detailHref = (tKey: string) => entityDetailHref(router, tKey, "term") ?? "";
const openDetail = (tKey: string) => {
  window.open(detailHref(tKey), "_blank", "noopener,noreferrer");
};

// 抽屉模式的 onNavigate 回调（emit 给调用方）
const onNavigate = (event: "navigate-risk" | "navigate-avoidance" | "navigate-attackTool" | "navigate-threatActor") => (key: string) => {
  emit(event, key);
};
</script>

<template>
  <article :class="['detail-panel', { 'drawer-detail-panel': isDrawer }]">
    <div class="detail-heading">
      <div>
        <!-- list: 纯文本 / drawer: a 新窗口 + icon -->
        <div v-if="!isDrawer" class="detail-id">{{ tKey }}</div>
        <a v-else :href="detailHref(tKey)" target="_blank" rel="noopener" class="detail-id">
          {{ tKey }}
          <el-icon class="external-link-icon" aria-hidden="true"><TopRight /></el-icon>
        </a>
        <h2>
          <template v-if="!isDrawer">{{ $t(`BREAK.terms.${tKey}.title`) }}</template>
          <a v-else :href="detailHref(tKey)" target="_blank" rel="noopener noreferrer" class="drawer-title-link">
            {{ $t(`BREAK.terms.${tKey}.title`) }}
            <el-icon class="external-link-icon" aria-hidden="true"><TopRight /></el-icon>
          </a>
        </h2>
      </div>
      <div class="detail-heading-actions">
        <!-- list: 仅 FeedbackLink（Term 无关系图按钮） -->
        <FeedbackLink v-if="!isDrawer" :entity-id="tKey" :entity-title="$t(`BREAK.terms.${tKey}.title`)" />
        <!-- drawer: 仅 viewDetail 按钮（Term 无关系图按钮） -->
        <el-button v-else type="primary" plain size="small" @click="openDetail(tKey)">
          {{ $t("viewDetail") }}
          <el-icon class="external-link-icon" aria-hidden="true"><TopRight /></el-icon>
        </el-button>
      </div>
    </div>

    <section class="detail-section" data-detail-anchor="terms">
      <h3>{{ $t("definition") }}</h3>
      <p>{{ $t(`BREAK.terms.${tKey}.definition`) }}</p>
    </section>
    <section class="detail-section">
      <h3>{{ $t("description") }}</h3>
      <p>{{ $t(`BREAK.terms.${tKey}.description`) }}</p>
    </section>
    <section v-if="selectedTerm?.category" class="detail-section">
      <h3>{{ $t("termCategory") }}</h3>
      <p>{{ $t(`BREAK.terms.${tKey}.category`) }}</p>
    </section>
    <section v-if="aliases.length" class="detail-section">
      <h3>{{ $t("aliases") }}</h3>
      <div class="keywords">
        <span v-for="alias in aliases" :key="alias" class="keyword-tag">{{ alias }}</span>
      </div>
    </section>
    <section v-if="keywords.length" class="detail-section">
      <h3>{{ $t("keywords") }}</h3>
      <div class="keywords">
        <span v-for="keyword in keywords" :key="keyword" class="keyword-tag">{{ keyword }}</span>
      </div>
    </section>
    <section v-if="selectedTerm?.usageExample" class="detail-section">
      <h3>{{ $t("usageExample") }}</h3>
      <p v-html="highlightedUsageExample" />
    </section>

    <BusinessDomainImpactBlock
      v-if="!isDrawer"
      entity-type="term"
      :entity-id="tKey"
      :entity-title="$t(`BREAK.terms.${tKey}.title`)"
    />

    <!-- 关联实体表格（统一用 EntityLinkSection，抽屉传 onNavigate） -->
    <EntityLinkSection
      :keys="selectedTerm?.relatedThreatActors ?? []"
      title="threatActors"
      entity-type="threatActor"
      anchor="threat-actors"
      :on-navigate="isDrawer ? onNavigate('navigate-threatActor') : undefined"
    />
    <EntityLinkSection
      :keys="selectedTerm?.relatedAttackTools ?? []"
      title="attackTools"
      entity-type="attackTool"
      anchor="attack-tools"
      :on-navigate="isDrawer ? onNavigate('navigate-attackTool') : undefined"
    />
    <!-- Term→Risk 走新窗口（不嵌套回主抽屉），emit navigate-risk 由调用方开新窗口 -->
    <EntityLinkSection
      :keys="selectedTerm?.relatedRisks ?? []"
      title="risks"
      entity-type="risk"
      anchor="risks"
      :on-navigate="isDrawer ? onNavigate('navigate-risk') : undefined"
    />
    <EntityLinkSection
      :keys="selectedTerm?.relatedAvoidances ?? []"
      title="riskAvoidances"
      entity-type="avoidance"
      anchor="avoidances"
      :on-navigate="isDrawer ? onNavigate('navigate-avoidance') : undefined"
    />
    <!-- businessDomains 无 EntityType，两端都用 router-link 模式（跳页，不传 onNavigate） -->
    <EntityLinkSection
      :keys="selectedTerm?.relatedBusinessDomains ?? []"
      title="businessDomains"
      route-name="businessDomain"
      param-key="bdKey"
      anchor="business-domains"
      i18n-entity-type="businessDomains"
    />

    <section v-if="selectedTerm?.references?.length" class="detail-section" data-detail-anchor="references">
      <h3>{{ $t("references") }}</h3>
      <ReferenceList type="terms" :entity-key="tKey" />
    </section>
    <section v-if="selectedTerm?.updated" class="detail-section">
      <h3>{{ $t("lastUpdated") }}</h3>
      <p class="text-muted">{{ selectedTerm.updated }}</p>
    </section>
  </article>
</template>
