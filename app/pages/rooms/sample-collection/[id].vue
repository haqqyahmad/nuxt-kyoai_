<script setup lang="ts">
type SampleUser = { id: number, name: string, email?: string | null }
type SampleCollectionRow = {
  id: string
  status: string
  tubeCount?: number | null
  barcode?: string | null
  collectedAt?: string | null
  receivedAt?: string | null
  rescheduledAt?: string | null
  rejectReason?: string | null
  takenBy?: number | null
  sampleType?: { id: string, name?: string | null } | null
  collectedByUser?: SampleUser | null
  receivedByUser?: SampleUser | null
  takenByUser?: SampleUser | null
  queueEntry?: {
    id: string
    queueCode?: string | null
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
      } | null
    } | null
  } | null
  items?: Array<{
    id: string
    item?: { id: string, code?: string | null, name?: string | null } | null
  }>
}

type BadgeColor = 'success' | 'info' | 'error' | 'warning' | 'neutral'

type StageQueueItem = {
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

type RoomQueueItem = {
  id: string
  roomTypeId: string
  status: string
  stageItems?: StageQueueItem[]
}

type QueueDetail = {
  id: string
  queueCode?: string | null
  roomItems?: RoomQueueItem[]
}

type RoomAssignment = {
  id: string
  assignedDate: string
  roomId: string | null
  roomTypeId: string | null
  room?: { id: string, code: string, name: string } | null
  roomType?: { id: string, code: string, name: string } | null
}

const route = useRoute()
const router = useRouter()
const api = useApi()
const toast = useToast()
const { user } = await useCurrentUser()
const {
  session: roomSession,
  pending: roomSessionPending,
  refresh: refreshRoomSession,
  enterRoomSession,
  exitRoomSession
} = await useRoomSession()

const today = new Date().toISOString().slice(0, 10)
const roomTypeId = computed(() => roomSession.value?.roomTypeId ?? null)
const currentRoomId = computed(() => roomSession.value?.roomId ?? null)
const queueEntryId = computed(() => route.params.id as string)

const loading = ref(false)
const samples = ref<SampleCollectionRow[]>([])
const error = ref<string | null>(null)
const actionLoading = ref<Record<string, boolean>>({})
const stageActionLoading = ref(false)

const isEnterRoomModalOpen = ref(false)
const isExitRoomModalOpen = ref(false)
const roomEnterActionLoading = ref(false)
const roomExitActionLoading = ref(false)

const { data: assignmentData } = await useAsyncData<RoomAssignment | null>(
  'sample-collection-assignment',
  async () => {
    try {
      const res = await api.get('/room-assignments/me', {
        params: { assignedDate: today, _: Date.now() }
      })
      const payload = res.data
      return (payload && Object.prototype.hasOwnProperty.call(payload, 'data')
        ? payload.data
        : payload) as RoomAssignment | null
    } catch {
      return null
    }
  },
  { default: () => null, server: false }
)

const assignment = computed(() => assignmentData.value ?? null)
const activeRoomSession = computed(() => {
  if (!roomSession.value?.id || roomSession.value.endedAt) return null
  return roomSession.value
})
const canEnterRoom = computed(() => Boolean(assignment.value?.roomId) && !activeRoomSession.value)
const roomSessionLabel = computed(() => {
  if (!activeRoomSession.value) return 'Sesi room tidak aktif'
  if (activeRoomSession.value.room?.name) {
    return `${activeRoomSession.value.room.code} - ${activeRoomSession.value.room.name}`
  }
  return activeRoomSession.value.roomType?.name || 'Sesi room aktif'
})

const isRejectModalOpen = ref(false)
const rejectTarget = ref<SampleCollectionRow | null>(null)
const rejectReason = ref('')
const rejectSubmitting = ref(false)

const isRescheduleModalOpen = ref(false)
const rescheduleTarget = ref<SampleCollectionRow | null>(null)
const rescheduleDate = ref('')
const rescheduleNote = ref('')
const rescheduleSubmitting = ref(false)

const { data: queueDetail, refresh: refreshQueueDetail } = await useAsyncData<QueueDetail | null>(
  'sample-collection-queue-detail',
  async () => {
    if (!queueEntryId.value) return null
    try {
      const res = await api.get(`/medical/exams/queue/${queueEntryId.value}`)
      return (res.data?.data ?? res.data ?? null) as QueueDetail | null
    } catch {
      return null
    }
  },
  { default: () => null, server: false }
)

const activeRoomItem = computed(() => {
  const items = queueDetail.value?.roomItems ?? []
  if (!currentRoomId.value) return null
  return items.find(r => r.id === currentRoomId.value) ?? items[0] ?? null
})

const stageItems = computed(() => activeRoomItem.value?.stageItems ?? [])

const activeStage = computed(() => {
  const candidates = stageItems.value.filter(s => ['WAITING', 'CALLED', 'IN_PROGRESS'].includes(s.status))
  return candidates[0] ?? null
})
const activeStageCode = computed(() => activeStage.value?.stage?.code ?? null)
const isCollectStageActive = computed(() => activeStageCode.value === 'COLLECT')
const isReceiveStageActive = computed(() => activeStageCode.value === 'RECEIVE')

const patientName = computed(() => {
  const pt = samples.value[0]?.queueEntry?.registration?.patient
  if (!pt) return null
  return [pt.firstName, pt.middleName, pt.lastName].filter(Boolean).join(' ') || null
})

const patientId = computed(() => samples.value[0]?.queueEntry?.registration?.patient?.PatientId || null)
const regNo = computed(() => samples.value[0]?.queueEntry?.registration?.id_reg || null)
const queueCode = computed(() => samples.value[0]?.queueEntry?.queueCode || null)
const examDate = computed(() => samples.value[0]?.queueEntry?.registration?.examDate || null)

const pendingCount = computed(() => samples.value.filter(s => s.status === 'PENDING').length)
const collectedCount = computed(() => samples.value.filter(s => s.status === 'COLLECTED').length)
const receivedCount = computed(() => samples.value.filter(s => s.status === 'RECEIVED').length)
const rejectedCount = computed(() => samples.value.filter(s => s.status === 'REJECTED').length)
const rescheduledCount = computed(() => samples.value.filter(s => s.status === 'RESCHEDULED').length)
const hasPending = computed(() => pendingCount.value > 0)

const summaryStats = computed(() => [
  { label: 'Total', value: samples.value.length, color: 'neutral' as BadgeColor },
  { label: 'Menunggu', value: pendingCount.value, color: 'warning' as BadgeColor },
  { label: 'Diambil', value: collectedCount.value, color: 'info' as BadgeColor },
  { label: 'Diterima', value: receivedCount.value, color: 'success' as BadgeColor },
  ...(rejectedCount.value > 0 ? [{ label: 'Ditolak', value: rejectedCount.value, color: 'error' as BadgeColor }] : []),
  ...(rescheduledCount.value > 0 ? [{ label: 'Reschedule', value: rescheduledCount.value, color: 'warning' as BadgeColor }] : [])
])

function canCollect(sample: SampleCollectionRow) {
  return sample.status === 'PENDING' && isCollectStageActive.value && activeStage.value?.status === 'IN_PROGRESS'
}

function canReceive(sample: SampleCollectionRow) {
  return sample.status === 'COLLECTED' && isReceiveStageActive.value && activeStage.value?.status === 'IN_PROGRESS'
}

async function collectSample(sample: SampleCollectionRow) {
  if (!canCollect(sample) || actionLoading.value[sample.id]) return
  actionLoading.value = { ...actionLoading.value, [sample.id]: true }
  try {
    await api.patch(`/medical/exams/queue/samples/${sample.id}/collect`, {
      tubeCount: sample.tubeCount ?? 1
    })
    toast.add({
      title: 'Berhasil',
      description: `Sample ${sample.sampleType?.name || ''} berhasil diambil.`,
      color: 'success'
    })
    await load()
  } catch {
    toast.add({
      title: 'Gagal mengambil sample',
      description: 'Terjadi kesalahan saat mengambil sample.',
      color: 'error'
    })
  } finally {
    actionLoading.value = { ...actionLoading.value, [sample.id]: false }
  }
}

async function receiveSample(sample: SampleCollectionRow) {
  if (!canReceive(sample) || actionLoading.value[sample.id]) return
  actionLoading.value = { ...actionLoading.value, [sample.id]: true }
  try {
    await api.patch(`/medical/exams/queue/samples/${sample.id}/receive`)
    toast.add({
      title: 'Berhasil',
      description: `Sample ${sample.sampleType?.name || ''} diterima dan diverifikasi.`,
      color: 'success'
    })
    await load()
  } catch {
    toast.add({
      title: 'Gagal menerima sample',
      description: 'Terjadi kesalahan saat menerima sample.',
      color: 'error'
    })
  } finally {
    actionLoading.value = { ...actionLoading.value, [sample.id]: false }
  }
}

const currentUserId = computed(() => user.value?.id ?? null)

function canReject(sample: SampleCollectionRow) {
  return sample.status !== 'REJECTED' && sample.status !== 'RESCHEDULED' && activeStage.value?.status === 'IN_PROGRESS'
}

function canReschedule(sample: SampleCollectionRow) {
  return (sample.status === 'PENDING' || sample.status === 'COLLECTED' || sample.status === 'REJECTED') && activeStage.value?.status === 'IN_PROGRESS'
}

function openRejectModal(sample: SampleCollectionRow) {
  rejectTarget.value = sample
  rejectReason.value = ''
  isRejectModalOpen.value = true
}

function openRescheduleModal(sample: SampleCollectionRow) {
  rescheduleTarget.value = sample
  rescheduleDate.value = ''
  rescheduleNote.value = ''
  isRescheduleModalOpen.value = true
}

async function confirmReject() {
  if (!rejectTarget.value || rejectSubmitting.value) return
  if (!rejectReason.value.trim()) {
    toast.add({ title: 'Alasan wajib diisi', color: 'warning' })
    return
  }
  rejectSubmitting.value = true
  try {
    await api.patch(`/medical/exams/queue/samples/${rejectTarget.value.id}/reject`, {
      rejectReason: rejectReason.value.trim()
    })
    toast.add({ title: 'Berhasil', description: 'Sample ditolak.', color: 'success' })
    isRejectModalOpen.value = false
    rejectTarget.value = null
    await load()
  } catch (err: unknown) {
    const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal menolak sample'
    toast.add({ title: 'Gagal menolak sample', description: message, color: 'error' })
  } finally {
    rejectSubmitting.value = false
  }
}

async function confirmReschedule() {
  if (!rescheduleTarget.value || rescheduleSubmitting.value) return
  if (!rescheduleDate.value) {
    toast.add({ title: 'Tanggal reschedule wajib diisi', color: 'warning' })
    return
  }
  rescheduleSubmitting.value = true
  try {
    await api.patch(`/medical/exams/queue/samples/${rescheduleTarget.value.id}/reschedule`, {
      rescheduledBy: currentUserId.value,
      rescheduledAt: rescheduleDate.value,
      rescheduleNote: rescheduleNote.value.trim() || null
    })
    toast.add({ title: 'Berhasil', description: 'Sample dijadwalkan ulang.', color: 'success' })
    isRescheduleModalOpen.value = false
    rescheduleTarget.value = null
    await load()
  } catch {
    toast.add({ title: 'Gagal reschedule sample', color: 'error' })
  } finally {
    rescheduleSubmitting.value = false
  }
}

function formatDateTime(s?: string | null) {
  if (!s) return '-'
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(d)
}

function statusLabel(status: string) {
  if (status === 'PENDING') return 'Belum Diambil'
  if (status === 'COLLECTED') return 'Sudah Diambil'
  if (status === 'RECEIVED') return 'Diterima Lab'
  if (status === 'REJECTED') return 'Ditolak'
  if (status === 'RESCHEDULED') return 'Reschedule'
  return status
}

function statusColor(status: string): BadgeColor {
  if (status === 'RECEIVED') return 'success'
  if (status === 'COLLECTED') return 'info'
  if (status === 'REJECTED') return 'error'
  if (status === 'RESCHEDULED') return 'warning'
  return 'neutral'
}

function statusIcon(status: string) {
  if (status === 'RECEIVED') return 'i-lucide-check-circle'
  if (status === 'COLLECTED') return 'i-lucide-droplets'
  if (status === 'REJECTED') return 'i-lucide-x-circle'
  if (status === 'RESCHEDULED') return 'i-lucide-calendar-clock'
  return 'i-lucide-clock'
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const params: Record<string, unknown> = {
      queueEntryId: queueEntryId.value,
      limit: 200,
      page: 1,
      _: Date.now()
    }
    if (roomTypeId.value) params.roomTypeId = roomTypeId.value

    const res = await api.get('/medical/exams/queue/samples', { params })
    const payload = res.data
    const list = Array.isArray(payload) ? payload : (payload?.data ?? [])
    samples.value = list as SampleCollectionRow[]
  } catch {
    error.value = 'Gagal memuat detail sample collection.'
  } finally {
    loading.value = false
  }
}

async function startCollection() {
  if (!samples.value.length) return

  const pendingSamples = samples.value.filter(s => s.status === 'PENDING')
  if (!pendingSamples.length) {
    toast.add({ title: 'Semua sample sudah diambil', color: 'info' })
    return
  }

  for (const sample of pendingSamples) {
    await collectSample(sample)
  }
}

async function handleStartStage() {
  if (!activeStage.value || stageActionLoading.value) return

  stageActionLoading.value = true
  try {
    await api.patch(`/medical/exams/queue/stage/${activeStage.value.id}/start`)
    await refreshQueueDetail()
    await load()
    toast.add({
      title: 'Berhasil',
      description: 'Pemeriksaan dimulai.',
      color: 'success'
    })
  } catch {
    toast.add({
      title: 'Gagal memulai pemeriksaan',
      description: 'Terjadi kesalahan saat memulai pemeriksaan.',
      color: 'error'
    })
  } finally {
    stageActionLoading.value = false
  }
}

async function handleReturnStage() {
  if (!activeStage.value || stageActionLoading.value) return

  stageActionLoading.value = true
  try {
    await api.patch(`/medical/exams/queue/stage/${activeStage.value.id}/return`)
    await refreshQueueDetail()
    toast.add({
      title: 'Berhasil',
      description: 'Pasien dikembalikan ke waiting.',
      color: 'success'
    })
  } catch {
    toast.add({
      title: 'Gagal mengembalikan pasien',
      description: 'Terjadi kesalahan.',
      color: 'error'
    })
  } finally {
    stageActionLoading.value = false
  }
}

function getStatusLabel(status: string) {
  if (status === 'DONE') return 'Selesai'
  if (status === 'IN_PROGRESS') return 'Sedang dikerjakan'
  if (status === 'CALLED') return 'Sudah dipanggil'
  if (status === 'SKIPPED') return 'Skip'
  if (status === 'RESCHEDULED') return 'Reschedule'
  if (status === 'LOCKED') return 'Terkunci'
  return 'Menunggu'
}

function getStatusColor(status: string): BadgeColor {
  if (status === 'DONE') return 'success'
  if (status === 'IN_PROGRESS') return 'warning'
  if (status === 'CALLED') return 'info'
  if (status === 'SKIPPED' || status === 'RESCHEDULED') return 'neutral'
  if (status === 'LOCKED') return 'neutral'
  return 'neutral'
}

function formatPatientName(firstName?: string | null, middleName?: string | null, lastName?: string | null) {
  return [firstName, middleName, lastName].filter(Boolean).join(' ') || '-'
}

function openEnterRoomModal() {
  if (!assignment.value?.roomId) {
    toast.add({ title: 'Belum ada assignment room', description: 'Tidak ada room assignment yang bisa dipakai.', color: 'warning' })
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
    toast.add({ title: 'Berhasil', description: 'Berhasil masuk ke room aktif.', color: 'success' })
  } catch (err: unknown) {
    toast.add({ title: 'Gagal masuk room', description: 'Terjadi kesalahan saat masuk ke room aktif.', color: 'error' })
  } finally {
    roomEnterActionLoading.value = false
  }
}

function openExitRoomModal() {
  if (!activeRoomSession.value) {
    toast.add({ title: 'Sesi room belum aktif', description: 'Tidak ada room aktif yang bisa dikeluarkan.', color: 'warning' })
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
    toast.add({ title: 'Berhasil', description: 'Berhasil keluar dari room aktif.', color: 'success' })
    await router.push('/rooms/assignments')
  } catch (err: unknown) {
    toast.add({ title: 'Gagal keluar room', description: 'Terjadi kesalahan saat keluar dari room aktif.', color: 'error' })
  } finally {
    roomExitActionLoading.value = false
  }
}

async function handleFinishStage() {
  if (!activeStage.value || stageActionLoading.value) return

  const allFinal = samples.value.every(s =>
    ['COLLECTED', 'REJECTED', 'RESCHEDULED', 'RECEIVED'].includes(s.status)
  )
  if (!allFinal) {
    toast.add({ title: 'Belum bisa selesai', description: 'Masih ada sample yang belum final (COLLECTED/REJECTED/RESCHEDULED).', color: 'warning' })
    return
  }

  stageActionLoading.value = true
  try {
    await api.patch(`/medical/exams/queue/stage/${activeStage.value.id}/done`, {})
    await refreshQueueDetail()
    await load()
    toast.add({ title: 'Berhasil', description: 'Pemeriksaan sample selesai.', color: 'success' })
    await router.push('/rooms/sample-collection')
  } catch (err: unknown) {
    toast.add({ title: 'Gagal menyelesaikan', description: 'Terjadi kesalahan saat menyelesaikan pemeriksaan.', color: 'error' })
  } finally {
    stageActionLoading.value = false
  }
}

onMounted(() => {
  load()
})
</script>

<template>
  <UDashboardPanel id="sample-collection-detail">
    <template #header>
      <UDashboardNavbar title="Detail Pengambilan Sample">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UBadge
            :color="activeRoomSession ? 'success' : 'neutral'"
            variant="subtle"
            :label="roomSessionPending ? 'Mengecek sesi room...' : roomSessionLabel"
          />

          <UButton
            v-if="canEnterRoom"
            color="primary"
            variant="soft"
            icon="i-lucide-log-in"
            :loading="roomEnterActionLoading"
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
            variant="soft"
            color="neutral"
            icon="i-lucide-arrow-left"
            to="/rooms/sample-collection"
          >
            Kembali
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-5">
        <div
          v-if="loading"
          class="flex items-center justify-center py-20 text-muted"
        >
          <UIcon name="i-lucide-loader-circle" class="animate-spin size-5" />
          <span class="ml-2 text-sm">Memuat data...</span>
        </div>

        <template v-else-if="!error && samples.length">
          <UAlert
            v-if="!activeRoomSession"
            color="warning"
            variant="soft"
            icon="i-lucide-alert-triangle"
            title="Belum ada sesi room aktif"
            description="Masuk ke room Sample Collection dari halaman Room Queue terlebih dahulu."
          />

          <UCard v-else-if="!stageItems.length">
            <div class="flex items-center gap-3 text-muted">
              <UIcon name="i-lucide-alert-circle" class="size-5" />
              <p class="text-sm">
                Room ini belum dikonfigurasi dengan stage COLLECT/RECEIVE.
              </p>
            </div>
          </UCard>

          <template v-else>
            <UCard>
              <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div class="space-y-3">
                  <div>
                    <p class="text-sm font-medium text-muted">
                      Pasien
                    </p>
                    <h2 class="mt-1 text-xl font-semibold text-highlighted">
                      {{ patientName || '-' }}
                    </h2>
                    <p class="mt-1 text-sm text-muted">
                      {{ patientId || '-' }}
                      <template v-if="regNo">
                        · Reg. {{ regNo }}
                      </template>
                      <template v-if="queueCode">
                        · Queue {{ queueCode }}
                      </template>
                    </p>
                  </div>

                  <div class="flex flex-wrap gap-2">
                    <UBadge
                      v-if="activeStage"
                      :label="`Stage: ${activeStage.stage?.name || activeStage.stage?.code || '-'} (${getStatusLabel(activeStage.status)})`"
                      :color="getStatusColor(activeStage.status)"
                      variant="soft"
                    />
                    <UBadge
                      v-if="examDate"
                      color="neutral"
                      variant="outline"
                      icon="i-lucide-calendar"
                      :label="`Exam: ${examDate}`"
                    />
                    <UBadge
                      v-for="stat in summaryStats"
                      :key="stat.label"
                      :color="stat.color"
                      variant="soft"
                      :label="`${stat.label}: ${stat.value}`"
                    />
                  </div>
                </div>

                <div class="flex flex-wrap items-center gap-3">
                  <UButton
                    v-if="activeStage?.status === 'CALLED'"
                    color="warning"
                    icon="i-lucide-play"
                    :loading="stageActionLoading"
                    @click="handleStartStage"
                  >
                    Mulai Pemeriksaan
                  </UButton>

                  <UButton
                    v-if="activeStage?.status === 'CALLED'"
                    color="neutral"
                    variant="soft"
                    icon="i-lucide-arrow-left"
                    :loading="stageActionLoading"
                    @click="handleReturnStage"
                  >
                    Kembalikan ke Waiting
                  </UButton>

                  <UButton
                    v-if="activeStage?.status === 'IN_PROGRESS'"
                    color="success"
                    variant="soft"
                    icon="i-lucide-check-check"
                    :loading="stageActionLoading"
                    @click="handleFinishStage"
                  >
                    Selesaikan
                  </UButton>

                  <div v-if="hasPending && isCollectStageActive && activeStage?.status === 'IN_PROGRESS'" class="flex items-center gap-3">
                    <p class="text-sm text-muted">
                      {{ pendingCount }} sample menunggu
                    </p>
                    <UButton
                      color="primary"
                      icon="i-lucide-play-circle"
                      :loading="Object.values(actionLoading).some((v) => v)"
                      @click="startCollection"
                    >
                      Ambil Semua
                    </UButton>
                  </div>
                </div>
              </div>
            </UCard>

            <div class="space-y-3">
              <UCard
                v-for="row in samples"
                :key="row.id"
                :class="row.status === 'PENDING' ? 'ring-1 ring-warning/30' : ''"
              >
                <div class="flex items-start justify-between gap-4">
                  <div class="min-w-0 flex-1 space-y-2">
                    <div class="flex items-center gap-2">
                      <UIcon
                        :name="statusIcon(row.status)"
                        class="size-4"
                        :class="{
                          'text-warning': row.status === 'PENDING',
                          'text-info': row.status === 'COLLECTED',
                          'text-success': row.status === 'RECEIVED',
                          'text-error': row.status === 'REJECTED',
                          'text-muted': !['PENDING', 'COLLECTED', 'RECEIVED', 'REJECTED'].includes(row.status)
                        }"
                      />
                      <p class="font-medium text-highlighted">
                        {{ row.sampleType?.name || 'Sample' }}
                      </p>
                      <UBadge :color="statusColor(row.status)" variant="soft" size="xs">
                        {{ statusLabel(row.status) }}
                      </UBadge>
                    </div>

                    <div v-if="row.items?.length" class="flex flex-wrap gap-1">
                      <UBadge
                        v-for="it in row.items"
                        :key="it.id"
                        color="neutral"
                        variant="subtle"
                        size="xs"
                      >
                        {{ it.item?.name || it.item?.code || 'Item' }}
                      </UBadge>
                    </div>

                    <div class="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
                      <div>
                        <p class="text-xs text-muted">
                          Diambil oleh
                        </p>
                        <p class="text-highlighted">
                          {{ row.collectedByUser?.name || '-' }}
                        </p>
                        <p class="text-xs text-muted">
                          {{ formatDateTime(row.collectedAt) }}
                        </p>
                      </div>
                      <div>
                        <p class="text-xs text-muted">
                          Diterima oleh
                        </p>
                        <p class="text-highlighted">
                          {{ row.receivedByUser?.name || '-' }}
                        </p>
                        <p class="text-xs text-muted">
                          {{ formatDateTime(row.receivedAt) }}
                        </p>
                      </div>
                      <div>
                        <p class="text-xs text-muted">
                          Lock petugas
                        </p>
                        <p class="text-highlighted">
                          {{ row.takenByUser?.name || 'Bebas' }}
                        </p>
                      </div>
                      <div>
                        <p class="text-xs text-muted">
                          Tabung / Barcode
                        </p>
                        <p class="text-highlighted">
                          {{ row.tubeCount ?? 1 }} / {{ row.barcode || '-' }}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div v-if="canCollect(row) || canReceive(row) || canReject(row) || canReschedule(row)" class="shrink-0 pt-1">
                    <div class="flex flex-wrap gap-2">
                      <UButton
                        v-if="canCollect(row)"
                        color="primary"
                        variant="soft"
                        size="sm"
                        icon="i-lucide-droplets"
                        :loading="actionLoading[row.id]"
                        @click="collectSample(row)"
                      >
                        Ambil
                      </UButton>
                      <UButton
                        v-else-if="canReceive(row)"
                        color="success"
                        variant="soft"
                        size="sm"
                        icon="i-lucide-check"
                        :loading="actionLoading[row.id]"
                        @click="receiveSample(row)"
                      >
                        Terima
                      </UButton>
                      <UButton
                        v-if="canReject(row)"
                        color="error"
                        variant="soft"
                        size="sm"
                        icon="i-lucide-x"
                        @click="openRejectModal(row)"
                      >
                        Tolak
                      </UButton>
                      <UButton
                        v-if="canReschedule(row)"
                        color="warning"
                        variant="soft"
                        size="sm"
                        icon="i-lucide-calendar-clock"
                        @click="openRescheduleModal(row)"
                      >
                        Reschedule
                      </UButton>
                    </div>
                  </div>
                </div>

                <UAlert
                  v-if="row.status === 'REJECTED' && row.rejectReason"
                  color="error"
                  variant="soft"
                  icon="i-lucide-x-circle"
                  title="Alasan Ditolak"
                  :description="row.rejectReason"
                  class="mt-3"
                />

                <UAlert
                  v-if="row.status === 'COLLECTED' && !isReceiveStageActive"
                  color="warning"
                  variant="soft"
                  icon="i-lucide-clock"
                  title="Menunggu stage RECEIVE"
                  description="Sample sudah diambil. Terima sample akan tersedia saat stage RECEIVE aktif."
                  class="mt-3"
                />

                <UAlert
                  v-if="row.status === 'PENDING' && activeStage?.status === 'CALLED'"
                  color="info"
                  variant="soft"
                  icon="i-lucide-play"
                  title="Menunggu Mulai Pemeriksaan"
                  description="Klik 'Mulai Pemeriksaan' di atas untuk memulai pengambilan sample."
                  class="mt-3"
                />

                <UAlert
                  v-else-if="row.status === 'PENDING' && !isCollectStageActive"
                  color="warning"
                  variant="soft"
                  icon="i-lucide-clock"
                  title="Menunggu stage COLLECT"
                  description="Ambil sample akan tersedia saat stage COLLECT aktif."
                  class="mt-3"
                />
              </UCard>
            </div>

            <div
              v-if="!hasPending && !samples.some(s => s.status === 'REJECTED' || s.status === 'RESCHEDULED')"
              class="rounded-lg border border-default p-4 text-center"
            >
              <UIcon name="i-lucide-check-circle" class="mx-auto mb-1 size-5 text-success" />
              <p class="text-sm text-muted">
                Semua sample untuk pasien ini sudah ditangani.
              </p>
            </div>
          </template>
        </template>

        <div v-else-if="error" class="py-20 text-center">
          <UIcon name="i-lucide-alert-circle" class="mx-auto mb-2 size-8 text-muted" />
          <p class="text-sm text-muted">
            {{ error }}
          </p>
        </div>

        <div
          v-else
          class="py-20 text-center"
        >
          <UIcon name="i-lucide-inbox" class="mx-auto mb-2 size-8 text-muted" />
          <p class="text-sm text-muted">
            Tidak ada data sample collection untuk pasien ini.
          </p>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <UModal
    v-model:open="isRejectModalOpen"
    title="Tolak Sample"
  >
    <template #body>
      <div class="space-y-4">
        <UAlert
          color="error"
          variant="soft"
          icon="i-lucide-x-circle"
          title="Tolak sample ini?"
          :description="`Sample ${rejectTarget?.sampleType?.name || ''} akan ditandai REJECTED. Item pemeriksaan terkait akan tertahan sampai ada reschedule atau penggantian sample.`"
        />
        <div>
          <label class="mb-1 block text-sm font-medium text-highlighted">
            Alasan Penolakan <span class="text-error">*</span>
          </label>
          <UTextarea
            v-model="rejectReason"
            :rows="3"
            placeholder="Contoh: hemolisis, volume tidak mencukupi, pasien menolak..."
          />
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          color="neutral"
          variant="soft"
          :disabled="rejectSubmitting"
          @click="isRejectModalOpen = false"
        >
          Batal
        </UButton>
        <UButton
          color="error"
          icon="i-lucide-x"
          :loading="rejectSubmitting"
          @click="confirmReject"
        >
          Tolak Sample
        </UButton>
      </div>
    </template>
  </UModal>

  <UModal
    v-model:open="isRescheduleModalOpen"
    title="Reschedule Sample"
  >
    <template #body>
      <div class="space-y-4">
        <UAlert
          color="warning"
          variant="soft"
          icon="i-lucide-calendar-clock"
          title="Jadwalkan ulang sample ini?"
          :description="`Sample ${rescheduleTarget?.sampleType?.name || ''} akan dijadwalkan ulang. Pasien perlu datang kembali untuk pengambilan sample.`"
        />
        <div>
          <label class="mb-1 block text-sm font-medium text-highlighted">
            Tanggal Pengambilan Ulang <span class="text-error">*</span>
          </label>
          <UInput
            v-model="rescheduleDate"
            type="date"
            :min="new Date().toISOString().slice(0, 10)"
          />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-highlighted">
            Catatan
          </label>
          <UTextarea
            v-model="rescheduleNote"
            :rows="2"
            placeholder="Catatan tambahan (opsional)"
          />
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          color="neutral"
          variant="soft"
          :disabled="rescheduleSubmitting"
          @click="isRescheduleModalOpen = false"
        >
          Batal
        </UButton>
        <UButton
          color="warning"
          icon="i-lucide-calendar-clock"
          :loading="rescheduleSubmitting"
          @click="confirmReschedule"
        >
          Reschedule
        </UButton>
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
        <UButton color="neutral" variant="soft" :disabled="roomEnterActionLoading" @click="isEnterRoomModalOpen = false">
          Batal
        </UButton>
        <UButton color="primary" :loading="roomEnterActionLoading" @click="handleEnterRoom">
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
          :description="`Sesi aktif saat ini: ${roomSessionLabel}. Setelah keluar, kamu bisa pindah ke room lain.`"
        />
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="soft" :disabled="roomExitActionLoading" @click="isExitRoomModalOpen = false">
          Batal
        </UButton>
        <UButton color="warning" :loading="roomExitActionLoading" @click="handleExitRoom">
          Keluar Room
        </UButton>
      </div>
    </template>
  </UModal>
</template>
