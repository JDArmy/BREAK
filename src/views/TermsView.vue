<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import BREAK from "@/BREAK";
import KnowledgeSplitView from "@/components/KnowledgeSplitView.vue";
import ReferenceList from "@/components/ReferenceList.vue";
import { getMessageStringArray, getNestedMessageValue } from "@/utils/i18nMessage";
import { useBreakpoints } from "@/composables/useBreakpoints";

const route = useRoute();
const { locale, messages } = useI18n();
const { isMobile } = useBreakpoints();

const termKeys = Object.keys(BREAK.terms);

const getInitialKey = () => {
  const paramKey = typeof route.params.tKey === "string" ? route.params.tKey : "";
  const hashKey = route.hash.replace("#", "");
  return paramKey || hashKey || termKeys[0] || "";
};

const selectedTermKey = ref(getInitialKey());

watch(
  () => route.hash,
  (hash) => {
    const key = hash.replace("#", "");
    if (key && BREAK.terms[key]) selectedTermKey.value = key;
  },
  { immediate: true }
);

watch(
  () => route.params.tKey,
  (tKey) => {
    if (tKey && typeof tKey === 'string' && BREAK.terms[tKey]) {
      selectedTermKey.value = tKey;
    }
  }
);

const localeMessages = computed(() => messages.value[locale.value] as Record<string, unknown>);

const getTermString = (termKey: string, field: string) =>
  String(getNestedMessageValue(localeMessages.value, `BREAK.terms.${termKey}.${field}`) || "");

const getTermStringArray = (termKey: string, field: string) =>
  getMessageStringArray(localeMessages.value, `BREAK.terms.${termKey}.${field}`);

const termItems = computed(() =>
  termKeys.map((termKey) => {
    const aliases = getTermStringArray(termKey, "aliases");
    const category = getTermString(termKey, "category");
    const definition = getTermString(termKey, "definition");

    return {
      id: termKey,
      title: getTermString(termKey, "title"),
      subtitle: aliases[0] ? `${aliases[0]} - ${definition.slice(0, 48)}` : definition.slice(0, 48),
      badge: category,
      searchText: [
        getTermString(termKey, "title"),
        ...aliases,
        definition,
        getTermString(termKey, "description"),
        category,
      ]
        .filter(Boolean)
        .join(" "),
    };
  })
);

const selectedTerm = computed(() => BREAK.terms[selectedTermKey.value]);
const selectedTermAliases = computed(() => getTermStringArray(selectedTermKey.value, "aliases"));
</script>

<template>
  <KnowledgeSplitView
    :title="$t('terms')"
    route-name="terms"
    detail-route-name="termsDetail"
    :items="termItems"
    :selected-key="selectedTermKey"
    :search-placeholder="$t('search.termPlaceholder')"
    @select="selectedTermKey = $event"
  >
    <article v-if="selectedTerm" class="detail-panel">
      <div class="detail-heading">
        <div>
          <div class="detail-id">{{ selectedTermKey }}</div>
          <h2>{{ $t(`BREAK.terms.${selectedTermKey}.title`) }}</h2>
        </div>
      </div>

      <section class="detail-section">
        <h3>{{ $t("definition") }}</h3>
        <p>{{ $t(`BREAK.terms.${selectedTermKey}.definition`) }}</p>
      </section>
      <section class="detail-section">
        <h3>{{ $t("description") }}</h3>
        <p>{{ $t(`BREAK.terms.${selectedTermKey}.description`) }}</p>
      </section>
      <section v-if="selectedTerm.category" class="detail-section">
        <h3>{{ $t("termCategory") }}</h3>
        <p>{{ $t(`BREAK.terms.${selectedTermKey}.category`) }}</p>
      </section>
      <section v-if="selectedTermAliases.length" class="detail-section">
        <h3>{{ $t("aliases") }}</h3>
        <div class="keywords">
          <span v-for="alias in selectedTermAliases" :key="alias" class="keyword-tag">
            {{ alias }}
          </span>
        </div>
      </section>
      <section v-if="getTermStringArray(selectedTermKey, 'keywords').length" class="detail-section">
        <h3>{{ $t("keywords") }}</h3>
        <div class="keywords">
          <span v-for="keyword in getTermStringArray(selectedTermKey, 'keywords')" :key="keyword" class="keyword-tag">
            {{ keyword }}
          </span>
        </div>
      </section>
      <section v-if="selectedTerm.usageExample" class="detail-section">
        <h3>{{ $t("usageExample") }}</h3>
        <p>{{ $t(`BREAK.terms.${selectedTermKey}.usageExample`) }}</p>
      </section>
      <section v-if="selectedTerm.relatedThreatActors.length" class="detail-section">
        <h3>{{ $t("threatActors") }}</h3>
        <div class="entity-links">
          <router-link
            v-for="taKey in selectedTerm.relatedThreatActors"
            :key="taKey"
            :to="isMobile ? { name: 'threatActorsDetail', params: { taKey } } : { name: 'threatActors', hash: `#${taKey}` }"
            class="entity-link"
          >
            {{ taKey }}: {{ $t(`BREAK.threatActors.${taKey}.title`) }}
          </router-link>
        </div>
      </section>
      <section v-if="selectedTerm.relatedAttackTools.length" class="detail-section">
        <h3>{{ $t("attackTools") }}</h3>
        <div class="entity-links">
          <router-link
            v-for="atKey in selectedTerm.relatedAttackTools"
            :key="atKey"
            :to="isMobile ? { name: 'attackToolsDetail', params: { atKey } } : { name: 'attackTools', hash: `#${atKey}` }"
            class="entity-link"
          >
            {{ atKey }}: {{ $t(`BREAK.attackTools.${atKey}.title`) }}
          </router-link>
        </div>
      </section>
      <section v-if="selectedTerm.relatedRisks.length" class="detail-section">
        <h3>{{ $t("risks") }}</h3>
        <div class="entity-links">
          <router-link
            v-for="rKey in selectedTerm.relatedRisks"
            :key="rKey"
            :to="isMobile ? { name: 'risksDetail', params: { rKey } } : { name: 'risks', hash: `#${rKey}` }"
            class="entity-link"
          >
            {{ rKey }}: {{ $t(`BREAK.risks.${rKey}.title`) }}
          </router-link>
        </div>
      </section>
      <section v-if="selectedTerm.relatedAvoidances.length" class="detail-section">
        <h3>{{ $t("riskAvoidances") }}</h3>
        <div class="entity-links">
          <router-link
            v-for="aKey in selectedTerm.relatedAvoidances"
            :key="aKey"
            :to="isMobile ? { name: 'avoidancesDetail', params: { aKey } } : { name: 'avoidances', hash: `#${aKey}` }"
            class="entity-link"
          >
            {{ aKey }}: {{ $t(`BREAK.avoidances.${aKey}.title`) }}
          </router-link>
        </div>
      </section>
      <section v-if="selectedTerm.relatedBusinessScenes.length" class="detail-section">
        <h3>{{ $t("businessScenes") }}</h3>
        <div class="entity-links">
          <router-link
            v-for="bsKey in selectedTerm.relatedBusinessScenes"
            :key="bsKey"
            :to="{ name: 'businessScene', params: { bsKey }, hash: `#${bsKey}` }"
            class="entity-link"
          >
            {{ bsKey }}: {{ $t(`BREAK.businessScenes.${bsKey}.title`) }}
          </router-link>
        </div>
      </section>
      <section v-if="selectedTerm.references?.length" class="detail-section">
        <h3>{{ $t("references") }}</h3>
        <ReferenceList type="terms" :entity-key="selectedTermKey" />
      </section>
      <section v-if="selectedTerm.updated" class="detail-section">
        <h3>{{ $t("lastUpdated") }}</h3>
        <p class="text-muted">{{ selectedTerm.updated }}</p>
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
