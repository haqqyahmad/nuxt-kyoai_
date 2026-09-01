<!-- app/components/hris/attendance/schedule/AssignShiftModal.vue -->

<script setup lang="ts">
const api = useApi()
const toast = useToast()

type EmployeeOption = {
  label: string
  value: number
}

type ShiftTemplateDay = {
  id: number
  day_of_week: number
  start_time: string | null
  end_time: string | null
  is_working: boolean
}

type ShiftOption = {
  label: string
  value: number
  description?: string | null
  days: ShiftTemplateDay[]
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
const loadingShift = ref(false)
const loadingMonthTemplate = ref(false)

const useMonthlyTemplate = ref(false)
const employeeSearch = ref('')

const employees = ref<EmployeeOption[]>([])
const shiftOptions = ref<ShiftOption[]>([])
const monthTemplates = ref<MonthTemplateOption[]>([])

const form = reactive({
  employeeId: undefined as number | undefined,

  shiftTemplateId: undefined as number | undefined,
  startDate: '',
  endDate: '',

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

const selectedShift = computed(() => {
  return shiftOptions.value.find(shift => shift.value === form.shiftTemplateId)
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
  if (!form.employeeId) return false

  if (useMonthlyTemplate.value) {
    return Boolean(
      form.monthTemplateId
      && form.month
      && form.year
    )
  }

  return Boolean(
    form.shiftTemplateId
    && form.startDate
    && form.endDate
    && form.startDate <= form.endDate
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

function formatWorkingDay(day: ShiftTemplateDay) {
  if (!day.start_time || !day.end_time) return 'Libur'
  return `${day.start_time} - ${day.end_time}`
}

function getDayName(dayOfWeek: number) {
  const days: Record<number, string> = {
    1: 'Senin',
    2: 'Selasa',
    3: 'Rabu',
    4: 'Kamis',
    5: 'Jumat',
    6: 'Sabtu',
    7: 'Minggu'
  }

  return days[dayOfWeek] ?? '-'
}

function getDefaultStartDate() {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`
}

function getDefaultEndDate() {
  const today = new Date()
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
}

function resetForm() {
  const today = new Date()

  form.employeeId = undefined

  form.shiftTemplateId = undefined
  form.startDate = getDefaultStartDate()
  form.endDate = getDefaultEndDate()

  form.monthTemplateId = undefined
  form.month = today.getMonth() + 1
  form.year = today.getFullYear()

  employeeSearch.value = ''
  useMonthlyTemplate.value = false
}

function toIsoDateTime(date: string) {
  return new Date(`${date}T00:00:00.000Z`).toISOString()
}

function getMonthlyStartDate() {
  return `${form.year}-${String(form.month).padStart(2, '0')}-01`
}

function getMonthlyEndDate() {
  const lastDay = new Date(Number(form.year), Number(form.month), 0).getDate()

  return `${form.year}-${String(form.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
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

async function loadShiftTemplates() {
  loadingShift.value = true

  try {
    const response = await api.get<{
      data: {
        id: number
        name: string
        description?: string | null
        status: string
        shiftTemplateDays: ShiftTemplateDay[]
      }[]
    }>('/hris/shift/templates')

    shiftOptions.value = response.data.data
      .filter(item => item.status === 'active')
      .map(item => ({
        label: item.name,
        value: item.id,
        description: item.description || '',
        days: item.shiftTemplateDays || []
      }))
  } catch (error) {
    console.error(error)
    shiftOptions.value = []
  } finally {
    loadingShift.value = false
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

async function submitWeekly() {
  const payload = {
    employee_id: form.employeeId,
    template_id: form.shiftTemplateId,
    start_date: form.startDate,
    end_date: form.endDate
  }

  await api.post('/hris/shift/assignments', payload)
  await api.post('/hris/shift/schedules/generate', payload)
}

async function submitMonthly() {
  const assignmentPayload = {
    employee_id: form.employeeId,
    template_id: form.monthTemplateId,
    start_date: getMonthlyStartDate(),
    end_date: getMonthlyEndDate()
  }

  await api.post('/hris/shift/assignments', assignmentPayload)

  const generatePayload = {
    employee_id: form.employeeId,
    month: Number(form.month),
    year: Number(form.year),
    month_template_id: form.monthTemplateId
  }

  await api.post('/hris/shift/schedules/generate-monthly', generatePayload)
}

async function submit() {
  if (!canSubmit.value) return

  loading.value = true

  try {
    if (useMonthlyTemplate.value) {
      await submitMonthly()
    } else {
      await submitWeekly()
    }

    toast.add({
      title: 'Berhasil',
      description: useMonthlyTemplate.value
        ? 'Monthly shift berhasil digenerate.'
        : 'Weekly shift berhasil disimpan.',
      color: 'success'
    })

    emit('refresh')
    open.value = false
    resetForm()
  } catch (error: any) {
    console.error(error)

    toast.add({
      title: 'Gagal',
      description: error?.response?.data?.message || 'Generate shift gagal.',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

watch(open, (value) => {
  if (value) {
    resetForm()
    loadEmployees()
    loadShiftTemplates()
    loadMonthTemplates()
  } else {
    resetForm()
  }
})
</script>

<template>
  <UModal
    v-model:open="open"
    title="Assign Shift"
    description="Assign regular shift atau monthly rotation ke karyawan."
    :ui="{
      content: 'sm:max-w-6xl'
    }"
  >
    <template #body>
      <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div class="space-y-5">
          <div class="rounded-xl border border-default bg-muted/30 p-4">
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="text-sm font-semibold text-highlighted">
                  Monthly Rotation
                </p>

                <p class="mt-1 text-xs text-muted">
                  Aktifkan jika ingin menggunakan Monthly Shift Template.
                </p>
              </div>

              <USwitch v-model="useMonthlyTemplate" />
            </div>
          </div>

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

          <template v-if="!useMonthlyTemplate">
            <UFormField
              label="Shift Template"
              required
            >
              <USelect
                v-model="form.shiftTemplateId"
                :items="shiftOptions"
                :loading="loadingShift"
                label-key="label"
                value-key="value"
                placeholder="Pilih shift template"
                class="w-full"
              />
            </UFormField>

            <div class="grid gap-4 md:grid-cols-2">
              <UFormField
                label="Start Date"
                required
              >
                <UInput
                  v-model="form.startDate"
                  type="date"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                label="End Date"
                required
              >
                <UInput
                  v-model="form.endDate"
                  type="date"
                  class="w-full"
                />
              </UFormField>
            </div>

            <UAlert
              v-if="form.startDate && form.endDate && form.startDate > form.endDate"
              color="error"
              variant="soft"
              title="Tanggal tidak valid"
              description="End Date tidak boleh lebih kecil dari Start Date."
            />
          </template>

          <template v-else>
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
          </template>
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
            <template v-if="!useMonthlyTemplate">
              <div>
                <p class="text-xs font-semibold text-muted">
                  Shift Description
                </p>

                <p
                  v-if="selectedShift?.description"
                  class="mt-1 text-sm font-medium text-highlighted"
                >
                  {{ selectedShift.description }}
                </p>
              </div>

              <div
                v-if="selectedShift?.days?.length"
                class="space-y-2"
              >
                <div class="flex items-center justify-between gap-3">
                  <p class="text-xs font-semibold text-muted">
                    Working Days
                  </p>

                  <UBadge
                    color="primary"
                    variant="soft"
                    size="xs"
                  >
                    {{ selectedShift.days.filter(day => day.is_working).length }} Days
                  </UBadge>
                </div>

                <div
                  v-for="day in selectedShift.days"
                  :key="day.id"
                  class="rounded-lg border border-default bg-default px-3 py-2 text-sm"
                >
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <p class="font-medium text-highlighted">
                        {{ getDayName(day.day_of_week) }}
                      </p>

                      <p class="mt-1 text-xs text-muted">
                        {{ day.is_working ? formatWorkingDay(day) : 'Libur' }}
                      </p>
                    </div>

                    <UBadge
                      :color="day.is_working ? 'primary' : 'neutral'"
                      variant="soft"
                      size="xs"
                    >
                      {{ day.is_working ? 'Working' : 'Off' }}
                    </UBadge>
                  </div>
                </div>
              </div>

              <div
                v-else
                class="rounded-xl border border-dashed border-default p-4 text-center text-sm text-muted"
              >
                Pilih shift template untuk melihat preview.
              </div>
            </template>

            <template v-else>
              <div>
                <p class="text-xs font-semibold text-muted">
                  Monthly Description
                </p>

                <p
                  v-if="selectedMonthTemplate?.description"
                  class="mt-1 text-sm font-medium text-highlighted"
                >
                  {{ selectedMonthTemplate.description }}
                </p>
              </div>

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
            </template>
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
          :icon="useMonthlyTemplate ? 'i-lucide-calendar-check' : 'i-lucide-save'"
          class="justify-center"
          :loading="loading"
          :disabled="!canSubmit"
          @click="submit"
        >
          {{ useMonthlyTemplate ? 'Generate Monthly Shift' : 'Assign Weekly Shift' }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
