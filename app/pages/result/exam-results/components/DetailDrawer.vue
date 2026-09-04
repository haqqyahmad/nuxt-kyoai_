<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch, onMounted } from 'vue'

import { examTypeBadgeColor } from '~/constants/room-types'
import { useAudit } from '~/composables/useAudit'
import HistoryTimeline from './HistoryTimeline.vue'

const { isExternalDoctor, user: currentUser } = await useCurrentUser()

type Patient = {
  id: string | number
  PatientId?: string | null
  firstName?: string | null
  middleName?: string | null
  lastName?: string | null
  gender?: string | null
  dob?: string | null
}

type Department = {
  id: string
  name: string
  code: string
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
  uom?: string | null
  allowBlank?: boolean
  opsis?: ExamInputOption[]
  formula?: {
    id?: string
    formula?: string | null
  } | null
  nilaiNormalNum?: Array<{
    id: string
    sex?: 'MALE' | 'FEMALE' | null
    ageMin?: number | null
    minValue?: number | null
    maxValue?: number | null
  }>
  nilaiNormalSel?: Array<{
    id: string
    sex?: 'MALE' | 'FEMALE' | null
    ageMin?: number | null
    opsiId?: string
    opsi?: ExamInputOption | null
  }>
}

type WorkHistoryEvent = {
  timestamp: string
  action: string
  actor?: string | null
  details?: string | null
}

type SampleImpact = {
  collectionId: string
  sampleTypeId?: string | null
  sampleTypeName?: string | null
  collectionStatus: string
  rejectReason?: string | null
  rescheduledAt?: string | null
}

type ExamResultDetail = {
  id: string
  queueCode: string
  queueEntryId: string
  patient?: Patient | null
  item?: {
    id: string
    name?: string | null
    code?: string | null
    department?: Department | null
    inputans?: ExamInput[]
  } | null
  items?: Array<{
    id: string
    isExternalResult?: boolean
    item?: {
      id?: string | null
      name?: string | null
      code?: string | null
    } | null
  }>
  resultTiming?: 'inline' | 'deferred'
  isExternalResult?: boolean
  status?: 'pending' | 'completed'
  workStatus?: string | null
  resultStatus?: 'NOT_READY' | 'READY' | 'DRAFT' | 'SUBMITTED' | 'RETURNED' | string | null
  departmentResultStatus?: string | null
  departmentCurrentStepOrder?: number | null
  departmentCurrentVersionId?: string | null
  departmentStepLabel?: string | null
  departmentStepCount?: number | null
  departmentReviewerUserId?: number | null
  departmentReviewerRoleId?: string | null
  departmentReviewerRoleIds?: number[]
  departmentCanApprove?: boolean
  departmentApproveDisableReason?: string | null
  returnReason?: string | null
  revisionItems?: Array<{
    inputanId: string | null
    examItemId: string | null
    reason?: string | null
  }>
  canEditResult?: boolean
  canSubmitResult?: boolean
  exam?: {
    id: string
    examType?: 'MCU' | 'RAWAT_JALAN' | null
    examCode?: string | null
    externalStatus?: 'ASSIGNED' | 'PROCESSING' | 'CANCELLED' | 'FILLED' | null
    assignedExternalUserId?: number | null
    assignedExternalUser?: { id: number, name: string } | null
    externalAssignedAt?: string | null
    externalProcessingStartedAt?: string | null
    externalProcessingDeadline?: string | null
    externalFilledAt?: string | null
    attachmentUrl?: string | null
    externalAttachment?: {
      id: string
      originalName?: string | null
      mimeType?: string | null
      sizeBytes?: number | null
      uploadedBy?: number | null
      uploadedByUser?: { id: number, name: string } | null
      uploadedAt?: string | null
    } | null
    workUpdatedBy?: number | null
    workUpdatedByUser?: { id: number, name: string } | null
    resultSubmittedBy?: number | null
    resultSubmittedByUser?: { id: number, name: string } | null
    externalProcessSlaDays?: number | null
    results?: Array<{
      inputanId: string
      valueString?: string | null
      valueNumber?: number | null
      valueSelected?: string | null
      valueCalculated?: number | null
      flag?: 'normal' | 'abnormal' | null
      grading?: 'NORMAL' | 'ABNORMAL_INC' | 'ABNORMAL_DEC' | null
    }>
  } | null
  sampleImpact?: SampleImpact | null
  sampleImpacts?: SampleImpact[]
  sampleBlocked?: boolean
  sampleBlockedReason?: string | null
  workHistory?: WorkHistoryEvent[]
  checkinAt?: string | null
  completedAt?: string | null
}

type ResultDraft = {
  valueString?: string
  valueNumber?: string
  valueSelected?: string
  valueCalculated?: string
}

type BadgeColor = 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral'
type GradingValue = 'NORMAL' | 'ABNORMAL_INC' | 'ABNORMAL_DEC'
type ResultPayload = {
  inputanId: string
  valueString?: string
  valueNumber?: number
  valueSelected?: string
  valueCalculated?: number
}

const props = defineProps<{
  open: boolean
  result: ExamResultDetail | null
  embedded?: boolean
}>()

const emit = defineEmits<{
  close: []
  resultSaved: [result: ExamResultDetail]
}>()

const result = computed(() => props.result)

const externalContextOpen = ref(true)

const api = useApi()
const toast = useToast()
const { loading: auditLoading, entries, resetAudit } = useAudit()
async function fetchAllAudit() {
  if (!props.result?.id) {
    resetAudit()
    return
  }
  auditLoading.value = true
  try {
    // View petugas (groupBy exam): result.id = examId, item id ada di result.items.
    // View dokter luar (groupBy item): result.id = examItemId.
    const examId = props.result.exam?.id ?? (props.result as any).examId ?? null
    const examItemIds = (props.result as any).items?.length
      ? (props.result as any).items.map((it: any) => it.id)
      : [props.result.id]

    const [roomLogs, externalLogs, examLogs] = await Promise.all([
      Promise.all(examItemIds.map((id: string) =>
        api.get(`/audit/RoomExamItem/${id}`).then(r => r.data?.data ?? []).catch(() => [])
      )).then(rows => rows.flat()),
      Promise.all(examItemIds.map((id: string) =>
        api.get(`/audit/ExternalResultAssignment/${id}`).then(r => r.data?.data ?? []).catch(() => [])
      )).then(rows => rows.flat()),
      examId
        ? api.get(`/audit/TrxExamResult/${examId}`).then(r => r.data?.data ?? []).catch(() => [])
        : Promise.resolve([])
    ])
    entries.value = [...roomLogs, ...externalLogs, ...examLogs].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
  } finally {
    auditLoading.value = false
  }
}

const groupGradingItems: Array<{ label: string, value: GradingValue }> = [
  { label: 'Normal', value: 'NORMAL' },
  { label: 'Abnormal (meningkat)', value: 'ABNORMAL_INC' },
  { label: 'Abnormal (menurun)', value: 'ABNORMAL_DEC' }
]

const groupGradingForm = ref<{ groupId: string, groupName: string, grading?: GradingValue }>({
  groupId: '',
  groupName: '',
  grading: undefined
})
const autoComment = ref<string | null>(null)
const groupGradingSaving = ref(false)

const isResultBlockedBySample = computed(() => Boolean(props.result?.sampleBlocked))
const sampleBlockedDescription = computed(() => props.result?.sampleBlockedReason || 'Sample belum siap untuk pengisian hasil')
const canEditCurrentResult = computed(() => {
  if (isExternalDoctor.value && props.result?.isExternalResult) return props.result?.exam?.externalStatus === 'PROCESSING'
  return props.result?.canEditResult ?? props.result?.status === 'pending'
})
const canSubmitCurrentResult = computed(() => {
  if (isExternalDoctor.value && props.result?.isExternalResult) return props.result?.exam?.externalStatus === 'PROCESSING'
  return props.result?.canSubmitResult ?? props.result?.status === 'pending'
})
const isExternalResultFilled = computed(() =>
  props.result?.items?.some(item => item.isExternalResult) && props.result?.exam?.externalStatus === 'FILLED'
)

// [F] Approve department (reviewer step / four-eyes): status REVIEW + diizinkan backend.
const departmentApproveBlockedReason = computed<string | null>(() => {
  const r = props.result
  if (r?.departmentResultStatus !== 'DEPARTMENT_REVIEW') return null
  if (r.departmentCanApprove === false) return r.departmentApproveDisableReason || 'Anda tidak memiliki hak approve step ini'
  if (Number(r.exam?.resultSubmittedBy) != null && Number(r.exam?.resultSubmittedBy) === Number(currentUser.value?.id)) {
    return 'Inputter/submitter yang sama tidak boleh approve (four-eyes).'
  }
  return null
})
const canApproveCurrentResult = computed(() => {
  if (props.result?.departmentResultStatus !== 'DEPARTMENT_REVIEW') return false
  if (props.result.departmentCanApprove === false) return false
  if (props.result.departmentCanApprove === true) return Boolean(props.result?.item?.department?.id)
  const currentId = currentUser.value?.id
  if (!currentId) return false
  return Number(props.result?.exam?.resultSubmittedBy) !== Number(currentId)
})
const approveButtonTitle = computed(() => {
  if (props.result?.departmentResultStatus !== 'DEPARTMENT_REVIEW') return undefined
  return departmentApproveBlockedReason.value || undefined
})

const approving = ref(false)
async function handleApproveResult() {
  const examId = props.result?.exam?.id
  const departmentId = props.result?.item?.department?.id
  if (!examId || !departmentId || approving.value) return
  approving.value = true
  try {
    await api.post(`/mcu/exams/${examId}/department-result/approve`, { departmentId })
    toast.add({ title: 'Disetujui', description: 'Hasil disetujui departemen.', color: 'success' })
    emit('resultSaved', props.result)
  } catch (error: unknown) {
    toast.add({
      title: 'Gagal approve',
      description: getErrorMessage(error, 'Terjadi kesalahan saat menyetujui.'),
      color: 'error',
    })
  } finally {
    approving.value = false
  }
}

const externalProcessingDeadline = computed(() => {
  if (props.result?.exam?.externalStatus !== 'PROCESSING') return null
  return props.result?.exam?.externalProcessingDeadline ?? null
})
const externalProcessingOverdue = computed(() => {
  if (!externalProcessingDeadline.value) return false
  return new Date() > new Date(externalProcessingDeadline.value)
})
const externalProcessingRemainingLabel = computed(() => {
  const deadline = props.result?.exam?.externalProcessingDeadline
  if (!deadline) return ''
  const ms = new Date(deadline).getTime() - Date.now()
  if (ms <= 0) return 'sudah lewat batas waktu (3 jam)'
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  return `${hours} jam ${minutes} menit tersisa`
})

const externalStarting = ref(false)
async function startExternalProcessing() {
  const examItemId = getExternalExamItemId()
  if (!props.result?.exam?.id || !examItemId || externalStarting.value) return
  externalStarting.value = true
  try {
    await api.post(`/mcu/exams/${props.result?.exam?.id}/external-processing/start`, { examItemId })
    toast.add({ title: 'Berhasil', description: 'Pemeriksaan dokter luar dimulai. Batas waktu submit 3 jam.', color: 'success' })
    emit('resultSaved', props.result)
  } catch (error: unknown) {
    toast.add({ title: 'Gagal', description: getErrorMessage(error, 'Gagal memulai pemeriksaan dokter luar.'), color: 'error' })
  } finally {
    externalStarting.value = false
  }
}

const slaDays = computed(() => props.result?.exam?.externalProcessSlaDays ?? 3)
const slaDeadline = computed(() => {
  const assignedAt = props.result?.exam?.externalAssignedAt
  if (!assignedAt) return null
  const deadline = new Date(assignedAt)
  deadline.setDate(deadline.getDate() + (slaDays.value || 0))
  return deadline
})
const slaOverdue = computed(() => {
  if (props.result?.exam?.externalStatus !== 'ASSIGNED') return false
  if (!slaDeadline.value) return false
  return new Date() > slaDeadline.value
})
const slaRemainingLabel = computed(() => {
  if (!slaDeadline.value) return ''
  const ms = slaDeadline.value.getTime() - Date.now()
  if (ms <= 0) return 'sudah lewat batas waktu'
  const hours = Math.floor(ms / 3600000)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days} hari ${hours % 24} jam tersisa`
  return `${hours} jam tersisa`
})

const resultStatusOptions = [
  { label: 'Belum Siap (NOT_READY)', value: 'NOT_READY' },
  { label: 'Siap (READY)', value: 'READY' },
  { label: 'Draft (DRAFT)', value: 'DRAFT' },
  { label: 'Tersubmit (SUBMITTED)', value: 'SUBMITTED' },
  { label: 'Dikembalikan (RETURNED)', value: 'RETURNED' }
]
const selectedResultStatus = ref<string>('')
const statusSaving = ref(false)

watch(() => props.result?.resultStatus, (value) => {
  selectedResultStatus.value = value || 'NOT_READY'
}, { immediate: true })

async function handleUpdateResultStatus() {
  if (!props.result?.exam?.id || statusSaving.value) return
  if (!selectedResultStatus.value || selectedResultStatus.value === props.result.resultStatus) return

  statusSaving.value = true
  try {
    await api.post(`/mcu/exams/${props.result?.exam?.id}/results/status`, {
      examItemId: props.result.id,
      resultStatus: selectedResultStatus.value
    })
    toast.add({ title: 'Status proses diperbarui', color: 'success' })
    emit('resultSaved', props.result)
  } catch (error: unknown) {
    toast.add({
      title: 'Gagal update status',
      description: getErrorMessage(error, 'Terjadi kesalahan saat memperbarui status.'),
      color: 'error'
    })
  } finally {
    statusSaving.value = false
  }
}

async function setResultStatus(status: string) {
  if (!props.result?.exam?.id || statusSaving.value) return
  if (status === props.result.resultStatus) return

  statusSaving.value = true
  try {
    await api.post(`/mcu/exams/${props.result?.exam?.id}/results/status`, {
      examItemId: props.result.id,
      resultStatus: status
    })
    selectedResultStatus.value = status
    toast.add({ title: 'Status proses diperbarui', color: 'success' })
    emit('resultSaved', props.result)
  } catch (error: unknown) {
    toast.add({
      title: 'Gagal update status',
      description: getErrorMessage(error, 'Terjadi kesalahan saat memperbarui status.'),
      color: 'error'
    })
  } finally {
    statusSaving.value = false
  }
}
const resultWorkflowLabel = computed(() => {
  if (props.result?.departmentResultStatus === 'DEPARTMENT_REVIEW') return 'Waiting Approval'
  if (props.result?.departmentResultStatus === 'DEPARTMENT_APPROVED') return 'Department Approved'
  if (props.result?.resultStatus === 'SUBMITTED') return 'Submitted'
  if (props.result?.resultStatus === 'RETURNED') return 'Returned'
  if (props.result?.resultStatus === 'DRAFT') return 'Draft'
  if (props.result?.resultStatus === 'READY') return 'Ready'
  return null
})

// [RETURN] Revisi dari dokter → department (pola sama seperti MR → dokter)
const isReturnedToDepartment = computed(() =>
  props.result?.departmentResultStatus === 'RETURNED_TO_DEPARTMENT'
)
const returnReason = computed(() => props.result?.returnReason ?? null)
const returnRevisionItems = computed(() => props.result?.revisionItems ?? [])
function returnItemLabel(inputanId: string | null) {
  if (!inputanId) return 'Item pemeriksaan'
  const inputan = (props.result?.item?.inputans ?? [])
    .find((inp) => inp.id === inputanId)
  return inputan?.label || inputanId.slice(0, 8)
}
// [RETURN] Catatan per inputan (dari return dokter → dept)
const returnNoteByInputan = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {}
  for (const rev of returnRevisionItems.value) {
    if (rev.inputanId && !map[rev.inputanId]) {
      map[rev.inputanId] = rev.reason ?? ''
    }
  }
  return map
})
function inputanReturnNote(inputanId: string | null) {
  return inputanId ? (returnNoteByInputan.value[inputanId] ?? '') : ''
}

function getSampleImpactLabel(impact: SampleImpact) {
  const name = impact.sampleTypeName || 'Sample'
  if (impact.collectionStatus === 'REJECTED') return `${name} ditolak`
  if (impact.collectionStatus === 'RESCHEDULED') return `${name} dijadwalkan ulang`
  if (impact.collectionStatus !== 'RECEIVED') return `${name} belum diterima`
  return `${name} diterima`
}

async function loadGroupResults() {
  if (!props.result?.exam?.id) return
  try {
    const { data } = await api.get(`/mcu/exams/${props.result?.exam?.id}/group-results`)
    const list = data?.data ?? []
    if (Array.isArray(list) && list.length > 0) {
      const g = list[0]
      groupGradingForm.value = { groupId: g.groupId, groupName: g.groupName ?? '', grading: g.grading ?? undefined }
      autoComment.value = g.autoComment ?? null
    }
  } catch {
    /* ignore */
  }
}

async function saveGroupGrading() {
  if (!props.result?.exam?.id) return
  if (!groupGradingForm.value.groupId) {
    toast.add({ title: 'groupId wajib diisi', color: 'error' })
    return
  }
  groupGradingSaving.value = true
  try {
    const items = (props.result.exam?.results ?? [])
      .filter((r: any) => r.grading && r.grading !== 'NORMAL')
      .map((r: any) => ({ inputanId: r.inputanId, grading: r.grading, name: inputanLabel(r.inputanId) }))
    const { data } = await api.post(`/mcu/exams/${props.result?.exam?.id}/group-result`, {
      ...groupGradingForm.value,
      items
    })
    autoComment.value = data?.data?.autoComment ?? null
    toast.add({ title: 'Grading group disimpan', color: 'success' })
  } catch (e: any) {
    toast.add({ title: e?.response?.data?.message ?? 'Gagal menyimpan', color: 'error' })
  } finally {
    groupGradingSaving.value = false
  }
}

function inputanLabel(inputanId: string) {
  return props.result?.item?.inputans?.find((i: any) => i.id === inputanId)?.label ?? inputanId
}

const externalDoctors = ref<Array<{ id: number, name: string }>>([])
const selectedExternalDoctor = ref<number | undefined>(undefined)
const externalSaving = ref(false)
const externalFile = ref<File | null>(null)
const externalInputColumns = ref<'one' | 'two'>('one')
const externalAttachmentPreviewUrl = ref<string | null>(null)
const externalAttachmentLoading = ref(false)
const externalAttachmentError = ref<string | null>(null)

const hasExternalResultContext = computed(() => Boolean(props.result?.isExternalResult || props.result?.items?.some(item => item.isExternalResult)))
const isExternalDoctorWorkspace = computed(() => Boolean(isExternalDoctor.value && hasExternalResultContext.value))
const isExternalInputTwoColumns = computed(() => externalInputColumns.value === 'two')

async function loadExternalDoctors() {
  try {
    const res = await api.get('/mcu/exams/external-doctors')
    const payload = res.data?.data ?? []
    if (Array.isArray(payload)) {
      externalDoctors.value = payload.map((externalDoctor: { id: number, name: string }) => ({
        id: externalDoctor.id,
        name: externalDoctor.name
      }))
    }
  } catch {
    externalDoctors.value = []
  }
}
loadExternalDoctors()

function getErrorMessage(error: unknown, fallback = 'Terjadi kesalahan'): string {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as any).data
    if (data?.message) return typeof data.message === 'string' ? data.message : JSON.stringify(data.message)
  }
  if (error instanceof Error) return error.message
  return fallback
}

const externalStatusColor: Record<string, BadgeColor> = {
  ASSIGNED: 'warning',
  PROCESSING: 'info',
  CANCELLED: 'neutral',
  FILLED: 'success'
}

function gradingColor(grading?: string | null): BadgeColor {
  if (!grading) return 'neutral'
  if (grading === 'NORMAL') return 'success'
  if (grading === 'ABNORMAL_INC' || grading === 'ABNORMAL_DEC') return 'error'
  return 'warning'
}

// Computed map of external results by inputanId for easy template access
const externalResultsMap = computed(() => {
  const map = new Map<string, any>()
  if (props.result?.exam?.results) {
    for (const r of props.result?.exam?.results) {
      map.set(r.inputanId, r)
    }
  }
  return map
})

// Safe getter that returns a default object if not found - avoids template undefined issues
function getExtResult(inputanId: string) {
  return externalResultsMap.value.get(inputanId) ?? null
}

function getOptionLabel(inputan: ExamInput, value: string) {
  return inputan.opsis?.find(o => o.value === value)?.label ?? value
}

function getExamTypeColor(type?: 'MCU' | 'RAWAT_JALAN' | null): BadgeColor {
  return (examTypeBadgeColor[type ?? 'MCU'] ?? 'neutral') as BadgeColor
}

function getExternalHeaderSubtitle() {
  const patient = props.result?.patient
  const parts = [
    patient?.PatientId,
    props.result?.queueCode,
    patient?.gender === 'MALE' ? 'Laki-laki' : patient?.gender === 'FEMALE' ? 'Perempuan' : null,
    getAgeAtExamLabel(patient, props.result?.checkinAt)
  ].filter(Boolean)
  return parts.join(' - ') || '-'
}

function formatExternalActor(user?: { id: number, name: string } | null, fallbackId?: number | null) {
  if (user?.name) return user.name
  if (fallbackId != null) return `User #${fallbackId}`
  return '-'
}

function getExternalCollectorLabel() {
  return formatExternalActor(props.result?.exam?.workUpdatedByUser, props.result?.exam?.workUpdatedBy)
}

function getExternalUploadLabel() {
  const attachment = props.result?.exam?.externalAttachment
  const actor = formatExternalActor(attachment?.uploadedByUser, attachment?.uploadedBy)
  const uploadedAt = formatDateTime(attachment?.uploadedAt)
  if (actor === '-' && uploadedAt === '-') return '-'
  return [actor, uploadedAt].filter(value => value && value !== '-').join(' - ')
}

function optionRequiresDetail(option: ExamInputOption) {
  return /\(Text\)$/i.test(option.label) || /^others$/i.test(option.label)
}

function hasOtherOption(inputan: ExamInput) {
  return (inputan.opsis || []).some(option => optionRequiresDetail(option))
}

function isOtherSelected(inputan: ExamInput) {
  const selected = getInputDraft(inputan.id).valueSelected
  const option = (inputan.opsis || []).find(o => o.value === selected)
  return Boolean(option && optionRequiresDetail(option)) || /\(Text\)$/i.test(selected)
}

function getExternalExamItemId() {
  if (isExternalDoctorWorkspace.value) return props.result?.id ?? null
  const externalItem = props.result?.items?.find(item => item.isExternalResult)
  return externalItem?.id ?? (props.result?.isExternalResult ? props.result.id : null)
}

function getInputDisplayId(inputan: ExamInput) {
  if (inputan.inputType === 'selected' && inputan.uom) return inputan.uom
  return inputan.label
}

function cleanupExternalAttachmentPreview() {
  if (!import.meta.client) return
  if (externalAttachmentPreviewUrl.value) {
    URL.revokeObjectURL(externalAttachmentPreviewUrl.value)
    externalAttachmentPreviewUrl.value = null
  }
}

async function loadExternalAttachmentPreview() {
  if (!import.meta.client) return
  cleanupExternalAttachmentPreview()
  externalAttachmentError.value = null

  const examItemId = getExternalExamItemId()
  if (!isExternalDoctorWorkspace.value || !props.result?.exam?.id || !examItemId || !props.result.exam?.attachmentUrl) {
    return
  }

  externalAttachmentLoading.value = true
  try {
    const response = await api.get(
      `/mcu/exams/${props.result?.exam?.id}/external-attachment/${examItemId}/download`,
      { responseType: 'blob' }
    )
    externalAttachmentPreviewUrl.value = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
  } catch (error: unknown) {
    externalAttachmentError.value = getErrorMessage(error, 'PDF hasil dokter luar tidak dapat dimuat.')
  } finally {
    externalAttachmentLoading.value = false
  }
}
async function assignExternalDoctor() {
  if (!selectedExternalDoctor.value) return
  externalSaving.value = true
  try {
    await api.post(`/mcu/exams/${props.result?.exam?.id}/assign-external`, {
      externalUserId: selectedExternalDoctor.value,
      examItemId: getExternalExamItemId()
    })
    toast.add({ title: 'Berhasil', description: 'Dokter luar ditugaskan.', color: 'success' })
    emit('resultSaved', props.result as ExamResultDetail)
  } catch (error: unknown) {
    toast.add({ title: 'Gagal', description: getErrorMessage(error, 'Gagal menugaskan dokter luar.'), color: 'error' })
  } finally {
    externalSaving.value = false
  }
}

const cancelExternalOpen = ref(false)
const cancelExternalReason = ref('')
const cancelExternalSubmitting = ref(false)

function openCancelExternal() {
  cancelExternalReason.value = ''
  cancelExternalOpen.value = true
}

async function cancelExternalDoctor() {
  if (cancelExternalSubmitting.value) return
  cancelExternalSubmitting.value = true
  try {
    await api.post(`/mcu/exams/${props.result?.exam?.id}/cancel-external`, {
      examItemId: getExternalExamItemId(),
      reason: cancelExternalReason.value || null
    })
    toast.add({ title: 'Berhasil', description: 'Penugasan dokter luar dibatalkan.', color: 'success' })
    cancelExternalOpen.value = false
    emit('resultSaved', props.result as ExamResultDetail)
  } catch (error: unknown) {
    toast.add({ title: 'Gagal', description: getErrorMessage(error, 'Gagal membatalkan penugasan.'), color: 'error' })
  } finally {
    cancelExternalSubmitting.value = false
  }
}

async function uploadExternalResult() {
  if (!externalFile.value) {
    toast.add({ title: 'PDF wajib diunggah', color: 'warning' })
    return
  }
  externalSaving.value = true
  try {
    const form = new FormData()
    form.append('attachment', externalFile.value)
    form.append('examItemId', String(getExternalExamItemId() ?? ''))
    await api.post(`/mcu/exams/${props.result?.exam?.id}/external-attachment`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    toast.add({ title: 'Berhasil', description: 'PDF hasil dokter luar berhasil diunggah.', color: 'success' })
    emit('resultSaved', props.result as ExamResultDetail)
  } catch (error: unknown) {
    toast.add({ title: 'Gagal', description: getErrorMessage(error, 'Gagal mengunggah PDF hasil dokter luar.'), color: 'error' })
  } finally {
    externalSaving.value = false
  }
}

async function openExternalAttachment() {
  const examItemId = getExternalExamItemId()
  if (!props.result?.exam?.id || !examItemId) return
  externalSaving.value = true
  try {
    const response = await api.get(
      `/mcu/exams/${props.result?.exam?.id}/external-attachment/${examItemId}/download`,
      { responseType: 'blob' }
    )
    const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
    window.open(url, '_blank', 'noopener,noreferrer')
    window.setTimeout(() => URL.revokeObjectURL(url), 60000)
  } catch (error: unknown) {
    toast.add({
      title: 'PDF tidak dapat dibuka',
      description: getErrorMessage(error, 'Gagal membuka PDF hasil dokter luar.'),
      color: 'error'
    })
  } finally {
    externalSaving.value = false
  }
}

const saving = ref(false)
const submitting = ref(false)
const resultDrafts = ref<Record<string, ResultDraft>>({})

function formatPatientName(patient?: Patient | null) {
  if (!patient) return '-'
  return [patient.firstName, patient.middleName, patient.lastName]
    .filter(Boolean)
    .join(' ')
}

function formatDateTime(dateString?: string | null) {
  if (!dateString) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(dateString))
}

function formatDate(dateString?: string | null) {
  if (!dateString) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium'
  }).format(new Date(dateString))
}

function getPatientAgeAtDate(dob?: string | null, referenceDate?: string | null) {
  if (!dob || !referenceDate) return null

  const birthDate = new Date(dob)
  const targetDate = new Date(referenceDate)
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

function isRangeMatchPatient(
  range: {
    sex?: string | null
    ageMin?: number | null
  },
  patientGenderKey: string | null,
  patientAge: number | null
) {
  const rangeGender = getPatientGenderKey(range.sex)
  if (rangeGender && !patientGenderKey) {
    return false
  }

  if (rangeGender && rangeGender !== patientGenderKey) {
    return false
  }

  if (range.ageMin != null && patientAge != null && patientAge < range.ageMin) {
    return false
  }

  if (range.ageMin != null && patientAge == null && range.ageMin > 0) {
    return false
  }

  return true
}

function filterPatientMatchedRanges<T extends { sex?: string | null, ageMin?: number | null }>(ranges: T[]) {
  if (!ranges.length) return []

  const patientAge = getPatientAgeAtDate(props.result?.patient?.dob, props.result?.checkinAt)
  const patientGenderKey = getPatientGenderKey(props.result?.patient?.gender)

  const matched = ranges.filter(range =>
    isRangeMatchPatient(range, patientGenderKey, patientAge)
  )

  if (!matched.length) {
    return []
  }

  const bestAgeMin = Math.max(...matched.map(range => range.ageMin ?? -1))
  return matched.filter(range => (range.ageMin ?? -1) === bestAgeMin)
}

function getPatientMatchedNormalRanges(inputan: ExamInput) {
  return filterPatientMatchedRanges(inputan.nilaiNormalNum || [])
}

function getPatientMatchedSelectedNormalRanges(inputan: ExamInput) {
  return filterPatientMatchedRanges(inputan.nilaiNormalSel || [])
}

function getPatientMatchedDisplayNormalRanges(inputan: ExamInput) {
  if (inputan.inputType === 'selected') return getPatientMatchedSelectedNormalRanges(inputan)
  return getPatientMatchedNormalRanges(inputan)
}

function getVisibleNormalRanges(inputan: ExamInput) {
  const matched = getPatientMatchedDisplayNormalRanges(inputan)
  if (matched.length) return matched

  const ranges = inputan.inputType === 'selected'
    ? inputan.nilaiNormalSel || []
    : inputan.nilaiNormalNum || []
  if (!ranges.length) return []

  const patientAge = getPatientAgeAtDate(props.result?.patient?.dob, props.result?.checkinAt)
  if (patientAge == null) return ranges.slice(0, 3)

  const ageMatched = ranges.filter(range => range.ageMin == null || patientAge >= range.ageMin)
  if (!ageMatched.length) return ranges.slice(0, 3)

  const bestAgeMin = Math.max(...ageMatched.map(range => range.ageMin ?? -1))
  return ageMatched.filter(range => (range.ageMin ?? -1) === bestAgeMin)
}

// Visibilitas field berdasarkan jenis kelamin pasien (item radiologi/USG).
// Field disembunyikan HANYA bila seluruh rentang normal-nya dibatasi pada sex
// yang tidak cocok dengan gender pasien. `sex: null` atau tidak ada rentang
// normal → selalu tampil untuk semua gender.
function inputanGenderRestrictedToSexes(inputan: ExamInput): string[] {
  const sexes = new Set<string>()
  for (const range of [...(inputan.nilaiNormalSel ?? []), ...(inputan.nilaiNormalNum ?? [])]) {
    if (!range.sex) return [] // ada rentang universal → tidak dibatasi gender
    sexes.add(getPatientGenderKey(range.sex) ?? '')
  }
  return [...sexes].filter(Boolean)
}

function isInputanVisibleForGender(inputan: ExamInput): boolean {
  const restricted = inputanGenderRestrictedToSexes(inputan)
  if (!restricted.length) return true
  const patientKey = getPatientGenderKey(props.result?.patient?.gender) ?? ''
  return restricted.includes(patientKey)
}

const visibleInputans = computed(() =>
  (props.result?.item?.inputans ?? []).filter(isInputanVisibleForGender)
)

function getMatchedNormalRange(inputan: ExamInput) {
  return getPatientMatchedDisplayNormalRanges(inputan)[0] || null
}

function getDraftText(value: unknown) {
  return String(value ?? '').trim()
}

function getStoredInputResult(inputanId: string) {
  return props.result?.exam?.results?.find(result => result.inputanId === inputanId)
}

function hasInputDraftValue(inputanId: string) {
  const draft = resultDrafts.value[inputanId] || {}
  return Boolean(
    getDraftText(draft.valueNumber)
    || getDraftText(draft.valueCalculated)
    || getDraftText(draft.valueString)
    || getDraftText(draft.valueSelected)
  )
}

function getInputResultValue(inputanId: string) {
  const existing = getStoredInputResult(inputanId)
  const draft = resultDrafts.value[inputanId] || {}

  if (getDraftText(draft.valueNumber)) {
    return { raw: String(draft.valueNumber), numeric: Number(draft.valueNumber) }
  }
  if (getDraftText(draft.valueCalculated)) {
    return { raw: String(draft.valueCalculated), numeric: Number(draft.valueCalculated) }
  }
  if (getDraftText(draft.valueString)) {
    return { raw: String(draft.valueString), numeric: null }
  }
  if (getDraftText(draft.valueSelected)) {
    return { raw: String(draft.valueSelected), numeric: null }
  }

  if (existing?.valueNumber != null) {
    return { raw: String(existing.valueNumber), numeric: existing.valueNumber }
  }
  if (existing?.valueCalculated != null) {
    return { raw: String(existing.valueCalculated), numeric: existing.valueCalculated }
  }
  if (existing?.valueString != null) {
    return { raw: existing.valueString, numeric: null }
  }
  if (existing?.valueSelected != null) {
    return { raw: existing.valueSelected, numeric: null }
  }

  return { raw: '', numeric: null }
}

function getStoredResultFlag(inputanId: string) {
  if (hasInputDraftValue(inputanId)) return null
  return getStoredInputResult(inputanId)?.flag ?? null
}

function isResultOutsideNormalRange(inputan: ExamInput) {
  const storedFlag = getStoredResultFlag(inputan.id)
  if (storedFlag) return storedFlag === 'abnormal'

  const ranges = getPatientMatchedDisplayNormalRanges(inputan)
  if (!ranges.length) return false

  const resultValue = getInputResultValue(inputan.id)

  if (inputan.inputType === 'selected') {
    if (!resultValue.raw) return false
    return !getPatientMatchedSelectedNormalRanges(inputan)
      .some(range => range.opsi?.value === resultValue.raw)
  }

  const range = ranges[0]
  if (!range || !('minValue' in range)) return false

  if (resultValue.numeric == null || Number.isNaN(resultValue.numeric)) return false

  const min = range.minValue
  const max = range.maxValue
  if (min != null && resultValue.numeric < min) return true
  if (max != null && resultValue.numeric > max) return true

  return false
}

function getResultInputClass(inputan: ExamInput) {
  const base = 'w-full rounded-xl border bg-default px-3 py-2.5 text-sm outline-none transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70'
  const outside = isResultOutsideNormalRange(inputan)

  if (!outside) {
    return `${base} border-default focus:border-primary/60 focus:ring-primary/15`
  }

  return `${base} border-red-500/40 font-semibold text-red-600 focus:border-red-500/70 focus:ring-red-500/15 dark:text-red-400`
}

function getResultNormalityState(inputan: ExamInput) {
  const storedFlag = getStoredResultFlag(inputan.id)
  if (storedFlag === 'abnormal') {
    return {
      label: 'Abnormal',
      color: 'error' as const,
      tone: 'Outside the normal range'
    }
  }
  if (storedFlag === 'normal') {
    return {
      label: 'Normal',
      color: 'success' as const,
      tone: 'Inside the normal range'
    }
  }

  const ranges = getPatientMatchedDisplayNormalRanges(inputan)
  const resultValue = getInputResultValue(inputan.id)

  if (!ranges.length) {
    return {
      label: 'No normal range',
      color: 'neutral' as const,
      tone: 'No range available for this item'
    }
  }

  const hasValue = inputan.inputType === 'selected'
    ? Boolean(resultValue.raw)
    : resultValue.numeric != null && !Number.isNaN(resultValue.numeric)

  if (!hasValue) {
    return {
      label: 'Pending',
      color: 'neutral' as const,
      tone: 'Enter a value to evaluate'
    }
  }

  if (isResultOutsideNormalRange(inputan)) {
    return {
      label: 'Abnormal',
      color: 'error' as const,
      tone: 'Outside the normal range'
    }
  }

  return {
    label: 'Normal',
    color: 'success' as const,
    tone: 'Inside the normal range'
  }
}

function formatNormalRange(range: {
  minValue?: number | null
  maxValue?: number | null
  opsi?: ExamInputOption | null
}, unit?: string | null) {
  if (range.opsi) {
    return range.opsi.label || range.opsi.value
  }

  const low = range.minValue ?? 'min'
  const high = range.maxValue ?? 'max'

  return `${low} - ${high}${unit ? ` ${unit}` : ''}`
}

function formatRangeCriteria(range: {
  sex?: string | null
  ageMin?: number | null
}) {
  const parts: string[] = []

  if (range.sex) {
    parts.push(`Sex: ${range.sex}`)
  }
  if (range.ageMin != null) {
    parts.push(`Age >= ${range.ageMin}`)
  }

  return parts.length ? parts.join(' | ') : 'No criteria'
}

function getAgeAtExamLabel(patient?: Patient | null, referenceDate?: string | null) {
  const age = getPatientAgeAtDate(patient?.dob, referenceDate)
  return age == null ? '-' : `${age} years`
}

function getDepartmentLabel(dept?: Department | null) {
  if (!dept) return '-'
  return `${dept.code} - ${dept.name}`
}

function getStatusLabel(status?: string) {
  if (status === 'completed') return 'Completed'
  if (status === 'pending') return 'Pending'
  if (status === 'DEPARTMENT_REVIEW') return 'Pending Approval'
  if (status === 'DEPARTMENT_APPROVED') return 'Approved'
  if (status === 'SUBMITTED_TO_DOCTOR') return 'Dikirim ke Dokter'
  if (status === 'RETURNED_TO_DEPARTMENT') return 'Dikembalikan'
  if (status === 'DRAFT') return 'Draft'
  return status || '-'
}

function getStatusColor(status?: string) {
  if (status === 'completed' || status === 'DEPARTMENT_APPROVED' || status === 'SUBMITTED_TO_DOCTOR') return 'success'
  if (status === 'pending' || status === 'DEPARTMENT_REVIEW') return 'warning'
  if (status === 'RETURNED_TO_DEPARTMENT') return 'error'
  return 'neutral'
}

function getTypeLabel(type?: string) {
  if (type === 'inline') return 'Inline'
  if (type === 'deferred') return 'Deferred'
  return '-'
}

function getInputTypeLabel(type?: string) {
  if (type === 'number') return 'Number'
  if (type === 'string') return 'Text'
  if (type === 'selected') return 'Select'
  if (type === 'calculated') return 'Calculated'
  return '-'
}

function getInputDraft(inputId: string) {
  if (!resultDrafts.value[inputId]) {
    resultDrafts.value[inputId] = {}
  }
  return resultDrafts.value[inputId]
}

function parseDraftNumber(value?: string) {
  const text = getDraftText(value)
  if (!text) return null

  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeFormulaKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function toFormulaIdentifier(value: string) {
  const identifier = value.trim().replace(/[^A-Za-z0-9_$]+/g, '_')
  if (!identifier) return null
  return /^[A-Za-z_$]/.test(identifier) ? identifier : `_${identifier}`
}

function getInputNumericValue(inputan: ExamInput) {
  const draft = resultDrafts.value[inputan.id] ?? {}

  if (inputan.inputType === 'number') {
    const draftValue = parseDraftNumber(draft.valueNumber)
    if (draftValue != null) return draftValue
  }

  if (inputan.inputType === 'calculated') {
    const draftValue = parseDraftNumber(draft.valueCalculated)
    if (draftValue != null) return draftValue
  }

  const existing = props.result?.exam?.results?.find(result => result.inputanId === inputan.id)
  if (existing?.valueNumber != null) return existing.valueNumber
  if (existing?.valueCalculated != null) return existing.valueCalculated

  return null
}

function buildFormulaScope(targetInputId: string) {
  const scope = new Map<string, number>()

  for (const inputan of props.result?.item?.inputans || []) {
    if (inputan.id === targetInputId) continue
    if (!['number', 'calculated'].includes(inputan.inputType)) continue

    const value = getInputNumericValue(inputan)
    if (value == null) continue

    scope.set(normalizeFormulaKey(inputan.label), value)

    const identifier = toFormulaIdentifier(inputan.label)
    if (identifier) scope.set(identifier, value)
  }

  return scope
}

function evaluateCalculatedFormula(inputan: ExamInput) {
  const formula = inputan.formula?.formula?.trim()
  if (!formula) return null

  const scope = buildFormulaScope(inputan.id)
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

  const fn = new Function(
    'round',
    'abs',
    'min',
    'max',
    'pow',
    'sqrt',
    'ceil',
    'floor',
    ...args,
    `"use strict"; return (${expression});`
  )

  try {
    const round = (value: number, precision = 0) => {
      const factor = 10 ** precision
      return Math.round(value * factor) / factor
    }
    const result = Number(fn(
      round,
      Math.abs,
      Math.min,
      Math.max,
      Math.pow,
      Math.sqrt,
      Math.ceil,
      Math.floor,
      ...values
    ))

    if (!Number.isFinite(result)) return null
    return Math.round(result * 10000) / 10000
  } catch {
    return null
  }
}

function recomputeCalculatedDrafts(clearIncomplete = false) {
  const calculatedInputs = (props.result?.item?.inputans || [])
    .filter(inputan => inputan.inputType === 'calculated')

  for (let pass = 0; pass < calculatedInputs.length; pass += 1) {
    let changed = false

    for (const inputan of calculatedInputs) {
      const draft = getInputDraft(inputan.id)
      const calculated = evaluateCalculatedFormula(inputan)

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

function seedDraftsFromExistingResults() {
  if (!props.result?.exam?.results) return

  const resultMap = new Map(
    (props.result?.exam?.results || []).map(result => [result.inputanId, result])
  )

  for (const inputan of props.result.item?.inputans || []) {
    const existing = resultMap.get(inputan.id)
    const draft = getInputDraft(inputan.id)

    if (existing?.valueNumber != null && draft.valueNumber === undefined) {
      draft.valueNumber = String(existing.valueNumber)
    }
    if (existing?.valueString != null && draft.valueString === undefined) {
      draft.valueString = existing.valueString
    }
    if (existing?.valueSelected != null && draft.valueSelected === undefined) {
      draft.valueSelected = existing.valueSelected
    }
    if (existing?.valueCalculated != null && draft.valueCalculated === undefined) {
      draft.valueCalculated = String(existing.valueCalculated)
    }
  }

  recomputeCalculatedDrafts(false)
}

function buildResultsPayload() {
  recomputeCalculatedDrafts(true)

  const inputs = props.result?.item?.inputans || []
  const payload: ResultPayload[] = []

  for (const inputan of inputs) {
    const draft = resultDrafts.value[inputan.id] ?? {}
    const base: ResultPayload = { inputanId: inputan.id }

    if (inputan.inputType === 'number') {
      if (getDraftText(draft.valueNumber)) {
        payload.push({ ...base, valueNumber: Number(draft.valueNumber) })
      }
      continue
    }

    if (inputan.inputType === 'selected') {
      const valueSelected = getDraftText(draft.valueSelected)
      const valueString = valueSelected && isOtherSelected(inputan) ? getDraftText(draft.valueString) : ''
      if (valueSelected) {
        payload.push({ ...base, valueSelected, ...(valueString ? { valueString } : {}) })
      }
      continue
    }

    if (inputan.inputType === 'calculated') {
      if (getDraftText(draft.valueCalculated)) {
        payload.push({ ...base, valueCalculated: Number(draft.valueCalculated) })
      }
      continue
    }

    const valueString = getDraftText(draft.valueString)
    if (valueString) {
      payload.push({ ...base, valueString })
    }
  }

  return payload
}

async function handleSaveResult() {
  if (!props.result?.exam?.id) {
    toast.add({
      title: 'Error',
      description: 'Invalid exam ID',
      color: 'error'
    })
    return
  }

  if (isResultBlockedBySample.value) {
    toast.add({
      title: 'Result terkunci',
      description: sampleBlockedDescription.value,
      color: 'warning'
    })
    return
  }

  const results = buildResultsPayload()
  if (results.length === 0) {
    toast.add({
      title: 'No results',
      description: 'Please fill in at least one result field',
      color: 'warning'
    })
    return
  }

  saving.value = true
  try {
    if (isExternalDoctorWorkspace.value) {
      await api.post(`/mcu/exams/${props.result?.exam?.id}/external-result`, {
        examItemId: props.result.id,
        results,
        submit: false
      })
    } else {
      await api.post(`/mcu/exams/${props.result?.exam?.id}/results`, { results })
    }

    toast.add({
      title: 'Draft saved',
      description: 'Results saved without completing the exam',
      color: 'success'
    })

    emit('resultSaved', props.result)
  } catch (error: unknown) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    const message = response?.data?.message || 'Failed to save results'

    toast.add({
      title: 'Error',
      description: message,
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}

async function handleSubmitResult() {
  if (!props.result?.exam?.id) {
    toast.add({
      title: 'Error',
      description: 'Invalid exam ID',
      color: 'error'
    })
    return
  }

  if (isResultBlockedBySample.value) {
    toast.add({
      title: 'Result terkunci',
      description: sampleBlockedDescription.value,
      color: 'warning'
    })
    return
  }

  const results = buildResultsPayload()
  if (results.length === 0) {
    toast.add({
      title: 'No results',
      description: 'Please fill in at least one result field',
      color: 'warning'
    })
    return
  }

  submitting.value = true
  try {
    if (isExternalDoctorWorkspace.value) {
      await api.post(`/mcu/exams/${props.result?.exam?.id}/external-result`, {
        examItemId: props.result.id,
        results,
        submit: true
      })

      toast.add({
        title: 'Hasil disubmit',
        description: 'Hasil dokter luar berhasil dikirim.',
        color: 'success'
      })

      emit('resultSaved', props.result)
      return
    }

    await api.post(`/mcu/exams/${props.result?.exam?.id}/results`, { results })
    await api.post(`/mcu/exams/${props.result?.exam?.id}/results/submit`, {
      departmentId: props.result.item?.department?.id
    })

    toast.add({
      title: 'Results submitted',
      description: 'Hasil masuk approval department.',
      color: 'success'
    })

    emit('resultSaved', props.result)
    emit('close')
  } catch (error: unknown) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    toast.add({
      title: 'Submit failed',
      description: response?.data?.message || 'Failed to submit results',
      color: 'error'
    })
  } finally {
    submitting.value = false
  }
}

watch(
  () => props.result,
  () => {
    resultDrafts.value = {}
    if (props.result) {
      seedDraftsFromExistingResults()
      if (props.result.id) {
        fetchAllAudit()
        loadGroupResults()
        void loadExternalAttachmentPreview()
      } else {
        resetAudit()
      }
    } else {
      resetAudit()
    }
  },
  { immediate: true }
)

onMounted(() => {
  if (props.result) {
    seedDraftsFromExistingResults()
    void loadExternalAttachmentPreview()
  }
})

onBeforeUnmount(() => {
  cleanupExternalAttachmentPreview()
})
</script>

<template>
  <BaseFullscreenModal
    :open="open"
    :embedded="embedded"
    :hide-footer="embedded"
    @close="emit('close')"
  >
    <template #header>
      <div class="flex flex-wrap items-start gap-3 sm:gap-4">
        <UButton
          v-if="embedded"
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          size="sm"
          aria-label="Kembali ke daftar result"
          class="mt-0.5 shrink-0"
          @click="emit('close')"
        />

        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <UBadge color="primary" variant="soft" :label="result?.queueCode || '-'" />
            <UBadge
              v-if="result"
              :label="getTypeLabel(result.resultTiming)"
              :color="result.resultTiming === 'deferred' ? 'primary' : 'success'"
              variant="subtle"
            />
            <UBadge
              v-if="result"
              :label="getStatusLabel(result.status)"
              :color="getStatusColor(result.status)"
              variant="subtle"
            />
            <UButton
              v-if="result?.item?.department?.code?.toUpperCase() === 'DENTAL' && result.exam?.id"
              icon="i-lucide-stethoscope"
              size="xs"
              color="primary"
              variant="soft"
              :to="`/rooms/dental/${result?.exam?.id}`"
            >
              Hasil Dental
            </UButton>
          </div>
          <h1 class="mt-2 truncate text-xl font-semibold tracking-tight text-highlighted sm:text-2xl">
            {{ isExternalDoctorWorkspace ? formatPatientName(result?.patient) : result?.item?.name || '-' }}
          </h1>
          <p class="mt-1 text-sm text-muted">
            {{ isExternalDoctorWorkspace ? getExternalHeaderSubtitle() : `${formatPatientName(result?.patient)} - ${getDepartmentLabel(result?.item?.department)}` }}
          </p>
        </div>

        <UButton
          v-if="!embedded"
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="emit('close')"
        />

        <UButton
          v-if="embedded && result?.departmentResultStatus === 'DEPARTMENT_REVIEW'"
          color="success"
          :loading="approving"
          :disabled="!canApproveCurrentResult"
          :title="approveButtonTitle"
          icon="i-lucide-check-circle"
          @click="handleApproveResult"
        >
          Approve
        </UButton>

        <div
          v-if="embedded && (result?.status === 'pending' || result?.departmentResultStatus === 'RETURNED_TO_DEPARTMENT') && (!hasExternalResultContext || result?.exam?.externalStatus === 'PROCESSING')"
          class="flex w-full items-center justify-end gap-2 sm:w-auto"
        >
          <UButton
            color="neutral"
            variant="soft"
            :loading="saving"
            :disabled="submitting || !canEditCurrentResult || isResultBlockedBySample"
            icon="i-lucide-save"
            @click="handleSaveResult"
          >
            Simpan Draft
          </UButton>
          <UButton
            color="primary"
            :loading="submitting"
            :disabled="saving || !canSubmitCurrentResult || isResultBlockedBySample || (hasExternalResultContext && externalProcessingOverdue)"
            icon="i-lucide-send"
            @click="handleSubmitResult"
          >
            Submit Hasil
          </UButton>
        </div>
      </div>
    </template>

    <template #body>
      <div v-if="isReturnedToDepartment" class="space-y-1 p-3 sm:px-4">
        <UAlert
          icon="i-lucide-rotate-ccw"
          color="error"
          variant="soft"
          title="Hasil dikembalikan oleh dokter"
          :description="returnReason || 'Perbaiki hasil yang ditandai lalu submit ulang.'"
        >
          <template #description>
            <div class="mt-1 space-y-1">
              <p>{{ returnReason || 'Perbaiki hasil yang ditandai lalu submit ulang.' }}</p>
              <p v-if="returnRevisionItems.length" class="text-xs">
                Item yang perlu diperbaiki:
                <span
                  v-for="(rev, revIdx) in returnRevisionItems"
                  :key="rev.inputanId ?? revIdx"
                  class="mr-2 inline-flex items-center gap-1 rounded bg-error/10 px-1.5 py-0.5"
                >
                  {{ returnItemLabel(rev.inputanId) }}{{ rev.reason ? ` — ${rev.reason}` : '' }}
                </span>
              </p>
            </div>
          </template>
        </UAlert>
      </div>

      <div
        v-if="result && isExternalDoctorWorkspace"
        class="flex h-[calc(120dvh-5rem)] min-h-0 flex-col overflow-hidden bg-default px-4 py-4 sm:px-6"
      >
        <UCard class="mb-4 shrink-0 overflow-hidden border border-default/80 shadow-sm">
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <h4 class="text-sm font-semibold uppercase tracking-wide text-muted">
                Konteks Pemeriksaan
              </h4>
              <div class="flex items-center gap-2">
                <UButton
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-chevron-up"
                  aria-label="Tutup atau buka konteks"
                  :class="externalContextOpen ? '' : 'rotate-180'"
                  @click="externalContextOpen = !externalContextOpen"
                />
                <UBadge
                  :label="`Status: ${resultWorkflowLabel || result.resultStatus || '-'}`"
                  :color="getStatusColor(result.resultStatus === 'SUBMITTED' ? 'completed' : result.resultStatus === 'RETURNED' ? 'error' : 'pending')"
                  variant="soft"
                  size="sm"
                />
                <UBadge :label="result?.exam?.externalStatus || 'ASSIGNED'" :color="externalStatusColor[result?.exam?.externalStatus || 'ASSIGNED'] ?? 'neutral'" variant="subtle" />
              </div>
            </div>
          </template>

          <div v-show="externalContextOpen">
          <!-- Batas waktu pengerjaan dokter luar: 3 jam setelah mulai diproses -->
          <div
            v-if="result?.exam?.externalStatus === 'PROCESSING' && externalProcessingDeadline"
            class="mb-3 flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3"
            :class="externalProcessingOverdue ? 'border-error/40 bg-error/5' : 'border-primary/20 bg-primary/5'"
          >
            <UIcon
              :name="externalProcessingOverdue ? 'i-lucide-alert-triangle' : 'i-lucide-clock'"
              class="size-5 shrink-0"
              :class="externalProcessingOverdue ? 'text-error' : 'text-primary'"
            />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold" :class="externalProcessingOverdue ? 'text-error' : 'text-highlighted'">
                {{ externalProcessingOverdue ? 'Batas waktu submit sudah lewat' : 'Pemeriksaan sedang diproses dokter luar' }}
              </p>
              <p class="text-xs text-muted">
                Mulai {{ formatDateTime(result.exam?.externalProcessingStartedAt) }} ·
                Deadline {{ formatDateTime(result.exam?.externalProcessingDeadline) }} ·
                <span class="font-semibold" :class="externalProcessingOverdue ? 'text-error' : 'text-primary'">
                  {{ externalProcessingRemainingLabel }}
                </span>
              </p>
            </div>
            <UBadge
              label="Batas 3 jam"
              :color="externalProcessingOverdue ? 'error' : 'primary'"
              variant="solid"
              size="sm"
            />
          </div>
          <div
            v-else-if="result?.exam?.externalStatus === 'ASSIGNED'"
            class="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-default/70 bg-muted/30 px-4 py-3"
          >
            <UIcon name="i-lucide-play-circle" class="size-5 shrink-0 text-muted" />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-highlighted">
                Pemeriksaan belum diproses
              </p>
              <p class="text-xs text-muted">
                Mulai pemeriksaan untuk mengaktifkan form hasil. Batas waktu submit 3 jam setelah mulai.
              </p>
            </div>
            <UButton
              size="sm"
              color="primary"
              :loading="externalStarting"
              icon="i-lucide-play"
              @click="startExternalProcessing"
            >
              Mulai Proses
            </UButton>
          </div>
          <dl class="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
            <div class="min-w-0">
              <dt class="text-xs uppercase tracking-wide text-muted">
                No. RM / Antrian
              </dt><dd class="mt-1 break-words font-mono font-semibold text-highlighted">
                {{ result.patient?.PatientId || '-' }} - {{ result.queueCode }}
              </dd>
            </div>
            <div class="min-w-0">
              <dt class="text-xs uppercase tracking-wide text-muted">
                Item Pemeriksaan
              </dt><dd class="mt-1 break-words font-semibold text-highlighted">
                {{ result.item?.name || '-' }} <span class="font-mono text-muted">{{ result.item?.code || '' }}</span>
              </dd>
            </div>
            <div class="min-w-0">
              <dt class="text-xs uppercase tracking-wide text-muted">
                Dokter Luar
              </dt><dd class="mt-1 break-words font-semibold text-highlighted">
                {{ formatExternalActor(result?.exam?.assignedExternalUser, result?.exam?.assignedExternalUserId) }}
              </dd>
            </div>
            <div class="min-w-0">
              <dt class="text-xs uppercase tracking-wide text-muted">
                Petugas Pengambil
              </dt><dd class="mt-1 break-words font-semibold text-highlighted">
                {{ getExternalCollectorLabel() }}
              </dd>
            </div>
            <div class="min-w-0">
              <dt class="text-xs uppercase tracking-wide text-muted">
                Upload File
              </dt><dd class="mt-1 break-words font-semibold text-highlighted">
                {{ getExternalUploadLabel() }}
              </dd>
            </div>
            <div class="min-w-0">
              <dt class="text-xs uppercase tracking-wide text-muted">
                Dokter Luar
              </dt><dd class="mt-1 break-words font-semibold text-highlighted">
                {{ formatExternalActor(result?.exam?.assignedExternalUser, result?.exam?.assignedExternalUserId) }}
              </dd>
            </div>
          </dl>
          </div> <!-- v-show externalContextOpen -->
        </UCard>

        <div class="grid min-h-0 flex-1 gap-4" :class="isExternalInputTwoColumns ? 'xl:grid-cols-[minmax(620px,1fr)_minmax(560px,1fr)]' : 'xl:grid-cols-[minmax(760px,1.55fr)_minmax(360px,.75fr)]'">
          <UCard class="flex min-h-0 flex-col overflow-hidden border border-default/80 shadow-sm" :ui="{ body: 'flex min-h-0 flex-1 flex-col p-0 sm:p-0' }">
            <div class="mx-4 mt-4 mb-4 flex min-h-[560px] flex-1 flex-col overflow-hidden rounded-t-lg bg-muted/30">
              <div v-if="externalAttachmentLoading" class="flex h-full items-center justify-center text-sm text-muted">
                <UIcon name="i-lucide-loader-circle" class="mr-2 size-4 animate-spin" />Memuat PDF...
              </div>
              <iframe
                v-else-if="externalAttachmentPreviewUrl"
                :src="externalAttachmentPreviewUrl"
                title="PDF hasil pemeriksaan"
                class="h-full w-full flex-1 border-0 bg-muted/30"
              />
              <div v-else class="flex h-full items-center justify-center p-6">
                <UAlert
                  color="warning"
                  variant="soft"
                  title="PDF belum tersedia"
                  :description="externalAttachmentError || 'Nurse perlu mengunggah PDF sebelum dokter luar mengisi hasil.'"
                  class="max-w-md"
                />
              </div>
            </div>
            <div class="mx-4 mb-8 flex min-h-16 items-center justify-between gap-3 rounded-b-lg border border-t-0 border-default/80 bg-default px-4 py-4 text-xs text-muted">
              <span class="min-w-0 truncate">{{ result.exam?.externalAttachment?.originalName || 'Dokumen PDF pemeriksaan' }}</span>
              <span class="shrink-0 font-semibold text-highlighted">PDF Preview</span>
            </div>
          </UCard>

          <UCard class="flex min-h-0 max-h-full flex-col overflow-hidden border border-default/80 shadow-sm" :ui="{ body: 'flex min-h-0 flex-1 flex-col overflow-hidden p-0 sm:p-0' }">
            <template #header>
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="min-w-0">
                  <h4 class="text-base font-semibold text-highlighted">
                    Input Hasil {{ result.item?.name || 'Pemeriksaan' }}
                  </h4><p class="mt-1 text-xs text-muted">
                    Isi parameter berdasarkan PDF di sebelah kiri.
                  </p>
                </div>
                <div class="inline-flex overflow-hidden rounded-lg border border-default bg-default">
                  <button
                    type="button"
                    class="px-3 py-2 text-xs font-semibold"
                    :class="externalInputColumns === 'one' ? 'bg-primary text-inverted' : 'text-muted hover:bg-muted/50'"
                    @click="externalInputColumns = 'one'"
                  >
                    Input 1 Kolom
                  </button>
                  <button
                    type="button"
                    class="border-l border-default px-3 py-2 text-xs font-semibold"
                    :class="externalInputColumns === 'two' ? 'bg-primary text-inverted' : 'text-muted hover:bg-muted/50'"
                    @click="externalInputColumns = 'two'"
                  >
                    Input 2 Kolom
                  </button>
                </div>
              </div>
            </template>
            <div class="border-b border-default/70 bg-info/10 px-4 py-3 text-xs text-info-700 dark:text-info-300">
              Dokter luar hanya mengisi hasil terstruktur. Assignment dan upload PDF dikelola oleh nurse.
            </div>
            <div v-if="result.item?.inputans?.length" class="grid min-h-0 flex-1 content-start gap-3 overflow-y-auto overscroll-contain px-4 pt-4 pb-28" :class="isExternalInputTwoColumns ? 'lg:grid-cols-2' : 'grid-cols-1'">
              <div v-for="inputan in visibleInputans" :key="inputan.id" class="min-w-0 rounded-lg border border-default/80 bg-default/70 p-3">
                <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">{{ inputan.label }} <span v-if="!inputan.allowBlank" class="text-error">*</span></label>
                <input
                  v-if="inputan.inputType === 'number'"
                  v-model="getInputDraft(inputan.id).valueNumber"
                  type="number"
                  :disabled="!canEditCurrentResult || isResultBlockedBySample"
                  :class="getResultInputClass(inputan)"
                  placeholder="Masukkan hasil"
                  @input="recomputeCalculatedDrafts(true)"
                >
                <input
                  v-else-if="inputan.inputType === 'string'"
                  v-model="getInputDraft(inputan.id).valueString"
                  type="text"
                  :disabled="!canEditCurrentResult || isResultBlockedBySample"
                  class="w-full rounded-lg border border-default bg-default px-3 py-2 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-70"
                  placeholder="Masukkan hasil"
                >
                <template v-else-if="inputan.inputType === 'selected'">
                  <select v-model="getInputDraft(inputan.id).valueSelected" :disabled="!canEditCurrentResult || isResultBlockedBySample" class="w-full rounded-lg border border-default bg-default px-3 py-2 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-70">
                    <option value="">
                      Pilih hasil
                    </option><option v-for="opsi in inputan.opsis" :key="opsi.id" :value="opsi.value">
                      {{ opsi.label }}
                    </option>
                  </select>
                  <div v-if="hasOtherOption(inputan) && isOtherSelected(inputan)" class="mt-2">
                    <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">Detail {{ inputan.label }}</label><input
                      v-model="getInputDraft(inputan.id).valueString"
                      type="text"
                      :disabled="!canEditCurrentResult || isResultBlockedBySample"
                      class="w-full rounded-lg border border-info/50 bg-info/5 px-3 py-2 text-sm outline-none transition focus:border-info focus:ring-2 focus:ring-info/15 disabled:cursor-not-allowed disabled:opacity-70"
                      placeholder="Tuliskan detail jika memilih Others"
                    >
                  </div>
                </template>
                <input
                  v-else-if="inputan.inputType === 'calculated'"
                  v-model="getInputDraft(inputan.id).valueCalculated"
                  type="number"
                  disabled
                  :class="getResultInputClass(inputan)"
                  placeholder="Dihitung otomatis"
                >
                <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span v-if="getVisibleNormalRanges(inputan).length">Normal: {{ formatNormalRange(getVisibleNormalRanges(inputan)[0]!, inputan.uom) }}</span><span v-else>Normal: belum tersedia</span><span class="font-mono">ID: {{ getInputDisplayId(inputan) }}</span>
                </div>
              </div>
              <div class="min-w-0 rounded-lg border border-default/80 bg-default/70 p-3" :class="isExternalInputTwoColumns ? 'lg:col-span-2' : ''">
                <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">Kesimpulan / Catatan</label><UTextarea :rows="4" placeholder="Tambahkan interpretasi atau catatan dokter..." class="w-full" />
              </div>
            </div>
            <div v-else class="flex min-h-72 items-center justify-center p-6">
              <UAlert
                color="warning"
                variant="soft"
                title="Template hasil belum tersedia"
                description="Item ini belum memiliki parameter input hasil."
              />
            </div>
            <div class="shrink-0 border-t border-default/70 px-4 pt-4 pb-10">
              <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                <!-- Status manual hanya untuk item bukan external result -->
                <template v-if="!hasExternalResultContext">
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-muted">Ubah Status:</span>
                    <USelect
                      v-model="selectedResultStatus"
                      :items="resultStatusOptions"
                      size="xs"
                      class="w-56"
                    />
                    <UButton
                      size="xs"
                      color="primary"
                      variant="soft"
                      :loading="statusSaving"
                      :disabled="selectedResultStatus === result.resultStatus"
                      @click="handleUpdateResultStatus"
                    >
                      Update Status
                    </UButton>
                  </div>
                  <div class="flex flex-col gap-2 sm:flex-row">
                    <UButton
                      color="secondary"
                      variant="soft"
                      :loading="statusSaving"
                      :disabled="selectedResultStatus === 'READY'"
                      icon="i-lucide-play"
                      @click="setResultStatus('READY')"
                    >
                      Mulai Proses
                    </UButton>
                    <UButton
                      color="neutral"
                      variant="soft"
                      :loading="saving"
                      :disabled="submitting || !canEditCurrentResult || isResultBlockedBySample"
                      icon="i-lucide-save"
                      @click="handleSaveResult"
                    >
                      Simpan Draft
                    </UButton><UButton
                      color="primary"
                      :loading="submitting"
                      :disabled="saving || !canSubmitCurrentResult || isResultBlockedBySample"
                      icon="i-lucide-send"
                      @click="handleSubmitResult"
                    >
                      Submit Hasil
                    </UButton>
                  </div>
                </template>

                <!-- Dokter luar: tombol Simpan Draft + Submit setelah Mulai Proses (PROCESSING) -->
                <template v-else-if="result?.exam?.externalStatus === 'PROCESSING'">
                  <div class="flex flex-col gap-2 sm:flex-row">
                    <UButton
                      color="neutral"
                      variant="soft"
                      :loading="saving"
                      :disabled="submitting || !canEditCurrentResult || isResultBlockedBySample"
                      icon="i-lucide-save"
                      @click="handleSaveResult"
                    >
                      Simpan Draft
                    </UButton>
                    <UButton
                      color="primary"
                      :loading="submitting"
                      :disabled="saving || !canSubmitCurrentResult || isResultBlockedBySample || externalProcessingOverdue"
                      icon="i-lucide-send"
                      @click="handleSubmitResult"
                    >
                      Submit Hasil
                    </UButton>
                  </div>
                </template>
              </div>
            </div>
          </UCard>
        </div>
      </div>
      <div
        v-else-if="result"
        class="flex min-h-0 flex-col bg-gradient-to-b from-default via-default to-muted/10"
        :class="embedded ? 'min-h-full overflow-visible' : 'h-full overflow-hidden'"
      >
        <div v-if="isResultBlockedBySample" class="border-b border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          <div class="flex items-start gap-2">
            <UIcon name="i-lucide-alert-triangle" class="mt-0.5 size-4 shrink-0" />
            <div class="min-w-0">
              <p class="text-sm font-semibold">
                Result dikunci karena sample
              </p>
              <p class="text-xs">
                {{ sampleBlockedDescription }}
              </p>
              <div v-if="result?.sampleImpacts?.length" class="mt-2 flex flex-wrap gap-2 text-[11px]">
                <UBadge
                  v-for="impact in result.sampleImpacts"
                  :key="impact.collectionId"
                  color="warning"
                  variant="soft"
                  :label="getSampleImpactLabel(impact)"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Peringatan untuk petugas: status dokter luar -->
        <div v-if="hasExternalResultContext && !isExternalDoctor && result?.exam?.externalStatus" class="border-b px-4 py-3" :class="{
          'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200': result?.exam?.externalStatus === 'ASSIGNED',
          'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200': result?.exam?.externalStatus === 'PROCESSING',
          'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200': result?.exam?.externalStatus === 'FILLED',
          'border-default bg-muted/30': result?.exam?.externalStatus === 'CANCELLED',
        }">
          <div class="flex items-start gap-2">
            <UIcon :name="result?.exam?.externalStatus === 'PROCESSING' ? 'i-lucide-clock' : result?.exam?.externalStatus === 'ASSIGNED' ? 'i-lucide-alert-triangle' : 'i-lucide-check-circle'" class="mt-0.5 size-4 shrink-0" />
            <div class="min-w-0">
              <p v-if="result?.exam?.externalStatus === 'ASSIGNED'" class="text-sm font-semibold">
                Dokter luar belum memulai pemeriksaan
              </p>
              <p v-else-if="result?.exam?.externalStatus === 'PROCESSING'" class="text-sm font-semibold">
                Dokter luar sedang mengerjakan pemeriksaan
                <span v-if="externalProcessingOverdue" class="text-error"> — batas waktu sudah lewat (3 jam)</span>
                <span v-else> — {{ externalProcessingRemainingLabel }}</span>
              </p>
              <p v-else-if="result?.exam?.externalStatus === 'FILLED'" class="text-sm font-semibold">
                Dokter luar sudah mengisi hasil
              </p>
              <p v-else class="text-sm font-semibold">Penugasan dibatalkan</p>
              <p class="text-xs opacity-80">
                {{ formatExternalActor(result?.exam?.assignedExternalUser, result?.exam?.assignedExternalUserId) }}
                <template v-if="result?.exam?.externalStatus === 'PROCESSING'">
                  · Mulai {{ formatDateTime(result?.exam?.externalProcessingStartedAt) }}
                </template>
                <template v-else-if="result?.exam?.externalStatus === 'ASSIGNED'">
                  · Ditugaskan {{ formatDateTime(result?.exam?.externalAssignedAt) }}
                </template>
              </p>
            </div>
          </div>
        </div>

        <div class="shrink-0 border-b border-default/70 px-4 py-4 sm:px-6">
          <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div class="rounded-2xl border border-default/70 bg-default/80 p-4 shadow-sm">
              <p class="text-xs uppercase tracking-wide text-muted">
                Nomor Antrean
              </p>
              <p class="mt-2 text-lg font-semibold text-highlighted">
                {{ result.queueCode }}
              </p>
            </div>
            <div v-if="!hasExternalResultContext" class="rounded-2xl border border-default/70 bg-default/80 p-4 shadow-sm">
              <p class="text-xs uppercase tracking-wide text-muted">
                Status Proses
              </p>
              <div class="mt-2">
                <USelect
                  v-model="selectedResultStatus"
                  :items="resultStatusOptions"
                  size="xs"
                  class="w-full"
                />
                <UButton
                  class="mt-2 w-full"
                  size="xs"
                  color="primary"
                  variant="soft"
                  :loading="statusSaving"
                  :disabled="selectedResultStatus === result.resultStatus"
                  @click="handleUpdateResultStatus"
                >
                  Update Status
                </UButton>
              </div>
            </div>
            <div class="rounded-2xl border border-default/70 bg-default/80 p-4 shadow-sm">
              <p class="text-xs uppercase tracking-wide text-muted">
                Tipe Hasil
              </p>
              <div class="mt-2">
                <UBadge
                  :label="getTypeLabel(result.resultTiming)"
                  :color="result.resultTiming === 'deferred' ? 'primary' : 'success'"
                  variant="soft"
                />
              </div>
            </div>
            <div class="rounded-2xl border border-default/70 bg-default/80 p-4 shadow-sm">
              <p class="text-xs uppercase tracking-wide text-muted">
                Waktu Check-in
              </p>
              <p class="mt-2 text-sm font-semibold text-highlighted">
                {{ formatDateTime(result.checkinAt) }}
              </p>
            </div>
          </div>
        </div>

        <div
          class="min-h-0 flex-1 px-4 pt-4 pb-28 sm:px-6 sm:pt-5 sm:pb-32"
          :class="embedded ? 'overflow-visible' : 'overflow-y-auto'"
        >
          <div class="mx-auto grid w-full max-w-[1500px] gap-5 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
            <div class="space-y-5 lg:sticky lg:top-24 lg:self-start">
              <UCard class="border border-default/80 bg-default/80 shadow-sm">
                <template #header>
                  <div class="flex items-center justify-between">
                    <h4 class="text-sm font-semibold uppercase tracking-wide text-muted">
                      Ringkasan Pasien
                    </h4>
                    <UIcon name="i-lucide-user-round" class="size-4 text-muted" />
                  </div>
                </template>

                <dl class="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                  <div>
                    <dt class="text-xs uppercase tracking-wide text-muted">
                      Nama Pasien
                    </dt>
                    <dd class="mt-1 text-sm font-semibold text-highlighted">
                      {{ formatPatientName(result.patient) }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-xs uppercase tracking-wide text-muted">
                      Nomor Rekam Medis
                    </dt>
                    <dd class="mt-1 text-sm font-semibold text-highlighted">
                      {{ result.patient?.PatientId || '-' }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-xs uppercase tracking-wide text-muted">
                      Tanggal Lahir
                    </dt>
                    <dd class="mt-1 text-sm font-semibold text-highlighted">
                      {{ formatDate(result.patient?.dob) }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-xs uppercase tracking-wide text-muted">
                      Jenis Kelamin
                    </dt>
                    <dd class="mt-1 text-sm font-semibold text-highlighted">
                      {{ result.patient?.gender === 'MALE' ? 'Male' : result.patient?.gender === 'FEMALE' ? 'Female' : '-' }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-xs uppercase tracking-wide text-muted">
                      Usia Saat Pemeriksaan
                    </dt>
                    <dd class="mt-1 text-sm font-semibold text-highlighted">
                      {{ getAgeAtExamLabel(result.patient, result.checkinAt) }}
                    </dd>
                  </div>
                </dl>
              </UCard>

              <UCard class="border border-default/80 bg-default/80 shadow-sm">
                <template #header>
                  <div class="flex items-center justify-between">
                    <h4 class="text-sm font-semibold uppercase tracking-wide text-muted">
                      Informasi Pemeriksaan
                    </h4>
                    <UIcon name="i-lucide-clipboard-list" class="size-4 text-muted" />
                  </div>
                </template>

                <dl class="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                  <div>
                    <dt class="text-xs uppercase tracking-wide text-muted">
                      Pemeriksaan
                    </dt>
                    <dd class="mt-1 text-sm font-semibold text-highlighted">
                      {{ result.item?.name || '-' }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-xs uppercase tracking-wide text-muted">
                      Department
                    </dt>
                    <dd class="mt-1 text-sm font-semibold text-highlighted">
                      {{ getDepartmentLabel(result.item?.department) }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-xs uppercase tracking-wide text-muted">
                      ID Antrean
                    </dt>
                    <dd class="mt-1 text-sm font-semibold text-highlighted">
                      {{ result.queueEntryId }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-xs uppercase tracking-wide text-muted">
                      Jenis Pemeriksaan
                    </dt>
                    <dd class="mt-1">
                      <UBadge :color="getExamTypeColor(result.exam?.examType)" variant="subtle">
                        {{ result.exam?.examType === 'RAWAT_JALAN' ? 'Rawat Jalan' : 'MCU' }}
                      </UBadge>
                    </dd>
                  </div>
                  <div v-if="result.exam?.examCode">
                    <dt class="text-xs uppercase tracking-wide text-muted">
                      Exam Code (Edisi)
                    </dt>
                    <dd class="mt-1 text-sm font-semibold text-highlighted font-mono">
                      {{ result?.exam?.examCode }}
                    </dd>
                  </div>
                  <div v-if="hasExternalResultContext">
                    <dt class="text-xs uppercase tracking-wide text-muted">
                      Dokter Luar
                    </dt>
                    <dd class="mt-1 space-y-2">
                      <UBadge v-if="result?.exam?.externalStatus" :color="externalStatusColor[result?.exam?.externalStatus] ?? 'neutral'" variant="subtle">
                        {{ result?.exam?.externalStatus }}
                      </UBadge>
                      <span v-else class="text-sm text-muted">-</span>

                      <div v-if="result?.exam?.externalStatus === 'ASSIGNED' || result?.exam?.externalStatus === 'PROCESSING' || result?.exam?.externalStatus === 'FILLED'" class="text-sm font-medium text-highlighted">
                        {{ formatExternalActor(result?.exam?.assignedExternalUser, result?.exam?.assignedExternalUserId) }}
                      </div>

                      <div v-if="!isExternalDoctor && (!result?.exam?.externalStatus || result?.exam?.externalStatus === 'CANCELLED')" class="flex items-center gap-2">
                        <USelectMenu
                          v-model="selectedExternalDoctor"
                          :items="externalDoctors"
                          value-key="id"
                          label-key="name"
                          placeholder="Pilih dokter luar"
                          class="min-w-48"
                        />
                        <UButton
                          size="xs"
                          color="primary"
                          variant="soft"
                          :loading="externalSaving"
                          :disabled="!selectedExternalDoctor"
                          @click="assignExternalDoctor"
                        >
                          Tugaskan
                        </UButton>
                      </div>

                      <div v-if="!isExternalDoctor && (result?.exam?.externalStatus === 'ASSIGNED' || result?.exam?.externalStatus === 'PROCESSING')" class="flex items-center gap-2">
                        <UButton
                          v-if="result?.exam?.externalStatus === 'ASSIGNED'"
                          size="xs"
                          color="error"
                          variant="soft"
                          :loading="externalSaving"
                          @click="openCancelExternal"
                        >
                          Batalkan
                        </UButton>
                        <UButton
                          size="xs"
                          color="success"
                          variant="soft"
                          :loading="externalSaving"
                          @click="uploadExternalResult"
                        >
                          Upload Hasil
                        </UButton>
                        <UInput
                          type="file"
                          accept="application/pdf"
                          size="xs"
                          @change="(e: any) => (externalFile = e?.target?.files?.[0] ?? null)"
                        />
                      </div>

                      <p v-if="isExternalDoctor" class="text-xs text-muted">
                        PDF hasil berasal dari nurse. Anda mengisi hasil pemeriksaan terstruktur di bawah.
                      </p>
                      <UButton
                        v-else-if="result.exam?.attachmentUrl || result.exam?.externalAttachment"
                        size="xs"
                        color="neutral"
                        variant="outline"
                        icon="i-lucide-file-text"
                        :loading="externalSaving"
                        @click="openExternalAttachment"
                      >
                        Lihat PDF
                      </UButton>
                    </dd>
                  </div>
                  <div>
                    <dt class="text-xs uppercase tracking-wide text-muted">
                      Waktu Selesai
                    </dt>
                    <dd class="mt-1 text-sm font-semibold text-highlighted">
                      {{ formatDateTime(result.completedAt) }}
                    </dd>
                  </div>
                </dl>
              </UCard>
            </div>

            <div class="flex min-w-0 flex-col gap-5">
              <HistoryTimeline
                class="order-2 mb-4 pb-2"
                :loading="auditLoading"
                :entries="entries"
                :work-history="result.workHistory"
                :queue-code="result.queueCode"
              />

              <UCard v-if="!isExternalResultFilled" class="order-1 border border-default/80 bg-default/80 shadow-sm">
                <template #header>
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <h4 class="text-sm font-semibold uppercase tracking-wide text-muted">
                        Input Hasil Pemeriksaan
                      </h4>
                      <p class="mt-1 text-xs text-muted">
                        Isi hasil sesuai parameter dan rentang normal pasien.
                      </p>
                    </div>
                    <UIcon name="i-lucide-file-pen-line" class="size-4 text-muted" />
                  </div>
                </template>

                <div v-if="result.item?.inputans?.length" class="overflow-hidden rounded-2xl border border-default/70">
                  <div class="overflow-x-auto">
                    <table class="min-w-[720px] w-full table-fixed divide-y divide-default/70">
                      <thead class="bg-muted/40">
                        <tr>
                          <th class="w-[28%] px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                            Parameter
                          </th>
                          <th class="w-[25%] px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                            Nilai Normal
                          </th>
                          <th class="w-[32%] px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                            Hasil
                          </th>
                          <th class="w-[15%] px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                            Status
                          </th>
                        </tr>
                      </thead>

                      <tbody class="divide-y divide-default/60 bg-default/80">
                        <tr
                          v-for="inputan in visibleInputans"
                          :key="inputan.id"
                          class="transition hover:bg-muted/20"
                          :class="inputanReturnNote(inputan.id) ? 'bg-error/5' : ''"
                        >
                          <td class="px-3 py-2.5 align-middle">
                            <div class="min-w-0">
                              <p class="text-sm font-semibold text-highlighted">
                                {{ inputan.label }}
                              </p>
                              <div class="mt-1 flex flex-wrap items-center gap-1.5">
                                <UBadge
                                  v-if="inputanReturnNote(inputan.id)"
                                  label="Perlu Revisi"
                                  color="error"
                                  variant="soft"
                                  size="sm"
                                />
                                <UBadge
                                  :label="getInputTypeLabel(inputan.inputType)"
                                  :color="inputan.inputType === 'selected' ? 'primary' : 'neutral'"
                                  variant="subtle"
                                  size="sm"
                                />
                                <span v-if="inputan.uom" class="text-xs text-muted">
                                  {{ inputan.uom }}
                                </span>
                              </div>
                              <p
                                v-if="inputanReturnNote(inputan.id)"
                                class="mt-1.5 rounded bg-error/10 px-2 py-1 text-xs font-medium text-error"
                              >
                                Catatan Dokter: {{ inputanReturnNote(inputan.id) }}
                              </p>
                            </div>
                          </td>

                          <td class="px-3 py-2.5 align-middle text-sm text-muted">
                            <div v-if="getVisibleNormalRanges(inputan).length" class="space-y-1">
                              <div
                                v-for="range in getVisibleNormalRanges(inputan)"
                                :key="range.id"
                                class="leading-tight"
                              >
                                <p class="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                                  {{ formatNormalRange(range, inputan.uom) }}
                                </p>
                                <p class="mt-0.5 text-[11px] text-muted">
                                  {{ formatRangeCriteria(range) }}
                                </p>
                              </div>
                            </div>
                            <span v-else class="text-xs text-amber-600 dark:text-amber-400">
                              Belum tersedia
                            </span>
                          </td>

                          <td class="px-3 py-2.5 align-middle">
                            <div class="max-w-sm">
                              <input
                                v-if="inputan.inputType === 'number'"
                                v-model="getInputDraft(inputan.id).valueNumber"
                                type="number"
                                :disabled="!canEditCurrentResult || isResultBlockedBySample"
                                :class="getResultInputClass(inputan)"
                                placeholder="Masukkan hasil"
                                @input="recomputeCalculatedDrafts(true)"
                              >

                              <input
                                v-else-if="inputan.inputType === 'string'"
                                v-model="getInputDraft(inputan.id).valueString"
                                type="text"
                                :disabled="!canEditCurrentResult || isResultBlockedBySample"
                                class="w-full rounded-lg border border-default bg-default px-3 py-2 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-70"
                                placeholder="Masukkan hasil"
                              >

                              <select
                                v-else-if="inputan.inputType === 'selected'"
                                v-model="getInputDraft(inputan.id).valueSelected"
                                :disabled="!canEditCurrentResult || isResultBlockedBySample"
                                class="w-full rounded-lg border border-default bg-default px-3 py-2 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                <option value="">
                                  Pilih hasil
                                </option>
                                <option
                                  v-for="opsi in inputan.opsis"
                                  :key="opsi.id"
                                  :value="opsi.value"
                                >
                                  {{ opsi.label }}
                                </option>
                              </select>

                              <div
                                v-if="inputan.inputType === 'selected' && hasOtherOption(inputan) && isOtherSelected(inputan)"
                                class="mt-2"
                              >
                                <label class="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
                                  Detail {{ inputan.label }}
                                </label>
                                <input
                                  v-model="getInputDraft(inputan.id).valueString"
                                  type="text"
                                  :disabled="!canEditCurrentResult || isResultBlockedBySample"
                                  class="w-full rounded-lg border border-info/50 bg-info/5 px-3 py-2 text-sm outline-none transition focus:border-info focus:ring-2 focus:ring-info/15 disabled:cursor-not-allowed disabled:opacity-70"
                                  placeholder="Tuliskan detail"
                                >
                              </div>

                              <input
                                v-else-if="inputan.inputType === 'calculated'"
                                v-model="getInputDraft(inputan.id).valueCalculated"
                                type="number"
                                disabled
                                :class="getResultInputClass(inputan)"
                                placeholder="Dihitung otomatis"
                              >
                              <p
                                v-if="inputan.formula?.formula"
                                class="mt-1 truncate text-[11px] text-muted"
                              >
                                {{ inputan.formula.formula }}
                              </p>
                            </div>
                          </td>

                          <td class="px-3 py-2.5 align-middle">
                            <UBadge
                              :label="getResultNormalityState(inputan).label"
                              :color="getResultNormalityState(inputan).color"
                              variant="soft"
                              size="sm"
                            />
                            <p
                              v-if="isResultOutsideNormalRange(inputan)"
                              class="mt-1 text-[11px] font-medium text-red-600 dark:text-red-400"
                            >
                              Di luar nilai normal
                            </p>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div v-else class="rounded-2xl border border-dashed border-default/70 bg-muted/20 p-6 text-center text-sm text-muted">
                  Belum ada parameter input untuk pemeriksaan ini.
                </div>
              </UCard>

              <!-- Hasil Dokter Luar - tampilkan jika externalStatus === 'FILLED' dan bukan external doctor workspace -->
              <UCard v-if="isExternalResultFilled" class="order-1 border border-emerald-200/50 bg-emerald-50/30 dark:border-emerald-900/20 dark:bg-emerald-950/20 shadow-sm">
                <template #header>
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <h4 class="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                        Hasil Dokter Luar (Sudah Submit)
                      </h4>
                      <p class="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                        Detail hasil yang diisi dokter luar: {{ formatExternalActor(result?.exam?.assignedExternalUser, result?.exam?.assignedExternalUserId) }} - {{ formatDateTime(result?.exam?.externalFilledAt) }}
                      </p>
                    </div>
                    <UIcon name="i-lucide-user-check" class="size-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </template>

                <div class="overflow-hidden rounded-2xl border border-emerald-200/50 dark:border-emerald-800/30">
                  <div class="overflow-x-auto">
                    <table class="min-w-[720px] w-full table-fixed divide-y divide-emerald-200/50 dark:divide-emerald-800/30">
                      <thead class="bg-emerald-50/50 dark:bg-emerald-950/30">
                        <tr>
                          <th class="w-[28%] px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                            Parameter
                          </th>
                          <th class="w-[25%] px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                            Nilai Normal
                          </th>
                          <th class="w-[32%] px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                            Hasil Dokter Luar
                          </th>
                          <th class="w-[15%] px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                            Grading
                          </th>
                        </tr>
                      </thead>

                      <tbody class="divide-y divide-emerald-200/50 dark:divide-emerald-800/30 bg-white/80 dark:bg-emerald-950/20">
                        <tr
                          v-for="inputan in visibleInputans"
                          :key="inputan.id"
                          class="transition hover:bg-emerald-50/30 dark:hover:bg-emerald-900/20"
                        >
                          <td class="px-3 py-2.5 align-middle">
                            <div class="min-w-0">
                              <p class="text-sm font-semibold text-highlighted">
                                {{ inputan.label }}
                              </p>
                              <div class="mt-1 flex flex-wrap items-center gap-1.5">
                                <UBadge
                                  :label="getInputTypeLabel(inputan.inputType)"
                                  :color="inputan.inputType === 'selected' ? 'primary' : 'neutral'"
                                  variant="subtle"
                                  size="sm"
                                />
                                <span v-if="inputan.uom" class="text-xs text-muted">
                                  {{ inputan.uom }}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td class="px-3 py-2.5 align-middle text-sm text-muted">
                            <div v-if="getVisibleNormalRanges(inputan).length" class="space-y-1">
                              <div
                                v-for="range in getVisibleNormalRanges(inputan)"
                                :key="range.id"
                                class="leading-tight"
                              >
                                <p class="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                                  {{ formatNormalRange(range, inputan.uom) }}
                                </p>
                                <p class="mt-0.5 text-[11px] text-muted">
                                  {{ formatRangeCriteria(range) }}
                                </p>
                              </div>
                            </div>
                            <span v-else class="text-xs text-amber-600 dark:text-amber-400">
                              Belum tersedia
                            </span>
                          </td>

                          <td class="px-3 py-2.5 align-middle">
                            <div class="max-w-sm">
                              <div v-if="getExtResult(inputan.id)" class="space-y-1">
                                <template v-if="getExtResult(inputan.id)!.valueNumber != null">
                                  <p class="text-sm font-semibold text-highlighted">
                                    {{ getExtResult(inputan.id)!.valueNumber }}{{ inputan.uom ? ` ${inputan.uom}` : '' }}
                                  </p>
                                </template>
                                <template v-else-if="getExtResult(inputan.id)!.valueCalculated != null">
                                  <p class="text-sm font-semibold text-highlighted">
                                    {{ getExtResult(inputan.id)!.valueCalculated }}{{ inputan.uom ? ` ${inputan.uom}` : '' }}
                                  </p>
                                </template>
                                <template v-else-if="getExtResult(inputan.id)!.valueString != null">
                                  <p class="text-sm font-semibold text-highlighted">
                                    {{ getExtResult(inputan.id)!.valueString }}
                                  </p>
                                </template>
                                <template v-else-if="getExtResult(inputan.id)!.valueSelected != null">
                                  <p class="text-sm font-semibold text-highlighted">
                                    {{ getOptionLabel(inputan, getExtResult(inputan.id)!.valueSelected) }}
                                  </p>
                                </template>
                                <template v-else>
                                  <p class="text-sm text-muted">
                                    -
                                  </p>
                                </template>
                                <p class="text-[11px] text-muted">
                                  ID: {{ getExtResult(inputan.id)!.inputanId }}
                                </p>
                              </div>
                              <p v-else class="text-sm text-muted">
                                Belum diisi
                              </p>
                            </div>
                          </td>

                          <td class="px-3 py-2.5 align-middle">
                            <div v-if="getExtResult(inputan.id)">
                              <UBadge
                                :label="getExtResult(inputan.id)!.grading || 'NORMAL'"
                                :color="gradingColor(getExtResult(inputan.id)!.grading)"
                                variant="soft"
                                size="sm"
                              />
                              <p v-if="getExtResult(inputan.id)!.flag === 'abnormal'" class="mt-1 text-[11px] font-medium text-red-600 dark:text-red-400">
                                Di luar nilai normal
                              </p>
                            </div>
                            <span v-else class="text-xs text-muted">-</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </UCard>

              <UCard class="order-3 border border-default/80 bg-default/80 shadow-sm">
                <template #header>
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <h4 class="text-sm font-semibold uppercase tracking-wide text-muted">
                        Group Grading & Auto Comment
                      </h4>
                      <p class="mt-1 text-xs text-muted">
                        Grading item dihitung otomatis. Grading group diisi manual, lalu sistem membuat auto doctor comment.
                      </p>
                    </div>
                    <UIcon name="i-lucide-clipboard-list" class="size-4 text-muted" />
                  </div>
                </template>

                <div class="space-y-4">
                  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <UFormField label="Group ID">
                      <UInput v-model="groupGradingForm.groupId" placeholder="e.g. HEMATOLOGY" class="w-full" />
                    </UFormField>
                    <UFormField label="Group Name">
                      <UInput v-model="groupGradingForm.groupName" placeholder="e.g. Hematology" class="w-full" />
                    </UFormField>
                  </div>

                  <UFormField label="Grading Group (manual)">
                    <USelect
                      v-model="groupGradingForm.grading"
                      :items="groupGradingItems"
                      :placeholder="'Pilih grading group'"
                      class="w-full sm:w-72"
                    />
                  </UFormField>

                  <div>
                    <p class="mb-1 text-xs font-medium text-muted">
                      Auto Doctor Comment
                    </p>
                    <UTextarea
                      :model-value="autoComment ?? ''"
                      readonly
                      :rows="4"
                      class="w-full"
                      placeholder="Auto-comment akan digenerate setelah simpan grading group."
                    />
                  </div>

                  <UButton
                    v-if="canEditCurrentResult"
                    :loading="groupGradingSaving"
                    icon="i-lucide-save"
                    @click="saveGroupGrading"
                  >
                    Simpan Grading Group
                  </UButton>
                </div>
              </UCard>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <UButton
          v-if="!embedded"
          color="neutral"
          variant="soft"
          @click="emit('close')"
        >
          Kembali
        </UButton>
        <template v-if="canEditCurrentResult || canSubmitCurrentResult">
          <UButton
            color="neutral"
            variant="soft"
            :loading="saving"
            :disabled="submitting || !canEditCurrentResult || isResultBlockedBySample"
            @click="handleSaveResult"
          >
            Simpan Draft
          </UButton>
          <UButton
            color="primary"
            :loading="submitting"
            :disabled="saving || !canSubmitCurrentResult || isResultBlockedBySample"
            @click="handleSubmitResult"
          >
            Submit Hasil
          </UButton>
        </template>
        <UButton
          v-else-if="!embedded"
          color="neutral"
          variant="soft"
          disabled
        >
          Hasil Terkunci
        </UButton>
      </div>
    </template>
  </BaseFullscreenModal>

  <UModal v-model:open="cancelExternalOpen" title="Batalkan Penugasan Dokter Luar">
    <template #body>
      <p class="text-sm text-muted">
        Batalkan penugasan dokter luar untuk item ini? Alasan dicatat dalam riwayat audit.
      </p>
      <UFormField label="Alasan" class="mt-4">
        <UTextarea
          v-model="cancelExternalReason"
          :rows="3"
          placeholder="Alasan pembatalan (opsional)"
          class="w-full"
        />
      </UFormField>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          color="neutral"
          variant="soft"
          :disabled="cancelExternalSubmitting"
          @click="cancelExternalOpen = false"
        >
          No
        </UButton>
        <UButton
          color="error"
          icon="i-lucide-ban"
          :loading="cancelExternalSubmitting"
          @click="cancelExternalDoctor"
        >
          Yes, Batalkan
        </UButton>
      </div>
    </template>
  </UModal>
</template>
