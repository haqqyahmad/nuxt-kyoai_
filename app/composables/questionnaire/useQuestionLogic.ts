// app/composables/questionnaire/useQuestionLogic.ts
import type {
  Question
} from '~/types/questionnaire'

export function useQuestionLogic() {
  function enableConditional(question: Question) {
    question.conditional = {
      parentQuestionId: '',
      showIfOptionIds: []
    }
  }

  function removeConditional(question: Question) {
    delete question.conditional
  }

  return {
    enableConditional,
    removeConditional
  }
}
