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

const avoidanceKeys = Object.keys(BREAK.avoidances);
const selectedAvoidanceKey = ref(route.hash.replace("#", "") || avoidanceKeys[0] || "");
const selectedCategory = ref("");

watch(
  () => route.hash,
  (hash) => {
    const key = hash.replace("#", "");
    if (key && BREAK.avoidances[key]) selectedAvoidanceKey.value = key;
  },
  { immediate: true }
);

const avoidanceItems = computed(() =>
  avoidanceKeys
    .filter(
      (aKey) =>
        !selectedCategory.value ||
        BREAK.avoidances[aKey].category === selectedCategory.value
    )
    .map((aKey) => {
      const category = BREAK.avoidances[aKey].category;
      const title = t(`BREAK.avoidances.${aKey}.title`);
      const definition = t(`BREAK.avoidances.${aKey}.definition`);
      const description = t(`BREAK.avoidances.${aKey}.description`);
      const limitation = BREAK.avoidances[aKey].limitation
        ? t(`BREAK.avoidances.${aKey}.limitation`)
        : "";
      const categoryTitle = t(`BREAK.avoidanceCategories.${category}.title`);

      return {
        id: aKey,
        title,
        subtitle: `${category}: ${categoryTitle}`,
        searchText: [title, definition, description, limitation, category, categoryTitle]
          .filter(Boolean)
          .join(" "),
      };
    })
);

watch(selectedCategory, () => {
  if (
    selectedCategory.value &&
    selectedAvoidance.value?.category !== selectedCategory.value
  ) {
    selectedAvoidanceKey.value = avoidanceItems.value[0]?.id || "";
  }
});

const selectedAvoidance = computed(() => BREAK.avoidances[selectedAvoidanceKey.value]);

const relatedRiskKeys = computed(() =>
  Object.keys(BREAK.risks).filter((rKey) =>
    BREAK.risks[rKey].avoidances.includes(selectedAvoidanceKey.value)
  )
);

const relatedAttackToolKeys = computed(() =>
  Object.keys(BREAK.attackTools).filter((atKey) =>
    BREAK.attackTools[atKey].avoidances.includes(selectedAvoidanceKey.value)
  )
);

const openRelationGraph = (aKey: string) => {
  const relRoute = router.resolve({
    name: "relation",
    params: { type: "avoidance", key: aKey },
  });
  window.open(relRoute.href, "_blank", "noopener,noreferrer");
};
</script>

<template>
  <KnowledgeSplitView
    :title="$t('menu.avoidances')"
    route-name="avoidances"
    :items="avoidanceItems"
    :selected-key="selectedAvoidanceKey"
    :search-placeholder="$t('search.avoidancePlaceholder')"
    @select="selectedAvoidanceKey = $event"
  >
    <template #filters>
      <el-select
        v-model="selectedCategory"
        class="avoidance-category-filter"
        size="small"
        clearable
        :placeholder="$t('allCategories')"
      >
        <el-option
          v-for="(category, categoryKey) in BREAK.avoidanceCategories"
          :key="categoryKey"
          :label="$t(`BREAK.avoidanceCategories.${categoryKey}.title`)"
          :value="categoryKey"
        />
      </el-select>
    </template>

    <article v-if="selectedAvoidance" class="detail-panel">
      <div class="detail-heading">
        <div>
          <div class="detail-id">{{ selectedAvoidanceKey }}</div>
          <h2>{{ $t(`BREAK.avoidances.${selectedAvoidanceKey}.title`) }}</h2>
        </div>
        <el-button type="primary" size="small" @click="openRelationGraph(selectedAvoidanceKey)">
          {{ $t("openRelationGraph") }}
        </el-button>
      </div>

      <section class="detail-section">
        <h3>{{ $t("definition") }}</h3>
        <p>{{ $t(`BREAK.avoidances.${selectedAvoidanceKey}.definition`) }}</p>
      </section>
      <section class="detail-section">
        <h3>{{ $t("description") }}</h3>
        <p>{{ $t(`BREAK.avoidances.${selectedAvoidanceKey}.description`) }}</p>
      </section>
      <section v-if="$t(`BREAK.avoidances.${selectedAvoidanceKey}.limitation`)" class="detail-section">
        <h3>{{ $t("limitation") }}</h3>
        <p>{{ $t(`BREAK.avoidances.${selectedAvoidanceKey}.limitation`) }}</p>
      </section>
      <section class="detail-section">
        <h3>{{ $t("menu.avoidances") }}</h3>
        <p>
          {{ selectedAvoidance.category }}:
          {{ $t(`BREAK.avoidanceCategories.${selectedAvoidance.category}.title`) }}
        </p>
      </section>
      <section v-if="relatedRiskKeys.length" class="detail-section">
        <h3>{{ $t("risks") }}</h3>
        <div class="entity-links">
          <router-link
            v-for="rKey in relatedRiskKeys"
            :key="rKey"
            :to="{ name: 'risks', hash: `#${rKey}` }"
            class="entity-link"
          >
            {{ rKey }}: {{ $t(`BREAK.risks.${rKey}.title`) }}
          </router-link>
        </div>
      </section>
      <section v-if="relatedAttackToolKeys.length" class="detail-section">
        <h3>{{ $t("attackTools") }}</h3>
        <div class="entity-links">
          <router-link
            v-for="atKey in relatedAttackToolKeys"
            :key="atKey"
            :to="{ name: 'attackTools', hash: `#${atKey}` }"
            class="entity-link"
          >
            {{ atKey }}: {{ $t(`BREAK.attackTools.${atKey}.title`) }}
          </router-link>
        </div>
      </section>
      <section v-if="selectedAvoidance.references?.length" class="detail-section">
        <h3>{{ $t("references") }}</h3>
        <ReferenceList type="avoidances" :entity-key="selectedAvoidanceKey" />
      </section>
    </article>
  </KnowledgeSplitView>
</template>

<style scoped>
.avoidance-category-filter {
  flex: 0 0 96px;
}
</style>
