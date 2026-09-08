// app/utils/questionnaire/conditional.ts
import type {
  Question
} from '~/types/questionnaire'

export function shouldShowQuestion(
  question: Question,
  answers: Record<string, unknown>
) {
  if (!question.conditional) {
    return true
  }

  const showIfOptionIds = question.conditional.showIfOptionIds || []
  if (showIfOptionIds.length === 0) {
    return true
  }

  const answer = answers[question.conditional.parentQuestionId]

  if (Array.isArray(answer)) {
    return answer.some((val: string) => showIfOptionIds.includes(val))
  }

  return showIfOptionIds.includes(answer)
}
