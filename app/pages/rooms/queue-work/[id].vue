<script setup lang="ts">
import DentalExamWorkPanel from '~/components/rooms/DentalExamWorkPanel.vue'
import PhysicalExamWorkPanel from '~/components/rooms/PhysicalExamWorkPanel.vue'
import DoctorTestWorkPanel from '~/components/rooms/DoctorTestWorkPanel.vue'
import TreadmillScreeningWorkPanel from '~/components/rooms/TreadmillScreeningWorkPanel.vue'
import ClearanceQuestionnairePanel from '~/components/rooms/ClearanceQuestionnairePanel.vue'
import { resolveRenderer } from '~/constants/exam-renderers'
import HistoryTimeline from '~/pages/result/exam-results/components/HistoryTimeline.vue'
import { useAudit } from '~/composables/useAudit'
import type { DiffAuditEntry } from '~/composables/useAudit'

type Patient = {
  id: string | number
  PatientId?: string | null
  firstName?: string | null
  middleName?: string | null
  lastName?: string | null
  gender?: string | null
  dob?: string | null
  phone?: string | null
  email?: string | null
  idType?: string | null
  idNumber?: string | null
  photoUrl?: string | null
  allergyNotes?: string | null
  diseaseNotes?: string | null
}

type BadgeColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'

type QueueStageItem = {
  id: string
  stageId: string
  stageOrder: number
  status: string
  roomId: string | null
  stage?: {
    id: string
    code: string
    name: string
  } | null
}

type SampleCollection = {
  id: string
  status: string
  sampleType?: {
    id: string
    name: string
  } | null
  items?: Array<{ itemId: string }>
}

type MeasurementValue = {
  inputanId: string
  label?: string | null
  uom?: string | null
  inputType?: string | null
  valueNumber?: number | null
  valueString?: string | null
  valueSelected?: string | null
  valueCalculated?: number | null
}

type Measurement = {
  id: string
  measuredAt: string
  measuredByName?: string | null
  note?: string | null
  isSelected: boolean
  values: MeasurementValue[]
}

type RoomAssignment = {
  id: string
  assignedDate: string
  roomId: string | null
  roomTypeId: string | null
  assignmentSource?: 'PIC' | 'SELF'
  notes?: string | null
  room?: {
    id: string
    code: string
    name: string
  } | null
  roomType?: {
    id: string
    code: string
    name: string
    tierOrder: number
  } | null
}

type RoomSession = {
  id: string
  roomId: string
  roomTypeId: string
  startedAt: string
  endedAt?: string | null
  exitReason?: string | null
  room?: {
    id: string
    code: string
    name: string
  } | null
  roomType?: {
    id: string
    code: string
    name: string
  } | null
}

type CurrentRoom = {
  id: string
  name?: string | null
  voiceCode?: string | null
  stageLinks?: Array<{
    stageId: string
    stage?: {
      id?: string
      code?: string
      name?: string
    } | null
  }>
}

type RoomQueueDetail = {
  id: string
  roomTypeId: string
  tierOrder: number
  status: string
  queueEntry?: {
    id: string
    queueCode?: string | null
    queueNumber?: number | null
    type?: string | null
    checkinAt?: string | null
    registration?: {
      id: number
      id_reg?: string | null
      examDate?: string | null
      scheduleDateExam?: string | null
      patient?: Patient | null
    } | null
    sampleCollections?: SampleCollection[]
  } | null
  stageItems?: QueueStageItem[]
}

type ExamResult = {
  inputanId: string
  valueString?: string | null
  valueNumber?: number | null
  valueSelected?: string | null
  valueCalculated?: number | null
  flag?: 'normal' | 'abnormal' | null
}

type ExamInputOption = {
  id: string
  label: string
  value: string
}

type ExamInput = {
  id: string
  label: string
  inputType: 'number' | 'string' | 'selected' | 'calculated'
  formula?: { formula?: string | null } | null
  uom?: string | null
  allowBlank?: boolean
  opsis?: ExamInputOption[]
  nilaiNormalNum?: Array<{
    id: string
    sex?: string | null
    ageMin?: number | null
    ageMax?: number | null
    minValue?: number | null
    maxValue?: number | null
    normalLow?: number | null
    normalHigh?: number | null
    criticalLow?: number | null
    criticalHigh?: number | null
  }>
  nilaiNormalSel?: Array<{
    id: string
    sex?: string | null
    ageMin?: number | null
    ageMax?: number | null
    opsi?: {
      id: string
      label: string
      value: string
    } | null
  }>
}

type NumericNormalRange = NonNullable<ExamInput['nilaiNormalNum']>[number]
type SelectedNormalRange = NonNullable<ExamInput['nilaiNormalSel']>[number]

type RoomExamItem = {
  id: string
  status: string
  createdAt?: string | null
  startAt?: string | null
  notes?: string | null
  retestedAt?: string | null
  retestReason?: string | null
  operationalStatus?: string
  blockedReason?: string | null
  sampleImpact?: {
    collectionId: string
    sampleTypeId: string
    sampleTypeName?: string | null
    collectionStatus?: string | null
    rejectReason?: string | null
    rescheduledAt?: string | null
  } | null
  trxExamItem?: {
    id: string
    externalAssignment?: {
      id: string
      status: 'ASSIGNED' | 'PROCESSING' | 'CANCELLED' | 'FILLED'
      assignedExternalUserId?: number | null
      attachmentUrl?: string | null
      assignedAt?: string | null
      filledAt?: string | null
      assignedExternalUser?: {
        id: number
        name: string
      } | null
    } | null
    templateSnapshotAt?: string | null
    resultTemplateSnapshot?: { rendererKey?: string | null } | null
    rendererKey?: string | null
    resultStatus?: 'NOT_READY' | 'READY' | 'DRAFT' | 'SUBMITTED' | 'RETURNED'
    workStatus?: string
    workStartedAt?: string | null
    source?: string | null
    examId?: string | null
    exam?: {
      id: string
      status: string
      results?: ExamResult[]
    } | null
    item?: {
      id: string
      code?: string | null
      name?: string | null
      resultTiming?: 'inline' | 'deferred' | null
      externalResult?: boolean
      requiresAttachmentForDone?: boolean
      measurementMode?: 'SINGLE' | 'MULTIPLE'
      allowDeferMeasurement?: boolean
      allowSameVisitRecall?: boolean
      mealPrerequisite?: boolean
      rendererKey?: string | null
      clearanceQuestionnaireId?: string | null
      inputans?: ExamInput[]
      department?: {
        id: string
        name: string
        code?: string | null
      } | null
      group?: {
        id: string
        name: string
      } | null
    } | null
  } | null
}

type ResultDraft = {
  valueString?: string
  valueNumber?: string
  valueSelected?: string
  valueCalculated?: string
}

const route = useRoute()
const router = useRouter()
const api = useApi()
const toast = useToast()
const { user, permissions } = await useCurrentUser()
const today = new Date().toISOString().slice(0, 10)
const {
  data: assignmentData,
  refresh: refreshAssignment
} = await useAsyncData<RoomAssignment | null>(
  'room-assignment-work',
  async () => {
    try {
      const res = await api.get('/room-assignments/me', {
        params: {
          assignedDate: today,
          _: Date.now()
        }
      })

      const payload = res.data
      return (payload && Object.prototype.hasOwnProperty.call(payload, 'data')
        ? payload.data
        : payload) as RoomAssignment | null
    } catch {
      return null
    }
  },
  {
    default: () => null,
    server: false
  }
)
const {
  session: roomSession,
  pending: roomSessionPending,
  refresh: refreshRoomSession,
  enterRoomSession,
  exitRoomSession
} = await useRoomSession()

const roomQueueItemId = computed(() => String(route.params.id ?? ''))
const currentUserId = computed(() => user.value?.id ?? null)
const loading = ref(false)
const refreshing = ref(false)
const roomQueueDetail = ref<RoomQueueDetail | null>(null)
const patientDetail = ref<Patient | null>(null)
const patientDetailLoading = ref(false)
const patientDetailError = ref('')
const roomExamItems = ref<RoomExamItem[]>([])
const activeExamId = computed(() => {
  const fromItems = roomExamItems.value.find(item => item.trxExamItem?.exam?.id ?? item.trxExamItem?.examId)
    ?.trxExamItem?.exam?.id ?? roomExamItems.value.find(item => item.trxExamItem?.examId)?.trxExamItem?.examId ?? ''
  if (fromItems) return fromItems
  const fromSelected = selectedItem.value?.trxExamItem?.exam?.id ?? selectedItem.value?.trxExamItem?.examId ?? ''
  return fromSelected
})
const stageActionLoading = ref(false)
const itemActionLoading = ref<Record<string, boolean>>({})
const collectionActionLoading = ref<Record<string, boolean>>({})
const resultSaveLoading = ref<Record<string, boolean>>({})
const resultDrafts = reactive<Record<string, Record<string, ResultDraft>>>({})
const measurements = ref<Measurement[]>([])
const measurementLoading = ref(false)
const measurementSaving = ref(false)
const measurementDraft = reactive<Record<string, string>>({})
const measurementNote = ref('')
const itemNotes = reactive<Record<string, string>>({})
const { loading: auditLoading, entries: auditEntries, resetAudit } = useAudit()
const isItemActionModalOpen = ref(false)
const selectedItemAction = ref<RoomExamItem | null>(null)
const selectedItemActionType = ref<'skip' | 'reschedule' | 'retest' | 'refuse' | null>(null)
const itemActionReason = ref('')
const itemActionNote = ref('')
const itemActionSubmitLoading = ref(false)
const isCancelItemModalOpen = ref(false)
const cancelItemTarget = ref<RoomExamItem | null>(null)
const cancelItemReason = ref('')
const cancelItemLoading = ref(false)
const isExitRoomModalOpen = ref(false)
const isEnterRoomModalOpen = ref(false)
const roomSessionActionLoading = ref(false)
const roomEnterActionLoading = ref(false)

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string, errors?: unknown } } }).response
    return response?.data?.message || fallback
  }

  return fallback
}

const activeRoomSession = computed(() => {
  if (!roomSession.value?.id || roomSession.value.endedAt) return null
  return roomSession.value as RoomSession
})

const roomAssignment = computed(() => assignmentData.value ?? null)
const currentRoomId = computed(() =>
  activeRoomSession.value?.roomId ?? roomAssignment.value?.roomId ?? null
)
const canUseAssignShortcut = computed(() => !roomAssignment.value?.roomId)

const { data: currentRoomData } = await useAsyncData<CurrentRoom | null>(
  'queue-work-current-room',
  async () => {
    if (!currentRoomId.value) return null

    try {
      const res = await api.get(`/medical/rooms/rooms/${currentRoomId.value}`)
      return (res.data?.data ?? res.data ?? null) as CurrentRoom | null
    } catch {
      return null
    }
  },
  {
    default: () => null,
    watch: [currentRoomId],
    server: false
  }
)

const currentRoomStageIds = computed(() =>
  new Set((currentRoomData.value?.stageLinks ?? []).map(link => link.stageId))
)
const currentRoomStageCodes = computed(() =>
  new Set((currentRoomData.value?.stageLinks ?? []).map(link => link.stage?.code).filter(Boolean))
)

const roomSessionLabel = computed(() => {
  if (!activeRoomSession.value) return 'Room session inactive'
  if (activeRoomSession.value.room?.name) {
    return `${activeRoomSession.value.room.code} - ${activeRoomSession.value.room.name}`
  }
  return activeRoomSession.value.roomType?.name || 'Room session active'
})

function formatPatientName(patient?: Patient | null) {
  if (!patient) return '-'
  return [patient.firstName, patient.middleName, patient.lastName].filter(Boolean).join(' ')
}
function formatDate(dateString?: string | null) {
  if (!dateString) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(dateString))
}

function getStatusColor(status: string): BadgeColor {
  if (status === 'DONE') return 'success'
  if (status === 'IN_PROGRESS') return 'warning'
  if (status === 'CALLED') return 'info'
  if (status === 'SKIPPED' || status === 'RESCHEDULED' || status === 'CANCELLED') return 'neutral'
  if (status === 'REFUSED' || status === 'REJECTED') return 'error'
  if (status === 'RETEXT') return 'warning'
  if (status === 'DEFERRED') return 'warning'
  return 'neutral'
}

function getStatusLabel(status: string) {
  if (status === 'DONE') return 'Completed'
  if (status === 'IN_PROGRESS') return 'In progress'
  if (status === 'CALLED') return 'Called'
  if (status === 'SKIPPED') return 'Skipped'
  if (status === 'CANCELLED') return 'Cancelled'
  if (status === 'RESCHEDULED') return 'Rescheduled'
  if (status === 'REFUSED') return 'Patient refused'
  if (status === 'REJECTED') return 'Sample rejected'
  if (status === 'RETEXT') return 'Retest needed'
  if (status === 'DEFERRED') return 'Deferred measurement'
  return 'Waiting'
}

function getPatientAgeAtDate(dob?: string | null, referenceDate?: string | null) {
  if (!dob) return null

  const birthDate = new Date(dob)
  const targetDate = referenceDate ? new Date(referenceDate) : new Date()
  if (Number.isNaN(birthDate.getTime())) return null
  if (Number.isNaN(targetDate.getTime())) return null

  let age = targetDate.getFullYear() - birthDate.getFullYear()
  const monthDiff = targetDate.getMonth() - birthDate.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && targetDate.getDate() < birthDate.getDate())) {
    age -= 1
  }

  return age
}

function getPatientGenderKey(gender?: string | null) {
  const normalized = (gender || '').trim().toUpperCase()
  if (!normalized) return null
  if (['M', 'MALE', 'L', 'LAKI-LAKI', 'PRIA'].includes(normalized)) return 'M'
  if (['F', 'FEMALE', 'P', 'PEREMPUAN', 'WANITA'].includes(normalized)) return 'F'
  return normalized
}

function matchesPatientProfile(sex?: string | null, ageMin?: number | null, ageMax?: number | null) {
  const patientGender = getPatientGenderKey(patient.value?.gender)
  const rangeGender = getPatientGenderKey(sex)
  const patientAge = getPatientAgeAtDate(patient.value?.dob, roomQueueDetail.value?.queueEntry?.checkinAt)

  const genderMatches = !rangeGender || !patientGender || rangeGender === patientGender
  const ageMinMatches = ageMin == null || patientAge == null || patientAge >= ageMin
  const ageMaxMatches = ageMax == null || patientAge == null || patientAge <= ageMax

  return genderMatches && ageMinMatches && ageMaxMatches
}

// Field radiologi/USG dengan batasan sex: disembunyikan bila seluruh rentang
// normal-nya untuk gender lain. `sex: null` / tanpa rentang → tampil semua gender.
function inputanGenderRestrictedToSexes(inputan: ExamInput): string[] {
  const sexes = new Set<string>()
  for (const range of [...(inputan.nilaiNormalSel ?? []), ...(inputan.nilaiNormalNum ?? [])]) {
    if (!range.sex) return []
    sexes.add(getPatientGenderKey(range.sex) ?? '')
  }
  return [...sexes].filter(Boolean)
}

function isInputanVisibleForGender(inputan: ExamInput): boolean {
  const restricted = inputanGenderRestrictedToSexes(inputan)
  if (!restricted.length) return true
  const patientKey = getPatientGenderKey(patient.value?.gender) ?? ''
  return restricted.includes(patientKey)
}

function visibleItemInputans(item: RoomExamItem): ExamInput[] {
  return (item.trxExamItem?.item?.inputans ?? []).filter(isInputanVisibleForGender)
}

// Opsi yang membutuhkan teks detail: label berakhiran "(Text)" atau "Others"
// (pola template radiologi & ECG). Saat dipilih, inputan valueString diaktifkan.
function optionRequiresDetail(option: ExamInputOption): boolean {
  return /\(Text\)$/i.test(option.label) || /^others$/i.test(option.label)
}

function selectedOptionRequiresDetail(inputan: ExamInput, selected: string): boolean {
  const option = inputan.opsis?.find(o => o.value === selected)
  return option ? optionRequiresDetail(option) : /\(Text\)$/i.test(selected)
}

function formatProfileSuffix(sex?: string | null, ageMin?: number | null, ageMax?: number | null) {
  const parts: string[] = []

  if (sex === 'MALE') parts.push('Male')
  if (sex === 'FEMALE') parts.push('Female')

  if (ageMin != null && ageMax != null) {
    parts.push(`${ageMin}-${ageMax} yrs`)
  } else if (ageMin != null) {
    parts.push(`>= ${ageMin} yrs`)
  } else if (ageMax != null) {
    parts.push(`<= ${ageMax} yrs`)
  }

  return parts.length > 0 ? ` (${parts.join(' · ')})` : ''
}

function getNumericNormalRanges(inputan: ExamInput) {
  const ranges = inputan.nilaiNormalNum ?? []
  return ranges.filter(range =>
    matchesPatientProfile(range.sex, range.ageMin, range.ageMax)
  )
}

function getSelectedNormalRanges(inputan: ExamInput) {
  const ranges = inputan.nilaiNormalSel ?? []
  return ranges.filter(range =>
    matchesPatientProfile(range.sex, range.ageMin, range.ageMax)
  )
}

function formatNumericNormalRange(inputan: ExamInput, range: NumericNormalRange) {
  const parts: string[] = []

  const lowValue = range.minValue ?? range.normalLow
  const highValue = range.maxValue ?? range.normalHigh

  if (lowValue != null || highValue != null) {
    const low = lowValue != null ? String(lowValue) : '-∞'
    const high = highValue != null ? String(highValue) : '∞'
    parts.push(`Normal ${low} - ${high}${inputan.uom ? ` ${inputan.uom}` : ''}`)
  }

  if (range.criticalLow != null || range.criticalHigh != null) {
    const criticalParts: string[] = []
    if (range.criticalLow != null) criticalParts.push(`critical low ${range.criticalLow}`)
    if (range.criticalHigh != null) criticalParts.push(`critical high ${range.criticalHigh}`)
    parts.push(criticalParts.join(' · '))
  }

  return `${parts.join(' | ')}${formatProfileSuffix(range.sex, range.ageMin, range.ageMax)}`
}

function formatSelectedNormalRange(range: SelectedNormalRange) {
  return `${range.opsi?.label ?? range.opsi?.value ?? '-'}${formatProfileSuffix(range.sex, range.ageMin, range.ageMax)}`
}

function parseDraftNumber(value?: string | number | null) {
  if (value == null) return null

  const text = String(value).trim()
  if (!text) return null

  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : null
}

function getNumberEvaluation(inputan: ExamInput, draftValue?: string) {
  const value = parseDraftNumber(draftValue)
  if (value == null) return null

  const ranges = getNumericNormalRanges(inputan)
  if (ranges.length === 0) return null

  const matchedNormal = ranges.find((range) => {
    const lowValue = range.minValue ?? range.normalLow
    const highValue = range.maxValue ?? range.normalHigh
    const lowOk = lowValue == null || value >= lowValue
    const highOk = highValue == null || value <= highValue
    return lowOk && highOk
  })

  if (matchedNormal) {
    return {
      status: 'normal' as const,
      label: `Within normal range${formatProfileSuffix(matchedNormal.sex, matchedNormal.ageMin, matchedNormal.ageMax)}`
    }
  }

  const matchedCritical = ranges.find((range) => {
    const lowCritical = range.criticalLow != null && value <= range.criticalLow
    const highCritical = range.criticalHigh != null && value >= range.criticalHigh
    return lowCritical || highCritical
  })

  if (matchedCritical) {
    return {
      status: 'critical' as const,
      label: `Outside critical range${formatProfileSuffix(matchedCritical.sex, matchedCritical.ageMin, matchedCritical.ageMax)}`
    }
  }

  return {
    status: 'out-of-range' as const,
    label: 'Outside normal range'
  }
}

function getSelectedEvaluation(inputan: ExamInput, draftValue?: string) {
  if (!draftValue?.trim()) return null

  const ranges = getSelectedNormalRanges(inputan)
  if (ranges.length === 0) return null

  const matched = ranges.find(range => range.opsi?.value === draftValue)

  if (matched) {
    return {
      status: 'normal' as const,
      label: `Matches normal value${formatProfileSuffix(matched.sex, matched.ageMin, matched.ageMax)}`
    }
  }

  return {
    status: 'out-of-range' as const,
    label: 'Does not match normal value'
  }
}

function getInputEvaluation(itemId: string, inputan: ExamInput) {
  const draft = getInputDraft(itemId, inputan.id)

  if (inputan.inputType === 'number') {
    return getNumberEvaluation(inputan, draft.valueNumber)
  }

  if (inputan.inputType === 'selected') {
    return getSelectedEvaluation(inputan, draft.valueSelected)
  }

  return null
}

function getEvaluationBadgeColor(status?: 'normal' | 'out-of-range' | 'critical') {
  if (status === 'normal') return 'success'
  if (status === 'critical') return 'error'
  if (status === 'out-of-range') return 'error'
  return 'neutral'
}

function getInputContainerClass(itemId: string, inputan: ExamInput) {
  const evaluation = getInputEvaluation(itemId, inputan)

  if (evaluation?.status === 'critical') {
    return 'rounded-xl border border-error/40 bg-error/5 p-3'
  }

  if (evaluation?.status === 'out-of-range') {
    return 'rounded-xl border border-error/40 bg-error/5 p-3'
  }

  if (evaluation?.status === 'normal') {
    return 'rounded-xl border border-success/30 bg-success/5 p-3'
  }

  return 'rounded-xl border border-default bg-muted/20 p-3'
}
function getValueClassForEvaluation(evaluation: ReturnType<typeof getNumberEvaluation>) {
  const base = 'w-full rounded-lg border bg-default px-3 py-2 text-sm outline-none transition focus:ring-2'

  if (evaluation?.status === 'normal') {
    return `${base} border-success/50 text-success focus:border-success focus:ring-success/20`
  }

  if (evaluation?.status === 'critical') {
    return `${base} border-error/70 font-semibold text-error focus:border-error focus:ring-error/25`
  }

  if (evaluation?.status === 'out-of-range') {
    return `${base} border-error/50 text-error focus:border-error focus:ring-error/20`
  }

  return `${base} border-default text-highlighted focus:border-primary/60 focus:ring-primary/15`
}

function getInputValueClass(itemId: string, inputan: ExamInput) {
  return getValueClassForEvaluation(getInputEvaluation(itemId, inputan))
}

function getEvaluationShortLabel(status?: 'normal' | 'out-of-range' | 'critical') {
  if (status === 'normal') return 'Normal'
  if (status === 'critical') return 'Critical'
  if (status === 'out-of-range') return 'Out of range'
  return 'Unknown'
}

const queuePatient = computed(() => roomQueueDetail.value?.queueEntry?.registration?.patient ?? null)
const patient = computed(() => patientDetail.value ?? queuePatient.value)

function resolveMediaUrl(url?: string | null) {
  if (!url) return ''
  if (/^https?:\/\//.test(url) || url.startsWith('data:')) return url
  let base = useRuntimeConfig().public.apiBase || ''
  base = base.replace(/\/+$/, '').replace(/\/api$/, '')
  return base ? `${base}${url}` : url
}

const patientPhotoUrl = computed(() => resolveMediaUrl(patient.value?.photoUrl))
const photoViewerOpen = ref(false)

function formatPatientDetail(patient?: Patient | null) {
  if (!patient) return ''
  const gender = patient.gender === 'MALE' ? 'Laki-laki' : patient.gender === 'FEMALE' ? 'Perempuan' : null
  const age = getPatientAgeAtDate(patient.dob, roomQueueDetail.value?.queueEntry?.checkinAt)
  return [gender, age != null ? `${age} th` : null, patient.phone].filter(Boolean).join(' · ')
}

async function loadPatientDetail(patientId?: string | number | null) {
  patientDetail.value = null
  patientDetailError.value = ''
  if (patientId == null) return

  patientDetailLoading.value = true
  try {
    const res = await api.get(`/patient/${patientId}`)
    patientDetail.value = (res.data?.data ?? res.data ?? null) as Patient | null
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status
    patientDetailError.value = status === 403
      ? ''
      : 'Patient details could not be loaded. Basic information from the queue is still shown.'
  } finally {
    patientDetailLoading.value = false
  }
}
const patientMedicalNotes = ref<{ allergyNotes?: string | null, diseaseNotes?: string | null } | null>(null)
const medicalNotesForm = reactive({ allergyNotes: '', diseaseNotes: '' })
const medicalNotesSaving = ref(false)
const medicalNotesModalOpen = ref(false)
const medicalNotesDirty = computed(() =>
  medicalNotesForm.allergyNotes !== (patientMedicalNotes.value?.allergyNotes ?? '')
  || medicalNotesForm.diseaseNotes !== (patientMedicalNotes.value?.diseaseNotes ?? '')
)
const canEditMedicalNotes = computed(() =>
  permissions.value.includes('patient:update') || permissions.value.includes('queue:update')
)

// Endpoint khusus: dapat diakses petugas ruangan (tidak butuh patient:read penuh).
async function loadPatientMedicalNotes(patientId?: string | number | null) {
  patientMedicalNotes.value = null
  if (patientId == null) return

  try {
    const res = await api.get(`/patient/${patientId}/medical-notes`)
    patientMedicalNotes.value = res.data?.data ?? res.data ?? null
  } catch {
    patientMedicalNotes.value = null
  } finally {
    medicalNotesForm.allergyNotes = patientMedicalNotes.value?.allergyNotes ?? ''
    medicalNotesForm.diseaseNotes = patientMedicalNotes.value?.diseaseNotes ?? ''
  }
}

function openMedicalNotesModal() {
  medicalNotesForm.allergyNotes = patientMedicalNotes.value?.allergyNotes ?? ''
  medicalNotesForm.diseaseNotes = patientMedicalNotes.value?.diseaseNotes ?? ''
  medicalNotesModalOpen.value = true
}

async function saveMedicalNotes() {
  const patientId = patient.value?.id
  if (patientId == null || medicalNotesSaving.value) return

  medicalNotesSaving.value = true
  try {
    const res = await api.patch(`/patient/${patientId}/medical-notes`, {
      allergyNotes: medicalNotesForm.allergyNotes,
      diseaseNotes: medicalNotesForm.diseaseNotes
    })
    const saved = res.data?.data ?? res.data ?? null
    if (saved) {
      patientMedicalNotes.value = {
        allergyNotes: saved.allergyNotes ?? null,
        diseaseNotes: saved.diseaseNotes ?? null
      }
    }
    toast.add({
      title: 'Success',
      description: 'Patient medical notes saved',
      color: 'success'
    })
    medicalNotesModalOpen.value = false
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status
    toast.add({
      title: 'Failed',
      description: status === 403
        ? 'You do not have access to edit medical notes'
        : 'Failed to save medical notes',
      color: 'error'
    })
  } finally {
    medicalNotesSaving.value = false
  }
}

const canManageItemActions = computed(() => permissions.value.includes('queue:update'))
// [Back to Called] Disembunyikan setelah ada item yang mulai dikerjakan.
const hasStartedExamItems = computed(() =>
  roomExamItems.value.some(item => item.status && item.status !== 'PENDING')
)
const activeStage = computed(() => {
  const stages = (roomQueueDetail.value?.stageItems ?? [])
    .filter(stage =>
      ['WAITING', 'CALLED', 'IN_PROGRESS'].includes(stage.status)
      && currentRoomStageIds.value.has(stage.stageId)
    )

  if (stages.length === 0) return null

  const roomId = currentRoomId.value
  if (roomId) {
    const ownStage = stages.find(stage => stage.roomId === roomId)
    if (ownStage) return ownStage

    const unassignedStage = stages.find(stage => !stage.roomId)
    if (unassignedStage) return unassignedStage

    return null
  }

  return stages[0] ?? null
})
function getCurrentRoomStageMeta(stageId?: string | null) {
  if (!stageId) return null
  return (currentRoomData.value?.stageLinks ?? []).find(link => link.stageId === stageId)?.stage ?? null
}

const activeStageCode = computed(() =>
  activeStage.value?.stage?.code ?? getCurrentRoomStageMeta(activeStage.value?.stageId)?.code ?? null
)
const roomStageInProgress = computed(() => activeStage.value?.status === 'IN_PROGRESS')
const currentRoomWorkStatus = computed(() => {
  const stages = (roomQueueDetail.value?.stageItems ?? [])
    .filter(stage => currentRoomStageIds.value.has(stage.stageId))

  if (stages.length === 0) return roomQueueDetail.value?.status ?? 'WAITING'
  if (stages.every(stage => stage.status === 'CANCELLED')) return 'CANCELLED'
  if (stages.every(stage => ['DONE', 'SKIPPED', 'CANCELLED'].includes(stage.status))) return 'DONE'

  return stages.find(stage => ['IN_PROGRESS', 'CALLED', 'WAITING'].includes(stage.status))?.status
    ?? roomQueueDetail.value?.status
    ?? 'WAITING'
})
const allItemsFinal = computed(() =>
  roomExamItems.value.every(item => ['DONE', 'SKIPPED', 'RESCHEDULED', 'REFUSED', 'REJECTED', 'DEFERRED', 'CANCELLED'].includes(item.status))
)
const sampleCollections = computed(() => roomQueueDetail.value?.queueEntry?.sampleCollections ?? [])

const roomExamItemIds = computed(() =>
  new Set(
    roomExamItems.value
      .map(item => item.trxExamItem?.item?.id)
      .filter((id): id is string => Boolean(id))
  )
)
const roomSampleCollectionIds = computed(() =>
  new Set(
    roomExamItems.value
      .map(item => item.sampleImpact?.collectionId)
      .filter((id): id is string => Boolean(id))
  )
)
const hasStartedSampleCollection = computed(() =>
  sampleCollections.value.some((sample) => {
    if (!sample.status || sample.status === 'PENDING') return false
    if (roomSampleCollectionIds.value.has(sample.id)) return true
    return (sample.items ?? []).some(item => roomExamItemIds.value.has(item.itemId))
  })
)

const allSamplesReceived = computed(() =>
  sampleCollections.value.length > 0
  && sampleCollections.value.every(collection => collection.status === 'RECEIVED')
)

const refusedItemIds = computed(() => {
  const ids = new Set<string>()
  for (const item of roomExamItems.value) {
    if (item.status === 'REFUSED' && item.trxExamItem?.item?.id) {
      ids.add(item.trxExamItem.item.id)
    }
  }
  return ids
})

const allSamplesCollected = computed(() => {
  if (sampleCollections.value.length === 0) return false
  return sampleCollections.value.every((collection) => {
    if (['COLLECTED', 'RECEIVED'].includes(collection.status)) return true
    // Sample REJECTED (ditolak lab) = final terminal.
    if (collection.status === 'REJECTED') return true
    // Sample PENDING utk item yang pasien tolak (REFUSED) dianggap final.
    if (collection.items?.length) {
      return collection.items.every(si => refusedItemIds.value.has(si.itemId))
    }
    return false
  })
})

const canFinishWork = computed(() =>
  activeStageCode.value === 'COLLECT' ? allSamplesCollected.value : allItemsFinal.value
)

const canAutoStartExam = computed(() =>
  activeStage.value?.status === 'WAITING'
  && activeStageCode.value === 'EXAM'
  && allSamplesReceived.value
)

function getStageDisplayName(stage?: QueueStageItem | null) {
  if (!stage) return '-'
  const total = (roomQueueDetail.value?.stageItems ?? []).length
  const code = stage.stage?.code
  const name = (code ? `${code} · ` : '') + (stage.stage?.name || `Stage ${stage.stageOrder ?? '-'}`)
  const otherRoom = stage.roomId && stage.roomId !== currentRoomId.value
  const suffix = otherRoom ? ' (other room)' : ''
  return (total > 1 ? `Stage ${stage.stageOrder} of ${total}: ` : '') + name + suffix
}

const stageSummary = computed(() => {
  const items = roomQueueDetail.value?.stageItems ?? []
  if (items.length === 0) return '-'
  const active = items.find(s => ['WAITING', 'CALLED', 'IN_PROGRESS'].includes(s.status))
  const activeOrder = active?.stageOrder ?? 0
  const names = items
    .slice()
    .sort((a, b) => (a.stageOrder ?? 0) - (b.stageOrder ?? 0))
    .map((s) => {
      const code = s.stage?.code
      const otherRoom = s.roomId && s.roomId !== roomAssignment.value?.roomId
      return (code ? `${code} · ` : '') + (s.stage?.name || `Stage ${s.stageOrder}`) + (otherRoom ? ' (other room)' : '')
    })
  return `Stage ${activeOrder} of ${items.length} (${names.join(' → ')})`
})

function isExamStageActive() {
  return activeStageCode.value === 'EXAM'
}

function isCollectStageActive() {
  return activeStageCode.value === 'COLLECT'
}

function isReceiveStageActive() {
  return activeStageCode.value === 'RECEIVE'
}

function itemNameForId(itemId: string) {
  const found = roomExamItems.value.find(item => item.trxExamItem?.item?.id === itemId)
  return found?.trxExamItem?.item?.name ?? 'Examination item'
}

function collectionHasOnlyRefusedItems(collection: SampleCollection) {
  if (!collection.items?.length) return false
  return collection.items.every(si => refusedItemIds.value.has(si.itemId))
}

function canCollectCollection(collection: SampleCollection) {
  if (collection.status !== 'PENDING') return false
  if (!isCollectStageActive() || !currentRoomStageCodes.value.has('COLLECT')) return false
  if (!roomStageInProgress.value) return false
  return !collectionHasOnlyRefusedItems(collection)
}

function canReceiveCollection(collection: SampleCollection) {
  if (collection.status !== 'COLLECTED') return false
  if (!isReceiveStageActive() || !currentRoomStageCodes.value.has('RECEIVE')) return false
  return roomStageInProgress.value
}

function canRejectCollection(collection: SampleCollection) {
  if (!roomStageInProgress.value) return false
  if (collection.status === 'PENDING') {
    return isCollectStageActive() && currentRoomStageCodes.value.has('COLLECT')
  }
  if (['COLLECTED', 'RECEIVED'].includes(collection.status)) {
    return isReceiveStageActive() && currentRoomStageCodes.value.has('RECEIVE')
  }
  return false
}

function collectionStatusLabel(status: string) {
  if (status === 'PENDING') return 'Not collected'
  if (status === 'COLLECTED') return 'Collected'
  if (status === 'RECEIVED') return 'Received by lab'
  if (status === 'REJECTED') return 'Rejected'
  if (status === 'RESCHEDULED') return 'Rescheduled'
  return status
}

function collectionStatusColor(status: string): 'success' | 'info' | 'neutral' | 'warning' | 'error' {
  if (status === 'RECEIVED') return 'success'
  if (status === 'COLLECTED') return 'info'
  if (status === 'REJECTED') return 'error'
  if (status === 'RESCHEDULED') return 'warning'
  return 'neutral'
}

const sampleCollectionCards = computed(() =>
  sampleCollections.value.map(collection => ({
    id: collection.id,
    status: collection.status,
    sampleName: collection.sampleType?.name ?? 'Sample',
    items: (collection.items ?? []).map(si => itemNameForId(si.itemId)),
    canCollect: canCollectCollection(collection),
    canReceive: canReceiveCollection(collection),
    canReject: canRejectCollection(collection)
  }))
)

const isRejectSampleModalOpen = ref(false)
const rejectSampleTarget = ref<{ id: string, sampleName: string } | null>(null)
const rejectSampleReason = ref('')
const rejectSampleSubmitting = ref(false)

const SAMPLE_ITEMS_VISIBLE = 3
const expandedSamples = ref<Record<string, boolean>>({})
function toggleSampleItems(id: string) {
  expandedSamples.value[id] = !expandedSamples.value[id]
}
function visibleSampleItems(sample: { id: string, items: string[] }) {
  if (expandedSamples.value[sample.id]) return sample.items
  return sample.items.slice(0, SAMPLE_ITEMS_VISIBLE)
}

function openRejectSampleModal(sample: { id: string, sampleName: string }) {
  rejectSampleTarget.value = sample
  rejectSampleReason.value = ''
  isRejectSampleModalOpen.value = true
}

function closeRejectSampleModal() {
  isRejectSampleModalOpen.value = false
  rejectSampleTarget.value = null
  rejectSampleReason.value = ''
}

async function submitRejectSample() {
  const target = rejectSampleTarget.value
  if (!target || rejectSampleSubmitting.value) return

  if (!rejectSampleReason.value.trim()) {
    toast.add({
      title: 'Reason is required',
      description: 'Enter the sample rejection reason.',
      color: 'warning'
    })
    return
  }

  rejectSampleSubmitting.value = true
  try {
    await api.patch(`/medical/exams/queue/samples/${target.id}/reject`, {
      rejectReason: rejectSampleReason.value.trim()
    })
    await loadPage(true)
    toast.add({
      title: 'Success',
      description: `Sample ${target.sampleName} rejected.`,
      color: 'success'
    })
    closeRejectSampleModal()
  } catch (error: unknown) {
    toast.add({
      title: 'Failed to reject sample',
      description: getErrorMessage(error, 'An error occurred while rejecting the sample.'),
      color: 'error'
    })
  } finally {
    rejectSampleSubmitting.value = false
  }
}

function rendererFor(item: RoomExamItem) {
  const master = item.trxExamItem?.item ?? {}
  const snapshot = item.trxExamItem?.resultTemplateSnapshot ?? (item.trxExamItem?.rendererKey ? { rendererKey: item.trxExamItem.rendererKey } : null)
  return resolveRenderer(master, snapshot)
}

function isDentalExamItem(item: RoomExamItem) {
  return rendererFor(item) === DentalExamWorkPanel
}

function isPhysicalExamItem(item: RoomExamItem) {
  return rendererFor(item) === PhysicalExamWorkPanel
}

function isDoctorTestExamItem(item: RoomExamItem) {
  return rendererFor(item) === DoctorTestWorkPanel
}

function isTreadmillScreeningExamItem(item: RoomExamItem) {
  return rendererFor(item) === TreadmillScreeningWorkPanel
}

function hasClearanceQuestionnaire(item: RoomExamItem) {
  return Boolean(item.trxExamItem?.item?.clearanceQuestionnaireId)
}

function clearanceExamId(item: RoomExamItem) {
  return item.trxExamItem?.exam?.id ?? item.trxExamItem?.examId ?? ''
}

const dentalItems = computed(() => roomExamItems.value.filter(isDentalExamItem))
const nonDentalItems = computed(() => roomExamItems.value.filter(item => !isDentalExamItem(item)))

function isCustomDoctorExamItem(item: RoomExamItem) {
  return isDentalExamItem(item) || isPhysicalExamItem(item) || isDoctorTestExamItem(item) || isTreadmillScreeningExamItem(item)
}

// [FULL-WIDTH] Semua renderer custom dokter tampil full-page. Item generik,
// ECG, external, dan sample-managed tetap memakai layout/sidebar lama.
const isFullWidthWork = computed(() =>
  roomExamItems.value.length > 0
  && roomExamItems.value.every(isCustomDoctorExamItem)
)
const fullWidthWorkState = useState<boolean>('queue-work-full', () => false)
watch(isFullWidthWork, (v) => {
  fullWidthWorkState.value = v
}, { immediate: true })
onBeforeUnmount(() => {
  fullWidthWorkState.value = false
})

const selectedItemId = ref('')
const isDrawerOpen = ref(false)
const inputColumns = useSafeLocalStorageState<{ columns: 1 | 2 }>(
  'erp-kyoai:queue-work:input-columns',
  { columns: 2 },
  (value) => {
    if (!value || typeof value !== 'object' || !('columns' in value)) return null
    const columns = value.columns
    return { columns: columns === 1 || columns === 2 ? columns : 2 }
  }
)
const inputColumnsCount = toRef(inputColumns, 'columns') as Ref<1 | 2>

const masterItems = computed(() => {
  const items = [...nonDentalItems.value, ...dentalItems.value]
  return items.map((item, index) => ({
    id: item.id,
    index: index + 1,
    name: item.trxExamItem?.item?.name || '-',
    department: item.trxExamItem?.item?.department?.name || item.trxExamItem?.item?.group?.name || '-',
    sampleTypeId: item.sampleImpact?.sampleTypeId ?? null,
    sampleTypeName: item.sampleImpact?.sampleTypeName ?? null,
    statusLabel: getOperationalStatusLabel(item),
    statusColor: getOperationalStatusColor(item)
  }))
})

type MasterItem = {
  id: string
  index: number
  name: string
  department: string
  sampleTypeId: string | null
  sampleTypeName: string | null
  statusLabel: string
  statusColor: BadgeColor
}
type MasterGroup = { key: string, sampleName: string | null, count: number, items: MasterItem[] }
const masterGroups = computed<MasterGroup[]>(() => {
  if (!isLabRoom.value) {
    return [{ key: 'all', sampleName: null, count: masterItems.value.length, items: masterItems.value }]
  }
  const groups = new Map<string, MasterGroup>()
  for (const item of masterItems.value) {
    const key = item.sampleTypeId ?? item.sampleTypeName ?? '__none__'
    let group = groups.get(key)
    if (!group) {
      group = { key, sampleName: item.sampleTypeName ?? 'No sample', count: 0, items: [] }
      groups.set(key, group)
    }
    group.items.push(item)
    group.count++
  }
  return [...groups.values()]
})

const selectedSampleItems = computed(() => {
  const group = masterGroups.value.find(g => g.items.some(m => m.id === selectedItemId.value))
  return group?.sampleName ? group.items.map(m => m.name) : []
})

const selectedItem = computed(() =>
  masterItems.value.some(m => m.id === selectedItemId.value)
    ? roomExamItems.value.find(item => item.id === selectedItemId.value) ?? null
    : null
)

function isMultiMeasurementItem(item: RoomExamItem | null) {
  return item?.trxExamItem?.item?.measurementMode === 'MULTIPLE'
}

const measurementInputans = computed(() => selectedItem.value?.trxExamItem?.item?.inputans ?? [])

function getMeasurementEvaluation(inputan: ExamInput) {
  return getNumberEvaluation(inputan, measurementDraft[inputan.id])
}

function getMeasurementInputClass(inputan: ExamInput) {
  return getValueClassForEvaluation(getMeasurementEvaluation(inputan))
}

function getMeasurementNormalRangeLines(inputan: ExamInput) {
  return getNumericNormalRanges(inputan).map(range => formatNumericNormalRange(inputan, range))
}

function getMeasurementValue(inputan: ExamInput, measurement: Measurement) {
  return measurement.values.find(value => value.inputanId === inputan.id)?.valueNumber ?? null
}

function getMeasurementValueEvaluation(inputan: ExamInput, measurement: Measurement) {
  const value = getMeasurementValue(inputan, measurement)
  return value == null ? null : getNumberEvaluation(inputan, String(value))
}

function getMeasurementValueClass(inputan: ExamInput, measurement: Measurement) {
  const status = getMeasurementValueEvaluation(inputan, measurement)?.status
  if (status === 'normal') return 'text-success'
  if (status === 'critical' || status === 'out-of-range') return 'text-error'
  return 'text-highlighted'
}

function resetMeasurementDraft() {
  for (const key of Object.keys(measurementDraft)) measurementDraft[key] = ''
  for (const inputan of measurementInputans.value) measurementDraft[inputan.id] = ''
  measurementNote.value = ''
}

async function loadMeasurements(item: RoomExamItem | null = selectedItem.value) {
  if (!item || !isMultiMeasurementItem(item)) {
    measurements.value = []
    return
  }
  measurementLoading.value = true
  try {
    const res = await api.get(`/medical/exams/queue/exam-item/${item.id}/measurements`)
    const payload = res.data?.data ?? res.data
    measurements.value = Array.isArray(payload) ? payload : []
  } catch (error) {
    measurements.value = []
    toast.add({
      title: 'Failed to load measurements',
      description: getErrorMessage(error, 'Could not load measurement history.'),
      color: 'error'
    })
  } finally {
    measurementLoading.value = false
  }
}

async function addMeasurement() {
  const item = selectedItem.value
  if (!item || measurementSaving.value) return
  const values = measurementInputans.value
    .map(inputan => ({ inputanId: inputan.id, valueNumber: measurementDraft[inputan.id] }))
    .filter(value => String(value.valueNumber ?? '').trim() !== '')
    .map(value => ({ inputanId: value.inputanId, valueNumber: Number(value.valueNumber) }))

  if (!values.length) {
    toast.add({ title: 'Measurement is empty', description: 'Fill at least one measurement value.', color: 'warning' })
    return
  }

  measurementSaving.value = true
  try {
    await api.post(`/medical/exams/queue/exam-item/${item.id}/measurements`, {
      values,
      note: measurementNote.value.trim() || null
    })
    resetMeasurementDraft()
    await loadMeasurements(item)
    toast.add({ title: 'Measurement saved', color: 'success' })
  } catch (error) {
    toast.add({
      title: 'Failed to save measurement',
      description: getErrorMessage(error, 'Could not save the measurement.'),
      color: 'error'
    })
  } finally {
    measurementSaving.value = false
  }
}

async function selectMeasurement(measurement: Measurement) {
  const item = selectedItem.value
  if (!item || measurementSaving.value) return
  measurementSaving.value = true
  try {
    await api.patch(`/medical/exams/queue/exam-item/${item.id}/measurements/${measurement.id}/select`, {})
    await loadMeasurements(item)
    await loadPage(true)
    toast.add({ title: 'Measurement selected', description: 'Selected values saved as the final result.', color: 'success' })
  } catch (error) {
    toast.add({
      title: 'Failed to select measurement',
      description: getErrorMessage(error, 'Could not use this measurement.'),
      color: 'error'
    })
  } finally {
    measurementSaving.value = false
  }
}

async function deferMeasurement() {
  const item = selectedItem.value
  if (!item || measurementSaving.value) return
  measurementSaving.value = true
  try {
    await api.patch(`/medical/exams/queue/exam-item/${item.id}/defer`, {
      note: measurementNote.value.trim() || null
    })
    await loadPage(true)
    toast.add({ title: 'Measurement deferred', description: 'Patient can continue other examinations and will be recalled when waiting.', color: 'success' })
  } catch (error) {
    toast.add({
      title: 'Failed to defer measurement',
      description: getErrorMessage(error, 'Could not defer this measurement.'),
      color: 'error'
    })
  } finally {
    measurementSaving.value = false
  }
}

watch(selectedItemId, () => {
  resetMeasurementDraft()
  void loadMeasurements()
})

const selectedMaster = computed(() =>
  masterItems.value.find(m => m.id === selectedItemId.value) ?? null
)

// Item yang sedang dikerjakan termasuk Prerequisite Meal.
const selectedItemIsMealPrereq = computed(() =>
  Boolean(selectedItem.value?.trxExamItem?.item?.mealPrerequisite)
)

const selectedQueueCode = computed(() => roomQueueDetail.value?.queueEntry?.queueCode ?? '')
const auditCtxDeptId = computed(() => selectedItem.value?.trxExamItem?.item?.department?.id ?? null)
const auditCtxItemId = computed(() => selectedItem.value?.trxExamItem?.id ?? null)

const roomAudioCode = computed(() =>
  currentRoomData.value?.voiceCode
  ?? currentRoomData.value?.name
  ?? '-'
)

const tagScope = (rows: DiffAuditEntry[], scope: 'item' | 'exam') => rows.map(row => ({ ...row, scope }))
async function fetchSelectedItemHistory() {
  const item = selectedItem.value
  if (!item?.id) {
    resetAudit()
    return
  }

  auditLoading.value = true
  try {
    const examId = item.trxExamItem?.exam?.id ?? null
    const examItemId = item.trxExamItem?.id ?? item.id
    const [roomLogs, externalLogs, examLogs] = await Promise.all([
      api.get(`/audit/RoomExamItem/${item.id}`).then(r => r.data?.data ?? []).catch(() => []),
      api.get(`/audit/ExternalResultAssignment/${examItemId}`).then(r => r.data?.data ?? []).catch(() => []),
      examId ? api.get(`/audit/TrxExamResult/${examId}`).then(r => r.data?.data ?? []).catch(() => []) : Promise.resolve([])
    ])
    auditEntries.value = [
      ...tagScope(roomLogs, 'item'),
      ...tagScope(externalLogs, 'item'),
      ...tagScope(examLogs, 'exam')
    ].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
  } finally {
    auditLoading.value = false
  }
}

const labSamples = computed(() =>
  sampleCollections.value.map((collection, index) => ({
    id: collection.id,
    index: index + 1,
    sampleTypeId: collection.sampleType?.id ?? null,
    name: collection.sampleType?.name ?? 'Sample',
    status: collection.status,
    itemIds: (collection.items ?? []).map(item => item.itemId)
  }))
)

const selectedSampleId = ref('')
const labSampleSearch = ref('')

const filteredLabSamples = computed(() => {
  const query = labSampleSearch.value.trim().toLowerCase()
  if (!query) return labSamples.value
  return labSamples.value.filter(sample => sample.name.toLowerCase().includes(query))
})

const selectedLabSample = computed(() =>
  labSamples.value.find(sample => sample.id === selectedSampleId.value) ?? null
)

const labSampleItems = computed(() => {
  const sample = selectedLabSample.value
  if (!sample) return []
  const itemIds = new Set(sample.itemIds)
  return roomExamItems.value.filter(item =>
    itemIds.has(item.trxExamItem?.item?.id ?? '')
    || (sample.sampleTypeId != null && item.sampleImpact?.sampleTypeId === sample.sampleTypeId)
  )
})

const labItemSearch = ref('')
const labItemStatusFilter = ref('all')
const expandAllLabItems = ref(false)
const expandedLabItems = ref<Record<string, boolean>>({})

function toggleLabItem(id: string) {
  expandedLabItems.value[id] = !expandedLabItems.value[id]
}
function isLabItemExpanded(id: string) {
  return expandAllLabItems.value || Boolean(expandedLabItems.value[id])
}

const labItemStatusOptions = computed(() => {
  const set = new Set<string>()
  for (const item of labSampleItems.value) set.add(getOperationalStatusLabel(item))
  return ['all', ...set]
})

const filteredLabItems = computed(() => {
  const query = labItemSearch.value.trim().toLowerCase()
  return labSampleItems.value.filter((item) => {
    const name = item.trxExamItem?.item?.name ?? ''
    const code = item.trxExamItem?.item?.code ?? ''
    const statusLabel = getOperationalStatusLabel(item)
    const matchesQuery = !query || `${name} ${code} ${statusLabel}`.toLowerCase().includes(query)
    const matchesStatus = labItemStatusFilter.value === 'all' || statusLabel === labItemStatusFilter.value
    return matchesQuery && matchesStatus
  })
})

async function fetchSelectedSampleHistory() {
  const items = labSampleItems.value
  if (!items.length) {
    resetAudit()
    return
  }
  auditLoading.value = true
  try {
    const examId = items[0]?.trxExamItem?.exam?.id ?? null
    const sampleId = selectedLabSample.value?.id ?? null
    const examItemIds = items.map(item => item.trxExamItem?.id ?? item.id)
    const [roomLogs, externalLogs, itemLogs, examLogs, sampleLogs] = await Promise.all([
      Promise.all(examItemIds.map(id => api.get(`/audit/RoomExamItem/${id}`).then(r => r.data?.data ?? []).catch(() => []))).then(rows => rows.flat()),
      Promise.all(examItemIds.map(id => api.get(`/audit/ExternalResultAssignment/${id}`).then(r => r.data?.data ?? []).catch(() => []))).then(rows => rows.flat()),
      Promise.all(examItemIds.map(id => api.get(`/audit/TrxExamItem/${id}`).then(r => r.data?.data ?? []).catch(() => []))).then(rows => rows.flat()),
      examId ? api.get(`/audit/TrxExamResult/${examId}`).then(r => r.data?.data ?? []).catch(() => []) : Promise.resolve([]),
      sampleId ? api.get(`/audit/QueueSampleCollection/${sampleId}`).then(r => r.data?.data ?? []).catch(() => []) : Promise.resolve([])
    ])
    auditEntries.value = [
      ...tagScope(sampleLogs, 'item'),
      ...tagScope(roomLogs, 'item'),
      ...tagScope(externalLogs, 'item'),
      ...tagScope(itemLogs, 'item'),
      ...tagScope(examLogs, 'exam')
    ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  } finally {
    auditLoading.value = false
  }
}

watch(labSamples, (list) => {
  if (!list.length) {
    selectedSampleId.value = ''
    return
  }
  if (!list.some(sample => sample.id === selectedSampleId.value)) {
    selectedSampleId.value = list[0]?.id ?? ''
  }
}, { immediate: true })

watch(selectedSampleId, () => {
  labItemSearch.value = ''
  labItemStatusFilter.value = 'all'
  expandAllLabItems.value = false
  expandedLabItems.value = {}
  void fetchSelectedSampleHistory()
})

const selectedBadgeColor = computed(() => {
  if (!selectedItem.value) return 'neutral'
  return getOperationalStatusColor(selectedItem.value)
})

const completedItemCount = computed(() =>
  roomExamItems.value.filter(item => item.status === 'DONE').length
)
const totalItemCount = computed(() => roomExamItems.value.length)

watch(selectedItemId, () => {
  if (!isLabRoom.value) void fetchSelectedItemHistory()
})

watch(masterItems, (list) => {
  if (list.length === 0) {
    selectedItemId.value = ''
    return
  }

  if (!list.some(m => m.id === selectedItemId.value)) {
    const first = list[0]
    if (first) selectedItemId.value = first.id
  }
}, { immediate: true })

function toggleDrawer() {
  isDrawerOpen.value = !isDrawerOpen.value
}

function selectItem(itemId: string) {
  selectedItemId.value = itemId
  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
    isDrawerOpen.value = false
  }
}

function getStatusDotClass(color: string) {
  const map: Record<string, string> = {
    success: 'bg-success',
    warning: 'bg-warning',
    info: 'bg-info',
    error: 'bg-error',
    neutral: 'bg-muted'
  }
  return map[color] ?? 'bg-muted'
}

function getStatusTextClass(color: string) {
  const map: Record<string, string> = {
    success: 'text-success',
    warning: 'text-warning',
    info: 'text-info',
    error: 'text-error',
    neutral: 'text-muted'
  }
  return map[color] ?? 'text-muted'
}
function isSampleManagedItem(item: RoomExamItem) {
  return Boolean(item.sampleImpact)
}

// Room lab hanya mengerjakan pengambilan sample (per jenis sample), bukan per item.
const isLabRoom = computed(() =>
  roomAssignment.value?.roomType?.code === 'LAB'
  || roomExamItems.value.some(item => isSampleManagedItem(item))
)

function isSampleOnlyItem(item: RoomExamItem) {
  return isLabRoom.value && isSampleManagedItem(item)
}

function getSampleCollectionStatus(item: RoomExamItem) {
  return item.sampleImpact?.collectionStatus ?? null
}

function isItemInProgress(item: RoomExamItem) {
  return item.status === 'IN_PROGRESS'
}

function canInteractWithItem(item: RoomExamItem) {
  if (!roomStageInProgress.value) return false
  if (isSampleManagedItem(item) && !isExamStageActive()) return false
  if (!isItemInProgress(item)) return false
  if (item.operationalStatus === 'WAITING_SAMPLE') return false
  if (item.operationalStatus === 'BLOCKED_SAMPLE_REJECTED') return false
  return true
}

function canRenderExamInputs(item: RoomExamItem) {
  // Deferred: hasil diisi belakangan di halaman Hasil Exam, bukan saat examination
  if (item.trxExamItem?.item?.resultTiming === 'deferred') return false
  // Hasil sudah disubmit → tampilkan read-only, inputan tidak boleh diedit lagi
  if (item.trxExamItem?.resultStatus === 'SUBMITTED') return false
  return hasStructuredInputs(item) && canInteractWithItem(item)
}

function canRenderItemNotes(item: RoomExamItem) {
  return canInteractWithItem(item)
    && !hasStructuredInputs(item)
    && !item.trxExamItem?.item?.externalResult
}

function isExamResultSubmitted(item: RoomExamItem) {
  return item.trxExamItem?.resultStatus === 'SUBMITTED'
    || Boolean(item.trxExamItem?.templateSnapshotAt)
    || item.trxExamItem?.exam?.status === 'completed'
}

function canDoneItem(item: RoomExamItem) {
  if (item.status !== 'IN_PROGRESS') return false
  if (item.trxExamItem?.item?.externalResult) {
    const assignment = item.trxExamItem.externalAssignment
    if (!assignment || !['ASSIGNED', 'PROCESSING', 'FILLED'].includes(assignment.status)) {
      return false
    }
    return !item.trxExamItem.item.requiresAttachmentForDone
      || Boolean(assignment.attachmentUrl)
  }
  // Dental disimpan sebagai draft di room; submit final dilakukan dari menu Result.
  if (isDentalExamItem(item)) return true
  // Deferred: hasil diisi belakangan, item tetap bisa diselesaikan sekarang
  if (item.trxExamItem?.item?.resultTiming === 'deferred') return true
  if (isPhysicalExamItem(item)) return isExamResultSubmitted(item)
  if (!hasStructuredInputs(item)) return true
  return isExamResultSubmitted(item)
}
function getExternalDoneBlockReason(item: RoomExamItem) {
  const assignment = item.trxExamItem?.externalAssignment
  if (!assignment || !['ASSIGNED', 'PROCESSING', 'FILLED'].includes(assignment.status)) {
    return 'Assign an external doctor first.'
  }
  if (
    item.trxExamItem?.item?.requiresAttachmentForDone
    && !assignment.attachmentUrl
  ) {
    return 'The result PDF must be uploaded before the item can be completed.'
  }
  return null
}

function getStoredResult(item: RoomExamItem, inputanId: string) {
  return item.trxExamItem?.exam?.results?.find(result => result.inputanId === inputanId) ?? null
}

function getResultDisplayValue(item: RoomExamItem, inputan: ExamInput) {
  const result = getStoredResult(item, inputan.id)
  const draft = resultDrafts[item.id]?.[inputan.id]

  if (inputan.inputType === 'number') {
    if (result?.valueNumber != null) return String(result.valueNumber)
    if (getDraftText(draft?.valueNumber)) return getDraftText(draft?.valueNumber)
  }

  if (inputan.inputType === 'calculated') {
    if (result?.valueCalculated != null) return String(result.valueCalculated)
    if (getDraftText(draft?.valueCalculated)) return getDraftText(draft?.valueCalculated)
  }

  if (inputan.inputType === 'selected') {
    const selected = result?.valueSelected ?? draft?.valueSelected
    if (selected) return inputan.opsis?.find(opsi => opsi.value === selected)?.label ?? selected
  }

  const text = result?.valueString ?? draft?.valueString
  if (getDraftText(text)) return getDraftText(text)

  return null
}

type SubmittedResultRow = {
  id: string
  label: string
  value: string
  uom?: string | null
  flag: 'normal' | 'abnormal' | null
}

function getSubmittedResultRows(item: RoomExamItem): SubmittedResultRow[] {
  return (item.trxExamItem?.item?.inputans ?? [])
    .map((inputan): SubmittedResultRow | null => {
      const value = getResultDisplayValue(item, inputan)
      return value == null
        ? null
        : {
            id: inputan.id,
            label: inputan.label,
            value,
            uom: inputan.uom ?? null,
            flag: (getStoredResult(item, inputan.id)?.flag as 'normal' | 'abnormal' | null) ?? null
          }
    })
    .filter((row): row is { id: string, label: string, value: string, uom: string | null | undefined, flag: 'normal' | 'abnormal' | null } => Boolean(row))
}

function shouldShowResultDocument(item: RoomExamItem) {
  if (isPhysicalExamItem(item)) return false
  return item.status === 'DONE' || isExamResultSubmitted(item)
}

function getPhysicalLegacyRows(item: RoomExamItem): Array<{ id: string, label: string, value: string, uom?: string | null, flag?: 'normal' | 'abnormal' | null }> {
  return getSubmittedResultRows(item)
}

function getOperationalStatusLabel(item: RoomExamItem) {
  const sampleStatus = getSampleCollectionStatus(item)

  if (item.operationalStatus === 'WAITING_SAMPLE') {
    if (sampleStatus === 'COLLECTED') return 'Awaiting reception'
    if (sampleStatus === 'PENDING') return 'Awaiting collection'
    return 'Awaiting sample'
  }
  if (item.operationalStatus === 'BLOCKED_SAMPLE_REJECTED' || sampleStatus === 'REJECTED') return 'Sample rejected'
  if (item.operationalStatus === 'RESCHEDULED' || sampleStatus === 'RESCHEDULED') return 'Sample rescheduled'
  return getStatusLabel(item.status)
}

function getOperationalStatusColor(item: RoomExamItem): BadgeColor {
  const sampleStatus = getSampleCollectionStatus(item)

  if (item.operationalStatus === 'WAITING_SAMPLE') {
    if (sampleStatus === 'COLLECTED') return 'info'
    return 'warning'
  }
  if (item.operationalStatus === 'BLOCKED_SAMPLE_REJECTED' || sampleStatus === 'REJECTED') return 'error'
  if (item.operationalStatus === 'RESCHEDULED' || sampleStatus === 'RESCHEDULED') return 'neutral'
  return getStatusColor(item.status)
}

function getSampleActionDescription(item: RoomExamItem) {
  const sampleStatus = getSampleCollectionStatus(item)

  if (sampleStatus === 'PENDING') {
    return 'Sample not collected yet. Collect the sample before this item can be processed.'
  }

  if (sampleStatus === 'REJECTED') {
    return item.sampleImpact?.rejectReason || 'Sample rejected and must be rescheduled before the item can be processed.'
  }

  if (sampleStatus === 'RESCHEDULED') {
    return item.sampleImpact?.rescheduledAt
      ? `Sample rescheduled to ${item.sampleImpact.rescheduledAt}.`
      : 'Sample rescheduled and awaiting the next visit.'
  }

  if (sampleStatus === 'COLLECTED') {
    return 'Sample collected and awaiting receipt by the lab.'
  }

  if (sampleStatus === 'RECEIVED') {
    return 'Sample received by the lab and ready to be processed in the exam stage.'
  }

  return 'This item still follows the status of its related sample.'
}

function hasStructuredInputs(item: RoomExamItem) {
  return (item.trxExamItem?.item?.inputans ?? []).length > 0
}

function getInputDraft(itemId: string, inputId: string) {
  if (!resultDrafts[itemId]) {
    resultDrafts[itemId] = {}
  }

  if (!resultDrafts[itemId][inputId]) {
    resultDrafts[itemId][inputId] = {}
  }

  return resultDrafts[itemId][inputId]
}

function normalizeFormulaKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function toFormulaIdentifier(value: string) {
  const identifier = value.trim().replace(/[^A-Za-z0-9_$]+/g, '_')
  if (!identifier) return null
  return /^[A-Za-z_$]/.test(identifier) ? identifier : `_${identifier}`
}

function getInputNumericValue(item: RoomExamItem, inputan: ExamInput) {
  const draft = resultDrafts[item.id]?.[inputan.id] ?? {}

  if (inputan.inputType === 'number') {
    const draftValue = parseDraftNumber(draft.valueNumber)
    if (draftValue != null) return draftValue
  }

  if (inputan.inputType === 'calculated') {
    const draftValue = parseDraftNumber(draft.valueCalculated)
    if (draftValue != null) return draftValue
  }

  const existing = item.trxExamItem?.exam?.results?.find(result => result.inputanId === inputan.id)
  if (existing?.valueNumber != null) return existing.valueNumber
  if (existing?.valueCalculated != null) return existing.valueCalculated

  return null
}

function addFormulaScopeValue(scope: Map<string, number>, inputan: ExamInput, value: number) {
  scope.set(normalizeFormulaKey(inputan.label), value)

  const identifier = toFormulaIdentifier(inputan.label)
  if (identifier) scope.set(identifier, value)
}

function buildFormulaScope(currentItem: RoomExamItem, targetInputId: string) {
  const scope = new Map<string, number>()

  for (const item of roomExamItems.value) {
    for (const inputan of item.trxExamItem?.item?.inputans || []) {
      if (inputan.id === targetInputId) continue
      if (!['number', 'calculated'].includes(inputan.inputType)) continue

      const value = getInputNumericValue(item, inputan)
      if (value == null) continue

      addFormulaScopeValue(scope, inputan, value)
    }
  }

  for (const inputan of currentItem.trxExamItem?.item?.inputans || []) {
    if (inputan.id === targetInputId) continue
    if (!['number', 'calculated'].includes(inputan.inputType)) continue

    const value = getInputNumericValue(currentItem, inputan)
    if (value == null) continue

    addFormulaScopeValue(scope, inputan, value)
  }

  return scope
}

function evaluateCalculatedFormula(item: RoomExamItem, inputan: ExamInput) {
  const formula = inputan.formula?.formula?.trim()
  if (!formula) return null

  const scope = buildFormulaScope(item, inputan.id)
  const args: string[] = []
  const values: number[] = []
  const usedNames = new Set<string>()

  function bindValue(name: string, value: number) {
    let safeName = name
    let suffix = 1
    while (usedNames.has(safeName)) {
      safeName = `${name}_${suffix}`
      suffix += 1
    }
    usedNames.add(safeName)
    args.push(safeName)
    values.push(value)
    return safeName
  }

  let expression = formula

  try {
    expression = formula.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, label: string) => {
      const value = scope.get(normalizeFormulaKey(label))
      if (value == null) throw new Error('Formula dependency is incomplete')
      return bindValue(`v${args.length}`, value)
    })
  } catch {
    return null
  }

  for (const [key, value] of scope.entries()) {
    if (!/^[A-Za-z_$][\w$]*$/.test(key)) continue
    if (['round', 'abs', 'min', 'max', 'pow', 'sqrt', 'ceil', 'floor'].includes(key)) continue
    bindValue(key, value)
  }

  if (!/^[\w$+\-*/%().,\s]+$/.test(expression)) return null

  const fn = new Function('round', 'abs', 'min', 'max', 'pow', 'sqrt', 'ceil', 'floor', ...args, `"use strict"; return (${expression});`)

  try {
    const round = (value: number, precision = 0) => {
      const factor = 10 ** precision
      return Math.round(value * factor) / factor
    }
    const result = Number(fn(round, Math.abs, Math.min, Math.max, Math.pow, Math.sqrt, Math.ceil, Math.floor, ...values))
    if (!Number.isFinite(result)) return null
    return Math.round(result * 10000) / 10000
  } catch {
    return null
  }
}

function recomputeCalculatedDrafts(item: RoomExamItem, clearIncomplete = false) {
  const calculatedInputs = (item.trxExamItem?.item?.inputans || [])
    .filter(inputan => inputan.inputType === 'calculated')

  for (let pass = 0; pass < calculatedInputs.length; pass += 1) {
    let changed = false

    for (const inputan of calculatedInputs) {
      const draft = getInputDraft(item.id, inputan.id)
      const calculated = evaluateCalculatedFormula(item, inputan)

      if (calculated == null) {
        if (clearIncomplete && getDraftText(draft.valueCalculated)) {
          draft.valueCalculated = ''
          changed = true
        }
        continue
      }

      const nextValue = String(calculated)
      if (draft.valueCalculated !== nextValue) {
        draft.valueCalculated = nextValue
        changed = true
      }
    }

    if (!changed) break
  }
}

function recomputeAllCalculatedDrafts(clearIncomplete = false) {
  for (const item of roomExamItems.value) {
    recomputeCalculatedDrafts(item, clearIncomplete)
  }
}
function openItemActionModal(item: RoomExamItem, action: 'skip' | 'reschedule' | 'retest' | 'refuse') {
  selectedItemAction.value = item
  selectedItemActionType.value = action
  itemActionReason.value = ''
  itemActionNote.value = ''
  isItemActionModalOpen.value = true
}

function closeItemActionModal() {
  isItemActionModalOpen.value = false
  selectedItemAction.value = null
  selectedItemActionType.value = null
  itemActionReason.value = ''
  itemActionNote.value = ''
}

async function handleEnterRoom() {
  if (roomEnterActionLoading.value || !roomAssignment.value?.roomId) return

  roomEnterActionLoading.value = true
  try {
    await enterRoomSession({ roomId: roomAssignment.value.roomId })
    await refreshRoomSession()
    await refreshAssignment()
    isEnterRoomModalOpen.value = false

    toast.add({
      title: 'Success',
      description: 'Successfully entered the active room.',
      color: 'success'
    })
  } catch (error: unknown) {
    toast.add({
      title: 'Failed to enter room',
      description: getErrorMessage(error, 'An error occurred while entering the active room.'),
      color: 'error'
    })
  } finally {
    roomEnterActionLoading.value = false
  }
}

async function handleExitRoom() {
  if (roomSessionActionLoading.value || !activeRoomSession.value) return

  roomSessionActionLoading.value = true
  try {
    await exitRoomSession()
    await refreshRoomSession()
    isExitRoomModalOpen.value = false

    toast.add({
      title: 'Success',
      description: 'Successfully exited the active room.',
      color: 'success'
    })

    await router.push('/rooms/assignments')
  } catch (error: unknown) {
    toast.add({
      title: 'Failed to exit room',
      description: getErrorMessage(error, 'An error occurred while exiting the active room.'),
      color: 'error'
    })
  } finally {
    roomSessionActionLoading.value = false
  }
}

function seedLocalState() {
  for (const item of roomExamItems.value) {
    if (itemNotes[item.id] === undefined || (!itemNotes[item.id]?.trim() && item.notes?.trim())) {
      itemNotes[item.id] = item.notes ?? ''
    }

    const resultMap = new Map(
      (item.trxExamItem?.exam?.results ?? []).map(result => [result.inputanId, result])
    )

    for (const inputan of item.trxExamItem?.item?.inputans ?? []) {
      const existing = resultMap.get(inputan.id)
      const draft = getInputDraft(item.id, inputan.id)

      if (draft.valueNumber === undefined && existing?.valueNumber != null) {
        draft.valueNumber = String(existing.valueNumber)
      }

      if (draft.valueString === undefined && existing?.valueString != null) {
        draft.valueString = existing.valueString
      }

      if (draft.valueSelected === undefined && existing?.valueSelected != null) {
        draft.valueSelected = existing.valueSelected
      }

      if (draft.valueCalculated === undefined && existing?.valueCalculated != null) {
        draft.valueCalculated = String(existing.valueCalculated)
      }
    }
  }

  recomputeAllCalculatedDrafts()
}

watch(roomExamItems, seedLocalState, { immediate: true })
watch(resultDrafts, () => recomputeAllCalculatedDrafts(true), { deep: true })

async function loadPage(showRefreshState = false) {
  if (!roomQueueItemId.value) return

  if (showRefreshState) {
    refreshing.value = true
  } else {
    loading.value = true
  }

  try {
    const [detailRes, examItemsRes] = await Promise.all([
      api.get(`/medical/exams/queue/room-item/${roomQueueItemId.value}`),
      api.get(`/medical/exams/queue/room-item/${roomQueueItemId.value}/exam-items`)
    ])

    roomQueueDetail.value = detailRes.data?.data ?? detailRes.data ?? null
    await Promise.all([
      loadPatientDetail(queuePatient.value?.id ?? null),
      loadPatientMedicalNotes(queuePatient.value?.id ?? null)
    ])
    roomExamItems.value = examItemsRes.data?.data ?? examItemsRes.data ?? []
    await nextTick()
    if (isLabRoom.value) await fetchSelectedSampleHistory()
    else await fetchSelectedItemHistory()
  } catch (error: unknown) {
    toast.add({
      title: 'Failed to load examination data',
      description: getErrorMessage(error, 'An error occurred while loading the room work details.'),
      color: 'error'
    })
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

watch(() => roomQueueItemId.value, () => loadPage(), { immediate: true })

function setItemLoading(itemId: string, value: boolean) {
  itemActionLoading.value = {
    ...itemActionLoading.value,
    [itemId]: value
  }
}

function setResultSaving(itemId: string, value: boolean) {
  resultSaveLoading.value = {
    ...resultSaveLoading.value,
    [itemId]: value
  }
}

function getDraftText(value: unknown) {
  return String(value ?? '').trim()
}

function buildResultsPayload(item: RoomExamItem) {
  const itemDraft = resultDrafts[item.id] ?? {}
  const inputs = item.trxExamItem?.item?.inputans ?? []

  return inputs.map((inputan) => {
    const draft = itemDraft[inputan.id] ?? {}
    const base = { inputanId: inputan.id }

    if (inputan.inputType === 'number') {
      if (!getDraftText(draft.valueNumber)) return null
      return {
        ...base,
        valueNumber: Number(draft.valueNumber)
      }
    }

    if (inputan.inputType === 'selected') {
      if (!getDraftText(draft.valueSelected)) return null
      const detail = selectedOptionRequiresDetail(inputan, draft.valueSelected ?? '')
        ? getDraftText(draft.valueString)
        : ''
      return detail
        ? { ...base, valueSelected: draft.valueSelected, valueString: detail }
        : { ...base, valueSelected: draft.valueSelected }
    }

    if (inputan.inputType === 'calculated') {
      if (!getDraftText(draft.valueCalculated)) return null
      return {
        ...base,
        valueCalculated: Number(draft.valueCalculated)
      }
    }

    if (!getDraftText(draft.valueString)) return null
    return {
      ...base,
      valueString: getDraftText(draft.valueString)
    }
  }).filter((value): value is NonNullable<typeof value> => Boolean(value))
}

async function handleReturnPatient() {
  if (!activeStage.value || stageActionLoading.value) return

  stageActionLoading.value = true
  try {
    await api.patch(`/medical/exams/queue/stage/${activeStage.value.id}/return`, {})
    await loadPage(true)
    toast.add({
      title: 'Success',
      description: 'Patient returned to the waiting list.',
      color: 'success'
    })
  } catch (error: unknown) {
    toast.add({
      title: 'Failed to return patient',
      description: getErrorMessage(error, 'An error occurred while returning the patient to the waiting list.'),
      color: 'error'
    })
  } finally {
    stageActionLoading.value = false
  }
}

async function handleCancelStartStage() {
  if (!activeStage.value || stageActionLoading.value) return

  stageActionLoading.value = true
  try {
    await api.patch(`/medical/exams/queue/stage/${activeStage.value.id}/cancel-start`, {})
    await loadPage(true)
    toast.add({
      title: 'Success',
      description: 'Examination cancelled — patient status back to Called.',
      color: 'success'
    })
  } catch (error: unknown) {
    toast.add({
      title: 'Failed to cancel start',
      description: getErrorMessage(error, 'An error occurred while reverting the stage to Called.'),
      color: 'error'
    })
  } finally {
    stageActionLoading.value = false
  }
}

// Countdown tombol "Panggil Ulang": server menolak ulangan < 15 detik.
const RECALL_COOLDOWN_SECONDS = 15
const recallCooldown = ref(0)
let recallTimer: ReturnType<typeof setInterval> | null = null

function stopRecallCooldown() {
  if (recallTimer) {
    clearInterval(recallTimer)
    recallTimer = null
  }
}

function startRecallCooldown(seconds = RECALL_COOLDOWN_SECONDS) {
  stopRecallCooldown()
  recallCooldown.value = seconds
  recallTimer = setInterval(() => {
    recallCooldown.value -= 1
    if (recallCooldown.value <= 0) {
      recallCooldown.value = 0
      stopRecallCooldown()
    }
  }, 1000)
}

onBeforeUnmount(stopRecallCooldown)

async function handleRecallStage() {
  if (!activeStage.value || stageActionLoading.value || recallCooldown.value > 0) return

  stageActionLoading.value = true
  try {
    await api.post(`/medical/exams/queue/stage/${activeStage.value.id}/recall`, {})
    startRecallCooldown()
    toast.add({
      title: 'Panggilan diulang',
      description: 'Nomor dipanggil ulang ke speaker ruangan.',
      color: 'success'
    })
  } catch (error: unknown) {
    // 429 = server menahan (baru saja diulang) → selaraskan countdown.
    if ((error as { response?: { status?: number } })?.response?.status === 429) {
      startRecallCooldown()
    }
    toast.add({
      title: 'Gagal mengulang panggilan',
      description: getErrorMessage(error, 'Terjadi kesalahan saat mengulang panggilan.'),
      color: 'error'
    })
  } finally {
    stageActionLoading.value = false
  }
}

async function handleStartStage() {
  if (!activeStage.value || stageActionLoading.value) return

  stageActionLoading.value = true
  try {
    if (activeStage.value.status === 'WAITING') {
      await api.patch(`/medical/exams/queue/stage/${activeStage.value.id}/call`, {
        roomId: activeRoomSession.value?.roomId ?? undefined,
        roomTypeId: activeRoomSession.value?.roomTypeId ?? undefined
      })
    }
    await api.patch(`/medical/exams/queue/stage/${activeStage.value.id}/start`)
    await loadPage(true)
    toast.add({
      title: 'Success',
      description: 'Room examination started.',
      color: 'success'
    })
  } catch (error: unknown) {
    toast.add({
      title: 'Failed to start examination',
      description: getErrorMessage(error, 'An error occurred while starting the room examination.'),
      color: 'error'
    })
  } finally {
    stageActionLoading.value = false
  }
}

async function handleFinishStage() {
  if (!activeStage.value || stageActionLoading.value) return

  stageActionLoading.value = true
  try {
    await api.patch(`/medical/exams/queue/stage/${activeStage.value.id}/done`, {})

    // [B] Room dental selesai → auto submit hasil gigi agar masuk workflow department.
    const dentalExamIds = [...new Set(
      roomExamItems.value
        .filter(item => isDentalExamItem(item))
        .map(item => item.trxExamItem?.exam?.id)
        .filter((x): x is string => Boolean(x))
    )]
    for (const examId of dentalExamIds) {
      const item = roomExamItems.value.find(i => i.trxExamItem?.exam?.id === examId)
      if (item?.trxExamItem?.resultStatus === 'SUBMITTED') continue
      try {
        await api.post(`/mcu/exams/${examId}/dental/submit`, {})
      } catch {
        // best-effort: tidak memblokir penyelesaian room
      }
    }

    toast.add({
      title: 'Success',
      description: 'Room examination completed.',
      color: 'success'
    })

    // Check if there are deferred items that need result input
    const deferredItems = (roomExamItems.value || []).filter(
      item => item.trxExamItem?.item?.resultTiming === 'deferred'
    )

    if (deferredItems.length > 0) {
      toast.add({
        title: 'Results need input',
        description: `${deferredItems.length} item(s) awaiting result input on the Exam Results page.`,
        color: 'info'
      })
    }

    // Kembali ke antrian room
    await router.push('/rooms/queue')
  } catch (error: unknown) {
    const response = (error as { response?: { data?: { errors?: { pendingItems?: Array<{ itemName?: string }> } } } }).response
    const pendingItems = response?.data?.errors?.pendingItems ?? []
    const pendingLabel = pendingItems.length > 0
      ? ` Pending items: ${pendingItems.map(item => item.itemName).filter(Boolean).join(', ')}.`
      : ''

    toast.add({
      title: 'Cannot complete the room yet',
      description: `${getErrorMessage(error, 'There are still examination items that are not finished.')}${pendingLabel}`,
      color: 'warning'
    })
  } finally {
    stageActionLoading.value = false
  }
}

async function handleStartItem(item: RoomExamItem) {
  if (itemActionLoading.value[item.id]) return
  if (!roomStageInProgress.value) {
    toast.add({
      title: 'Stage belum dimulai',
      description: 'Panggil pasien dan mulai stage room terlebih dahulu.',
      color: 'warning'
    })
    await loadPage(true)
    return
  }

  setItemLoading(item.id, true)
  try {
    await api.patch(`/medical/exams/queue/exam-item/${item.id}/start`, {})
    await loadPage(true)
    toast.add({
      title: 'Success',
      description: `Item ${item.trxExamItem?.item?.name ?? 'examination'} started.`,
      color: 'success'
    })
  } catch (error: unknown) {
    toast.add({
      title: 'Failed to start item',
      description: getErrorMessage(error, 'An error occurred while starting the examination item.'),
      color: 'error'
    })
  } finally {
    setItemLoading(item.id, false)
  }
}

function canCancelItem(item: RoomExamItem) {
  if (!canManageItemActions.value) return false
  if (item.status !== 'PENDING' || item.startAt) return false
  const trx = item.trxExamItem
  if (!trx?.item?.id) return false
  if (trx.workStatus && trx.workStatus !== 'PENDING') return false
  if (trx.workStartedAt) return false
  if (trx.resultStatus && trx.resultStatus !== 'NOT_READY') return false
  return Boolean(trx.examId ?? trx.exam?.id)
}

function openCancelItemModal(item: RoomExamItem) {
  if (!canCancelItem(item)) return
  cancelItemTarget.value = item
  cancelItemReason.value = ''
  isCancelItemModalOpen.value = true
}

async function handleCancelItem() {
  const item = cancelItemTarget.value
  if (!item || cancelItemLoading.value) return
  const examId = item.trxExamItem?.examId ?? item.trxExamItem?.exam?.id
  const itemId = item.trxExamItem?.item?.id
  if (!examId || !itemId) return

  const itemName = item.trxExamItem?.item?.name ?? 'Examination item'
  cancelItemLoading.value = true
  try {
    await api.post(`/mcu/exams/${examId}/items/${itemId}/cancel`, {
      reason: cancelItemReason.value.trim() || 'Cancelled from room'
    })
    isCancelItemModalOpen.value = false
    cancelItemTarget.value = null
    cancelItemReason.value = ''
    await loadPage(true)
    toast.add({
      title: 'Item cancelled',
      description: `${itemName} is cancelled and will not be examined.`,
      color: 'success'
    })
    if (currentRoomWorkStatus.value === 'CANCELLED') {
      await router.push('/rooms/queue')
    }
  } catch (error: unknown) {
    toast.add({
      title: 'Failed to cancel item',
      description: getErrorMessage(error, 'An error occurred while cancelling the examination item.'),
      color: 'error'
    })
  } finally {
    cancelItemLoading.value = false
  }
}

async function handleCollectCollection(collectionId: string) {
  if (collectionActionLoading.value[collectionId]) return

  collectionActionLoading.value = { ...collectionActionLoading.value, [collectionId]: true }
  try {
    await api.patch(`/medical/exams/queue/samples/${collectionId}/collect`, {})
    await loadPage(true)
    toast.add({
      title: 'Success',
      description: 'Sample collected successfully.',
      color: 'success'
    })
  } catch (error: unknown) {
    toast.add({
      title: 'Failed to collect sample',
      description: getErrorMessage(error, 'An error occurred while collecting the sample.'),
      color: 'error'
    })
  } finally {
    collectionActionLoading.value = { ...collectionActionLoading.value, [collectionId]: false }
  }
}

async function handleReceiveCollection(collectionId: string) {
  if (collectionActionLoading.value[collectionId]) return

  collectionActionLoading.value = { ...collectionActionLoading.value, [collectionId]: true }
  try {
    await api.patch(`/medical/exams/queue/samples/${collectionId}/receive`, {})
    await loadPage(true)
    toast.add({
      title: 'Success',
      description: 'Sample received successfully.',
      color: 'success'
    })
  } catch (error: unknown) {
    toast.add({
      title: 'Failed to receive sample',
      description: getErrorMessage(error, 'An error occurred while receiving the sample.'),
      color: 'error'
    })
  } finally {
    collectionActionLoading.value = { ...collectionActionLoading.value, [collectionId]: false }
  }
}

async function saveResultsDraft(item: RoomExamItem, showToast = true) {
  const examId = item.trxExamItem?.exam?.id
  if (!examId) return false

  const results = buildResultsPayload(item)
  // Deferred: tidak perlu input hasil saat examination, skip save
  if (results.length === 0 && item.trxExamItem?.item?.resultTiming === 'deferred') {
    return true
  }
  if (results.length === 0) {
    toast.add({
      title: 'No results yet',
      description: 'Enter at least one exam result before saving.',
      color: 'warning'
    })
    return false
  }

  await api.post(`/mcu/exams/${examId}/results`, { results })
  if (showToast) {
    toast.add({
      title: 'Success',
      description: 'Result draft saved successfully.',
      color: 'success'
    })
  }
  return true
}

async function handleSaveResults(item: RoomExamItem) {
  setResultSaving(item.id, true)
  try {
    const saved = await saveResultsDraft(item)
    if (saved) await loadPage(true)
  } catch (error: unknown) {
    toast.add({
      title: 'Failed to save draft',
      description: getErrorMessage(error, 'An error occurred while saving the result draft.'),
      color: 'error'
    })
  } finally {
    setResultSaving(item.id, false)
  }
}

async function handleSubmitResults(item: RoomExamItem) {
  const examId = item.trxExamItem?.exam?.id
  if (!examId) return

  setResultSaving(item.id, true)
  try {
    if (isMultiMeasurementItem(item)) {
      if (!measurements.value.some(measurement => measurement.isSelected)) {
        toast.add({
          title: 'Pilih pengukuran dulu',
          description: 'Pilih satu pengukuran sebagai hasil final sebelum submit.',
          color: 'warning'
        })
        return
      }
    } else {
      const saved = await saveResultsDraft(item, false)
      if (!saved) return
    }

    await api.post(`/mcu/exams/${examId}/results/submit`, {
      departmentId: item.trxExamItem?.item?.department?.id ?? undefined,
      examItemId: item.trxExamItem?.id
    })
    await loadPage(true)
    toast.add({
      title: 'Success',
      description: 'Results submitted successfully. The item can now be completed.',
      color: 'success'
    })
  } catch (error: unknown) {
    toast.add({
      title: 'Failed to submit results',
      description: getErrorMessage(error, 'An error occurred while submitting the results.'),
      color: 'error'
    })
  } finally {
    setResultSaving(item.id, false)
  }
}
async function handleDoneItem(item: RoomExamItem) {
  if (itemActionLoading.value[item.id]) return
  if (!currentUserId.value) {
    toast.add({
      title: 'User account not found',
      description: 'Reload the page and try again.',
      color: 'error'
    })
    return
  }

  setItemLoading(item.id, true)
  try {
    await api.patch(`/medical/exams/queue/exam-item/${item.id}/done`, {
      updatedBy: currentUserId.value,
      notes: itemNotes[item.id]?.trim() || null
    })
    await loadPage(true)
    toast.add({
      title: 'Success',
      description: `Item ${item.trxExamItem?.item?.name ?? 'examination'} completed.`,
      color: 'success'
    })
  } catch (error: unknown) {
    toast.add({
      title: 'Failed to complete item',
      description: getErrorMessage(error, 'An error occurred while completing the examination item.'),
      color: 'error'
    })
  } finally {
    setItemLoading(item.id, false)
  }
}

async function handleSubmitItemAction() {
  if (!selectedItemAction.value || !selectedItemActionType.value || itemActionSubmitLoading.value) return
  if (!currentUserId.value) {
    toast.add({
      title: 'User account not found',
      description: 'Reload the page and try again.',
      color: 'error'
    })
    return
  }

  const item = selectedItemAction.value
  const actionType = selectedItemActionType.value
  let returnedToWaiting = false
  itemActionSubmitLoading.value = true

  try {
    if (actionType === 'skip') {
      if (!itemActionReason.value.trim()) {
        toast.add({
          title: 'Reason is required',
          description: 'Enter the skip reason before continuing.',
          color: 'warning'
        })
        return
      }

      await api.patch(`/medical/exams/queue/exam-item/${item.id}/skip`, {
        skippedBy: currentUserId.value,
        skipReason: itemActionReason.value.trim(),
        notes: itemActionNote.value.trim() || null
      })
    } else if (actionType === 'refuse') {
      if (!itemActionReason.value.trim()) {
        toast.add({
          title: 'Reason is required',
          description: 'Enter the refusal reason before continuing.',
          color: 'warning'
        })
        return
      }

      await api.patch(`/medical/exams/queue/exam-item/${item.id}/refuse`, {
        refusedBy: currentUserId.value,
        refuseReason: itemActionReason.value.trim(),
        notes: itemActionNote.value.trim() || null
      })
    } else if (actionType === 'retest') {
      if (!itemActionReason.value.trim()) {
        toast.add({
          title: 'Reason is required',
          description: 'Enter the retest reason before continuing.',
          color: 'warning'
        })
        return
      }

      const res = await api.patch(`/medical/exams/queue/exam-item/${item.id}/retest`, {
        retestedBy: currentUserId.value,
        retestReason: itemActionReason.value.trim(),
        notes: itemActionNote.value.trim() || null
      })
      returnedToWaiting = Boolean(res.data?.data?.returnedToWaiting)
      itemNotes[item.id] = itemActionNote.value.trim()
    } else {
      if (!itemActionNote.value.trim()) {
        toast.add({
          title: 'Note is required',
          description: 'Enter the reschedule note before continuing.',
          color: 'warning'
        })
        return
      }

      await api.patch(`/medical/exams/queue/exam-item/${item.id}/reschedule`, {
        rescheduledBy: currentUserId.value,
        rescheduleNote: itemActionNote.value.trim() || null
      })
    }

    await loadPage(true)
    toast.add({
      title: 'Success',
      description: actionType === 'skip'
        ? `Item ${item.trxExamItem?.item?.name ?? 'examination'} marked as skipped.`
        : actionType === 'refuse'
          ? `Item ${item.trxExamItem?.item?.name ?? 'examination'} refused by patient.`
          : actionType === 'retest'
            ? returnedToWaiting
              ? `Item ${item.trxExamItem?.item?.name ?? 'examination'} marked for retest. Patient returned to waiting.`
              : `Item ${item.trxExamItem?.item?.name ?? 'examination'} marked for retest.`
            : `Item ${item.trxExamItem?.item?.name ?? 'examination'} rescheduled.`,
      color: 'success'
    })
    closeItemActionModal()
    if (actionType === 'retest' && returnedToWaiting) {
      await router.push('/rooms/queue')
    }
  } catch (error: unknown) {
    toast.add({
      title: actionType === 'skip' ? 'Failed to skip item' : actionType === 'refuse' ? 'Failed to refuse item' : actionType === 'retest' ? 'Failed to retest item' : 'Failed to reschedule item',
      description: getErrorMessage(error, 'An error occurred while processing the examination item.'),
      color: 'error'
    })
  } finally {
    itemActionSubmitLoading.value = false
  }
}
</script>

<template>
  <UDashboardPanel id="room-queue-work">
    <template #header>
      <AppNavbar
        title="Room Work"
        :subtitle="roomQueueDetail?.queueEntry?.registration?.id_reg || 'Room staff examination detail'"
      >
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <div class="flex flex-wrap items-center justify-end gap-2">
            <UBadge
              :color="activeRoomSession ? 'success' : 'neutral'"
              variant="subtle"
              :label="roomSessionPending ? 'Checking room session...' : roomSessionLabel"
              class="max-w-40 truncate sm:max-w-none"
            />

            <UButton
              color="neutral"
              variant="soft"
              icon="i-lucide-arrow-left"
              title="Back to Queue"
              @click="router.push('/rooms/queue')"
            >
              <span class="hidden sm:inline">Back to Queue</span>
            </UButton>

            <UButton
              color="neutral"
              variant="soft"
              icon="i-lucide-refresh-cw"
              title="Refresh"
              :loading="refreshing"
              @click="loadPage(true)"
            >
              <span class="hidden sm:inline">Refresh</span>
            </UButton>
          </div>
        </template>
      </AppNavbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <div
          v-if="loading"
          class="grid gap-4"
        >
          <USkeleton class="h-40 rounded-2xl" />
          <USkeleton class="h-72 rounded-2xl" />
        </div>

        <UAlert
          v-else-if="!roomQueueDetail"
          color="error"
          title="Room queue detail not found"
          description="Work data could not be loaded. Please return from the room queue page."
        />

        <template v-else>
          <div class="rounded-2xl border border-default/80 bg-default p-4 shadow-sm sm:p-5">
            <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-5">
              <div class="mx-auto shrink-0 lg:mx-0">
                <button
                  type="button"
                  class="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-default bg-muted/30"
                  :class="patientPhotoUrl ? 'cursor-zoom-in hover:ring-2 hover:ring-primary/40' : 'cursor-default'"
                  :title="patientPhotoUrl ? 'View photo' : undefined"
                  @click="patientPhotoUrl && (photoViewerOpen = true)"
                >
                  <img
                    v-if="patientPhotoUrl"
                    :src="patientPhotoUrl"
                    alt="Patient photo"
                    class="h-full w-full object-cover"
                  >
                  <UIcon v-else name="i-lucide-user" class="size-9 text-muted" />
                </button>
              </div>
              <div class="w-full lg:min-w-0 lg:flex-1">
                <div class="flex items-center gap-2">
                  <span class="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                    Active Patient
                  </span>
                  <span class="text-xs text-muted">• ID: {{ patient?.PatientId || '-' }}</span>
                </div>
                <h2 class="mt-1 text-lg font-bold text-highlighted sm:text-xl">
                  {{ formatPatientName(patient) }}
                </h2>
                <p class="text-xs text-muted">
                  {{ formatPatientDetail(patient) }}
                </p>
                <div v-if="patientDetailLoading" class="mt-2 flex items-center gap-2 text-xs text-muted">
                  <UIcon name="i-lucide-loader-circle" class="size-3 animate-spin" />
                  Loading patient details
                </div>
                <UAlert
                  v-else-if="patientDetailError"
                  class="mt-3 max-w-2xl"
                  color="warning"
                  variant="soft"
                  :description="patientDetailError"
                />

                <div class="mt-3 flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <UBadge
                    size="sm"
                    class="shrink-0"
                    :label="`${activeStage ? getStageDisplayName(activeStage) : 'Completed'}`"
                    :color="activeStage ? getStatusColor(activeStage.status) : 'success'"
                    variant="subtle"
                  />
                  <UBadge
                    size="sm"
                    color="info"
                    variant="outline"
                    :label="stageSummary"
                    :ui="{ base: 'whitespace-normal h-auto text-left' }"
                    class="max-w-full"
                  />
                  <UBadge
                    size="sm"
                    class="shrink-0"
                    :label="`Room work status: ${getStatusLabel(currentRoomWorkStatus)}`"
                    :color="getStatusColor(currentRoomWorkStatus)"
                    variant="soft"
                  />
                </div>
              </div>

              <div class="mx-auto w-full max-w-xs shrink-0 lg:mx-0 lg:w-56 lg:max-w-none">
                <div class="relative flex flex-col items-center gap-2 overflow-hidden rounded-2xl border border-primary/40 bg-primary/5 p-4 text-center backdrop-blur-xl sm:p-5 shadow-[0_0_35px_-4px_color-mix(in_oklab,var(--ui-primary)_55%,transparent),inset_0_0_22px_-8px_color-mix(in_oklab,var(--ui-primary)_45%,transparent)]">
                  <p class="text-4xl font-bold text-primary sm:text-5xl drop-shadow-[0_0_12px_color-mix(in_oklab,var(--ui-primary)_75%,transparent)]">
                    {{ selectedQueueCode || '-' }}
                  </p>
                  <code class="rounded-lg border border-primary/40 bg-primary/10 px-3 py-1 font-mono text-base font-semibold text-primary shadow-[0_0_14px_-2px_color-mix(in_oklab,var(--ui-primary)_50%,transparent)]">
                    {{ roomAudioCode }}
                  </code>
                </div>
              </div>

              <div class="flex w-full flex-col gap-3 lg:w-72">
                <!-- Medical Notes (allergy & disease) -->
                <div v-if="patient" class="w-full rounded-lg bg-muted/30 p-3 text-left">
                  <div class="flex items-center justify-between gap-2">
                    <p class="text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Medical Notes
                    </p>
                    <UButton
                      v-if="canEditMedicalNotes"
                      color="primary"
                      variant="ghost"
                      size="xs"
                      icon="i-lucide-pencil"
                      @click="openMedicalNotesModal"
                    >
                      Edit
                    </UButton>
                  </div>
                  <div class="mt-2 space-y-2">
                    <div class="min-w-0">
                      <p class="text-[11px] text-muted">
                        Allergy Notes
                      </p>
                      <p class="whitespace-pre-wrap text-sm">
                        {{ patientMedicalNotes?.allergyNotes || '-' }}
                      </p>
                    </div>
                    <div class="min-w-0">
                      <p class="text-[11px] text-muted">
                        Disease Notes
                      </p>
                      <p class="whitespace-pre-wrap text-sm">
                        {{ patientMedicalNotes?.diseaseNotes || '-' }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Modal edit catatan medis -->
          <UModal
            v-model:open="medicalNotesModalOpen"
            title="Medical Notes"
            description="Update the patient's allergy & disease notes."
          >
            <template #body>
              <div class="space-y-4">
                <UFormField label="Allergy Notes">
                  <UTextarea
                    v-model="medicalNotesForm.allergyNotes"
                    :rows="3"
                    placeholder="Example: seafood, nuts"
                    class="w-full"
                  />
                </UFormField>
                <UFormField label="Disease Notes">
                  <UTextarea
                    v-model="medicalNotesForm.diseaseNotes"
                    :rows="3"
                    placeholder="Example: hypertension"
                    class="w-full"
                  />
                </UFormField>
              </div>
            </template>
            <template #footer>
              <div class="flex w-full justify-end gap-2">
                <UButton
                  color="neutral"
                  variant="outline"
                  @click="medicalNotesModalOpen = false"
                >
                  Cancel
                </UButton>
                <UButton
                  color="primary"
                  icon="i-lucide-save"
                  :loading="medicalNotesSaving"
                  :disabled="!medicalNotesDirty"
                  @click="saveMedicalNotes"
                >
                  Save
                </UButton>
              </div>
            </template>
          </UModal>

          <!-- Stage actions (sejajar dengan Meal status, tombol di kanan) -->
          <div class="mt-2 flex flex-wrap items-center gap-1.5 sm:gap-2">
            <MealStatusBadge v-if="activeExamId" :exam-id="activeExamId" />

            <div class="ml-auto flex w-full flex-wrap items-center gap-2 sm:w-auto">
              <div class="text-left sm:text-right">
                <span class="block text-[10px] font-medium text-muted">Room Status</span>
                <span
                  class="text-xs font-bold"
                  :class="allItemsFinal ? 'text-success' : 'text-warning'"
                >
                  {{ completedItemCount }}/{{ totalItemCount }} Items Completed
                </span>
              </div>
              <UButton
                v-if="activeStage?.status === 'WAITING' && canUseAssignShortcut"
                color="neutral"
                variant="soft"
                icon="i-lucide-user-round-plus"
                title="Assign Room"
                to="/rooms/assignments"
              >
                <span class="hidden sm:inline">Assign Room</span>
              </UButton>
              <UButton
                v-if="activeStage?.status === 'CALLED' || canAutoStartExam"
                color="warning"
                variant="soft"
                icon="i-lucide-play"
                title="Start Examination"
                :loading="stageActionLoading"
                @click="handleStartStage"
              >
                <span class="hidden sm:inline">Start Examination</span>
              </UButton>
              <UButton
                v-if="activeStage?.status === 'CALLED'"
                color="primary"
                variant="soft"
                :icon="recallCooldown > 0 ? 'i-lucide-timer' : 'i-lucide-volume-2'"
                title="Recall"
                :loading="stageActionLoading"
                :disabled="recallCooldown > 0"
                @click="handleRecallStage"
              >
                <span class="hidden sm:inline">{{ recallCooldown > 0 ? `Recall (${recallCooldown}s)` : 'Recall' }}</span>
              </UButton>
              <UButton
                v-if="activeStage?.status === 'CALLED'"
                color="neutral"
                variant="soft"
                icon="i-lucide-rotate-ccw"
                title="Return to Waiting"
                :loading="stageActionLoading"
                @click="handleReturnPatient"
              >
                <span class="hidden sm:inline">Return to Waiting</span>
              </UButton>
              <UButton
                v-if="activeStage?.status === 'IN_PROGRESS' && !hasStartedExamItems && !hasStartedSampleCollection"
                color="warning"
                variant="soft"
                icon="i-lucide-rotate-ccw"
                title="Back to Called"
                :loading="stageActionLoading"
                @click="handleCancelStartStage"
              >
                <span class="hidden sm:inline">Back to Called</span>
              </UButton>
              <UButton
                v-if="activeStage && ['CALLED', 'IN_PROGRESS'].includes(activeStage.status) && canFinishWork"
                color="success"
                icon="i-lucide-check-circle-2"
                title="Complete Room"
                :loading="stageActionLoading"
                @click="handleFinishStage"
              >
                <span class="hidden sm:inline">Complete Room</span>
              </UButton>
            </div>
          </div>

          <UAlert
            v-if="selectedItemIsMealPrereq"
            color="warning"
            variant="soft"
            icon="i-lucide-utensils"
            title="Prerequisite Meal"
            description="Once this exam is completed, the patient may proceed to meal time."
          />

          <UAlert
            v-if="!canFinishWork"
            color="warning"
            title="Room cannot be completed yet"
            description="Some examination items are not final yet. Complete the results or documentation, then finish each item."
          />

          <UCard v-if="isLabRoom && sampleCollectionCards.length" class="border border-default/80 shadow-sm">
            <template #header>
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-test-tubes" class="size-5 text-primary" />
                  <div>
                    <h3 class="text-sm font-bold text-highlighted">
                      Examination Samples
                    </h3>
                    <p class="text-xs text-muted">
                      Collect/receive per sample type. Multiple items can share the same sample.
                    </p>
                  </div>
                </div>
                <UBadge color="neutral" variant="subtle">
                  {{ sampleCollectionCards.length }} samples
                </UBadge>
              </div>
            </template>

            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div
                v-for="sample in sampleCollectionCards"
                :key="sample.id"
                class="flex flex-col overflow-hidden rounded-xl border border-default/80 bg-muted/20"
              >
                <div class="flex-1 p-3">
                  <div class="flex items-center justify-between gap-2">
                    <div class="flex min-w-0 items-center gap-2">
                      <UIcon name="i-lucide-test-tube" class="size-4 shrink-0 text-primary" />
                      <span class="truncate text-sm font-bold text-highlighted">{{ sample.sampleName }}</span>
                    </div>
                    <UBadge
                      :color="collectionStatusColor(sample.status)"
                      variant="subtle"
                      size="sm"
                    >
                      {{ collectionStatusLabel(sample.status) }}
                    </UBadge>
                  </div>

                  <div
                    v-if="sample.items.length"
                    class="mt-2 flex flex-wrap gap-1"
                    :title="sample.items.join(', ')"
                  >
                    <span
                      v-for="name in visibleSampleItems(sample)"
                      :key="name"
                      class="rounded bg-muted/60 px-1.5 py-0.5 text-[11px] text-muted"
                    >
                      {{ name }}
                    </span>
                    <button
                      v-if="sample.items.length > SAMPLE_ITEMS_VISIBLE"
                      type="button"
                      class="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary hover:bg-primary/20"
                      @click="toggleSampleItems(sample.id)"
                    >
                      {{ expandedSamples[sample.id] ? 'Show less' : `+${sample.items.length - SAMPLE_ITEMS_VISIBLE} more` }}
                    </button>
                  </div>
                  <p v-else class="mt-2 text-xs text-muted">
                    No related items
                  </p>
                </div>

                <div class="flex flex-wrap items-center gap-2 border-t border-default/80 bg-default/40 px-3 py-2.5">
                  <UButton
                    v-if="sample.canCollect"
                    color="info"
                    variant="soft"
                    size="sm"
                    icon="i-lucide-test-tube"
                    :loading="collectionActionLoading[sample.id]"
                    @click="handleCollectCollection(sample.id)"
                  >
                    Collect Sample
                  </UButton>
                  <UButton
                    v-else-if="sample.canReceive"
                    color="success"
                    variant="soft"
                    size="sm"
                    icon="i-lucide-package-check"
                    :loading="collectionActionLoading[sample.id]"
                    @click="handleReceiveCollection(sample.id)"
                  >
                    Receive Sample
                  </UButton>

                  <UButton
                    v-if="sample.canReject"
                    color="error"
                    variant="soft"
                    size="sm"
                    icon="i-lucide-ban"
                    @click="openRejectSampleModal(sample)"
                  >
                    Reject Sample
                  </UButton>

                  <span
                    v-if="!sample.canCollect && !sample.canReceive && !sample.canReject"
                    class="text-xs text-muted"
                  >
                    {{ sample.status === 'RECEIVED'
                      ? 'Completed'
                      : sample.status === 'REJECTED'
                        ? 'Sample rejected'
                        : sample.status === 'RESCHEDULED'
                          ? 'Rescheduled'
                          : 'Awaiting related stage' }}
                  </span>
                </div>
              </div>
            </div>
          </UCard>

          <!-- Custom doctor renderer: navigasi item menjadi tab di bawah detail pasien. -->
          <div v-if="isFullWidthWork && !isLabRoom" class="flex flex-wrap gap-2 border-b border-default pb-4">
            <UButton
              v-for="master in masterItems"
              :key="master.id"
              :variant="selectedItemId === master.id ? 'solid' : 'outline'"
              :color="selectedItemId === master.id ? 'primary' : 'neutral'"
              @click="selectItem(master.id)"
            >
              {{ master.index }}. {{ master.name }}
              <UBadge
                class="ml-2"
                :label="master.statusLabel"
                :color="master.statusColor"
                variant="subtle"
              />
            </UButton>
          </div>

          <UButton
            v-if="!isLabRoom && !isFullWidthWork"
            class="lg:hidden w-full"
            color="primary"
            variant="soft"
            icon="i-lucide-list-checks"
            @click="toggleDrawer()"
          >
            Select Item
          </UButton>

          <div v-if="!isLabRoom" class="grid grid-cols-12 items-start gap-5">
            <div
              v-if="!isFullWidthWork"
              class="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
              :class="isDrawerOpen ? 'block' : 'hidden'"
              @click="toggleDrawer()"
            />

            <aside
              v-if="!isFullWidthWork"
              class="fixed left-0 top-0 z-40 flex h-full w-80 flex-col gap-2 border-r border-default/80 bg-default p-4 transition-transform duration-300 ease-in-out lg:static lg:z-0 lg:h-auto lg:w-auto lg:translate-x-0 lg:border-none lg:bg-transparent lg:p-0 lg:col-span-4"
              :class="isDrawerOpen ? 'translate-x-0' : '-translate-x-full'"
            >
              <div class="flex items-center justify-between border-b border-default/80 pb-3 lg:hidden">
                <h3 class="text-sm font-bold text-highlighted">
                  Examination Item List
                </h3>
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  icon="i-lucide-x"
                  @click="toggleDrawer()"
                />
              </div>

              <div class="space-y-2 rounded-2xl border border-default/80 bg-default p-3 shadow-sm">
                <template v-for="group in masterGroups" :key="group.key">
                  <p v-if="group.sampleName" class="px-1 pt-1 text-[10px] font-bold uppercase tracking-wide text-muted">
                    Sample: {{ group.sampleName }} · {{ group.count }} item
                  </p>
                  <button
                    v-for="(master, i) in group.items"
                    :key="master.id"
                    type="button"
                    class="w-full rounded-xl border p-3.5 text-left transition-all"
                    :class="selectedItemId === master.id
                      ? 'border-primary/40 bg-primary/10'
                      : 'border-default/80 hover:bg-muted/30'"
                    @click="selectItem(master.id)"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <div class="space-y-1">
                        <span class="block text-[10px] font-bold uppercase text-muted">
                          Item #{{ i + 1 }} · {{ master.department }}
                        </span>
                        <h4 v-if="!group.sampleName" class="text-xs font-bold text-highlighted">
                          {{ master.name }}
                        </h4>
                        <span class="inline-flex items-center gap-1 text-[11px] font-semibold" :class="getStatusTextClass(master.statusColor)">
                          <span class="size-1.5 rounded-full" :class="getStatusDotClass(master.statusColor)" />
                          {{ master.statusLabel }}
                        </span>
                      </div>
                      <UIcon
                        name="i-lucide-chevron-right"
                        class="size-4 shrink-0"
                        :class="selectedItemId === master.id ? 'text-primary' : 'text-muted'"
                      />
                    </div>
                  </button>
                </template>
                <p v-if="masterItems.length === 0" class="px-1 py-3 text-sm text-muted">
                  No examination items.
                </p>
              </div>
            </aside>

            <div :class="['flex min-h-[480px] flex-col justify-between overflow-hidden rounded-2xl border border-default/80 bg-default shadow-sm', isFullWidthWork ? 'col-span-12' : 'col-span-12 lg:col-span-8']">
              <template v-if="selectedItem">
                <DentalExamWorkPanel
                  v-if="isDentalExamItem(selectedItem)"
                  class="border-0 shadow-none"
                  :item="selectedItem"
                  :can-start="activeStage?.status === 'IN_PROGRESS'"
                  :can-done="canDoneItem(selectedItem)"
                  :can-manage-actions="canManageItemActions && roomStageInProgress && selectedItem.status === 'IN_PROGRESS'"
                  :start-loading="Boolean(itemActionLoading[selectedItem.id])"
                  :done-loading="Boolean(itemActionLoading[selectedItem.id])"
                  :can-cancel="canCancelItem(selectedItem)"
                  :cancel-loading="cancelItemLoading && cancelItemTarget?.id === selectedItem.id"
                  @start="handleStartItem(selectedItem)"
                  @done="handleDoneItem(selectedItem)"
                  @cancel="openCancelItemModal(selectedItem)"
                  @refuse="openItemActionModal(selectedItem, 'refuse')"
                  @reschedule="openItemActionModal(selectedItem, 'reschedule')"
                  @retest="openItemActionModal(selectedItem, 'retest')"
                  @refreshed="loadPage(true)"
                  @back="router.push('/rooms/queue')"
                />

                <PhysicalExamWorkPanel
                  v-else-if="isPhysicalExamItem(selectedItem)"
                  class="border-0 shadow-none"
                  :item="selectedItem"
                  :can-start="isExamStageActive() && roomStageInProgress"
                  :can-done="canDoneItem(selectedItem)"
                  :can-manage-actions="canManageItemActions && roomStageInProgress && selectedItem.status === 'IN_PROGRESS'"
                  :start-loading="Boolean(itemActionLoading[selectedItem.id])"
                  :done-loading="Boolean(itemActionLoading[selectedItem.id])"
                  :legacy-results="getPhysicalLegacyRows(selectedItem)"
                  :can-cancel="canCancelItem(selectedItem)"
                  :cancel-loading="cancelItemLoading && cancelItemTarget?.id === selectedItem.id"
                  @start="handleStartItem(selectedItem)"
                  @done="handleDoneItem(selectedItem)"
                  @cancel="openCancelItemModal(selectedItem)"
                  @refuse="openItemActionModal(selectedItem, 'refuse')"
                  @reschedule="openItemActionModal(selectedItem, 'reschedule')"
                  @retest="openItemActionModal(selectedItem, 'retest')"
                  @refreshed="loadPage(true)"
                  @back="router.push('/rooms/queue')"
                />

                <DoctorTestWorkPanel
                  v-else-if="isDoctorTestExamItem(selectedItem)"
                  :item="selectedItem"
                  :can-start="isExamStageActive() && roomStageInProgress"
                  :can-done="canDoneItem(selectedItem)"
                  :can-manage-actions="canManageItemActions && roomStageInProgress && selectedItem.status === 'IN_PROGRESS'"
                  :start-loading="Boolean(itemActionLoading[selectedItem.id])"
                  :done-loading="Boolean(itemActionLoading[selectedItem.id])"
                  :can-cancel="canCancelItem(selectedItem)"
                  :cancel-loading="cancelItemLoading && cancelItemTarget?.id === selectedItem.id"
                  @start="handleStartItem(selectedItem)"
                  @done="handleDoneItem(selectedItem)"
                  @cancel="openCancelItemModal(selectedItem)"
                  @refuse="openItemActionModal(selectedItem, 'refuse')"
                  @reschedule="openItemActionModal(selectedItem, 'reschedule')"
                  @retest="openItemActionModal(selectedItem, 'retest')"
                  @refreshed="loadPage(true)"
                />

                <TreadmillScreeningWorkPanel
                  v-else-if="isTreadmillScreeningExamItem(selectedItem)"
                  :item="selectedItem"
                  :can-start="isExamStageActive() && roomStageInProgress"
                  :can-done="canDoneItem(selectedItem)"
                  :can-manage-actions="canManageItemActions && roomStageInProgress && selectedItem.status === 'IN_PROGRESS'"
                  :start-loading="Boolean(itemActionLoading[selectedItem.id])"
                  :done-loading="Boolean(itemActionLoading[selectedItem.id])"
                  :can-cancel="canCancelItem(selectedItem)"
                  :cancel-loading="cancelItemLoading && cancelItemTarget?.id === selectedItem.id"
                  @start="handleStartItem(selectedItem)"
                  @done="handleDoneItem(selectedItem)"
                  @cancel="openCancelItemModal(selectedItem)"
                  @refuse="openItemActionModal(selectedItem, 'refuse')"
                  @refreshed="loadPage(true)"
                />

                <template v-else>
                  <div class="flex items-center justify-between border-b border-default/80 bg-muted/30 px-5 py-3.5">
                    <div>
                      <span class="block text-[10px] font-bold uppercase text-muted">
                        Detail Form · Item #{{ selectedMaster?.index }}
                      </span>
                      <h3 class="text-sm font-bold text-highlighted">
                        {{ selectedMaster?.sampleTypeName ?? selectedItem.trxExamItem?.item?.name ?? '-' }}
                      </h3>
                      <p v-if="selectedSampleItems.length" class="mt-1 text-xs text-muted">
                        {{ selectedSampleItems.join(', ') }}
                      </p>
                    </div>
                    <UBadge
                      :label="selectedMaster?.statusLabel"
                      :color="selectedBadgeColor"
                      variant="subtle"
                    />
                  </div>

                  <div class="flex flex-wrap items-center justify-between gap-2.5 border-b border-default/80 bg-muted/30 px-5 py-3.5">
                    <div class="flex flex-wrap items-center gap-2">
                      <UButton
                        v-if="selectedItem.status === 'PENDING' && roomStageInProgress && !isSampleOnlyItem(selectedItem)"
                        color="warning"
                        variant="soft"
                        icon="i-lucide-play"
                        :loading="itemActionLoading[selectedItem.id]"
                        @click="handleStartItem(selectedItem)"
                      >
                        Start Item
                      </UButton>

                      <UButton
                        v-if="canCancelItem(selectedItem)"
                        color="error"
                        variant="soft"
                        icon="i-lucide-ban"
                        :loading="cancelItemLoading && cancelItemTarget?.id === selectedItem.id"
                        @click="openCancelItemModal(selectedItem)"
                      >
                        Cancel Item
                      </UButton>

                      <UButton
                        v-if="!isMultiMeasurementItem(selectedItem) && hasStructuredInputs(selectedItem) && selectedItem.status === 'IN_PROGRESS' && selectedItem.trxExamItem?.item?.resultTiming !== 'deferred' && !isExamResultSubmitted(selectedItem)"
                        color="primary"
                        variant="soft"
                        icon="i-lucide-save"
                        :loading="resultSaveLoading[selectedItem.id]"
                        @click="handleSaveResults(selectedItem)"
                      >
                        Save Draft
                      </UButton>

                      <UButton
                        v-if="(isMultiMeasurementItem(selectedItem) || hasStructuredInputs(selectedItem)) && selectedItem.status === 'IN_PROGRESS' && selectedItem.trxExamItem?.item?.resultTiming !== 'deferred' && !isExamResultSubmitted(selectedItem)"
                        color="primary"
                        variant="soft"
                        icon="i-lucide-send"
                        :loading="resultSaveLoading[selectedItem.id]"
                        @click="handleSubmitResults(selectedItem)"
                      >
                        Submit Results
                      </UButton>

                      <UButton
                        v-if="selectedItem.status === 'IN_PROGRESS' && !isSampleOnlyItem(selectedItem) && canDoneItem(selectedItem)"
                        color="success"
                        variant="soft"
                        icon="i-lucide-check"
                        :loading="itemActionLoading[selectedItem.id]"
                        @click="handleDoneItem(selectedItem)"
                      >
                        Complete Item
                      </UButton>
                    </div>

                    <div class="flex flex-wrap items-center gap-1.5">
                      <UButton
                        v-if="selectedItem.status === 'IN_PROGRESS' && roomStageInProgress && canManageItemActions && !['DONE', 'SKIPPED', 'RESCHEDULED', 'REFUSED', 'REJECTED', 'RETEXT'].includes(selectedItem.status) && !isSampleOnlyItem(selectedItem)"
                        color="error"
                        variant="soft"
                        size="sm"
                        icon="i-lucide-ban"
                        :loading="itemActionLoading[selectedItem.id]"
                        @click="openItemActionModal(selectedItem, 'refuse')"
                      >
                        Patient Refused
                      </UButton>

                      <UButton
                        v-if="selectedItem.status === 'IN_PROGRESS' && roomStageInProgress && canManageItemActions && !['DONE', 'SKIPPED', 'RESCHEDULED'].includes(selectedItem.status)"
                        color="warning"
                        variant="soft"
                        size="sm"
                        icon="i-lucide-calendar-clock"
                        :loading="itemActionLoading[selectedItem.id]"
                        @click="openItemActionModal(selectedItem, 'reschedule')"
                      >
                        Reschedule
                      </UButton>

                      <UButton
                        v-if="selectedItem.status === 'IN_PROGRESS' && roomStageInProgress && canManageItemActions && !['DONE', 'SKIPPED', 'RESCHEDULED'].includes(selectedItem.status)"
                        color="primary"
                        variant="soft"
                        size="sm"
                        icon="i-lucide-refresh-cw"
                        :loading="itemActionLoading[selectedItem.id]"
                        @click="openItemActionModal(selectedItem, 'retest')"
                      >
                        Retest
                      </UButton>
                    </div>
                  </div>

                  <div class="flex-1 space-y-4 p-5">
                    <UAlert
                      v-if="selectedItem.retestedAt && (selectedItem.retestReason || selectedItem.notes)"
                      icon="i-lucide-sticky-note"
                      color="info"
                      variant="soft"
                      title="Catatan Internal Nakes"
                    >
                      <template #description>
                        <div class="space-y-1">
                          <p v-if="selectedItem.retestReason">
                            <span class="font-semibold">Retest reason:</span> {{ selectedItem.retestReason }}
                          </p>
                          <p v-if="selectedItem.notes">
                            <span class="font-semibold">Notes:</span> {{ selectedItem.notes }}
                          </p>
                        </div>
                      </template>
                    </UAlert>

                    <UAlert
                      v-if="isSampleManagedItem(selectedItem) && !isExamStageActive()"
                      color="warning"
                      title="Not in the exam stage yet"
                      :description="`Current active stage is ${getStageDisplayName(activeStage)}. Lab items can only be filled after sample collection and reception are complete, then the active stage moves to EXAM.`"
                    />

                    <UAlert
                      v-else-if="getSampleCollectionStatus(selectedItem) && getSampleCollectionStatus(selectedItem) !== 'RECEIVED'"
                      :color="getOperationalStatusColor(selectedItem)"
                      :title="getOperationalStatusLabel(selectedItem)"
                      :description="selectedItem.blockedReason || getSampleActionDescription(selectedItem)"
                    />

                    <ClearanceQuestionnairePanel
                      v-if="hasClearanceQuestionnaire(selectedItem) && clearanceExamId(selectedItem)"
                      :exam-id="clearanceExamId(selectedItem)"
                      :exam-item-id="selectedItem.trxExamItem?.id ?? selectedItem.id"
                      :disabled="selectedItem.status !== 'IN_PROGRESS'"
                      @submitted="loadPage(true)"
                    />

                    <ErpExternalResultPanel
                      v-if="selectedItem.trxExamItem?.item?.externalResult && selectedItem.trxExamItem?.exam?.id"
                      :exam-id="selectedItem.trxExamItem.exam.id"
                      :exam-item-id="selectedItem.trxExamItem.id"
                      :assignment="selectedItem.trxExamItem.externalAssignment"
                      :requires-attachment-for-done="Boolean(selectedItem.trxExamItem.item.requiresAttachmentForDone)"
                      :disabled="selectedItem.status !== 'IN_PROGRESS'"
                      @updated="loadPage(true)"
                    />

                    <div v-if="isMultiMeasurementItem(selectedItem)" class="space-y-4">
                      <div class="rounded-xl border border-default/80 bg-default p-4">
                        <div class="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h4 class="text-sm font-semibold text-highlighted">
                              Blood Pressure Measurements
                            </h4>
                            <p class="mt-1 text-xs text-muted">
                              Simpan beberapa pengukuran, lalu pilih satu sebagai hasil final.
                            </p>
                          </div>
                          <UBadge v-if="selectedItem.status === 'DEFERRED'" color="warning" variant="soft">
                            Deferred
                          </UBadge>
                        </div>

                        <div v-if="selectedItem.status === 'IN_PROGRESS' && selectedItem.trxExamItem?.resultStatus !== 'SUBMITTED'" class="mt-4 grid items-start gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <UFormField
                            v-for="inputan in measurementInputans"
                            :key="inputan.id"
                            :label="`${inputan.label}${inputan.uom ? ` (${inputan.uom})` : ''}`"
                          >
                            <template #label>
                              <span class="flex w-full items-center justify-between gap-2">
                                <span>{{ inputan.label }}<span v-if="inputan.uom" class="text-xs text-muted"> ({{ inputan.uom }})</span></span>
                                <UBadge
                                  v-if="getMeasurementEvaluation(inputan)"
                                  :color="getEvaluationBadgeColor(getMeasurementEvaluation(inputan)?.status)"
                                  variant="soft"
                                  size="sm"
                                  :label="getEvaluationShortLabel(getMeasurementEvaluation(inputan)?.status)"
                                />
                              </span>
                            </template>
                            <div
                              v-if="getMeasurementNormalRangeLines(inputan).length"
                              class="mb-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success"
                            >
                              <p
                                v-for="(line, index) in getMeasurementNormalRangeLines(inputan)"
                                :key="index"
                              >
                                {{ line }}
                              </p>
                            </div>
                            <UInput
                              v-model="measurementDraft[inputan.id]"
                              type="number"
                              :placeholder="`Enter ${inputan.label}`"
                              :class="getMeasurementInputClass(inputan)"
                            />
                          </UFormField>
                          <UFormField label="Note" class="md:col-span-2">
                            <UInput v-model="measurementNote" placeholder="Optional note" class="w-full" />
                          </UFormField>
                          <div class="flex flex-wrap items-end gap-2 md:col-span-2">
                            <UButton
                              color="primary"
                              icon="i-lucide-plus"
                              :loading="measurementSaving"
                              @click="addMeasurement"
                            >
                              Add Measurement
                            </UButton>
                            <UButton
                              v-if="selectedItem.trxExamItem?.item?.allowDeferMeasurement"
                              color="warning"
                              variant="soft"
                              icon="i-lucide-clock"
                              :loading="measurementSaving"
                              :disabled="measurements.length === 0"
                              @click="deferMeasurement"
                            >
                              Measure Later
                            </UButton>
                          </div>
                        </div>

                        <div v-if="measurementLoading" class="mt-4 text-sm text-muted">
                          Loading measurements...
                        </div>
                        <div v-else-if="!measurements.length" class="mt-4 rounded-lg border border-dashed border-default p-4 text-sm text-muted">
                          Belum ada pengukuran tersimpan.
                        </div>
                        <div v-else class="mt-4 overflow-x-auto">
                          <table class="w-full text-sm">
                            <thead>
                              <tr class="border-b border-default text-left text-xs uppercase tracking-wide text-muted">
                                <th class="py-2 pr-3">
                                  Time
                                </th>
                                <th v-for="inputan in measurementInputans" :key="inputan.id" class="py-2 pr-3">
                                  <div>{{ inputan.label }}</div>
                                  <div
                                    v-for="(line, index) in getMeasurementNormalRangeLines(inputan)"
                                    :key="index"
                                    class="mt-0.5 text-[10px] font-normal normal-case tracking-normal text-success"
                                  >
                                    {{ line }}
                                  </div>
                                </th>
                                <th class="py-2 pr-3">
                                  Note
                                </th>
                                <th class="py-2 text-right">
                                  Action
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr
                                v-for="measurement in measurements"
                                :key="measurement.id"
                                class="border-b border-default/60 last:border-0"
                                :class="measurement.isSelected ? 'bg-success/5' : ''"
                              >
                                <td class="py-2 pr-3 whitespace-nowrap">
                                  {{ formatDate(measurement.measuredAt) }}
                                  <div v-if="measurement.measuredByName" class="text-xs text-muted">
                                    {{ measurement.measuredByName }}
                                  </div>
                                </td>
                                <td v-for="inputan in measurementInputans" :key="inputan.id" class="py-2 pr-3 font-medium">
                                  <div class="flex flex-wrap items-center gap-1">
                                    <span :class="getMeasurementValueClass(inputan, measurement)">
                                      {{ getMeasurementValue(inputan, measurement) ?? '-' }}
                                    </span>
                                    <span v-if="inputan.uom" class="text-xs font-normal text-muted">{{ inputan.uom }}</span>
                                    <UBadge
                                      v-if="getMeasurementValueEvaluation(inputan, measurement)"
                                      :color="getEvaluationBadgeColor(getMeasurementValueEvaluation(inputan, measurement)?.status)"
                                      variant="soft"
                                      size="sm"
                                      :label="getEvaluationShortLabel(getMeasurementValueEvaluation(inputan, measurement)?.status)"
                                    />
                                  </div>
                                </td>
                                <td class="py-2 pr-3 text-muted">
                                  {{ measurement.note || '-' }}
                                </td>
                                <td class="py-2 text-right">
                                  <UBadge v-if="measurement.isSelected" color="success" variant="soft">
                                    Selected
                                  </UBadge>
                                  <UButton
                                    v-else
                                    size="xs"
                                    color="primary"
                                    variant="soft"
                                    :disabled="measurementSaving || selectedItem.status !== 'IN_PROGRESS' || selectedItem.trxExamItem?.resultStatus === 'SUBMITTED'"
                                    @click="selectMeasurement(measurement)"
                                  >
                                    Use This
                                  </UButton>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    <div
                      v-else-if="canRenderExamInputs(selectedItem) && !isPhysicalExamItem(selectedItem)"
                      class="space-y-3"
                    >
                      <div class="flex items-center justify-between gap-3 px-0.5">
                        <p class="text-xs font-medium text-muted">
                          {{ visibleItemInputans(selectedItem).length }} inputs
                        </p>
                        <UTabs
                          v-model="inputColumnsCount"
                          :items="[
                            { label: '1 Column', value: 1 },
                            { label: '2 Columns', value: 2 }
                          ]"
                          size="xs"
                        />
                      </div>

                      <div
                        :class="inputColumnsCount === 2
                          ? 'grid grid-cols-1 gap-3 sm:grid-cols-2'
                          : 'space-y-3'"
                      >
                        <div
                          v-for="inputan in visibleItemInputans(selectedItem)"
                          :key="inputan.id"
                          :class="getInputContainerClass(selectedItem.id, inputan)"
                        >
                          <div class="mb-2 flex items-start justify-between gap-3">
                            <label class="block text-sm font-medium text-highlighted">
                              {{ inputan.label }}
                              <span v-if="inputan.uom" class="text-xs text-muted">({{ inputan.uom }})</span>
                            </label>

                            <UBadge
                              v-if="getInputEvaluation(selectedItem.id, inputan)"
                              :color="getEvaluationBadgeColor(getInputEvaluation(selectedItem.id, inputan)?.status)"
                              variant="soft"
                              :label="getInputEvaluation(selectedItem.id, inputan)?.label"
                            />
                          </div>

                          <div
                            v-if="inputan.inputType === 'number' && getNumericNormalRanges(inputan).length > 0"
                            class="mb-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success"
                          >
                            <p
                              v-for="range in getNumericNormalRanges(inputan)"
                              :key="range.id"
                            >
                              {{ formatNumericNormalRange(inputan, range) }}
                            </p>
                          </div>

                          <div
                            v-else-if="inputan.inputType === 'selected' && getSelectedNormalRanges(inputan).length > 0"
                            class="mb-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary"
                          >
                            <p class="font-medium">
                              Normal value
                            </p>
                            <p
                              v-for="range in getSelectedNormalRanges(inputan)"
                              :key="range.id"
                            >
                              {{ formatSelectedNormalRange(range) }}
                            </p>
                          </div>

                          <input
                            v-if="inputan.inputType === 'number'"
                            v-model="getInputDraft(selectedItem.id, inputan.id).valueNumber"
                            type="number"
                            :class="getInputValueClass(selectedItem.id, inputan)"
                            :placeholder="`Enter ${inputan.label}`"
                          >

                          <input
                            v-else-if="inputan.inputType === 'string'"
                            v-model="getInputDraft(selectedItem.id, inputan.id).valueString"
                            type="text"
                            class="w-full rounded-lg border border-default bg-default px-3 py-2 text-sm"
                            :placeholder="`Enter ${inputan.label}`"
                          >

                          <select
                            v-else-if="inputan.inputType === 'selected'"
                            v-model="getInputDraft(selectedItem.id, inputan.id).valueSelected"
                            class="w-full rounded-lg border border-default bg-default px-3 py-2 text-sm"
                          >
                            <option value="">
                              Select result
                            </option>
                            <option
                              v-for="opsi in inputan.opsis || []"
                              :key="opsi.id"
                              :value="opsi.value"
                            >
                              {{ opsi.label }}
                            </option>
                          </select>

                          <div
                            v-if="inputan.inputType === 'selected' && selectedOptionRequiresDetail(inputan, getInputDraft(selectedItem.id, inputan.id).valueSelected ?? '')"
                            class="mt-2"
                          >
                            <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
                              Detail {{ inputan.label }}
                            </label>
                            <input
                              v-model="getInputDraft(selectedItem.id, inputan.id).valueString"
                              type="text"
                              class="w-full rounded-lg border border-info/50 bg-info/5 px-3 py-2 text-sm outline-none transition focus:border-info focus:ring-2 focus:ring-info/15"
                              :placeholder="`Enter detail for ${inputan.label}`"
                            >
                          </div>

                          <div v-else>
                            <input
                              v-model="getInputDraft(selectedItem.id, inputan.id).valueCalculated"
                              type="number"
                              disabled
                              class="w-full rounded-lg border border-default bg-muted/40 px-3 py-2 text-sm text-muted"
                              placeholder="Calculated automatically"
                            >
                            <p v-if="inputan.formula?.formula" class="mt-1 truncate text-[11px] text-muted">
                              {{ inputan.formula.formula }}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div v-if="canRenderItemNotes(selectedItem)">
                      <label class="mb-2 block text-sm font-medium text-highlighted">
                        Examination result documentation
                      </label>
                      <textarea
                        v-model="itemNotes[selectedItem.id]"
                        rows="4"
                        class="w-full rounded-xl border border-default bg-default px-3 py-2 text-sm"
                        placeholder="Write documentation or conclusions for this item's examination results..."
                      />
                    </div>

                    <div
                      v-if="shouldShowResultDocument(selectedItem)"
                      class="rounded-xl border border-default bg-muted/20 p-4"
                    >
                      <div class="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p class="text-sm font-semibold text-highlighted">
                            Result document
                          </p>
                          <p class="text-xs text-muted">
                            {{ selectedItem.trxExamItem?.templateSnapshotAt ? formatDate(selectedItem.trxExamItem.templateSnapshotAt) : 'Result draft saved' }}
                          </p>
                        </div>
                        <UBadge :color="selectedItem.trxExamItem?.resultStatus === 'SUBMITTED' ? 'warning' : 'success'" variant="soft" :label="selectedItem.trxExamItem?.resultStatus === 'SUBMITTED' ? 'Waiting Approval' : 'Submitted'" />
                      </div>

                      <p v-if="getSubmittedResultRows(selectedItem).length === 0" class="rounded-lg border border-dashed border-default bg-default px-3 py-2 text-sm text-muted">
                        Results are not loaded in the response. Refresh the data or reopen this room.
                      </p>

                      <div v-else class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div
                          v-for="row in getSubmittedResultRows(selectedItem)"
                          :key="row.id"
                          class="rounded-lg border border-default bg-default px-3 py-2"
                        >
                          <p class="text-xs text-muted">
                            {{ row.label }}
                          </p>
                          <p
                            class="text-sm font-semibold"
                            :class="row.flag === 'abnormal' ? 'text-error' : 'text-highlighted'"
                          >
                            {{ row.value }}<span v-if="row.uom" class="ml-1 text-xs font-normal text-muted">{{ row.uom }}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    <UAlert
                      v-if="selectedItem.status === 'IN_PROGRESS' && selectedItem.trxExamItem?.item?.externalResult && getExternalDoneBlockReason(selectedItem)"
                      color="warning"
                      variant="soft"
                      title="Item cannot be completed yet"
                      :description="getExternalDoneBlockReason(selectedItem) || undefined"
                    />

                    <HistoryTimeline
                      :loading="auditLoading"
                      :entries="auditEntries"
                      :queue-code="selectedQueueCode"
                      :split-by-scope="true"
                      :current-department-id="auditCtxDeptId"
                      :current-exam-item-id="auditCtxItemId"
                    />
                  </div>
                </template>
              </template>

              <div v-else class="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted">
                No examination items for this room yet.
              </div>
            </div>
          </div>

          <div
            v-if="isLabRoom"
            class="grid grid-cols-1 gap-4 lg:grid-cols-[300px_minmax(0,1fr)]"
          >
            <aside class="flex max-h-[720px] flex-col rounded-2xl border border-default/80 bg-default p-3 shadow-sm">
              <p class="px-1 pb-2 text-[10px] font-bold uppercase tracking-wide text-muted">
                Sample List
              </p>
              <UInput
                v-model="labSampleSearch"
                icon="i-lucide-search"
                placeholder="Cari nama sample..."
                size="sm"
                class="mb-3"
              />
              <div class="flex flex-col gap-2 overflow-y-auto">
                <button
                  v-for="sample in filteredLabSamples"
                  :key="sample.id"
                  type="button"
                  class="w-full rounded-xl border p-3 text-left transition"
                  :class="selectedSampleId === sample.id
                    ? 'border-primary/40 bg-primary/10'
                    : 'border-default/80 hover:bg-muted/30'"
                  @click="selectedSampleId = sample.id"
                >
                  <p class="text-[10px] font-bold uppercase text-muted">
                    LABORATORIUM
                  </p>
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-sm font-bold text-highlighted">{{ sample.name }}</span>
                    <UIcon name="i-lucide-chevron-right" class="size-4 text-muted" />
                  </div>
                  <span
                    class="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold"
                    :class="getStatusTextClass(collectionStatusColor(sample.status))"
                  >
                    <span class="size-1.5 rounded-full" :class="getStatusDotClass(collectionStatusColor(sample.status))" />
                    {{ collectionStatusLabel(sample.status) }}
                  </span>
                  <p class="mt-1 text-[11px] text-muted">
                    {{ sample.itemIds.length }} item pemeriksaan
                  </p>
                </button>
                <p v-if="!filteredLabSamples.length" class="px-1 py-3 text-sm text-muted">
                  Sample tidak ditemukan.
                </p>
              </div>
            </aside>

            <div class="min-w-0 space-y-4">
              <template v-if="selectedLabSample">
                <div class="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-default/80 bg-muted/20 px-5 py-4">
                  <div class="min-w-0">
                    <p class="text-[10px] font-bold uppercase tracking-wide text-muted">
                      Detail Sample #{{ selectedLabSample.index }}
                    </p>
                    <h1 class="mt-1 text-xl font-semibold text-highlighted">
                      Sample {{ selectedLabSample.name }}
                    </h1>
                    <p class="mt-1 text-xs text-muted">
                      {{ labSampleItems.map(item => item.trxExamItem?.item?.name).filter(Boolean).join(', ') || '-' }}
                    </p>
                  </div>
                  <UBadge :color="collectionStatusColor(selectedLabSample.status)" variant="subtle">
                    {{ collectionStatusLabel(selectedLabSample.status) }}
                  </UBadge>
                </div>

                <UAlert
                  v-if="activeStage && !isExamStageActive() && labSampleItems.length"
                  color="warning"
                  variant="soft"
                  title="Not in the exam stage yet"
                  :description="`Current active stage is ${getStageDisplayName(activeStage)}. Lab items can only be filled after sample collection and reception are complete, then the active stage moves to EXAM.`"
                />

                <UCard class="border border-default/80 shadow-sm">
                  <template #header>
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h2 class="text-base font-semibold text-highlighted">
                          List Item Pemeriksaan
                        </h2>
                        <p class="text-xs text-muted">
                          Seluruh item pemeriksaan yang menggunakan sample terpilih.
                        </p>
                      </div>
                      <UBadge color="neutral" variant="subtle">
                        {{ filteredLabItems.length }} items
                      </UBadge>
                    </div>
                  </template>

                  <div class="mb-3 flex flex-wrap items-center gap-2">
                    <UInput
                      v-model="labItemSearch"
                      icon="i-lucide-search"
                      placeholder="Cari item, kode, atau parameter..."
                      size="sm"
                      class="min-w-0 flex-1"
                    />
                    <USelect
                      v-model="labItemStatusFilter"
                      :items="labItemStatusOptions.map(value => ({ label: value === 'all' ? 'All statuses' : value, value }))"
                      size="sm"
                      class="w-48"
                    />
                    <UButton
                      size="sm"
                      color="neutral"
                      variant="soft"
                      @click="expandAllLabItems = !expandAllLabItems"
                    >
                      {{ expandAllLabItems ? 'Collapse all' : 'Expand all' }}
                    </UButton>
                  </div>

                  <div v-if="filteredLabItems.length" class="space-y-2">
                    <article
                      v-for="item in filteredLabItems"
                      :key="item.id"
                      class="overflow-hidden rounded-xl border border-default/80 bg-default"
                    >
                      <button
                        type="button"
                        class="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-muted/30"
                        @click="toggleLabItem(item.id)"
                      >
                        <div class="min-w-0">
                          <p class="truncate text-sm font-semibold text-highlighted">
                            {{ item.trxExamItem?.item?.name || '-' }}
                          </p>
                          <p class="text-[11px] text-muted">
                            Code: {{ item.trxExamItem?.item?.code || '-' }}
                          </p>
                        </div>
                        <div class="flex items-center gap-2">
                          <span
                            class="inline-flex items-center gap-1 text-[11px] font-semibold"
                            :class="getStatusTextClass(getOperationalStatusColor(item))"
                          >
                            <span class="size-1.5 rounded-full" :class="getStatusDotClass(getOperationalStatusColor(item))" />
                            {{ getOperationalStatusLabel(item) }}
                          </span>
                          <UIcon
                            name="i-lucide-chevron-right"
                            class="size-4 text-muted transition"
                            :class="isLabItemExpanded(item.id) ? 'rotate-90' : ''"
                          />
                        </div>
                      </button>
                      <div
                        v-if="isLabItemExpanded(item.id)"
                        class="border-t border-default/80 bg-muted/10 px-3 py-3"
                      >
                        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <div>
                            <p class="text-[11px] text-muted">
                              Nama pemeriksaan
                            </p>
                            <p class="text-sm font-semibold text-highlighted">
                              {{ item.trxExamItem?.item?.name || '-' }}
                            </p>
                          </div>
                          <div>
                            <p class="text-[11px] text-muted">
                              Kode item
                            </p>
                            <p class="text-sm font-semibold text-highlighted">
                              {{ item.trxExamItem?.item?.code || '-' }}
                            </p>
                          </div>
                          <div>
                            <p class="text-[11px] text-muted">
                              Status
                            </p>
                            <p class="text-sm font-semibold text-highlighted">
                              {{ getOperationalStatusLabel(item) }}
                            </p>
                          </div>
                        </div>
                      </div>
                    </article>
                  </div>
                  <p v-else class="rounded-lg border border-dashed border-default px-3 py-6 text-center text-sm text-muted">
                    Tidak ada item yang sesuai filter.
                  </p>
                </UCard>

                <HistoryTimeline
                  :loading="auditLoading"
                  :entries="auditEntries"
                  :queue-code="selectedQueueCode"
                  :split-by-scope="false"
                />
              </template>

              <div v-else class="flex min-h-[480px] items-center justify-center rounded-2xl border border-dashed border-default bg-muted/20 p-8 text-center text-sm text-muted">
                Pilih sample untuk melihat item pemeriksaan.
              </div>
            </div>
          </div>
        </template>
      </div>
    </template>
  </UDashboardPanel>

  <UModal
    v-model:open="isItemActionModalOpen"
    :title="selectedItemActionType === 'skip' ? 'Skip Item' : selectedItemActionType === 'refuse' ? 'Patient Refused Item' : selectedItemActionType === 'retest' ? 'Retest Item' : 'Reschedule Item'"
  >
    <template #body>
      <div class="space-y-4">
        <UAlert
          :color="(selectedItemActionType === 'skip' || selectedItemActionType === 'refuse') ? 'error' : selectedItemActionType === 'retest' ? 'info' : 'warning'"
          :title="selectedItemAction?.trxExamItem?.item?.name || 'Examination item'"
          :description="selectedItemActionType === 'skip'
            ? 'This item will be marked as skipped (cancelled by admin/staff).'
            : selectedItemActionType === 'refuse'
              ? 'This item will be marked as refused by the patient.'
              : selectedItemActionType === 'retest'
                ? 'This item will be marked for re-examination (retest).'
                : 'This item will be rescheduled for the next visit.'"
        />

        <UFormField
          v-if="selectedItemActionType === 'skip' || selectedItemActionType === 'refuse'"
          :label="selectedItemActionType === 'refuse' ? 'Refusal reason' : 'Skip reason'"
          required
        >
          <UTextarea
            v-model="itemActionReason"
            :rows="3"
            class="w-full"
            :placeholder="selectedItemActionType === 'refuse'
              ? 'Example: patient does not want to be examined, other conditions...'
              : 'Example: sample unavailable, other conditions...'"
          />
        </UFormField>

        <UFormField
          v-else-if="selectedItemActionType === 'retest'"
          label="Retest reason"
          required
        >
          <UTextarea
            v-model="itemActionReason"
            :rows="3"
            class="w-full"
            placeholder="Example: invalid result, equipment issue, other conditions..."
          />
        </UFormField>

        <UFormField
          :label="selectedItemActionType === 'reschedule' ? 'Reschedule note' : 'Notes (optional)'"
          :required="selectedItemActionType === 'reschedule'"
        >
          <UTextarea
            v-model="itemActionNote"
            :rows="3"
            class="w-full"
            placeholder="Optional additional notes"
          />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          color="neutral"
          variant="soft"
          :disabled="itemActionSubmitLoading"
          @click="closeItemActionModal"
        >
          Cancel
        </UButton>
        <UButton
          :color="selectedItemActionType === 'skip' || selectedItemActionType === 'refuse' ? 'error' : selectedItemActionType === 'retest' ? 'primary' : 'warning'"
          :loading="itemActionSubmitLoading"
          :disabled="((selectedItemActionType === 'skip' || selectedItemActionType === 'refuse') && !itemActionReason.trim()) || (selectedItemActionType === 'reschedule' && !itemActionNote.trim()) || (selectedItemActionType === 'retest' && !itemActionReason.trim())"
          @click="handleSubmitItemAction"
        >
          {{ selectedItemActionType === 'skip' ? 'Skip Item' : selectedItemActionType === 'refuse' ? 'Refuse Item' : selectedItemActionType === 'retest' ? 'Retest Item' : 'Reschedule Item' }}
        </UButton>
      </div>
    </template>
  </UModal>

  <UModal
    v-model:open="isCancelItemModalOpen"
    title="Cancel Item"
  >
    <template #body>
      <div class="space-y-4">
        <UAlert
          color="warning"
          :title="cancelItemTarget?.trxExamItem?.item?.name || 'Examination item'"
          description="This item will be saved as Cancelled and will not be examined. The item is not deleted and remains in the patient's examination history."
        />

        <UFormField label="Cancel reason (optional)">
          <UTextarea
            v-model="cancelItemReason"
            :rows="3"
            class="w-full"
            placeholder="Example: patient declined the examination, item no longer needed..."
          />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          color="neutral"
          variant="soft"
          :disabled="cancelItemLoading"
          @click="isCancelItemModalOpen = false"
        >
          Keep Item
        </UButton>
        <UButton
          color="error"
          :loading="cancelItemLoading"
          @click="handleCancelItem"
        >
          Cancel Item
        </UButton>
      </div>
    </template>
  </UModal>

  <UModal
    v-model:open="isRejectSampleModalOpen"
    title="Reject Sample"
  >
    <template #body>
      <div class="space-y-4">
        <UAlert
          color="error"
          variant="soft"
          icon="i-lucide-ban"
          :title="rejectSampleTarget?.sampleName || 'Sample'"
          description="This sample will be rejected. Examination items using this sample cannot be processed until the sample is re-collected."
        />

        <UFormField label="Rejection reason" required>
          <UTextarea
            v-model="rejectSampleReason"
            :rows="3"
            placeholder="Example: patient refused, hemolyzed sample, insufficient volume..."
            class="w-full"
          />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          color="neutral"
          variant="soft"
          :disabled="rejectSampleSubmitting"
          @click="closeRejectSampleModal"
        >
          Cancel
        </UButton>
        <UButton
          color="error"
          icon="i-lucide-ban"
          :loading="rejectSampleSubmitting"
          :disabled="!rejectSampleReason.trim()"
          @click="submitRejectSample"
        >
          Reject Sample
        </UButton>
      </div>
    </template>
  </UModal>

  <UModal
    v-model:open="isExitRoomModalOpen"
    title="Exit Room"
  >
    <template #body>
      <div class="space-y-4">
        <UAlert
          color="warning"
          title="Exit the active room session?"
          :description="`Current active session: ${roomSessionLabel}. After exiting, you will be directed to the room assignment page.`"
        />
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          color="neutral"
          variant="soft"
          :disabled="roomSessionActionLoading"
          @click="isExitRoomModalOpen = false"
        >
          Cancel
        </UButton>
        <UButton
          color="warning"
          :loading="roomSessionActionLoading"
          @click="handleExitRoom"
        >
          Exit Room
        </UButton>
      </div>
    </template>
  </UModal>

  <UModal
    v-model:open="isEnterRoomModalOpen"
    title="Enter Room"
  >
    <template #body>
      <div class="space-y-4">
        <UAlert
          color="info"
          title="Enter the room assignment?"
          :description="`Current room assignment: ${roomAssignment?.room?.code ? `${roomAssignment.room.code} - ` : ''}${roomAssignment?.room?.name || roomAssignment?.roomType?.name || '-'}.`"
        />
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          color="neutral"
          variant="soft"
          :disabled="roomEnterActionLoading"
          @click="isEnterRoomModalOpen = false"
        >
          Cancel
        </UButton>
        <UButton
          color="primary"
          :loading="roomEnterActionLoading"
          @click="handleEnterRoom"
        >
          Enter Room
        </UButton>
      </div>
    </template>
  </UModal>

  <UModal v-model:open="photoViewerOpen" title="Patient Photo" :ui="{ content: 'sm:max-w-2xl' }">
    <template #body>
      <div class="flex items-center justify-center">
        <img
          v-if="patientPhotoUrl"
          :src="patientPhotoUrl"
          alt="Patient photo"
          class="max-h-[70vh] w-auto rounded-xl border border-default"
        >
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end">
        <UButton color="primary" label="Close" @click="photoViewerOpen = false" />
      </div>
    </template>
  </UModal>
</template>
