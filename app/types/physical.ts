export type RendererKey = 'GENERIC' | 'PHYSICAL_EXAMINATION' | 'DENTAL_EXAMINATION' | 'VISUAL_FIELD_TEST' | 'ROMBERG_TEST' | 'TINNEL_TEST' | 'PHALLEN_TEST' | 'RECTAL_EXAMINATION'

export type PhysicalFinding = {
  key: string
  label: string
  value: boolean
  detail?: string | null
  detail_required_when?: 'YES' | 'NO'
}

export type PhysicalSection = {
  code: string
  label: string
  normal: boolean
  side?: 'RIGHT' | 'LEFT' | null
  findings: PhysicalFinding[]
}

export type PhysicalExamData = { sections: PhysicalSection[] }

export type PhysicalReportRow = { group: string, label: string, value: string }
