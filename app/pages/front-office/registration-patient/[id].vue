<script setup lang="ts">
import { examTypeBadgeColor } from '~/constants/room-types'

const route = useRoute()
const api = useApi()
const toast = useToast()

type ExamItem = {
  id: string
  source: 'paket' | 'additional'
  sortOrder: number
  workStatus?: string | null
  roomExamItems?: Array<{
    id: string
    status: string
    startAt?: string | null
    doneAt?: string | null
    updatedAt?: string | null
    rescheduleVisitDate?: string | null
  }>
  item: {
    id: string
    code: string
    name: string
    department?: { id: string, name: string } | null
    group?: { id: string, name: string } | null
  }
}

type QueueSampleCollection = {
  id: string
  status: string
  collectedAt?: string | null
  receivedAt?: string | null
  rejectReason?: string | null
  sampleType?: { id: string, code?: string | null, name?: string | null } | null
  items?: Array<{ itemId: string }>
}

type QueueInfo = {
  id: string
  queueCode: string
  queueNumber: number
  sampleCollections?: QueueSampleCollection[]
}

type Registration = {
  id: number
  id_reg: string
  examDate: string
  scheduleDateExam: string
  serviceType: string
  serviceNumber: string
  priorityRegist: string
  paymentType: string
  statusRegistration: string
  examType: string
  createdAt: string
  queue: QueueInfo | null
  patient: {
    id: string
    patientCode: string
    patientName: string
    firstName: string
    middleName?: string
    lastName: string
    gender: 'MALE' | 'FEMALE'
    idType: string
    idNumber: string
    phone?: string
    email?: string
    dob?: string
  } | null
  branch: { branchId: string, nameBranch: string } | null
  company: { id: number, codeCostumer: string, customerName: string } | null
  exam: {
    id: string
    status: string
    mealStatus?: string
    mealStartedAt?: string | null
    mealCompletedAt?: string | null
    paket: { id: string, name: string } | null
    examItems: ExamItem[]
    results: unknown[]
  } | null
}

type CheckinPreview = {
  registration: {
    id: number
    id_reg: string
    examDate: string
    scheduleDateExam: string
    serviceType: string
    serviceNumber: string
    priorityRegist: string
    paymentType: string
    statusRegistration: string
    createdAt: string
  }
  patient: Registration['patient']
  branch: Registration['branch']
  company: Registration['company']
  queueStatus: {
    hasQueueEntry: boolean
    queueEntry: {
      id: string
      queueCode: string
      queueDate: string
      queueNumber: number
      status: string
      type: string
      checkinAt?: string
      createdAt?: string
    } | null
    suggestedQueueDate: string
    canUndoCheckin: boolean
    undoReasons: string[]
  }
  examVerification: {
    examId: string | null
    examStatus: string | null
    paket: { id: string, name: string } | null
    totalItems: number
    paketItems: ExamItem[]
    additionalItems: ExamItem[]
  }
  checkinEligibility: {
    canCheckin: boolean
    reasons: string[]
  }
  undoCheckinEligibility: {
    canUndoCheckin: boolean
    reasons: string[]
  }
}

const { data: reg, refresh } = await useAsyncData(
  `registration-${route.params.id}`,
  () => api.get(`/registration/number/${route.params.id}`).then(r => r.data.data as Registration)
)

const SERVICE_LABEL: Record<string, string> = {
  Laboratorium: 'Laboratorium',
  DoctorConsultation: 'Konsultasi Dokter',
  MCU: 'MCU (Medical Checkup)',
  Vaccine: 'Vaksin',
  Antigen: 'Antigen',
  PCR: 'PCR',
  VitaminInjection: 'Vitamin Injection',
  Pharmacy: 'Farmasi',
  Dental: 'Gigi'
}

const STATUS_COLOR: Record<string, 'success' | 'info' | 'neutral' | 'warning' | 'error'> = {
  Open: 'success',
  Checkin: 'info',
  CheckOut: 'neutral',
  Reschedule: 'warning',
  PartialExam: 'warning',
  Cancel: 'error'
}

const PRIORITY_COLOR: Record<string, 'success' | 'info' | 'neutral' | 'warning' | 'error'> = {
  Normal: 'neutral',
  VIP: 'warning',
  Emergency: 'error'
}

function formatDateTime(d?: string) {
  if (!d) return '-'
  return new Date(d).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function formatDob(d?: string) {
  if (!d) return '-'
  const date = parseLocalDate(d)
  if (!date) return d
  return date.toLocaleDateString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric'
  })
}

function parseLocalDate(d: string): Date | null {
  if (!d) return null
  const iso = new Date(d)
  if (!Number.isNaN(iso.getTime())) return iso
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d.trim())
  if (m) {
    const [_, y, mo, day] = m
    const parsed = new Date(Number(y), Number(mo) - 1, Number(day))
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return null
}
function getExamItemStatus(ei: ExamItem) {
  // Lab sample-based: jika semua sample sudah RECEIVED → status FO = selesai
  const samples = getSampleCollectionsForItem(ei.item.id)
  if (samples.length > 0) {
    // Item lab yang pasien tolak (REFUSED) → status "Menolak" walau sample PENDING.
    const roomStatuses = ei.roomExamItems?.map(item => item.status) ?? []
    if (roomStatuses.includes('REFUSED')) return 'REFUSED'
    if (samples.every(s => s.status === 'RECEIVED')) return 'DONE'
    if (samples.some(s => s.status === 'RESCHEDULED')) return 'RESCHEDULED'
    if (samples.some(s => s.status === 'REJECTED')) return 'REJECTED'
    return 'WAITING_SAMPLE'
  }

  const statuses = ei.roomExamItems?.map(item => item.status) ?? []
  if (statuses.includes('DONE')) return 'DONE'
  if (statuses.includes('IN_PROGRESS')) return 'IN_PROGRESS'
  if (statuses.includes('CALLED')) return 'CALLED'
  if (statuses.includes('RETEXT')) return 'RETEXT'
  if (statuses.includes('REFUSED')) return 'REFUSED'
  if (statuses.includes('RESCHEDULED')) return 'RESCHEDULED'
  if (statuses.includes('SKIPPED')) return 'SKIPPED'
  // Retest disimpan di workStatus (roomExamItem di-reset PENDING saat retest)
  if (ei.workStatus === 'RETEXT') return 'RETEXT'
  return statuses[0] ?? 'PENDING'
}

function getExamItemStatusLabel(status: string) {
  if (status === 'DONE') return 'Selesai'
  if (status === 'IN_PROGRESS') return 'Dikerjakan'
  if (status === 'CALLED') return 'Dipanggil'
  if (status === 'SKIPPED') return 'Skip'
  if (status === 'RESCHEDULED') return 'Reschedule'
  if (status === 'REFUSED') return 'Rejected'
  if (status === 'RETEXT') return 'Retest'
  if (status === 'WAITING_SAMPLE') return 'Menunggu Sample'
  if (status === 'REJECTED') return 'Sample Ditolak'
  return 'Menunggu'
}

function getExamItemStatusLabelEn(status: string) {
  if (status === 'DONE') return 'Done'
  if (status === 'IN_PROGRESS') return 'In Progress'
  if (status === 'CALLED') return 'Called'
  if (status === 'SKIPPED') return 'Skipped'
  if (status === 'RESCHEDULED') return 'Reschedule'
  if (status === 'RETEXT') return 'Retest'
  if (status === 'WAITING_SAMPLE') return 'Waiting Sample'
  if (status === 'REJECTED') return 'Rejected'
  if (status === 'REFUSED') return 'Rejected'
  return status || 'Pending'
}

function shortTime(value: string | undefined | null): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

function getRescheduleVisitDate(examItemId: string): string {
  const ei = (reg.value?.exam?.examItems ?? []).find(e => e.id === examItemId)
  const re = ei?.roomExamItems?.find(r => r.status === 'RESCHEDULED' && r.rescheduleVisitDate)
  return re?.rescheduleVisitDate?.slice(0, 10) ?? ''
}

function getExamItemStatusColor(status: string) {
  if (status === 'DONE') return 'success'
  if (status === 'IN_PROGRESS') return 'warning'
  if (status === 'CALLED') return 'info'
  if (['SKIPPED', 'RESCHEDULED'].includes(status)) return 'neutral'
  if (status === 'REFUSED') return 'error'
  if (status === 'RETEXT') return 'warning'
  if (status === 'REJECTED') return 'error'
  if (status === 'WAITING_SAMPLE') return 'warning'
  return 'neutral'
}

function getExamItemStatusIcon(status: string) {
  if (status === 'DONE') return 'i-lucide-check-circle-2'
  if (status === 'IN_PROGRESS') return 'i-lucide-loader-circle'
  if (status === 'CALLED') return 'i-lucide-bell'
  if (status === 'REFUSED') return 'i-lucide-ban'
  if (status === 'RETEXT') return 'i-lucide-rotate-ccw'
  if (status === 'REJECTED') return 'i-lucide-ban'
  if (status === 'WAITING_SAMPLE') return 'i-lucide-test-tube'
  return 'i-lucide-clock'
}

function getExamItemUpdatedAt(ei: ExamItem) {
  const items = ei.roomExamItems ?? []
  const times = items
    .map(item => item.updatedAt)
    .filter((value): value is string => Boolean(value))
  if (times.length === 0) return null
  return times.reduce((latest, value) => (value > latest ? value : latest))
}

function getExamItemStartAt(ei: ExamItem) {
  const items = ei.roomExamItems ?? []
  const times = items
    .map(item => item.startAt)
    .filter((value): value is string => Boolean(value))
  if (times.length === 0) return null
  return times.reduce((earliest, value) => (value < earliest ? value : earliest))
}

function getExamItemDoneAt(ei: ExamItem) {
  const items = ei.roomExamItems ?? []
  const times = items
    .map(item => item.doneAt)
    .filter((value): value is string => Boolean(value))
  if (times.length === 0) return null
  return times.reduce((latest, value) => (value > latest ? value : latest))
}

function getSampleCollectionsForItem(itemId: string) {
  return (reg.value?.queue?.sampleCollections ?? []).filter(collection =>
    collection.items?.some(item => item.itemId === itemId)
  )
}

function getSampleStatusColor(status: string) {
  if (status === 'RECEIVED') return 'success'
  if (status === 'COLLECTED') return 'info'
  if (status === 'REJECTED') return 'error'
  if (status === 'RESCHEDULED') return 'warning'
  return 'neutral'
}

function getSampleStatusLabel(status: string) {
  if (status === 'RECEIVED') return 'Diterima Lab'
  if (status === 'COLLECTED') return 'Sudah Diambil'
  if (status === 'REJECTED') return 'Ditolak'
  if (status === 'RESCHEDULED') return 'Reschedule'
  return 'Menunggu Ambil'
}

const mcuCategories = computed(() => {
  const items = reg.value?.exam?.examItems ?? []
  const paketItems = items.filter(ei => ei.source === 'paket')
  const grouped = new Map<string, {
    label: string
    icon: string
    items: { id: string, name: string, status: string, done: boolean, sampleCollections: QueueSampleCollection[], updatedAt: string | null, startAt: string | null, doneAt: string | null }[]
  }>()
  const deptIcon: Record<string, string> = {
    Laboratorium: 'i-lucide-flask-conical',
    Radiologi: 'i-lucide-scan',
    Nurse: 'i-lucide-heart-pulse',
    default: 'i-lucide-stethoscope'
  }

  for (const ei of paketItems) {
    const deptName: string = ei.item.department?.name ?? 'Lainnya'
    if (!grouped.has(deptName)) {
      const icon = deptIcon[deptName as keyof typeof deptIcon] ?? deptIcon.default
      grouped.set(deptName, {
        label: deptName,
        icon: icon as string,
        items: []
      })
    }
    const status = getExamItemStatus(ei)
    const updatedAt = getExamItemUpdatedAt(ei)
    const startAt = getExamItemStartAt(ei)
    const doneAt = getExamItemDoneAt(ei)
    grouped.get(deptName)?.items.push({
      id: ei.id,
      name: ei.item.name,
      status,
      done: status === 'DONE',
      sampleCollections: getSampleCollectionsForItem(ei.item.id),
      updatedAt,
      startAt,
      doneAt
    })
  }

  return [...grouped.values()].map((category) => {
    const completedItems = category.items.filter(item => item.done)
    const pendingItems = category.items.filter(item => !item.done)
    const completed = completedItems.length
    const total = category.items.length
    const updatedAt = category.items.reduce<string | null>(
      (latest, item) => (item.updatedAt && (!latest || item.updatedAt > latest) ? item.updatedAt : latest),
      null
    )
    return {
      ...category,
      completed,
      total,
      pending: pendingItems.length,
      completedItems,
      pendingItems,
      updatedAt,
      status:
        total > 0 && completed === total
          ? 'DONE'
          : category.items.some(item => item.status === 'RETEXT')
            ? 'RETEXT'
            : category.items.some(item => item.status === 'RESCHEDULED')
              ? 'RESCHEDULED'
              : category.items.some(item => ['REFUSED', 'REJECTED'].includes(item.status))
                ? 'REFUSED'
                : 'PENDING'
    }
  })
})
const additionalItems = computed(() =>
  (reg.value?.exam?.examItems ?? []).filter(ei => ei.source === 'additional')
)

type PatientQuestionnaire = {
  questionnaire_id: string
  questionnaire_name: string
  status: 'Completed' | 'Pending'
  completionDate: string | null
  answers?: Array<{
    questionId: string
    questionText: string
    questionType?: string
    optionId?: string | null
    optionText?: string | null
    answerText?: string | null
  }>
}

const questionnaires = ref<PatientQuestionnaire[]>([])
const questionnairesLoading = ref(false)

async function loadQuestionnaires() {
  questionnairesLoading.value = true
  try {
    const res = await api.get(`/registration/number/${route.params.id}/questionnaires`)
    questionnaires.value = res.data?.data ?? []
  } catch {
    questionnaires.value = []
  } finally {
    questionnairesLoading.value = false
  }
}

type PatientAnswer = NonNullable<PatientQuestionnaire['answers']>[number]

function formatAnswer(q: PatientAnswer): string {
  if (q.answerText != null && q.answerText !== '') return q.answerText
  if (q.optionText) return q.optionText
  if (q.optionId) return q.optionId
  return '-'
}

const modalOpen = ref(false)
const modalTitle = ref('')
const modalAnswers = ref<NonNullable<PatientQuestionnaire['answers']>>([])
function openModal(q: PatientQuestionnaire) {
  modalTitle.value = q.questionnaire_name
  modalAnswers.value = q.answers ?? []
  modalOpen.value = true
}

type StatusHistoryItem = {
  id: string
  action: string
  notes: string | null
  createdAt: string
  actorId?: number | null
  actorRole?: string | null
  actorName?: string | null
  payloadBefore?: Record<string, any> | null
  payloadAfter?: Record<string, any> | null
}

const statusHistory = ref<StatusHistoryItem[]>([])
const statusHistoryLoading = ref(false)

async function loadStatusHistory() {
  statusHistoryLoading.value = true
  try {
    const res = await api.get(`/registration/number/${route.params.id}/status-history`)
    statusHistory.value = res.data?.data?.history ?? []
  } catch {
    statusHistory.value = []
  } finally {
    statusHistoryLoading.value = false
  }
}

const statusHistoryDisplay = computed(() =>
  [...statusHistory.value].reverse()
)

function statusHistoryLabel(item: StatusHistoryItem): string {
  if (item.action === 'CREATE') return 'Registrasi Dibuat'
  if (item.action === 'STATUS_CHANGE') {
    const before = item.payloadBefore?.statusRegistration
    const after = item.payloadAfter?.statusRegistration
    const from = before?.from ?? before?.to
    const to = after?.to ?? after?.from
    if (from && to && from !== to) return `${from} → ${to}`
    if (to) return `Status: ${to}`
    return 'Perubahan status'
  }
  return item.action
}

function statusHistoryDesc(item: StatusHistoryItem): string {
  if (item.notes) return item.notes
  if (item.action === 'CREATE') return 'Registrasi dibuat.'
  return 'Perubahan status registrasi.'
}

const isCancelled = computed(() => reg.value?.statusRegistration === 'Cancel')
const isCheckedIn = computed(() => ['Checkin', 'CheckOut', 'PartialExam'].includes(reg.value?.statusRegistration ?? ''))
const isMCU = computed(() => reg.value?.serviceType === 'MCU')
const canUndoCheckin = computed(() =>
  checkinPreview.value?.undoCheckinEligibility?.canUndoCheckin ?? false
)

const examType = computed(() => reg.value?.examType ?? (isMCU.value ? 'MCU' : 'RAWAT_JALAN'))

const checkinModalOpen = ref(false)
const checkinLoading = ref(false)
const checkinPreviewLoading = ref(false)
const checkinPreview = ref<CheckinPreview | null>(null)
const activeQueue = computed(() => reg.value?.queue ?? null)
const checkinSuccessOpen = ref(false)

const todayStr = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const isExamDateToday = computed(() => {
  const examDate = reg.value?.examDate?.slice(0, 10)
  return examDate === todayStr()
})

const dateBlockedOpen = ref(false)

async function loadCheckinPreview() {
  if (!reg.value) return

  checkinPreviewLoading.value = true
  try {
    const res = await api.get(`/registration/${reg.value.id}/checkin-preview`)
    checkinPreview.value = res.data.data as CheckinPreview
  } catch (err: unknown) {
    checkinPreview.value = null
    const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Gagal memuat preview check-in'
    toast.add({ title: 'Gagal memuat preview', description: msg, color: 'error' })
  } finally {
    checkinPreviewLoading.value = false
  }
}

async function openCheckinModal() {
  if (!reg.value) return

  if (!isExamDateToday.value) {
    dateBlockedOpen.value = true
    return
  }

  await loadCheckinPreview()
  checkinModalOpen.value = true
}

async function confirmCheckin() {
  if (!reg.value) return
  checkinLoading.value = true

  try {
    const res = await api.post(`/registration/${reg.value.id}/checkin`, {
      queueDate: checkinPreview.value?.queueStatus?.suggestedQueueDate
    })

    const entry = res.data.data
    await refresh()
    await loadStatusHistory()

    checkinModalOpen.value = false
    checkinSuccessOpen.value = true
    await loadCheckinPreview()

    toast.add({
      title: 'Check-in berhasil',
      description: `Nomor antrian: ${entry.queueCode}`,
      color: 'success'
    })
  } catch (err: unknown) {
    const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Gagal melakukan check-in'
    toast.add({ title: 'Gagal check-in', description: msg, color: 'error' })
  } finally {
    checkinLoading.value = false
  }
}

const checkinPaketItems = computed(() => checkinPreview.value?.examVerification.paketItems ?? [])
const checkinAdditionalItems = computed(() => checkinPreview.value?.examVerification.additionalItems ?? [])

const uncheckLoading = ref(false)
async function undoCheckin() {
  if (!reg.value) return
  uncheckLoading.value = true

  try {
    await api.post(`/registration/${reg.value.id}/uncheck`)
    await refresh()
    await loadStatusHistory()
    toast.add({
      title: 'Berhasil',
      description: 'Check-in pasien berhasil dibatalkan',
      color: 'success'
    })
  } catch (err: unknown) {
    const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Gagal membatalkan check-in'
    toast.add({ title: 'Gagal uncheck', description: msg, color: 'error' })
  } finally {
    uncheckLoading.value = false
  }
}

const cancelLoading = ref(false)
async function cancelRegistration() {
  cancelLoading.value = true
  try {
    await api.patch(`/registration/${reg.value?.id}/cancel`)
    toast.add({ title: 'Berhasil', description: 'Registrasi dibatalkan', color: 'success' })
    await refresh()
    await loadStatusHistory()
  } catch {
    toast.add({ title: 'Gagal', description: 'Gagal membatalkan registrasi', color: 'error' })
  } finally {
    cancelLoading.value = false
  }
}

// ─── Check Out (FO) ────────────────────────────────────────────────
const checkoutLoading = ref(false)
const checkoutEligibility = ref<{
  canCheckout: boolean
  reasons: string[]
  warnings?: string[]
  rescheduledItems?: Array<{ itemName: string, samples?: Array<{ name: string }> }>
  nonFinalItems?: Array<{ itemName?: string, reason?: string, currentRoomStatus?: string }>
} | null>(null)

// Item non-final yang bermasalah utk banner Note (retest sudah di banner utama).
const noteIssueItems = computed(() => {
  const fromCheckout = (checkoutEligibility.value?.nonFinalItems ?? []).filter(item =>
    ['REFUSED', 'REJECTED'].includes(item.currentRoomStatus ?? '')
  )

  // Get all rejected OR refused sample collections from queue
  const badSampleCollections = (reg.value?.queue?.sampleCollections ?? []).filter(s => 
    ['REJECTED', 'REFUSED'].includes(s.status)
  )

  // Get item IDs from rejected/refused sample collections
  const badItemIds = new Set<string>()
  for (const sc of badSampleCollections) {
    for (const item of sc.items ?? []) {
      badItemIds.add(item.itemId)
    }
  }

  const fromExamItems = (reg.value?.exam?.examItems ?? []).filter(item => {
    const hasBadSampleId = badItemIds.has(item.item.id)
    const samples = getSampleCollectionsForItem(item.item.id)
    const hasBadSampleStatus = samples.some(s => ['REJECTED', 'REFUSED'].includes(s.status))
    const roomStatuses = item.roomExamItems?.map(r => r.status) ?? []
    return roomStatuses.includes('REFUSED') ||
      roomStatuses.includes('REJECTED') ||
      item.workStatus === 'REFUSED' ||
      item.workStatus === 'REJECTED' ||
      hasBadSampleId ||
      hasBadSampleStatus
  })
  // Merge & dedupe by itemName
  const merged = [...fromCheckout]
  for (const item of fromExamItems) {
    if (!merged.some(m => m.itemName === item.item.name)) {
      merged.push({ itemName: item.item.name, currentRoomStatus: item.workStatus ?? 'REJECTED' })
    }
  }
  return merged
})

// Item belum selesai utk banner "Patient cannot be discharged yet" — tanpa utk yg rejected (sudah di Rejected Items).
const dischargePendingItems = computed(() =>
  (checkoutEligibility.value?.nonFinalItems ?? []).filter(item =>
    !['REFUSED', 'REJECTED'].includes(item.currentRoomStatus ?? '')
  )
)

async function loadCheckoutEligibility() {
  if (!reg.value || !isCheckedIn.value || reg.value.statusRegistration === 'CheckOut') {
    checkoutEligibility.value = null
    return
  }
  try {
    const res = await api.get(`/registration/${reg.value.id_reg}/checkout-eligibility`)
    checkoutEligibility.value = res.data?.data ?? null
  } catch {
    checkoutEligibility.value = null
  }
}

const pageRefreshing = ref(false)
async function handleRefreshPage() {
  if (pageRefreshing.value) return
  pageRefreshing.value = true
  try {
    await refresh()
    await loadCheckoutEligibility()
    await loadStatusHistory()
    await loadQuestionnaires()
  } finally {
    pageRefreshing.value = false
  }
}

// Portal URL untuk link kuesioner pasien (wa.me share / copy link).
const runtimeConfig = useRuntimeConfig()
const questionnairePortalUrl = computed(() => {
  const base = (runtimeConfig.public as Record<string, unknown>).portalUrl as string | undefined
  return `${(base || 'http://localhost:5173').replace(/\/$/, '')}/questionnaire`
})

function normalizeWaPhone(phone: string | null | undefined): string {
  const digits = (phone ?? '').replace(/\D/g, '')
  if (!digits) return ''
  return digits.replace(/^0/, '62')
}

function questionnaireLink(questionnaireId?: string): string {
  const params = new URLSearchParams()
  if (reg.value?.company?.id) params.set('companyId', String(reg.value.company.id))
  if (reg.value?.branch?.branchId) params.set('branchId', reg.value.branch.branchId)
  if (questionnaireId) params.set('questionnaireId', questionnaireId)
  // Registrasi final punya id numerik; jawaban ter-backfill ke registrationId.
  params.set('registrationId', String(reg.value?.id ?? ''))
  // Gender pasien (untuk filter section "Khusus Wanita" di portal).
  if (reg.value?.patient?.gender) params.set('gender', reg.value.patient.gender)
  return `${questionnairePortalUrl.value}?${params.toString()}`
}

function waShareLink(questionnaireId?: string): string {
  const phone = normalizeWaPhone(reg.value?.patient?.phone)
  if (!phone) return ''
  const questUrl = questionnaireLink(questionnaireId)
  const message = `Assalamualaikum, silakan isi kuesioner medis Anda di: ${questUrl}`
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

function shareQuestionnaireViaWa(questionnaireId?: string) {
  const link = waShareLink(questionnaireId)
  if (!link) {
    toast.add({
      title: 'Gagal',
      description: 'Nomor HP pasien tidak tersedia',
      color: 'error'
    })
    return
  }
  window.open(link, '_blank', 'noopener,noreferrer')
}

function copyQuestionnaireLink(questionnaireId?: string) {
  const link = questionnaireLink(questionnaireId)
  navigator.clipboard.writeText(link).then(() => {
    toast.add({
      title: 'Berhasil',
      description: 'Link kuesioner disalin',
      color: 'success'
    })
  }).catch(() => {
    toast.add({
      title: 'Gagal',
      description: 'Gagal menyalin link',
      color: 'error'
    })
  })
}

const resampling = ref(false)
const mealTimerNow = ref(Date.now())
const mealTimerDuration = ref<number | null>(null)
let mealTimerInterval: ReturnType<typeof setInterval> | null = null

// Ambil durasi meal utk countdown; polling saat IN_PROGRESS biar timer & status update.
const examObj = computed(() => reg.value?.exam as Record<string, unknown> | null)
const examMealStatus = computed(() => reg.value?.exam?.mealStatus ?? (examObj.value?.status as string | undefined | null) ?? null)
const examMealStartedAt = computed(() => reg.value?.exam?.mealStartedAt ?? (examObj.value?.startedAt as string | undefined | null) ?? null)

async function fetchMealDuration() {
  const examId = reg.value?.exam?.id
  if (!examId) return
  try {
    const res = await api.get(`/medical/exams/${examId}/meal`)
    const data = res.data?.data as Record<string, unknown> | null
    mealTimerDuration.value = (data?.mealDurationMinutes as number | undefined | null) ?? (data?.durationMinutes as number | undefined | null) ?? null
  } catch {
    mealTimerDuration.value = null
  }
}

const examMealRemainingText = computed(() => {
  const status = examMealStatus.value
  if (status !== 'IN_PROGRESS') return ''
  const started = examMealStartedAt.value ? new Date(examMealStartedAt.value).getTime() : 0
  const durationMin = mealTimerDuration.value ?? (examObj.value?.durationMinutes as number | undefined | null) ?? 0
  const durationMs = durationMin * 60 * 1000
  if (!started || !durationMs) return ''
  const remaining = Math.max(0, started + durationMs - mealTimerNow.value)
  const totalSec = Math.floor(remaining / 1000)
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0')
  const ss = String(totalSec % 60).padStart(2, '0')
  return `${mm}:${ss}`
})

let mealPollingInterval: ReturnType<typeof setInterval> | null = null

watch(examMealStatus, (s) => {
  if (mealTimerInterval) {
    clearInterval(mealTimerInterval)
    mealTimerInterval = null
  }
  if (mealPollingInterval) {
    clearInterval(mealPollingInterval)
    mealPollingInterval = null
  }
  if (s === 'IN_PROGRESS') {
    mealTimerNow.value = Date.now()
    mealTimerInterval = setInterval(() => {
      mealTimerNow.value = Date.now()
      
      const started = examMealStartedAt.value ? new Date(examMealStartedAt.value).getTime() : 0
      const durationMin = mealTimerDuration.value ?? (examObj.value?.durationMinutes as number | undefined | null) ?? 0
      const durationMs = durationMin * 60 * 1000
      if (started && durationMs) {
        const remaining = Math.max(0, started + durationMs - mealTimerNow.value)
        if (remaining === 0) {
          void refresh()
          void fetchMealDuration()
        }
      }
    }, 1000)
    // Polling otomatis tiap 10-15 detik untuk memperbarui status meal dan timing dari backend
    mealPollingInterval = setInterval(() => {
      void refresh()
      void fetchMealDuration()
    }, 12000)
  }
}, { immediate: true })

onBeforeUnmount(() => {
  if (mealTimerInterval) clearInterval(mealTimerInterval)
  if (mealPollingInterval) clearInterval(mealPollingInterval)
})

const hasRescheduleItem = computed(() =>
  (reg.value?.exam?.examItems ?? []).some(ei =>
    (ei.roomExamItems ?? []).some(r =>
      r.status === 'RESCHEDULED' && r.rescheduleVisitDate
    )
  )
)
async function handleResampleCheckin() {
  if (!reg.value || resampling.value || !reg.value.queue?.id || !reg.value.branch?.branchId) {
    toast.add({ title: 'Gagal', description: 'Data resample tidak lengkap (queue/branch).', color: 'error' })
    return
  }
  resampling.value = true
  try {
    const today = new Date().toISOString().slice(0, 10)
    await api.post('/medical/exams/queue/checkin/resample', {
      registrationId: reg.value.id,
      branchId: reg.value.branch.branchId,
      queueDate: today,
      parentQueueEntryId: reg.value.queue.id,
    })
    toast.add({ title: 'Berhasil', description: 'Pasien dijadwalkan ulang (resample) — dapat diproses lagi.', color: 'success' })
    await refresh()
    await loadStatusHistory()
    await loadCheckoutEligibility()
  } catch (err: unknown) {
    toast.add({
      title: 'Gagal resample',
      description: (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Terjadi kesalahan.',
      color: 'error',
    })
  } finally {
    resampling.value = false
  }
}

type RescheduleDraftItem = { roomExamItemId: string, itemName: string, visitDate: string }

const rescheduleCheckoutItems = computed<RescheduleDraftItem[]>(() => {
  if (!reg.value?.exam?.examItems) return []
  const out: RescheduleDraftItem[] = []
  for (const ei of reg.value.exam.examItems) {
    for (const re of ei.roomExamItems ?? []) {
      if (re.status === 'RESCHEDULED') {
        out.push({
          roomExamItemId: re.id,
          itemName: ei.item?.name ?? '-',
          visitDate: re.rescheduleVisitDate?.slice(0, 10) ?? '',
        })
      }
    }
  }
  return out
})

const showRescheduleModal = ref(false)
const rescheduleDraft = ref<RescheduleDraftItem[]>([])
const savingReschedule = ref(false)
const rescheduleMode = ref<'checkout' | 'dates'>('checkout')

// Petugas ubah tanggal datang ulang pasien yang gagal datang (tanpa checkout).
function openRescheduleDates() {
  rescheduleDraft.value = rescheduleCheckoutItems.value.map(i => ({ ...i }))
  rescheduleMode.value = 'dates'
  showRescheduleModal.value = true
}

async function saveRescheduleDatesOnly() {
  if (!reg.value || savingReschedule.value) return
  savingReschedule.value = true
  try {
    await api.patch(`/registration/${reg.value.id_reg}/reschedule-dates`, {
      items: rescheduleDraft.value.map(i => ({ roomExamItemId: i.roomExamItemId, visitDate: i.visitDate || null })),
    })
    toast.add({
      title: 'Berhasil',
      description: 'Tanggal datang ulang diperbarui.',
      color: 'success'
    })
    await refresh()
  } catch (err: unknown) {
    const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      ?? 'Gagal memperbarui tanggal datang ulang.'
    toast.add({ title: 'Gagal', description: msg, color: 'error' })
  } finally {
    savingReschedule.value = false
    showRescheduleModal.value = false
  }
}

async function confirmCheckout() {
  if (!reg.value || checkoutLoading.value) return
  // Jika ada item reschedule → tanya tanggal datang ulang dulu.
  if (rescheduleCheckoutItems.value.length) {
    rescheduleDraft.value = rescheduleCheckoutItems.value.map(i => ({ ...i }))
    rescheduleMode.value = 'checkout'
    showRescheduleModal.value = true
    return
  }
  await doCheckout()
}

async function doCheckout() {
  if (!reg.value || checkoutLoading.value) return
  checkoutLoading.value = true
  savingReschedule.value = true
  try {
    if (rescheduleDraft.value.length) {
      await api.patch(`/registration/${reg.value.id_reg}/reschedule-dates`, {
        items: rescheduleDraft.value.map(i => ({ roomExamItemId: i.roomExamItemId, visitDate: i.visitDate || null })),
      })
    }
    await api.patch(`/registration/${reg.value.id_reg}/checkout`)
    toast.add({
      title: 'Berhasil',
      description: 'Pasien telah check-out dan dapat dipulangkan.',
      color: 'success'
    })
    await refresh()
    await loadStatusHistory()
    await loadCheckoutEligibility()
  } catch (err: unknown) {
    const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      ?? 'Gagal check-out pasien.'
    toast.add({ title: 'Gagal check-out', description: msg, color: 'error' })
  } finally {
    checkoutLoading.value = false
    savingReschedule.value = false
    showRescheduleModal.value = false
  }
}

onMounted(() => {
  loadQuestionnaires()
  loadStatusHistory()
  void loadCheckoutEligibility()
  void fetchMealDuration()
})

watch(() => [reg.value?.statusRegistration, isCheckedIn.value], () => {
  void loadCheckoutEligibility()
})
</script>

<template>
  <UDashboardPanel :id="`registration-${route.params.id}`">
    <template #header>
      <UDashboardNavbar>
        <template #leading>
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            to="/front-office/registration-patient"
          />
          <h1 class="text-lg font-semibold ml-2">
            Detail Registrasi
          </h1>
        </template>
        <template #right>
          <div class="flex items-center gap-2">
            <UButton
              icon="i-lucide-refresh-cw"
              color="neutral"
              variant="soft"
              :loading="pageRefreshing"
              @click="() => void handleRefreshPage()"
            >
              Refresh
            </UButton>
            <UButton
              v-if="hasRescheduleItem && reg?.queue?.id && reg?.branch?.branchId"
              icon="i-lucide-rotate-ccw"
              color="warning"
              variant="soft"
              label="Patient Return Visit"
              :loading="resampling"
              @click="handleResampleCheckin"
            />
            <UButton
              v-if="hasRescheduleItem"
              icon="i-lucide-calendar-days"
              color="info"
              variant="soft"
              label="Change Follow-up Date"
              @click="openRescheduleDates"
            />
            <UButton
              icon="i-lucide-printer"
              color="neutral"
              variant="outline"
              label="Print Label"
            />
            <UButton
              v-if="isCheckedIn"
              icon="i-lucide-activity"
              color="primary"
              variant="soft"
              label="Status Exam"
              :to="`/result/exam-status/${reg?.id_reg}`"
            />
            <UButton
              v-if="isCheckedIn && checkoutEligibility?.canCheckout"
              icon="i-lucide-log-out"
              color="success"
              label="Check Out"
              :loading="checkoutLoading"
              title="Semua item selesai — pasien dapat dipulangkan."
              @click="confirmCheckout"
            />
            <UButton
              v-if="!isCancelled && !isCheckedIn"
              icon="i-lucide-x-circle"
              color="error"
              variant="outline"
              label="Cancel Registrasi"
              :loading="cancelLoading"
              @click="cancelRegistration"
            />
            <UButton
              v-if="!isCancelled && isCheckedIn && reg?.statusRegistration !== 'CheckOut' && canUndoCheckin"
              icon="i-lucide-rotate-ccw"
              color="warning"
              variant="outline"
              label="Batalkan Check-in"
              :loading="uncheckLoading"
              @click="undoCheckin"
            />
            <UButton
              v-if="!isCancelled && !isCheckedIn"
              icon="i-lucide-user-check"
              color="primary"
              label="Check-in Pasien"
              @click="openCheckinModal"
            />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="!reg" class="flex items-center justify-center h-full">
        <UIcon name="i-lucide-loader-circle" class="animate-spin text-2xl text-muted" />
      </div>

      <div v-else class="w-full max-w-7xl mx-auto py-6 px-4 space-y-6">
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p class="text-xs text-muted mb-1">
              Kembali ke Daftar Registrasi
            </p>
            <h1 class="text-2xl font-bold text-default">
              Registration Detail
            </h1>
            <div class="flex items-center gap-3 mt-2">
              <code class="text-base font-bold bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-lg">
                {{ reg.id_reg }}
              </code>
              <UBadge
                :label="reg.statusRegistration"
                :color="STATUS_COLOR[reg.statusRegistration] ?? 'neutral'"
                variant="subtle"
              />
            </div>
          </div>

          <div
            v-if="activeQueue"
            class="rounded-xl border border-primary/20 bg-background shadow-sm px-5 py-3 flex items-center gap-4"
          >
            <div class="flex items-center gap-2">
              <div>
                <p class="text-xs text-muted">
                  Queue Number
                </p>
                <p class="text-3xl font-bold text-primary">
                  {{ activeQueue.queueCode }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <UAlert
          v-if="noteIssueItems.length"
          color="error"
          variant="soft"
          icon="i-lucide-octagon-x"
          title="Rejected Items"
          description="The following items have been rejected by the patient / sample rejected:"
        >
          <template #description>
            <div class="mt-1 space-y-1">
              <p>The following items have been rejected by the patient / sample rejected:</p>
              <ul class="list-disc pl-5 text-xs">
                <li v-for="(item, index) in noteIssueItems" :key="index">
                  {{ item.itemName ?? '-' }}
                </li>
              </ul>
            </div>
          </template>
        </UAlert>

        <UAlert
          v-if="checkoutEligibility?.warnings?.length"
          color="warning"
          variant="soft"
          icon="i-lucide-alert-triangle"
          title="Reschedule Items"
        >
          <template #description>
            <div class="mt-1 space-y-1">
              <p>{{ checkoutEligibility.warnings.join(' ') }}</p>
              <ul v-if="checkoutEligibility.rescheduledItems?.length" class="list-disc pl-5 text-xs">
                <li v-for="(r, index) in checkoutEligibility.rescheduledItems" :key="'rs-' + index">
                  {{ r.itemName }}<template v-if="r.samples?.length">
                    <span class="ml-1">({{ r.samples.map(s => s.name).join(', ') }})</span>
                  </template>
                </li>
              </ul>
            </div>
          </template>
        </UAlert>

        <UAlert
          v-if="isCheckedIn && reg.statusRegistration !== 'CheckOut' && checkoutEligibility"
          :color="checkoutEligibility.canCheckout ? 'success' : 'warning'"
          variant="soft"
          :icon="checkoutEligibility.canCheckout ? 'i-lucide-log-out' : 'i-lucide-alert-circle'"
          :title="checkoutEligibility.canCheckout
            ? 'All examinations complete — patient can be discharged'
            : 'Patient cannot be discharged yet'"
          :description="checkoutEligibility.canCheckout
            ? 'Click the Check Out button to mark the patient finished and ready to leave.'
            : checkoutEligibility.reasons?.join('; ') || 'There are still unfinished examination items.'"
        >
          <template v-if="dischargePendingItems.length" #description>
            <div class="mt-1 space-y-1">
              <p>{{ checkoutEligibility.reasons?.join('; ') }}</p>
              <ul class="list-disc pl-5 text-xs">
                <li v-for="(item, index) in dischargePendingItems" :key="index">
                  {{ item.itemName }} — {{ item.currentRoomStatus ? getExamItemStatusLabelEn(item.currentRoomStatus) : (item.reason || 'not finished') }}
                </li>
              </ul>
            </div>
          </template>
        </UAlert>

        <div class="grid grid-cols-12 gap-5">
          <div class="col-span-12 lg:col-span-8 rounded-xl border border-default bg-background overflow-hidden shadow-sm">
            <div class="px-5 py-4 border-b border-default flex items-center justify-between">
              <h3 class="font-semibold flex items-center gap-2">
                <UIcon name="i-lucide-user-circle" class="text-primary" />
                Patient Information
              </h3>
              <span v-if="reg.patient" class="text-xs text-muted">ID: {{ reg.patient.patientCode }}</span>
            </div>
            <div v-if="reg.patient" class="px-5 py-4">
              <div class="grid grid-cols-1 md:grid-cols-4 gap-5 border-b border-default pb-4 mb-4">
                <div>
                  <p class="text-xs text-muted mb-1">
                    Full Name
                  </p>
                  <p class="font-semibold text-base">
                    {{ reg.patient.patientName }}
                  </p>
                </div>
                <div>
                  <p class="text-xs text-muted mb-1">
                    Gender
                  </p>
                  <p class="font-semibold">
                    {{ reg.patient.gender === 'MALE' ? 'Male' : 'Female' }}
                  </p>
                </div>
                <div>
                  <p class="text-xs text-muted mb-1">
                    Tanggal Lahir
                  </p>
                  <p class="font-semibold">
                    {{ formatDob(reg.patient.dob) }}
                  </p>
                </div>
                <div>
                  <p class="text-xs text-muted mb-1">
                    Contact Status
                  </p>
                  <p class="flex items-center gap-1 text-sm font-medium text-green-600 dark:text-green-400">
                    <UIcon name="i-lucide-check-circle-2" class="text-base" /> Verified
                  </p>
                </div>
              </div>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p class="text-xs text-muted mb-1">
                    Nomor HP
                  </p>
                  <p class="font-medium">
                    {{ reg.patient.phone ?? '-' }}
                  </p>
                </div>
                <div>
                  <p class="text-xs text-muted mb-1">
                    Email
                  </p>
                  <p class="font-medium truncate">
                    {{ reg.patient.email ?? '-' }}
                  </p>
                </div>
                <div>
                  <p class="text-xs text-muted mb-1">
                    ID Type
                  </p>
                  <p class="font-medium">
                    {{ reg.patient.idType }}
                  </p>
                </div>
                <div>
                  <p class="text-xs text-muted mb-1">
                    ID Number
                  </p>
                  <p class="font-mono text-xs font-medium">
                    {{ reg.patient.idNumber }}
                  </p>
                </div>
              </div>
            </div>
            <div v-else class="p-6 text-center text-sm text-muted">
              Data pasien tidak ditemukan
            </div>
          </div>

          <div class="col-span-12 lg:col-span-4 rounded-xl border border-default bg-background overflow-hidden shadow-sm">
            <div class="px-5 py-4 border-b border-default">
              <h3 class="font-semibold flex items-center gap-2">
                <UIcon name="i-lucide-clipboard-list" class="text-primary" />
                Registration Details
              </h3>
            </div>
            <div class="divide-y divide-default">
              <div class="flex items-center justify-between px-5 py-3">
                <span class="text-xs text-muted">Exam Date</span>
                <span class="text-sm font-semibold">{{ reg.examDate }}</span>
              </div>
              <div class="flex items-center justify-between px-5 py-3">
                <span class="text-xs text-muted">Service Type</span>
                <span class="text-sm font-semibold text-primary">{{ SERVICE_LABEL[reg.serviceType] ?? reg.serviceType }}</span>
              </div>
              <div class="flex items-center justify-between px-5 py-3">
                <span class="text-xs text-muted">Exam Type</span>
                <UBadge :color="examTypeBadgeColor[examType] ?? 'neutral'" variant="subtle">
                  {{ examType === 'MCU' ? 'MCU (Medical Checkup)' : 'Rawat Jalan' }}
                </UBadge>
              </div>
              <div class="flex items-center justify-between px-5 py-3">
                <span class="text-xs text-muted">Service No.</span>
                <code class="text-xs bg-elevated border border-default rounded px-2 py-0.5 font-mono">{{ reg.serviceNumber }}</code>
              </div>
              <div class="flex items-center justify-between px-5 py-3">
                <span class="text-xs text-muted">Branch</span>
                <span class="text-sm font-semibold">{{ reg.branch?.nameBranch ?? '-' }}</span>
              </div>
              <div v-if="reg.exam?.paket" class="flex items-center justify-between px-5 py-3">
                <span class="text-xs text-muted">Paket</span>
                <span class="text-sm font-semibold">{{ reg.exam?.paket?.name ?? '-' }}</span>
              </div>
              <div
                v-if="reg.exam?.mealStartedAt"
                class="flex items-center justify-between px-5 py-3"
              >
                <span class="text-xs text-muted">Meal Time</span>
                <span class="text-sm font-semibold">
                  Mulai {{ shortTime(reg.exam.mealStartedAt) }}
                  <template v-if="reg.exam.mealCompletedAt">
                    · Selesai {{ shortTime(reg.exam.mealCompletedAt) }}
                  </template>
                  <template v-else-if="reg.exam.mealStatus === 'IN_PROGRESS'">
                    · {{ examMealRemainingText }}
                  </template>
                </span>
              </div>
            </div>
          </div>

          <div class="col-span-12 lg:col-span-4 flex flex-col gap-5">
            <div class="rounded-xl border border-default bg-background overflow-hidden shadow-sm">
              <div class="px-5 py-4 border-b border-default">
                <h3 class="font-semibold flex items-center gap-2">
                  <UIcon name="i-lucide-credit-card" class="text-primary" />
                  Payment & Priority
                </h3>
              </div>
              <div class="p-4 space-y-3">
                <div class="flex items-center gap-3 p-3 rounded-xl bg-elevated border border-default">
                  <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <UIcon
                      :name="reg.paymentType === 'Insurance' ? 'i-lucide-shield-check'
                        : reg.paymentType === 'BillToCompany' ? 'i-lucide-building-2'
                          : 'i-lucide-wallet'"
                      class="text-primary"
                    />
                  </div>
                  <div>
                    <p class="text-xs text-muted">
                      Payment Type
                    </p>
                    <p class="font-bold text-sm">
                      {{ reg.paymentType === 'Personal' ? 'Personal'
                        : reg.paymentType === 'Insurance' ? 'Insurance'
                          : 'Bill to Company' }}
                    </p>
                  </div>
                </div>
                <div class="flex items-center justify-between px-1">
                  <span class="text-sm text-muted">Priority Level</span>
                  <UBadge :label="reg.priorityRegist" :color="PRIORITY_COLOR[reg.priorityRegist] ?? 'neutral'" variant="subtle" />
                </div>
              </div>
            </div>

            <div class="flex-grow rounded-xl border border-default bg-background overflow-hidden shadow-sm">
              <div class="px-5 py-4 border-b border-default">
                <h3 class="font-semibold flex items-center gap-2">
                  <UIcon name="i-lucide-history" class="text-primary" />
                  Status History
                </h3>
              </div>
              <div class="p-4 max-h-72 overflow-y-auto">
                <div v-if="statusHistoryLoading" class="flex items-center justify-center py-6">
                  <UIcon name="i-lucide-loader-circle" class="animate-spin text-xl text-muted" />
                </div>
                <div v-else-if="!statusHistory.length" class="py-6 text-center">
                  <p class="text-sm text-muted">Belum ada riwayat status.</p>
                </div>
                <div v-else class="relative space-y-4">
                  <div class="absolute left-[7px] top-2 bottom-2 w-px bg-default" />
                  <div v-for="(item, i) in statusHistoryDisplay" :key="item.id || i" class="relative flex gap-3 pl-6">
                    <div class="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-background flex-shrink-0" :class="i === 0 ? 'bg-primary' : 'bg-muted'" />
                    <div>
                      <p class="text-sm font-semibold">
                        {{ statusHistoryLabel(item) }}
                      </p>
                      <p class="text-xs text-muted mt-0.5">
                        {{ formatDateTime(item.createdAt) }}
                      </p>
                      <p class="text-xs text-muted italic mt-0.5">
                        {{ statusHistoryDesc(item) }}
                      </p>
                      <p v-if="item.actorName" class="text-xs text-muted mt-0.5 flex items-center gap-1">
                        <UIcon name="i-lucide-user" class="text-xs" />
                        {{ item.actorName }}<template v-if="item.actorRole"> · {{ item.actorRole }}</template>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="col-span-12 lg:col-span-8 rounded-xl border border-default bg-background overflow-hidden shadow-sm">
            <div class="px-5 py-4 border-b border-default flex items-center justify-between">
              <h3 class="font-semibold flex items-center gap-2">
                <UIcon name="i-lucide-clipboard-check" class="text-primary" />
                Medical Questionnaires List
              </h3>
              <UButton
                icon="i-lucide-printer"
                color="neutral"
                variant="outline"
                size="xs"
                label="Print All Results"
              />
            </div>
            <div class="overflow-x-auto">
              <div v-if="questionnairesLoading" class="flex items-center justify-center py-10">
                <UIcon name="i-lucide-loader-circle" class="animate-spin text-2xl text-muted" />
              </div>
              <div v-else-if="!questionnaires.length" class="py-10 text-center">
                <p class="text-sm text-muted">Belum ada questionnaire terisi.</p>
              </div>
              <table v-else class="w-full text-left">
                <thead>
                  <tr class="border-b border-default">
                    <th class="px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wide">
                      Questionnaire Name
                    </th>
                    <th class="px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wide text-center">
                      Completion Date
                    </th>
                    <th class="px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wide text-center">
                      Status
                    </th>
                    <th class="px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wide text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-default">
                  <tr v-for="q in questionnaires" :key="q.questionnaire_id" class="hover:bg-elevated transition-colors">
                    <td class="px-5 py-3">
                      <span class="text-sm font-semibold">{{ q.questionnaire_name }}</span>
                    </td>
                    <td class="px-5 py-3 text-center">
                      <span v-if="q.completionDate" class="text-sm text-muted">{{ formatDateTime(q.completionDate) }}</span>
                      <span v-else class="text-sm text-muted italic">Not completed</span>
                    </td>
                    <td class="px-5 py-3 text-center">
                      <UBadge
                        :label="q.status"
                        :color="q.status === 'Completed' ? 'success' : 'neutral'"
                        variant="subtle"
                        size="sm"
                      />
                    </td>
                    <td class="px-5 py-3 text-right">
                      <div class="flex justify-end gap-1">
                        <UButton
                          icon="i-lucide-message-circle"
                          color="success"
                          variant="ghost"
                          size="xs"
                          title="Kirim via WhatsApp"
                          :disabled="!reg?.patient?.phone"
                          @click="shareQuestionnaireViaWa(q.questionnaire_id)"
                        />
                        <UButton
                          icon="i-lucide-link"
                          color="neutral"
                          variant="ghost"
                          size="xs"
                          title="Copy Link"
                          @click="copyQuestionnaireLink(q.questionnaire_id)"
                        />
                        <UButton
                          icon="i-lucide-eye"
                          color="primary"
                          variant="ghost"
                          size="xs"
                          :disabled="q.status !== 'Completed'"
                          @click="q.status === 'Completed' && openModal(q)"
                        />
                        <UButton
                          icon="i-lucide-printer"
                          color="primary"
                          variant="ghost"
                          size="xs"
                          :disabled="q.status !== 'Completed'"
                        />
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div v-if="isMCU" class="col-span-12 rounded-xl border border-default bg-background overflow-hidden shadow-sm">
            <div class="px-5 py-4 border-b border-default flex flex-wrap items-center justify-between gap-3">
              <h3 class="font-semibold flex items-center gap-2">
                <UIcon name="i-lucide-activity" class="text-primary" />
                MCU Breakdown
              </h3>
              <UBadge
                :label="`${mcuCategories.length} department`"
                color="neutral"
                variant="subtle"
                size="sm"
              />
            </div>

            <div class="divide-y divide-default">
              <section v-for="cat in mcuCategories" :key="cat.label" class="px-5 py-4">
                <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <UIcon :name="cat.icon" class="text-primary" />
                      <h4 class="text-sm font-semibold text-highlighted">
                        {{ cat.label }}
                      </h4>
              <UBadge
                :label="getExamItemStatusLabel(cat.status)"
                :color="getExamItemStatusColor(cat.status)"
                variant="soft"
                size="xs"
                :icon="cat.status === 'DONE' ? 'i-lucide-check-circle-2' : 'i-lucide-clock'"
              />
{{ cat.updatedAt ? formatDateTime(cat.updatedAt) : '' }}
                    </div>
                    <p class="mt-1 text-xs text-muted">
                      {{ cat.completed }} selesai dari {{ cat.total }} item
                    </p>
                  </div>

                  <div class="w-full lg:max-w-xs">
                    <div class="mb-1 flex items-center justify-between text-xs text-muted">
                      <span>Progress</span>
                      <span class="font-medium text-highlighted">{{ cat.completed }}/{{ cat.total }}</span>
                    </div>
                    <div class="h-2 overflow-hidden rounded-full bg-elevated">
                      <div
                        class="h-full rounded-full bg-primary"
                        :style="{ width: `${cat.total ? Math.round((cat.completed / cat.total) * 100) : 0}%` }"
                      />
                    </div>
                  </div>
                </div>

                <div
                  v-if="cat.items.some(item => item.sampleCollections.length)"
                  class="mt-4 rounded-lg border border-info/30 bg-info/5 p-3"
                >
                  <div class="mb-3 flex items-center gap-2">
                    <UIcon name="i-lucide-test-tube-diagonal" class="text-info" />
                    <p class="text-xs font-semibold uppercase text-muted">
                      Status Sample
                    </p>
                  </div>
                  <div class="space-y-3">
                    <template v-for="item in cat.items" :key="`sample-${item.id}`">
                      <div
                        v-for="sample in item.sampleCollections"
                        :key="sample.id"
                        class="grid gap-2 rounded-lg border border-default bg-background p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
                      >
                        <div class="min-w-0">
                          <p class="text-sm font-semibold text-highlighted">
                            {{ item.name }} · {{ sample.sampleType?.name || sample.sampleType?.code || 'Sample' }}
                          </p>
                          <p v-if="sample.rejectReason" class="mt-0.5 text-xs text-error">
                            {{ sample.rejectReason }}
                          </p>
                        </div>
                        <div class="text-xs text-muted">
                          <span class="block font-medium text-highlighted">Collect</span>
                          {{ formatDateTime(sample.collectedAt || undefined) }}
                        </div>
                        <div class="text-xs text-muted">
                          <span class="block font-medium text-highlighted">Received</span>
                          {{ formatDateTime(sample.receivedAt || undefined) }}
                        </div>
                        <UBadge
                          class="sm:col-start-1"
                          :label="item.status === 'REFUSED' ? 'Rejected' : getSampleStatusLabel(sample.status)"
                          :color="item.status === 'REFUSED' ? 'error' : getSampleStatusColor(sample.status)"
                          variant="soft"
                          size="xs"
                        />
                      </div>
                    </template>
                  </div>
                </div>

                <div class="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <div class="rounded-lg border border-default bg-elevated/40 p-3">
                    <div class="mb-2 flex items-center justify-between gap-2">
                      <p class="text-xs font-semibold uppercase text-muted">
                        Belum selesai
                      </p>
                      <UBadge :label="`${cat.pendingItems.length} item`" color="neutral" variant="subtle" size="xs" />
                    </div>
                    <div v-if="cat.pendingItems.length" class="flex flex-wrap gap-2">
                      <div
                        v-for="item in cat.pendingItems"
                        :key="item.id"
                        class="flex max-w-full flex-col gap-1 whitespace-normal rounded-xl border px-3 py-2"
                        :class="getExamItemStatusColor(item.status) === 'error'
                          ? 'border-error/40 bg-error/10'
                          : getExamItemStatusColor(item.status) === 'warning'
                            ? 'border-warning/40 bg-warning/10'
                            : 'border-default bg-elevated/60'"
                      >
                        <span class="flex items-center gap-1.5 text-sm font-semibold text-highlighted">
                          <UIcon :name="getExamItemStatusIcon(item.status)" class="size-4 shrink-0" />
                          {{ item.name }}
                        </span>
                        <span v-if="['RESCHEDULED', 'REFUSED', 'RETEXT', 'REJECTED'].includes(item.status)" class="flex items-center gap-1.5 text-[11px] font-semibold"
                          :class="getExamItemStatusColor(item.status) === 'error' ? 'text-error' : 'text-warning'">
                          <UIcon :name="getExamItemStatusIcon(item.status)" class="size-3.5 shrink-0" />
                          {{ getExamItemStatusLabel(item.status) }} — FO Attention Required.{{ item.status === 'RESCHEDULED' && getRescheduleVisitDate(item.id) ? ` (${getRescheduleVisitDate(item.id)})` : '' }}
                        </span>
                        <span class="flex items-center gap-1 text-[11px] font-medium text-muted">
                          <UIcon name="i-lucide-play" class="size-3" />
                          Mulai {{ formatDateTime(item.startAt || undefined) }}
                          <span class="mx-1 text-muted">·</span>
                          <UIcon name="i-lucide-check" class="size-3" />
                          Selesai {{ item.done ? formatDateTime(item.doneAt || undefined) : 'Belum' }}
                        </span>
                      </div>
                    </div>
                    <p v-else class="text-sm text-muted">
                      Tidak ada item pending.
                    </p>
                  </div>

                  <div class="rounded-lg border border-default bg-background p-3">
                    <div class="mb-2 flex items-center justify-between gap-2">
                      <p class="text-xs font-semibold uppercase text-muted">
                        Selesai
                      </p>
                      <UBadge :label="`${cat.completedItems.length} item`" color="success" variant="subtle" size="xs" />
                    </div>
                    <div v-if="cat.completedItems.length" class="flex flex-wrap gap-2">
                      <div
                        v-for="item in cat.completedItems"
                        :key="item.id"
                        class="flex max-w-full flex-col gap-1 whitespace-normal rounded-xl border border-success/30 bg-success/10 px-3 py-2"
                      >
                        <span class="flex items-center gap-1.5 text-sm font-semibold text-highlighted">
                          <UIcon name="i-lucide-check-circle-2" class="size-4 shrink-0 text-success" />
                          {{ item.name }}
                        </span>
                        <span class="flex items-center gap-1 text-[11px] font-medium text-muted">
                          <UIcon name="i-lucide-play" class="size-3" />
                          Mulai {{ formatDateTime(item.startAt || undefined) }}
                          <span class="mx-1 text-muted">·</span>
                          <UIcon name="i-lucide-check" class="size-3" />
                          Selesai {{ formatDateTime(item.doneAt || undefined) }}
                        </span>
                      </div>
                    </div>
                    <p v-else class="text-sm text-muted">
                      Belum ada item selesai.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div v-if="isMCU && additionalItems.length" class="col-span-12 rounded-xl border border-default bg-background overflow-hidden shadow-sm">
            <div class="px-5 py-4 border-b border-default flex items-center justify-between">
              <h3 class="font-semibold flex items-center gap-2">
                <UIcon name="i-lucide-plus-circle" class="text-primary" />
                Additional Exam Items
              </h3>
              <UBadge
                :label="`${additionalItems.length} item`"
                color="neutral"
                variant="subtle"
                size="sm"
              />
            </div>
            <div class="p-5">
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div v-for="ei in additionalItems" :key="ei.id" class="flex items-center justify-between bg-elevated rounded-xl border border-default px-4 py-3">
                  <div>
                    <p class="text-sm font-semibold">
                      {{ ei.item.name }}
                    </p>
                    <p class="text-xs text-muted mt-0.5">
                      {{ ei.item.department?.name ?? '-' }} | {{ ei.item.group?.name ?? '-' }}
                    </p>
                  </div>
                  <UBadge
                    :label="getExamItemStatusLabel(getExamItemStatus(ei))"
                    :color="getExamItemStatusColor(getExamItemStatus(ei))"
                    variant="soft"
                    size="xs"
                    :icon="getExamItemStatusIcon(getExamItemStatus(ei))"
                  />
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <UModal v-model:open="checkinModalOpen" title="Verifikasi Check-in Pasien">
        <template #body>
          <div v-if="checkinPreviewLoading" class="flex items-center justify-center py-10">
            <UIcon name="i-lucide-loader-circle" class="animate-spin text-2xl text-muted" />
          </div>

          <div v-else class="space-y-4">
            <div class="flex items-center gap-3 p-4 rounded-xl bg-elevated border border-default">
              <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <UIcon name="i-lucide-user-circle" class="text-primary text-2xl" />
              </div>
              <div>
                <p class="font-bold text-base">
                  {{ checkinPreview?.patient?.patientName ?? reg?.patient?.patientName ?? '-' }}
                </p>
                <p class="text-xs text-muted mt-0.5">
                  {{ checkinPreview?.patient?.idType ?? reg?.patient?.idType }}: {{ checkinPreview?.patient?.idNumber ?? reg?.patient?.idNumber }}
                </p>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="p-3 rounded-xl bg-elevated border border-default">
                <p class="text-xs text-muted mb-1">
                  No. Registrasi
                </p>
                <code class="text-sm font-bold text-primary">{{ checkinPreview?.registration.id_reg ?? reg?.id_reg }}</code>
              </div>
              <div class="p-3 rounded-xl bg-elevated border border-default">
                <p class="text-xs text-muted mb-1">
                  Layanan
                </p>
                <p class="text-sm font-semibold">
                  {{ SERVICE_LABEL[checkinPreview?.registration.serviceType ?? reg?.serviceType ?? ''] ?? checkinPreview?.registration.serviceType ?? reg?.serviceType }}
                </p>
              </div>
              <div class="p-3 rounded-xl bg-elevated border border-default">
                <p class="text-xs text-muted mb-1">
                  Tanggal Periksa
                </p>
                <p class="text-sm font-semibold">
                  {{ checkinPreview?.registration.examDate ?? reg?.examDate }}
                </p>
              </div>
              <div class="p-3 rounded-xl bg-elevated border border-default">
                <p class="text-xs text-muted mb-1">
                  Branch
                </p>
                <p class="text-sm font-semibold">
                  {{ checkinPreview?.branch?.nameBranch ?? reg?.branch?.nameBranch ?? '-' }}
                </p>
              </div>
            </div>

            <div class="rounded-xl border border-default bg-elevated/60 p-4">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-xs text-muted">
                    Paket MCU
                  </p>
                  <p class="text-sm font-semibold">
                    {{ checkinPreview?.examVerification.paket?.name ?? reg?.exam?.paket?.name ?? '-' }}
                  </p>
                </div>
                <UBadge :label="`${checkinPreview?.examVerification.totalItems ?? 0} item`" color="neutral" variant="subtle" />
              </div>

              <div class="mt-4 space-y-3">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-wide text-muted mb-2">
                    Item Paket
                  </p>
                  <div v-if="checkinPaketItems.length" class="space-y-2">
                    <div v-for="item in checkinPaketItems" :key="item.id" class="flex items-start justify-between gap-3 rounded-lg border border-default bg-background px-3 py-2">
                      <div>
                        <p class="text-sm font-medium">
                          {{ item.item.name }}
                        </p>
                        <p class="text-xs text-muted">
                          {{ item.item.department?.name ?? '-' }} | {{ item.item.group?.name ?? '-' }}
                        </p>
                      </div>
                      <span class="text-[11px] font-medium text-muted">{{ item.source }}</span>
                    </div>
                  </div>
                  <p v-else class="text-sm text-muted">
                    Belum ada item paket.
                  </p>
                </div>

                <div>
                  <p class="text-xs font-semibold uppercase tracking-wide text-muted mb-2">
                    Item Additional
                  </p>
                  <div v-if="checkinAdditionalItems.length" class="space-y-2">
                    <div v-for="item in checkinAdditionalItems" :key="item.id" class="flex items-start justify-between gap-3 rounded-lg border border-default bg-background px-3 py-2">
                      <div>
                        <p class="text-sm font-medium">
                          {{ item.item.name }}
                        </p>
                        <p class="text-xs text-muted">
                          {{ item.item.department?.name ?? '-' }} | {{ item.item.group?.name ?? '-' }}
                        </p>
                      </div>
                      <span class="text-[11px] font-medium text-primary">additional</span>
                    </div>
                  </div>
                  <p v-else class="text-sm text-muted">
                    Tidak ada item tambahan.
                  </p>
                </div>
              </div>
            </div>

            <div
              class="rounded-xl border p-4"
              :class="checkinPreview?.checkinEligibility.canCheckin ? 'border-green-200 bg-green-50/80' : 'border-amber-200 bg-amber-50/80'"
            >
              <p class="text-sm font-semibold">
                {{ checkinPreview?.checkinEligibility.canCheckin ? 'Data siap di-check-in ke queue umum' : 'Data belum siap di-check-in' }}
              </p>
              <ul v-if="checkinPreview && checkinPreview.checkinEligibility.reasons.length" class="mt-2 space-y-1 text-sm text-muted">
                <li v-for="reason in checkinPreview.checkinEligibility.reasons" :key="reason">
                  - {{ reason }}
                </li>
              </ul>
              <p v-else class="mt-2 text-sm text-muted">
                Sistem akan membuat nomor antrian dan memasukkan pasien ke ruang tunggu umum.
              </p>
            </div>
          </div>
        </template>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              label="Batal"
              :disabled="checkinLoading"
              @click="checkinModalOpen = false"
            />
            <UButton
              color="primary"
              icon="i-lucide-user-check"
              label="Check-in ke Queue Umum"
              :loading="checkinLoading"
              :disabled="checkinPreviewLoading || !checkinPreview?.checkinEligibility.canCheckin"
              @click="confirmCheckin"
            />
          </div>
        </template>
      </UModal>

      <UModal v-model:open="checkinSuccessOpen" title="Check-in Berhasil">
        <template #body>
          <div class="flex flex-col items-center gap-4 py-4 text-center">
            <div class="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <UIcon name="i-lucide-check-circle-2" class="text-green-500 text-4xl" />
            </div>
            <div>
              <p class="text-sm text-muted mb-2">
                Nomor Antrian
              </p>
              <p class="text-5xl font-black text-primary tracking-tight">
                {{ reg?.queue?.queueCode }}
              </p>
            </div>
            <p class="text-sm text-muted max-w-xs">
              Pasien telah masuk ruang tunggu. Petugas masing-masing ruangan akan memanggil sesuai urutan.
            </p>
          </div>
        </template>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              icon="i-lucide-printer"
              color="neutral"
              variant="outline"
              label="Print Tiket"
            />
            <UButton color="primary" label="Selesai" @click="checkinSuccessOpen = false" />
          </div>
        </template>
      </UModal>

      <UModal v-model:open="dateBlockedOpen" title="Belum Waktunya Check-in">
        <template #body>
          <div class="flex flex-col items-center gap-4 py-2 text-center">
            <div class="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center">
              <UIcon name="i-lucide-calendar-x" class="text-warning text-3xl" />
            </div>
            <div class="space-y-1">
              <p class="text-sm text-muted">
                Exam pasien dijadwalkan pada tanggal
              </p>
              <p class="text-2xl font-bold tracking-tight text-highlighted">
                {{ reg?.examDate?.slice(0, 10) }}
              </p>
              <p class="text-xs text-muted max-w-sm leading-relaxed">
                Check-in hanya dapat dilakukan pada hari exam.
              </p>
            </div>
          </div>
        </template>
        <template #footer>
          <div class="flex justify-end">
            <UButton color="primary" label="Mengerti" @click="dateBlockedOpen = false" />
          </div>
        </template>
      </UModal>

      <UModal v-model:open="modalOpen" :title="modalTitle">
        <template #body>
          <div class="space-y-3">
            <div v-if="modalAnswers.length" class="space-y-3">
              <div v-for="a in modalAnswers" :key="a.questionId" class="p-3 bg-elevated rounded-lg">
                <p class="text-xs text-muted mb-1">
                  {{ a.questionText }}
                </p>
                <p class="text-sm font-semibold">
                  {{ formatAnswer(a) }}
                </p>
              </div>
            </div>
            <p v-else class="text-sm text-muted text-center py-4">
              Tidak ada jawaban.
            </p>
          </div>
        </template>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              label="Close"
              @click="modalOpen = false"
            />
          </div>
        </template>
      </UModal>

      <UModal v-model:open="showRescheduleModal" title="Reschedule Visit Date">
        <template #body>
          <div class="space-y-4">
            <p class="text-sm text-muted">Pilih tanggal datang ulang pasien untuk item yang di-reschedule:</p>
            <div v-for="(item, idx) in rescheduleDraft" :key="item.roomExamItemId" class="flex flex-col gap-2 rounded-lg border border-default p-3">
              <p class="text-sm font-semibold text-highlighted">{{ item.itemName }}</p>
              <UInput v-model="item.visitDate" type="date" class="w-full" />
            </div>
          </div>
        </template>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton label="Batal" variant="outline" :disabled="savingReschedule" @click="showRescheduleModal = false" />
            <UButton
              v-if="rescheduleMode === 'dates'"
              label="Simpan Tanggal"
              color="primary"
              :loading="savingReschedule"
              @click="saveRescheduleDatesOnly"
            />
            <UButton
              v-else
              label="Simpan & Checkout"
              color="primary"
              :loading="savingReschedule"
              @click="doCheckout"
            />
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
