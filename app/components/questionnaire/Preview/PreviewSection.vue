<!-- app/components/questionnaire/Preview/PreviewSection.vue -->
<script setup lang="ts">
import PreviewQuestion from './PreviewQuestion.vue'
import type {
  Section
} from '~/types/questionnaire'

defineProps<{
  section: Section
}>()
</script>

<template>
  <UCard>
    <template #header>
      <div>
        <h3 class="font-semibold">
          {{ section.sectionTitle }}
        </h3>

        <p
          v-if="section.description"
          class="text-sm text-muted"
        >
          {{ section.description }}
        </p>
      </div>
    </template>

    <div class="space-y-6">
      <PreviewQuestion
        v-for="question in section.questions"
        :key="question.id"
        :question="question"
      />
    </div>
  </UCard>
</template>
