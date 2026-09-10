<script setup lang="ts">
import type { Room } from '~/types/room'

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

type PatientName = {
  id?: number | string | null
  PatientId?: string | null
  firstName?: string | null
  middleName?: string | null
  lastName?: string | null
  gender?: string | null
  dob?: string | null
  phone?: string | null
}

type RoomQueueItem = {
  id: string
  roomTypeId: string
  tierOrder: number
  status: string
  unlockedAt?: string | null
  doneAt?: string | null
  queueEntry?: {
    id: string
    queueCode: string
    queueNumber: number
    type: string
    checkinAt?: string | null
    doneAt?: string | null
    registration?: {
      id: number
      id_reg?: string | null
      examDate?: string | null
      scheduleDateExam?: string | null
      patient?: {
        id: number
        PatientId?: string | null
        firstName?: string | null
        middleName?: string | null
        lastName?: string | null
        gender?: string | null
        dob?: string | null
        phone?: string | null
      } | null
    } | null
    sampleCollections?: Array<{
      id: string
      status: string
      sampleType?: {
        id: string
        name?: string | null
      } | null
    }>
  } | null
  stageItems?: Array<{
    id: string
    stageId?: string | null
    stageOrder: number
    status: string
    roomId?: string | null
    stage?: {
      id: string
      code: string
      name: string
    } | null
  }>
  examItems?: Array<{
    id: string
    status: string
    trxExamItem?: {
      item?: {
        id: string
        code?: string | null
        name?: string | null
      } | null
    } | null
  }>
  meal?: MealInfo | null
}

type QueueHistoryRow = {
  id: string
  queueEntryId: string | null
  queueCode: string
  queueType: string
  tierOrder: number
  patientName: string
  patientId: string
  patientReg: string | null
  patientGender: string | null
  patientDob: string | null
  patientPhone: string | null
  examDate: string | null
  rescheduleDate: string | null
  roomName: string
  roomLabel: string
  itemSummary: string
  stageSummary: string
  sampleSummary: string
  hasSample: boolean
  status: string
  statusLabel: string
  statusColor: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
  checkinAt: string | null
  completedAt: string | null
  registrationId?: number | null
  roomTypeId?: string | null
}

type SampleUser = {
  id: number
  name: string
  email?: string | null
}

type SampleCollectionDetail = {
  id: string
  status: string
  tubeCount?: number | null
  barcode?: string | null
  collectedAt?: string | null
  receivedAt?: string | null
  rejectReason?: string | null
  rescheduledAt?: string | null
  sampleType?: {
    id: string
    name?: string | null
  } | null
  collectedByUser?: SampleUser | null
  receivedByUser?: SampleUser | null
  items?: Array<{
    id: string
    item?: {
      id: string
      code?: string | null
      name?: string | null
    } | null
  }>
  queueEntry?: {
    id: string
    queueCode?: string | null
    registration?: {
      id: number
      id_reg?: string | null
      patient?: {
        id: number
        PatientId?: string | null
        firstName?: string | null
        middleName?: string | null
        lastName?: string | null
        gender?: string | null
        dob?: string | null
        phone?: string | null
      } | null
    } | null
  } | null
}

type WaitingRow = {
  id: string
  stageId: string | null
  queueCode: string
  queueType: string
  tierOrder: number
  patientName: string
  patientId: string
  patientGender: string | null
  patientDob: string | null
  patientPhone: string | null
  examDate: string | null
  rescheduleDate?: string | null
  roomName: string
  itemSummary: string
  stageSummary: string
  status: string
  statusLabel: string
  statusColor: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
  checkinAt: string | null
  meal?: MealInfo | null
}

type MealInfo = {
  examId?: string | null
  status: string | null
  startedAt?: string | null
  completedAt?: string | null
  durationMinutes?: number | null
}

const api = useApi()
const router = useRouter()
const toast = useToast()
const now = ref(Date.now())
let clockTimer: ReturnType<typeof setInterval> | null = null

function syncMealProgression(rows: WaitingRow[]) {
  const hasInProgress = rows.some(r => {
    const status = r.meal?.status ?? (r.meal as Record<string, unknown> | null)?.mealStatus
    return status === 'IN_PROGRESS'
  })
  if (hasInProgress) {
    if (!clockTimer) {
      let tickCount = 0
      clockTimer = setInterval(() => {
        now.value = Date.now()
        tickCount += 1

        // Check if any meal has run out (remaining === 0) or every 15 seconds
        let hitZero = false
        for (const r of rows) {
          const status = r.meal?.status ?? (r.meal as Record<string, unknown> | null)?.mealStatus
          if (status === 'IN_PROGRESS') {
            const mealObj = r.meal as Record<string, unknown> | null
            const startedAt = r.meal?.startedAt ?? (mealObj?.mealStartedAt as string | undefined | null)
            const durationMin = r.meal?.durationMinutes ?? (mealObj?.mealDurationMinutes as number | undefined | null) ?? 0
            if (startedAt && durationMin) {
              const started = new Date(startedAt).getTime()
              const durationMs = durationMin * 60 * 1000
              const remaining = Math.max(0, started + durationMs - now.value)
              if (remaining === 0) {
                hitZero = true
                break
              }
            }
          }
        }

        if (hitZero || tickCount % 15 === 0) {
          void refreshWaiting()
        }
      }, 1000)
    }
  } else if (clockTimer) {
    clearInterval(clockTimer)
    clockTimer = null
  }
}
function mealTimeRemaining(row: WaitingRow): string {
  const status = row.meal?.status
  if (status !== 'IN_PROGRESS') return ''
  const mealObj = row.meal as Record<string, unknown> | null
  const startedAt = row.meal?.startedAt ?? (mealObj?.mealStartedAt as string | undefined | null)
  if (!startedAt) return ''
  const started = new Date(startedAt).getTime()
  const durationMin = row.meal?.durationMinutes ?? (mealObj?.mealDurationMinutes as number | undefined | null) ?? 0
  const durationMs = durationMin * 60 * 1000
  if (!started || !durationMs) return ''
  const remaining = Math.max(0, started + durationMs - now.value)
  const totalSec = Math.floor(remaining / 1000)
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0')
  const ss = String(totalSec % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

function mealShortTime(value: string | undefined | null): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

const completeMealTarget = ref<WaitingRow | null>(null)
const completeMealConfirmOpen = ref(false)

function askCompleteMeal(row: WaitingRow) {
  completeMealTarget.value = row
  completeMealConfirmOpen.value = true
}

async function completeMealFromList() {
  const row = completeMealTarget.value
  const examId = row?.meal?.examId
  if (!examId) return
  try {
    await api.post(`/medical/exams/${examId}/meal/complete`)
    toast.add({ title: 'Success', description: 'Meal completed', color: 'success' })
    void refreshWaiting()
  } catch (err: unknown) {
    const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
    toast.add({ title: 'Failed', description: msg || 'Failed to complete meal', color: 'error' })
  } finally {
    completeMealTarget.value = null
    completeMealConfirmOpen.value = false
  }
}
const { user, isSuperAdmin, allowedSelfRooms } = await useCurrentUser()
const {
  session: roomSession,
  pending: roomSessionPending,
  refresh: refreshRoomSession,
  enterRoomSession,
  exitRoomSession
} = await useRoomSession()
const {
  roomTypeOptions,
  pending: roomTypesPending,
  refresh: refreshRoomTypes
} = await useRoomTypes()

const today = new Date().toISOString().slice(0, 10)
const isWaitingModalOpen = ref(false)
const isEnterRoomModalOpen = ref(false)
const isExitRoomModalOpen = ref(false)
const isChangeRoomModalOpen = ref(false)
const changeRoomOptions = ref<Array<{ id: string, name?: string, code?: string | null, roomType?: { name?: string } | null }>>([])
const roomEnterActionLoading = ref(false)
const roomExitActionLoading = ref(false)
const changeRoomLoading = ref(false)
const isChangingRoom = ref(false)
const waitingRowActionLoading = ref<Record<string, boolean>>({})
type WaitingStatusFilter = 'WAITING' | 'CALLED' | 'IN_PROGRESS' | 'ALL'
type HistoryStatusFilter = 'DONE' | 'SKIPPED' | 'RESCHEDULED' | 'REFUSED' | 'CALLED' | 'IN_PROGRESS' | 'ALL'
type QueueStoredFilters = {
  waitingRoomTypeId: string
  historyDepartmentId: string
  waitingStatus: WaitingStatusFilter
  historyStatus: HistoryStatusFilter
  examDateFrom: string
  examDateTo: string
}

const waitingStatusValues: WaitingStatusFilter[] = ['WAITING', 'CALLED', 'IN_PROGRESS', 'ALL']
const historyStatusValues: HistoryStatusFilter[] = ['DONE', 'SKIPPED', 'RESCHEDULED', 'REFUSED', 'CALLED', 'IN_PROGRESS', 'ALL']
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function sanitizeQueueFilters(value: unknown): Partial<QueueStoredFilters> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const stored = value as Record<string, unknown>
  const waitingRoomTypeId = typeof stored.waitingRoomTypeId === 'string' && uuidPattern.test(stored.waitingRoomTypeId)
    ? stored.waitingRoomTypeId
    : ''
  const historyDepartmentId = typeof stored.historyDepartmentId === 'string' && uuidPattern.test(stored.historyDepartmentId)
    ? stored.historyDepartmentId
    : ''

  const examDateFrom = typeof stored.examDateFrom === 'string' ? stored.examDateFrom : today
  const examDateTo = typeof stored.examDateTo === 'string' ? stored.examDateTo : today

  return {
    waitingRoomTypeId,
    historyDepartmentId,
    waitingStatus: waitingStatusValues.includes(stored.waitingStatus as WaitingStatusFilter)
      ? stored.waitingStatus as WaitingStatusFilter
      : 'WAITING',
    historyStatus: historyStatusValues.includes(stored.historyStatus as HistoryStatusFilter)
      ? stored.historyStatus as HistoryStatusFilter
      : 'ALL',
    examDateFrom,
    examDateTo
  }
}

const queueFilterState = useSafeLocalStorageState<QueueStoredFilters>(
  `erp-kyoai:rooms:queue:filters:user:${user.value?.id ?? 'anonymous'}`,
  {
    waitingRoomTypeId: '',
    historyDepartmentId: '',
    waitingStatus: 'WAITING',
    historyStatus: 'ALL',
    examDateFrom: today,
    examDateTo: today
  },
  sanitizeQueueFilters
)
const selectedWaitingRoomTypeId = toRef(queueFilterState, 'waitingRoomTypeId')
const selectedHistoryDepartmentId = toRef(queueFilterState, 'historyDepartmentId')
const waitingStatusFilter = toRef(queueFilterState, 'waitingStatus')
const waitingExamDateFrom = ref(today)
const waitingExamDateTo = ref(today)
const historyStatusFilter = toRef(queueFilterState, 'historyStatus')
const examDateFromFilter = toRef(queueFilterState, 'examDateFrom')
const examDateToFilter = toRef(queueFilterState, 'examDateTo')
const historyStatusOptions = [
  { label: 'Done', value: 'DONE' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Skipped', value: 'SKIPPED' },
  { label: 'Rescheduled', value: 'RESCHEDULED' },
  { label: 'Refused', value: 'REFUSED' },
  { label: 'Called', value: 'CALLED' },
  { label: 'All', value: 'ALL' }
]

type ActiveRoomSession = {
  roomId: string
  roomCode: string
  roomName: string
  roomTypeId: string
  roomTypeName?: string | null
  staffCapacity: number
  activeCount: number
  staff: Array<{
    sessionId: string
    userId: number
    name: string
    startedAt: string
  }>
}

const {
  data: activeRoomSessions,
  pending: activeSessionsPending,
  refresh: refreshActiveSessions
} = await useAsyncData<ActiveRoomSession[]>(
  'room-sessions-active',
  async () => {
    try {
      const res = await api.get('/medical/rooms/sessions/active')
      const payload = res.data?.data ?? res.data ?? []
      return Array.isArray(payload) ? payload : []
    } catch {
      return []
    }
  },
  { default: () => [], server: false }
)

const {
  data: assignmentData,
  pending: assignmentPending,
  refresh: refreshAssignment
} = await useAsyncData<RoomAssignment | null>(
  'room-assignment-me',
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

const assignment = computed(() => assignmentData.value ?? null)
const roomTypeId = computed(() => assignment.value?.roomTypeId ?? activeRoomSession.value?.roomTypeId ?? null)

const {
  data: myRoomData
} = await useAsyncData<Room | null>(
  'my-room-detail',
  async () => {
    if (!assignment.value?.roomId) return null

    try {
      const res = await api.get(`/medical/rooms/rooms/${assignment.value.roomId}`)
      const payload = res.data?.data ?? res.data
      return (payload ?? null) as Room | null
    } catch {
      return null
    }
  },
  {
    default: () => null,
    watch: [assignment],
    server: false
  }
)

const myRoom = computed(() => myRoomData.value ?? null)
const myStageIds = computed(() =>
  (myRoom.value?.stageLinks ?? []).map(link => link.stageId)
)
const myRoomId = computed(() => assignment.value?.roomId ?? null)
const activeRoomSession = computed(() => {
  if (!roomSession.value?.id || roomSession.value.endedAt) return null
  return roomSession.value as RoomSession
})
const canEnterRoom = computed(() => Boolean(assignment.value?.roomId) && !activeRoomSession.value)

const autoEnterRoomAttempted = ref(false)

async function autoEnterAssignedRoom() {
  if (autoEnterRoomAttempted.value) return
  if (assignmentPending.value || roomSessionPending.value) return

  const assignedRoomId = assignment.value?.roomId
  if (!assignedRoomId || activeRoomSession.value) return

  autoEnterRoomAttempted.value = true
  try {
    await enterRoomSession({ roomId: assignedRoomId })
  } catch {
    await refreshRoomSession()
  }
}

watch(
  [
    () => assignment.value?.roomId,
    () => activeRoomSession.value?.id,
    () => assignmentPending.value,
    () => roomSessionPending.value
  ],
  () => {
    void autoEnterAssignedRoom()
  },
  { immediate: true }
)
const effectiveWaitingRoomTypeId = computed(() =>
  isSuperAdmin.value ? selectedWaitingRoomTypeId.value : roomTypeId.value
)

// History by department — no room assignment needed.
const departmentOptions = ref<Array<{ id: string, name: string }>>([])
const departmentOptionsPending = ref(false)
async function loadDepartmentOptions() {
  departmentOptionsPending.value = true
  try {
    const res = await api.get('/medical/departments')
    const payload = res.data?.data ?? []
    departmentOptions.value = Array.isArray(payload) ? payload.map((d: { id: string, name: string }) => ({ id: d.id, name: d.name })) : []
  } catch {
    departmentOptions.value = []
  } finally {
    departmentOptionsPending.value = false
  }
}
const effectiveHistoryDepartmentId = computed(() => selectedHistoryDepartmentId.value)

const historyPage = ref(1)
const historyPageSize = ref(20)
const historyTotal = ref(0)

watch([effectiveHistoryDepartmentId, historyStatusFilter, examDateFromFilter, examDateToFilter], () => {
  historyPage.value = 1
})

const {
  data: historyData,
  pending: historyPending,
  refresh: refreshHistory
} = await useAsyncData<RoomQueueItem[]>(
  'room-queue-history',
  async () => {
    if (!effectiveHistoryDepartmentId.value) return []

    // Send ALL explicitly so backend can distinguish it from
    // an empty status which means the default WAITING/PARTIAL queue.
    const status = historyStatusFilter.value

    const res = await api.get(`/medical/exams/queue/department/${effectiveHistoryDepartmentId.value}`, {
      params: {
        examDateFrom: examDateFromFilter.value || undefined,
        examDateTo: examDateToFilter.value || undefined,
        status,
        limit: historyPageSize.value,
        page: historyPage.value,
        _: Date.now()
      }
    })

    const nested = res.data?.data ?? res.data
    const list = Array.isArray(nested) ? nested : nested?.data ?? []
    const meta = nested && typeof nested === 'object' && !Array.isArray(nested) ? nested.meta : res.data?.meta ?? null
    historyTotal.value = Number(meta?.total ?? list.length)
    return list
  },
  {
    default: () => [],
    watch: [effectiveHistoryDepartmentId, historyStatusFilter, examDateFromFilter, examDateToFilter, historyPage, historyPageSize],
    server: false
  }
)

const {
  data: waitingData,
  pending: waitingPending,
  refresh: refreshWaiting
} = await useAsyncData<RoomQueueItem[]>(
  'room-queue-waiting',
  async () => {
    if (!isWaitingModalOpen.value || !effectiveWaitingRoomTypeId.value) return []
    const status = waitingStatusFilter.value === 'ALL' ? undefined : waitingStatusFilter.value

    const params: Record<string, any> = {
      status,
      limit: 100,
      page: 1,
      _: Date.now()
    }
    // Filter by queue date (queueDate) — patients appear based on the day they entered the queue
    // (termasuk resample/datang kembali), bukan examDate registration.
    if (waitingExamDateFrom.value) params.queueDateFrom = waitingExamDateFrom.value
    if (waitingExamDateTo.value) params.queueDateTo = waitingExamDateTo.value
    if (!waitingExamDateFrom.value && !waitingExamDateTo.value) {
      params.queueDate = today
    }

    const res = await api.get(`/medical/exams/queue/room/${effectiveWaitingRoomTypeId.value}`, { params })

    const payload = res.data?.data ?? res.data
    return Array.isArray(payload) ? payload : payload?.data ?? []
  },
  {
    default: () => [],
    watch: [effectiveWaitingRoomTypeId, isWaitingModalOpen, waitingStatusFilter, waitingExamDateFrom, waitingExamDateTo],
    server: false
  }
)

const historyItems = computed(() =>
  [...(historyData.value ?? [])]
    .filter(item => historyStatusFilter.value === 'ALL' || item.status === historyStatusFilter.value)
    .sort((a, b) => {
      const left = new Date(b.doneAt || b.queueEntry?.doneAt || b.queueEntry?.checkinAt || 0).getTime()
      const right = new Date(a.doneAt || a.queueEntry?.doneAt || a.queueEntry?.checkinAt || 0).getTime()
      return left - right
    })
)

const waitingItems = computed(() =>
  [...(waitingData.value ?? [])].sort((a, b) => {
    const left = new Date(b.queueEntry?.checkinAt ?? b.unlockedAt ?? 0).getTime()
    const right = new Date(a.queueEntry?.checkinAt ?? a.unlockedAt ?? 0).getTime()
    return left - right
  })
)

function itemHasMyStage(item: RoomQueueItem): boolean {
  if (!myStageIds.value.length) return isSuperAdmin.value
  if (!item.stageItems?.length) return false
  return item.stageItems.some(stage => !!stage.stageId && myStageIds.value.includes(stage.stageId))
}

function itemHandledByMyRoom(item: RoomQueueItem): boolean {
  if (!myRoomId.value) return false
  if (!item.stageItems?.length) return false
  return item.stageItems.some(
    stage => !!stage.stageId && myStageIds.value.includes(stage.stageId) && stage.roomId === myRoomId.value
  )
}

function itemInPublicWaiting(item: RoomQueueItem): boolean {
  if (!myStageIds.value.length) return isSuperAdmin.value
  if (!item.stageItems?.length) return false
  return item.stageItems.some(
    stage => !!stage.stageId && myStageIds.value.includes(stage.stageId) && !stage.roomId
  )
}

const visibleWaitingItems = computed(() =>
  waitingItems.value.filter((item) => {
    if (isSuperAdmin.value) return true
    if (!myStageIds.value.length) return true
    return itemInPublicWaiting(item) || itemHandledByMyRoom(item)
  })
)

const visibleHistoryItems = computed(() =>
  historyItems.value.filter((item) => {
    if (isSuperAdmin.value) return true
    if (!myStageIds.value.length) return true
    return itemHasMyStage(item)
  })
)

const historyRows = computed<QueueHistoryRow[]>(() =>
  visibleHistoryItems.value.map((item) => {
    const registration = item.queueEntry?.registration
    const patient = registration?.patient
    const itemNames = (item.examItems ?? [])
      .map(examItem => examItem.trxExamItem?.item?.name)
      .filter((value): value is string => Boolean(value))
    const sampleParts = (item.queueEntry?.sampleCollections ?? []).map(sample => `${sample.sampleType?.name || 'Sample'}: ${getSampleStatusLabel(sample.status)}`)
    const stageSummary = formatStageColumn(item.stageItems)
    const roomBadge = buildRoomStatusBadge(item)
    const itemRoom = roomTypeNameById(item.roomTypeId)

    return {
      id: item.id,
      queueEntryId: item.queueEntry?.id ?? null,
      queueCode: item.queueEntry?.queueCode || '-',
      queueType: item.queueEntry?.type || '-',
      tierOrder: item.tierOrder,
      patientName: formatPatientName(patient ?? null),
      patientId: patient?.PatientId || '-',
      patientReg: registration?.id_reg ?? null,
      patientGender: patient?.gender ?? null,
      patientDob: patient?.dob ?? null,
      patientPhone: patient?.phone ?? null,
      examDate: registration?.examDate ?? null,
      rescheduleDate: registration?.scheduleDateExam ?? null,
      roomName: itemRoom,
      roomLabel: assignment.value?.roomType?.name
        ? `${assignment.value.roomType.name} · Tier ${item.tierOrder}`
        : `Tier ${item.tierOrder}`,
      itemSummary: itemNames.length > 0
        ? `${itemNames.slice(0, 2).join(', ')}${itemNames.length > 2 ? ` +${itemNames.length - 2}` : ''}`
        : '-',
      stageSummary,
      sampleSummary: sampleParts.length > 0 ? sampleParts.join(' | ') : '-',
      hasSample: (item.queueEntry?.sampleCollections ?? []).length > 0,
      status: item.status,
      statusLabel: roomBadge.label,
      statusColor: roomBadge.color,
      checkinAt: item.queueEntry?.checkinAt ?? null,
      completedAt: item.doneAt ?? item.queueEntry?.doneAt ?? null,
      registrationId: registration?.id ?? null,
      roomTypeId: item.roomTypeId ?? null
    }
  })
)

const waitingRows = computed<WaitingRow[]>(() =>
  visibleWaitingItems.value.map((item) => {
    const registration = item.queueEntry?.registration
    const patient = registration?.patient
    const itemNames = (item.examItems ?? [])
      .map(examItem => examItem.trxExamItem?.item?.name)
      .filter((value): value is string => Boolean(value))
    const stageSummary = formatStageColumn(item.stageItems)
    const waitingStage = (item.stageItems ?? []).find(stage => stage.status === 'WAITING')
    const statusBadge = buildRoomStatusBadge(item)
    const itemRoom = roomTypeNameById(item.roomTypeId)

    return {
      id: item.id,
      stageId: waitingStage?.id ?? null,
      queueCode: item.queueEntry?.queueCode || '-',
      queueType: item.queueEntry?.type || '-',
      tierOrder: item.tierOrder,
      patientName: formatPatientName(patient ?? null),
      patientId: patient?.PatientId || '-',
      patientGender: patient?.gender ?? null,
      patientDob: patient?.dob ?? null,
      patientPhone: patient?.phone ?? null,
      examDate: registration?.examDate ?? null,
      rescheduleDate: registration?.scheduleDateExam ?? null,
      roomName: itemRoom,
      itemSummary: itemNames.length > 0
        ? `${itemNames.slice(0, 2).join(', ')}${itemNames.length > 2 ? ` +${itemNames.length - 2}` : ''}`
        : '-',
      stageSummary,
      status: item.status,
      statusLabel: statusBadge.label,
      statusColor: statusBadge.color,
      checkinAt: item.queueEntry?.checkinAt ?? null,
      meal: item.meal ?? null
    }
  })
)

const {
  data: waitingStatsData,
  refresh: refreshWaitingStats
} = await useAsyncData<number>(
  'room-queue-waiting-stats',
  async () => {
    if (!effectiveHistoryDepartmentId.value) return 0

    const res = await api.get(`/medical/exams/queue/department/${effectiveHistoryDepartmentId.value}`, {
      params: {
        examDateFrom: examDateFromFilter.value || undefined,
        examDateTo: examDateToFilter.value || undefined,
        status: 'WAITING',
        limit: 1,
        page: 1,
        _: Date.now()
      }
    })

    const nested = res.data?.data ?? res.data
    const list = Array.isArray(nested) ? nested : nested?.data ?? []
    const meta = nested && typeof nested === 'object' && !Array.isArray(nested) ? nested.meta : res.data?.meta ?? null
    return Number(meta?.total ?? list.length)
  },
  {
    default: () => 0,
    watch: [effectiveHistoryDepartmentId, examDateFromFilter, examDateToFilter],
    server: false
  }
)

const {
  data: lockedStatsData,
  refresh: refreshLockedStats
} = await useAsyncData<number>(
  'room-queue-locked-stats',
  async () => {
    if (!effectiveHistoryDepartmentId.value) return 0

    const res = await api.get(`/medical/exams/queue/department/${effectiveHistoryDepartmentId.value}`, {
      params: {
        examDateFrom: examDateFromFilter.value || undefined,
        examDateTo: examDateToFilter.value || undefined,
        status: 'LOCKED',
        limit: 1,
        page: 1,
        _: Date.now()
      }
    })

    const nested = res.data?.data ?? res.data
    const list = Array.isArray(nested) ? nested : nested?.data ?? []
    const meta = nested && typeof nested === 'object' && !Array.isArray(nested) ? nested.meta : res.data?.meta ?? null
    return Number(meta?.total ?? list.length)
  },
  {
    default: () => 0,
    watch: [effectiveHistoryDepartmentId, examDateFromFilter, examDateToFilter],
    server: false
  }
)

const historyStats = computed(() => ({
  completed: historyRows.value.length,
  waiting: waitingStatsData.value ?? 0,
  locked: lockedStatsData.value ?? 0,
  access: isSuperAdmin.value ? 'Super Admin' : (roomTypeId.value ? 'Assignment Room' : 'Need Assignment')
}))

watch(
  () => waitingRows.value,
  (rows) => {
    syncMealProgression(rows)
    if (!rows.some(r => r.meal?.status === 'IN_PROGRESS')) {
      now.value = Date.now()
    }
  },
  { deep: true }
)

// Stop polling when the modal closes — the interval must not run in the background.
watch(
  () => isWaitingModalOpen.value,
  (open) => {
    if (!open && clockTimer) {
      clearInterval(clockTimer)
      clockTimer = null
    }
  }
)

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string, errors?: unknown } } }).response
    return response?.data?.message || fallback
  }

  return fallback
}

function formatQueueDate(dateString?: string | null) {
  if (!dateString) return '-'

  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date)
}

function formatSessionTime(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  })
}

function formatExamDate(dateString?: string | null) {
  if (!dateString) return '-'

  const [datePart = ''] = dateString.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  if (!year || !month || !day) return '-'

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium'
  }).format(new Date(year, month - 1, day))
}

function formatPatientName(patient?: PatientName | null) {
  if (!patient) return '-'

  return [patient.firstName, patient.middleName, patient.lastName]
    .filter(Boolean)
    .join(' ')
}

function formatPatientMeta(gender?: string | null, dob?: string | null, phone?: string | null) {
  const genderLabel = gender === 'MALE' ? 'L' : gender === 'FEMALE' ? 'P' : null
  const age = dob ? getPatientAgeAtDate(dob, today) : null
  const profile = [genderLabel, age != null ? `${age} y` : null].filter(Boolean).join(' · ')
  return [profile, phone].filter(Boolean).join(' · ')
}

function getPatientAgeAtDate(dob?: string | null, referenceDate?: string | null) {
  if (!dob) return null

  const birthDate = new Date(dob)
  const targetDate = referenceDate ? new Date(referenceDate) : new Date()
  if (Number.isNaN(birthDate.getTime()) || Number.isNaN(targetDate.getTime())) return null

  let age = targetDate.getFullYear() - birthDate.getFullYear()
  const monthDiff = targetDate.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && targetDate.getDate() < birthDate.getDate())) age -= 1
  return age
}

function getItemStatusLabel(status: string) {
  if (status === 'WAITING') return 'Waiting'
  if (status === 'CALLED') return 'Called'
  if (status === 'IN_PROGRESS') return 'In Progress'
  if (status === 'DONE') return 'Done'
  if (status === 'SKIPPED') return 'Skipped'
  if (status === 'RESCHEDULED') return 'Rescheduled'
  if (status === 'REFUSED') return 'Refused'
  if (status === 'RETEXT') return 'Retest'
  if (status === 'LOCKED') return 'Locked'
  return 'Waiting'
}

function formatStageColumn(stageItems: RoomQueueItem['stageItems']) {
  const stages = stageItems ?? []
  if (stages.length === 0) return '-'

  const isLabFlow = stages.some(stage => ['COLLECT', 'RECEIVE'].includes(stage.stage?.code ?? ''))

  return stages
    .map((stage) => {
      const code = stage.stage?.code
      let label = getItemStatusLabel(stage.status)
      if (isLabFlow && code === 'RECEIVE' && stage.status === 'WAITING') {
        label = 'Waiting for Lab Receipt'
      } else if (isLabFlow && code === 'EXAM' && stage.status === 'WAITING') {
        label = 'Waiting for Lab Processing'
      }
      return `Stage ${stage.stageOrder}: ${label}`
    })
    .join(' | ')
}

function getQueueBadgeColor(status: string): 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral' {
  if (status === 'DONE') return 'success'
  if (status === 'WAITING') return 'warning'
  if (status === 'CALLED') return 'info'
  if (status === 'IN_PROGRESS') return 'warning'
  if (status === 'SKIPPED' || status === 'RESCHEDULED') return 'neutral'
  if (status === 'REFUSED') return 'error'
  if (status === 'RETEXT') return 'warning'
  return 'neutral'
}

function buildStatusBadge(
  status: string,
  sampleCollections: Array<{ status: string }>,
  stageItems: RoomQueueItem['stageItems']
): { label: string, color: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral' } {
  const terminal = ['DONE', 'SKIPPED', 'RESCHEDULED', 'REFUSED', 'RETEXT']
  if (terminal.includes(status)) {
    return { label: getItemStatusLabel(status), color: getQueueBadgeColor(status) }
  }

  const stages = stageItems ?? []
  const isLabFlow = stages.some(stage => ['COLLECT', 'RECEIVE', 'EXAM'].includes(stage.stage?.code ?? ''))
  if (!isLabFlow) {
    return { label: getItemStatusLabel(status), color: getQueueBadgeColor(status) }
  }

  const build = (label: string, color: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral') => ({ label, color })

  const sampleStatuses = (sampleCollections ?? []).map(s => s.status)
  const hasPending = sampleStatuses.some(s => s === 'PENDING')
  const hasCollected = sampleStatuses.some(s => s === 'COLLECTED')
  const hasReceived = sampleStatuses.some(s => s === 'RECEIVED')
  const hasRejected = sampleStatuses.some(s => s === 'REJECTED' || s === 'RESCHEDULED')
  const allReceived = sampleStatuses.length > 0 && sampleStatuses.every(s => s === 'RECEIVED')

  // First active stage (not finished), for lab flow means COLLECT → RECEIVE → EXAM.
  const active = stages.find(s =>
    !['LOCKED', 'DONE', 'SKIPPED', 'RESCHEDULED'].includes(s.status)
    && ['COLLECT', 'RECEIVE', 'EXAM'].includes(s.stage?.code ?? '')
  )
  const stageCode = active?.stage?.code

  // Always highlight if there is a problematic sample (needs recollection / revisit).
  if (hasRejected && !hasCollected && !hasReceived) {
    return build('Sample needs recollection', 'error')
  }

  switch (stageCode) {
    case 'COLLECT':
      if (hasPending) return build('Waiting for Sample Collection', 'warning')
      if (hasCollected) return build('Collected, waiting for Lab receipt', 'info')
      return build('Waiting for Sample Collection', 'warning')
    case 'RECEIVE':
      if (allReceived) return build('Sample Received by Lab', 'success')
      return build('Waiting for Lab Receipt', 'info')
    case 'EXAM':
      return build('Waiting for Lab Processing', 'warning')
    default:
      return build(getItemStatusLabel(status), getQueueBadgeColor(status))
  }
}

// Patient process status in ROOM (not sample status).
// Priority: item action (reject/reschedule/retest) → done → in-progress item → in-room → called → waiting.
function buildRoomStatusBadge(item: RoomQueueItem): { label: string, color: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral' } {
  const build = (label: string, color: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral') => ({ label, color })

  const examStatuses = (item.examItems ?? []).map(e => e.status)

  // Actions per patient item.
  if (examStatuses.includes('RESCHEDULED')) return build('Rescheduled', 'warning')
  if (examStatuses.includes('REFUSED')) return build('Refused', 'error')
  if (examStatuses.includes('RETEXT')) return build('Retest', 'error')
  if (examStatuses.includes('SKIPPED')) return build('Skipped', 'neutral')

  // Done: all stages DONE.
  const stages = item.stageItems ?? []
  if (stages.length > 0 && stages.every(s => ['DONE', 'SKIPPED'].includes(s.status))) {
    return build('Completed', 'success')
  }
  if (item.status === 'DONE') return build('Completed', 'success')

  // Start Item (exam item in progress).
  if (examStatuses.includes('IN_PROGRESS')) return build('In Progress', 'warning')

  // Start Examination (room stage running).
  if (stages.some(s => s.status === 'IN_PROGRESS')) return build('In Room', 'info')

  // Called.
  if (stages.some(s => s.status === 'CALLED')) return build('Called', 'info')

  // Not called yet.
  if (item.status === 'WAITING' || stages.some(s => s.status === 'WAITING')) return build('Waiting', 'neutral')

  return build(getItemStatusLabel(item.status), getQueueBadgeColor(item.status))
}

// Room type name for the Room column (from roomTypeOptions by id).
function roomTypeNameById(id?: string | null): string {
  if (!id) return '-'
  const found = roomTypeOptions.value.find(o => String(o.value) === id)
  return found?.label ?? '-'
}

function getSampleStatusLabel(status: string) {
  if (status === 'RECEIVED') return 'Received by Lab'
  if (status === 'COLLECTED') return 'Collected'
  if (status === 'REJECTED') return 'Rejected'
  if (status === 'RESCHEDULED') return 'Rescheduled'
  return 'Waiting for Collection'
}

async function openProcessedDocument(row: QueueHistoryRow) {
  if (!row.id) return

  try {
    const res = await api.get(`/medical/exams/queue/room-item/${row.id}/exam-items`)
    const payload = res.data?.data ?? res.data ?? []
    const items: Array<{
      trxExamItem?: {
        id: string
        exam?: { id: string } | null
        item?: {
          department?: { code?: string | null } | null
        } | null
      } | null
    }> = Array.isArray(payload) ? payload : []
    const first = items[0]
    const examItemId = first?.trxExamItem?.id
    const examId = first?.trxExamItem?.exam?.id

    if (!examItemId) {
      toast.add({
        title: 'Document detail not available',
        description: 'No examination items available to open results.',
        color: 'warning'
      })
      return
    }

    await router.push({
      path: `/result/exam-results/${examItemId}`,
      query: {
        department: first?.trxExamItem?.item?.department?.code || undefined,
        examId: examId || undefined,
        roomTypeId: row.roomTypeId || undefined
      }
    })
  } catch (error: unknown) {
    const response = (error as { response?: { data?: { message?: string } } })?.response
    toast.add({
      title: 'Failed to open document detail',
      description: response?.data?.message || 'An error occurred while loading result document detail.',
      color: 'error'
    })
  }
}

const sampleDetailOpen = ref(false)
const sampleDetailLoading = ref(false)
const sampleDetailData = ref<SampleCollectionDetail[]>([])
const sampleDetailPatientName = ref('-')

async function openSampleDetail(row: QueueHistoryRow) {
  if (!row.queueEntryId) return

  sampleDetailOpen.value = true
  sampleDetailLoading.value = true
  sampleDetailData.value = []
  sampleDetailPatientName.value = row.patientName

  try {
    const res = await api.get(`/medical/exams/queue/${row.queueEntryId}/samples`)
    const payload = res.data
    sampleDetailData.value = (payload?.data ?? payload ?? []) as SampleCollectionDetail[]
  } catch (error: unknown) {
    toast.add({
      title: 'Failed to load sample detail',
      description: getErrorMessage(error, 'An error occurred while loading sample collection detail.'),
      color: 'error'
    })
  } finally {
    sampleDetailLoading.value = false
  }
}

async function openQueueWork(roomQueueItemId: string) {
  isWaitingModalOpen.value = false
  await router.push(`/rooms/queue-work/${roomQueueItemId}`)
}

function getHistoryRowActions(row: QueueHistoryRow) {
  const actions = [
    {
      label: 'View Queue Work',
      icon: 'i-lucide-clipboard-list',
      onSelect: () => openQueueWork(row.id)
    },
    {
      label: 'View Document Detail',
      icon: 'i-lucide-file-text',
      onSelect: () => openProcessedDocument(row)
    }
  ]

  if (row.hasSample) {
    actions.unshift({
      label: 'View Sample Collection Detail',
      icon: 'i-lucide-test-tube-diagonal',
      onSelect: () => openSampleDetail(row)
    })
  }

  if (row.status === 'WAITING' || row.status === 'LOCKED') {
    actions.push({
      label: 'Remove from Room Queue',
      icon: 'i-lucide-user-x',
      onSelect: () => handleRemoveRoomQueueItem(row)
    })
  }

  return [actions]
}

async function handleRemoveRoomQueueItem(row: QueueHistoryRow) {
  if (!confirm(`Remove patient ${row.patientName} from this room queue? This action can only be done if no items have been processed.`)) return

  try {
    await api.delete(`/medical/exams/queue/room-item/${row.id}`)
    await refreshHistory()
    toast.add({
      title: 'Success',
      description: `Patient ${row.patientName} removed from room queue.`,
      color: 'success'
    })
  } catch (error: unknown) {
    toast.add({
      title: 'Failed to remove from room queue',
      description: getErrorMessage(error, 'An error occurred while removing patient from room queue.'),
      color: 'error'
    })
  }
}

function setWaitingRowLoading(rowId: string, loading: boolean) {
  waitingRowActionLoading.value = {
    ...waitingRowActionLoading.value,
    [rowId]: loading
  }
}

async function handleWaitingRowCall(row: WaitingRow) {
  if (!row.stageId || waitingRowActionLoading.value[row.id]) return

  if (!activeRoomSession.value) {
    toast.add({
      title: 'Room session not active',
      description: 'Enter the room first before picking patients from the waiting list.',
      color: 'warning'
    })
    return
  }

  if (
    !isSuperAdmin.value
    && effectiveWaitingRoomTypeId.value
    && activeRoomSession.value.roomTypeId !== effectiveWaitingRoomTypeId.value
  ) {
    toast.add({
      title: 'Mismatched room',
      description: 'Active room must match the room type being opened.',
      color: 'warning'
    })
    return
  }

  setWaitingRowLoading(row.id, true)
  try {
    await api.patch(`/medical/exams/queue/stage/${row.stageId}/call`, {
      roomId: myRoomId.value,
      roomTypeId: activeRoomSession.value?.roomTypeId ?? undefined
    })
    await refreshAll()
    await refreshRoomSession()
    isWaitingModalOpen.value = false

    await router.push({
      path: `/rooms/queue-work/${row.id}`
    })

    toast.add({
      title: 'Success',
      description: 'Patient successfully picked from waiting list.',
      color: 'success'
    })
  } catch (error: unknown) {
    const status = (error as { response?: { status?: number } })?.response?.status
    const message = getErrorMessage(error, 'An error occurred while picking patient from waiting list.')

    if (status === 409) {
      toast.add({
        title: 'Already picked by another room',
        description: 'This patient has already been called by another room. Please refresh queue.',
        color: 'warning'
      })
      await refreshWaiting()
    } else if (status === 403) {
      toast.add({
        title: 'Unauthorized',
        description: 'This room does not handle the called stage.',
        color: 'error'
      })
    } else {
      toast.add({
        title: 'Failed to pick patient',
        description: message,
        color: 'error'
      })
    }
  } finally {
    setWaitingRowLoading(row.id, false)
  }
}

function getRoomSessionLabel() {
  if (activeRoomSession.value?.room?.name) {
    return `${activeRoomSession.value.room.code} - ${activeRoomSession.value.room.name}`
  }
  if (activeRoomSession.value?.roomType?.name) {
    return activeRoomSession.value.roomType.name
  }
  return 'Room session inactive'
}

function openEnterRoomModal() {
  if (!assignment.value?.roomId) {
    toast.add({
      title: 'No room assignment',
      description: 'No room assignment available to enter room.',
      color: 'warning'
    })
    return
  }

  isEnterRoomModalOpen.value = true
}

async function handleEnterRoom() {
  if (roomEnterActionLoading.value || !assignment.value?.roomId) return

  roomEnterActionLoading.value = true
  try {
    await enterRoomSession({ roomId: assignment.value.roomId })
    await refreshRoomSession()
    isEnterRoomModalOpen.value = false

    toast.add({
      title: 'Success',
      description: 'Successfully entered active room.',
      color: 'success'
    })
  } catch (error: unknown) {
    toast.add({
      title: 'Failed to enter room',
      description: getErrorMessage(error, 'An error occurred while entering active room.'),
      color: 'error'
    })
  } finally {
    roomEnterActionLoading.value = false
  }
}

function openExitRoomModal() {
  if (!activeRoomSession.value) {
    toast.add({
      title: 'Room session inactive',
      description: 'No active room session to exit.',
      color: 'warning'
    })
    return
  }

  isExitRoomModalOpen.value = true
}

async function handleExitRoom() {
  if (roomExitActionLoading.value || !activeRoomSession.value) return

  roomExitActionLoading.value = true
  try {
    await exitRoomSession()
    await refreshRoomSession()
    isExitRoomModalOpen.value = false

    toast.add({
      title: 'Success',
      description: 'Successfully exited active room.',
      color: 'success'
    })
  } catch (error: unknown) {
    toast.add({
      title: 'Failed to exit room',
      description: getErrorMessage(error, 'An error occurred while exiting active room.'),
      color: 'error'
    })
  } finally {
    roomExitActionLoading.value = false
  }
}

async function openChangeRoomModal() {
  if (isSuperAdmin.value) {
    // Superadmin: show all active rooms.
    try {
      const res = await api.get('/medical/rooms/rooms', { params: { isActive: true } })
      const list = res.data?.data ?? res.data ?? []
      changeRoomOptions.value = Array.isArray(list) ? list : []
    } catch {
      changeRoomOptions.value = []
    }
  } else {
    changeRoomOptions.value = allowedSelfRooms.value
  }
  if (!changeRoomOptions.value.length) {
    toast.add({
      title: 'No rooms available',
      description: 'No room can be selected.',
      color: 'warning'
    })
    return
  }
  isChangeRoomModalOpen.value = true
}

async function handleChangeRoom(roomId: string) {
  if (changeRoomLoading.value) return
  changeRoomLoading.value = true
  isChangingRoom.value = true
  try {
    if (activeRoomSession.value) {
      await exitRoomSession()
    }
    // Move active assignment (superadmin without assignment → auto-create).
    await api.post('/room-assignments/me/change-room', { roomId })
    await enterRoomSession({ roomId })
    // Superadmin: apply waiting modal filter to the new session's room type.
    if (isSuperAdmin.value && activeRoomSession.value?.roomTypeId) {
      selectedWaitingRoomTypeId.value = activeRoomSession.value.roomTypeId
    }
    await refreshAll()
    await refreshRoomSession()
    isChangeRoomModalOpen.value = false
    toast.add({ title: 'Success', description: 'Active room changed.', color: 'success' })
  } catch (error: unknown) {
    toast.add({
      title: 'Failed to change room',
      description: getErrorMessage(error, 'An error occurred while changing active room.'),
      color: 'error'
    })
  } finally {
    changeRoomLoading.value = false
    isChangingRoom.value = false
  }
}

async function refreshAll() {
  await Promise.all([
    refreshAssignment(),
    refreshHistory(),
    refreshWaiting(),
    refreshWaitingStats(),
    refreshLockedStats(),
    refreshActiveSessions()
  ])
}

const endingSessionId = ref<string | null>(null)

async function handleEndSession(sessionId: string, staffName: string) {
  if (endingSessionId.value) return
  if (!confirm(`End room session for ${staffName}? The session will be forced to end and the room freed.`)) return

  endingSessionId.value = sessionId
  try {
    await api.post(`/medical/rooms/sessions/${sessionId}/exit`, {})
    toast.add({
      title: 'Success',
      description: `Room session for ${staffName} successfully ended.`,
      color: 'success'
    })
    await refreshActiveSessions()
  } catch (error: unknown) {
    const response = (error as { response?: { data?: { message?: string } } })?.response
    toast.add({
      title: 'Failed to end session',
      description: response?.data?.message || 'An error occurred while ending room session.',
      color: 'error'
    })
  } finally {
    endingSessionId.value = null
  }
}

async function openWaitingPatientsModal() {
  if (!isSuperAdmin.value && !roomTypeId.value) {
    toast.add({
      title: 'Room assignment required',
      description: 'To view the waiting patient list, the user must have an active room assignment.',
      color: 'warning'
    })
  }

  if (isSuperAdmin.value) {
    // Pastikan daftar room type fresh (termasuk lab/sample collection).
    await refreshRoomTypes()
    const availableRoomTypeIds = new Set(roomTypeOptions.value.map(option => option.value))
    if (!availableRoomTypeIds.has(selectedWaitingRoomTypeId.value)) {
      selectedWaitingRoomTypeId.value = availableRoomTypeIds.has(roomTypeId.value ?? '')
        ? roomTypeId.value ?? ''
        : (roomTypeOptions.value[0]?.value ?? '')
    }
  }

  isWaitingModalOpen.value = true
  await refreshWaiting()
}

watch(
  [isWaitingModalOpen, effectiveWaitingRoomTypeId],
  async ([open, roomType]) => {
    if (!open || !roomType) return
    await refreshWaiting()
  }
)

watch(
  [isSuperAdmin, departmentOptions, selectedHistoryDepartmentId],
  ([superAdmin, options]) => {
    if (!superAdmin) return
    if (!selectedHistoryDepartmentId.value && options.length) {
      const first = options[0]
      if (first) selectedHistoryDepartmentId.value = first.id
    }
  },
  { immediate: true }
)

// Superadmin: ensure the waiting room type is selected so the Waiting card is
// filled since the page opens (without waiting for the waiting modal to open).
watch(
  [isSuperAdmin, roomTypeOptions],
  ([superAdmin, options]) => {
    if (!superAdmin) return
    if (selectedWaitingRoomTypeId.value) return
    const first = options[0]
    if (first) selectedWaitingRoomTypeId.value = first.value
  },
  { immediate: true }
)

onMounted(() => {
  refreshAssignment()
  refreshRoomSession()
  void loadDepartmentOptions()
})

watch(
  () => assignment.value?.id,
  () => refreshRoomSession()
)

// Auto-exit session if active room doesn't match today's assignment (including superadmin).
watch(
  [activeRoomSession, assignment],
  async () => {
    if (!activeRoomSession.value || isChangingRoom.value) return
    const assignedRoomTypeId = assignment.value?.roomTypeId ?? null
    const sessionRoomTypeId = activeRoomSession.value?.roomTypeId ?? null
    const sessionRoomId = activeRoomSession.value?.roomId ?? null
    if (assignedRoomTypeId !== sessionRoomTypeId || (assignedRoomTypeId && assignment.value?.roomId !== sessionRoomId)) {
      try {
        await exitRoomSession()
        await refreshRoomSession()
      } catch {
        // best-effort
      }
    }
  }
)
</script>

<template>
  <UDashboardPanel id="room-queue-history">
    <template #header>
      <UDashboardNavbar
        title="Room Queue"
        subtitle="Completed queue history and waiting patient list"
      >
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UBadge
            class="hidden sm:inline-flex"
            :color="activeRoomSession ? 'success' : 'neutral'"
            variant="subtle"
            :label="roomSessionPending ? 'Checking room session...' : getRoomSessionLabel()"
          />

          <UButton
            icon="i-lucide-rotate-ccw"
            color="neutral"
            variant="soft"
            :loading="assignmentPending || roomEnterActionLoading || roomExitActionLoading"
            @click="openChangeRoomModal"
          >
            <span class="hidden lg:inline">Change Room</span>
          </UButton>

          <UButton
            icon="i-lucide-users-round"
            color="neutral"
            variant="soft"
            @click="openWaitingPatientsModal"
          >
            <span class="hidden lg:inline">View Waiting Patients</span>
          </UButton>

          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="soft"
            :loading="assignmentPending || historyPending || waitingPending"
            @click="refreshAll"
          >
            <span class="hidden lg:inline">Refresh</span>
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="w-full space-y-4">
        <div class="flex justify-start sm:hidden">
          <UBadge
            :color="activeRoomSession ? 'success' : 'neutral'"
            variant="subtle"
            :label="roomSessionPending ? 'Checking room session...' : getRoomSessionLabel()"
          />
        </div>

        <UAlert
          v-if="assignment && !activeRoomSession"
          color="info"
          variant="soft"
          icon="i-lucide-info"
          title="Active assignment, starting room session"
          :description="`You are assigned to ${assignment.room?.name || assignment.roomType?.name || 'room'}. The room session is activated automatically.`"
        />

        <UCard class="overflow-hidden border border-default/80 shadow-sm">
          <template #header>
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 class="text-base font-bold text-highlighted">
                  Currently Occupied Rooms
                </h3>
                <p class="text-xs leading-relaxed text-muted">
                  List of rooms with active staff inside.
                </p>
              </div>
              <UButton
                icon="i-lucide-refresh-cw"
                color="neutral"
                variant="soft"
                size="sm"
                :loading="activeSessionsPending"
                @click="() => void refreshActiveSessions()"
              >
                Refresh
              </UButton>
            </div>
          </template>

          <div v-if="activeSessionsPending" class="space-y-2 p-4">
            <USkeleton class="h-12 rounded-xl" />
            <USkeleton class="h-12 rounded-xl" />
          </div>

          <div v-else-if="activeRoomSessions.length === 0" class="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-default bg-muted/20 p-8 text-center">
            <UIcon name="i-lucide-door-open" class="mb-2 size-8 text-muted" />
            <p class="text-sm font-medium text-highlighted">
              No rooms currently occupied
            </p>
            <p class="mt-1 text-xs text-muted">
              No staff have entered a room today.
            </p>
          </div>

          <div v-else class="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            <div
              v-for="room in activeRoomSessions"
              :key="room.roomId"
              class="rounded-xl border p-4"
              :class="room.activeCount >= room.staffCapacity
                ? 'border-error/40 bg-error/5'
                : 'border-default bg-muted/20'"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-sm font-bold text-highlighted">
                    {{ room.roomCode ? `${room.roomCode} - ` : '' }}{{ room.roomName }}
                  </p>
                  <p class="mt-0.5 text-xs text-muted">
                    {{ room.roomTypeName || '-' }}
                  </p>
                </div>
                <UBadge
                  :label="`${room.activeCount}/${room.staffCapacity}`"
                  :color="room.activeCount >= room.staffCapacity ? 'error' : 'success'"
                  variant="subtle"
                />
              </div>

              <div class="mt-3 space-y-1.5">
                <div
                  v-for="staff in room.staff"
                  :key="staff.sessionId"
                  class="flex items-center gap-2 rounded-lg border border-default bg-background px-2.5 py-1.5"
                >
                  <UIcon name="i-lucide-user-round" class="size-3.5 shrink-0 text-primary" />
                  <span class="min-w-0 flex-1 truncate text-xs font-medium text-highlighted">
                    {{ staff.name }}
                  </span>
                  <span class="shrink-0 text-[10px] text-muted">
                    {{ formatSessionTime(staff.startedAt) }}
                  </span>
                  <UButton
                    icon="i-lucide-log-out"
                    size="xs"
                    color="error"
                    variant="ghost"
                    :loading="endingSessionId === staff.sessionId"
                    title="Force end session"
                    @click="handleEndSession(staff.sessionId, staff.name)"
                  />
                </div>
              </div>
            </div>
          </div>
        </UCard>

        <UCard class="overflow-hidden border border-default/80 shadow-sm">
          <div class="space-y-5">
            <div>
              <p class="text-xs font-medium uppercase tracking-wider text-muted">
                Today's room assignment
              </p>
              <h2 class="mt-1 text-xl font-bold text-highlighted sm:text-2xl">
                {{ assignment?.roomType?.name || 'No room assignment yet' }}
              </h2>
              <p class="mt-0.5 text-xs font-medium text-muted sm:text-sm">
                {{ assignment?.room?.code ? `${assignment.room.code} - ` : '' }}
                {{ assignment?.room?.name || 'History can still be viewed without entering room.' }}
              </p>

              <div class="mt-3 flex flex-wrap items-center gap-2">
                <UBadge
                  :color="isSuperAdmin ? 'success' : (roomTypeId ? 'info' : 'warning')"
                  variant="subtle"
                  :icon="isSuperAdmin ? undefined : (roomTypeId ? 'i-lucide-check-check' : 'i-lucide-x')"
                  :label="isSuperAdmin ? 'Super Admin' : (roomTypeId ? 'Room Assigned' : 'Room Not Assigned')"
                />
                <UBadge
                  v-if="assignment?.assignmentSource"
                  color="neutral"
                  variant="soft"
                  :label="assignment.assignmentSource === 'SELF' ? 'Self Assignment' : 'PIC Assignment'"
                />
              </div>

              <p class="mt-3 text-xs text-muted">
                {{ assignment?.notes || 'Queue history only displays processed data.' }}
              </p>
            </div>

            <div class="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
              <div class="rounded-xl border border-default bg-muted/30 p-4 transition hover:border-default/80">
                <span class="text-xs font-medium text-muted">
                  Completed
                </span>
                <div class="mt-2 text-2xl font-extrabold text-highlighted sm:text-3xl">
                  {{ historyStats.completed }}
                </div>
              </div>

              <div class="rounded-xl border border-default bg-muted/30 p-4 transition hover:border-default/80">
                <span class="text-xs font-medium text-muted">
                  Waiting
                </span>
                <div class="mt-2 text-2xl font-extrabold text-highlighted sm:text-3xl">
                  {{ historyStats.waiting }}
                </div>
              </div>

              <div class="rounded-xl border border-default bg-muted/30 p-4 transition hover:border-default/80">
                <span class="text-xs font-medium text-muted">
                  Locked
                </span>
                <div class="mt-2 text-2xl font-extrabold text-highlighted sm:text-3xl">
                  {{ historyStats.locked }}
                </div>
              </div>

              <div class="rounded-xl border border-default bg-muted/30 p-4 transition hover:border-default/80">
                <span class="text-xs font-medium text-muted">
                  Access
                </span>
                <div class="mt-3 text-base font-bold text-highlighted sm:text-lg">
                  {{ historyStats.access }}
                </div>
              </div>
            </div>
          </div>
        </UCard>

        <UAlert
          v-if="!assignmentPending && !assignment && !isSuperAdmin"
          color="warning"
          title="No active assignment yet"
          description="Queue history can still be opened. To view waiting patient list, user must have a room assignment."
        />

        <UCard class="overflow-hidden border border-default/80 shadow-sm">
          <template #header>
            <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div class="max-w-md space-y-1">
                <h3 class="text-base font-bold text-highlighted">
                  Queue History
                </h3>
                <p class="text-xs leading-relaxed text-muted">
                  Department queue history — displayed without requiring room assignment. Shows patients picked from waiting room.
                </p>
              </div>

              <div class="flex w-full flex-wrap items-center gap-3 sm:items-center xl:w-auto xl:justify-end">
                <USelect
                  v-model="selectedHistoryDepartmentId"
                  :items="departmentOptions"
                  :loading="departmentOptionsPending"
                  placeholder="Select department"
                  value-key="id"
                  label-key="name"
                  class="w-full sm:w-56"
                />

                <div class="flex w-full items-center gap-2 sm:w-auto">
                  <span class="shrink-0 text-xs font-medium text-muted">Exam Date</span>
                  <UInput
                    v-model="examDateFromFilter"
                    type="date"
                    size="sm"
                    class="min-w-0 flex-1 sm:w-36 sm:flex-initial"
                    aria-label="Exam date from"
                  />
                  <span class="shrink-0 text-xs text-muted">to</span>
                  <UInput
                    v-model="examDateToFilter"
                    type="date"
                    size="sm"
                    class="min-w-0 flex-1 sm:w-36 sm:flex-initial"
                    aria-label="Exam date to"
                  />
                </div>

                <USelect
                  v-model="historyStatusFilter"
                  :items="historyStatusOptions"
                  class="w-full sm:w-44"
                />

                <UBadge
                  variant="soft"
                  color="neutral"
                  :label="`${historyTotal} records`"
                />
              </div>
            </div>
          </template>

          <div v-if="historyPending" class="space-y-3">
            <USkeleton class="h-14 rounded-xl" />
            <USkeleton class="h-14 rounded-xl" />
            <USkeleton class="h-14 rounded-xl" />
          </div>

          <div v-else-if="!historyRows.length" class="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-default bg-muted/20 p-8 text-center">
            <UIcon
              name="i-lucide-clipboard-list"
              class="mb-3 size-10 text-muted"
            />
            <h3 class="text-base font-semibold text-highlighted">
              {{ !selectedHistoryDepartmentId ? 'Select department first' : 'No queue history' }}
            </h3>
            <p class="mt-1 max-w-lg text-sm text-muted">
              {{ !selectedHistoryDepartmentId
                ? 'Select a department above to load queue history.'
                : 'Data appears after patients are picked from the waiting room and processed.' }}
            </p>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="min-w-full border-separate border-spacing-0">
              <thead>
                <tr class="bg-muted/30">
                  <th class="border-b border-default px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    Regist No.
                  </th>
                  <th class="border-b border-default px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    Patient
                  </th>
                  <th class="border-b border-default px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    Queue
                  </th>
                  <th class="border-b border-default px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    Exam Date
                  </th>
                  <th class="border-b border-default px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    Reschedule
                  </th>
                  <th class="border-b border-default px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    Room
                  </th>
                  <th class="border-b border-default px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    Item
                  </th>
                  <th class="border-b border-default px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    Status
                  </th>
                  <th class="border-b border-default px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in historyRows"
                  :key="row.id"
                  class="align-top hover:bg-muted/20"
                >
                  <td class="border-b border-default px-4 py-4">
                    <div class="space-y-1">
                      <p class="font-medium text-highlighted">
                        {{ row.patientReg }}
                      </p>
                    </div>
                  </td>
                  <td class="border-b border-default px-4 py-4">
                    <div class="space-y-1">
                      <p class="font-medium text-highlighted">
                        {{ row.patientName }} ( {{ formatPatientMeta(row.patientGender, row.patientDob) }} )
                      </p>
                    </div>
                  </td>
                  <td class="border-b border-default px-4 py-4">
                    <div class="space-y-1">
                      <p class="font-semibold text-highlighted">
                        {{ row.queueCode }}
                      </p>
                      <p class="text-xs text-muted">
                        {{ row.queueType }}
                      </p>
                    </div>
                  </td>
                  <td class="border-b border-default px-4 py-4">
                    <p class="text-sm text-highlighted">
                      {{ formatExamDate(row.examDate) }}
                    </p>
                  </td>

                  <td class="border-b border-default px-4 py-4">
                    <p class="text-sm text-highlighted">
                      {{ row.rescheduleDate ? formatExamDate(row.rescheduleDate) : '-' }}
                    </p>
                  </td>

                  <td class="border-b border-default px-4 py-4">
                    <p class="text-sm text-highlighted">
                      {{ row.roomName }}
                    </p>
                    <p class="text-xs text-muted">
                      ( Tier {{ row.tierOrder }} )
                    </p>
                  </td>
                  <td class="border-b border-default px-4 py-4">
                    <p class="text-sm text-highlighted">
                      {{ row.itemSummary }}
                    </p>
                  </td>
                  <td class="border-b border-default px-4 py-4">
                    <UBadge
                      :label="row.statusLabel"
                      :color="row.statusColor"
                      variant="subtle"
                    />
                  </td>
                  <td class="border-b border-default px-4 py-4 text-right">
                    <UDropdownMenu
                      :items="getHistoryRowActions(row)"
                      :content="{ align: 'end' }"
                    >
                      <UButton
                        icon="i-lucide-ellipsis-vertical"
                        color="neutral"
                        variant="ghost"
                      />
                    </UDropdownMenu>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="historyRows.length" class="flex items-center justify-between border-t border-default px-4 py-3">
            <div class="flex items-center gap-2">
              <span class="text-xs text-muted">Rows per page</span>
              <USelect
                v-model="historyPageSize"
                :items="[
                  { label: '10', value: 10 },
                  { label: '20', value: 20 },
                  { label: '50', value: 50 }
                ]"
                size="xs"
                class="w-20"
              />
            </div>
            <UPagination
              v-model:page="historyPage"
              :items-per-page="historyPageSize"
              :total="historyTotal"
            />
          </div>
        </UCard>
      </div>

      <UModal v-model:open="isWaitingModalOpen" :ui="{ content: 'sm:max-w-6xl', header: 'relative pr-16' }">
        <template #header>
          <div class="min-w-0 flex-1">
            <h3 class="text-lg font-semibold text-highlighted">
              Patients in Waiting Room
            </h3>
            <p class="mt-0.5 text-sm text-muted">
              List of patients still waiting. This can only be opened with a room assignment, except for super admin.
            </p>
          </div>
          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="soft"
            class="absolute right-4 top-1/2 -translate-y-1/2"
            :loading="waitingPending"
            @click="() => void refreshWaiting()"
          >
            Refresh
          </UButton>
        </template>
        <template #body>
          <div class="space-y-4 rounded-2xl bg-default p-6 shadow-xl">
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-4" :class="isSuperAdmin ? '' : 'lg:grid-cols-3'">
              <UFormField
                v-if="isSuperAdmin"
                label="Room Type"
              >
                <USelect
                  v-model="selectedWaitingRoomTypeId"
                  :items="roomTypeOptions"
                  :loading="roomTypesPending"
                  placeholder="Select room type"
                />
              </UFormField>
              <UFormField label="Status">
                <USelect
                  v-model="waitingStatusFilter"
                  :items="[
                    { label: 'Waiting', value: 'WAITING' },
                    { label: 'Called', value: 'CALLED' },
                    { label: 'In Progress', value: 'IN_PROGRESS' },
                    { label: 'All', value: 'ALL' }
                  ]"
                />
              </UFormField>
              <UFormField label="Exam Date From">
                <UInput v-model="waitingExamDateFrom" type="date" />
              </UFormField>
              <UFormField label="Exam Date To">
                <UInput v-model="waitingExamDateTo" type="date" />
              </UFormField>
            </div>

            <UAlert
              v-if="!roomTypeId && !isSuperAdmin"
              color="warning"
              title="Room assignment required"
              description="Regular users must have a room assignment to view the waiting patient list."
            />

            <UAlert
              v-else-if="isSuperAdmin && !effectiveWaitingRoomTypeId"
              color="info"
              title="Room type not selected"
              description="Super admin must select a room type to load the waiting patient list."
            />

            <UAlert
              v-if="effectiveWaitingRoomTypeId && !activeRoomSession"
              color="warning"
              title="Room session not active"
              description="To pick patients from the waiting list, the user must enter the room first."
            />

            <div v-if="waitingPending" class="space-y-3">
              <USkeleton class="h-14 rounded-xl" />
              <USkeleton class="h-14 rounded-xl" />
              <USkeleton class="h-14 rounded-xl" />
            </div>

            <div v-else-if="waitingRows.length" class="max-h-[50vh] overflow-auto rounded-xl border border-default">
              <table class="min-w-full border-separate border-spacing-0">
                <thead>
                  <tr class="sticky top-0 z-10 bg-elevated">
                    <th class="border-b border-default px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                      Queue
                    </th>
                    <th class="border-b border-default px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                      Patient
                    </th>
                    <th class="border-b border-default px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted hidden lg:table-cell">
                      Exam Date
                    </th>
                    <th class="border-b border-default px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted hidden lg:table-cell">
                      Reschedule
                    </th>
                    <th class="border-b border-default px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                      Item
                    </th>
                    <th class="border-b border-default px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                      Meal Time
                    </th>
                    <th class="border-b border-default px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in waitingRows"
                    :key="row.id"
                    class="align-top hover:bg-muted/20"
                  >
                    <td class="border-b border-default px-4 py-4">
                      <div class="space-y-1">
                        <p class="font-semibold text-highlighted">
                          {{ row.queueCode }}
                        </p>
                        <p class="text-xs text-muted">
                          {{ row.queueType }} · Tier {{ row.tierOrder }}
                        </p>
                        <p class="text-xs text-muted">
                          Check-in {{ formatQueueDate(row.checkinAt) }}
                        </p>
                      </div>
                    </td>
                    <td class="border-b border-default px-4 py-4">
                      <div class="space-y-1">
                        <p class="font-medium text-highlighted">
                          {{ row.patientName }}
                        </p>
                        <p class="text-xs text-muted">
                          RM {{ row.patientId }}
                        </p>
                        <p v-if="formatPatientMeta(row.patientGender, row.patientDob, row.patientPhone)" class="text-xs text-muted">
                          {{ formatPatientMeta(row.patientGender, row.patientDob, row.patientPhone) }}
                        </p>
                      </div>
                    </td>
                    <td class="border-b border-default px-4 py-4 hidden lg:table-cell">
                      <p class="text-sm text-highlighted">
                        {{ formatExamDate(row.examDate) }}
                      </p>
                    </td>
                    <td class="border-b border-default px-4 py-4 hidden lg:table-cell">
                      <p class="text-sm text-highlighted">
                        {{ row.rescheduleDate ? formatExamDate(row.rescheduleDate) : '-' }}
                      </p>
                    </td>
                    <td class="border-b border-default px-4 py-4">
                      <p class="text-sm text-highlighted">
                        {{ row.itemSummary }}
                      </p>
                    </td>
                    <td class="border-b border-default px-4 py-4">
                      <template v-if="row.meal?.startedAt">
                        <p class="text-xs text-muted">
                          Start {{ mealShortTime(row.meal.startedAt) }}
                        </p>
                        <p v-if="row.meal?.status === 'COMPLETED' && row.meal.completedAt" class="text-xs text-muted">
                          Done {{ mealShortTime(row.meal.completedAt) }}
                        </p>
                        <p v-else class="text-xs text-muted">
                          Ongoing
                        </p>
                      </template>
                      <template v-else-if="row.meal?.status === 'COMPLETED'">
                        <p class="text-xs text-muted">
                          Done
                        </p>
                      </template>
                      <UBadge
                        v-else
                        :label="row.statusLabel"
                        :color="row.statusColor"
                        variant="subtle"
                      />
                    </td>
                    <td class="border-b border-default px-4 py-4 text-right">
                      <div class="flex items-center justify-end gap-2">
                        <UButton
                          size="sm"
                          color="neutral"
                          variant="soft"
                          icon="i-lucide-clipboard-list"
                          @click="openQueueWork(row.id)"
                        >
                          View Queue Work
                        </UButton>
                        <UButton
                          v-if="row.stageId && row.meal?.status !== 'IN_PROGRESS'"
                          size="sm"
                          color="primary"
                          variant="solid"
                          icon="i-lucide-log-in"
                          :loading="Boolean(waitingRowActionLoading[row.id])"
                          :disabled="Boolean(!row.stageId || !activeRoomSession || (!isSuperAdmin && effectiveWaitingRoomTypeId && activeRoomSession?.roomTypeId !== effectiveWaitingRoomTypeId))"
                          @click="handleWaitingRowCall(row)"
                        >
                          Pick Patient
                        </UButton>
                        <UBadge
                          v-else-if="row.meal?.status === 'IN_PROGRESS'"
                          color="info"
                          variant="subtle"
                          class="whitespace-nowrap"
                          icon="i-lucide-loader"
                        >
                          Meal · {{ mealTimeRemaining(row) }}
                        </UBadge>
                        <UButton
                          v-if="row.meal?.status === 'IN_PROGRESS' && row.meal.examId"
                          size="sm"
                          color="success"
                          variant="soft"
                          icon="i-lucide-check"
                          @click="askCompleteMeal(row)"
                        >
                          Complete Meal
                        </UButton>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div
              v-else
              class="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-default bg-muted/20 p-8 text-center"
            >
              <UIcon
                name="i-lucide-users"
                class="mb-3 size-10 text-muted"
              />
              <h3 class="text-base font-semibold text-highlighted">
                No waiting patients
              </h3>
              <p class="mt-1 max-w-lg text-sm text-muted">
                This list only shows patients still waiting in the active room.
              </p>
            </div>
          </div>
        </template>
      </UModal>

      <UModal v-model:open="isEnterRoomModalOpen" title="Enter Room">
        <template #body>
          <div class="space-y-4">
            <UAlert
              color="info"
              title="Enter room assignment?"
              :description="`Current room assignment: ${assignment?.room?.code ? `${assignment.room.code} - ` : ''}${assignment?.room?.name || assignment?.roomType?.name || '-'}.`"
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

      <UModal v-model:open="isExitRoomModalOpen" title="Exit Room">
        <template #body>
          <div class="space-y-4">
            <UAlert
              color="warning"
              title="Exit active room session?"
              :description="`Current active session: ${getRoomSessionLabel()}. After exiting, you can move to another room.`"
            />
          </div>
        </template>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="soft"
              :disabled="roomExitActionLoading"
              @click="isExitRoomModalOpen = false"
            >
              Cancel
            </UButton>
            <UButton
              color="warning"
              :loading="roomExitActionLoading"
              @click="handleExitRoom"
            >
              Exit Room
            </UButton>
          </div>
        </template>
      </UModal>

      <UModal v-model:open="isChangeRoomModalOpen" title="Change Room">
        <template #body>
          <div class="space-y-2">
            <p class="text-sm text-muted">
              Select a new active room.
            </p>
            <div v-if="changeRoomOptions.length === 0" class="py-6 text-center text-sm text-muted">
              No rooms available.
            </div>
            <div v-else class="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                v-for="room in changeRoomOptions"
                :key="room.id"
                type="button"
                class="flex items-center justify-between rounded-xl border p-3 text-left transition-all"
                :class="room.id === activeRoomSession?.roomId
                  ? 'border-primary/50 bg-primary/10'
                  : 'border-default/80 hover:bg-muted/30'"
                :disabled="changeRoomLoading"
                @click="handleChangeRoom(room.id)"
              >
                <div>
                  <p class="text-sm font-semibold text-highlighted">
                    {{ room.name }}
                  </p>
                  <p class="text-xs text-muted">
                    {{ room.code }} · {{ room.roomType?.name }}
                  </p>
                </div>
                <UBadge
                  v-if="room.id === activeRoomSession?.roomId"
                  color="primary"
                  variant="soft"
                  label="Active"
                />
              </button>
            </div>
          </div>
        </template>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="soft"
              :disabled="changeRoomLoading"
              @click="isChangeRoomModalOpen = false"
            >
              Close
            </UButton>
          </div>
        </template>
      </UModal>

      <UModal
        v-model:open="sampleDetailOpen"
        title="Sample Collection Detail"
        :ui="{ content: 'sm:max-w-3xl' }"
      >
        <template #body>
          <div
            v-if="sampleDetailLoading"
            class="flex items-center justify-center py-12 text-gray-500 dark:text-gray-400"
          >
            <UIcon
              name="i-lucide-loader-circle"
              class="animate-spin size-6"
            />
            <span class="ml-2">Loading sample collection detail…</span>
          </div>

          <template v-else-if="sampleDetailData.length">
            <p class="mb-4 text-sm text-gray-600 dark:text-gray-400">
              Patient: <span class="font-semibold text-gray-900 dark:text-gray-50">{{ sampleDetailPatientName }}</span>
            </p>

            <div
              v-for="collection in sampleDetailData"
              :key="collection.id"
              class="mb-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700"
            >
              <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div class="text-base font-semibold text-gray-900 dark:text-gray-50">
                  {{ collection.sampleType?.name || 'Sample' }}
                </div>
                <UBadge :color="collection.status === 'RECEIVED' ? 'success' : (collection.status === 'REJECTED' ? 'error' : 'warning')">
                  {{ getSampleStatusLabel(collection.status) }}
                </UBadge>
              </div>

              <dl class="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                <div>
                  <dt class="text-xs text-gray-500 dark:text-gray-400">
                    Sample Type
                  </dt>
                  <dd class="text-sm text-gray-900 dark:text-gray-50">
                    {{ collection.sampleType?.name || '-' }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs text-gray-500 dark:text-gray-400">
                    Barcode
                  </dt>
                  <dd class="text-sm text-gray-900 dark:text-gray-50">
                    {{ collection.barcode || '-' }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs text-gray-500 dark:text-gray-400">
                    Tube Count
                  </dt>
                  <dd class="text-sm text-gray-900 dark:text-gray-50">
                    {{ collection.tubeCount ?? 1 }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs text-gray-500 dark:text-gray-400">
                    Collection Time
                  </dt>
                  <dd class="text-sm text-gray-900 dark:text-gray-50">
                    {{ formatQueueDate(collection.collectedAt) }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs text-gray-500 dark:text-gray-400">
                    Collector (COLLECT)
                  </dt>
                  <dd class="text-sm text-gray-900 dark:text-gray-50">
                    {{ collection.collectedByUser?.name || (collection.collectedAt ? 'Unknown' : '-') }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs text-gray-500 dark:text-gray-400">
                    Received by Lab (RECEIVE)
                  </dt>
                  <dd class="text-sm text-gray-900 dark:text-gray-50">
                    {{ formatQueueDate(collection.receivedAt) }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs text-gray-500 dark:text-gray-400">
                    Receiver (RECEIVE)
                  </dt>
                  <dd class="text-sm text-gray-900 dark:text-gray-50">
                    {{ collection.receivedByUser?.name || (collection.receivedAt ? 'Unknown' : '-') }}
                  </dd>
                </div>
                <div
                  v-if="collection.status === 'REJECTED'"
                >
                  <dt class="text-xs text-gray-500 dark:text-gray-400">
                    Rejection Reason
                  </dt>
                  <dd class="text-sm text-gray-900 dark:text-gray-50">
                    {{ collection.rejectReason || '-' }}
                  </dd>
                </div>
                <div
                  v-if="collection.status === 'RESCHEDULED'"
                >
                  <dt class="text-xs text-gray-500 dark:text-gray-400">
                    Reschedule
                  </dt>
                  <dd class="text-sm text-gray-900 dark:text-gray-50">
                    {{ formatQueueDate(collection.rescheduledAt) }}
                  </dd>
                </div>
              </dl>

              <div
                v-if="collection.items?.length"
                class="mt-3"
              >
                <p class="mb-1 text-xs text-gray-500 dark:text-gray-400">
                  Related items:
                </p>
                <div class="flex flex-wrap gap-1">
                  <UBadge
                    v-for="sampleItem in collection.items"
                    :key="sampleItem.id"
                    variant="subtle"
                    color="neutral"
                  >
                    {{ sampleItem.item?.name || sampleItem.item?.code || 'Item' }}
                  </UBadge>
                </div>
              </div>
            </div>
          </template>

          <div
            v-else
            class="py-12 text-center text-gray-500 dark:text-gray-400"
          >
            No sample collection data for this queue.
          </div>
        </template>
      </UModal>

      <UModal v-model:open="completeMealConfirmOpen" title="Confirm Complete Meal">
        <template #body>
          <p class="text-sm text-muted">
            Complete meal time for patient
            <span class="font-semibold text-highlighted">{{ completeMealTarget?.patientName ?? '-' }}</span>?
          </p>
        </template>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="soft"
              @click="completeMealConfirmOpen = false"
            >
              No
            </UButton>
            <UButton
              color="primary"
              icon="i-lucide-check"
              @click="completeMealFromList"
            >
              Yes
            </UButton>
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
