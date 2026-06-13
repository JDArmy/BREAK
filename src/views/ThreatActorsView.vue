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

const threatActorKeys = Object.keys(BREAK.threatActors);
const selectedThreatActorKey = ref(route.hash.replace("#", "") || threatActorKeys[0] || "");

watch(
  () => route.hash,
  (hash) => {
    const key = hash.replace("#", "");
    if (key && BREAK.threatActors[key]) selectedThreatActorKey.value = key;
  },
  { immediate: true }
);

const threatActorItems = computed(() =>
  threatActorKeys.map((taKey) => {
    const threatActor = BREAK.threatActors[taKey];
    const title = t(`BREAK.threatActors.${taKey}.title`);
    const description = t(`BREAK.threatActors.${taKey}.description`);

    return {
      id: taKey,
      title,
      subtitle: description.slice(0, 56),
      searchText: [
        title,
        description,
        ...threatActor.directCauseRisks,
        ...threatActor.indirectSupportRisks,
        ...threatActor.buildAttackTools,
        ...threatActor.useAttackTools,
      ].join(" "),
    };
  })
);

const selectedThreatActor = computed(() => BREAK.threatActors[selectedThreatActorKey.value]);

const openRelationGraph = (taKey: string) => {
  const relRoute = router.resolve({
    name: "relation",
    params: { type: "threat-actor", key: taKey },
  });
  window.open(relRoute.href, "_blank", "noopener,noreferrer");
};
</script>

<template>
  <KnowledgeSplitView
    :title="$t('threatActors')"
    route-name="threatActors"
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
        <el-button type="primary" size="small" @click="openRelationGraph(selectedThreatActorKey)">
          {{ $t("openRelationGraph") }}
        </el-button>
      </div>

      <section class="detail-section">
        <h3>{{ $t("description") }}</h3>
        <p>{{ $t(`BREAK.threatActors.${selectedThreatActorKey}.description`) }}</p>
      </section>
      <section v-if="selectedThreatActor.directCauseRisks.length" class="detail-section">
        <h3>{{ $t("relationLine.directCauseRisk") }}</h3>
        <div class="entity-links">
          <router-link
            v-for="rKey in selectedThreatActor.directCauseRisks"
            :key="rKey"
            :to="{ name: 'risks', hash: `#${rKey}` }"
            class="entity-link"
          >
            {{ rKey }}: {{ $t(`BREAK.risks.${rKey}.title`) }}
          </router-link>
        </div>
      </section>
      <section v-if="selectedThreatActor.indirectSupportRisks.length" class="detail-section">
        <h3>{{ $t("relationLine.indirectSupportRisk") }}</h3>
        <div class="entity-links">
          <router-link
            v-for="rKey in selectedThreatActor.indirectSupportRisks"
            :key="rKey"
            :to="{ name: 'risks', hash: `#${rKey}` }"
            class="entity-link"
          >
            {{ rKey }}: {{ $t(`BREAK.risks.${rKey}.title`) }}
          </router-link>
        </div>
      </section>
      <section v-if="selectedThreatActor.buildAttackTools.length" class="detail-section">
        <h3>{{ $t("buildAttackTools") }}</h3>
        <div class="entity-links">
          <router-link
            v-for="atKey in selectedThreatActor.buildAttackTools"
            :key="atKey"
            :to="{ name: 'attackTools', hash: `#${atKey}` }"
            class="entity-link"
          >
            {{ atKey }}: {{ $t(`BREAK.attackTools.${atKey}.title`) }}
          </router-link>
        </div>
      </section>
      <section v-if="selectedThreatActor.useAttackTools.length" class="detail-section">
        <h3>{{ $t("useAttackTools") }}</h3>
        <div class="entity-links">
          <router-link
            v-for="atKey in selectedThreatActor.useAttackTools"
            :key="atKey"
            :to="{ name: 'attackTools', hash: `#${atKey}` }"
            class="entity-link"
          >
            {{ atKey }}: {{ $t(`BREAK.attackTools.${atKey}.title`) }}
          </router-link>
        </div>
      </section>
      <section v-if="selectedThreatActor.references?.length" class="detail-section">
        <h3>{{ $t("references") }}</h3>
        <ReferenceList type="threatActors" :entity-key="selectedThreatActorKey" />
      </section>
    </article>
  </KnowledgeSplitView>
</template>
