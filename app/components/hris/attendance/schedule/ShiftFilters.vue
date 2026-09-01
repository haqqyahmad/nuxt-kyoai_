<!-- app/components/hris/attendance/schedule/ShiftFilters.vue -->

<script setup lang="ts">
import { CalendarDate } from '@internationalized/date'

const api = useApi()

type EmployeeOption = {
  label: string
  value: number
}

type DateRange = {
  start: CalendarDate | null
  end: CalendarDate | null
}

const employeeId = defineModel<number | null>('employeeId', {
  default: null
})

const dateRange = defineModel<DateRange>('dateRange', {
  default: () => ({
    start: null,
    end: null
  })
})

const emit = defineEmits<{
  search: []
}>()

const employees = ref<EmployeeOption[]>([])
const loadingEmployee = ref(false)
const employeeSearch = ref('')

const canSearch = computed(() => {
  return Boolean(employeeId.value && dateRange.value.start && dateRange.value.end)
})

const dateLabel = computed(() => {
  if (!dateRange.value.start || !dateRange.value.end) {
    return 'Select date range'
  }

  return `${dateRange.value.start.toString()} - ${dateRange.value.end.toString()}`
})

async function loadEmployees(search = '') {
  loadingEmployee.value = true

  try {
    const response = await api.get<{ data: any[] }>('/hris/employees', {
      params: { search }
    })

    employees.value = response.data.data.map(item => ({
      label: item.name ?? item.nama ?? `Employee ${item.id}`,
      value: item.id
    }))
  } finally {
    loadingEmployee.value = false
  }
}

function setDefaultDateRange() {
  dateRange.value = {
    start: new CalendarDate(2025, 6, 1),
    end: new CalendarDate(2025, 6, 30)
  }
}

function onSearch() {
  if (!canSearch.value) return

  emit('search')
}

onMounted(() => {
  loadEmployees()

  if (!dateRange.value.start || !dateRange.value.end) {
    setDefaultDateRange()
  }
})
</script>

<template>
  <UCard
    variant="subtle"
    class="overflow-hidden"
  >
    <div class="mb-4 flex items-center justify-between gap-3">
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-muted">
          Filter Schedule
        </p>

        <h3 class="mt-1 text-lg font-semibold text-highlighted">
          Find Employee Shift
        </h3>
      </div>

      <UIcon
        name="i-lucide-sliders-horizontal"
        class="size-5 text-muted"
      />
    </div>

    <div class="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_280px_auto] lg:items-end">
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-highlighted">
          Employee
        </label>

        <USelectMenu
          v-model="employeeId"
          v-model:search-term="employeeSearch"
          :items="employees"
          :loading="loadingEmployee"
          label-key="label"
          value-key="value"
          searchable
          placeholder="Search employee name"
          class="w-full"
          @update:search-term="loadEmployees"
        />
      </div>

      <div class="space-y-1.5">
        <label class="text-sm font-medium text-highlighted">
          Date Range
        </label>

        <UPopover>
          <UButton
            icon="i-lucide-calendar-days"
            color="neutral"
            variant="outline"
            class="w-full justify-start"
          >
            <span class="truncate">
              {{ dateLabel }}
            </span>
          </UButton>

          <template #content>
            <div class="p-3">
              <UCalendar
                v-model="dateRange"
                range
              />
            </div>
          </template>
        </UPopover>
      </div>

      <UButton
        icon="i-lucide-search"
        size="lg"
        class="w-full justify-center lg:w-auto"
        :disabled="!canSearch"
        @click="onSearch"
      >
        Search
      </UButton>
    </div>
  </UCard>
</template>
