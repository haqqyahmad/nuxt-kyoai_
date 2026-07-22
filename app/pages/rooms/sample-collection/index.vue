<script setup lang="ts">
import SampleCollectionPickModal from '~/components/rooms/SampleCollectionPickModal.vue'
import SampleCollectionHistoryTable from '~/components/rooms/SampleCollectionHistoryTable.vue'

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

const api = useApi()
const { session: roomSession } = await useRoomSession()

const rows = ref<SampleCollectionRow[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const detailOpen = ref(false)
const detailRow = ref<SampleCollectionRow | null>(null)
const pickModalOpen = ref(false)

const statusFilter = ref('ALL')
const today = new Date().toISOString().slice(0, 10)
const examDateFrom = ref(today)
const examDateTo = ref(today)
const searchInput = ref('')
const search = ref('')
const currentPage = ref(1)
const pageSize = ref(20)
const totalRows = ref(0)
let searchTimer: ReturnType<typeof setTimeout> | null = null
let loadRequestId = 0

const activeRoomSession = computed(() => {
  if (!roomSession.value?.id || roomSession.value.endedAt) return null
  return roomSession.value
})

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
    error.value = 'Masuk ke room Sample Collection terlebih dahulu.'
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

function formatPatient(queueEntry?: SampleCollectionRow['queueEntry']) {
  const patient = queueEntry?.registration?.patient
  if (!patient) return '-'
  return [patient.firstName, patient.middleName, patient.lastName]
    .filter(Boolean)
    .join(' ') || '-'
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
  detailRow.value = row
  detailOpen.value = true
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
      <UDashboardNavbar title="History Sample Collection">
        <template #right>
          <UBadge
            v-if="activeRoomSession"
            color="success"
            variant="soft"
          >
            {{ activeRoomSession.room?.name || activeRoomSession.roomType?.name || 'Room aktif' }}
          </UBadge>
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
          >
            Refresh
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UCard class="w-full max-w-none border border-default/80 shadow-sm">
        <template #header>
          <div>
            <h3 class="font-semibold text-highlighted">
              History Sample Collection
            </h3>
            <p class="text-sm text-muted">
              Riwayat sample dari proses pengambilan sampai diterima LAB.
            </p>
          </div>
        </template>

        <div class="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <UFormField label="Cari">
            <UInput
              v-model="searchInput"
              icon="i-lucide-search"
              placeholder="Pasien, RM, queue, barcode..."
              class="w-full"
            />
          </UFormField>
          <UFormField label="Status">
            <USelect
              v-model="statusFilter"
              :items="statusOptions"
              value-key="value"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Tanggal Exam Dari">
            <UInput
              v-model="examDateFrom"
              type="date"
              :max="examDateTo || undefined"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Tanggal Exam Sampai">
            <UInput
              v-model="examDateTo"
              type="date"
              :min="examDateFrom || undefined"
              class="w-full"
            />
          </UFormField>
        </div>

        <UAlert
          v-if="error"
          :title="error === 'Masuk ke room Sample Collection terlebih dahulu.' ? 'Belum ada sesi aktif' : 'Error'"
          color="warning"
          variant="soft"
          class="mb-4"
          :description="error === 'Masuk ke room Sample Collection terlebih dahulu.' ? 'Silakan buka /rooms/queue, pilih room Sample Collection, lalu klik Enter Room.' : ''"
          icon="i-lucide-alert-triangle"
        />

        <div class="max-h-[calc(100vh-22rem)] min-h-80 w-full overflow-y-auto overflow-x-hidden rounded-lg border border-default">
          <SampleCollectionHistoryTable
            :data="rows"
            :loading="loading"
            @detail="openDetail"
          />
        </div>

        <div class="mt-4 flex flex-col gap-3 border-t border-default pt-4 sm:flex-row sm:items-center sm:justify-between">
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
    </template>
  </UDashboardPanel>

  <UModal
    v-model:open="detailOpen"
    title="Detail History Sample Collection"
    :ui="{ content: 'sm:max-w-3xl' }"
  >
    <template #body>
      <div v-if="detailRow" class="space-y-4">
        <UAlert color="info" variant="soft" title="Detail pasien" :description="`${formatPatient(detailRow.queueEntry)} · ${detailRow.queueEntry?.registration?.patient?.PatientId || '-'} · Queue ${detailRow.queueEntry?.queueCode || '-'}`" />
        <div class="grid gap-3 rounded-lg border border-default p-4 sm:grid-cols-2">
          <div><p class="text-xs text-muted">Jenis Sample</p><p class="font-medium text-highlighted">{{ detailRow.sampleType?.name || '-' }}</p></div>
          <div><p class="text-xs text-muted">Status</p><UBadge :color="statusColor(detailRow.status)" variant="soft">{{ statusLabel(detailRow.status) }}</UBadge></div>
          <div><p class="text-xs text-muted">Barcode / Tabung</p><p class="font-medium text-highlighted">{{ detailRow.barcode || '-' }} / {{ detailRow.tubeCount ?? 1 }}</p></div>
          <div><p class="text-xs text-muted">Tanggal Exam</p><p class="font-medium text-highlighted">{{ detailRow.queueEntry?.registration?.examDate || '-' }}</p></div>
          <div><p class="text-xs text-muted">Collection</p><p class="font-medium text-highlighted">{{ detailRow.collectedByUser?.name || '-' }}</p><p class="text-xs text-muted">{{ formatDateTime(detailRow.collectedAt) }}</p></div>
          <div><p class="text-xs text-muted">Receive</p><p class="font-medium text-highlighted">{{ detailRow.receivedByUser?.name || '-' }}</p><p class="text-xs text-muted">{{ formatDateTime(detailRow.receivedAt) }}</p></div>
        </div>
        <div v-if="detailRow.items?.length"><p class="mb-2 text-sm font-semibold">Item pemeriksaan</p><div class="flex flex-wrap gap-2"><UBadge v-for="item in detailRow.items" :key="item.id" color="neutral" variant="soft">{{ item.item?.name || item.item?.code || 'Item' }}</UBadge></div></div>
        <UAlert v-if="detailRow.status === 'REJECTED'" color="error" variant="soft" title="Alasan ditolak" :description="detailRow.rejectReason || '-'" />
      </div>
    </template>
  </UModal>

  <SampleCollectionPickModal
    v-model:open="pickModalOpen"
    @collect="loadHistory"
  />
</template>
