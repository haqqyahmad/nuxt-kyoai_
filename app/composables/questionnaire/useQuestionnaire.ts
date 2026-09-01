// app/composables/questionnaire/useQuestionnaire.ts
import type {
  Section,
  Question
} from '~/types/questionnaire'

export function useQuestionnaire() {
  const sections = ref<Section[]>([])

  function addSection() {
    sections.value.push({
      id: crypto.randomUUID(),
      sectionTitle: 'Untitled Section',
      description: '',
      questions: []
    })
  }

  function removeSection(sectionId: string) {
    sections.value
      = sections.value.filter(
        s => s.id !== sectionId
      )
  }

  function addQuestion(sectionId: string) {
    const section
      = sections.value.find(
        s => s.id === sectionId
      )

    if (!section) return

    const question: Question = {
      id: crypto.randomUUID(),
      questionText: 'Untitled Question',
      questionDescription: '',
      questionType: 'text',
      isRequired: false,
      options: []
    }

    section.questions.push(question)
  }

  return {
    sections,
    addSection,
    removeSection,
    addQuestion
  }
}
