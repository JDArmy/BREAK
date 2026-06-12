<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import BREAK from "@/BREAK";
import KnowledgeSplitView from "@/components/KnowledgeSplitView.vue";
import ReferenceList from "@/components/ReferenceList.vue";

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const risks = Object.keys(BREAK.risks);
const selectedRiskKey = ref(route.hash.replace("#", "") || risks[0] || "");

const riskItems = computed(() =>
  risks.map((rKey) => ({
    id: rKey,
    title: t(`BREAK.risks.${rKey}.title`),
    subtitle: t(`BREAK.risks.${rKey}.definition`).slice(0, 56),
  }))
);

watch(
  () => route.hash,
  (hash) => {
    const key = hash.replace("#", "");
    if (key && BREAK.risks[key]) selectedRiskKey.value = key;
  },
  { immediate: true }
);

const selectedRisk = computed(() => BREAK.risks[selectedRiskKey.value]);

const getRiskDescriptionTools = (rKey: string) =>
  Object.keys(BREAK.attackTools).filter((atKey) => {
    const at = BREAK.attackTools[atKey as keyof typeof BREAK.attackTools];
    return at.directCauseRisks.includes(rKey) || at.indirectSupportRisks.includes(rKey);
  });

const openRelationGraph = (rKey: string) => {
  const relRoute = router.resolve({
    name: "relation",
    params: { type: "risk", key: rKey },
  });
  window.open(relRoute.href, "_blank", "noopener,noreferrer");
};
</script>

<template>
  <KnowledgeSplitView
    :title="$t('menu.risks')"
    route-name="risks"
    :items="riskItems"
    :selected-key="selectedRiskKey"
    :search-placeholder="$t('search.riskPlaceholder')"
    @select="selectedRiskKey = $event"
  >
    <article v-if="selectedRisk" class="detail-panel">
      <div class="detail-heading">
        <div>
          <div class="detail-id">{{ selectedRiskKey }}</div>
          <h2>{{ $t(`BREAK.risks.${selectedRiskKey}.title`) }}</h2>
        </div>
        <el-button type="primary" size="small" @click="openRelationGraph(selectedRiskKey)">
          {{ $t("openRelationGraph") }}
        </el-button>
      </div>

      <section class="detail-section">
        <h3>{{ $t("riskDefinition") }}</h3>
        <p>{{ $t(`BREAK.risks.${selectedRiskKey}.definition`) }}</p>
      </section>
      <section class="detail-section">
        <h3>{{ $t("riskDescription") }}</h3>
        <p>{{ $t(`BREAK.risks.${selectedRiskKey}.description`) }}</p>
      </section>
      <section class="detail-grid">
        <div>
          <h3>{{ $t("riskComplexity") }}</h3>
          <p>{{ $t(`BREAK.risks.${selectedRiskKey}.complexity`) }}</p>
        </div>
        <div>
          <h3>{{ $t("riskInfluence") }}</h3>
          <p>{{ $t(`BREAK.risks.${selectedRiskKey}.influence`) }}</p>
        </div>
      </section>
      <section class="detail-section">
        <h3>{{ $t("riskAvoidances") }}</h3>
        <div class="entity-links">
          <router-link
            v-for="aKey in selectedRisk.avoidances"
            :key="aKey"
            :to="{ name: 'avoidances', hash: `#${aKey}` }"
            class="entity-link"
          >
            {{ aKey }}: {{ $t(`BREAK.avoidances.${aKey}.title`) }}
          </router-link>
        </div>
      </section>
      <section v-if="getRiskDescriptionTools(selectedRiskKey).length" class="detail-section">
        <h3>{{ $t("attackTools") }}</h3>
        <div class="entity-links">
          <router-link
            v-for="atKey in getRiskDescriptionTools(selectedRiskKey)"
            :key="atKey"
            :to="{ name: 'attackTools', hash: `#${atKey}` }"
            class="entity-link"
          >
            {{ atKey }}: {{ $t(`BREAK.attackTools.${atKey}.title`) }}
          </router-link>
        </div>
      </section>
      <section v-if="selectedRisk.references?.length" class="detail-section">
        <h3>{{ $t("riskReference") }}</h3>
        <ReferenceList type="risks" :entity-key="selectedRiskKey" />
      </section>
    </article>
  </KnowledgeSplitView>
</template>
