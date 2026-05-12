// app/types/questionnaire.ts
export type QuestionType
  = | 'text'
    | 'number'
    | 'textarea'
    | 'radio'
    | 'checkbox'
    | 'select'
    | 'date'

export interface QuestionOption {
  id: string
  label: string
  value: string
}

export interface ConditionalLogicType {
  parentQuestionId: string
  showIfOptionId: string
}

export interface Question {
  id: string
  questionText: string
  questionDescription?: string
  questionType: QuestionType
  isRequired: boolean
  options: QuestionOption[]
  conditional?: ConditionalLogicType

  // tambahkan ini
  isEditing?: boolean
}

export interface Section {
  id: string
  sectionTitle: string
  description?: string
  questions: Question[]
}
