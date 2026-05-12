<!-- app/pages/questionnaire/[id]/preview.vue -->
<script setup lang="ts">
import { useQuestionnaireStore } from '~/stores/questionnaire/questionnaire'

const {
  sections
} = useQuestionnaireStore()
</script>

<template>
  <div class="max-w-4xl mx-auto p-6">
    <QuestionnairePreview
      :sections="sections"
    />
  </div>
</template>
