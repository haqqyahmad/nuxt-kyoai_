<!-- app/pages/hris/leaves/[id].vue -->

<script setup lang="ts">
import type {
  ApiAttendanceReportItem,
  ApiLeaveRequestDetail,
  ApiLeaveBalanceDetail,
  ApiResponse,
  AttendanceHistoryItem,
  AttendanceStatus,
  LeaveDetail,
  LeaveStatus,
  LeaveType
} from '~/types/hris-leave'

const route = useRoute()
const router = useRouter()
const api = useApi()
const toast = useToast()

const id = computed(() => String(route.params.id))

const loading = ref(false)
const actionLoading = ref<'approve' | 'reject' | null>(null)
const adminNotes = ref('')
const rejectedReason = ref('')
const openRejectModal = ref(false)
const leave = ref<LeaveDetail | null>(null)

function showRejectModal() {
  rejectedReason.value = ''
  openRejectModal.value = true
}

function closeRejectModal() {
  openRejectModal.value = false
  rejectedReason.value = ''
}

function normalizeDate(date?: string | null) {
  if (!date) return ''
  return date.slice(0, 10)
}

function mapLeaveType(type?: string): LeaveType {
  const map: Record<string, LeaveType> = {
    ANNUAL: 'annual',
    SICK: 'sick',
    SPECIAL: 'special',
    MATERNITY: 'maternity'
  }

  return map[type || ''] || 'annual'
}

function mapLeaveStatus(status?: string): LeaveStatus {
  const map: Record<string, LeaveStatus> = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected'
  }

  return map[status || ''] || 'pending'
}

function mapAttendanceStatus(status?: string): AttendanceStatus {
  const map: Record<string, AttendanceStatus> = {
    PRESENT: 'present',
    LATE: 'late',
    ABSENT: 'absent',
    OFF: 'off',
    LEAVE: 'leave',
    SICK: 'sick'
  }

  return map[String(status || '').toUpperCase()] || 'absent'
}

function mapAttendanceHistory(items: ApiAttendanceReportItem[]): AttendanceHistoryItem[] {
  return items.map(item => ({
    date: normalizeDate(item.date),
    status: mapAttendanceStatus(item.status)
  }))
}

function mapApiLeaveToDetail(item: ApiLeaveRequestDetail): LeaveDetail {
  return {
    id: item.id,
    employee: {
      id: item.employee?.id || item.employee_id,
      name: item.employee?.nama || '-',
      email: '-',
      employee_code: item.employee?.nik || '-',
      department: '-',
      position: '-',
      avatar: null
    },
    leave_type: mapLeaveType(item.leave_type),
    start_date: normalizeDate(item.start_date),
    end_date: normalizeDate(item.end_date),
    total_days: Number(item.total_days || 0),
    reason: item.special_reason || item.notes || '-',
    status: mapLeaveStatus(item.status),
    admin_notes: item.rejected_reason || '',
    leave_balance: {
      entitlement_days: 0,
      used_days: 0,
      remaining_days: 0,

      new_entitlement_days: 0,
      new_used_days: 0,
      new_remaining_days: 0,

      old_entitlement_days: 0,
      old_used_days: 0,
      old_remaining_days: 0,

      expired_at: null
    },
    attendance_history: [],
    conflicts: []
  }
}

function mapLeaveBalance(item: ApiLeaveBalanceDetail): LeaveBalance {
  return {
    entitlement_days: Number(item.jatah_cuti_baru || 0) + Number(item.jatah_cuti_lama || 0),
    used_days: Number(item.terpakai_baru || 0) + Number(item.terpakai_lama || 0),
    remaining_days: Number(item.sisa_baru || 0) + Number(item.sisa_lama || 0),

    new_entitlement_days: Number(item.jatah_cuti_baru || 0),
    new_used_days: Number(item.terpakai_baru || 0),
    new_remaining_days: Number(item.sisa_baru || 0),

    old_entitlement_days: Number(item.jatah_cuti_lama || 0),
    old_used_days: Number(item.terpakai_lama || 0),
    old_remaining_days: Number(item.sisa_lama || 0),

    expired_at: item.expired_at || null
  }
}

async function fetchLeaveBalance(employeeId: number) {
  if (!employeeId) {
    return {
      entitlement_days: 0,
      used_days: 0,
      remaining_days: 0
    }
  }

  const response = await api.get<ApiResponse<ApiLeaveBalanceDetail>>(
    `/hris/leave/balance/${employeeId}`
  )

  return mapLeaveBalance(response.data.data)
}

function getMonthRange(date: string) {
  const [year, month] = date.split('-').map(Number)
  const lastDay = new Date(year, month, 0).getDate()

  return {
    start: `${year}-${String(month).padStart(2, '0')}-01`,
    end: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  }
}

async function fetchAttendanceHistory(employeeId: number, leaveStartDate: string) {
  if (!employeeId || !leaveStartDate) return []

  const { start, end } = getMonthRange(leaveStartDate)

  const response = await api.get<ApiResponse<ApiAttendanceReportItem[]>>(
    '/hris/attendance/report',
    {
      params: {
        employee_id: employeeId,
        start,
        end
      }
    }
  )

  return mapAttendanceHistory(response.data.data || [])
}

async function fetchLeaveDetail() {
  loading.value = true

  try {
    const response = await api.get<ApiResponse<ApiLeaveRequestDetail>>(
      `/hris/leave/requests/${id.value}`
    )

    const mappedLeave = mapApiLeaveToDetail(response.data.data)

    try {
      mappedLeave.leave_balance = await fetchLeaveBalance(mappedLeave.employee.id)
    } catch (error) {
      console.error(error)

      toast.add({
        title: 'Leave balance gagal dimuat',
        description: 'Detail cuti tetap ditampilkan tanpa saldo cuti.',
        color: 'warning'
      })
    }

    try {
      mappedLeave.attendance_history = await fetchAttendanceHistory(
        mappedLeave.employee.id,
        mappedLeave.start_date
      )


    } catch (error) {
      console.error(error)

      toast.add({
        title: 'Attendance history gagal dimuat',
        description: 'Detail cuti tetap ditampilkan tanpa riwayat absensi.',
        color: 'warning'
      })
    }



    leave.value = mappedLeave
    adminNotes.value = mappedLeave.admin_notes || ''
  } catch (error) {
    console.error(error)

    toast.add({
      title: 'Gagal mengambil detail cuti',
      description: 'Data detail permohonan cuti gagal dimuat dari API.',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

async function approveLeave() {
  if (!leave.value) return

  actionLoading.value = 'approve'

  try {
    await api.post(`/hris/leave/requests/${leave.value.id}/approve`, {
      admin_notes: adminNotes.value
    })

    leave.value.status = 'approved'

    toast.add({
      title: 'Permohonan disetujui',
      description: 'Permohonan cuti berhasil disetujui.',
      color: 'success'
    })
  } catch (error) {
    console.error(error)

    toast.add({
      title: 'Gagal menyetujui',
      description: 'Terjadi kesalahan saat menyetujui permohonan cuti.',
      color: 'error'
    })
  } finally {
    actionLoading.value = null
  }
}

async function rejectLeave() {
  if (!leave.value) return

  if (!rejectedReason.value.trim()) {
    toast.add({
      title: 'Alasan wajib diisi',
      description: 'Masukkan alasan penolakan terlebih dahulu.',
      color: 'warning'
    })

    return
  }

  actionLoading.value = 'reject'

  try {
    await api.post(`/hris/leave/requests/${leave.value.id}/reject`, {
      rejected_reason: rejectedReason.value,
      admin_notes: adminNotes.value
    })

    leave.value.status = 'rejected'
    leave.value.admin_notes = rejectedReason.value

    toast.add({
      title: 'Permohonan ditolak',
      description: 'Permohonan cuti berhasil ditolak.',
      color: 'success'
    })

    closeRejectModal()
  } catch (error) {
    console.error(error)

    toast.add({
      title: 'Gagal menolak',
      description: 'Terjadi kesalahan saat menolak permohonan cuti.',
      color: 'error'
    })
  } finally {
    actionLoading.value = null
  }
}

onMounted(fetchLeaveDetail)
</script>

<template>
  <UDashboardPanel id="leave-request-detail">
    <template #header>
      <UDashboardNavbar title="Detail Permohonan Cuti">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="outline"
            @click="router.push('/hris/leaves')"
          >
            Kembali
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div
        v-if="loading"
        class="flex min-h-[400px] items-center justify-center"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="size-8 animate-spin text-primary"
        />
      </div>

      <div
        v-else-if="leave"
        class="mx-auto w-full max-w-7xl space-y-6"
      >
        <HrisLeavesDetailHeader :leave="leave" />

        <div class="grid gap-6 xl:grid-cols-12">
          <div class="space-y-6 xl:col-span-8">
            <HrisLeavesDetailEmployeeProfileCard :employee="leave.employee" />

            <div class="grid gap-6 lg:grid-cols-2">
              <HrisLeavesDetailRequestInfoCard :leave="leave" />
              <HrisLeavesDetailReasonCard :reason="leave.reason" />
            </div>

            <HrisLeavesDetailAdminNotesCard v-model="adminNotes" />

            <HrisLeavesDetailApprovalActions
              v-if="leave.status === 'pending'"
              :loading="actionLoading"
              @approve="approveLeave"
              @reject="showRejectModal"
            />
          </div>

          <div class="space-y-6 xl:col-span-4">
            <HrisLeavesDetailLeaveBalanceCard :balance="leave.leave_balance" />

            <HrisLeavesDetailAttendanceHistoryCard
              :items="leave.attendance_history"
            />
          </div>
        </div>
      </div>

      <UAlert
        v-else
        color="error"
        variant="soft"
        icon="i-lucide-circle-alert"
        title="Data tidak ditemukan"
        description="Detail permohonan cuti tidak tersedia."
      />

      <UModal
        v-model:open="openRejectModal"
        title="Tolak Permohonan Cuti"
        :ui="{
          content: 'sm:max-w-xl'
        }"
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
                    Permohonan cuti akan ditolak dan karyawan akan menerima alasan
                    penolakan yang Anda masukkan di bawah ini.
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
                :rows="6"
                autoresize
                class="w-full"
                placeholder="Masukkan alasan penolakan permohonan cuti..."
              />
            </UFormField>

            <div class="flex items-center justify-between text-xs text-muted">
              <span>
                Wajib diisi
              </span>

              <span>
                {{ rejectedReason.length }} karakter
              </span>
            </div>
          </div>
        </template>

        <template #footer>
          <div class="flex w-full justify-end gap-3">
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
              :loading="actionLoading === 'reject'"
              :disabled="!rejectedReason.trim()"
              @click="rejectLeave"
            >
              Tolak Permohonan
            </UButton>
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
