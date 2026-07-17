<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoomSession } from '~/composables/useRoomSession'
import SampleCollectionPickModal from '~/components/rooms/SampleCollectionPickModal.vue'

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
      patient?: {
        id: number
        PatientId?: string | null
        firstName?: string | null
        middleName?: string | null
        lastName?: string | null
      } | null
    } | null
  } | null
  items?: Array<{ id: string, item?: { id: string, code?: string | null, name?: string | null } | null }>
}

const api = useApi()

const { session: roomSession, refresh: refreshRoomSession } = await useRoomSession()
const roomTypeId = computed(() => roomSession.value?.roomTypeId ?? null)

const statusOptions = [
  { label: 'Semua', value: 'ALL' },
  { label: 'Belum diambil', value: 'PENDING' },
  { label: 'Sudah diambil', value: 'COLLECTED' },
  { label: 'Diterima Lab', value: 'RECEIVED' },
  { label: 'Ditolak', value: 'REJECTED' },
  { label: 'Reschedule', value: 'RESCHEDULED' }
]

const statusFilter = ref('PENDING')
const dateFilter = ref('')
const search = ref('')
const loading = ref(false)
const allRows = ref<SampleCollectionRow[]>([])
const rows = ref<SampleCollectionRow[]>([])
const error = ref<string | null>(null)

// Collected samples (for reception view)
const collectedLoading = ref(false)
const collectedRows = ref<SampleCollectionRow[]>([])
const collectedError = ref<string | null>(null)

const detailOpen = ref(false)
const pickModalOpen = ref(false)
const detailRow = ref<SampleCollectionRow | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    const params: Record<string, unknown> = {
      limit: 200,
      page: 1,
      _: Date.now()
    }
    if (statusFilter.value !== 'ALL') params.status = statusFilter.value
    if (dateFilter.value) params.queueDate = dateFilter.value
    if (roomTypeId.value) params.roomTypeId = roomTypeId.value

    const res = await api.get('/medical/exams/queue/samples', { params })
    const payload = res.data
    const list = Array.isArray(payload) ? payload : (payload?.data ?? [])
    allRows.value = list as SampleCollectionRow[]
    applyClientFilters()
  } catch {
    error.value = 'Gagal memuat data sample collection.'
  } finally {
    loading.value = false
  }
}

async function loadCollected() {
  collectedLoading.value = true
  collectedError.value = null
  try {
    const params: Record<string, unknown> = {
      status: 'COLLECTED',
      limit: 200,
      page: 1,
      _: Date.now()
    }
    if (dateFilter.value) params.queueDate = dateFilter.value
    if (roomTypeId.value) params.roomTypeId = roomTypeId.value

    const res = await api.get('/medical/exams/queue/samples', { params })
    const payload = res.data
    const list = Array.isArray(payload) ? payload : (payload?.data ?? [])
    collectedRows.value = list as SampleCollectionRow[]
  } catch {
    collectedError.value = 'Gagal memuat data sample collected.'
  } finally {
    collectedLoading.value = false
  }
}

function normalize(s?: string | null) {
  return (s ?? '').toString().toLowerCase().trim()
}

function applyClientFilters() {
  const q = normalize(search.value)
  if (!q) {
    rows.value = allRows.value
    return
  }
  rows.value = allRows.value.filter((row) => {
    const patient = row.queueEntry?.registration?.patient
    const patientName = normalize(
      [patient?.firstName, patient?.middleName, patient?.lastName].filter(Boolean).join(' ')
    )
    const patientId = normalize(row.queueEntry?.registration?.patient?.PatientId)
    const barcode = normalize(row.barcode)
    const queueCode = normalize(row.queueEntry?.queueCode)
    const sampleType = normalize(row.sampleType?.name)
    return (
      patientName.includes(q)
      || patientId.includes(q)
      || barcode.includes(q)
      || queueCode.includes(q)
      || sampleType.includes(q)
    )
  })
}

function onSearchInput() {
  applyClientFilters()
}

function onDateChange() {
  load()
  loadCollected()
}

function onStatusChange() {
  load()
}

function formatPatient(p?: SampleCollectionRow['queueEntry']): string {
  const pt = p?.registration?.patient
  if (!pt) return '-'
  return [pt.firstName, pt.middleName, pt.lastName].filter(Boolean).join(' ') || '-'
}

function formatDateTime(s?: string | null) {
  if (!s) return '-'
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(d)
}

function statusLabel(status: string) {
  if (status === 'PENDING') return 'Belum diambil'
  if (status === 'COLLECTED') return 'Sudah diambil'
  if (status === 'RECEIVED') return 'Diterima Lab'
  if (status === 'REJECTED') return 'Ditolak'
  if (status === 'RESCHEDULED') return 'Reschedule'
  return status
}

function statusColor(status: string) {
  if (status === 'RECEIVED') return 'success'
  if (status === 'COLLECTED') return 'info'
  if (status === 'REJECTED') return 'error'
  if (status === 'RESCHEDULED') return 'warning'
  return 'warning'
}

function openDetail(row: SampleCollectionRow) {
  detailRow.value = row
  detailOpen.value = true
}

onMounted(async () => {
  await refreshRoomSession()
  await load()
  await loadCollected()
})
</script>

<template>
  <UDashboardPanel id="sample-collection">
    <template #header>
      <UDashboardNavbar title="Sample Collection">
        <template #right>
          <UInput
            v-model="search"
            type="search"
            placeholder="Cari pasien / RM / barcode / queue"
            icon="i-lucide-search"
            class="w-56"
            @update:model-value="onSearchInput"
          />
          <UInput
            v-model="dateFilter"
            type="date"
            placeholder="Tanggal"
            icon="i-lucide-calendar"
            class="w-44"
            @update:model-value="onDateChange"
          />
          <USelect
            v-model="statusFilter"
            :items="statusOptions"
            class="w-44"
            @update:model-value="onStatusChange"
          />
          <UButton
            icon="i-lucide-user-plus"
            color="primary"
            variant="soft"
            @click="pickModalOpen = true"
          >
            Ambil Pasien
          </UButton>
          <UButton
            icon="i-lucide-refresh-cw"
            variant="soft"
            color="neutral"
            :loading="loading"
            @click="load"
          >
            Refresh
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-4">
        <UAlert
          color="info"
          variant="soft"
          icon="i-lucide-info"
          title="Data Sample Collection"
          description="Daftar seluruh pengambilan sample per kunjungan pasien. Difilter berdasarkan room sesi petugas aktif."
        />

        <!-- Section 1: Sample yang belum diambil (PENDING dll) -->
        <div v-if="loading" class="flex items-center justify-center py-10 text-muted">
          <UIcon name="i-lucide-loader-circle" class="animate-spin size-5" />
          <span class="ml-2 text-sm">Memuat data…</span>
        </div>

        <div v-else-if="error" class="py-8 text-center text-sm text-muted">
          {{ error }}
        </div>

        <div v-else-if="!rows.length" class="py-10 text-center text-sm text-muted">
          Tidak ada data sample collection untuk filter ini.
        </div>

        <div v-else class="space-y-3">
          <UCard
            v-for="row in rows"
            :key="row.id"
            class="overflow-hidden"
          >
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p class="text-sm font-semibold text-highlighted">
                  {{ formatPatient(row.queueEntry) }}
                  <span class="ml-1 font-normal text-muted">
                    ({{ row.queueEntry?.registration?.patient?.PatientId || '-' }})
                  </span>
                </p>
                <p class="text-xs text-muted">
                  {{ row.sampleType?.name || 'Sample' }} ·
                  Queue {{ row.queueEntry?.queueCode || '-' }}
                </p>
                <p v-if="row.items?.length" class="mt-1 text-xs text-muted">
                  Item:
                  <span
                    v-for="it in row.items"
                    :key="it.id"
                    class="mr-1 inline-block rounded bg-muted/40 px-1.5 py-0.5"
                  >{{ it.item?.name || it.item?.code || 'Item' }}</span>
                </p>
              </div>
              <div class="flex items-center gap-3">
                <UBadge :color="statusColor(row.status)">
                  {{ statusLabel(row.status) }}
                </UBadge>
                <UButton
                  color="primary"
                  variant="soft"
                  icon="i-lucide-eye"
                  @click="openDetail(row)"
                >
                  Detail
                </UButton>
              </div>
            </div>

            <div class="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
              <div>
                <p class="text-xs text-muted">
                  Diambil (COLLECT)
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
                  Diterima (RECEIVE)
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
          </UCard>
        </div>

        <!-- Section 2: Sample yang sudah diambil (COLLECTED) - untuk Reception -->
        <div class="pt-6 border-t border-default">
          <h3 class="mb-3 text-sm font-semibold text-highlighted">Sample Sudah Diambil (COLLECTED)</h3>
          <p class="mb-3 text-xs text-muted">Data ini bisa dilihat oleh Reception untuk menerima sample.</p>

          <div v-if="collectedLoading" class="flex items-center justify-center py-10 text-muted">
            <UIcon name="i-lucide-loader-circle" class="animate-spin size-5" />
            <span class="ml-2 text-sm">Memuat data collected…</span>
          </div>

          <div v-else-if="collectedError" class="py-8 text-center text-sm text-muted">
            {{ collectedError }}
          </div>

          <div v-else-if="!collectedRows.length" class="py-10 text-center text-sm text-muted">
            Belum ada sample dengan status COLLECTED.
          </div>

          <div v-else class="space-y-3">
            <UCard
              v-for="row in collectedRows"
              :key="row.id"
              class="overflow-hidden border-info/30"
            >
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p class="text-sm font-semibold text-highlighted">
                    {{ formatPatient(row.queueEntry) }}
                    <span class="ml-1 font-normal text-muted">
                      ({{ row.queueEntry?.registration?.patient?.PatientId || '-' }})
                    </span>
                  </p>
                  <p class="text-xs text-muted">
                    {{ row.sampleType?.name || 'Sample' }} ·
                    Queue {{ row.queueEntry?.queueCode || '-' }}
                  </p>
                  <p v-if="row.items?.length" class="mt-1 text-xs text-muted">
                    Item:
                    <span
                      v-for="it in row.items"
                      :key="it.id"
                      class="mr-1 inline-block rounded bg-muted/40 px-1.5 py-0.5"
                    >{{ it.item?.name || it.item?.code || 'Item' }}</span>
                  </p>
                </div>
                <div class="flex items-center gap-3">
                  <UBadge color="info">
                    {{ statusLabel(row.status) }}
                  </UBadge>
                  <UButton
                    color="primary"
                    variant="soft"
                    icon="i-lucide-eye"
                    @click="openDetail(row)"
                  >
                    Detail
                  </UButton>
                </div>
              </div>

              <div class="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
                <div>
                  <p class="text-xs text-muted">
                    Diambil (COLLECT)
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
                    Diterima (RECEIVE)
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
            </UCard>
          </div>
        </div>
      </div>
    </template>

    <UModal
      v-model:open="detailOpen"
      title="Detail Sample Collection"
      :ui="{ content: 'sm:max-w-3xl' }"
    >
      <template #body>
        <div v-if="detailRow">
          <p class="mb-4 text-sm text-muted">
            Pasien: <span class="font-semibold text-highlighted">{{ formatPatient(detailRow.queueEntry) }}</span>
          </p>

          <div class="mb-4 rounded-lg border border-default p-4 dark:border-gray-700">
            <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div class="text-base font-semibold text-highlighted dark:text-gray-50">
                {{ detailRow.sampleType?.name || 'Sample' }}
              </div>
              <UBadge :color="statusColor(detailRow.status)">
                {{ statusLabel(detailRow.status) }}
              </UBadge>
            </div>

            <dl class="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
              <div>
                <dt class="text-xs text-muted dark:text-gray-400">
                  Jenis Sample
                </dt>
                <dd class="text-sm text-highlighted dark:text-gray-50">
                  {{ detailRow.sampleType?.name || '-' }}
                </dd>
              </div>
              <div>
                <dt class="text-xs text-muted dark:text-gray-400">
                  Barcode
                </dt>
                <dd class="text-sm text-highlighted dark:text-gray-50">
                  {{ detailRow.barcode || '-' }}
                </dd>
              </div>
              <div>
                <dt class="text-xs text-muted dark:text-gray-400">
                  Jumlah Tabung
                </dt>
                <dd class="text-sm text-highlighted dark:text-gray-50">
                  {{ detailRow.tubeCount ?? 1 }}
                </dd>
              </div>
              <div>
                <dt class="text-xs text-muted dark:text-gray-400">
                  Waktu Pengambilan
                </dt>
                <dd class="text-sm text-highlighted dark:text-gray-50">
                  {{ formatDateTime(detailRow.collectedAt) }}
                </dd>
              </div>
              <div>
                <dt class="text-xs text-muted dark:text-gray-400">
                  Petugas Pengambil (COLLECT)
                </dt>
                <dd class="text-sm text-highlighted dark:text-gray-50">
                  {{ detailRow.collectedByUser?.name || (detailRow.collectedAt ? 'Tidak diketahui' : '-') }}
                </dd>
              </div>
              <div>
                <dt class="text-xs text-muted dark:text-gray-400">
                  Waktu Diterima Lab (RECEIVE)
                </dt>
                <dd class="text-sm text-highlighted dark:text-gray-50">
                  {{ formatDateTime(detailRow.receivedAt) }}
                </dd>
              </div>
              <div>
                <dt class="text-xs text-muted dark:text-gray-400">
                  Petugas Penerima (RECEIVE)
                </dt>
                <dd class="text-sm text-highlighted dark:text-gray-50">
                  {{ detailRow.receivedByUser?.name || (detailRow.receivedAt ? 'Tidak diketahui' : '-') }}
                </dd>
              </div>
              <div v-if="detailRow.status === 'REJECTED'">
                <dt class="text-xs text-muted dark:text-gray-400">
                  Alasan Ditolak
                </dt>
                <dd class="text-sm text-highlighted dark:text-gray-50">
                  {{ detailRow.rejectReason || '-' }}
                </dd>
              </div>
              <div v-if="detailRow.status === 'RESCHEDULED'">
                <dt class="text-xs text-muted dark:text-gray-400">
                  Jadwal Ulang
                </dt>
                <dd class="text-sm text-highlighted dark:text-gray-50">
                  {{ formatDateTime(detailRow.rescheduledAt) }}
                </dd>
              </div>
            </dl>

            <div v-if="detailRow.items?.length" class="mt-3">
              <p class="mb-1 text-xs text-muted dark:text-gray-400">
                Item terkait:
              </p>
              <div class="flex flex-wrap gap-1">
                <UBadge
                  v-for="sampleItem in detailRow.items"
                  :key="sampleItem.id"
                  variant="subtle"
                  color="neutral"
                >
                  {{ sampleItem.item?.name || sampleItem.item?.code || 'Item' }}
                </UBadge>
              </div>
            </div>
          </div>
        </div>
      </template>
    </UModal>

    <SampleCollectionPickModal v-model:open="pickModalOpen" @collect="load" />
  </UDashboardPanel>
</template>