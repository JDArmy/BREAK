<script setup lang="ts">
import ReferenceBadge from "./ReferenceBadge.vue";

interface AcademicReferenceMeta {
  year?: string;
  venue?: string;
  doi?: string;
  scholarId?: string;
  citesId?: string;
  clusterId?: string;
  citedBy?: number;
  pdf?: string;
}

interface Reference {
  link: string;
  title: string;
  type?: string;
  source?: string;
  evidenceLevel?: string;
  academic?: AcademicReferenceMeta;
}

defineProps<{
  references?: Reference[];
}>();
</script>

<template>
  <div v-if="references && references.length > 0" class="reference-list">
    <div v-for="(ref, index) in references" :key="index" class="reference-item">
      <a v-if="ref.link" :href="ref.link" target="_blank" rel="noopener noreferrer">
        {{ ref.title }}
      </a>
      <span v-else>{{ ref.title }}</span>
      <ReferenceBadge :type="ref.type" :evidence-level="ref.evidenceLevel" />
      <span v-if="ref.source" class="meta">{{ ref.source }}</span>
      <span v-if="ref.academic?.year" class="meta">{{ ref.academic.year }}</span>
      <span v-if="ref.academic?.citedBy" class="meta">cited {{ ref.academic.citedBy }}</span>
      <a
        v-if="ref.academic?.pdf"
        class="meta pdf"
        :href="ref.academic.pdf"
        target="_blank"
        rel="noopener noreferrer"
      >
        PDF
      </a>
    </div>
  </div>
</template>

<style scoped>
.reference-list {
  margin-top: 10px;
}

.reference-item {
  margin-bottom: 8px;
  line-height: 1.8;
}

.reference-item a {
  color: #409eff;
  text-decoration: none;
  margin-right: 4px;
}

.reference-item a:hover {
  text-decoration: underline;
}

.meta {
  display: inline-block;
  margin-left: 4px;
  color: #606266;
  font-size: 12px;
  white-space: nowrap;
}

.pdf {
  font-weight: 600;
}
</style>
