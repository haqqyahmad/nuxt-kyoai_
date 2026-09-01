// Doctor Result MCU — types contract dengan BE `/mcu/exams/:id/doctor-result`

export type DoctorResultPatient = {
  id: string
  patientId: string
  name: string
  gender: 'MALE' | 'FEMALE'
  age: number | string
  examCode: string
  examDate: string
  company: string
  package: string
}

export type DoctorResultItem = {
  examItemId: string
  inputanId: string
  inputanLabel: string
  inputanCode: string | null
  inputType: 'number' | 'string' | 'selected' | 'calculated' | string
  resultValue: string | number | null
  displayValue: string | null
  uom: string
  normalMin?: number | null
  normalMax?: number | null
  flag: 'normal' | 'increase' | 'decrease' | 'qualitative' | string
  gradable: boolean
  grade: string | null // A | B | BF | C | F
  comment: string | null
  recommendation: string | null
  source: 'department' | 'doctor'
  locked: boolean
}

export type DoctorResultGroup = {
  groupId: string | null
  groupName: string
  showInDoctorResult: boolean
  isAbnormal: boolean
  abnormalCount: number
  defaultGrade: string | null       // A jika semua normal
  grade: string | null               // store dari exam (A/B/BF/C/F)
  comment: string | null             // komentar dokter (opsional)
  commentOptions: Array<{ grade: string; comment: string }>
  gradeOptions: Array<{ grade: string; label: string }>
  items: DoctorResultItem[]
}

export type DoctorResultDepartment = {
  departmentId: string
  departmentName: string
  departmentCode: string
  gradingMode: 'doctor' | 'department' | 'both' | string
  groups: DoctorResultGroup[]
}

export type DoctorResultSummary = {
  totalGradable: number
  gradedByDept: number
  gradedByDoctor: number
  pendingDoctor: number
}

export type DoctorResultResponse = {
  patient: DoctorResultPatient
  departments: DoctorResultDepartment[]
  summary: DoctorResultSummary
  submission?: {
    status: string
    doctorApprovedAt: string | null
    medicalReportId?: string | null
    finalGrade?: string | null
    fitnessLevel?: string | null
    finalComment?: string | null
  } | null
  mrReturnRevisions?: Array<{
    inputanId: string
    label?: string | null
    itemCode?: string | null
    note?: string | null
  }>
  mrReturnReason?: string | null
  history?: Array<{
    action: string
    actorId: number | null
    reason: string | null
    payload: any
    createdAt: string
  }>
}

export type GradeOption = {
  id: string
  grade: string
  label: string
  sortOrder: number
  isActive: boolean
}

export type GroupGradeConfig = {
  groupId: string
  groupName: string
  groupCode?: string | null
  department?: { id: string; name: string; code?: string | null } | null
  showInDoctorResult: boolean
  gradeOptions: GradeOption[]
  commentOptions: Array<{ grade: string; label?: string; comment: string; isActive?: boolean }>
}

export type DoctorResultSubmitPayload = {
  finalGrade: 'A' | 'B' | 'BF' | 'C' | 'F' | string
  fitnessLevel: 'Fit' | 'Fit with Follow Up' | 'Fit with Restriction' | 'Temporarily Unfit' | 'Unfit' | string
  finalComment: string
  internalNote?: string
}

export type GradeRule = {
  id: string
  code: string
  department: string
  groupName?: string | null
  inputanLabel: string
  inputanCode?: string | null
  gradable: boolean
  condition: 'normal' | 'increase' | 'decrease' | 'qualitative' | string
  grade: 'A' | 'B' | 'BF' | 'C' | 'F' | string
  comment: string
  recommendation?: string | null
  priority: number
  isActive: boolean
}

export const FINAL_GRADES = ['A', 'B', 'BF', 'C', 'F'] as const

export const FITNESS_LEVELS = [
  'Fit',
  'Fit with Follow Up',
  'Fit with Restriction',
  'Temporarily Unfit',
  'Unfit'
] as const

export const FLAG_LABEL: Record<string, string> = {
  normal: 'Normal',
  increase: 'Increase',
  decrease: 'Decrease',
  qualitative: 'Qualitative'
}

export const FLAG_COLOR: Record<string, 'green' | 'red' | 'amber' | 'blue'> = {
  normal: 'green',
  increase: 'red',
  decrease: 'amber',
  qualitative: 'blue'
}
