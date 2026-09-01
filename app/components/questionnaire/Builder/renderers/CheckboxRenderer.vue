<!-- app/components/questionnaire/Builder/renderers/CheckboxRenderer.vue -->
<script setup lang="ts">
import type { Question } from '~/types/questionnaire'

defineProps<{
  question: Question
}>()
</script>

<template>
  <div class="space-y-2">
    <label
      v-for="opt in question.options"
      :key="opt.id"
      class="flex items-center gap-2"
    >
      <input
        type="checkbox"
        disabled
      >

      <span>{{ opt.label }}</span>
    </label>

    <EmptyQuestion
      v-if="!question.options.length"
      text="Add checkbox options"
    />
  </div>
</template>
