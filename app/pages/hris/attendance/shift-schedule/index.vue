<!-- app/pages/hris/attendance/shift-schedule/index.vue -->

<script setup lang="ts">
const api = useApi()

type ViewMode = 'day' | 'week' | 'month'

type FinalShiftStatus = 'active' | 'off'

type FinalShiftItem = {
  employee_id: number
  employee_name?: string
  department?: string
  date: string
  hari: string
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

const openAssignModal = ref(false)

const selectedDate = ref(new Date('2025-06-02'))
const viewMode = ref<ViewMode>('week')

const loading = ref(false)

const filters = reactive({
  department: 'all',
  shiftType: 'all'
})

const finalShiftResponse = ref<FinalShiftResponse>({
  success: true,
  message: 'Get final shift view success',
  data: []
})

async function loadShiftSchedule() {
  loading.value = true
  try {
    const range = getDateRange()
    const response = await api.get<FinalShiftResponse>('/hris/shift/view', {
      params: {
        employee_id: 3,
        start_date: range.start_date,
        end_date: range.end_date
      }
    })

    finalShiftResponse.value = response.data
    console.log('shift-response', response.data)
  } catch (error) {
    console.error(error)
    finalShiftResponse.value = {
      success: false,
      message: 'Failed to load final shift view',
      data: []
    }
  } finally {
    loading.value = false
  }
}

//     finalShiftResponse.value = response
//     console.log('shift-response',response)
//   } catch (error) {
//     console.error(error)

//     finalShiftResponse.value = {
//       success: false,
//       message: 'Failed to load final shift view',
//       data: []
//     }
//   } finally {
//     loading.value = false
//   }
// }


onMounted(() => {
  loadShiftSchedule()
})


watch(
  () => [
    selectedDate.value,
    viewMode.value
  ],
  () => {
    loadShiftSchedule()
  },
  {
    deep: true
  }
)



function formatDate(date: Date) {
  return date.toISOString().split('T')[0]
}

function getDateRange() {
  const current = new Date(selectedDate.value)

  let start = new Date(current)
  let end = new Date(current)

  // DAY
  if (viewMode.value === 'day') {
    return {
      start_date: formatDate(start),
      end_date: formatDate(end)
    }
  }

  // WEEK
  if (viewMode.value === 'week') {
    const day = start.getDay()
    const diff = day === 0 ? -6 : 1 - day

    start.setDate(start.getDate() + diff)

    end = new Date(start)
    end.setDate(start.getDate() + 6)

    return {
      start_date: formatDate(start),
      end_date: formatDate(end)
    }
  }

  // MONTH
  start = new Date(current.getFullYear(), current.getMonth(), 1)

  end = new Date(
    current.getFullYear(),
    current.getMonth() + 1,
    0
  )

  return {
    start_date: formatDate(start),
    end_date: formatDate(end)
  }
}


</script>

<template>
  <UDashboardPanel id="attendance" class="min-h-0">
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
              <HrisAttendanceScheduleShiftHeader v-model:selected-date="selectedDate" v-model:view-mode="viewMode"
                @assign="openAssignModal = true" />

              <HrisAttendanceScheduleShiftFilters v-model:department="filters.department"
                v-model:shift-type="filters.shiftType" />

              <div v-if="loading" class="rounded-xl border border-default p-6 text-center text-sm text-muted">
                Loading shift schedule...
              </div>

              <HrisAttendanceScheduleShiftCalendar v-else :final-shift-response="finalShiftResponse"
                :selected-date="selectedDate" :view-mode="viewMode" :department-filter="filters.department"
                :shift-filter="filters.shiftType" />
            </div>

            <aside class="min-w-0">
              <HrisAttendanceScheduleShiftSummary />
            </aside>
          </div>
        </div>
      </div>

      <HrisAttendanceScheduleAssignShiftModal v-model:open="openAssignModal" @refresh="loadShiftSchedule" />
    </template>
  </UDashboardPanel>
</template>
