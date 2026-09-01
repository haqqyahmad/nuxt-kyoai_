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
  collectedByUser?: SampleUser | null
  receivedByUser?: SampleUser | null
  sampleType?: { id: string, name?: string | null } | null
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

type RoomAssignment = {
  id: string
  assignedDate: string
  roomId: string | null
  roomTypeId: string | null
  room?: { id: string, code: string, name: string } | null
  roomType?: { id: string, code: string, name: string } | null
}

const api = useApi()
const router = useRouter()
const toast = useToast()
const {
  session: roomSession,
  pending: roomSessionPending,
  refresh: refreshRoomSession,
  enterRoomSession,
  exitRoomSession
} = await useRoomSession()

const today = new Date().toISOString().slice(0, 10)
const { data: assignmentData } = await useAsyncData<RoomAssignment | null>(
  'sample-collection-assignment-index',
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

const isEnterRoomModalOpen = ref(false)
const isExitRoomModalOpen = ref(false)
const roomEnterActionLoading = ref(false)
const roomExitActionLoading = ref(false)

const rows = ref<SampleCollectionRow[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const detailOpen = ref(false)
const detailSamples = ref<SampleCollectionRow[]>([])
const detailPatient = ref<{ name: string, patientId: string, idReg: string, queueCode: string } | null>(null)
const pickModalOpen = ref(false)

const statusFilter = ref('ALL')
const examDateFrom = ref(today)
const examDateTo = ref(today)
const searchInput = ref('')
const search = ref('')
const currentPage = ref(1)
const pageSize = ref(20)
const totalRows = ref(0)
let searchTimer: ReturnType<typeof setTimeout> | null = null
let loadRequestId = 0

const statusOptions = [
  { label: 'Semua Status', value: 'ALL' },
  { label: 'Belum Diambil', value: 'PENDING' },
  { label: 'Sudah Diambil', value: 'COLLECTED' },
  { label: 'Diterima Lab', value: 'RECEIVED' },
  { label: 'Ditolak', value: 'REJECTED' },
  { label: 'Dijadwalkan Ulang', value: 'RESCHEDULED' }
]

const pageSizeOptions = [
  { label: '10 data', value: 10 },
  { label: '20 data', value: 20 },
  { label: '50 data', value: 50 },
  { label: '100 data', value: 100 }
]

function extractPaginatedPayload(value: unknown) {
  const body = value && typeof value === 'object'
    ? value as Record<string, unknown>
    : {}
  const firstData = body.data
  const nested = firstData && typeof firstData === 'object' && !Array.isArray(firstData)
    ? firstData as Record<string, unknown>
    : null
  const data = Array.isArray(firstData)
    ? firstData
    : Array.isArray(nested?.data)
      ? nested.data
      : Array.isArray(value)
        ? value
        : []
  const meta = body.meta && typeof body.meta === 'object'
    ? body.meta as Record<string, unknown>
    : nested?.meta && typeof nested.meta === 'object'
      ? nested.meta as Record<string, unknown>
      : {}

  return { data, meta }
}

async function loadHistory() {
  if (!activeRoomSession.value) {
    rows.value = []
    totalRows.value = 0
    error.value = 'Belum ada sesi room aktif.'
    return
  }

  const requestId = ++loadRequestId
  loading.value = true
  error.value = null

  try {
    const params: Record<string, unknown> = {
      page: currentPage.value,
      limit: pageSize.value,
      _: Date.now()
    }
    if (statusFilter.value !== 'ALL') params.status = statusFilter.value
    if (examDateFrom.value) params.examDateFrom = examDateFrom.value
    if (examDateTo.value) params.examDateTo = examDateTo.value
    if (search.value) params.search = search.value

    const response = await api.get(
      '/medical/exams/queue/samples/collection-history',
      { params }
    )
    const { data, meta } = extractPaginatedPayload(response.data)

    if (requestId === loadRequestId) {
      rows.value = data as SampleCollectionRow[]
      totalRows.value = Number(meta.total ?? data.length)
    }
  } catch (value: unknown) {
    if (requestId === loadRequestId) {
      const response = typeof value === 'object' && value && 'response' in value
        ? (value as { response?: { data?: { message?: string } } }).response
        : undefined
      error.value = response?.data?.message || 'Gagal memuat history sample collection.'
      rows.value = []
      totalRows.value = 0
    }
  } finally {
    if (requestId === loadRequestId) loading.value = false
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date)
}

function statusLabel(status: string) {
  if (status === 'PENDING') return 'Belum Diambil'
  if (status === 'COLLECTED') return 'Sudah Diambil'
  if (status === 'RECEIVED') return 'Diterima Lab'
  if (status === 'REJECTED') return 'Ditolak'
  if (status === 'RESCHEDULED') return 'Dijadwalkan Ulang'
  return status
}

function statusColor(status: string): BadgeColor {
  if (status === 'RECEIVED') return 'success'
  if (status === 'COLLECTED') return 'info'
  if (status === 'REJECTED') return 'error'
  if (status === 'RESCHEDULED') return 'warning'
  return 'neutral'
}

function openDetail(row: SampleCollectionRow) {
  const p = row.queueEntry?.registration?.patient
  detailPatient.value = {
    name: [p?.firstName, p?.middleName, p?.lastName].filter(Boolean).join(' ') || '-',
    patientId: p?.PatientId || '-',
    idReg: row.queueEntry?.registration?.id_reg || '-',
    queueCode: row.queueEntry?.queueCode || '-'
  }
  detailSamples.value = [row]
  detailOpen.value = true
}

function navigateToDetail(row: SampleCollectionRow) {
  const queueEntryId = (row as { queueEntry?: { id?: string } }).queueEntry?.id
  if (queueEntryId) {
    router.push(`/rooms/sample-collection/${queueEntryId}`)
  }
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
  } catch {
    toast.add({
      title: 'Gagal masuk room',
      description: 'Terjadi kesalahan saat masuk ke room aktif.',
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
  } catch {
    toast.add({
      title: 'Gagal keluar room',
      description: 'Terjadi kesalahan saat keluar dari room aktif.',
      color: 'error'
    })
  } finally {
    roomExitActionLoading.value = false
  }
}

watch([statusFilter, examDateFrom, examDateTo], () => {
  if (currentPage.value !== 1) currentPage.value = 1
  else void loadHistory()
})

watch(currentPage, () => {
  void loadHistory()
})

watch(pageSize, () => {
  if (currentPage.value !== 1) currentPage.value = 1
  else void loadHistory()
})

watch(searchInput, (value) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    search.value = value.trim()
    if (currentPage.value !== 1) currentPage.value = 1
    else void loadHistory()
  }, 350)
})

watch(
  () => activeRoomSession.value?.id,
  () => {
    void loadHistory()
  }
)

onMounted(() => {
  void loadHistory()
})

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
})
</script>

<template>
  <UDashboardPanel id="sample-collection">
    <template #header>
      <UDashboardNavbar title="Sample Collection">
        <template #right>
          <UBadge
            v-if="activeRoomSession"
            color="success"
            variant="soft"
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
            icon="i-lucide-user-plus"
            color="primary"
            variant="soft"
            :disabled="!activeRoomSession"
            @click="pickModalOpen = true"
          >
            Ambil Pasien
          </UButton>
          <UButton
            icon="i-lucide-refresh-cw"
            variant="soft"
            color="neutral"
            :loading="loading"
            @click="loadHistory"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="w-full space-y-4">
        <UAlert
          v-if="assignment && !activeRoomSession"
          color="info"
          variant="soft"
          icon="i-lucide-info"
          title="Assignment aktif, tetapi belum masuk room"
          :description="`Anda sudah di-assign ke ${assignment.room?.name || assignment.roomType?.name || 'ruangan'}. Klik 'Masuk Room' di kanan atas untuk memulai sesi, lalu tombol 'Ambil Pasien' akan aktif.`"
        />

        <UCard>
        <div class="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <UFormField label="Cari">
            <UInput
              v-model="searchInput"
              icon="i-lucide-search"
              placeholder="Pasien, RM, queue, barcode..."
            />
          </UFormField>
          <UFormField label="Status">
            <USelect
              v-model="statusFilter"
              :items="statusOptions"
              value-key="value"
            />
          </UFormField>
          <UFormField label="Tanggal Exam Dari">
            <UInput
              v-model="examDateFrom"
              type="date"
              :max="examDateTo || undefined"
            />
          </UFormField>
          <UFormField label="Tanggal Exam Sampai">
            <UInput
              v-model="examDateTo"
              type="date"
              :min="examDateFrom || undefined"
            />
          </UFormField>
        </div>

        <UAlert
          v-if="error"
          color="warning"
          variant="soft"
          class="mb-4"
          :title="error === 'Belum ada sesi room aktif.' ? 'Belum masuk room' : 'Error'"
          :description="error === 'Belum ada sesi room aktif.' ? 'Klik tombol \'Masuk Room\' di kanan atas navbar untuk memulai sesi, lalu data sample collection akan dimuat.' : error"
          icon="i-lucide-alert-triangle"
        />

        <div class="max-h-[calc(100vh-24rem)] min-h-[20rem] overflow-auto rounded-lg border border-default">
          <RoomsSampleCollectionHistoryTable
            :data="rows"
            :loading="loading"
            @detail="(row: any) => openDetail(row)"
            @navigate="(row: any) => navigateToDetail(row)"
          />
        </div>

        <div class="mt-4 flex items-center justify-between border-t border-default pt-4">
          <p class="text-sm text-muted">
            Menampilkan {{ rows.length }} dari {{ totalRows }} data
          </p>
          <div class="flex items-center gap-2">
            <USelect
              v-model="pageSize"
              :items="pageSizeOptions"
              value-key="value"
              class="w-32"
            />
            <UPagination
              v-model:page="currentPage"
              :items-per-page="pageSize"
              :total="totalRows"
            />
          </div>
        </div>
      </UCard>
      </div>
    </template>
  </UDashboardPanel>

  <UModal
    v-model:open="detailOpen"
    title="Detail Sample Collection"
    :ui="{ content: 'sm:max-w-2xl' }"
  >
    <template #body>
      <div v-if="detailPatient" class="space-y-4">
        <div class="flex items-center gap-3 rounded-lg bg-muted p-3">
          <UIcon name="i-lucide-user" class="size-5 text-muted" />
          <div>
            <p class="font-medium text-highlighted">
              {{ detailPatient.name }}
            </p>
            <p class="text-xs text-muted">
              {{ detailPatient.patientId }}
              · Reg. {{ detailPatient.idReg }}
              · Queue {{ detailPatient.queueCode }}
            </p>
          </div>
        </div>

        <div class="divide-y divide-default/60">
          <div
            v-for="s in detailSamples"
            :key="s.id"
            class="py-4 first:pt-0 last:pb-0"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="space-y-3">
                <div class="flex items-center gap-2">
                  <p class="text-base font-semibold text-highlighted">
                    {{ s.sampleType?.name || 'Sample' }}
                  </p>
                  <UBadge :color="statusColor(s.status)" variant="soft" size="sm">
                    {{ statusLabel(s.status) }}
                  </UBadge>
                </div>

                <div class="grid gap-x-8 gap-y-2 sm:grid-cols-2">
                  <div>
                    <p class="text-sm text-muted">
                      Tanggal Exam
                    </p>
                    <p class="text-sm font-medium text-highlighted">
                      {{ s.queueEntry?.registration?.examDate || '-' }}
                    </p>
                  </div>
                  <div>
                    <p class="text-sm text-muted">
                      Barcode / Tabung
                    </p>
                    <p class="text-sm font-medium text-highlighted">
                      {{ s.barcode || '-' }} / {{ s.tubeCount ?? 1 }}
                    </p>
                  </div>
                  <div>
                    <p class="text-sm text-muted">
                      Diambil oleh
                    </p>
                    <p class="text-sm font-medium text-highlighted">
                      {{ s.collectedByUser?.name || '-' }}
                    </p>
                    <p v-if="s.collectedAt" class="text-sm text-muted">
                      {{ formatDateTime(s.collectedAt) }}
                    </p>
                  </div>
                  <div>
                    <p class="text-sm text-muted">
                      Diterima oleh
                    </p>
                    <p class="text-sm font-medium text-highlighted">
                      {{ s.receivedByUser?.name || '-' }}
                    </p>
                    <p v-if="s.receivedAt" class="text-sm text-muted">
                      {{ formatDateTime(s.receivedAt) }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <UAlert
              v-if="s.status === 'REJECTED'"
              color="error"
              variant="soft"
              icon="i-lucide-x-circle"
              title="Alasan Ditolak"
              :description="s.rejectReason || '-'"
              class="mt-2"
            />

            <div v-if="s.items?.length" class="mt-3 flex flex-wrap gap-1.5">
              <UBadge
                v-for="item in s.items"
                :key="item.id"
                color="neutral"
                variant="subtle"
                size="sm"
              >
                {{ item.item?.name || item.item?.code || 'Item' }}
              </UBadge>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UModal>

   <RoomsSampleCollectionPickModal
    v-model:open="pickModalOpen"
    @collect="loadHistory"
  />

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
          :description="`Sesi aktif saat ini: ${roomSessionLabel}. Setelah keluar, kamu bisa pindah ke room lain.`"
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
