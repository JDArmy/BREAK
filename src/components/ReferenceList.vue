<script setup lang="ts">
interface Reference {
  link: string;
  title: string;
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
}

.reference-item a:hover {
  text-decoration: underline;
}
</style>
