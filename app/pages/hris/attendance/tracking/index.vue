<!-- app/pages/hris/tracking/index.vue -->

<script setup lang="ts">
useSeoMeta({
  title: 'Attendance Tracking',
  description: 'Detail attendance record HRIS.'
})

definePageMeta({
  middleware: 'auth'
})

type AttendanceRow = {
  employee_id: string | number
  date: string
  status: string
  checkin_time: string | null
  checkout_time: string | null
  shift_start: string | null
  shift_end: string | null
  holiday_name?: string | null
  leave_type?: string | null
  reason?: string | null
  overtime_type?: 'front' | 'back' | 'both' | string | null
  dt_minutes: number
  pc_minutes?: number
  early_checkout_minutes?: number
  ot_minutes: number
  worked_minutes: number
  worked_hours?: string
}

type NationalHoliday = {
  id: number
  date: string
  name: string
  description: string | null
  is_active: boolean | number
}

const api = useApi()
const toast = useToast()

const openUploadAttendance = ref(false)
const openChangeValue = ref(false)

const loading = ref(false)
const reportRows = ref<AttendanceRow[]>([])
const nationalHolidays = ref<NationalHoliday[]>([])

const filters = reactive({
  employeeId: '2',
  start: '2026-06-01',
  end: '2026-06-30'
})

function normalizeDate(value: string) {
  return value.includes('T') ? value.slice(0, 10) : value
}

function isHolidayActive(value: boolean | number) {
  return value === true || Number(value) === 1
}

function isDateBetween(date: string, start: string, end: string) {
  return date >= start && date <= end
}

async function loadNationalHolidays() {
  try {
    const res = await api.get('/hris/national-holidays')

    nationalHolidays.value = res.data?.data ?? []
  } catch (error) {
    console.error(error)
    nationalHolidays.value = []
  }
}

function mergeNationalHolidays(rows: AttendanceRow[]) {
  const existingDates = new Set(
    rows.map(row => normalizeDate(row.date))
  )

  const holidayRows: AttendanceRow[] = nationalHolidays.value
    .filter(holiday => isHolidayActive(holiday.is_active))
    .filter(holiday => isDateBetween(holiday.date, filters.start, filters.end))
    .filter(holiday => !existingDates.has(holiday.date))
    .map(holiday => ({
      employee_id: filters.employeeId,
      date: holiday.date,
      status: 'HOLIDAY',
      checkin_time: null,
      checkout_time: null,
      shift_start: null,
      shift_end: null,
      holiday_name: holiday.name,
      leave_type: null,
      reason: holiday.description || 'Libur Nasional',
      overtime_type: null,
      dt_minutes: 0,
      pc_minutes: 0,
      early_checkout_minutes: 0,
      ot_minutes: 0,
      worked_minutes: 0,
      worked_hours: '0'
    }))

  return [...rows, ...holidayRows].sort((a, b) => {
    return normalizeDate(a.date).localeCompare(normalizeDate(b.date))
  })
}

function printReport() {
  if (!filters.employeeId || !filters.start || !filters.end) {
    toast.add({
      title: 'Filter belum lengkap',
      description: 'Pilih employee, start date, dan end date terlebih dahulu.',
      color: 'warning'
    })
    return
  }

  const query = new URLSearchParams({
    employee_id: filters.employeeId,
    start: filters.start,
    end: filters.end
  })

  window.open(`/hris/attendance/tracking/print?${query.toString()}`, '_blank')
}

async function loadAttendanceReport() {
  if (!filters.employeeId || !filters.start || !filters.end) {
    toast.add({
      title: 'Filter belum lengkap',
      description: 'Pilih employee, start date, dan end date terlebih dahulu.',
      color: 'warning'
    })
    return
  }

  loading.value = true

  try {
    await loadNationalHolidays()

    const res = await api.get('/hris/attendance/report', {
      params: {
        employee_id: filters.employeeId,
        start: filters.start,
        end: filters.end
      }
    })

    const data: AttendanceRow[] = res.data?.data ?? []

    reportRows.value = mergeNationalHolidays(data)
  } catch (error) {
    console.error(error)

    toast.add({
      title: 'Gagal mengambil report attendance',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadAttendanceReport()
})
</script>

<template>
  <UDashboardPanel id="attendance-tracking">
    <template #header>
      <UDashboardNavbar title="Attendance Report">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-6">
        <HrisAttendanceTrackingFilters
          v-model:employee-id="filters.employeeId"
          v-model:start="filters.start"
          v-model:end="filters.end"
          @view="loadAttendanceReport"
          @upload-attendance="openUploadAttendance = true"
          @change-value="openChangeValue = true"
          @print="printReport"
        />

        <HrisAttendanceTrackingAttendanceSummary :rows="reportRows" />

        <HrisAttendanceTrackingAttendanceTable
          :rows="reportRows"
          :loading="loading"
        />
      </div>

      <HrisAttendanceTrackingUploadAttendanceModal
        v-model:open="openUploadAttendance"
      />

      <HrisAttendanceTrackingChangeValueModal
        v-model:open="openChangeValue"
        @saved="loadAttendanceReport"
      />
    </template>
  </UDashboardPanel>
</template>
