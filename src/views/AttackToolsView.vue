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
      ].join(" "),
    };
  })
);

const selectedAttackTool = computed(() => BREAK.attackTools[selectedAttackToolKey.value]);
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
</style>
