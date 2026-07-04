<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import BREAK from "@/BREAK";
import KnowledgeSplitView from "@/components/KnowledgeSplitView.vue";
import FeedbackLink from "@/components/FeedbackLink.vue";
import ReferenceList from "@/components/ReferenceList.vue";
import EntityLinkSection from "@/components/EntityLinkSection.vue";
import { getMessageStringArray } from "@/utils/i18nMessage";
import { useRelatedCases } from "@/composables/useRelatedCases";
import { useRelatedEntities } from "@/composables/useRelatedEntities";
import { useRelationGraph } from "@/composables/useRelationGraph";
import { formatThreatActorRelationNote } from "@/utils/relationNote";

const route = useRoute();
const { t, locale, messages } = useI18n();

const threatActorKeys = Object.keys(BREAK.threatActors);
// 优先从路由参数获取，否则使用默认值
const getInitialKey = () => {
  const paramKey = typeof route.params.taKey === 'string' ? route.params.taKey : '';
  return paramKey || threatActorKeys[0] || "";
};
const selectedThreatActorKey = ref(getInitialKey());

watch(
  () => route.params.taKey,
  (taKey) => {
    if (taKey && typeof taKey === 'string' && BREAK.threatActors[taKey]) {
      selectedThreatActorKey.value = taKey;
    }
  }
);

const threatActorItems = computed(() =>
  threatActorKeys.map((taKey) => {
    const threatActor = BREAK.threatActors[taKey];
    const title = t(`BREAK.threatActors.${taKey}.title`);
    const description = t(`BREAK.threatActors.${taKey}.description`);
    const localeMessages = messages.value[locale.value] as Record<string, unknown>;
    const keywords = getMessageStringArray(
      localeMessages,
      `BREAK.threatActors.${taKey}.keywords`
    );

    return {
      id: taKey,
      title,
      subtitle: description.slice(0, 56),
      searchText: [
        title,
        ...keywords,
        description,
        ...threatActor.directCauseRisks,
        ...threatActor.indirectSupportRisks,
        ...threatActor.buildAttackTools,
        ...threatActor.useAttackTools,
        ...(threatActor.relatedThreatActors ?? []).map((relation) => relation.key),
      ].join(" "),
    };
  })
);

const selectedThreatActor = computed(() => BREAK.threatActors[selectedThreatActorKey.value]);
const relatedThreatActorRelations = computed(() => selectedThreatActor.value?.relatedThreatActors ?? []);
const getThreatActorRelationNote = (relation: NonNullable<typeof relatedThreatActorRelations.value>[number]) =>
  formatThreatActorRelationNote(relation, locale.value, t);
const localeMessages = computed(() => messages.value[locale.value] as Record<string, unknown>);
// 选中威胁行为者的关键词（缓存 computed，避免模板 v-if + v-for 重复调用 getMessageStringArray）
const selectedThreatActorKeywords = computed(() =>
  getMessageStringArray(localeMessages.value, `BREAK.threatActors.${selectedThreatActorKey.value}.keywords`)
);

const { relatedCases, ensureCases, cases, loaded, sectionRef: casesSectionRef } = useRelatedCases(
  "threatActor",
  selectedThreatActorKey,
);

// 反查：关联该威胁行为者的术语
const relatedTermKeys = useRelatedEntities(
  BREAK.terms,
  "relatedThreatActors",
  selectedThreatActorKey,
);

const { openRelationGraph } = useRelationGraph("threat-actor");
</script>

<template>
  <KnowledgeSplitView
    :title="$t('threatActors')"
    route-name="knowledgesThreatActorList"
    detail-route-name="knowledgesThreatActorDetail"
    param-key="taKey"
    :items="threatActorItems"
    :selected-key="selectedThreatActorKey"
    :search-placeholder="$t('search.threatActorPlaceholder')"
    @select="selectedThreatActorKey = $event"
  >
    <article v-if="selectedThreatActor" class="detail-panel">
      <div class="detail-heading">
        <div>
          <div class="detail-id">{{ selectedThreatActorKey }}</div>
          <h2>{{ $t(`BREAK.threatActors.${selectedThreatActorKey}.title`) }}</h2>
        </div>
        <div class="detail-heading-actions">
          <FeedbackLink :entity-id="selectedThreatActorKey" :entity-title="$t(`BREAK.threatActors.${selectedThreatActorKey}.title`)" />
          <el-button type="primary" size="small" @click="openRelationGraph(selectedThreatActorKey)">
          {{ $t("openRelationGraph") }}
          </el-button>
        </div>
      </div>

      <section class="detail-section" data-detail-anchor="threat-actors">
        <h3>{{ $t("description") }}</h3>
        <p>{{ $t(`BREAK.threatActors.${selectedThreatActorKey}.description`) }}</p>
      </section>
      <section v-if="selectedThreatActorKeywords.length" class="detail-section">
        <h3>{{ $t("keywords") }}</h3>
        <div class="keywords">
          <span v-for="keyword in selectedThreatActorKeywords" :key="keyword" class="keyword-tag">
            {{ keyword }}
          </span>
        </div>
      </section>
      <EntityLinkSection
        :keys="selectedThreatActor.directCauseRisks"
        title="relationLine.directCauseRisk"
        route-name="knowledgesRiskList"
        detail-route-name="knowledgesRiskDetail"
        param-key="rKey"
        anchor="risks"
      />
      <EntityLinkSection
        :keys="selectedThreatActor.indirectSupportRisks"
        title="relationLine.indirectSupportRisk"
        route-name="knowledgesRiskList"
        detail-route-name="knowledgesRiskDetail"
        param-key="rKey"
        anchor="risks"
      />
      <EntityLinkSection
        :keys="selectedThreatActor.buildAttackTools"
        title="buildAttackTools"
        route-name="knowledgesAttackToolList"
        detail-route-name="knowledgesAttackToolDetail"
        param-key="atKey"
        anchor="attack-tools"
      />
      <EntityLinkSection
        :keys="selectedThreatActor.useAttackTools"
        title="useAttackTools"
        route-name="knowledgesAttackToolList"
        detail-route-name="knowledgesAttackToolDetail"
        param-key="atKey"
        anchor="attack-tools"
      />
      <section v-if="relatedThreatActorRelations.length" class="detail-section">
        <h3>{{ $t("threatActorRelatedThreatActors") }}</h3>
        <div class="threat-actor-relation-list">
          <router-link
            v-for="relation in relatedThreatActorRelations"
            :key="`${relation.key}-${relation.relation}`"
            class="threat-actor-relation-item"
            :to="{ name: 'knowledgesThreatActorDetail', params: { taKey: relation.key } }"
          >
            <span class="threat-actor-relation-type">{{ $t(`threatActorRelationType.${relation.relation}`) }}</span>
            <span class="threat-actor-relation-title">
              {{ relation.key }}: {{ $t(`BREAK.threatActors.${relation.key}.title`) }}
            </span>
            <span v-if="relation.note" class="threat-actor-relation-note">{{ getThreatActorRelationNote(relation) }}</span>
          </router-link>
        </div>
      </section>
      <EntityLinkSection
        :keys="relatedTermKeys"
        title="terms"
        route-name="knowledgesTermList"
        detail-route-name="knowledgesTermDetail"
        param-key="tKey"
        anchor="terms"
      />
      <section
        v-if="!loaded"
        ref="casesSectionRef"
        class="detail-section"
        data-detail-anchor="cases"
      >
        <h3>{{ $t("relatedCases") }}</h3>
        <div v-if="!loaded" class="entity-links">
          <span class="text-muted">{{ $t("loadingRelatedCases") }}</span>
          <!-- 兜底：自动加载意外未触发时，可手动加载 -->
          <button class="entity-link" @click="ensureCases()">{{ $t("loadRelatedCases") }}</button>
        </div>
      </section>
      <EntityLinkSection
        v-else
        :keys="relatedCases"
        title="relatedCases"
        route-name="knowledgesCaseList"
        detail-route-name="knowledgesCaseDetail"
        param-key="cKey"
        anchor="cases"
        :entity-records="cases"
      />
      <section v-if="selectedThreatActor.references?.length" class="detail-section" data-detail-anchor="references">
        <h3>{{ $t("references") }}</h3>
        <ReferenceList type="threatActors" :entity-key="selectedThreatActorKey" />
      </section>
      <section v-if="selectedThreatActor.updated" class="detail-section">
        <h3>{{ $t("lastUpdated") }}</h3>
        <p class="text-muted">{{ selectedThreatActor.updated }}</p>
      </section>
    </article>
  </KnowledgeSplitView>
</template>

<style scoped>
.keywords {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.keyword-tag {
  display: inline-block;
  padding: 4px 12px;
  background: var(--break-bg-secondary);
  border: 1px solid var(--break-border);
  border-radius: 4px;
  font-size: 0.9em;
  color: var(--break-text-secondary);
}

.text-muted {
  color: var(--break-text-muted);
  font-size: 0.9em;
}

.threat-actor-relation-list {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.threat-actor-relation-item {
  min-width: 0;
  min-height: 78px;
  padding: 10px 12px;
  display: grid;
  grid-template:
    "type title" auto
    "note note" 1fr / auto minmax(0, 1fr);
  align-items: start;
  gap: 6px 8px;
  border: 1px solid var(--break-border);
  border-radius: 6px;
  background: var(--break-bg-secondary);
  color: inherit;
  text-decoration: none;
}

.threat-actor-relation-item:hover {
  border-color: var(--break-primary-color);
  background: var(--break-bg-hover);
}

.threat-actor-relation-type {
  grid-area: type;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--break-primary-color);
  color: #fff;
  font-size: 0.72rem;
  line-height: 1.35;
  white-space: nowrap;
}

.threat-actor-relation-title {
  grid-area: title;
  min-width: 0;
  font-size: 0.92rem;
  font-weight: 600;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.threat-actor-relation-note {
  grid-area: note;
  color: var(--break-text-muted);
  font-size: 0.82rem;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

@media (width <= 1280px) {
  .threat-actor-relation-list {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (width <= 900px) {
  .threat-actor-relation-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (width <= 560px) {
  .threat-actor-relation-list {
    grid-template-columns: 1fr;
  }
}
</style>
