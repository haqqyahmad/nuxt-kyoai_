<script setup lang="ts">
type RoomAssignment = {
  id: string
  assignedDate: string
  roomId: string | null
  roomTypeId: string | null
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

const today = new Date().toISOString().slice(0, 10)
const polling = ref(true)
let pollingInterval: ReturnType<typeof setInterval> | null = null

const {
  data: assignmentData,
  pending: assignmentPending,
  refresh: refreshAssignment
} = await useAsyncData<RoomAssignment | null>(
  'room-assignment-me',
  async () => {
    try {
      const res = await api.get('/medical/room-assignments/me', {
        params: { assignedDate: today }
      })

      return (res.data?.data ?? res.data ?? null) as RoomAssignment | null
    } catch {
      return null
    }
  },
  {
    default: () => null
  }
)

const assignment = computed(() => assignmentData.value ?? null)
const roomTypeId = computed(() => assignment.value?.roomTypeId ?? null)

const {
  data: queueData,
  pending: queuePending,
  refresh: refreshQueue
} = await useAsyncData<RoomQueueItem[]>(
  'room-queue-operational',
  async () => {
    if (!roomTypeId.value) return []

    const res = await api.get(`/medical/queue/room/${roomTypeId.value}`, {
      params: {
        queueDate: today,
        limit: 100,
        page: 1
      }
    })

    const payload = res.data?.data ?? res.data
    return Array.isArray(payload) ? payload : payload?.data ?? []
  },
  {
    default: () => [],
    watch: [roomTypeId]
  }
)

const queueItems = computed(() => queueData.value ?? [])

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
  return Promise.all([refreshAssignment(), refreshQueue()])
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
        subtitle="Visibility operasional mengikuti assignment aktif user"
      >
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
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
        <UCard>
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
            </div>

            <div class="grid grid-cols-2 gap-3 lg:min-w-80 lg:grid-cols-4">
              <div class="rounded-lg border border-default bg-muted/30 p-3">
                <p class="text-xs text-muted">Total</p>
                <p class="mt-1 text-2xl font-semibold text-highlighted">
                  {{ activeStats.total }}
                </p>
              </div>

              <div class="rounded-lg border border-default bg-muted/30 p-3">
                <p class="text-xs text-muted">Waiting</p>
                <p class="mt-1 text-2xl font-semibold text-highlighted">
                  {{ activeStats.waiting }}
                </p>
              </div>

              <div class="rounded-lg border border-default bg-muted/30 p-3">
                <p class="text-xs text-muted">Called</p>
                <p class="mt-1 text-2xl font-semibold text-highlighted">
                  {{ activeStats.called }}
                </p>
              </div>

              <div class="rounded-lg border border-default bg-muted/30 p-3">
                <p class="text-xs text-muted">In Progress</p>
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
          class="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-default p-8 text-center"
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
          class="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(360px,1fr))]"
        >
          <UCard
            v-for="item in queueItems"
            :key="item.id"
            class="overflow-hidden"
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
                <div class="rounded-lg bg-muted/40 p-3">
                  <p class="text-xs text-muted">No RM</p>
                  <p class="mt-1 font-medium text-highlighted">
                    {{ item.queueEntry?.registration?.patient?.PatientId || '-' }}
                  </p>
                </div>

                <div class="rounded-lg bg-muted/40 p-3">
                  <p class="text-xs text-muted">Jenis antrian</p>
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
    </template>
  </UDashboardPanel>
</template>
