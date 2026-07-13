<script setup lang="ts">
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
    staffCapacity?: number | null
  } | null
  roomType?: {
    id: string
    code: string
    name: string
  } | null
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
  queueEntry?: {
    id: string
    queueCode: string
    queueNumber: number
    type: string
    checkinAt?: string | null
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
        department?: {
          id: string
          name: string
        } | null
        group?: {
          id: string
          name: string
        } | null
      } | null
    } | null
  }>
}

const api = useApi()
const toast = useToast()

const today = new Date().toISOString().slice(0, 10)
const polling = ref(true)
let pollingInterval: ReturnType<typeof setInterval> | null = null
const roomActionLoading = ref(false)
const isExitOpen = ref(false)
const exitReason = ref('')

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    return response?.data?.message || fallback
  }

  return fallback
}

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
  session: roomSession,
  pending: sessionPending,
  refresh: refreshSession,
  enterRoomSession,
  exitRoomSession
} = await useRoomSession()

const {
  data: queueData,
  pending: queuePending,
  refresh: refreshQueue
} = await useAsyncData<RoomQueueItem[]>(
  'room-queue-operational',
  async () => {
    if (!roomTypeId.value) return []

    const res = await api.get(`/medical/exams/queue/room/${roomTypeId.value}`, {
      params: {
        queueDate: today,
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

const queueItems = computed(() => queueData.value ?? [])
const activeSession = computed(() => {
  if (!roomSession.value?.id || roomSession.value.endedAt) return null
  return roomSession.value as RoomSession
})
const activeSessionRoomLabel = computed(() => {
  if (!activeSession.value?.room) return '-'
  return `${activeSession.value.room.code} - ${activeSession.value.room.name}`
})
const activeSessionStartedAt = computed(() => {
  if (!activeSession.value?.startedAt) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(activeSession.value.startedAt))
})
const roomStaffCapacity = computed(() => assignment.value?.room?.staffCapacity ?? activeSession.value?.room?.staffCapacity ?? null)
const hasActiveSession = computed(() => activeSession.value !== null)
const assignmentSourceLabel = computed(() => {
  if (assignment.value?.assignmentSource === 'SELF') return 'Self Assignment'
  if (assignment.value?.assignmentSource === 'PIC') return 'PIC Assignment'
  return '-'
})
const roomDisplayLabel = computed(() => {
  if (!assignment.value?.room) return 'Belum ada room'
  return `${assignment.value.room.code} - ${assignment.value.room.name}`
})
const canShowEnterRoom = computed(() =>
  Boolean(assignment.value?.roomId)
  && !hasActiveSession.value
  && assignment.value?.assignmentSource !== 'SELF'
)
const needsSessionSync = computed(() =>
  Boolean(assignment.value?.roomId)
  && !hasActiveSession.value
  && assignment.value?.assignmentSource === 'SELF'
)
const sessionStatusLabel = computed(() => {
  if (hasActiveSession.value) return 'Sesi aktif'
  if (needsSessionSync.value) return 'Perlu sinkronisasi'
  return 'Belum aktif'
})

const activeStats = computed(() => {
  const total = queueItems.value.length
  const waiting = queueItems.value.filter(item => item.status === 'WAITING').length
  const called = queueItems.value.filter(item => item.stageItems?.some(stage => stage.status === 'CALLED')).length
  const inProgress = queueItems.value.filter(item => item.stageItems?.some(stage => stage.status === 'IN_PROGRESS')).length

  return {
    total,
    waiting,
    called,
    inProgress
  }
})

function getRoomSessionColor() {
  return hasActiveSession.value ? 'success' : 'warning'
}

function getRoomSessionLabel() {
  if (hasActiveSession.value) return 'Aktif'
  if (needsSessionSync.value) return 'Perlu sinkronisasi'
  return 'Belum aktif'
}

function formatPatientName(patient?: PatientName | null) {
  if (!patient) return '-'

  return [patient.firstName, patient.middleName, patient.lastName]
    .filter(Boolean)
    .join(' ')
}

function getStageBadgeColor(status: string) {
  if (status === 'DONE') return 'success'
  if (status === 'CALLED') return 'info'
  if (status === 'IN_PROGRESS') return 'warning'
  if (status === 'SKIPPED' || status === 'RESCHEDULED') return 'neutral'
  return 'neutral'
}

function getItemStatusLabel(status: string) {
  if (status === 'DONE') return 'Selesai'
  if (status === 'CALLED') return 'Dipanggil'
  if (status === 'IN_PROGRESS') return 'Proses'
  if (status === 'SKIPPED') return 'Skip'
  if (status === 'RESCHEDULED') return 'Reschedule'
  return 'Menunggu'
}

function refreshAll() {
  return Promise.all([refreshAssignment(), refreshQueue(), refreshSession()])
}

async function handleEnterRoom() {
  if (roomActionLoading.value) return

  if (!assignment.value?.roomId) {
    toast.add({
      title: 'Belum bisa masuk room',
      description: 'Assignment room hari ini belum memiliki room yang dituju.',
      color: 'warning'
    })
    return
  }

  roomActionLoading.value = true

  try {
    await enterRoomSession({ roomId: assignment.value.roomId })
    await refreshAll()

    toast.add({
      title: 'Berhasil',
      description: 'User berhasil masuk room aktif.',
      color: 'success'
    })
  } catch (error: unknown) {
    toast.add({
      title: 'Gagal masuk room',
      description: getErrorMessage(error, 'Terjadi kesalahan saat masuk room.'),
      color: 'error'
    })
  } finally {
    roomActionLoading.value = false
  }
}

async function handleSyncRoom() {
  if (roomActionLoading.value) return

  if (!assignment.value?.roomId) {
    toast.add({
      title: 'Belum bisa sinkronisasi',
      description: 'Assignment room hari ini belum memiliki room yang dituju.',
      color: 'warning'
    })
    return
  }

  roomActionLoading.value = true
  try {
    await refreshSession({ throwOnError: true })

    if (!roomSession.value?.id) {
      await enterRoomSession({ roomId: assignment.value.roomId })
    }

    await Promise.all([
      refreshAssignment(),
      refreshQueue(),
      refreshSession({ throwOnError: true })
    ])

    toast.add({
      title: 'Berhasil',
      description: 'Sesi room berhasil dipulihkan dan status diperbarui.',
      color: 'success'
    })
  } catch (error: unknown) {
    toast.add({
      title: 'Gagal',
      description: getErrorMessage(error, 'Terjadi kesalahan saat memperbarui status room.'),
      color: 'error'
    })
  } finally {
    roomActionLoading.value = false
  }
}

function openExitRoomModal() {
  exitReason.value = ''
  isExitOpen.value = true
}

async function handleExitRoom() {
  if (roomActionLoading.value || !activeSession.value) return

  roomActionLoading.value = true
  const previousSession = roomSession.value
  const previousModalState = isExitOpen.value
  const previousReason = exitReason.value

  try {
    roomSession.value = null
    isExitOpen.value = false
    await exitRoomSession({
      exitReason: exitReason.value.trim() || undefined
    })
    await refreshAll()

    exitReason.value = ''

    toast.add({
      title: 'Berhasil',
      description: 'User berhasil keluar dari room aktif.',
      color: 'success'
    })
  } catch (error: unknown) {
    roomSession.value = previousSession ?? null
    isExitOpen.value = previousModalState
    exitReason.value = previousReason
    toast.add({
      title: 'Gagal keluar room',
      description: getErrorMessage(error, 'Terjadi kesalahan saat keluar room.'),
      color: 'error'
    })
  } finally {
    roomActionLoading.value = false
  }
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval)
    pollingInterval = null
  }
}

function startPolling() {
  stopPolling()

  pollingInterval = setInterval(() => {
    if (!document.hidden) {
      refreshAll()
    }
  }, 5000)
}

watch(
  polling,
  (enabled) => {
    if (!enabled) {
      stopPolling()
      return
    }

    startPolling()
  },
  { immediate: true }
)

onBeforeUnmount(stopPolling)
</script>

<template>
  <UDashboardPanel id="room-queue">
    <template #header>
      <UDashboardNavbar
        title="Room Queue"
        subtitle="Queue operasional mengikuti assignment dan session room aktif"
      >
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UBadge
            :color="getRoomSessionColor()"
            variant="subtle"
            :label="getRoomSessionLabel()"
          />

          <USwitch
            v-model="polling"
            label="Realtime"
          />

          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="soft"
            :loading="assignmentPending || queuePending"
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
          <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p class="text-sm font-medium text-muted">
                Assignment aktif hari ini
              </p>

              <h2 class="mt-1 text-xl font-semibold text-highlighted">
                {{ assignment?.roomType?.name || 'Belum ada assignment room' }}
              </h2>

              <p class="mt-1 text-sm text-muted">
                {{ assignment?.room?.code ? `${assignment.room.code} - ` : '' }}
                {{ assignment?.room?.name || 'System akan menampilkan queue sesuai roomType assignment.' }}
              </p>

              <div class="mt-4 flex flex-wrap items-center gap-2">
                <UBadge
                  :color="getRoomSessionColor()"
                  variant="subtle"
                  :label="sessionStatusLabel"
                />

                <UBadge
                  v-if="roomStaffCapacity !== null"
                  color="neutral"
                  variant="outline"
                  :label="`Kapasitas petugas: ${roomStaffCapacity}`"
                />

                <UBadge
                  color="neutral"
                  variant="soft"
                  :label="assignmentSourceLabel"
                />
              </div>

              <p class="text-sm text-muted">
                {{ roomDisplayLabel }}
              </p>

              <p class="text-xs text-muted">
                <span v-if="hasActiveSession">
                  Room aktif:
                  <strong class="text-highlighted">{{ activeSessionRoomLabel }}</strong>
                  - Masuk sejak {{ activeSessionStartedAt }}
                </span>

                <span v-else-if="needsSessionSync">
                  Self assignment sudah dibuat, tetapi sesi room belum aktif. Tekan pulihkan sesi room.
                </span>

                <span v-else>
                  Assignment aktif sudah siap. Queue operasional akan mengikuti room yang dipilih.
                </span>
              </p>

              <div class="mt-4 flex flex-wrap gap-2">
                <UButton
                  v-if="canShowEnterRoom"
                  icon="i-lucide-log-in"
                  :loading="roomActionLoading || sessionPending"
                  @click="handleEnterRoom"
                >
                  Masuk Room
                </UButton>

                <UButton
                  v-else-if="needsSessionSync"
                  color="warning"
                  variant="soft"
                  icon="i-lucide-refresh-ccw"
                  :loading="roomActionLoading || sessionPending"
                  @click="handleSyncRoom"
                >
                  Pulihkan Sesi Room
                </UButton>

                <UButton
                  v-else-if="hasActiveSession"
                  color="error"
                  variant="soft"
                  icon="i-lucide-log-out"
                  :loading="roomActionLoading || sessionPending"
                  @click="openExitRoomModal"
                >
                  Keluar Room
                </UButton>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3 lg:min-w-80 lg:grid-cols-4">
              <div class="rounded-lg border border-default bg-muted/30 p-3">
                <p class="text-xs text-muted">
                  Total
                </p>
                <p class="mt-1 text-2xl font-semibold text-highlighted">
                  {{ activeStats.total }}
                </p>
              </div>

              <div class="rounded-lg border border-default bg-muted/30 p-3">
                <p class="text-xs text-muted">
                  Waiting
                </p>
                <p class="mt-1 text-2xl font-semibold text-highlighted">
                  {{ activeStats.waiting }}
                </p>
              </div>

              <div class="rounded-lg border border-default bg-muted/30 p-3">
                <p class="text-xs text-muted">
                  Called
                </p>
                <p class="mt-1 text-2xl font-semibold text-highlighted">
                  {{ activeStats.called }}
                </p>
              </div>

              <div class="rounded-lg border border-default bg-muted/30 p-3">
                <p class="text-xs text-muted">
                  In Progress
                </p>
                <p class="mt-1 text-2xl font-semibold text-highlighted">
                  {{ activeStats.inProgress }}
                </p>
              </div>
            </div>
          </div>
        </UCard>

        <UAlert
          v-if="!assignmentPending && !assignment"
          color="warning"
          title="Belum ada assignment aktif"
          description="User ini belum di-assign ke room pada tanggal hari ini. Queue operasional tidak akan tampil sampai assignment tersedia."
        />

        <div
          v-if="queuePending"
          class="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(320px,1fr))]"
        >
          <USkeleton
            v-for="item in 6"
            :key="item"
            class="h-56 rounded-xl"
          />
        </div>

        <div
          v-else-if="!assignment || !queueItems.length"
          class="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-default bg-muted/20 p-8 text-center"
        >
          <UIcon
            name="i-lucide-clipboard-list"
            class="mb-3 size-10 text-muted"
          />

          <h3 class="text-base font-semibold text-highlighted">
            Tidak ada queue yang bisa ditampilkan
          </h3>

          <p class="mt-1 max-w-lg text-sm text-muted">
            Pastikan user sudah memiliki assignment aktif dan pasien sudah check-in ke roomType yang sama.
          </p>
        </div>

        <div
          v-else
          class="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(360px,1fr))]"
        >
          <UCard
            v-for="item in queueItems"
            :key="item.id"
            class="overflow-hidden border border-default/80 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <template #header>
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-xs text-muted">
                    {{ item.queueEntry?.queueCode || '-' }} - Tier {{ item.tierOrder }}
                  </p>

                  <h3 class="mt-1 text-base font-semibold text-highlighted">
                    {{ formatPatientName(item.queueEntry?.registration?.patient) }}
                  </h3>
                </div>

                <UBadge
                  :label="getItemStatusLabel(item.status)"
                  :color="getStageBadgeColor(item.status)"
                  variant="subtle"
                />
              </div>
            </template>

            <div class="space-y-4">
              <div class="grid grid-cols-2 gap-3 text-sm">
                <div class="rounded-xl bg-muted/40 p-3">
                  <p class="text-xs text-muted">
                    No RM
                  </p>
                  <p class="mt-1 font-medium text-highlighted">
                    {{ item.queueEntry?.registration?.patient?.PatientId || '-' }}
                  </p>
                </div>

                <div class="rounded-xl bg-muted/40 p-3">
                  <p class="text-xs text-muted">
                    Jenis antrian
                  </p>
                  <p class="mt-1 font-medium text-highlighted">
                    {{ item.queueEntry?.type || '-' }}
                  </p>
                </div>
              </div>

              <div>
                <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  Item yang harus dikerjakan
                </p>

                <div class="space-y-2">
                  <div
                    v-for="examItem in item.examItems || []"
                    :key="examItem.id"
                    class="flex items-center justify-between gap-3 rounded-lg border border-default px-3 py-2"
                  >
                    <div class="min-w-0">
                      <p class="truncate text-sm font-medium text-highlighted">
                        {{ examItem.trxExamItem?.item?.name || '-' }}
                      </p>

                      <p class="truncate text-xs text-muted">
                        {{ examItem.trxExamItem?.item?.code || '-' }}
                        <span v-if="examItem.trxExamItem?.item?.group?.name">
                          - {{ examItem.trxExamItem.item.group.name }}
                        </span>
                      </p>
                    </div>

                    <UBadge
                      :label="getItemStatusLabel(examItem.status)"
                      :color="getStageBadgeColor(examItem.status)"
                      variant="soft"
                    />
                  </div>
                </div>
              </div>

              <div class="flex flex-wrap gap-2">
                <UBadge
                  v-for="stage in item.stageItems || []"
                  :key="stage.id"
                  :label="`Stage ${stage.stageOrder}: ${getItemStatusLabel(stage.status)}`"
                  :color="getStageBadgeColor(stage.status)"
                  variant="outline"
                />
              </div>
            </div>
          </UCard>
        </div>
      </div>

      <UModal v-model:open="isExitOpen">
        <template #content>
          <UCard>
            <template #header>
              <div class="flex items-center justify-between gap-3">
                <div>
                  <h3 class="text-lg font-semibold">
                    Keluar Room
                  </h3>
                  <p class="text-sm text-muted">
                    Tambahkan alasan jika diperlukan sebelum sesi ditutup.
                  </p>
                </div>

                <UButton
                  icon="i-lucide-x"
                  color="neutral"
                  variant="ghost"
                  @click="isExitOpen = false"
                />
              </div>
            </template>

            <div class="space-y-4">
              <UAlert
                color="warning"
                title="Pastikan room sudah selesai digunakan"
                description="Setelah keluar room, user tidak bisa melakukan action stage sampai masuk room lagi."
              />

              <UFormField
                label="Alasan keluar"
                help="Opsional, misalnya pindah room atau selesai shift."
              >
                <UTextarea
                  v-model="exitReason"
                  :rows="3"
                  placeholder="Tuliskan alasan keluar room..."
                />
              </UFormField>

              <div class="flex justify-end gap-2">
                <UButton
                  color="neutral"
                  variant="soft"
                  @click="isExitOpen = false"
                >
                  Batal
                </UButton>

                <UButton
                  color="error"
                  :loading="roomActionLoading"
                  @click="handleExitRoom"
                >
                  Simpan & Keluar
                </UButton>
              </div>
            </div>
          </UCard>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
