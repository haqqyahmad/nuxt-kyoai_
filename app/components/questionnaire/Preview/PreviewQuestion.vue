<!-- app/components/questionnaire/Preview/PreviewQuestion.vue -->
<script setup lang="ts">
import RequiredBadge from '../Shared/RequiredBadge.vue'
import QuestionRenderer from '../Builder/QuestionRenderer.vue'
import type {
  Question
} from '~/types/questionnaire'

defineProps<{
  question: Question
}>()
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center gap-2">
      <h4 class="font-medium">
        {{ question.questionText }}
      </h4>

      <RequiredBadge
        v-if="question.isRequired"
      />
    </div>

    <p
      v-if="question.questionDescription"
      class="text-sm text-muted"
    >
      {{ question.questionDescription }}
    </p>

    <QuestionRenderer
      :question="question"
    />
  </div>
</template>
