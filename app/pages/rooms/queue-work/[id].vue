<script setup lang="ts">
import DentalExamWorkPanel from '~/components/rooms/DentalExamWorkPanel.vue'
import PhysicalExamWorkPanel from '~/components/rooms/PhysicalExamWorkPanel.vue'
import DoctorTestWorkPanel from '~/components/rooms/DoctorTestWorkPanel.vue'
import TreadmillScreeningWorkPanel from '~/components/rooms/TreadmillScreeningWorkPanel.vue'
import { resolveRenderer } from '~/constants/exam-renderers'
import HistoryTimeline from '~/pages/result/exam-results/components/HistoryTimeline.vue'
import { useAudit } from '~/composables/useAudit'

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
  notes?: string | null
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
      mealPrerequisite?: boolean
      rendererKey?: string | null
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
const itemNotes = reactive<Record<string, string>>({})
const { loading: auditLoading, entries: auditEntries, resetAudit } = useAudit()
const isItemActionModalOpen = ref(false)
const selectedItemAction = ref<RoomExamItem | null>(null)
const selectedItemActionType = ref<'skip' | 'reschedule' | 'retest' | 'refuse' | null>(null)
const itemActionReason = ref('')
const itemActionNote = ref('')
const itemActionSubmitLoading = ref(false)
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
  if (status === 'SKIPPED' || status === 'RESCHEDULED') return 'neutral'
  if (status === 'REFUSED') return 'error'
  if (status === 'RETEXT') return 'warning'
  return 'neutral'
}

function getStatusLabel(status: string) {
  if (status === 'DONE') return 'Completed'
  if (status === 'IN_PROGRESS') return 'In progress'
  if (status === 'CALLED') return 'Called'
  if (status === 'SKIPPED') return 'Skipped'
  if (status === 'RESCHEDULED') return 'Rescheduled'
  if (status === 'REFUSED') return 'Patient refused'
  if (status === 'RETEXT') return 'Retest needed'
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
function getInputValueClass(itemId: string, inputan: ExamInput) {
  const base = 'w-full rounded-lg border bg-default px-3 py-2 text-sm outline-none transition focus:ring-2'
  const evaluation = getInputEvaluation(itemId, inputan)

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
    medicalNotesForm.allergyNotes = patientDetail.value?.allergyNotes ?? ''
    medicalNotesForm.diseaseNotes = patientDetail.value?.diseaseNotes ?? ''
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status
    patientDetailError.value = status === 403
      ? ''
      : 'Patient details could not be loaded. Basic information from the queue is still shown.'
  } finally {
    patientDetailLoading.value = false
  }
}
const medicalNotesForm = reactive({ allergyNotes: '', diseaseNotes: '' })
const medicalNotesSaving = ref(false)
const medicalNotesModalOpen = ref(false)
const medicalNotesDirty = computed(() =>
  medicalNotesForm.allergyNotes !== (patientDetail.value?.allergyNotes ?? '')
  || medicalNotesForm.diseaseNotes !== (patientDetail.value?.diseaseNotes ?? '')
)
const canEditMedicalNotes = computed(() =>
  permissions.value.includes('patient:update') || permissions.value.includes('queue:update')
)

function openMedicalNotesModal() {
  medicalNotesForm.allergyNotes = patientDetail.value?.allergyNotes ?? ''
  medicalNotesForm.diseaseNotes = patientDetail.value?.diseaseNotes ?? ''
  medicalNotesModalOpen.value = true
}

async function saveMedicalNotes() {
  const patientId = patient.value?.id
  if (patientId == null || medicalNotesSaving.value) return

  medicalNotesSaving.value = true
  try {
    await api.patch(`/patient/${patientId}/medical-notes`, {
      allergyNotes: medicalNotesForm.allergyNotes,
      diseaseNotes: medicalNotesForm.diseaseNotes
    })
    toast.add({
      title: 'Success',
      description: 'Patient medical notes saved',
      color: 'success'
    })
    medicalNotesModalOpen.value = false
    await loadPatientDetail(patientId)
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
  if (stages.every(stage => ['DONE', 'SKIPPED'].includes(stage.status))) return 'DONE'

  return stages.find(stage => ['IN_PROGRESS', 'CALLED', 'WAITING'].includes(stage.status))?.status
    ?? roomQueueDetail.value?.status
    ?? 'WAITING'
})
const allItemsFinal = computed(() =>
  roomExamItems.value.every(item => ['DONE', 'SKIPPED', 'RESCHEDULED', 'REFUSED'].includes(item.status))
)
const sampleCollections = computed(() => roomQueueDetail.value?.queueEntry?.sampleCollections ?? [])

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
    // Sample PENDING/REJECTED utk item yang pasien tolak (REFUSED) dianggap final.
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
    statusLabel: getOperationalStatusLabel(item),
    statusColor: getOperationalStatusColor(item)
  }))
})

const selectedItem = computed(() =>
  masterItems.value.some(m => m.id === selectedItemId.value)
    ? roomExamItems.value.find(item => item.id === selectedItemId.value) ?? null
    : null
)

const selectedMaster = computed(() =>
  masterItems.value.find(m => m.id === selectedItemId.value) ?? null
)

// Item yang sedang dikerjakan termasuk Prerequisite Meal.
const selectedItemIsMealPrereq = computed(() =>
  Boolean(selectedItem.value?.trxExamItem?.item?.mealPrerequisite)
)

const selectedQueueCode = computed(() => roomQueueDetail.value?.queueEntry?.queueCode ?? '')

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
    auditEntries.value = [...roomLogs, ...externalLogs, ...examLogs].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
  } finally {
    auditLoading.value = false
  }
}

const selectedBadgeColor = computed(() => {
  if (!selectedItem.value) return 'neutral'
  return getOperationalStatusColor(selectedItem.value)
})

const completedItemCount = computed(() =>
  roomExamItems.value.filter(item => item.status === 'DONE').length
)
const totalItemCount = computed(() => roomExamItems.value.length)

watch(selectedItemId, () => {
  void fetchSelectedItemHistory()
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

  if (item.operationalStatus === 'WAITING_SAMPLE') return 'Waiting for sample to be received'
  if (item.operationalStatus === 'BLOCKED_SAMPLE_REJECTED' || sampleStatus === 'REJECTED') return 'Sample rejected'
  if (item.operationalStatus === 'RESCHEDULED' || sampleStatus === 'RESCHEDULED') return 'Sample rescheduled'
  return getStatusLabel(item.status)
}

function getOperationalStatusColor(item: RoomExamItem): BadgeColor {
  const sampleStatus = getSampleCollectionStatus(item)

  if (item.operationalStatus === 'WAITING_SAMPLE') return 'warning'
  if (item.operationalStatus === 'BLOCKED_SAMPLE_REJECTED' || sampleStatus === 'REJECTED') return 'error'
  if (item.operationalStatus === 'RESCHEDULED' || sampleStatus === 'RESCHEDULED') return 'neutral'
  return getStatusColor(item.status)
}

function getSampleActionDescription(item: RoomExamItem) {
  const sampleStatus = getSampleCollectionStatus(item)

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
    if (itemNotes[item.id] === undefined) {
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
    await loadPatientDetail(queuePatient.value?.id ?? null)
    roomExamItems.value = examItemsRes.data?.data ?? examItemsRes.data ?? []
    await nextTick()
    await fetchSelectedItemHistory()
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
    const saved = await saveResultsDraft(item, false)
    if (!saved) return

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
      await api.patch(`/medical/exams/queue/exam-item/${item.id}/retest`, {
        retestedBy: currentUserId.value,
        retestReason: itemActionReason.value.trim() || 'Retest requested',
        notes: itemActionNote.value.trim() || null
      })
    } else {
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
            ? `Item ${item.trxExamItem?.item?.name ?? 'examination'} marked for retest.`
            : `Item ${item.trxExamItem?.item?.name ?? 'examination'} rescheduled.`,
      color: 'success'
    })
    closeItemActionModal()
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
      <UDashboardNavbar
        title="Room Work"
        :subtitle="roomQueueDetail?.queueEntry?.registration?.id_reg || 'Room staff examination detail'"
      >
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UBadge
            :color="activeRoomSession ? 'success' : 'neutral'"
            variant="subtle"
            :label="roomSessionPending ? 'Checking room session...' : roomSessionLabel"
          />

          <UButton
            color="neutral"
            variant="soft"
            icon="i-lucide-arrow-left"
            @click="router.push('/rooms/queue')"
          >
            Back to Queue
          </UButton>

          <UButton
            color="neutral"
            variant="soft"
            icon="i-lucide-refresh-cw"
            :loading="refreshing"
            @click="loadPage(true)"
          >
            Refresh
          </UButton>
        </template>
      </UDashboardNavbar>
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
            <div class="flex flex-col gap-4 md:flex-row md:items-center md:gap-5">
              <div class="mx-auto shrink-0 md:mx-0">
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
              <div class="md:flex-1">
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

                <div class="mt-3 flex flex-wrap gap-2">
                  <UBadge
                    :label="`${activeStage ? getStageDisplayName(activeStage) : 'Completed'}`"
                    :color="activeStage ? getStatusColor(activeStage.status) : 'success'"
                    variant="subtle"
                  />
                  <UBadge
                    color="info"
                    variant="outline"
                    :label="stageSummary"
                  />
                  <UBadge
                    :label="`Room work status: ${getStatusLabel(currentRoomWorkStatus)}`"
                    :color="getStatusColor(currentRoomWorkStatus)"
                    variant="soft"
                  />
                </div>

                <!-- Medical Notes (allergy & disease) -->
                <div v-if="patient" class="mt-3 max-w-2xl rounded-lg bg-muted/30 p-3">
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
                  <div class="mt-2 grid gap-2 sm:grid-cols-2">
                    <div class="min-w-0">
                      <p class="text-[11px] text-muted">
                        Allergy Notes
                      </p>
                      <p class="whitespace-pre-wrap text-sm">
                        {{ patientDetail?.allergyNotes || '-' }}
                      </p>
                    </div>
                    <div class="min-w-0">
                      <p class="text-[11px] text-muted">
                        Disease Notes
                      </p>
                      <p class="whitespace-pre-wrap text-sm">
                        {{ patientDetail?.diseaseNotes || '-' }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-3">
                <div class="hidden text-right sm:block">
                  <span class="block text-[10px] font-medium text-muted">Room Status</span>
                  <span
                    class="text-xs font-bold"
                    :class="allItemsFinal ? 'text-success' : 'text-warning'"
                  >
                    {{ completedItemCount }}/{{ totalItemCount }} Items Completed
                  </span>
                </div>
                <UButton
                  class="lg:hidden"
                  color="primary"
                  variant="soft"
                  icon="i-lucide-list-checks"
                  @click="toggleDrawer()"
                >
                  Select Item
                </UButton>
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
                class="rounded-xl border border-default/80 bg-muted/20 p-3"
              >
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

                <p class="mt-2 line-clamp-2 text-xs text-muted">
                  {{ sample.items.length ? sample.items.join(', ') : 'No related items' }}
                </p>

                <div class="mt-3 flex flex-wrap items-center gap-2">
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

          <!-- Stage actions (sejajar dengan Meal status, tombol di kanan) -->
          <div class="mt-2 flex flex-wrap items-center gap-2">
            <MealStatusBadge v-if="activeExamId" :exam-id="activeExamId" />

            <div class="ml-auto flex flex-wrap items-center gap-2">
              <UButton
                v-if="activeStage?.status === 'WAITING' && canUseAssignShortcut"
                color="neutral"
                variant="soft"
                icon="i-lucide-user-round-plus"
                to="/rooms/assignments"
              >
                Assign Room
              </UButton>
              <UButton
                v-if="activeStage?.status === 'CALLED' || canAutoStartExam"
                color="warning"
                variant="soft"
                icon="i-lucide-play"
                :loading="stageActionLoading"
                @click="handleStartStage"
              >
                Start Examination
              </UButton>
              <UButton
                v-if="activeStage?.status === 'CALLED'"
                color="neutral"
                variant="soft"
                icon="i-lucide-rotate-ccw"
                :loading="stageActionLoading"
                @click="handleReturnPatient"
              >
                Return to Waiting
              </UButton>
              <UButton
                v-if="activeStage?.status === 'IN_PROGRESS'"
                color="warning"
                variant="soft"
                icon="i-lucide-rotate-ccw"
                :loading="stageActionLoading"
                @click="handleCancelStartStage"
              >
                Back to Called
              </UButton>
              <UButton
                v-if="activeStage && ['CALLED', 'IN_PROGRESS'].includes(activeStage.status) && canFinishWork"
                color="success"
                icon="i-lucide-check-circle-2"
                :loading="stageActionLoading"
                @click="handleFinishStage"
              >
                Complete Room
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

          <!-- Custom doctor renderer: navigasi item menjadi tab di bawah detail pasien. -->
          <div v-if="isFullWidthWork" class="flex flex-wrap gap-2 border-b border-default pb-4">
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

          <div class="grid grid-cols-12 items-start gap-5">
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
                <button
                  v-for="master in masterItems"
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
                        Item #{{ master.index }} · {{ master.department }}
                      </span>
                      <h4 class="text-xs font-bold text-highlighted">
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
                  @start="handleStartItem(selectedItem)"
                  @done="handleDoneItem(selectedItem)"
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
                  @start="handleStartItem(selectedItem)"
                  @done="handleDoneItem(selectedItem)"
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
                  @start="handleStartItem(selectedItem)"
                  @done="handleDoneItem(selectedItem)"
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
                  @start="handleStartItem(selectedItem)"
                  @done="handleDoneItem(selectedItem)"
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
                        {{ selectedItem.trxExamItem?.item?.name || '-' }}
                      </h3>
                      <p
                        v-if="queuePatient?.dob || queuePatient?.gender"
                        class="mt-1 text-xs text-muted"
                      >
                        <template v-if="queuePatient?.gender">
                          {{ queuePatient.gender === 'MALE' ? 'Male' : 'Female' }}
                        </template>
                        <template v-if="queuePatient?.dob">
                          · {{ getPatientAgeAtDate(queuePatient.dob, selectedItem.createdAt) }} years old
                        </template>
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
                        v-if="hasStructuredInputs(selectedItem) && selectedItem.status === 'IN_PROGRESS' && selectedItem.trxExamItem?.item?.resultTiming !== 'deferred' && !isExamResultSubmitted(selectedItem)"
                        color="primary"
                        variant="soft"
                        icon="i-lucide-save"
                        :loading="resultSaveLoading[selectedItem.id]"
                        @click="handleSaveResults(selectedItem)"
                      >
                        Save Draft
                      </UButton>

                      <UButton
                        v-if="hasStructuredInputs(selectedItem) && selectedItem.status === 'IN_PROGRESS' && selectedItem.trxExamItem?.item?.resultTiming !== 'deferred' && !isExamResultSubmitted(selectedItem)"
                        color="primary"
                        variant="soft"
                        icon="i-lucide-send"
                        :loading="resultSaveLoading[selectedItem.id]"
                        @click="handleSubmitResults(selectedItem)"
                      >
                        Submit Results
                      </UButton>

                      <UButton
                        v-if="selectedItem.status === 'IN_PROGRESS' && !isSampleOnlyItem(selectedItem)"
                        color="success"
                        variant="soft"
                        icon="i-lucide-check"
                        :loading="itemActionLoading[selectedItem.id]"
                        :disabled="!canDoneItem(selectedItem)"
                        @click="handleDoneItem(selectedItem)"
                      >
                        Complete Item
                      </UButton>
                    </div>

                    <div class="flex flex-wrap items-center gap-1.5">
                      <UButton
                        v-if="selectedItem.status === 'IN_PROGRESS' && roomStageInProgress && canManageItemActions && !['DONE', 'SKIPPED', 'RESCHEDULED', 'REFUSED', 'RETEXT'].includes(selectedItem.status) && !isSampleOnlyItem(selectedItem)"
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

                    <ErpExternalResultPanel
                      v-if="selectedItem.trxExamItem?.item?.externalResult && selectedItem.trxExamItem?.exam?.id"
                      :exam-id="selectedItem.trxExamItem.exam.id"
                      :exam-item-id="selectedItem.trxExamItem.id"
                      :assignment="selectedItem.trxExamItem.externalAssignment"
                      :requires-attachment-for-done="Boolean(selectedItem.trxExamItem.item.requiresAttachmentForDone)"
                      :disabled="selectedItem.status !== 'IN_PROGRESS'"
                      @updated="loadPage(true)"
                    />

                    <div
                      v-if="canRenderExamInputs(selectedItem) && !isPhysicalExamItem(selectedItem)"
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
                    />
                  </div>
                </template>
              </template>

              <div v-else class="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted">
                No examination items for this room yet.
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
          :color="(selectedItemActionType === 'skip' || selectedItemActionType === 'refuse') ? 'error' : 'warning'"
          :title="selectedItemAction?.trxExamItem?.item?.name || 'Examination item'"
          :description="selectedItemActionType === 'skip'
            ? 'This item will be marked as skipped (cancelled by admin/staff).'
            : selectedItemActionType === 'refuse'
              ? 'This item will be marked as refused by the patient.'
              : selectedItemActionType === 'retest'
                ? 'This item will be rescheduled for re-examination.'
                : 'This item will be rescheduled for the next visit.'"
        />

        <div v-if="selectedItemActionType === 'skip' || selectedItemActionType === 'refuse'" class="space-y-2">
          <label class="block text-sm font-medium text-highlighted">
            {{ selectedItemActionType === 'refuse' ? 'Refusal reason' : 'Skip reason' }}
          </label>
          <UTextarea
            v-model="itemActionReason"
            :rows="4"
            :placeholder="selectedItemActionType === 'refuse'
              ? 'Example: patient does not want to be examined, other conditions...'
              : 'Example: sample unavailable, other conditions...'"
          />
        </div>

        <div v-else-if="selectedItemActionType === 'retest'" class="space-y-2">
          <label class="block text-sm font-medium text-highlighted">
            Retest reason
          </label>
          <UTextarea
            v-model="itemActionReason"
            :rows="4"
            placeholder="Example: invalid result, equipment issue, other conditions..."
          />
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-highlighted">
            Notes
          </label>
          <UTextarea
            v-model="itemActionNote"
            :rows="4"
            placeholder="Optional additional notes"
          />
        </div>
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
          :color="selectedItemActionType === 'skip' ? 'error' : selectedItemActionType === 'retest' ? 'primary' : 'warning'"
          :loading="itemActionSubmitLoading"
          @click="handleSubmitItemAction"
        >
          {{ selectedItemActionType === 'skip' ? 'Refuse Item' : selectedItemActionType === 'retest' ? 'Retest Item' : 'Reschedule Item' }}
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
          :title="rejectSampleTarget?.sampleName || 'Sample'"
          description="This sample will be rejected. Examination items using this sample cannot be processed until the sample is re-collected."
        />

        <div class="space-y-2">
          <label class="block text-sm font-medium text-highlighted">
            Rejection reason
          </label>
          <UTextarea
            v-model="rejectSampleReason"
            :rows="4"
            placeholder="Example: patient refused, hemolyzed sample, insufficient volume..."
          />
        </div>
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
