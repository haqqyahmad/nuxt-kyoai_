// Dental Examination — types contract dengan BE `/mcu/exams/:id/dental`

export type DentalFinding = {
  toothNumber: string
  conditions: string[]
  note?: string | null
}

export type DentalGrade = 'A' | 'B' | 'C' | 'D'

export type DentalPatient = {
  examId: string
  examCode: string
  queueCode: string
  patientId: string | null
  patientName: string
  gender: string | null
  dob: string | null
  age: number | null
  examDate: string
  companyId: string | null
}

export type DentalExamData = DentalPatient & {
  hasData: boolean
  item?: {
    id: string
    code: string
    name: string
    resultTiming: string | null
    workStatus: string
    resultStatus: string
  }
  canEdit?: boolean
  canSubmit?: boolean
  canApproveDepartment?: boolean
  doctorName?: string | null
  doctorSip?: string | null
  extraOral: string[]
  extraOralNote: string | null
  intraOral: string[]
  intraOralNote: string | null
  otherDental: string[]
  otherNote: string | null
  suggestedGrade: DentalGrade | null
  suggestedLabel: string | null
  gradeReason: string | null
  finalGrade: DentalGrade | null
  doctorComment: string | null
  status: string
  submittedAt: string | null
  findings: DentalFinding[]
  gradeConfig?: Record<string, { label: string, comment: string }>
}

export const EXTRA_ORAL_OPTIONS = ['Normal', 'Edema/Tumor', 'Lesion', 'Palsy'] as const

export const INTRA_ORAL_OPTIONS = [
  'Normal',
  'Lesion',
  'Ulcer',
  'Gingivitis',
  'Swelling',
  'Bleeding'
] as const

export const DENTAL_CONDITIONS = [
  'Abrasion',
  'Abscess',
  'Bridge',
  'Broken Crown',
  'Broken Filling',
  'Caries',
  'Crown',
  'Exfoliation',
  'Filling',
  'Fistula',
  'Fracture',
  'Gingival Recession',
  'Impaction',
  'Loose Crown',
  'Loose Filling',
  'Missing',
  'Persistent',
  'Radix',
  'Tooth Mobility',
  'Veneer'
] as const

export const OTHER_DENTAL_OPTIONS = [
  'Calculus',
  'Denture',
  'Fixed Retainer',
  'Stain',
  'Supernumerary Teeth'
] as const

export const DENTAL_GRADE_CONFIG: Record<DentalGrade, { label: string, comment: string }> = {
  A: { label: 'Good', comment: 'Maintain good oral hygiene and routine dental examination.' },
  B: { label: 'Fair', comment: 'Dental cleaning and routine dental care are recommended.' },
  C: { label: 'Needs Treatment', comment: 'Dental treatment is required. Please consult a dentist.' },
  D: { label: 'Urgent Treatment', comment: 'Immediate dental evaluation and treatment are recommended.' }
}

// FDI tooth chart
export const TOOTH_GROUPS: Record<string, string[]> = {
  permanentUpper: ['18', '17', '16', '15', '14', '13', '12', '11', '21', '22', '23', '24', '25', '26', '27', '28'],
  permanentLower: ['48', '47', '46', '45', '44', '43', '42', '41', '31', '32', '33', '34', '35', '36', '37', '38'],
  primaryUpper: ['55', '54', '53', '52', '51', '61', '62', '63', '64', '65'],
  primaryLower: ['85', '84', '83', '82', '81', '71', '72', '73', '74', '75']
}

// Belah satu rahang jadi dua kuadran (kiri | kanan)
export function splitToothGroup(teeth: readonly string[]): [string[], string[]] {
  const mid = Math.floor(teeth.length / 2)
  return [teeth.slice(0, mid), teeth.slice(mid)]
}

// Susunan chart: PERMANENT TEETH (32) dan PRIMARY TEETH (20),
// tiap rahang dua baris, tiap baris dipisah garis tengah.
export const DENTAL_CHART_GROUPS: { label: string, rows: [string[], string[]][] }[] = [
  {
    label: 'Permanent Teeth (32 Teeth)',
    rows: [
      splitToothGroup(TOOTH_GROUPS.permanentUpper),
      splitToothGroup(TOOTH_GROUPS.permanentLower)
    ]
  },
  {
    label: 'Primary Teeth (20 Teeth)',
    rows: [
      splitToothGroup(TOOTH_GROUPS.primaryUpper),
      splitToothGroup(TOOTH_GROUPS.primaryLower)
    ]
  }
]
