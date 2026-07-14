<script setup lang="ts">
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
  queueCode: string
  queueType: string
  tierOrder: number
  patientName: string
  patientId: string
  roomLabel: string
  itemSummary: string
  stageSummary: string
  sampleSummary: string
  status: string
  checkinAt: string | null
  completedAt: string | null
  registrationId?: number | null
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
const { roles } = await useCurrentUser()
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
const selectedWaitingRoomTypeId = ref('')
const waitingStatusFilter = ref<'WAITING' | 'CALLED' | 'IN_PROGRESS' | 'ALL'>('WAITING')

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
const activeRoomSession = computed(() => {
  if (!roomSession.value?.id || roomSession.value.endedAt) return null
  return roomSession.value as RoomSession
})
const canEnterRoom = computed(() => Boolean(assignment.value?.roomId) && !activeRoomSession.value)
const effectiveWaitingRoomTypeId = computed(() =>
  isSuperAdmin.value ? selectedWaitingRoomTypeId.value : roomTypeId.value
)

const {
  data: historyData,
  pending: historyPending,
  refresh: refreshHistory
} = await useAsyncData<RoomQueueItem[]>(
  'room-queue-history',
  async () => {
    if (!roomTypeId.value) return []

    const res = await api.get(`/medical/exams/queue/room/${roomTypeId.value}`, {
      params: {
        queueDate: today,
        status: 'DONE',
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
    watch: [roomTypeId],
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
    .filter(item => item.status === 'DONE')
    .sort((a, b) => {
      const left = new Date(b.doneAt || b.queueEntry?.doneAt || b.queueEntry?.checkinAt || 0).getTime()
      const right = new Date(a.doneAt || a.queueEntry?.doneAt || a.queueEntry?.checkinAt || 0).getTime()
      return left - right
    })
)

const waitingItems = computed(() => waitingData.value ?? [])

const historyRows = computed<QueueHistoryRow[]>(() =>
  historyItems.value.map((item) => {
    const registration = item.queueEntry?.registration
    const patient = registration?.patient
    const itemNames = (item.examItems ?? [])
      .map(examItem => examItem.trxExamItem?.item?.name)
      .filter((value): value is string => Boolean(value))
    const stageParts = (item.stageItems ?? []).map(stage => `Stage ${stage.stageOrder}: ${getItemStatusLabel(stage.status)}`)
    const sampleParts = (item.queueEntry?.sampleCollections ?? []).map(sample => `${sample.sampleType?.name || 'Sample'}: ${getSampleStatusLabel(sample.status)}`)

    return {
      id: item.id,
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
      status: item.status,
      checkinAt: item.queueEntry?.checkinAt ?? null,
      completedAt: item.doneAt ?? item.queueEntry?.doneAt ?? null,
      registrationId: registration?.id ?? null
    }
  })
)

const waitingRows = computed<WaitingRow[]>(() =>
  waitingItems.value.map((item) => {
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
  if (status === 'LOCKED') return 'Terkunci'
  return 'Menunggu'
}

function getQueueBadgeColor(status: string) {
  if (status === 'DONE') return 'success'
  if (status === 'WAITING') return 'warning'
  if (status === 'CALLED') return 'info'
  if (status === 'IN_PROGRESS') return 'warning'
  if (status === 'SKIPPED' || status === 'RESCHEDULED') return 'neutral'
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

function getHistoryRowActions(row: QueueHistoryRow) {
  return [
    [
      {
        label: 'Lihat Detail Dokumen',
        icon: 'i-lucide-file-text',
        onSelect: () => openProcessedDocument(row)
      }
    ]
  ]
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

  if (effectiveWaitingRoomTypeId.value && activeRoomSession.value.roomTypeId !== effectiveWaitingRoomTypeId.value) {
    toast.add({
      title: 'Room tidak sesuai',
      description: 'Room aktif harus sesuai dengan room type yang sedang dibuka.',
      color: 'warning'
    })
    return
  }

  setWaitingRowLoading(row.id, true)
  try {
    await api.patch(`/medical/exams/queue/stage/${row.stageId}/call`, {})
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
    toast.add({
      title: 'Gagal mengambil pasien',
      description: getErrorMessage(error, 'Terjadi kesalahan saat mengambil pasien dari waiting list.'),
      color: 'error'
    })
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

  if (isSuperAdmin.value && !selectedWaitingRoomTypeId.value) {
    selectedWaitingRoomTypeId.value = roomTypeId.value || (roomTypeOptions.value[0]?.value ?? '')
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

        <UCard class="overflow-hidden border border-default/80 shadow-sm">
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <div>
                <h3 class="text-base font-semibold text-highlighted">
                  Histori Queue
                </h3>
                <p class="text-sm text-muted">
                  Hanya queue yang sudah selesai diproses. Bagian ini read-only.
                </p>
              </div>
              <UBadge
                variant="soft"
                color="neutral"
                :label="`${historyRows.length} record`"
              />
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
              Tidak ada histori queue
            </h3>
            <p class="mt-1 max-w-lg text-sm text-muted">
              Data akan muncul setelah pasien selesai diproses di room.
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
                    <UButton
                      v-if="row.status === 'WAITING'"
                      color="primary"
                      variant="soft"
                      icon="i-lucide-log-in"
                      :loading="waitingRowActionLoading[row.id]"
                      :disabled="!row.stageId || !activeRoomSession || (effectiveWaitingRoomTypeId && activeRoomSession?.roomTypeId !== effectiveWaitingRoomTypeId)"
                      @click="handleWaitingRowCall(row)"
                    >
                      Ambil Pasien
                    </UButton>
                    <UBadge
                      v-else
                      :label="getItemStatusLabel(row.status)"
                      :color="getQueueBadgeColor(row.status)"
                      variant="soft"
                    />
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
    </template>
  </UDashboardPanel>
</template>
