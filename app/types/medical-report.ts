// Medical Report (MR Review) — types contract dengan BE `/medical-reports`

export type MedicalReportStatus =
  | 'DOCTOR_REVIEW'
  | 'DOCTOR_APPROVED'
  | 'MR_REVIEW'
  | 'MR_RETURNED_TO_DOCTOR'
  | 'MR_VERIFIED'
  | 'READY_TO_RELEASE'
  | 'RELEASED'

export type MedicalReportListItem = {
  id: string
  examId: string
  examCode: string | null
  examDate: string | null
  queueCode: string | null
  patient: {
    id: string | number
    PatientId: string | null
    name: string
  } | null
  company: string | null
  status: MedicalReportStatus
  doctorApprovedAt: string | null
  mrVerifiedAt: string | null
  releasedAt: string | null
  finalGrade: string | null
  fitnessLevel: string | null
}

export type MedicalReportAction = {
  action: string
  actorId: number | null
  reason: string | null
  payload: Record<string, unknown> | null
  createdAt: string
}

export type DepartmentSnapshot = {
  departmentId: string
  departmentCode: string | null
  departmentName: string | null
  versionNo: number | null
  snapshot: Record<string, unknown> | null
  submittedAt: string | null
}

export type MedicalReportDetail = {
  id: string
  examId: string
  examCode: string | null
  examDate: string | null
  examStatus: string | null
  patient: {
    id: string | number
    PatientId: string | null
    name: string
    gender: string | null
    dob: string | null
  } | null
  queueCode: string | null
  company: string | null
  status: MedicalReportStatus
  doctorId: number | null
  doctorApprovedAt: string | null
  mrVerifiedBy: number | null
  mrVerifiedAt: string | null
  releasedBy: number | null
  releasedAt: string | null
  meta: {
    finalGrade?: string | null
    fitnessLevel?: string | null
    finalComment?: string | null
    internalNote?: string | null
  } | null
  departmentSnapshots: DepartmentSnapshot[]
  actions: MedicalReportAction[]
}

export const MR_STATUS_COLOR: Record<string, 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  DOCTOR_REVIEW: 'info',
  DOCTOR_APPROVED: 'primary',
  MR_REVIEW: 'warning',
  MR_RETURNED_TO_DOCTOR: 'error',
  MR_VERIFIED: 'success',
  READY_TO_RELEASE: 'success',
  RELEASED: 'success'
}

export const MR_STATUS_LABEL: Record<string, string> = {
  DOCTOR_REVIEW: 'Dokter Review',
  DOCTOR_APPROVED: 'Menunggu MR',
  MR_REVIEW: 'MR Review',
  MR_RETURNED_TO_DOCTOR: 'Dikembalikan ke Dokter',
  MR_VERIFIED: 'Terverifikasi MR',
  READY_TO_RELEASE: 'Siap Release',
  RELEASED: 'Released'
}
