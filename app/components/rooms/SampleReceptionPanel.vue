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

const statusFilter = ref('ALL')
const today = new Date().toISOString().slice(0, 10)
const queueDateFrom = ref(today)
const queueDateTo = ref(today)
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

const SAMPLE_ITEMS_VISIBLE = 3
const expandedSampleItems = ref<Record<string, boolean>>({})
function toggleSampleItems(id: string) {
  expandedSampleItems.value[id] = !expandedSampleItems.value[id]
}
function sampleItemNames(sample: ReceptionSample): string[] {
  return (sample.items ?? []).map(item => item.item?.name || item.item?.code).filter((value): value is string => Boolean(value))
}
function visibleSampleItems(sample: ReceptionSample): string[] {
  const names = sampleItemNames(sample)
  return expandedSampleItems.value[sample.id] ? names : names.slice(0, SAMPLE_ITEMS_VISIBLE)
}

const columns: TableColumn<ReceptionSample>[] = [
  { id: 'patient', header: 'Pasien' },
  { id: 'examDate', header: 'Tanggal Exam' },
  { id: 'sample', header: 'Sample' },
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
    if (queueDateFrom.value) params.queueDateFrom = queueDateFrom.value
    if (queueDateTo.value) params.queueDateTo = queueDateTo.value
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

async function receiveSample(sample: ReceptionSample) {
  if (!canReceive(sample)) {
    toast.add({
      title: 'Sample sedang diproses',
      description: 'Sample ini sedang ditangani petugas lain.',
      color: 'warning'
    })
    return
  }
  if (actionLoading.value[sample.id]) return

  actionLoading.value = { ...actionLoading.value, [sample.id]: true }
  try {
    await api.patch(`/medical/exams/queue/samples/${sample.id}/receive`)
    toast.add({
      title: 'Berhasil',
      description: 'Sample diterima dan diverifikasi.',
      color: 'success'
    })
  } catch (value: unknown) {
    toast.add({
      title: 'Gagal menerima sample',
      description: getErrorMessage(value, 'Sample tidak dapat diterima.'),
      color: 'error'
    })
  } finally {
    actionLoading.value = { ...actionLoading.value, [sample.id]: false }
    await loadSamples()
  }
}

function canReject(sample: ReceptionSample) {
  return sample.status === 'COLLECTED'
}

const isRejectModalOpen = ref(false)
const rejectTarget = ref<ReceptionSample | null>(null)
const rejectReason = ref('')
const rejectSubmitting = ref(false)

function openRejectModal(sample: ReceptionSample) {
  if (!canReject(sample)) return
  rejectTarget.value = sample
  rejectReason.value = ''
  isRejectModalOpen.value = true
}

function closeRejectModal() {
  isRejectModalOpen.value = false
  rejectTarget.value = null
  rejectReason.value = ''
}

async function submitReject() {
  const target = rejectTarget.value
  if (!target || rejectSubmitting.value) return
  if (!rejectReason.value.trim()) {
    toast.add({ title: 'Alasan wajib diisi', color: 'warning' })
    return
  }
  rejectSubmitting.value = true
  try {
    await api.patch(`/medical/exams/queue/samples/${target.id}/reject`, {
      rejectReason: rejectReason.value.trim()
    })
    toast.add({
      title: 'Berhasil',
      description: 'Sample ditolak.',
      color: 'success'
    })
    closeRejectModal()
    await loadSamples()
  } catch (value: unknown) {
    toast.add({
      title: 'Gagal menolak sample',
      description: getErrorMessage(value, 'Sample tidak dapat ditolak.'),
      color: 'error'
    })
  } finally {
    rejectSubmitting.value = false
  }
}

const isDetailModalOpen = ref(false)
const detailSample = ref<ReceptionSample | null>(null)

function openDetailModal(sample: ReceptionSample) {
  detailSample.value = sample
  isDetailModalOpen.value = true
}

function closeDetailModal() {
  isDetailModalOpen.value = false
  detailSample.value = null
}

function sampleActions(sample: ReceptionSample) {
  return [
    {
      label: 'Receive Sample',
      icon: 'i-lucide-package-check',
      color: 'success' as const,
      disabled: !canReceive(sample),
      onSelect: () => receiveSample(sample)
    },
    {
      label: 'Reject Sample',
      icon: 'i-lucide-ban',
      color: 'error' as const,
      disabled: !canReject(sample),
      onSelect: () => openRejectModal(sample)
    },
    {
      label: 'Detail Item',
      icon: 'i-lucide-list-tree',
      color: 'neutral' as const,
      onSelect: () => openDetailModal(sample)
    }
  ]
}

watch([statusFilter, queueDateFrom, queueDateTo], () => {
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
  <UCard class="w-full max-w-none border border-default/80 shadow-sm shrink-0">
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-3">
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
          <span class="hidden sm:inline">Refresh</span>
        </UButton>
      </div>
    </template>

    <div class="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
      <UFormField label="Tanggal Queue Dari">
        <UInput
          v-model="queueDateFrom"
          type="date"
          :max="queueDateTo || undefined"
          class="w-full"
        />
      </UFormField>
      <UFormField label="Tanggal Queue Sampai">
        <UInput
          v-model="queueDateTo"
          type="date"
          :min="queueDateFrom || undefined"
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

    <div class="hidden md:block max-h-[calc(100vh-22rem)] min-h-80 w-full overflow-y-auto overflow-x-auto rounded-lg border border-default">
      <UTable
        :data="samples"
        :columns="columns"
        :loading="loading"
        sticky
        class="w-full"
        :ui="{
          base: 'w-full',
          thead: 'sticky top-0 z-10 [&>tr]:bg-elevated',
          th: 'whitespace-nowrap lg:text-base',
          td: 'align-top whitespace-normal break-words lg:text-base'
        }"
      >
        <template #patient-cell="{ row }">
          <div class="break-words">
            <p class="font-medium text-highlighted">
              {{ formatPatient(row.original.queueEntry) }}
            </p>
            <p class="text-xs text-muted">
              {{ row.original.queueEntry?.registration?.id_reg || '-' }}
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
              {{ row.original.tubeCount ?? 1 }} tabung · {{ row.original.barcode || 'Tanpa barcode' }}
            </p>
          </div>
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
          <div class="hidden lg:flex items-center justify-end gap-1">
            <UButton
              icon="i-lucide-package-check"
              color="success"
              variant="ghost"
              size="sm"
              title="Receive Sample"
              :loading="actionLoading[row.original.id]"
              :disabled="!canReceive(row.original)"
              @click="receiveSample(row.original)"
            />
            <UButton
              icon="i-lucide-ban"
              color="error"
              variant="ghost"
              size="sm"
              title="Reject Sample"
              :disabled="!canReject(row.original)"
              @click="openRejectModal(row.original)"
            />
            <UButton
              icon="i-lucide-list-tree"
              color="neutral"
              variant="ghost"
              size="sm"
              title="Detail Item"
              @click="openDetailModal(row.original)"
            />
          </div>

          <UDropdownMenu
            class="lg:hidden"
            :items="sampleActions(row.original)"
            :content="{ align: 'end' }"
          >
            <UButton
              icon="i-lucide-ellipsis-vertical"
              color="neutral"
              variant="ghost"
              size="sm"
              title="Aksi"
            />
          </UDropdownMenu>
        </template>

        <template #empty>
          <div class="py-10 text-center text-sm text-muted">
            Tidak ada data sample.
          </div>
        </template>
      </UTable>
    </div>

    <!-- < md: card list -->
    <div class="md:hidden mb-4">
      <div v-if="loading" class="space-y-3">
        <USkeleton class="h-32 rounded-lg" />
        <USkeleton class="h-32 rounded-lg" />
        <USkeleton class="h-32 rounded-lg" />
      </div>

      <div
        v-else-if="!samples.length"
        class="rounded-lg border border-dashed border-default py-10 text-center text-sm text-muted"
      >
        Tidak ada data sample.
      </div>

      <div v-else class="divide-y divide-default rounded-lg border border-default">
        <div
          v-for="row in samples"
          :key="row.id"
          class="space-y-3 p-4"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="font-medium text-highlighted truncate">
                {{ formatPatient(row.queueEntry) }}
              </p>
              <p class="text-xs text-muted">
                {{ row.queueEntry?.registration?.id_reg || '-' }}
                · {{ row.queueEntry?.queueCode || '-' }}
              </p>
            </div>
            <UBadge
              :color="row.status === 'RECEIVED' ? 'success' : (row.status === 'COLLECTED' ? 'info' : 'warning')"
              variant="soft"
              class="shrink-0"
            >
              {{ getSampleStatusLabel(row.status) }}
            </UBadge>
          </div>

          <div>
            <p class="font-medium text-highlighted">
              {{ row.sampleType?.name || 'Sample' }}
            </p>
            <div
              v-if="sampleItemNames(row).length"
              class="mt-1 flex flex-wrap gap-1"
            >
              <span
                v-for="name in visibleSampleItems(row)"
                :key="name"
                class="rounded bg-muted/60 px-1.5 py-0.5 text-[11px] text-muted"
              >
                {{ name }}
              </span>
              <button
                v-if="sampleItemNames(row).length > SAMPLE_ITEMS_VISIBLE"
                type="button"
                class="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary hover:bg-primary/20"
                @click="toggleSampleItems(row.id)"
              >
                {{ expandedSampleItems[row.id] ? 'Show less' : `+${sampleItemNames(row).length - SAMPLE_ITEMS_VISIBLE} more` }}
              </button>
            </div>
            <p class="text-xs text-muted mt-1">
              {{ row.tubeCount ?? 1 }} tabung · {{ row.barcode || 'Tanpa barcode' }}
            </p>
          </div>

          <p class="text-xs text-muted">
            Exam Date: <span class="font-medium text-highlighted">{{ row.queueEntry?.registration?.examDate || '-' }}</span>
          </p>

          <div class="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p class="text-muted">Collection</p>
              <p class="font-medium text-highlighted">
                {{ row.collectedByUser?.name || '-' }}
              </p>
              <p class="text-muted">{{ formatDateTime(row.collectedAt) }}</p>
            </div>
            <div>
              <p class="text-muted">Receive</p>
              <p class="font-medium text-highlighted">
                {{ row.receivedByUser?.name || '-' }}
              </p>
              <p class="text-muted">{{ formatDateTime(row.receivedAt) }}</p>
            </div>
          </div>

          <div v-if="row.status === 'COLLECTED'" class="space-y-1">
            <div class="flex gap-2">
              <UButton
                class="flex-1"
                color="success"
                variant="soft"
                size="sm"
                icon="i-lucide-package-check"
                :loading="actionLoading[row.id]"
                :disabled="!canReceive(row)"
                @click="receiveSample(row)"
              >
                Terima Sample
              </UButton>
              <UButton
                class="flex-1"
                color="error"
                variant="soft"
                size="sm"
                icon="i-lucide-ban"
                :disabled="!canReject(row)"
                @click="openRejectModal(row)"
              >
                Reject Sample
              </UButton>
            </div>
            <p
              v-if="row.takenBy != null && !isTakenByMe(row)"
              class="text-xs text-warning"
            >
              Diproses petugas lain
            </p>
          </div>
        </div>
      </div>
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
    v-model:open="isDetailModalOpen"
    title="Detail Item"
    :ui="{ content: 'sm:max-w-2xl' }"
  >
    <template #body>
      <div v-if="detailSample" class="space-y-5">
        <UAlert
          color="info"
          variant="soft"
          icon="i-lucide-user-round"
          title="Detail sample"
          :description="`${formatPatient(detailSample.queueEntry)} · ${detailSample.queueEntry?.registration?.id_reg || '-'} · ${detailSample.queueEntry?.queueCode || '-'}`"
        />

        <div class="grid gap-3 rounded-xl border border-default p-4 sm:grid-cols-2">
          <div>
            <p class="text-xs text-muted">
              Jenis sample
            </p>
            <p class="font-medium text-highlighted">
              {{ detailSample.sampleType?.name || 'Sample' }}
            </p>
          </div>
          <div>
            <p class="text-xs text-muted">
              Tabung / Barcode
            </p>
            <p class="font-medium text-highlighted">
              {{ detailSample.tubeCount ?? 1 }} / {{ detailSample.barcode || '-' }}
            </p>
          </div>
          <div>
            <p class="text-xs text-muted">
              Status
            </p>
            <p class="font-medium text-highlighted">
              {{ getSampleStatusLabel(detailSample.status) }}
            </p>
          </div>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <div class="rounded-xl border border-default p-4">
            <p class="text-xs text-muted">
              Collection
            </p>
            <p class="font-medium text-highlighted">
              {{ detailSample.collectedByUser?.name || '-' }}
            </p>
            <p class="text-xs text-muted">
              {{ formatDateTime(detailSample.collectedAt) }}
            </p>
          </div>
          <div class="rounded-xl border border-default p-4">
            <p class="text-xs text-muted">
              Receive
            </p>
            <p class="font-medium text-highlighted">
              {{ detailSample.receivedByUser?.name || '-' }}
            </p>
            <p class="text-xs text-muted">
              {{ formatDateTime(detailSample.receivedAt) }}
            </p>
          </div>
        </div>

        <div>
          <p class="mb-2 text-sm font-semibold text-highlighted">
            Item pemeriksaan terkait
          </p>
          <div v-if="detailSample.items?.length" class="space-y-2">
            <div
              v-for="item in detailSample.items"
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
      <div class="flex w-full justify-end">
        <UButton
          color="neutral"
          variant="soft"
          @click="closeDetailModal"
        >
          Tutup
        </UButton>
      </div>
    </template>
  </UModal>

  <UModal
    v-model:open="isRejectModalOpen"
    title="Reject Sample"
    :ui="{ content: 'sm:max-w-lg' }"
  >
    <template #body>
      <div class="space-y-4">
        <UAlert
          color="error"
          variant="soft"
          icon="i-lucide-ban"
          title="Tolak sample"
          :description="rejectTarget ? `${formatPatient(rejectTarget.queueEntry)} · ${rejectTarget.sampleType?.name || 'Sample'}` : ''"
        />

        <UFormField label="Alasan penolakan" required>
          <UTextarea
            v-model="rejectReason"
            :rows="3"
            placeholder="Masukkan alasan penolakan sample..."
            class="w-full"
          />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          color="neutral"
          variant="soft"
          :disabled="rejectSubmitting"
          @click="closeRejectModal"
        >
          Batal
        </UButton>
        <UButton
          color="error"
          icon="i-lucide-ban"
          :loading="rejectSubmitting"
          :disabled="!rejectReason.trim()"
          @click="submitReject"
        >
          Reject Sample
        </UButton>
      </div>
    </template>
  </UModal>
</template>
