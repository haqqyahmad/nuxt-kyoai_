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

type MonthTemplateWeek = {
  id?: number
  week_number: number
  shift_template_id: number
  shiftTemplate?: ShiftTemplate
}

type MonthTemplate = {
  id: number
  name: string
  description: string | null
  status: 'active' | 'inactive'
  weeks: MonthTemplateWeek[]
}

type SelectedShift = {
  id: number
  type: 'shift' | 'month'
}

const api = useApi()
const toast = useToast()

const loading = ref(false)

const shifts = ref<ShiftTemplate[]>([])
const monthTemplates = ref<MonthTemplate[]>([])

const selectedItem = ref<SelectedShift | null>(null)

const openCreateShift = ref(false)
const openMonthlyShiftModal = ref(false)

const selectedRegularShift = computed<ShiftTemplate | null>(() => {
  if (selectedItem.value?.type !== 'shift') {
    return null
  }

  return (
    shifts.value.find(
      shift => shift.id === selectedItem.value?.id
    ) || null
  )
})

const selectedMonthTemplate = computed<MonthTemplate | null>(() => {
  if (selectedItem.value?.type !== 'month') {
    return null
  }

  return (
    monthTemplates.value.find(
      template => template.id === selectedItem.value?.id
    ) || null
  )
})

function syncSelectedItem() {
  if (
    selectedItem.value?.type === 'shift'
    && shifts.value.some(shift => shift.id === selectedItem.value?.id)
  ) {
    return
  }

  if (
    selectedItem.value?.type === 'month'
    && monthTemplates.value.some(template => template.id === selectedItem.value?.id)
  ) {
    return
  }

  if (shifts.value.length) {
    selectedItem.value = {
      id: shifts.value[0].id,
      type: 'shift'
    }

    return
  }

  if (monthTemplates.value.length) {
    selectedItem.value = {
      id: monthTemplates.value[0].id,
      type: 'month'
    }

    return
  }

  selectedItem.value = null
}

async function fetchShifts() {
  try {
    const response: any = await api('/hris/shift/templates', {
      method: 'GET'
    })

    const data = response?.data?.data || response?.data || response || []

    shifts.value = Array.isArray(data) ? data : []
  } catch (error: any) {
    console.error(error)

    toast.add({
      title: 'Gagal',
      description: error?.response?.data?.message || 'Gagal mengambil data shift.',
      color: 'error'
    })
  }
}

async function fetchMonthTemplates() {
  try {
    const response: any = await api('/hris/shift/month-templates', {
      method: 'GET'
    })

    const data = response?.data?.data || response?.data || response || []

    monthTemplates.value = Array.isArray(data) ? data : []
  } catch (error: any) {
    console.error(error)

    toast.add({
      title: 'Gagal',
      description: error?.response?.data?.message || 'Gagal mengambil data monthly shift.',
      color: 'error'
    })
  }
}

async function refreshPage() {
  loading.value = true

  try {
    await Promise.all([
      fetchShifts(),
      fetchMonthTemplates()
    ])

    syncSelectedItem()

    if (
      !selectedItem.value
      && monthTemplates.value.length
    ) {
      const lastTemplate
        = monthTemplates.value[monthTemplates.value.length - 1]

      selectedItem.value = {
        id: lastTemplate.id,
        type: 'month'
      }
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  refreshPage()
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
              New Shift
            </span>

            <span class="sm:hidden">
              Create
            </span>
          </UButton>

          <UButton
            icon="i-lucide-calendar-plus"
            class="whitespace-nowrap"
            @click="openMonthlyShiftModal = true"
          >
            <span class="hidden sm:inline">
              New Monthly Shift
            </span>

            <span class="sm:hidden">
              Monthly
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
                v-model="selectedItem"
                :shifts="shifts"
                :month-templates="monthTemplates"
                :loading="loading"
              />

              <HrisAttendanceConfigurationShiftSummaryCard
                :shifts="shifts"
                :month-templates="monthTemplates"
              />
            </div>

            <div class="min-w-0 space-y-6 xl:col-span-8">
              <HrisAttendanceConfigurationShiftDetailForm
                v-if="selectedItem?.type === 'shift'"
                :shift="selectedRegularShift"
                @refresh="refreshPage"
              />

              <HrisAttendanceConfigurationMonthlyShiftDetailForm
                v-else-if="selectedItem?.type === 'month'"
                :template="selectedMonthTemplate"
                @refresh="refreshPage"
              />

              <UCard v-else>
                <div class="rounded-xl border border-dashed border-default p-8 text-center">
                  <p class="font-medium text-highlighted">
                    Belum ada shift dipilih
                  </p>

                  <p class="mt-1 text-sm text-muted">
                    Pilih shift dari daftar sebelah kiri.
                  </p>
                </div>
              </UCard>
            </div>
          </div>
        </div>
      </div>

      <HrisAttendanceConfigurationCreateShiftModal
        v-model:open="openCreateShift"
        @created="refreshPage"
      />

      <HrisAttendanceConfigurationMonthlyShiftModal
        v-model:open="openMonthlyShiftModal"
        @refresh="refreshPage"
      />
    </template>
  </UDashboardPanel>
</template>
