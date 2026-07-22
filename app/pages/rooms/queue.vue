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
  firstName?: string | null
  middleName?: string | null
  lastName?: string | null
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
    stageOrder: number
    status: string
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
}

type QueueHistoryRow = {
  id: string
  queueEntryId: string | null
  queueCode: string
  queueType: string
  tierOrder: number
  patientName: string
  patientId: string
  roomLabel: string
  itemSummary: string
  stageSummary: string
  sampleSummary: string
  hasSample: boolean
  status: string
  checkinAt: string | null
  completedAt: string | null
  registrationId?: number | null
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
  itemSummary: string
  stageSummary: string
  status: string
  checkinAt: string | null
}

const api = useApi()
const router = useRouter()
const toast = useToast()
const { roles, user } = await useCurrentUser()
const {
  session: roomSession,
  pending: roomSessionPending,
  refresh: refreshRoomSession,
  enterRoomSession,
  exitRoomSession
} = await useRoomSession()
const {
  roomTypeOptions,
  pending: roomTypesPending
} = await useRoomTypes()

const today = new Date().toISOString().slice(0, 10)
const isWaitingModalOpen = ref(false)
const isEnterRoomModalOpen = ref(false)
const isExitRoomModalOpen = ref(false)
const roomEnterActionLoading = ref(false)
const roomExitActionLoading = ref(false)
const waitingRowActionLoading = ref<Record<string, boolean>>({})
type WaitingStatusFilter = 'WAITING' | 'CALLED' | 'IN_PROGRESS' | 'ALL'
type HistoryStatusFilter = 'DONE' | 'SKIPPED' | 'RESCHEDULED' | 'REFUSED' | 'CALLED' | 'IN_PROGRESS' | 'ALL'
type QueueStoredFilters = {
  waitingRoomTypeId: string
  historyRoomTypeId: string
  waitingStatus: WaitingStatusFilter
  historyStatus: HistoryStatusFilter
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
  const historyRoomTypeId = typeof stored.historyRoomTypeId === 'string' && uuidPattern.test(stored.historyRoomTypeId)
    ? stored.historyRoomTypeId
    : ''

  return {
    waitingRoomTypeId,
    historyRoomTypeId,
    waitingStatus: waitingStatusValues.includes(stored.waitingStatus as WaitingStatusFilter)
      ? stored.waitingStatus as WaitingStatusFilter
      : 'WAITING',
    historyStatus: historyStatusValues.includes(stored.historyStatus as HistoryStatusFilter)
      ? stored.historyStatus as HistoryStatusFilter
      : 'DONE'
  }
}

const queueFilterState = useSafeLocalStorageState<QueueStoredFilters>(
  `erp-kyoai:rooms:queue:filters:user:${user.value?.id ?? 'anonymous'}`,
  {
    waitingRoomTypeId: '',
    historyRoomTypeId: '',
    waitingStatus: 'WAITING',
    historyStatus: 'DONE'
  },
  sanitizeQueueFilters
)
const selectedWaitingRoomTypeId = toRef(queueFilterState, 'waitingRoomTypeId')
const selectedHistoryRoomTypeId = toRef(queueFilterState, 'historyRoomTypeId')
const waitingStatusFilter = toRef(queueFilterState, 'waitingStatus')
const historyStatusFilter = toRef(queueFilterState, 'historyStatus')
const historyStatusOptions = [
  { label: 'Selesai', value: 'DONE' },
  { label: 'Sedang diproses', value: 'IN_PROGRESS' },
  { label: 'Skip', value: 'SKIPPED' },
  { label: 'Reschedule', value: 'RESCHEDULED' },
  { label: 'Pasien Menolak', value: 'REFUSED' },
  { label: 'Dipanggil', value: 'CALLED' },
  { label: 'Semua', value: 'ALL' }
]

function normalizeRoleName(role?: string | null) {
  return (role || '').trim().toLowerCase().replace(/[\s_-]+/g, '')
}

const isSuperAdmin = computed(() =>
  roles.value.some(role => normalizeRoleName(role).includes('superadmin'))
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
const roomTypeId = computed(() => assignment.value?.roomTypeId ?? null)

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
const isSampleReceptionRoom = computed(() =>
  (myRoom.value?.stageLinks ?? []).some(link =>
    link.stage?.code === 'RECEIVE'
  )
)
const myRoomId = computed(() => assignment.value?.roomId ?? null)
const activeRoomSession = computed(() => {
  if (!roomSession.value?.id || roomSession.value.endedAt) return null
  return roomSession.value as RoomSession
})
const canEnterRoom = computed(() => Boolean(assignment.value?.roomId) && !activeRoomSession.value)
const effectiveWaitingRoomTypeId = computed(() =>
  isSuperAdmin.value ? selectedWaitingRoomTypeId.value : roomTypeId.value
)
const effectiveHistoryRoomTypeId = computed(() =>
  isSuperAdmin.value ? selectedHistoryRoomTypeId.value : roomTypeId.value
)

const {
  data: historyData,
  pending: historyPending,
  refresh: refreshHistory
} = await useAsyncData<RoomQueueItem[]>(
  'room-queue-history',
  async () => {
    if (!effectiveHistoryRoomTypeId.value) return []

    // Kirim ALL secara eksplisit agar backend dapat membedakannya dari
    // status kosong yang berarti filter default antrean WAITING/PARTIAL.
    const status = historyStatusFilter.value

    const res = await api.get(`/medical/exams/queue/room/${effectiveHistoryRoomTypeId.value}`, {
      params: {
        queueDate: today,
        status,
        limit: 100,
        page: 1,
        _: Date.now()
      }
    })

    const payload = res.data?.data ?? res.data
    return Array.isArray(payload) ? payload : payload?.data ?? []
  },
  {
    default: () => [],
    watch: [effectiveHistoryRoomTypeId, historyStatusFilter],
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

    const res = await api.get(`/medical/exams/queue/room/${effectiveWaitingRoomTypeId.value}`, {
      params: {
        queueDate: today,
        status,
        limit: 100,
        page: 1,
        _: Date.now()
      }
    })

    const payload = res.data?.data ?? res.data
    return Array.isArray(payload) ? payload : payload?.data ?? []
  },
  {
    default: () => [],
    watch: [effectiveWaitingRoomTypeId, isWaitingModalOpen, waitingStatusFilter],
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

const waitingItems = computed(() => waitingData.value ?? [])

function itemHasMyStage(item: RoomQueueItem): boolean {
  if (!myStageIds.value.length) return isSuperAdmin.value
  if (!item.stageItems?.length) return false
  return item.stageItems.some(stage => myStageIds.value.includes(stage.stageId))
}

function itemHandledByMyRoom(item: RoomQueueItem): boolean {
  if (!myRoomId.value) return false
  if (!item.stageItems?.length) return false
  return item.stageItems.some(
    stage => myStageIds.value.includes(stage.stageId) && stage.roomId === myRoomId.value
  )
}

function itemInPublicWaiting(item: RoomQueueItem): boolean {
  if (!myStageIds.value.length) return isSuperAdmin.value
  if (!item.stageItems?.length) return false
  return item.stageItems.some(
    stage => myStageIds.value.includes(stage.stageId) && !stage.roomId
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
    const stageParts = (item.stageItems ?? []).map(stage => `Stage ${stage.stageOrder}: ${getItemStatusLabel(stage.status)}`)
    const sampleParts = (item.queueEntry?.sampleCollections ?? []).map(sample => `${sample.sampleType?.name || 'Sample'}: ${getSampleStatusLabel(sample.status)}`)

    return {
      id: item.id,
      queueEntryId: item.queueEntry?.id ?? null,
      queueCode: item.queueEntry?.queueCode || '-',
      queueType: item.queueEntry?.type || '-',
      tierOrder: item.tierOrder,
      patientName: formatPatientName(patient ?? null),
      patientId: patient?.PatientId || '-',
      roomLabel: assignment.value?.roomType?.name
        ? `${assignment.value.roomType.name} · Tier ${item.tierOrder}`
        : `Tier ${item.tierOrder}`,
      itemSummary: itemNames.length > 0
        ? `${itemNames.slice(0, 2).join(', ')}${itemNames.length > 2 ? ` +${itemNames.length - 2}` : ''}`
        : '-',
      stageSummary: stageParts.length > 0 ? stageParts.join(' | ') : '-',
      sampleSummary: sampleParts.length > 0 ? sampleParts.join(' | ') : '-',
      hasSample: (item.queueEntry?.sampleCollections ?? []).length > 0,
      status: item.status,
      checkinAt: item.queueEntry?.checkinAt ?? null,
      completedAt: item.doneAt ?? item.queueEntry?.doneAt ?? null,
      registrationId: registration?.id ?? null
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
    const stageParts = (item.stageItems ?? []).map(stage => `Stage ${stage.stageOrder}: ${getItemStatusLabel(stage.status)}`)
    const waitingStage = (item.stageItems ?? []).find(stage => stage.status === 'WAITING')

    return {
      id: item.id,
      stageId: waitingStage?.id ?? null,
      queueCode: item.queueEntry?.queueCode || '-',
      queueType: item.queueEntry?.type || '-',
      tierOrder: item.tierOrder,
      patientName: formatPatientName(patient ?? null),
      patientId: patient?.PatientId || '-',
      itemSummary: itemNames.length > 0
        ? `${itemNames.slice(0, 2).join(', ')}${itemNames.length > 2 ? ` +${itemNames.length - 2}` : ''}`
        : '-',
      stageSummary: stageParts.length > 0 ? stageParts.join(' | ') : '-',
      status: item.status,
      checkinAt: item.queueEntry?.checkinAt ?? null
    }
  })
)

const historyStats = computed(() => ({
  completed: historyRows.value.length,
  waiting: waitingRows.value.length,
  access: isSuperAdmin.value ? 'Super Admin' : (roomTypeId.value ? 'Assignment Room' : 'Butuh Assignment')
}))

function formatQueueDate(dateString?: string | null) {
  if (!dateString) return '-'

  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date)
}

function formatPatientName(patient?: PatientName | null) {
  if (!patient) return '-'

  return [patient.firstName, patient.middleName, patient.lastName]
    .filter(Boolean)
    .join(' ')
}

function getItemStatusLabel(status: string) {
  if (status === 'WAITING') return 'Menunggu dipanggil'
  if (status === 'CALLED') return 'Pasien diambil'
  if (status === 'IN_PROGRESS') return 'Sedang diproses'
  if (status === 'DONE') return 'Selesai'
  if (status === 'SKIPPED') return 'Skip'
  if (status === 'RESCHEDULED') return 'Reschedule'
  if (status === 'REFUSED') return 'Pasien Menolak'
  if (status === 'RETEXT') return 'Perlu Tes Ulang'
  if (status === 'LOCKED') return 'Terkunci'
  return 'Menunggu'
}

function getQueueBadgeColor(status: string) {
  if (status === 'DONE') return 'success'
  if (status === 'WAITING') return 'warning'
  if (status === 'CALLED') return 'info'
  if (status === 'IN_PROGRESS') return 'warning'
  if (status === 'SKIPPED' || status === 'RESCHEDULED') return 'neutral'
  if (status === 'REFUSED') return 'error'
  if (status === 'RETEXT') return 'warning'
  return 'neutral'
}

function getSampleStatusLabel(status: string) {
  if (status === 'RECEIVED') return 'Diterima Lab'
  if (status === 'COLLECTED') return 'Sudah Diambil'
  if (status === 'REJECTED') return 'Ditolak'
  if (status === 'RESCHEDULED') return 'Reschedule'
  return 'Menunggu Ambil'
}

function openProcessedDocument(row: QueueHistoryRow) {
  if (!row.registrationId) return

  router.push({
    path: '/rooms/exam-results',
    query: {
      registrationId: String(row.registrationId),
      status: 'completed'
    }
  })
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
      title: 'Gagal memuat detail sample',
      description: getErrorMessage(error, 'Terjadi kesalahan saat memuat detail pengambilan sample.'),
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
      label: 'Lihat Detail Dokumen',
      icon: 'i-lucide-file-text',
      onSelect: () => openProcessedDocument(row)
    }
  ]

  if (row.hasSample) {
    actions.unshift({
      label: 'Lihat Detail Pengambilan Sample',
      icon: 'i-lucide-test-tube-diagonal',
      onSelect: () => openSampleDetail(row)
    })
  }

  if (row.status === 'WAITING' || row.status === 'LOCKED') {
    actions.push({
      label: 'Remove dari Antrian Room',
      icon: 'i-lucide-user-x',
      onSelect: () => handleRemoveRoomQueueItem(row)
    })
  }

  return [actions]
}

async function handleRemoveRoomQueueItem(row: QueueHistoryRow) {
  if (!confirm(`Hapus pasien ${row.patientName} dari antrian room ini? Tindakan hanya bisa dilakukan bila belum ada item yang diproses.`)) return

  try {
    await api.delete(`/medical/exams/queue/room-item/${row.id}`)
    await refreshHistory()
    toast.add({
      title: 'Berhasil',
      description: `Pasien ${row.patientName} dihapus dari antrian room.`,
      color: 'success'
    })
  } catch (error: unknown) {
    toast.add({
      title: 'Gagal menghapus dari antrian room',
      description: getErrorMessage(error, 'Terjadi kesalahan saat menghapus pasien dari antrian room.'),
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
      title: 'Sesi room belum aktif',
      description: 'Masuk ke room dulu sebelum mengambil pasien dari waiting list.',
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
      title: 'Room tidak sesuai',
      description: 'Room aktif harus sesuai dengan room type yang sedang dibuka.',
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
      title: 'Berhasil',
      description: 'Pasien berhasil diambil dari waiting list.',
      color: 'success'
    })
  } catch (error: unknown) {
    const status = (error as { response?: { status?: number } })?.response?.status
    const message = getErrorMessage(error, 'Terjadi kesalahan saat mengambil pasien dari waiting list.')

    if (status === 409) {
      toast.add({
        title: 'Sudah diambil ruangan lain',
        description: 'Pasien ini sudah dipanggil oleh ruangan lain. Silakan refresh antrian.',
        color: 'warning'
      })
      await refreshWaiting()
    } else if (status === 403) {
      toast.add({
        title: 'Tidak berwenang',
        description: 'Ruangan ini tidak menangani stage yang dipanggil.',
        color: 'error'
      })
    } else {
      toast.add({
        title: 'Gagal mengambil pasien',
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
  return 'Sesi room tidak aktif'
}

function openEnterRoomModal() {
  if (!assignment.value?.roomId) {
    toast.add({
      title: 'Belum ada assignment room',
      description: 'Tidak ada room assignment yang bisa dipakai untuk masuk room.',
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
      title: 'Berhasil',
      description: 'Berhasil masuk ke room aktif.',
      color: 'success'
    })
  } catch (error: unknown) {
    toast.add({
      title: 'Gagal masuk room',
      description: getErrorMessage(error, 'Terjadi kesalahan saat masuk ke room aktif.'),
      color: 'error'
    })
  } finally {
    roomEnterActionLoading.value = false
  }
}

function openExitRoomModal() {
  if (!activeRoomSession.value) {
    toast.add({
      title: 'Sesi room belum aktif',
      description: 'Tidak ada room aktif yang bisa dikeluarkan.',
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
      title: 'Berhasil',
      description: 'Berhasil keluar dari room aktif.',
      color: 'success'
    })
  } catch (error: unknown) {
    toast.add({
      title: 'Gagal keluar room',
      description: getErrorMessage(error, 'Terjadi kesalahan saat keluar dari room aktif.'),
      color: 'error'
    })
  } finally {
    roomExitActionLoading.value = false
  }
}

async function refreshAll() {
  await Promise.all([
    refreshAssignment(),
    refreshHistory(),
    refreshWaiting()
  ])
}

async function openWaitingPatientsModal() {
  if (!isSuperAdmin.value && !roomTypeId.value) {
    toast.add({
      title: 'Perlu assignment room',
      description: 'Untuk melihat daftar pasien waiting, user harus punya assignment room aktif.',
      color: 'warning'
    })
  }

  if (isSuperAdmin.value) {
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
  [isSuperAdmin, roomTypeOptions, roomTypeId],
  ([superAdmin, options, assignedRoomTypeId]) => {
    if (!superAdmin) return
    const availableRoomTypeIds = new Set(options.map(option => option.value))
    if (availableRoomTypeIds.has(selectedHistoryRoomTypeId.value)) return
    selectedHistoryRoomTypeId.value = availableRoomTypeIds.has(assignedRoomTypeId ?? '')
      ? assignedRoomTypeId ?? ''
      : (options[0]?.value ?? '')
  },
  { immediate: true }
)

onMounted(() => {
  refreshAssignment()
  refreshRoomSession()
})

watch(
  () => assignment.value?.id,
  () => refreshRoomSession()
)
</script>

<template>
  <UDashboardPanel id="room-queue-history">
    <template #header>
      <UDashboardNavbar
        title="Room Queue History"
        subtitle="Histori queue selesai dan daftar pasien waiting"
      >
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UBadge
            :color="activeRoomSession ? 'success' : 'neutral'"
            variant="subtle"
            :label="roomSessionPending ? 'Mengecek sesi room...' : getRoomSessionLabel()"
          />

          <UButton
            v-if="canEnterRoom"
            color="primary"
            variant="soft"
            icon="i-lucide-log-in"
            :loading="assignmentPending || roomEnterActionLoading"
            @click="openEnterRoomModal"
          >
            Masuk Room
          </UButton>

          <UButton
            v-if="activeRoomSession"
            color="warning"
            variant="soft"
            icon="i-lucide-log-out"
            :loading="roomExitActionLoading"
            @click="openExitRoomModal"
          >
            Keluar Room
          </UButton>

          <UButton
            icon="i-lucide-users-round"
            color="neutral"
            variant="soft"
            @click="openWaitingPatientsModal"
          >
            Lihat Pasien Menunggu
          </UButton>

          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="soft"
            :loading="assignmentPending || historyPending || waitingPending"
            @click="refreshAll"
          >
            Refresh
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <UAlert
          v-if="assignment && !activeRoomSession"
          color="info"
          variant="soft"
          icon="i-lucide-info"
          title="Assignment aktif, tetapi belum masuk room"
          :description="`Anda sudah di-assign ke ${assignment.room?.name || assignment.roomType?.name || 'ruangan'}. Klik 'Masuk Room' di kanan atas untuk memulai sesi, lalu tombol 'Ambil Pasien' akan aktif.`"
        />

        <UCard class="overflow-hidden border border-default/80 shadow-sm">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div class="space-y-3">
              <div>
                <p class="text-sm font-medium text-muted">
                  Assignment room hari ini
                </p>
                <h2 class="mt-1 text-xl font-semibold text-highlighted">
                  {{ assignment?.roomType?.name || 'Belum ada assignment room' }}
                </h2>
                <p class="mt-1 text-sm text-muted">
                  {{ assignment?.room?.code ? `${assignment.room.code} - ` : '' }}
                  {{ assignment?.room?.name || 'Histori tetap bisa dilihat tanpa masuk room.' }}
                </p>
              </div>

              <div class="flex flex-wrap gap-2">
                <UBadge
                  :color="isSuperAdmin ? 'success' : (roomTypeId ? 'info' : 'warning')"
                  variant="subtle"
                  :label="isSuperAdmin ? 'Super Admin' : (roomTypeId ? 'Room Ter-assign' : 'Belum assign room')"
                />
                <UBadge
                  v-if="assignment?.assignmentSource"
                  color="neutral"
                  variant="soft"
                  :label="assignment.assignmentSource === 'SELF' ? 'Self Assignment' : 'PIC Assignment'"
                />
              </div>

              <p class="text-sm text-muted">
                {{ assignment?.notes || 'Histori queue hanya menampilkan data yang sudah selesai diproses.' }}
              </p>
            </div>

            <div class="grid grid-cols-2 gap-3 lg:min-w-80 lg:grid-cols-3">
              <div class="rounded-lg border border-default bg-muted/30 p-3">
                <p class="text-xs text-muted">
                  Selesai
                </p>
                <p class="mt-1 text-2xl font-semibold text-highlighted">
                  {{ historyStats.completed }}
                </p>
              </div>

              <div class="rounded-lg border border-default bg-muted/30 p-3">
                <p class="text-xs text-muted">
                  Waiting
                </p>
                <p class="mt-1 text-2xl font-semibold text-highlighted">
                  {{ historyStats.waiting }}
                </p>
              </div>

              <div class="rounded-lg border border-default bg-muted/30 p-3">
                <p class="text-xs text-muted">
                  Akses
                </p>
                <p class="mt-1 text-sm font-medium text-highlighted">
                  {{ historyStats.access }}
                </p>
              </div>
            </div>
          </div>
        </UCard>

        <UAlert
          v-if="!assignmentPending && !assignment && !isSuperAdmin"
          color="warning"
          title="Belum ada assignment aktif"
          description="Histori queue tetap bisa dibuka. Untuk melihat daftar pasien waiting, user harus punya assignment room."
        />

        <RoomsSampleReceptionPanel
          v-if="isSampleReceptionRoom"
          :active-room-session="activeRoomSession"
          :is-super-admin="isSuperAdmin"
        />

        <UCard class="overflow-hidden border border-default/80 shadow-sm">
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <div>
                <h3 class="text-base font-semibold text-highlighted">
                  Histori Queue
                </h3>
                <p class="text-sm text-muted">
                  Histori queue room. Gunakan filter status untuk melihat data lain. Bagian ini read-only.
                </p>
              </div>
              <div class="flex items-center gap-3">
                <USelect
                  v-if="isSuperAdmin"
                  v-model="selectedHistoryRoomTypeId"
                  :items="roomTypeOptions"
                  :loading="roomTypesPending"
                  placeholder="Pilih room type"
                  class="w-56"
                />
                <USelect
                  v-model="historyStatusFilter"
                  :items="historyStatusOptions"
                  class="w-44"
                />
                <UBadge
                  variant="soft"
                  color="neutral"
                  :label="`${historyRows.length} record`"
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
              {{ isSuperAdmin && !effectiveHistoryRoomTypeId ? 'Pilih room type dulu' : 'Tidak ada histori queue' }}
            </h3>
            <p class="mt-1 max-w-lg text-sm text-muted">
              {{ isSuperAdmin && !effectiveHistoryRoomTypeId
                ? 'Super admin perlu memilih room type di atas untuk memuat histori queue.'
                : 'Data akan muncul setelah pasien selesai diproses di room.' }}
            </p>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="min-w-full border-separate border-spacing-0">
              <thead>
                <tr class="bg-muted/30">
                  <th class="border-b border-default px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    Queue
                  </th>
                  <th class="border-b border-default px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    Pasien
                  </th>
                  <th class="border-b border-default px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    Item
                  </th>
                  <th class="border-b border-default px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    Stage
                  </th>
                  <th class="border-b border-default px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    Sample
                  </th>
                  <th class="border-b border-default px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    Status
                  </th>
                  <th class="border-b border-default px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted">
                    Aksi
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
                      <p class="font-semibold text-highlighted">
                        {{ row.queueCode }}
                      </p>
                      <p class="text-xs text-muted">
                        {{ row.queueType }} · Tier {{ row.tierOrder }}
                      </p>
                      <p class="text-xs text-muted">
                        Check-in {{ formatQueueDate(row.checkinAt) }}
                      </p>
                      <p class="text-xs text-muted">
                        Selesai {{ formatQueueDate(row.completedAt) }}
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
                    </div>
                  </td>
                  <td class="border-b border-default px-4 py-4">
                    <p class="text-sm text-highlighted">
                      {{ row.itemSummary }}
                    </p>
                  </td>
                  <td class="border-b border-default px-4 py-4">
                    <p class="text-sm text-muted">
                      {{ row.stageSummary }}
                    </p>
                  </td>
                  <td class="border-b border-default px-4 py-4">
                    <p class="text-sm text-muted">
                      {{ row.sampleSummary }}
                    </p>
                  </td>
                  <td class="border-b border-default px-4 py-4">
                    <UBadge
                      :label="getItemStatusLabel(row.status)"
                      :color="getQueueBadgeColor(row.status)"
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
        </UCard>
      </div>

      <UModal v-model:open="isWaitingModalOpen" :ui="{ content: 'sm:max-w-6xl' }">
        <template #body>
          <div class="space-y-4 rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div class="flex items-start justify-between gap-4">
              <div>
                <h3 class="text-lg font-semibold text-highlighted">
                  Pasien di Ruang Tunggu
                </h3>
                <p class="text-sm text-muted">
                  Daftar pasien yang masih berstatus waiting. Ini hanya bisa dibuka jika ada assignment room, kecuali super admin.
                </p>
              </div>
              <UButton
                icon="i-lucide-refresh-cw"
                color="neutral"
                variant="soft"
                :loading="waitingPending"
                @click="refreshWaiting"
              >
                Refresh
              </UButton>
            </div>

            <div v-if="isSuperAdmin" class="space-y-2">
              <UFormField
                label="Room Type"
                description="Pilih room type yang ingin dilihat daftar waiting-nya."
              >
                <USelect
                  v-model="selectedWaitingRoomTypeId"
                  :items="roomTypeOptions"
                  :loading="roomTypesPending"
                  placeholder="Pilih room type"
                />
              </UFormField>
            </div>

            <div class="space-y-2">
              <UFormField
                label="Status"
                description="Default hanya waiting agar pasien yang sudah diambil tidak ikut tampil."
              >
                <USelect
                  v-model="waitingStatusFilter"
                  :items="[
                    { label: 'Waiting', value: 'WAITING' },
                    { label: 'Called', value: 'CALLED' },
                    { label: 'In Progress', value: 'IN_PROGRESS' },
                    { label: 'Semua', value: 'ALL' }
                  ]"
                />
              </UFormField>
            </div>

            <UAlert
              v-if="!roomTypeId && !isSuperAdmin"
              color="warning"
              title="Perlu assignment room"
              description="User biasa harus punya assignment room untuk melihat daftar pasien waiting."
            />

            <UAlert
              v-else-if="isSuperAdmin && !effectiveWaitingRoomTypeId"
              color="info"
              title="Room type belum dipilih"
              description="Super admin perlu memilih room type untuk memuat daftar pasien waiting."
            />

            <UAlert
              v-if="effectiveWaitingRoomTypeId && !activeRoomSession"
              color="warning"
              title="Sesi room belum aktif"
              description="Untuk mengambil pasien dari waiting list, user harus masuk ke room terlebih dahulu."
            />

            <div v-if="waitingPending" class="space-y-3">
              <USkeleton class="h-14 rounded-xl" />
              <USkeleton class="h-14 rounded-xl" />
              <USkeleton class="h-14 rounded-xl" />
            </div>

            <div v-else-if="waitingRows.length" class="overflow-x-auto">
              <table class="min-w-full border-separate border-spacing-0">
                <thead>
                  <tr class="bg-muted/30">
                    <th class="border-b border-default px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                      Queue
                    </th>
                    <th class="border-b border-default px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                      Pasien
                    </th>
                    <th class="border-b border-default px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                      Item
                    </th>
                    <th class="border-b border-default px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                      Stage
                    </th>
                    <th class="border-b border-default px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                      Status
                    </th>
                    <th class="border-b border-default px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted">
                      Aksi
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
                      </div>
                    </td>
                    <td class="border-b border-default px-4 py-4">
                      <p class="text-sm text-highlighted">
                        {{ row.itemSummary }}
                      </p>
                    </td>
                    <td class="border-b border-default px-4 py-4">
                      <p class="text-sm text-muted">
                        {{ row.stageSummary }}
                      </p>
                    </td>
                    <td class="border-b border-default px-4 py-4">
                      <UBadge
                        :label="getItemStatusLabel(row.status)"
                        :color="getQueueBadgeColor(row.status)"
                        variant="subtle"
                      />
                    </td>
                    <td class="border-b border-default px-4 py-4 text-right">
                      <div class="flex justify-end gap-2">
                        <UButton
                          color="neutral"
                          variant="soft"
                          icon="i-lucide-clipboard-list"
                          @click="openQueueWork(row.id)"
                        >
                          View Queue Work
                        </UButton>
                        <UButton
                          v-if="row.stageId"
                          color="primary"
                          variant="soft"
                          icon="i-lucide-log-in"
                          :loading="waitingRowActionLoading[row.id]"
                          :disabled="!row.stageId || !activeRoomSession || (!isSuperAdmin && effectiveWaitingRoomTypeId && activeRoomSession?.roomTypeId !== effectiveWaitingRoomTypeId)"
                          @click="handleWaitingRowCall(row)"
                        >
                          Ambil Pasien
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
                Tidak ada pasien waiting
              </h3>
              <p class="mt-1 max-w-lg text-sm text-muted">
                Daftar ini hanya menampilkan pasien yang masih menunggu di room aktif.
              </p>
            </div>
          </div>
        </template>
      </UModal>

      <UModal v-model:open="isEnterRoomModalOpen" title="Masuk Room">
        <template #body>
          <div class="space-y-4">
            <UAlert
              color="info"
              title="Masuk ke room assignment?"
              :description="`Room assignment saat ini: ${assignment?.room?.code ? `${assignment.room.code} - ` : ''}${assignment?.room?.name || assignment?.roomType?.name || '-'}.`"
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
              Batal
            </UButton>
            <UButton
              color="primary"
              :loading="roomEnterActionLoading"
              @click="handleEnterRoom"
            >
              Masuk Room
            </UButton>
          </div>
        </template>
      </UModal>

      <UModal v-model:open="isExitRoomModalOpen" title="Keluar Room">
        <template #body>
          <div class="space-y-4">
            <UAlert
              color="warning"
              title="Keluar dari sesi room aktif?"
              :description="`Sesi aktif saat ini: ${getRoomSessionLabel()}. Setelah keluar, kamu bisa pindah ke room lain.`"
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
              Batal
            </UButton>
            <UButton
              color="warning"
              :loading="roomExitActionLoading"
              @click="handleExitRoom"
            >
              Keluar Room
            </UButton>
          </div>
        </template>
      </UModal>

      <UModal
        v-model:open="sampleDetailOpen"
        title="Detail Pengambilan Sample"
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
            <span class="ml-2">Memuat detail pengambilan sample…</span>
          </div>

          <template v-else-if="sampleDetailData.length">
            <p class="mb-4 text-sm text-gray-600 dark:text-gray-400">
              Pasien: <span class="font-semibold text-gray-900 dark:text-gray-50">{{ sampleDetailPatientName }}</span>
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
                    Jenis Sample
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
                    Jumlah Tabung
                  </dt>
                  <dd class="text-sm text-gray-900 dark:text-gray-50">
                    {{ collection.tubeCount ?? 1 }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs text-gray-500 dark:text-gray-400">
                    Waktu Pengambilan
                  </dt>
                  <dd class="text-sm text-gray-900 dark:text-gray-50">
                    {{ formatQueueDate(collection.collectedAt) }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs text-gray-500 dark:text-gray-400">
                    Petugas Pengambil (COLLECT)
                  </dt>
                  <dd class="text-sm text-gray-900 dark:text-gray-50">
                    {{ collection.collectedByUser?.name || (collection.collectedAt ? 'Tidak diketahui' : '-') }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs text-gray-500 dark:text-gray-400">
                    Waktu Diterima Lab (RECEIVE)
                  </dt>
                  <dd class="text-sm text-gray-900 dark:text-gray-50">
                    {{ formatQueueDate(collection.receivedAt) }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs text-gray-500 dark:text-gray-400">
                    Petugas Penerima (RECEIVE)
                  </dt>
                  <dd class="text-sm text-gray-900 dark:text-gray-50">
                    {{ collection.receivedByUser?.name || (collection.receivedAt ? 'Tidak diketahui' : '-') }}
                  </dd>
                </div>
                <div
                  v-if="collection.status === 'REJECTED'"
                >
                  <dt class="text-xs text-gray-500 dark:text-gray-400">
                    Alasan Ditolak
                  </dt>
                  <dd class="text-sm text-gray-900 dark:text-gray-50">
                    {{ collection.rejectReason || '-' }}
                  </dd>
                </div>
                <div
                  v-if="collection.status === 'RESCHEDULED'"
                >
                  <dt class="text-xs text-gray-500 dark:text-gray-400">
                    Jadwal Ulang
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
                  Item terkait:
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
            Tidak ada data pengambilan sample untuk antrian ini.
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
