<script setup lang="ts">
import ReferenceBadge from './ReferenceBadge.vue';

interface Reference {
  link: string;
  title: string;
  type?: string;
  evidenceLevel?: string;
}

defineProps<{
  references?: Reference[];
}>();
</script>

<template>
  <div v-if="references && references.length > 0" class="reference-list">
    <div v-for="(ref, index) in references" :key="index" class="reference-item">
      <a :href="ref.link" target="_blank" rel="noopener noreferrer">{{ ref.title }}</a>
      <ReferenceBadge :type="ref.type" :evidence-level="ref.evidenceLevel" />
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
  margin-right: 8px;
}
.reference-item a:hover {
  text-decoration: underline;
}
</style>
