<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import BREAK from "@/BREAK";
import ReferenceList from "@/components/ReferenceList.vue";
import FeedbackLink from "@/components/FeedbackLink.vue";
import { getMessageStringArray } from "@/utils/i18nMessage";
import { entityDetailHref } from "@/utils/entityRoute";

import { ArrowLeft, TopRight } from "@element-plus/icons-vue";
import { useDrawerWidth } from "@/composables/useDrawerWidth";

const props = defineProps<{
  drawer: boolean;
  tKey: string;
}>();
defineEmits(["drawerClose"]);

const { locale, messages } = useI18n();
const { getInnerDrawerWidth } = useDrawerWidth();
const router = useRouter();

const localeMessages = computed(() => messages.value[locale.value] as Record<string, unknown>);
const aliases = computed(() =>
  getMessageStringArray(localeMessages.value, `BREAK.terms.${props.tKey}.aliases`)
);

// 跳知识库详情页（新窗口）
const detailHref = computed(() => entityDetailHref(router, props.tKey, "term"));
const openDetail = () => {
  if (detailHref.value) window.open(detailHref.value, "_blank", "noopener,noreferrer");
};
</script>

<template>
  <el-drawer
    v-if="tKey && BREAK.terms[tKey as keyof typeof BREAK.terms]"
    :model-value="drawer"
    @closed="$emit('drawerClose')"
    :append-to-body="true"
    :size="getInnerDrawerWidth()"
  >
    <template #header>
      <div class="drawer-header-with-back">
        <el-button text size="small" @click="$emit('drawerClose')" class="drawer-back-btn">
          <el-icon><ArrowLeft /></el-icon>
          {{ $t("back") }}
        </el-button>
        <span class="drawer-header-title">{{ $t("termDetail") }}</span>
        <FeedbackLink :entity-id="tKey" :entity-title="$t(`BREAK.terms.${tKey}.title`)" style="margin-left: auto" />
      </div>
    </template>
    <div class="desc">
      <strong>{{ $t("termId") }}:&nbsp;</strong>
      <a :href="detailHref" target="_blank" rel="noopener" class="id-link">
        {{ tKey }}
        <el-icon class="external-link-icon" aria-hidden="true"><TopRight /></el-icon>
      </a>
    </div>
    <div class="desc">
      <strong>{{ $t("title") }}:&nbsp;</strong>
      {{ $t(`BREAK.terms.${tKey}.title`) }}
    </div>
    <div v-if="BREAK.terms[tKey as keyof typeof BREAK.terms].category" class="desc">
      <strong>{{ $t("termCategory") }}:&nbsp;</strong>
      {{ $t(`BREAK.terms.${tKey}.category`) }}
    </div>
    <div class="desc">
      <strong>{{ $t("definition") }}:&nbsp;</strong>
      {{ $t(`BREAK.terms.${tKey}.definition`) }}
    </div>
    <div class="desc">
      <strong>{{ $t("description") }}:&nbsp;</strong>
      {{ $t(`BREAK.terms.${tKey}.description`) }}
    </div>
    <div v-if="aliases.length" class="desc">
      <strong>{{ $t("aliases") }}:&nbsp;</strong>
      <div class="tag-list">
        <span v-for="alias in aliases" :key="alias" class="tag-chip">{{ alias }}</span>
      </div>
    </div>
    <div v-if="getMessageStringArray(localeMessages, `BREAK.terms.${tKey}.keywords`).length" class="desc">
      <strong>{{ $t("keywords") }}:&nbsp;</strong>
      <div class="tag-list">
        <span
          v-for="keyword in getMessageStringArray(localeMessages, `BREAK.terms.${tKey}.keywords`)"
          :key="keyword"
          class="tag-chip"
        >
          {{ keyword }}
        </span>
      </div>
    </div>
    <div v-if="BREAK.terms[tKey as keyof typeof BREAK.terms].usageExample" class="desc">
      <strong>{{ $t("usageExample") }}:&nbsp;</strong>
      {{ $t(`BREAK.terms.${tKey}.usageExample`) }}
    </div>
    <div v-if="BREAK.terms[tKey as keyof typeof BREAK.terms].relatedBusinessScenes.length" class="desc">
      <strong>{{ $t("businessScenes") }}:&nbsp;</strong>
      <div class="tag-list">
        <router-link
          v-for="sceneKey in BREAK.terms[tKey as keyof typeof BREAK.terms].relatedBusinessScenes"
          :key="sceneKey"
          :to="{ name: 'businessScene', params: { bsKey: sceneKey } }"
          class="tag-chip tag-link"
        >
          {{ sceneKey }}: {{ $t(`BREAK.businessScenes.${sceneKey}.title`) }}
        </router-link>
      </div>
    </div>
    <div v-if="BREAK.terms[tKey as keyof typeof BREAK.terms].references?.length > 0" class="desc">
      <strong>{{ $t("references") }}:&nbsp;</strong>
      <ReferenceList type="terms" :entity-key="tKey" />
    </div>
    <div class="desc">
      <el-button type="primary" plain size="small" @click="openDetail()">
        {{ $t("viewDetail") }}
        <el-icon class="external-link-icon" aria-hidden="true"><TopRight /></el-icon>
      </el-button>
    </div>
  </el-drawer>
</template>

<style src="./drawer-detail-shared.css" scoped></style>

<style scoped>
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-chip {
  display: inline-block;
  padding: 4px 10px;
  background: var(--break-bg-secondary);
  border: 1px solid var(--break-border);
  border-radius: 4px;
  color: var(--break-text-secondary);
  font-size: 0.9em;
}

.tag-link {
  text-decoration: none;
}
</style>
