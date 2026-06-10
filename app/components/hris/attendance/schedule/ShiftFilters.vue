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
    return 'Pilih range tanggal'
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
  <UCard>
    <div class="flex flex-col gap-3 lg:flex-row lg:items-end">
      <USelectMenu
        v-model="employeeId"
        v-model:search-term="employeeSearch"
        :items="employees"
        :loading="loadingEmployee"
        label-key="label"
        value-key="value"
        searchable
        placeholder="Cari nama karyawan"
        class="w-full lg:w-80"
        @update:search-term="loadEmployees"
      />

      <UPopover>
        <UButton
          icon="i-lucide-calendar-days"
          color="neutral"
          variant="outline"
          class="w-full justify-start lg:w-72"
        >
          {{ dateLabel }}
        </UButton>

        <template #content>
          <UCalendar
            v-model="dateRange"
            range
            class="p-2"
          />
        </template>
      </UPopover>

      <UButton
        icon="i-lucide-search"
        class="w-full justify-center lg:w-auto"
        :disabled="!canSearch"
        @click="onSearch"
      >
        Search
      </UButton>
    </div>
  </UCard>
</template>
