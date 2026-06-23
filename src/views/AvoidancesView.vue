<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import BREAK from "@/BREAK";
import KnowledgeSplitView from "@/components/KnowledgeSplitView.vue";
import ReferenceList from "@/components/ReferenceList.vue";
import EntityLinkSection from "@/components/EntityLinkSection.vue";
import { getMessageStringArray } from "@/utils/i18nMessage";
import { useRelatedEntities } from "@/composables/useRelatedEntities";
import { useRelationGraph } from "@/composables/useRelationGraph";
import { formatAvoidanceRelationNote } from "@/utils/relationNote";

const route = useRoute();
const { t, locale, messages } = useI18n();

const avoidanceKeys = Object.keys(BREAK.avoidances);
// 优先从路由参数获取，否则从 hash 获取，最后使用默认值
const getInitialKey = () => {
  const paramKey = typeof route.params.aKey === 'string' ? route.params.aKey : '';
  const hashKey = route.hash.replace("#", "");
  return paramKey || hashKey || avoidanceKeys[0] || "";
};
const selectedAvoidanceKey = ref(getInitialKey());
const selectedCategory = ref("");

watch(
  () => route.hash,
  (hash) => {
    const key = hash.replace("#", "");
    if (key && BREAK.avoidances[key]) selectedAvoidanceKey.value = key;
  },
  { immediate: true }
);

watch(
  () => route.params.aKey,
  (key) => {
    if (key && typeof key === "string" && BREAK.avoidances[key]) selectedAvoidanceKey.value = key;
  }
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
      const localeMessages = messages.value[locale.value] as Record<string, unknown>;
      const keywords = getMessageStringArray(
        localeMessages,
        `BREAK.avoidances.${aKey}.keywords`
      );

      return {
        id: aKey,
        title,
        badge: `${category}: ${categoryTitle}`,
        badgeType: category.toLowerCase(),
        subtitle: definition.slice(0, 50),
        searchText: [title, ...keywords, definition, description, limitation, category, categoryTitle]
          .filter(Boolean)
          .join(" "),
      };
    })
);

const selectedAvoidance = computed(() => BREAK.avoidances[selectedAvoidanceKey.value]);
const selectedAvoidanceEffectiveness = computed(() => selectedAvoidance.value?.effectiveness);
const relatedAvoidanceRelations = computed(() => selectedAvoidance.value?.relatedAvoidances ?? []);
const getAvoidanceRelationNote = (relation: NonNullable<typeof relatedAvoidanceRelations.value>[number]) =>
  formatAvoidanceRelationNote(relation, locale.value, t);

watch(selectedCategory, () => {
  if (
    selectedCategory.value &&
    selectedAvoidance.value?.category !== selectedCategory.value
  ) {
    selectedAvoidanceKey.value = avoidanceItems.value[0]?.id || "";
  }
});

const localeMessages = computed(() => messages.value[locale.value] as Record<string, unknown>);

// 反查：引用该规避手段的风险、攻击工具，以及关联该规避手段的术语
const relatedRiskKeys = useRelatedEntities(BREAK.risks, "avoidances", selectedAvoidanceKey);
const relatedAttackToolKeys = useRelatedEntities(
  BREAK.attackTools,
  "avoidances",
  selectedAvoidanceKey,
);
const relatedTermKeys = useRelatedEntities(BREAK.terms, "relatedAvoidances", selectedAvoidanceKey);

const { openRelationGraph } = useRelationGraph("avoidance");
</script>

<template>
  <KnowledgeSplitView
    :title="$t('menu.avoidances')"
    route-name="avoidances"
    detail-route-name="avoidancesDetail"
    :items="avoidanceItems"
    :selected-key="selectedAvoidanceKey"
    :search-placeholder="$t('search.avoidancePlaceholder')"
    @select="selectedAvoidanceKey = $event"
  >
    <template #filters>
      <el-select
        id="avoidance-category-filter"
        v-model="selectedCategory"
        class="avoidance-category-filter"
        name="avoidance-category-filter"
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

      <section class="detail-section" data-detail-anchor="avoidances">
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
      <section v-if="getMessageStringArray(localeMessages, `BREAK.avoidances.${selectedAvoidanceKey}.keywords`).length" class="detail-section">
        <h3>{{ $t("keywords") }}</h3>
        <div class="keywords">
          <span v-for="keyword in getMessageStringArray(localeMessages, `BREAK.avoidances.${selectedAvoidanceKey}.keywords`)" :key="keyword" class="keyword-tag">
            {{ keyword }}
          </span>
        </div>
      </section>
      <section class="detail-section">
        <h3>{{ $t("menu.avoidances") }}</h3>
        <p>
          {{ selectedAvoidance.category }}:
          {{ $t(`BREAK.avoidanceCategories.${selectedAvoidance.category}.title`) }}
        </p>
      </section>
      <section v-if="selectedAvoidanceEffectiveness" class="detail-section">
        <h3>{{ $t("avoidanceEffectiveness") }}</h3>
        <p>{{ $t(`relationView.avoidanceEffectiveness.${selectedAvoidanceEffectiveness}`) }}</p>
      </section>
      <section v-if="relatedAvoidanceRelations.length" class="detail-section">
        <h3>{{ $t("avoidanceRelatedAvoidances") }}</h3>
        <div class="avoidance-relation-list">
          <router-link
            v-for="relation in relatedAvoidanceRelations"
            :key="`${relation.key}-${relation.relation}`"
            class="avoidance-relation-item"
            :to="{ name: 'avoidances', hash: `#${relation.key}` }"
          >
            <span class="avoidance-relation-type">{{ $t(`avoidanceRelationType.${relation.relation}`) }}</span>
            <span class="avoidance-relation-title">
              {{ relation.key }}: {{ $t(`BREAK.avoidances.${relation.key}.title`) }}
            </span>
            <span v-if="relation.note" class="avoidance-relation-note">{{ getAvoidanceRelationNote(relation) }}</span>
          </router-link>
        </div>
      </section>
      <EntityLinkSection
        :keys="relatedRiskKeys"
        title="risks"
        route-name="risks"
        detail-route-name="risksDetail"
        param-key="rKey"
        anchor="risks"
      />
      <EntityLinkSection
        :keys="relatedAttackToolKeys"
        title="attackTools"
        route-name="attackTools"
        detail-route-name="attackToolsDetail"
        param-key="atKey"
        anchor="attack-tools"
      />
      <EntityLinkSection
        :keys="relatedTermKeys"
        title="terms"
        route-name="terms"
        detail-route-name="termsDetail"
        param-key="tKey"
        anchor="terms"
      />
      <section v-if="selectedAvoidance.references?.length" class="detail-section" data-detail-anchor="references">
        <h3>{{ $t("references") }}</h3>
        <ReferenceList type="avoidances" :entity-key="selectedAvoidanceKey" />
      </section>
      <section v-if="selectedAvoidance.updated" class="detail-section">
        <h3>{{ $t("lastUpdated") }}</h3>
        <p class="text-muted">{{ selectedAvoidance.updated }}</p>
      </section>
    </article>
  </KnowledgeSplitView>
</template>

<style scoped>
.avoidance-category-filter {
  flex: 0 0 96px;
}

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

.avoidance-relation-list {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.avoidance-relation-item {
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

.avoidance-relation-item:hover {
  color: var(--break-primary);
  border-color: var(--break-primary);
}

.avoidance-relation-type {
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

.avoidance-relation-title {
  grid-area: title;
  min-width: 0;
  overflow: hidden;
  font-weight: 600;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.avoidance-relation-note {
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
  .avoidance-relation-list {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 721px) and (max-width: 1180px) {
  .avoidance-relation-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1181px) and (max-width: 1599px) {
  .avoidance-relation-list {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
