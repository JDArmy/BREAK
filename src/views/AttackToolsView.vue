<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import BREAK from "@/BREAK";
import KnowledgeSplitView from "@/components/KnowledgeSplitView.vue";
import ReferenceList from "@/components/ReferenceList.vue";
import { getMessageStringArray } from "@/utils/i18nMessage";
import { useBreakpoints } from "@/composables/useBreakpoints";

const route = useRoute();
const router = useRouter();
const { t, locale, messages } = useI18n();
const { isMobile } = useBreakpoints();

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

const builderThreatActorKeys = computed(() =>
  Object.keys(BREAK.threatActors).filter((taKey) =>
    BREAK.threatActors[taKey].buildAttackTools.includes(selectedAttackToolKey.value)
  )
);

const userThreatActorKeys = computed(() =>
  Object.keys(BREAK.threatActors).filter((taKey) =>
    BREAK.threatActors[taKey].useAttackTools.includes(selectedAttackToolKey.value)
  )
);

const relatedTermKeys = computed(() =>
  Object.keys(BREAK.terms).filter((tKey) =>
    BREAK.terms[tKey].relatedAttackTools.includes(selectedAttackToolKey.value)
  )
);

const openRelationGraph = (atKey: string) => {
  router.push({
    name: "relation",
    params: { type: "attack-tool", key: atKey },
  });
};
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
      <section v-if="selectedAttackTool.directCauseRisks.length" class="detail-section" data-detail-anchor="risks">
        <h3>{{ $t("relationLine.directCauseRisk") }}</h3>
        <div class="entity-links">
          <router-link
            v-for="rKey in selectedAttackTool.directCauseRisks"
            :key="rKey"
            :to="isMobile ? { name: 'risksDetail', params: { rKey } } : { name: 'risks', hash: `#${rKey}` }"
            class="entity-link"
          >
            {{ rKey }}: {{ $t(`BREAK.risks.${rKey}.title`) }}
          </router-link>
        </div>
      </section>
      <section v-if="selectedAttackTool.indirectSupportRisks.length" class="detail-section" data-detail-anchor="risks">
        <h3>{{ $t("relationLine.indirectSupportRisk") }}</h3>
        <div class="entity-links">
          <router-link
            v-for="rKey in selectedAttackTool.indirectSupportRisks"
            :key="rKey"
            :to="isMobile ? { name: 'risksDetail', params: { rKey } } : { name: 'risks', hash: `#${rKey}` }"
            class="entity-link"
          >
            {{ rKey }}: {{ $t(`BREAK.risks.${rKey}.title`) }}
          </router-link>
        </div>
      </section>
      <section v-if="selectedAttackTool.avoidances.length" class="detail-section" data-detail-anchor="avoidances">
        <h3>{{ $t("avoidance") }}</h3>
        <div class="entity-links">
          <router-link
            v-for="aKey in selectedAttackTool.avoidances"
            :key="aKey"
            :to="isMobile ? { name: 'avoidancesDetail', params: { aKey } } : { name: 'avoidances', hash: `#${aKey}` }"
            class="entity-link"
          >
            {{ aKey }}: {{ $t(`BREAK.avoidances.${aKey}.title`) }}
          </router-link>
        </div>
      </section>
      <section v-if="builderThreatActorKeys.length" class="detail-section" data-detail-anchor="threat-actors">
        <h3>{{ $t("buildAttackTools") }}</h3>
        <div class="entity-links">
          <router-link
            v-for="taKey in builderThreatActorKeys"
            :key="taKey"
            :to="isMobile ? { name: 'threatActorsDetail', params: { taKey } } : { name: 'threatActors', hash: `#${taKey}` }"
            class="entity-link"
          >
            {{ taKey }}: {{ $t(`BREAK.threatActors.${taKey}.title`) }}
          </router-link>
        </div>
      </section>
      <section v-if="userThreatActorKeys.length" class="detail-section" data-detail-anchor="threat-actors">
        <h3>{{ $t("useAttackTools") }}</h3>
        <div class="entity-links">
          <router-link
            v-for="taKey in userThreatActorKeys"
            :key="taKey"
            :to="isMobile ? { name: 'threatActorsDetail', params: { taKey } } : { name: 'threatActors', hash: `#${taKey}` }"
            class="entity-link"
          >
            {{ taKey }}: {{ $t(`BREAK.threatActors.${taKey}.title`) }}
          </router-link>
        </div>
      </section>
      <section v-if="relatedTermKeys.length" class="detail-section" data-detail-anchor="terms">
        <h3>{{ $t("terms") }}</h3>
        <div class="entity-links">
          <router-link
            v-for="tKey in relatedTermKeys"
            :key="tKey"
            :to="isMobile ? { name: 'termsDetail', params: { tKey } } : { name: 'terms', hash: `#${tKey}` }"
            class="entity-link"
          >
            {{ tKey }}: {{ $t(`BREAK.terms.${tKey}.title`) }}
          </router-link>
        </div>
      </section>
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
