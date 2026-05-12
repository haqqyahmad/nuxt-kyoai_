<!-- app/components/questionnaire/Preview/QuestionnairePreview.vue -->
<script setup lang="ts">
import PreviewSection from './PreviewSection.vue'
import type {
  Section
} from '~/types/questionnaire'

defineProps<{
  sections: Section[]
}>()
</script>

<template>
  <div class="space-y-6">
    <PreviewSection
      v-for="section in sections"
      :key="section.id"
      :section="section"
    />
  </div>
</template>
