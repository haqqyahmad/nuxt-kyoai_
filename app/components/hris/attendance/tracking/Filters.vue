<script setup lang="ts">
const api = useApi()

const emit = defineEmits<{
  view: []
  uploadAttendance: []
  changeValue: []
  print: []
  exportExcel: []
}>()

const employeeId = defineModel<string>('employeeId', {
  default: ''
})

const start = defineModel<string>('start', {
  default: '2026-06-01'
})

const end = defineModel<string>('end', {
  default: '2026-06-30'
})

type Employee = {
  id: number | string
  nama?: string
  employee_name?: string
  full_name?: string
}

const loadingEmployees = ref(false)
const employees = ref<Employee[]>([])

const employeeItems = computed(() => {
  return employees.value.map(employee => ({
    label:
      employee.nama
      || employee.employee_name
      || employee.full_name
      || `Employee ${employee.id}`,
    value: String(employee.id)
  }))
})

async function loadEmployees() {
  loadingEmployees.value = true

  try {
    const res = await api.get('/hris/employees')

    employees.value = res.data?.data ?? []
  } catch (error) {
    console.error(error)
    employees.value = []
  } finally {
    loadingEmployees.value = false
  }
}

onMounted(loadEmployees)
</script>

<template>
  <UCard>
    <div class="space-y-6">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <div class="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UIcon name="i-lucide-filter" class="size-5" />
            </div>

            <h2 class="text-base font-semibold text-highlighted">
              Filter Attendance Report
            </h2>
          </div>

          <p class="text-sm text-muted">
            Pilih karyawan dan periode tanggal untuk menampilkan report absensi.
          </p>
        </div>

        <UBadge
          color="primary"
          variant="soft"
          icon="i-lucide-calendar-search"
          class="w-fit"
        >
          Report Filter
        </UBadge>
      </div>

      <div class="grid gap-4 lg:grid-cols-12">
        <UFormField label="Employee" required class="lg:col-span-6">
          <USelect
            v-model="employeeId"
            :items="employeeItems"
            :loading="loadingEmployees"
            icon="i-lucide-user"
            placeholder="Pilih employee"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Start Date" required class="lg:col-span-3">
          <UInput
            v-model="start"
            type="date"
            icon="i-lucide-calendar-days"
            class="w-full"
          />
        </UFormField>

        <UFormField label="End Date" required class="lg:col-span-3">
          <UInput
            v-model="end"
            type="date"
            icon="i-lucide-calendar-check"
            class="w-full"
          />
        </UFormField>
      </div>

      <div class="border-t border-default pt-4">
        <HrisAttendanceTrackingAction
          @view="emit('view')"
          @upload-attendance="emit('uploadAttendance')"
          @change-value="emit('changeValue')"
          @print="emit('print')"
          @export-excel="emit('exportExcel')"
        />
      </div>
    </div>
  </UCard>
</template>
