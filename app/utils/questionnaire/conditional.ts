// app/utils/questionnaire/conditional.ts
import type {
  Question
} from '~/types/questionnaire'

export function shouldShowQuestion(
  question: Question,
  answers: Record<string, any>
) {
  if (!question.conditional) {
    return true
  }

  return (
    answers[
      question.conditional.parentQuestionId
    ]
    === question.conditional.showIfOptionId
  )
}
