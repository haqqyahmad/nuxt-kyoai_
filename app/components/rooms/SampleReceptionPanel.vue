<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

const api = useApi()
const toast = useToast()
const { user } = await useCurrentUser()

type SampleUser = { id: number, name: string, email?: string | null }
type ReceptionSample = {
  id: string
  status: string
  tubeCount?: number | null
  barcode?: string | null
  collectedAt?: string | null
  receivedAt?: string | null
  takenBy?: number | null
  takenAt?: string | null
  takenByUser?: SampleUser | null
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

const samples = ref<ReceptionSample[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const actionLoading = ref<Record<string, boolean>>({})
const isReceiveModalOpen = ref(false)
const selectedSample = ref<ReceptionSample | null>(null)
const receiveLoading = ref(false)
const modalLockAcquired = ref(false)
const releasingModalLock = ref(false)

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

const statusOptions = [
  { label: 'Semua Status', value: 'ALL' },
  { label: 'Belum Diproses', value: 'COLLECTED' },
  { label: 'Sudah Diterima', value: 'RECEIVED' },
  { label: 'Ditolak', value: 'REJECTED' },
  { label: 'Dijadwalkan Ulang', value: 'RESCHEDULED' }
]

const pageSizeOptions = [
  { label: '10 data', value: 10 },
  { label: '20 data', value: 20 },
  { label: '50 data', value: 50 },
  { label: '100 data', value: 100 }
]

const columns: TableColumn<ReceptionSample>[] = [
  { id: 'patient', header: 'Pasien' },
  { id: 'examDate', header: 'Tanggal Exam' },
  { id: 'sample', header: 'Sample / Item' },
  { id: 'collection', header: 'Collection' },
  { id: 'receive', header: 'Receive' },
  { accessorKey: 'status', header: 'Status' },
  { id: 'action', header: 'Aksi' }
]

const myUserId = computed(() => user.value?.id ?? null)

async function loadSamples() {
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

    const response = await api.get('/medical/exams/queue/samples/receive', { params })
    const body = response.data
    const list = Array.isArray(body?.data) ? body.data : []

    if (requestId === loadRequestId) {
      samples.value = list as ReceptionSample[]
      totalRows.value = Number(body?.meta?.total ?? list.length)
    }
  } catch {
    if (requestId === loadRequestId) {
      error.value = 'Gagal memuat data sample receive.'
      samples.value = []
      totalRows.value = 0
    }
  } finally {
    if (requestId === loadRequestId) loading.value = false
  }
}

function formatPatient(queueEntry?: ReceptionSample['queueEntry']) {
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

function getSampleStatusLabel(status: string) {
  if (status === 'COLLECTED') return 'Belum Diproses'
  if (status === 'RECEIVED') return 'Diterima & Diverifikasi'
  if (status === 'REJECTED') return 'Ditolak'
  if (status === 'RESCHEDULED') return 'Dijadwalkan Ulang'
  return status
}

function isTakenByMe(sample: ReceptionSample) {
  return sample.takenBy != null && sample.takenBy === myUserId.value
}

function canReceive(sample: ReceptionSample) {
  return sample.status === 'COLLECTED'
    && (sample.takenBy == null || isTakenByMe(sample))
}

function getErrorMessage(value: unknown, fallback: string) {
  if (typeof value === 'object' && value && 'response' in value) {
    const response = (value as { response?: { data?: { message?: string } } }).response
    return response?.data?.message || fallback
  }
  return fallback
}

async function openReceiveModal(sample: ReceptionSample) {
  if (!canReceive(sample)) {
    toast.add({
      title: 'Sample sedang diproses',
      description: 'Sample ini sedang ditangani petugas lain.',
      color: 'warning'
    })
    return
  }

  actionLoading.value = { ...actionLoading.value, [sample.id]: true }
  try {
    modalLockAcquired.value = isTakenByMe(sample)
    if (sample.takenBy == null) {
      await api.patch(`/medical/exams/queue/samples/${sample.id}/take`)
      modalLockAcquired.value = true
    }

    const response = await api.get(`/medical/exams/queue/samples/receive/${sample.id}`)
    selectedSample.value = (response.data?.data ?? response.data) as ReceptionSample
    isReceiveModalOpen.value = true
  } catch (value: unknown) {
    if (modalLockAcquired.value) {
      await api.patch(`/medical/exams/queue/samples/${sample.id}/release`).catch(() => undefined)
      modalLockAcquired.value = false
    }
    toast.add({
      title: 'Gagal membuka detail sample',
      description: getErrorMessage(value, 'Sample mungkin sudah diproses petugas lain.'),
      color: 'error'
    })
    await loadSamples()
  } finally {
    actionLoading.value = { ...actionLoading.value, [sample.id]: false }
  }
}

async function releaseModalLock() {
  if (!modalLockAcquired.value || !selectedSample.value || releasingModalLock.value) return

  releasingModalLock.value = true
  try {
    await api.patch(`/medical/exams/queue/samples/${selectedSample.value.id}/release`)
  } finally {
    modalLockAcquired.value = false
    releasingModalLock.value = false
    await loadSamples()
  }
}

async function closeReceiveModal() {
  isReceiveModalOpen.value = false
  await releaseModalLock()
  selectedSample.value = null
}

async function confirmReceive() {
  if (!selectedSample.value || receiveLoading.value) return

  receiveLoading.value = true
  try {
    await api.patch(`/medical/exams/queue/samples/${selectedSample.value.id}/receive`)
    modalLockAcquired.value = false
    isReceiveModalOpen.value = false
    selectedSample.value = null
    toast.add({
      title: 'Berhasil',
      description: 'Sample diterima dan diverifikasi.',
      color: 'success'
    })
    await loadSamples()
  } catch (value: unknown) {
    toast.add({
      title: 'Gagal menerima sample',
      description: getErrorMessage(value, 'Sample tidak dapat diterima.'),
      color: 'error'
    })
  } finally {
    receiveLoading.value = false
  }
}

watch(isReceiveModalOpen, (open) => {
  if (!open && modalLockAcquired.value) void releaseModalLock()
})

watch([statusFilter, examDateFrom, examDateTo], () => {
  if (currentPage.value !== 1) currentPage.value = 1
  else void loadSamples()
})

watch(currentPage, () => {
  void loadSamples()
})

watch(pageSize, () => {
  if (currentPage.value !== 1) currentPage.value = 1
  else void loadSamples()
})

watch(searchInput, (value) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    search.value = value.trim()
    if (currentPage.value !== 1) currentPage.value = 1
    else void loadSamples()
  }, 350)
})

onMounted(() => {
  void loadSamples()
})

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
})
</script>

<template>
  <UCard class="w-full max-w-none border border-default/80 shadow-sm">
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <div>
          <h3 class="text-base font-semibold text-highlighted">
            Sample Receive
          </h3>
          <p class="text-sm text-muted">
            Daftar sample yang belum maupun sudah diproses oleh LAB.
          </p>
        </div>
        <UButton
          icon="i-lucide-refresh-cw"
          variant="soft"
          color="neutral"
          :loading="loading"
          @click="loadSamples"
        >
          Refresh
        </UButton>
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
      color="error"
      variant="soft"
      class="mb-4"
      :description="error"
    />

    <div class="max-h-[calc(100vh-22rem)] min-h-80 w-full overflow-y-auto overflow-x-hidden rounded-lg border border-default">
      <UTable
        :data="samples"
        :columns="columns"
        :loading="loading"
        sticky
        class="w-full"
        :ui="{
          base: 'w-full table-fixed',
          thead: 'sticky top-0 z-10 [&>tr]:bg-elevated',
          th: 'whitespace-nowrap',
          td: 'align-top'
        }"
      >
        <template #patient-cell="{ row }">
          <div class="break-words">
            <p class="font-medium text-highlighted">
              {{ formatPatient(row.original.queueEntry) }}
            </p>
            <p class="text-xs text-muted">
              {{ row.original.queueEntry?.registration?.patient?.PatientId || '-' }}
              · {{ row.original.queueEntry?.queueCode || '-' }}
            </p>
          </div>
        </template>

        <template #examDate-cell="{ row }">
          {{ row.original.queueEntry?.registration?.examDate || '-' }}
        </template>

        <template #sample-cell="{ row }">
          <div class="break-words">
            <p class="font-medium text-highlighted">
              {{ row.original.sampleType?.name || 'Sample' }}
            </p>
            <p class="text-xs text-muted">
              {{ row.original.items?.map(item => item.item?.name || item.item?.code).filter(Boolean).join(', ') || '-' }}
            </p>
            <p class="text-xs text-muted">
              {{ row.original.tubeCount ?? 1 }} tabung · {{ row.original.barcode || 'Tanpa barcode' }}
            </p>
          </div>
        </template>

        <template #collection-cell="{ row }">
          <p>{{ row.original.collectedByUser?.name || '-' }}</p>
          <p class="text-xs text-muted">
            {{ formatDateTime(row.original.collectedAt) }}
          </p>
        </template>

        <template #receive-cell="{ row }">
          <p>{{ row.original.receivedByUser?.name || '-' }}</p>
          <p class="text-xs text-muted">
            {{ formatDateTime(row.original.receivedAt) }}
          </p>
        </template>

        <template #status-cell="{ row }">
          <UBadge
            :color="row.original.status === 'RECEIVED' ? 'success' : (row.original.status === 'COLLECTED' ? 'info' : 'warning')"
            variant="soft"
          >
            {{ getSampleStatusLabel(row.original.status) }}
          </UBadge>
        </template>

        <template #action-cell="{ row }">
          <div v-if="row.original.status === 'COLLECTED'">
            <UButton
              color="success"
              variant="soft"
              size="sm"
              icon="i-lucide-package-check"
              :loading="actionLoading[row.original.id]"
              :disabled="!canReceive(row.original)"
              @click="openReceiveModal(row.original)"
            >
              Terima Sample
            </UButton>
            <p
              v-if="row.original.takenBy != null && !isTakenByMe(row.original)"
              class="mt-1 text-xs text-warning"
            >
              Diproses petugas lain
            </p>
          </div>
          <span v-else class="text-xs text-muted">-</span>
        </template>

        <template #empty>
          <div class="py-10 text-center text-sm text-muted">
            Tidak ada data sample.
          </div>
        </template>
      </UTable>
    </div>

    <div class="mt-4 flex flex-col gap-3 border-t border-default pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p class="text-sm text-muted">
        Menampilkan {{ samples.length }} dari {{ totalRows }} data
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

  <UModal
    v-model:open="isReceiveModalOpen"
    title="Konfirmasi Penerimaan Sample"
    :ui="{ content: 'sm:max-w-2xl' }"
  >
    <template #body>
      <div v-if="selectedSample" class="space-y-5">
        <UAlert
          color="info"
          variant="soft"
          icon="i-lucide-user-round"
          title="Detail pasien"
          :description="`${formatPatient(selectedSample.queueEntry)} · ${selectedSample.queueEntry?.registration?.patient?.PatientId || '-'} · Queue ${selectedSample.queueEntry?.queueCode || '-'}`"
        />

        <div class="grid gap-3 rounded-xl border border-default p-4 sm:grid-cols-2">
          <div>
            <p class="text-xs text-muted">
              Jenis sample
            </p>
            <p class="font-medium text-highlighted">
              {{ selectedSample.sampleType?.name || 'Sample' }}
            </p>
          </div>
          <div>
            <p class="text-xs text-muted">
              Tabung / Barcode
            </p>
            <p class="font-medium text-highlighted">
              {{ selectedSample.tubeCount ?? 1 }} / {{ selectedSample.barcode || '-' }}
            </p>
          </div>
          <div>
            <p class="text-xs text-muted">
              Dikumpulkan oleh
            </p>
            <p class="font-medium text-highlighted">
              {{ selectedSample.collectedByUser?.name || '-' }}
            </p>
          </div>
          <div>
            <p class="text-xs text-muted">
              Waktu pengambilan
            </p>
            <p class="font-medium text-highlighted">
              {{ formatDateTime(selectedSample.collectedAt) }}
            </p>
          </div>
        </div>

        <div>
          <p class="mb-2 text-sm font-semibold text-highlighted">
            Item pemeriksaan terkait
          </p>
          <div v-if="selectedSample.items?.length" class="space-y-2">
            <div
              v-for="item in selectedSample.items"
              :key="item.id"
              class="flex items-center gap-3 rounded-lg border border-default px-3 py-2"
            >
              <UBadge color="neutral" variant="soft">
                {{ item.item?.code || '-' }}
              </UBadge>
              <span class="text-sm text-highlighted">
                {{ item.item?.name || 'Item pemeriksaan' }}
              </span>
            </div>
          </div>
          <p v-else class="text-sm text-muted">
            Tidak ada item pemeriksaan terkait.
          </p>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          color="neutral"
          variant="soft"
          :disabled="receiveLoading || releasingModalLock"
          @click="closeReceiveModal"
        >
          Batal
        </UButton>
        <UButton
          color="success"
          icon="i-lucide-package-check"
          :loading="receiveLoading"
          @click="confirmReceive"
        >
          Konfirmasi Terima Sample
        </UButton>
      </div>
    </template>
  </UModal>
</template>
