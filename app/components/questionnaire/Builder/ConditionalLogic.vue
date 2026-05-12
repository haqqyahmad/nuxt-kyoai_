<script setup lang="ts">
import type { Question }
  from '~/types/questionnaire'

import {
  useQuestionnaireStore
} from '~/stores/questionnaire/questionnaire'

const props = defineProps<{
  sectionId: string
  question: Question
  questions: Question[]
}>()

const {
  removeConditional
} = useQuestionnaireStore()

const parentQuestions = computed(() => {
  return props.questions.filter(q =>
    q.id !== props.question.id
    && ['radio', 'select']
      .includes(q.questionType)
  )
})

const selectedParent = computed(() => {
  return props.questions.find(
    q => q.id === props.question.conditional?.parentQuestionId
  )
})
</script>

<template>
  <div
    class="
      border border-default
      rounded-xl
      p-4
      space-y-4
    "
  >
    <div class="flex items-center justify-between">
      <h4 class="font-medium">
        Conditional Logic
      </h4>

      <UButton
        icon="i-lucide-trash"
        color="error"
        variant="ghost"
        @click="
          removeConditional(
            sectionId,
            question.id
          )
        "
      />
    </div>

    <!-- Parent Question -->
    <USelect
      v-model="
        question.conditional!.parentQuestionId
      "
      :items="
        parentQuestions.map(q => ({
          label: q.questionText,
          value: q.id
        }))
      "
      value-key="value"
      option-attribute="label"
      placeholder="Select parent question"
    />

    <!-- Option -->
    <USelect
      v-if="selectedParent"
      v-model="
        question.conditional!.showIfOptionId
      "
      :items="
        selectedParent.options.map(opt => ({
          label: opt.label,
          value: opt.id
        }))
      "
      value-key="value"
      option-attribute="label"
      placeholder="Select option"
    />
  </div>
</template>
