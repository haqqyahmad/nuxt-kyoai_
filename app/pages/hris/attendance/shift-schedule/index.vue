<script setup lang="ts">
type ViewMode = 'day' | 'week' | 'month'

type ShiftTypeValue
  = | 'morning-shift'
    | 'evening-shift'
    | 'night-shift'
    | 'flexi-time'

type ShiftOption = {
  label: string
  value: ShiftTypeValue
  description: string
  type: 'FIXED' | 'FLEXI'
}

type WeekSchedule = {
  weekNumber: number
  week: string
  startDate: string
  endDate: string
  dateRange: string
  totalDays: number
  workingDays: number
  offDays: number
}

type EmployeeShiftAssignment = {
  employee: string
  department: string
  year: number
  shift: ShiftOption
  weeklySchedules: WeekSchedule[]
  summary: {
    totalWeeks: number
    totalWorkingDays: number
    totalOffDays: number
  }
}

const openAssignModal = ref(false)

const selectedDate = ref(new Date())
const viewMode = ref<ViewMode>('week')

const filters = reactive({
  department: 'all',
  shiftType: 'all'
})

const assignments = ref<EmployeeShiftAssignment[]>([])

function handleSaveAssignment(payload: EmployeeShiftAssignment) {
  const existingIndex = assignments.value.findIndex(item =>
    item.employee === payload.employee
    && item.year === payload.year
  )

  if (existingIndex >= 0) {
    assignments.value[existingIndex] = payload
  } else {
    assignments.value.push(payload)
  }

  openAssignModal.value = false
}
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
      <div class="h-full min-h-0 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6">
        <div class="mx-auto w-full max-w-7xl">
          <div class="grid min-w-0 gap-6 xl:grid-cols-4">
            <div class="min-w-0 space-y-6 xl:col-span-3">
              <HrisAttendanceScheduleShiftHeader
                v-model:selected-date="selectedDate"
                v-model:view-mode="viewMode"
                @assign="openAssignModal = true"
              />

              <HrisAttendanceScheduleShiftFilters
                v-model:department="filters.department"
                v-model:shift-type="filters.shiftType"
              />

              <HrisAttendanceScheduleShiftCalendar
                :assignments="assignments"
                :selected-date="selectedDate"
                :view-mode="viewMode"
                :department-filter="filters.department"
                :shift-filter="filters.shiftType"
              />
            </div>

            <div class="min-w-0">
              <HrisAttendanceScheduleShiftSummary />
            </div>
          </div>
        </div>
      </div>

      <HrisAttendanceScheduleAssignShiftModal
        v-model:open="openAssignModal"
        @save="handleSaveAssignment"
      />
    </template>
  </UDashboardPanel>
</template>
