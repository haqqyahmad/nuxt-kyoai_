<!-- app/components/questionnaire/Builder/renderers/SelectRenderer.vue -->
<script setup lang="ts">
import type { Question } from '~/types/questionnaire'

defineProps<{
  question: Question
}>()
</script>

<template>
  <USelect
    disabled
    :items="
      question.options.map(opt => ({
        label: opt.label,
        value: opt.id
      }))
    "
    placeholder="Select option"
  />
</template>
