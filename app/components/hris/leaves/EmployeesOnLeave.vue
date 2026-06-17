<!-- app/components/hris/leaves/EmployeesOnLeave.vue -->

<script setup lang="ts">
type ApiLeaveType = 'ANNUAL' | 'SICK' | 'SPECIAL' | 'MATERNITY'
type ApiLeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
type PeriodFilter = 'today' | 'week' | 'month'

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

const props = defineProps<{
  employeeId?: number | string | null
}>()

const router = useRouter()
const api = useApi()
const toast = useToast()

const loading = ref(false)
const items = ref<LeaveRequest[]>([])
const periodFilter = ref<PeriodFilter>('today')

const filterOptions = [
  { label: 'Hari Ini', value: 'today' },
  { label: 'Minggu Ini', value: 'week' },
  { label: 'Bulan Ini', value: 'month' }
]

function toDateOnly(value: string) {
  return value.slice(0, 10)
}

function getToday() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const date = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${date}`
}

function getMonthRange() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const lastDay = new Date(year, month, 0).getDate()

  return {
    start: `${year}-${String(month).padStart(2, '0')}-01`,
    end: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  }
}

function getWeekRange() {
  const now = new Date()
  const day = now.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day

  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const format = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const dayDate = String(date.getDate()).padStart(2, '0')

    return `${year}-${month}-${dayDate}`
  }

  return {
    start: format(monday),
    end: format(sunday)
  }
}

const activeRange = computed(() => {
  if (periodFilter.value === 'month') return getMonthRange()
  if (periodFilter.value === 'week') return getWeekRange()

  const today = getToday()

  return {
    start: today,
    end: today
  }
})

const filteredItems = computed(() => {
  return items.value.filter((item) => {
    const startDate = toDateOnly(item.start_date)
    const endDate = toDateOnly(item.end_date)

    return startDate <= activeRange.value.end && endDate >= activeRange.value.start
  })
})

async function loadEmployeesOnLeave() {
  loading.value = true

  try {
    const params: Record<string, string | number> = {
      status: 'APPROVED'
    }

    if (props.employeeId) {
      params.employee_id = props.employeeId
    }

    const response = await api.get<LeaveRequestResponse>('/hris/leave/requests', {
      params
    })

    items.value = response.data?.data || []
  } catch (error) {
    console.error(error)
    items.value = []

    toast.add({
      title: 'Gagal',
      description: 'Gagal mengambil data karyawan yang sedang cuti.',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

function viewLeave(item: LeaveRequest) {
  router.push(`/hris/leaves/${item.id}`)
}

function getLeaveTypeLabel(type: ApiLeaveType) {
  const labels: Record<ApiLeaveType, string> = {
    ANNUAL: 'Cuti Tahunan',
    SICK: 'Sakit',
    SPECIAL: 'Izin Khusus',
    MATERNITY: 'Cuti Melahirkan'
  }

  return labels[type] || type
}

function getLeaveColor(type: ApiLeaveType) {
  const colors: Record<ApiLeaveType, 'success' | 'error' | 'primary' | 'warning'> = {
    ANNUAL: 'success',
    SICK: 'error',
    SPECIAL: 'primary',
    MATERNITY: 'warning'
  }

  return colors[type] || 'primary'
}

function getLeaveDotColor(type: ApiLeaveType) {
  const colors: Record<ApiLeaveType, string> = {
    ANNUAL: 'bg-success',
    SICK: 'bg-error',
    SPECIAL: 'bg-primary',
    MATERNITY: 'bg-warning'
  }

  return colors[type] || 'bg-muted'
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

function formatDateRange(item: LeaveRequest) {
  const start = new Date(item.start_date)
  const end = new Date(item.end_date)

  const sameDay = toDateOnly(item.start_date) === toDateOnly(item.end_date)
  const sameMonth = start.getMonth() === end.getMonth()
  const sameYear = start.getFullYear() === end.getFullYear()

  if (sameDay) return formatDate(item.start_date)

  if (sameMonth && sameYear) {
    const startDay = start.toLocaleDateString('id-ID', { day: '2-digit' })
    const endLabel = end.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })

    return `${startDay} - ${endLabel}`
  }

  return `${formatDate(item.start_date)} - ${formatDate(item.end_date)}`
}

function getEmployeeName(item: LeaveRequest) {
  return item.employee?.nama || '-'
}

function getEmployeeNik(item: LeaveRequest) {
  return item.employee?.nik || '-'
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

watch(
  () => props.employeeId,
  () => {
    loadEmployeesOnLeave()
  }
)

onMounted(() => {
  loadEmployeesOnLeave()
})

defineExpose({
  refresh: loadEmployeesOnLeave
})
</script>

<template>
  <UCard class="h-full">
    <template #header>
      <div class="space-y-4">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <UIcon
                name="i-lucide-users-round"
                class="size-5 text-primary"
              />
            </div>

            <div>
              <h2 class="font-semibold text-highlighted">
                Sedang Cuti
              </h2>

              <p class="text-sm text-muted">
                Karyawan dengan cuti yang sudah disetujui.
              </p>
            </div>
          </div>

          <UBadge
            color="primary"
            variant="soft"
          >
            {{ filteredItems.length }} Orang
          </UBadge>
        </div>

        <USelect
          v-model="periodFilter"
          :items="filterOptions"
          size="sm"
          class="w-full"
        />
      </div>
    </template>

    <div class="space-y-3">
      <template v-if="loading">
        <div
          v-for="index in 4"
          :key="index"
          class="flex items-center gap-3 rounded-xl border border-default p-3"
        >
          <USkeleton class="size-10 rounded-full" />

          <div class="min-w-0 flex-1 space-y-2">
            <USkeleton class="h-4 w-32" />
            <USkeleton class="h-3 w-44" />
          </div>
        </div>
      </template>

      <div
        v-else-if="!filteredItems.length"
        class="rounded-xl border border-dashed border-default bg-muted/30 p-6 text-center"
      >
        <UIcon
          name="i-lucide-calendar-check"
          class="mx-auto mb-3 size-8 text-muted"
        />

        <p class="font-medium text-highlighted">
          Tidak ada karyawan cuti
        </p>

        <p class="mt-1 text-sm text-muted">
          Tidak ada cuti disetujui pada periode yang dipilih.
        </p>
      </div>

      <div
        v-for="item in filteredItems"
        v-else
        :key="item.id"
        class="rounded-xl border border-default p-3 transition hover:bg-muted/40"
      >
        <div class="flex items-start gap-3">
          <div class="relative shrink-0">
            <UAvatar
              :alt="getEmployeeName(item)"
              :text="getInitial(getEmployeeName(item))"
              size="md"
            />

            <span
              class="absolute -bottom-0.5 -right-0.5 size-3 rounded-full ring-2 ring-default"
              :class="getLeaveDotColor(item.leave_type)"
            />
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-highlighted">
                  {{ getEmployeeName(item) }}
                </p>

                <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                  <span class="flex items-center gap-1">
                    <UIcon name="i-lucide-badge" />
                    {{ getEmployeeNik(item) }}
                  </span>

                  <span class="flex items-center gap-1">
                    <UIcon name="i-lucide-calendar-range" />
                    {{ formatDateRange(item) }}
                  </span>
                </div>
              </div>

              <UBadge
                :color="getLeaveColor(item.leave_type)"
                variant="soft"
                size="sm"
                class="shrink-0"
              >
                {{ getLeaveTypeLabel(item.leave_type) }}
              </UBadge>
            </div>

            <div class="mt-3 flex justify-end gap-2">
              <UButton
                icon="i-lucide-eye"
                color="primary"
                variant="soft"
                size="xs"
                @click="viewLeave(item)"
              >
                View
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <UButton
        block
        color="neutral"
        variant="outline"
        icon="i-lucide-refresh-cw"
        :loading="loading"
        @click="loadEmployeesOnLeave"
      >
        Refresh Data
      </UButton>
    </template>
  </UCard>
</template>
