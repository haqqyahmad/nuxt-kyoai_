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

const api = useApi()
const router = useRouter()
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

function navigateToDetail(row: SampleCollectionRow) {
  const queueEntryId = (row as { queueEntry?: { id?: string } }).queueEntry?.id
  if (queueEntryId) {
    router.push(`/rooms/sample-collection/${queueEntryId}`)
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
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
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
          :title="error === 'Masuk ke room Sample Collection terlebih dahulu.' ? 'Belum ada sesi aktif' : 'Error'"
          color="warning"
          variant="soft"
          class="mb-4"
          :description="error === 'Masuk ke room Sample Collection terlebih dahulu.' ? 'Silakan buka Room Queue, pilih room Sample Collection, lalu klik Enter Room.' : ''"
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
    </template>
  </UDashboardPanel>

  <UModal
    v-model:open="detailOpen"
    title="Detail Sample Collection"
    :ui="{ content: 'sm:max-w-2xl' }"
  >
    <template #body>
      <div v-if="detailRow" class="space-y-4">
        <div class="flex items-center gap-3 rounded-lg bg-muted p-3">
          <UIcon name="i-lucide-user" class="size-5 text-muted" />
          <div>
            <p class="font-medium text-highlighted">
              {{ formatPatient(detailRow.queueEntry) }}
            </p>
            <p class="text-xs text-muted">
              {{ detailRow.queueEntry?.registration?.patient?.PatientId || '-' }}
              · Reg. {{ detailRow.queueEntry?.registration?.id_reg || '-' }}
              · Queue {{ detailRow.queueEntry?.queueCode || '-' }}
            </p>
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-1">
            <p class="text-xs text-muted">
              Jenis Sample
            </p>
            <p class="font-medium text-highlighted">
              {{ detailRow.sampleType?.name || '-' }}
            </p>
          </div>
          <div class="space-y-1">
            <p class="text-xs text-muted">
              Status
            </p>
            <UBadge :color="statusColor(detailRow.status)" variant="soft">
              {{ statusLabel(detailRow.status) }}
            </UBadge>
          </div>
          <div class="space-y-1">
            <p class="text-xs text-muted">
              Barcode / Tabung
            </p>
            <p class="font-medium text-highlighted">
              {{ detailRow.barcode || '-' }} / {{ detailRow.tubeCount ?? 1 }}
            </p>
          </div>
          <div class="space-y-1">
            <p class="text-xs text-muted">
              Tanggal Exam
            </p>
            <p class="font-medium text-highlighted">
              {{ detailRow.queueEntry?.registration?.examDate || '-' }}
            </p>
          </div>
          <div class="space-y-1">
            <p class="text-xs text-muted">
              Diambil oleh
            </p>
            <p class="font-medium text-highlighted">
              {{ detailRow.collectedByUser?.name || '-' }}
            </p>
            <p class="text-xs text-muted">
              {{ formatDateTime(detailRow.collectedAt) }}
            </p>
          </div>
          <div class="space-y-1">
            <p class="text-xs text-muted">
              Diterima oleh
            </p>
            <p class="font-medium text-highlighted">
              {{ detailRow.receivedByUser?.name || '-' }}
            </p>
            <p class="text-xs text-muted">
              {{ formatDateTime(detailRow.receivedAt) }}
            </p>
          </div>
        </div>

        <div v-if="detailRow.items?.length" class="border-t border-default pt-4">
          <p class="mb-2 text-xs font-medium text-muted">
            Item Pemeriksaan
          </p>
          <div class="flex flex-wrap gap-1.5">
            <UBadge
              v-for="item in detailRow.items"
              :key="item.id"
              color="neutral"
              variant="soft"
            >
              {{ item.item?.name || item.item?.code || 'Item' }}
            </UBadge>
          </div>
        </div>

        <UAlert
          v-if="detailRow.status === 'REJECTED'"
          color="error"
          variant="soft"
          icon="i-lucide-x-circle"
          title="Alasan Ditolak"
          :description="detailRow.rejectReason || '-'"
        />
      </div>
    </template>
  </UModal>

  <RoomsSampleCollectionPickModal
    v-model:open="pickModalOpen"
    @collect="loadHistory"
  />
</template>
