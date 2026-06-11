<!-- app/pages/hris/attendance/shift-schedule/index.vue -->

<script setup lang="ts">
import { CalendarDate } from '@internationalized/date'

const api = useApi()
const toast = useToast()

type ViewMode = 'day' | 'week' | 'month'
type FinalShiftStatus = 'active' | 'off'

type FinalShiftItem = {
  id?: number | string
  employee_id: number
  employee_name?: string
  department?: string
  date: string
  hari: string
  shift_code?: string | null
  shift_name?: string | null
  start_time: string | null
  end_time: string | null
  status: FinalShiftStatus
  source: string
  override_type: string | null
  override_reason: string | null
}

type FinalShiftResponse = {
  success: boolean
  message: string
  data: FinalShiftItem[]
}

type HolidayItem = {
  date: string
  name: string
}

const openAssignModal = ref(false)

const selectedDate = ref(new Date('2025-06-02'))
const viewMode = ref<ViewMode>('week')
const loading = ref(false)

const holidays = ref<HolidayItem[]>([])

const filters = reactive({
  employeeId: null as number | null,
  dateRange: {
    start: new CalendarDate(2025, 6, 1),
    end: new CalendarDate(2025, 6, 30)
  }
})

const finalShiftResponse = ref<FinalShiftResponse>({
  success: true,
  message: 'Get final shift view success',
  data: []
})

function formatYmd(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getStartOfWeek(date: Date) {
  const start = new Date(date)
  const day = start.getDay()
  const diff = day === 0 ? -6 : 1 - day

  start.setDate(start.getDate() + diff)

  return start
}

function getDateRange() {
  const date = new Date(selectedDate.value)

  if (viewMode.value === 'day') {
    return {
      startDate: formatYmd(date),
      endDate: formatYmd(date)
    }
  }

  if (viewMode.value === 'week') {
    const start = getStartOfWeek(date)
    const end = new Date(start)

    end.setDate(start.getDate() + 6)

    return {
      startDate: formatYmd(start),
      endDate: formatYmd(end)
    }
  }

  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)

  return {
    startDate: formatYmd(start),
    endDate: formatYmd(end)
  }
}

async function loadShiftSchedule() {
  if (!filters.employeeId) {
    finalShiftResponse.value = {
      success: true,
      message: 'Pilih employee terlebih dahulu',
      data: []
    }

    return
  }

  loading.value = true

  try {
    const params = {
      employee_id: filters.employeeId,
      start_date: filters.dateRange.start?.toString(),
      end_date: filters.dateRange.end?.toString()
    }

    const response = await api.get<FinalShiftResponse>(
      '/hris/shift/view',
      { params }
    )

    finalShiftResponse.value = response.data
  } catch (error) {
    console.error(error)

    finalShiftResponse.value = {
      success: false,
      message: 'Failed to load final shift view',
      data: []
    }

    toast.add({
      title: 'Gagal memuat jadwal shift',
      description: 'Silakan coba lagi.',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

async function loadHolidays() {
  try {
    const year = selectedDate.value.getFullYear()

    const response = await api.get<{
      success: boolean
      data: HolidayItem[]
    }>('/hris/holidays', {
      params: { year }
    })

    holidays.value = response.data.data ?? []
  } catch (error) {
    console.error(error)
    holidays.value = []
  }
}

async function refreshPage() {
  await Promise.all([
    loadShiftSchedule(),
    loadHolidays()
  ])
}

async function handleSearch() {
  await loadShiftSchedule()
}

async function handleSwapShift(payload: {
  fromEmployeeId: number
  toEmployeeId: number
  date: string
  shift: FinalShiftItem
}) {
  try {
    await api.post('/hris/shift/swap', payload)

    toast.add({
      title: 'Shift berhasil ditukar',
      color: 'success'
    })

    await loadShiftSchedule()
  } catch (error) {
    console.error(error)

    toast.add({
      title: 'Gagal menukar shift',
      description: 'Silakan coba lagi.',
      color: 'error'
    })
  }
}

function handleEditShift(shift: FinalShiftItem) {
  console.log('edit-shift', shift)
}

onMounted(() => {
  loadHolidays()
})

watch(
  () => [
    selectedDate.value.getFullYear(),
    selectedDate.value.getMonth(),
    selectedDate.value.getDate(),
    viewMode.value
  ],
  () => {
    refreshPage()
  }
)
</script>

<template>
  <UDashboardPanel
    id="attendance"
    class="min-h-0"
  >
    <template #header>
      <UDashboardNavbar title="Shift Schedule">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="h-full min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6">
        <div class="w-full max-w-none">
          <div class="grid min-w-0 gap-6 2xl:grid-cols-[minmax(0,1fr)_360px]">
            <div class="min-w-0 space-y-6">
              <HrisAttendanceScheduleShiftHeader
                v-model:selected-date="selectedDate"
                v-model:view-mode="viewMode"
                @assign="openAssignModal = true"
              />

              <HrisAttendanceScheduleShiftFilters
                v-model:employee-id="filters.employeeId"
                v-model:date-range="filters.dateRange"
                @search="handleSearch"
              />

              <HrisAttendanceScheduleShiftCalendar
                :final-shift-response="finalShiftResponse"
                :selected-date="selectedDate"
                :view-mode="viewMode"
                :holidays="holidays"
                :loading="loading"
                @swap-shift="handleSwapShift"
                @edit-shift="handleEditShift"
              />
            </div>

            <aside class="min-w-0">
              <HrisAttendanceScheduleShiftSummary
                :final-shift-response="finalShiftResponse"
              />
            </aside>
          </div>
        </div>
      </div>

      <HrisAttendanceScheduleAssignShiftModal
        v-model:open="openAssignModal"
        @refresh="refreshPage"
      />
    </template>
  </UDashboardPanel>
</template>
