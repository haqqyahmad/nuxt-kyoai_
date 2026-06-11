<!-- app/components/hris/attendance/schedule/AssignShiftModal.vue -->

<script setup lang="ts">
const api = useApi()
const toast = useToast()

type EmployeeOption = {
  label: string
  value: number
}

type MonthTemplateWeek = {
  id?: number
  week_number: number
  shift_template_id: number
  shiftTemplate?: {
    id: number
    name: string
    description?: string | null
  }
}

type MonthTemplateOption = {
  label: string
  value: number
  description?: string | null
  weeks: MonthTemplateWeek[]
}

type WeekDateRange = {
  weekNumber: number
  startDate: string
  endDate: string
}

const emit = defineEmits<{
  refresh: []
}>()

const open = defineModel<boolean>('open', {
  default: false
})

const loading = ref(false)
const loadingEmployee = ref(false)
const loadingMonthTemplate = ref(false)

const employeeSearch = ref('')
const employees = ref<EmployeeOption[]>([])
const monthTemplates = ref<MonthTemplateOption[]>([])

const form = reactive({
  employeeId: undefined as string | undefined,
  monthTemplateId: undefined as number | undefined,
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear()
})

const monthItems = [
  { label: 'January', value: 1 },
  { label: 'February', value: 2 },
  { label: 'March', value: 3 },
  { label: 'April', value: 4 },
  { label: 'May', value: 5 },
  { label: 'June', value: 6 },
  { label: 'July', value: 7 },
  { label: 'August', value: 8 },
  { label: 'September', value: 9 },
  { label: 'October', value: 10 },
  { label: 'November', value: 11 },
  { label: 'December', value: 12 }
]

const selectedEmployee = computed(() => {
  return employees.value.find(employee => employee.value === form.employeeId)
})

const selectedMonthTemplate = computed(() => {
  return monthTemplates.value.find(template => template.value === form.monthTemplateId)
})

const selectedMonthLabel = computed(() => {
  return monthItems.find(month => month.value === Number(form.month))?.label ?? '-'
})

const selectedDateRange = computed(() => {
  if (!form.month || !form.year) return '-'

  const start = new Date(Number(form.year), Number(form.month) - 1, 1)
  const end = new Date(Number(form.year), Number(form.month), 0)

  return `${formatDisplayDate(start)} - ${formatDisplayDate(end)}`
})

const weekDateRanges = computed<WeekDateRange[]>(() => {
  if (!form.month || !form.year) return []

  const monthStart = new Date(Number(form.year), Number(form.month) - 1, 1)
  const monthEnd = new Date(Number(form.year), Number(form.month), 0)

  const ranges: WeekDateRange[] = []
  const current = getStartOfWeek(monthStart)

  let weekNumber = 1

  while (current <= monthEnd) {
    const weekStart = new Date(current)
    const weekEnd = new Date(current)

    weekEnd.setDate(weekStart.getDate() + 6)

    ranges.push({
      weekNumber,
      startDate: formatDisplayDate(weekStart),
      endDate: formatDisplayDate(weekEnd)
    })

    current.setDate(current.getDate() + 7)
    weekNumber++
  }

  return ranges
})

const canSubmit = computed(() => {
  return Boolean(
    form.employeeId
    && form.monthTemplateId
    && form.month
    && form.year
  )
})

function formatDisplayDate(date: Date) {
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

function getStartOfWeek(date: Date) {
  const start = new Date(date)
  const day = start.getDay()
  const diff = day === 0 ? -6 : 1 - day

  start.setDate(start.getDate() + diff)

  return start
}

function getWeekDateRange(weekNumber: number) {
  return weekDateRanges.value.find(week => week.weekNumber === weekNumber)
}

function resetForm() {
  const today = new Date()

  form.employeeId = undefined
  form.monthTemplateId = undefined
  form.month = today.getMonth() + 1
  form.year = today.getFullYear()

  employeeSearch.value = ''
}

async function loadEmployees(search = '') {
  loadingEmployee.value = true

  try {
    const response = await api.get<{
      data: {
        id: number
        nama?: string
        name?: string
      }[]
    }>('/hris/employees', {
      params: { search }
    })

    employees.value = response.data.data.map(employee => ({
      label: employee.nama ?? employee.name ?? `Employee ${employee.id}`,
      value: employee.id
    }))
  } catch (error) {
    console.error(error)
    employees.value = []
  } finally {
    loadingEmployee.value = false
  }
}

async function loadMonthTemplates() {
  loadingMonthTemplate.value = true

  try {
    const response = await api.get<{
      data: {
        id: number
        name: string
        description?: string | null
        status: string
        weeks?: MonthTemplateWeek[]
      }[]
    }>('/hris/shift/month-templates')

    monthTemplates.value = response.data.data
      .filter(item => item.status === 'active')
      .map(item => ({
        label: item.name,
        value: item.id,
        description: item.description || '',
        weeks: item.weeks || []
      }))
  } catch (error) {
    console.error(error)
    monthTemplates.value = []
  } finally {
    loadingMonthTemplate.value = false
  }
}

async function submit() {
  if (!canSubmit.value) return

  loading.value = true

  const payload = {
    employee_id: form.employeeId,
    month: Number(form.month),
    year: Number(form.year),
    month_template_id: form.monthTemplateId
  }

  try {
    console.log('GENERATE MONTHLY SHIFT:', payload)

    await api.post('/hris/shift/schedules/generate-monthly', payload)

    toast.add({
      title: 'Berhasil',
      description: 'Monthly shift berhasil digenerate.',
      color: 'success'
    })

    emit('refresh')
    open.value = false
    resetForm()
  } catch (error: any) {
    console.error(error)

    toast.add({
      title: 'Gagal',
      description: error?.response?.data?.message || 'Generate monthly shift gagal.',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

watch(open, (value) => {
  if (value) {
    loadEmployees()
    loadMonthTemplates()
  } else {
    resetForm()
  }
})
</script>

<template>
  <UModal
    v-model:open="open"
    title="Assign Monthly Shift"
    description="Assign monthly shift template ke karyawan."
    :ui="{
      content: 'sm:max-w-5xl'
    }"
  >
    <template #body>
      <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div class="space-y-5">
          <UFormField
            label="Employee"
            required
          >
            <USelectMenu
              v-model="form.employeeId"
              v-model:search-term="employeeSearch"
              :items="employees"
              :loading="loadingEmployee"
              label-key="label"
              value-key="value"
              searchable
              placeholder="Cari karyawan"
              class="w-full"
              @update:search-term="loadEmployees"
            />
          </UFormField>

          <UFormField
            label="Monthly Template"
            required
          >
            <USelect
              v-model="form.monthTemplateId"
              :items="monthTemplates"
              :loading="loadingMonthTemplate"
              label-key="label"
              value-key="value"
              placeholder="Pilih monthly template"
              class="w-full"
            />
          </UFormField>

          <div class="grid gap-4 md:grid-cols-2">
            <UFormField
              label="Month"
              required
            >
              <USelect
                v-model="form.month"
                :items="monthItems"
                label-key="label"
                value-key="value"
                placeholder="Pilih bulan"
                class="w-full"
              />
            </UFormField>

            <UFormField
              label="Year"
              required
            >
              <UInput
                v-model="form.year"
                type="number"
                min="2025"
                max="2050"
                class="w-full"
              />
            </UFormField>
          </div>
        </div>

        <aside class="rounded-xl border border-default bg-elevated p-4">
          <div class="mb-4 flex items-center gap-2">
            <UIcon
              name="i-lucide-calendar-days"
              class="size-5 text-primary"
            />

            <p class="text-sm font-semibold text-highlighted">
              Preview Generate
            </p>
          </div>

          <div class="space-y-4">
            <div
              v-if="selectedMonthTemplate?.weeks?.length"
              class="space-y-2"
            >
              <div class="flex items-center justify-between gap-3">
                <p class="text-xs font-semibold text-muted">
                  Rotation Detail
                </p>

                <UBadge
                  color="info"
                  variant="soft"
                  size="xs"
                >
                  {{ selectedMonthTemplate.weeks.length }} Weeks
                </UBadge>
              </div>

              <div
                v-for="week in selectedMonthTemplate.weeks"
                :key="week.id ?? week.week_number"
                class="rounded-lg border border-default bg-default px-3 py-2 text-sm"
              >
                <div class="space-y-2">
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <p class="font-medium text-highlighted">
                        Minggu {{ week.week_number }}
                      </p>

                      <p class="mt-1 text-xs text-muted">
                        {{
                          getWeekDateRange(week.week_number)?.startDate
                            ?? '-'
                        }}
                        s/d
                        {{
                          getWeekDateRange(week.week_number)?.endDate
                            ?? '-'
                        }}
                      </p>
                    </div>

                    <UBadge
                      color="info"
                      variant="soft"
                      size="xs"
                    >
                      Rotation
                    </UBadge>
                  </div>

                  <div class="rounded-md bg-muted/40 px-3 py-2">
                    <p class="text-xs font-medium text-highlighted">
                      {{ week.shiftTemplate?.name ?? `Shift #${week.shift_template_id}` }}
                    </p>

                    <p
                      v-if="week.shiftTemplate?.description"
                      class="mt-1 text-xs text-muted"
                    >
                      {{ week.shiftTemplate.description }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div
              v-else
              class="rounded-xl border border-dashed border-default p-4 text-center text-sm text-muted"
            >
              Pilih monthly template untuk melihat preview rotasi.
            </div>
          </div>
        </aside>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <UButton
          color="neutral"
          variant="outline"
          class="justify-center"
          :disabled="loading"
          @click="open = false"
        >
          Batal
        </UButton>

        <UButton
          icon="i-lucide-calendar-check"
          class="justify-center"
          :loading="loading"
          :disabled="!canSubmit"
          @click="submit"
        >
          Generate Monthly Shift
        </UButton>
      </div>
    </template>
  </UModal>
</template>
