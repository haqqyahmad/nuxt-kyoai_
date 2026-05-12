import type {
  Question,
  QuestionOption,
  Section
} from '~/types/questionnaire'

import { toRaw } from 'vue'

export const useQuestionnaireStore = () => {
  const sections = useState<Section[]>(
    'questionnaire-sections',
    () => []
  )

  // =====================================================
  // SECTION
  // =====================================================

  function setSections(data: Section[]) {
    sections.value = data
  }

  function addSection() {
    sections.value.push({
      id: crypto.randomUUID(),
      sectionTitle: 'Untitled Section',
      description: '',
      questions: []
    })
  }

  function updateSection(
    sectionId: string,
    payload: Partial<Section>
  ) {
    const section = sections.value.find(
      s => s.id === sectionId
    )

    if (!section) return

    Object.assign(section, payload)
  }

  function removeSection(sectionId: string) {
    sections.value = sections.value.filter(
      s => s.id !== sectionId
    )
  }

  function duplicateSection(sectionId: string) {
    const section = sections.value.find(
      s => s.id === sectionId
    )

    if (!section) return

    const clone = structuredClone(
      toRaw(section)
    )

    clone.id = crypto.randomUUID()

    clone.sectionTitle
      = `${section.sectionTitle} Copy`

    clone.questions = clone.questions.map(q => ({
      ...q,
      id: crypto.randomUUID()
    }))

    sections.value.push(clone)
  }

  // =====================================================
  // QUESTION
  // =====================================================

  function addQuestion(sectionId: string) {
    const section = sections.value.find(
      s => s.id === sectionId
    )

    if (!section) return

    const question: Question = {
      id: crypto.randomUUID(),

      questionText: 'Untitled Question',

      questionDescription: '',

      questionType: 'text',

      isRequired: false,

      options: [],

      // ⬇️ tambahkan
      isEditing: true,

      conditional: undefined
    }

    section.questions.push(question)
  }

  function updateQuestion(
    sectionId: string,
    questionId: string,
    payload: Partial<Question>
  ) {
    const section = sections.value.find(
      s => s.id === sectionId
    )

    if (!section) return

    const question = section.questions.find(
      q => q.id === questionId
    )

    if (!question) return

    Object.assign(question, payload)

    /**
     * reset options jika bukan pilihan
     */
    if (
      !['radio', 'checkbox', 'select']
        .includes(question.questionType)
    ) {
      question.options = []
    }
  }

  function duplicateQuestion(
    sectionId: string,
    questionId: string
  ) {
    const section = sections.value.find(
      s => s.id === sectionId
    )

    if (!section) return

    const question = section.questions.find(
      q => q.id === questionId
    )

    if (!question) return

    const rawQuestion = toRaw(question)

    const clone: Question = {
      ...structuredClone(rawQuestion),

      id: crypto.randomUUID(),

      questionText:
      `${question.questionText} Copy`,

      isEditing: true
    }

    section.questions.push(clone)
  }

  function removeQuestion(
    sectionId: string,
    questionId: string
  ) {
    const section = sections.value.find(
      s => s.id === sectionId
    )

    if (!section) return

    section.questions
      = section.questions.filter(
        q => q.id !== questionId
      )
  }

  // =====================================================
  // OPTIONS
  // =====================================================

  function addOption(
    sectionId: string,
    questionId: string
  ) {
    const question = findQuestion(
      sectionId,
      questionId
    )

    if (!question) return

    question.options.push({
      id: crypto.randomUUID(),
      label: `Option ${question.options.length + 1}`,
      value: `option_${question.options.length + 1}`
    })
  }

  function updateOption(
    sectionId: string,
    questionId: string,
    optionId: string,
    payload: Partial<QuestionOption>
  ) {
    const question = findQuestion(
      sectionId,
      questionId
    )

    if (!question) return

    const option = question.options.find(
      o => o.id === optionId
    )

    if (!option) return

    Object.assign(option, payload)
  }

  function removeOption(
    sectionId: string,
    questionId: string,
    optionId: string
  ) {
    const question = findQuestion(
      sectionId,
      questionId
    )

    if (!question) return

    question.options
      = question.options.filter(
        o => o.id !== optionId
      )
  }

  // =====================================================
  // CONDITIONAL
  // =====================================================

  function removeConditional(
    sectionId: string,
    questionId: string
  ) {
    const question = findQuestion(
      sectionId,
      questionId
    )

    if (!question) return

    question.conditional = undefined
  }

  function updateConditional(
    sectionId: string,
    questionId: string,
    payload: Partial<NonNullable<Question['conditional']>>
  ) {
    const question = findQuestion(
      sectionId,
      questionId
    )

    if (!question || !question.conditional) {
      return
    }

    Object.assign(
      question.conditional,
      payload
    )
  }

  // =====================================================
  // HELPERS
  // =====================================================

  function findQuestion(
    sectionId: string,
    questionId: string
  ) {
    const section = sections.value.find(
      s => s.id === sectionId
    )

    if (!section) return null

    return section.questions.find(
      q => q.id === questionId
    )
  }

  return {
    sections,

    setSections,

    // section
    addSection,
    updateSection,
    duplicateSection,
    removeSection,

    // question
    addQuestion,
    updateQuestion,
    duplicateQuestion,
    removeQuestion,

    // option
    addOption,
    updateOption,
    removeOption,

    // conditional
    updateConditional,
    removeConditional
  }
}
