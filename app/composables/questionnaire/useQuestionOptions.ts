// app/composables/questionnaire/useQuestionOptions.ts
import type {
  Question
} from '~/types/questionnaire'

export function useQuestionOptions() {
  function addOption(question: Question) {
    question.options.push({
      id: crypto.randomUUID(),
      label: 'Option'
    })
  }

  function removeOption(
    question: Question,
    optionId: string
  ) {
    question.options
      = question.options.filter(
        o => o.id !== optionId
      )
  }

  return {
    addOption,
    removeOption
  }
}
