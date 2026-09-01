<!-- app/components/questionnaire/Builder/ConditionalLogic.vue -->
<script setup lang="ts">
import { computed, watch } from 'vue'

import type { Question } from '~/types/questionnaire'

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

// const parentQuestions = computed(() => {
//   return props.questions.filter(q =>
//     q.id !== props.question.id
//     && ['radio', 'select', 'checkbox'].includes(q.questionType)
//     && q.options.length
//   )
// })

const parentQuestions = computed(() => {
  const currentIndex = props.questions.findIndex(
    q => q.id === props.question.id
  )

  return props.questions.filter((q, index) =>
    index < currentIndex
    && ['radio', 'select', 'checkbox'].includes(q.questionType)
    && q.options.length > 0
  )
})

const selectedParent = computed(() => {
  return props.questions.find(
    q => q.id === props.question.conditional?.parentQuestionId
  )
})

const parentQuestionItems = computed(() => {
  return parentQuestions.value.map(q => ({
    label: q.questionText || 'Untitled Question',
    value: q.id
  }))
})

const optionItems = computed(() => {
  return selectedParent.value?.options.map(opt => ({
    label: opt.label,
    value: opt.id
  })) ?? []
})

watch(
  () => props.question.conditional?.parentQuestionId,
  () => {
    if (props.question.conditional) {
      props.question.conditional.showIfOptionId = ''
    }
  }
)
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h4 class="font-medium">
          Conditional Logic
        </h4>

        <p class="text-sm text-muted">
          Show this question only when condition is met
        </p>
      </div>

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

    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <USelect
        v-model="question.conditional!.parentQuestionId"
        :items="parentQuestionItems"
        value-key="value"
        option-attribute="label"
        placeholder="Select parent question"
      />

      <USelect
        v-model="question.conditional!.showIfOptionId"
        :items="optionItems"
        value-key="value"
        option-attribute="label"
        placeholder="Select option"
        :disabled="!selectedParent"
      />
    </div>

    <UAlert
      v-if="!parentQuestions.length"
      color="warning"
      variant="soft"
      title="No parent question available"
      description="Create a radio, checkbox, or select question with options first."
    />
  </div>
</template>
