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

const attackToolKeys = Object.keys(BREAK.attackTools);
const selectedAttackToolKey = ref(route.hash.replace("#", "") || attackToolKeys[0] || "");

watch(
  () => route.hash,
  (hash) => {
    const key = hash.replace("#", "");
    if (key && BREAK.attackTools[key]) selectedAttackToolKey.value = key;
  },
  { immediate: true }
);

const attackToolItems = computed(() =>
  attackToolKeys.map((atKey) => {
    const attackTool = BREAK.attackTools[atKey];
    const title = t(`BREAK.attackTools.${atKey}.title`);
    const description = t(`BREAK.attackTools.${atKey}.description`);

    return {
      id: atKey,
      title,
      subtitle: description.slice(0, 56),
      searchText: [
        title,
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

const openRelationGraph = (atKey: string) => {
  const relRoute = router.resolve({
    name: "relation",
    params: { type: "attack-tool", key: atKey },
  });
  window.open(relRoute.href, "_blank", "noopener,noreferrer");
};
</script>

<template>
  <KnowledgeSplitView
    :title="$t('attackTools')"
    route-name="attackTools"
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

      <section class="detail-section">
        <h3>{{ $t("description") }}</h3>
        <p>{{ $t(`BREAK.attackTools.${selectedAttackToolKey}.description`) }}</p>
      </section>
      <section v-if="selectedAttackTool.directCauseRisks.length" class="detail-section">
        <h3>{{ $t("relationLine.directCauseRisk") }}</h3>
        <div class="entity-links">
          <router-link
            v-for="rKey in selectedAttackTool.directCauseRisks"
            :key="rKey"
            :to="{ name: 'risks', hash: `#${rKey}` }"
            class="entity-link"
          >
            {{ rKey }}: {{ $t(`BREAK.risks.${rKey}.title`) }}
          </router-link>
        </div>
      </section>
      <section v-if="selectedAttackTool.indirectSupportRisks.length" class="detail-section">
        <h3>{{ $t("relationLine.indirectSupportRisk") }}</h3>
        <div class="entity-links">
          <router-link
            v-for="rKey in selectedAttackTool.indirectSupportRisks"
            :key="rKey"
            :to="{ name: 'risks', hash: `#${rKey}` }"
            class="entity-link"
          >
            {{ rKey }}: {{ $t(`BREAK.risks.${rKey}.title`) }}
          </router-link>
        </div>
      </section>
      <section v-if="selectedAttackTool.avoidances.length" class="detail-section">
        <h3>{{ $t("avoidance") }}</h3>
        <div class="entity-links">
          <router-link
            v-for="aKey in selectedAttackTool.avoidances"
            :key="aKey"
            :to="{ name: 'avoidances', hash: `#${aKey}` }"
            class="entity-link"
          >
            {{ aKey }}: {{ $t(`BREAK.avoidances.${aKey}.title`) }}
          </router-link>
        </div>
      </section>
      <section v-if="builderThreatActorKeys.length" class="detail-section">
        <h3>{{ $t("buildAttackTools") }}</h3>
        <div class="entity-links">
          <router-link
            v-for="taKey in builderThreatActorKeys"
            :key="taKey"
            :to="{ name: 'threatActors', hash: `#${taKey}` }"
            class="entity-link"
          >
            {{ taKey }}: {{ $t(`BREAK.threatActors.${taKey}.title`) }}
          </router-link>
        </div>
      </section>
      <section v-if="userThreatActorKeys.length" class="detail-section">
        <h3>{{ $t("useAttackTools") }}</h3>
        <div class="entity-links">
          <router-link
            v-for="taKey in userThreatActorKeys"
            :key="taKey"
            :to="{ name: 'threatActors', hash: `#${taKey}` }"
            class="entity-link"
          >
            {{ taKey }}: {{ $t(`BREAK.threatActors.${taKey}.title`) }}
          </router-link>
        </div>
      </section>
      <section v-if="selectedAttackTool.references?.length" class="detail-section">
        <h3>{{ $t("references") }}</h3>
        <ReferenceList type="attackTools" :entity-key="selectedAttackToolKey" />
      </section>
    </article>
  </KnowledgeSplitView>
</template>
