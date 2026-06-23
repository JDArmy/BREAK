<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import BREAK from "@/BREAK";
import KnowledgeSplitView from "@/components/KnowledgeSplitView.vue";
import ReferenceList from "@/components/ReferenceList.vue";
import EntityLinkSection from "@/components/EntityLinkSection.vue";
import { getMessageStringArray } from "@/utils/i18nMessage";
import { useRelatedCases } from "@/composables/useRelatedCases";
import { useRelatedEntities } from "@/composables/useRelatedEntities";
import { useRelationGraph } from "@/composables/useRelationGraph";
import { formatAttackToolRelationNote } from "@/utils/relationNote";

const route = useRoute();
const { t, locale, messages } = useI18n();

const attackToolKeys = Object.keys(BREAK.attackTools);
// 优先从路由参数获取，否则从 hash 获取，最后使用默认值
const getInitialKey = () => {
  const paramKey = typeof route.params.atKey === 'string' ? route.params.atKey : '';
  const hashKey = route.hash.replace("#", "");
  return paramKey || hashKey || attackToolKeys[0] || "";
};
const selectedAttackToolKey = ref(getInitialKey());

watch(
  () => route.hash,
  (hash) => {
    const key = hash.replace("#", "");
    if (key && BREAK.attackTools[key]) selectedAttackToolKey.value = key;
  },
  { immediate: true }
);

watch(
  () => route.params.atKey,
  (atKey) => {
    if (atKey && typeof atKey === 'string' && BREAK.attackTools[atKey]) {
      selectedAttackToolKey.value = atKey;
    }
  }
);

const attackToolItems = computed(() =>
  attackToolKeys.map((atKey) => {
    const attackTool = BREAK.attackTools[atKey];
    const title = t(`BREAK.attackTools.${atKey}.title`);
    const description = t(`BREAK.attackTools.${atKey}.description`);
    const localeMessages = messages.value[locale.value] as Record<string, unknown>;
    const keywords = getMessageStringArray(
      localeMessages,
      `BREAK.attackTools.${atKey}.keywords`
    );

    return {
      id: atKey,
      title,
      subtitle: description.slice(0, 56),
      searchText: [
        title,
        ...keywords,
        description,
        ...attackTool.avoidances,
        ...attackTool.directCauseRisks,
        ...attackTool.indirectSupportRisks,
        ...(attackTool.relatedAttackTools ?? []).map((relation) => relation.key),
      ].join(" "),
    };
  })
);

const selectedAttackTool = computed(() => BREAK.attackTools[selectedAttackToolKey.value]);
const relatedAttackToolRelations = computed(() => selectedAttackTool.value?.relatedAttackTools ?? []);
const getAttackToolRelationNote = (relation: NonNullable<typeof relatedAttackToolRelations.value>[number]) =>
  formatAttackToolRelationNote(relation, locale.value, t);
const localeMessages = computed(() => messages.value[locale.value] as Record<string, unknown>);

const { relatedCases, ensureCases, cases, loaded, sectionRef: casesSectionRef } = useRelatedCases(
  "attackTool",
  selectedAttackToolKey,
);

// 反查：自建/使用该工具的威胁行为者，以及关联该工具的术语
const builderThreatActorKeys = useRelatedEntities(
  BREAK.threatActors,
  "buildAttackTools",
  selectedAttackToolKey,
);
const userThreatActorKeys = useRelatedEntities(
  BREAK.threatActors,
  "useAttackTools",
  selectedAttackToolKey,
);
const relatedTermKeys = useRelatedEntities(BREAK.terms, "relatedAttackTools", selectedAttackToolKey);

const { openRelationGraph } = useRelationGraph("attack-tool");
</script>

<template>
  <KnowledgeSplitView
    :title="$t('attackTools')"
    route-name="attackTools"
    detail-route-name="attackToolsDetail"
    :items="attackToolItems"
    :selected-key="selectedAttackToolKey"
    :search-placeholder="$t('search.attackToolPlaceholder')"
    @select="selectedAttackToolKey = $event"
  >
    <article v-if="selectedAttackTool" class="detail-panel">
      <div class="detail-heading">
        <div>
          <div class="detail-id">{{ selectedAttackToolKey }}</div>
          <h2>{{ $t(`BREAK.attackTools.${selectedAttackToolKey}.title`) }}</h2>
        </div>
        <el-button type="primary" size="small" @click="openRelationGraph(selectedAttackToolKey)">
          {{ $t("openRelationGraph") }}
        </el-button>
      </div>

      <section class="detail-section" data-detail-anchor="attack-tools">
        <h3>{{ $t("description") }}</h3>
        <p>{{ $t(`BREAK.attackTools.${selectedAttackToolKey}.description`) }}</p>
      </section>
      <section v-if="getMessageStringArray(localeMessages, `BREAK.attackTools.${selectedAttackToolKey}.keywords`).length" class="detail-section">
        <h3>{{ $t("keywords") }}</h3>
        <div class="keywords">
          <span v-for="keyword in getMessageStringArray(localeMessages, `BREAK.attackTools.${selectedAttackToolKey}.keywords`)" :key="keyword" class="keyword-tag">
            {{ keyword }}
          </span>
        </div>
      </section>
      <EntityLinkSection
        :keys="selectedAttackTool.directCauseRisks"
        title="relationLine.directCauseRisk"
        route-name="risks"
        detail-route-name="risksDetail"
        param-key="rKey"
        anchor="risks"
      />
      <EntityLinkSection
        :keys="selectedAttackTool.indirectSupportRisks"
        title="relationLine.indirectSupportRisk"
        route-name="risks"
        detail-route-name="risksDetail"
        param-key="rKey"
        anchor="risks"
      />
      <EntityLinkSection
        :keys="selectedAttackTool.avoidances"
        title="avoidance"
        route-name="avoidances"
        detail-route-name="avoidancesDetail"
        param-key="aKey"
        anchor="avoidances"
      />
      <section v-if="relatedAttackToolRelations.length" class="detail-section">
        <h3>{{ $t("attackToolRelatedAttackTools") }}</h3>
        <div class="attack-tool-relation-list">
          <router-link
            v-for="relation in relatedAttackToolRelations"
            :key="`${relation.key}-${relation.relation}`"
            class="attack-tool-relation-item"
            :to="{ name: 'attackToolsDetail', params: { atKey: relation.key } }"
          >
            <span class="attack-tool-relation-type">{{ $t(`attackToolRelationType.${relation.relation}`) }}</span>
            <span class="attack-tool-relation-title">
              {{ relation.key }}: {{ $t(`BREAK.attackTools.${relation.key}.title`) }}
            </span>
            <span v-if="relation.note" class="attack-tool-relation-note">{{ getAttackToolRelationNote(relation) }}</span>
          </router-link>
        </div>
      </section>
      <EntityLinkSection
        :keys="builderThreatActorKeys"
        title="buildAttackTools"
        route-name="threatActors"
        detail-route-name="threatActorsDetail"
        param-key="taKey"
        anchor="threat-actors"
      />
      <EntityLinkSection
        :keys="userThreatActorKeys"
        title="useAttackTools"
        route-name="threatActors"
        detail-route-name="threatActorsDetail"
        param-key="taKey"
        anchor="threat-actors"
      />
      <EntityLinkSection
        :keys="relatedTermKeys"
        title="terms"
        route-name="terms"
        detail-route-name="termsDetail"
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
        route-name="cases"
        detail-route-name="casesDetail"
        param-key="cKey"
        anchor="cases"
        :entity-records="cases"
      />
      <section v-if="selectedAttackTool.references?.length" class="detail-section" data-detail-anchor="references">
        <h3>{{ $t("references") }}</h3>
        <ReferenceList type="attackTools" :entity-key="selectedAttackToolKey" />
      </section>
      <section v-if="selectedAttackTool.updated" class="detail-section">
        <h3>{{ $t("lastUpdated") }}</h3>
        <p class="text-muted">{{ selectedAttackTool.updated }}</p>
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

.attack-tool-relation-list {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.attack-tool-relation-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  grid-template-areas:
    "type title"
    "type note";
  column-gap: 8px;
  row-gap: 2px;
  align-items: center;
  min-width: 0;
  min-height: 62px;
  padding: 8px 10px;
  color: inherit;
  text-decoration: none;
  background: var(--break-bg-secondary);
  border: 1px solid var(--break-border);
  border-radius: 6px;
}

.attack-tool-relation-item:hover {
  color: var(--break-primary);
  border-color: var(--break-primary);
}

.attack-tool-relation-type {
  grid-area: type;
  flex: 0 0 auto;
  min-width: 44px;
  padding: 1px 6px;
  font-size: 0.78rem;
  line-height: 1.5;
  text-align: center;
  color: var(--break-primary);
  border: 1px solid var(--break-primary);
  border-radius: 4px;
}

.attack-tool-relation-title {
  grid-area: title;
  min-width: 0;
  overflow: hidden;
  font-weight: 600;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attack-tool-relation-note {
  grid-area: note;
  min-width: 0;
  overflow: hidden;
  color: var(--break-text-muted);
  font-size: 0.84em;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 720px) {
  .attack-tool-relation-list {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 721px) and (max-width: 1180px) {
  .attack-tool-relation-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1181px) and (max-width: 1599px) {
  .attack-tool-relation-list {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
