<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { EntityType } from "@/BREAK/entityRegistry";
import { buildBusinessDomainImpact } from "@/utils/businessDomainImpact";

const props = withDefaults(
  defineProps<{
    entityType: EntityType;
    entityId: string;
    entityTitle: string;
    caseRelatedRisks?: string[];
  }>(),
  { caseRelatedRisks: () => [] },
);

const { t } = useI18n();
const summary = computed(() =>
  buildBusinessDomainImpact({
    entityType: props.entityType,
    entityId: props.entityId,
    entityTitle: props.entityTitle,
    caseRelatedRisks: props.caseRelatedRisks,
    getRiskTitle: (riskId) => t(`BREAK.risks.${riskId}.title`),
    t,
  }),
);
</script>

<template>
  <section class="detail-section business-domain-impact-block" data-detail-anchor="business-domains">
    <h3>{{ t("relationView.businessDomainImpactBlockTitle") }}</h3>
    <div class="business-domain-impact-panel">
      <p class="business-domain-impact-summary">{{ summary.summary }}</p>
      <p v-if="summary.notice" class="business-domain-impact-empty">{{ summary.notice }}</p>
      <div v-if="summary.items.length" class="business-domain-impact-table">
        <div class="business-domain-impact-head" aria-hidden="true">
          <span>{{ t("relationView.businessDomainImpactScene") }}</span>
          <span>{{ t("relationView.businessDomainImpactDimensions") }}</span>
        </div>
        <router-link
          v-for="item in summary.items"
          :key="item.id"
          class="business-domain-impact-row"
          :to="{ name: 'businessDomain', params: { bdKey: item.id } }"
        >
          <span class="business-domain-impact-name">
            <strong>{{ item.title }}</strong>
            <small>{{ item.id }}</small>
          </span>
          <span>{{ item.dimensionTitles.join(" / ") || "-" }}</span>
        </router-link>
      </div>
    </div>
  </section>
</template>

<style scoped>
.business-domain-impact-panel {
  display: grid;
  gap: 10px;
  padding: 14px 16px;
  border: 1px solid var(--break-border);
  border-radius: 8px;
  background: var(--break-bg-secondary);
}

.business-domain-impact-summary,
.business-domain-impact-empty {
  color: var(--break-text-secondary);
}

.business-domain-impact-empty {
  padding: 8px 10px;
  border: 1px solid color-mix(in srgb, var(--el-color-warning) 18%, var(--break-border));
  border-radius: 6px;
  background: color-mix(in srgb, var(--el-color-warning) 5%, var(--break-bg));
}

.business-domain-impact-table {
  display: grid;
  min-width: 0;
  border: 1px solid var(--break-border);
  border-radius: 6px;
  overflow: hidden;
}

.business-domain-impact-head,
.business-domain-impact-row {
  display: grid;
  grid-template-columns: minmax(150px, 0.8fr) minmax(180px, 1.2fr);
  min-width: 0;
}

.business-domain-impact-head {
  background: var(--break-bg);
  color: var(--break-text-muted);
  font-size: var(--detail-caption-size);
  font-weight: 700;
}

.business-domain-impact-head span,
.business-domain-impact-row > span {
  min-width: 0;
  padding: 9px 11px;
  overflow-wrap: anywhere;
}

.business-domain-impact-row {
  color: var(--break-text-secondary);
  font-size: var(--detail-table-size);
  line-height: 1.5;
  text-decoration: none;
}

.business-domain-impact-row + .business-domain-impact-row {
  border-top: 1px solid var(--break-border);
}

.business-domain-impact-row:hover {
  background: color-mix(in srgb, var(--el-color-primary) 5%, transparent);
}

.business-domain-impact-name {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  color: var(--break-text-primary);
}

.business-domain-impact-name small {
  color: var(--break-text-muted);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: inherit;
  font-weight: 600;
}

@media (max-width: 640px) {
  .business-domain-impact-head {
    display: none;
  }

  .business-domain-impact-row {
    grid-template-columns: 1fr;
    gap: 2px;
    padding: 9px 11px;
  }

  .business-domain-impact-row > span {
    padding: 0;
  }
}
</style>
