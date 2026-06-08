<!-- app/pages/hris/attendance/shift-configuration/index.vue -->

<script setup lang="ts">
type ShiftTemplateDay = {
  id?: number
  template_id?: number
  day_of_week: number
  start_time: string | null
  end_time: string | null
  is_working: boolean
}

type ShiftTemplate = {
  id: number
  name: string
  description: string | null
  status: 'active' | 'inactive'
  created_at?: string
  updated_at?: string
  shiftTemplateDays: ShiftTemplateDay[]
}

const api = useApi()
const toast = useToast()

const loading = ref(false)
const shifts = ref<ShiftTemplate[]>([])
const selectedShiftId = ref<number | null>(null)

const openCreateShift = ref(false)
const openAssignEmployee = ref(false)

const selectedShift = computed(() => {
  return shifts.value.find(shift => shift.id === selectedShiftId.value) || null
})

async function fetchShifts() {
  loading.value = true

  try {
    const response: any = await api('/hris/shift/templates', {
      method: 'GET'
    })

    const data = response?.data?.data || response?.data || response || []

    shifts.value = Array.isArray(data) ? data : []

    if (!selectedShiftId.value && shifts.value.length) {
      selectedShiftId.value = shifts.value[0].id
    }

    if (
      selectedShiftId.value
      && !shifts.value.some(shift => shift.id === selectedShiftId.value)
    ) {
      selectedShiftId.value = shifts.value[0]?.id ?? null
    }
  } catch (error: any) {
    console.error(error)

    toast.add({
      title: 'Gagal',
      description: error?.response?.data?.message || 'Gagal mengambil data shift.',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchShifts()
})
</script>

<template>
  <UDashboardPanel
    id="shift-config"
    class="min-h-0"
  >
    <template #header>
      <UDashboardNavbar title="Shift Configuration">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            icon="i-lucide-plus"
            class="whitespace-nowrap"
            @click="openCreateShift = true"
          >
            <span class="hidden sm:inline">
              Create New Shift
            </span>

            <span class="sm:hidden">
              Create
            </span>
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="h-full min-h-0 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6">
        <div class="mx-auto w-full max-w-7xl space-y-6">
          <div class="space-y-1">
            <p class="text-sm text-muted">
              Attendance / Shift Configuration
            </p>

            <h1 class="text-2xl font-semibold text-highlighted">
              Shift Configuration
            </h1>
          </div>

          <div class="grid min-w-0 gap-6 xl:grid-cols-12">
            <div class="min-w-0 space-y-6 xl:col-span-4">
              <HrisAttendanceConfigurationShiftList
                v-model="selectedShiftId"
                :shifts="shifts"
                :loading="loading"
              />

              <HrisAttendanceConfigurationShiftSummaryCard
                :shifts="shifts"
              />
            </div>

            <div class="min-w-0 space-y-6 xl:col-span-8">
              <HrisAttendanceConfigurationShiftDetailForm
                :shift="selectedShift"
                @refresh="fetchShifts"
              />

              <!--
              <HrisAttendanceConfigurationAssignedEmployeesTable
                @add="openAssignEmployee = true"
              />
              -->
            </div>
          </div>
        </div>
      </div>

      <HrisAttendanceConfigurationCreateShiftModal
        v-model:open="openCreateShift"
        @created="fetchShifts"
      />

      <!--
      <HrisAttendanceConfigurationAssignEmployeeModal
        v-model:open="openAssignEmployee"
      />
      -->
    </template>
  </UDashboardPanel>
</template>
