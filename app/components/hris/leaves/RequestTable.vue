<!-- app/components/hris/leaves/RequestTable.vue -->

<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

type ApiLeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
type ApiLeaveType = 'ANNUAL' | 'SICK' | 'SPECIAL' | 'MATERNITY' | 'HALF_DAY'

type LeaveRequest = {
  id: number
  employee_id: number
  leave_type: ApiLeaveType
  status: ApiLeaveStatus
  start_date: string
  end_date: string
  total_days: string | number
  notes: string | null
  special_reason: string | null
  rejected_reason: string | null
  employee?: {
    id: number
    nik: string
    nama: string
  } | null
}

type LeaveRequestResponse = {
  success: boolean
  message: string
  data: LeaveRequest[]
}

const api = useApi()
const toast = useToast()

const loading = ref(false)
const approvingId = ref<number | null>(null)
const rejectingId = ref<number | null>(null)
const bulkApproving = ref(false)

const rows = ref<LeaveRequest[]>([])
const selectedIds = ref<number[]>([])

const openRejectModal = ref(false)
const selectedRejectId = ref<number | null>(null)
const rejectedReason = ref('')

const pendingRows = computed(() => {
  return rows.value.filter(row => row.status === 'PENDING')
})

const selectedPendingRows = computed(() => {
  return pendingRows.value.filter(row => selectedIds.value.includes(row.id))
})

const allPendingSelected = computed({
  get() {
    return pendingRows.value.length > 0
      && selectedIds.value.length === pendingRows.value.length
  },
  set(value: boolean) {
    selectedIds.value = value
      ? pendingRows.value.map(row => row.id)
      : []
  }
})

const columns: TableColumn<LeaveRequest>[] = [
  { id: 'select', header: '' },
  { accessorKey: 'employee', header: 'Nama Karyawan' },
  { accessorKey: 'leave_type', header: 'Jenis Cuti' },
  { accessorKey: 'start_date', header: 'Tanggal' },
  { accessorKey: 'notes', header: 'Alasan' },
  { accessorKey: 'status', header: 'Status' },
  { id: 'actions', header: 'Aksi' }
]

function toggleSelected(id: number, value: boolean) {
  if (value) {
    selectedIds.value = [...new Set([...selectedIds.value, id])]
    return
  }

  selectedIds.value = selectedIds.value.filter(item => item !== id)
}

async function loadLeaveRequests() {
  loading.value = true

  try {
    const response = await api.get<LeaveRequestResponse>('/hris/leave/requests')

    rows.value = response.data?.data || []
    selectedIds.value = []
  } catch (error) {
    console.error(error)
    rows.value = []
    selectedIds.value = []

    toast.add({
      title: 'Gagal',
      description: 'Gagal mengambil data permohonan cuti.',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

async function approveLeaveRequest(id: number) {
  approvingId.value = id

  try {
    await api.post(`/hris/leave/requests/${id}/approve`)

    toast.add({
      title: 'Berhasil',
      description: 'Permohonan cuti berhasil disetujui.',
      color: 'success'
    })

    await loadLeaveRequests()
  } catch (error) {
    console.error(error)

    toast.add({
      title: 'Gagal',
      description: 'Gagal menyetujui permohonan cuti.',
      color: 'error'
    })
  } finally {
    approvingId.value = null
  }
}

async function bulkApproveSelected() {
  if (!selectedIds.value.length) {
    toast.add({
      title: 'Belum ada data dipilih',
      description: 'Pilih minimal satu permohonan cuti terlebih dahulu.',
      color: 'warning'
    })

    return
  }

  bulkApproving.value = true

  try {
    await Promise.all(
      selectedIds.value.map(id => api.post(`/hris/leave/requests/${id}/approve`))
    )

    toast.add({
      title: 'Berhasil',
      description: `${selectedIds.value.length} permohonan cuti berhasil disetujui.`,
      color: 'success'
    })

    await loadLeaveRequests()
  } catch (error) {
    console.error(error)

    toast.add({
      title: 'Gagal',
      description: 'Gagal melakukan verifikasi massal.',
      color: 'error'
    })
  } finally {
    bulkApproving.value = false
  }
}

function showRejectModal(id: number) {
  selectedRejectId.value = id
  rejectedReason.value = ''
  openRejectModal.value = true
}

function closeRejectModal() {
  openRejectModal.value = false
  selectedRejectId.value = null
  rejectedReason.value = ''
}

async function rejectLeaveRequest() {
  if (!selectedRejectId.value || !rejectedReason.value.trim()) return

  rejectingId.value = selectedRejectId.value

  try {
    await api.post(`/hris/leave/requests/${selectedRejectId.value}/reject`, {
      rejected_reason: rejectedReason.value
    })

    toast.add({
      title: 'Berhasil',
      description: 'Permohonan cuti berhasil ditolak.',
      color: 'success'
    })

    closeRejectModal()
    await loadLeaveRequests()
  } catch (error) {
    console.error(error)

    toast.add({
      title: 'Gagal',
      description: 'Gagal menolak permohonan cuti.',
      color: 'error'
    })
  } finally {
    rejectingId.value = null
  }
}

function getLeaveTypeLabel(type: ApiLeaveType) {
  const labels: Record<ApiLeaveType, string> = {
    HALF_DAY: 'Cuti 1/2 Hari',
    ANNUAL: 'Cuti Tahunan',
    SICK: 'Sakit',
    SPECIAL: 'Izin Khusus',
    MATERNITY: 'Cuti Melahirkan'
  }

  return labels[type] || type
}

function getLeaveColor(type: ApiLeaveType) {
  const colors: Record<ApiLeaveType, 'primary' | 'success' | 'warning' | 'error'> = {
    HALF_DAY: 'warning',
    ANNUAL: 'success',
    SICK: 'error',
    SPECIAL: 'primary',
    MATERNITY: 'warning'
  }

  return colors[type] || 'primary'
}

function getStatusLabel(status: ApiLeaveStatus) {
  const labels: Record<ApiLeaveStatus, string> = {
    PENDING: 'Menunggu',
    APPROVED: 'Disetujui',
    REJECTED: 'Ditolak'
  }

  return labels[status] || status
}

function getStatusColor(status: ApiLeaveStatus) {
  const colors: Record<ApiLeaveStatus, 'warning' | 'success' | 'error'> = {
    PENDING: 'warning',
    APPROVED: 'success',
    REJECTED: 'error'
  }

  return colors[status] || 'warning'
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

function formatDateRange(row: LeaveRequest) {
  const start = new Date(row.start_date)
  const end = new Date(row.end_date)

  const sameDay = row.start_date.slice(0, 10) === row.end_date.slice(0, 10)
  const sameMonth = start.getMonth() === end.getMonth()
  const sameYear = start.getFullYear() === end.getFullYear()

  if (sameDay) return formatDate(row.start_date)

  if (sameMonth && sameYear) {
    const startDay = start.toLocaleDateString('id-ID', {
      day: '2-digit'
    })

    const endLabel = end.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })

    return `${startDay} - ${endLabel}`
  }

  return `${formatDate(row.start_date)} - ${formatDate(row.end_date)}`
}

function getEmployeeName(row: LeaveRequest) {
  return row.employee?.nama || '-'
}

function getEmployeeNik(row: LeaveRequest) {
  return row.employee?.nik || '-'
}

function getReason(row: LeaveRequest) {
  return row.notes || row.special_reason || '-'
}

function getInitial(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map(item => item[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

onMounted(loadLeaveRequests)

defineExpose({
  refresh: loadLeaveRequests,
  bulkApproveSelected
})
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-center gap-3">
            <div class="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <UIcon
                name="i-lucide-clipboard-check"
                class="size-5 text-primary"
              />
            </div>

            <div>
              <h2 class="font-semibold text-highlighted">
                Permohonan Cuti
              </h2>

              <p class="text-sm text-muted">
                {{ pendingRows.length }} permohonan menunggu persetujuan
              </p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <UBadge
              v-if="selectedIds.length"
              color="success"
              variant="soft"
            >
              {{ selectedIds.length }} dipilih
            </UBadge>

            <UButton
              v-if="selectedIds.length"
              color="success"
              variant="soft"
              icon="i-lucide-badge-check"
              :loading="bulkApproving"
              @click="bulkApproveSelected"
            >
              Verifikasi Pilihan
            </UButton>

            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-refresh-cw"
              :loading="loading"
              @click="loadLeaveRequests"
            >
              Refresh
            </UButton>
          </div>
        </div>
      </div>
    </template>

    <UTable
      :data="pendingRows"
      :columns="columns"
      :loading="loading"
      class="w-full"
    >
      <template #select-header>
        <UCheckbox
          v-model="allPendingSelected"
          :disabled="!pendingRows.length || loading"
        />
      </template>

      <template #select-cell="{ row }">
        <UCheckbox
          :model-value="selectedIds.includes(row.original.id)"
          :disabled="loading || bulkApproving"
          @update:model-value="toggleSelected(row.original.id, Boolean($event))"
        />
      </template>

      <template #employee-cell="{ row }">
        <div class="flex items-center gap-3">
          <UAvatar
            :text="getInitial(getEmployeeName(row.original))"
            :alt="getEmployeeName(row.original)"
            size="sm"
          />

          <div class="min-w-0">
            <p class="truncate font-medium text-highlighted">
              {{ getEmployeeName(row.original) }}
            </p>

            <p class="text-xs text-muted">
              {{ getEmployeeNik(row.original) }}
            </p>
          </div>
        </div>
      </template>

      <template #leave_type-cell="{ row }">
        <UBadge
          :color="getLeaveColor(row.original.leave_type)"
          variant="soft"
        >
          {{ getLeaveTypeLabel(row.original.leave_type) }}
        </UBadge>
      </template>

      <template #start_date-cell="{ row }">
        <div>
          <p class="text-sm font-medium text-highlighted">
            {{ formatDateRange(row.original) }}
          </p>

          <p class="text-xs text-muted">
            {{ Number(row.original.total_days) }} Hari Kerja
          </p>
        </div>
      </template>

      <template #notes-cell="{ row }">
        <p class="max-w-[240px] truncate text-sm text-muted">
          {{ getReason(row.original) }}
        </p>
      </template>

      <template #status-cell="{ row }">
        <UBadge
          :color="getStatusColor(row.original.status)"
          variant="soft"
        >
          {{ getStatusLabel(row.original.status) }}
        </UBadge>
      </template>

      <template #actions-cell="{ row }">
        <div class="flex justify-end gap-1.5">
          <UButton
            icon="i-lucide-eye"
            color="primary"
            variant="ghost"
            size="sm"
            :to="`/hris/leaves/${row.original.id}`"
          />

          <UButton
            icon="i-lucide-x-circle"
            color="error"
            variant="ghost"
            size="sm"
            :loading="rejectingId === row.original.id"
            :disabled="approvingId === row.original.id || bulkApproving"
            @click="showRejectModal(row.original.id)"
          />

          <!-- <UButton
            icon="i-lucide-check-circle"
            color="success"
            variant="ghost"
            size="sm"
            :loading="approvingId === row.original.id"
            :disabled="rejectingId === row.original.id || bulkApproving"
            @click="approveLeaveRequest(row.original.id)"
          /> -->
        </div>
      </template>

      <template #empty>
        <div class="py-10 text-center">
          <UIcon
            name="i-lucide-inbox"
            class="mx-auto mb-3 size-8 text-muted"
          />

          <p class="font-medium text-highlighted">
            Tidak ada permohonan cuti
          </p>

          <p class="mt-1 text-sm text-muted">
            Semua permohonan cuti sudah diproses.
          </p>
        </div>
      </template>
    </UTable>

    <template #footer>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-sm text-muted">
          Menampilkan {{ pendingRows.length }} dari {{ rows.length }} permohonan
        </p>

        <p
          v-if="selectedPendingRows.length"
          class="text-sm text-success"
        >
          {{ selectedPendingRows.length }} permohonan siap diverifikasi massal
        </p>
      </div>
    </template>

    <UModal
      v-model:open="openRejectModal"
      title="Tolak Permohonan Cuti"
      :ui="{ content: 'sm:max-w-xl' }"
    >
      <template #body>
        <div class="space-y-4">
          <div class="rounded-lg border border-warning/20 bg-warning/5 p-4">
            <div class="flex items-start gap-3">
              <UIcon
                name="i-lucide-triangle-alert"
                class="mt-0.5 size-5 shrink-0 text-warning"
              />

              <div>
                <p class="font-medium text-highlighted">
                  Konfirmasi Penolakan
                </p>

                <p class="mt-1 text-sm text-muted">
                  Masukkan alasan penolakan sebelum menolak permohonan cuti.
                </p>
              </div>
            </div>
          </div>

          <UFormField
            label="Alasan Penolakan"
            required
          >
            <UTextarea
              v-model="rejectedReason"
              :rows="5"
              autoresize
              class="w-full"
              placeholder="Masukkan alasan penolakan..."
            />
          </UFormField>

          <div class="flex items-center justify-between text-xs text-muted">
            <span>Wajib diisi</span>
            <span>{{ rejectedReason.length }} karakter</span>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton
            color="neutral"
            variant="outline"
            @click="closeRejectModal"
          >
            Batal
          </UButton>

          <UButton
            color="error"
            icon="i-lucide-x-circle"
            :loading="rejectingId !== null"
            :disabled="!rejectedReason.trim()"
            @click="rejectLeaveRequest"
          >
            Tolak Permohonan
          </UButton>
        </div>
      </template>
    </UModal>
  </UCard>
</template>
