<!-- app/components/hris/attendance/schedule/AssignShiftModal.vue -->

<script setup lang="ts">
const api = useApi()
const toast = useToast()

type ShiftTemplateDay = {
  id: number
  day_of_week: number
  start_time: string | null
  end_time: string | null
  is_working: boolean
}

type ShiftTemplateResponseItem = {
  id: number
  name: string
  description: string
  status: 'active' | 'inactive' | string
  shiftTemplateDays: ShiftTemplateDay[]
}

type ShiftOption = {
  label: string
  value: number
  description: string
  status: string
  days: ShiftTemplateDay[]
}

type EmployeeOption = {
  label: string
  value: number
}

type WeeklyPreviewDay = {
  date: string
  dayName: string
  isWorking: boolean
  time: string
}

type WeeklyPreview = {
  weekNumber: number
  startDate: string
  endDate: string
  shiftTime: string
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

const employeeSearch = ref('')

const employees = ref<EmployeeOption[]>([])
const shiftOptions = ref<ShiftOption[]>([])

const form = reactive({
  employeeId: undefined as number | undefined,
  shiftTemplateId: undefined as number | undefined,
  startDate: '',
  endDate: ''
})

const selectedEmployee = computed(() => {
  return employees.value.find(employee => employee.value === form.employeeId)
})

const selectedShift = computed(() => {
  return shiftOptions.value.find(shift => shift.value === form.shiftTemplateId)
})

const canSubmit = computed(() => {
  return Boolean(
    form.employeeId
    && form.shiftTemplateId
    && form.startDate
    && form.endDate
    && form.startDate <= form.endDate
  )
})

const totalCalendarDays = computed(() => {
  if (!form.startDate || !form.endDate) return 0

  const start = new Date(form.startDate)
  const end = new Date(form.endDate)

  if (start > end) return 0

  const diff = end.getTime() - start.getTime()

  return Math.floor(diff / 86400000) + 1
})

const estimatedWorkingDays = computed(() => {
  if (!selectedShift.value || !form.startDate || !form.endDate) return 0

  const start = new Date(form.startDate)
  const end = new Date(form.endDate)

  if (start > end) return 0

  let total = 0
  const current = new Date(start)

  while (current <= end) {
    const jsDay = current.getDay()
    const apiDay = jsDay === 0 ? 7 : jsDay

    const templateDay = selectedShift.value.days.find((day) => {
      return day.day_of_week === apiDay
    })

    if (templateDay?.is_working) {
      total++
    }

    current.setDate(current.getDate() + 1)
  }

  return total
})

const weeklyPreview = computed<WeeklyPreview[]>(() => {
  if (!selectedShift.value || !form.startDate || !form.endDate) {
    return []
  }

  const start = new Date(form.startDate)
  const end = new Date(form.endDate)

  const result: WeeklyPreview[] = []

  let weekNumber = 1
  const current = new Date(start)

  const firstWorkingDay = selectedShift.value.days.find(
    day => day.is_working
  )

  const shiftTime = firstWorkingDay
    ? `${firstWorkingDay.start_time} - ${firstWorkingDay.end_time}`
    : 'Libur'

  while (current <= end) {
    const weekStart = new Date(current)
    const weekEnd = new Date(current)

    weekEnd.setDate(weekEnd.getDate() + 6)

    if (weekEnd > end) {
      weekEnd.setTime(end.getTime())
    }

    result.push({
      weekNumber,
      startDate: formatYmd(weekStart),
      endDate: formatYmd(weekEnd),
      shiftTime
    })

    current.setDate(current.getDate() + 7)
    weekNumber++
  }

  return result
})

function formatYmd(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getDefaultStartDate() {
  const today = new Date()
  return formatYmd(today)
}

function getDefaultEndDate() {
  const today = new Date()
  return `${today.getFullYear()}-12-31`
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

function getDayTime(day: ShiftTemplateDay) {
  if (!day.start_time || !day.end_time) return 'Libur'

  return `${day.start_time} - ${day.end_time}`
}

function setDefaultDates() {
  form.startDate = getDefaultStartDate()
  form.endDate = getDefaultEndDate()
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
      data: ShiftTemplateResponseItem[]
    }>('/hris/shift/templates')

    shiftOptions.value = response.data.data
      .filter(item => item.status === 'active')
      .map(item => ({
        label: item.name,
        value: item.id,
        description: item.description,
        status: item.status,
        days: item.shiftTemplateDays
      }))
  } catch (error) {
    console.error(error)
    shiftOptions.value = []
  } finally {
    loadingShift.value = false
  }
}

function resetForm() {
  Object.assign(form, {
    employeeId: undefined,
    shiftTemplateId: undefined,
    startDate: '',
    endDate: ''
  })

  employeeSearch.value = ''
}

async function submit() {
  if (!canSubmit.value) return

  loading.value = true

  const payload = {
    employee_id: form.employeeId,
    template_id: form.shiftTemplateId,
    start_date: form.startDate,
    end_date: form.endDate
  }

  try {
    await api.post('/hris/shift/assignments', payload)
    await api.post('/hris/shift/schedules/generate', payload)

    toast.add({
      title: 'Berhasil',
      description: 'Shift karyawan berhasil disimpan dan schedule berhasil digenerate.',
      color: 'success'
    })

    emit('refresh')
    open.value = false
    resetForm()
  } catch (error) {
    console.error(error)

    toast.add({
      title: 'Gagal',
      description: 'Shift karyawan gagal disimpan atau schedule gagal digenerate.',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

watch(open, (value) => {
  if (value) {
    setDefaultDates()
    loadEmployees()
    loadShiftTemplates()
  } else {
    resetForm()
  }
})
</script>

<template>
  <UModal
    v-model:open="open"
    title="Assign Shift"
    description="Tambahkan jadwal shift karyawan berdasarkan template dan range tanggal."
    :ui="{
      content: 'sm:max-w-6xl'
    }"
  >
    <template #body>
      <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
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

          <UFormField
            label="Shift"
            required
          >
            <USelect
              v-model="form.shiftTemplateId"
              :items="shiftOptions"
              :loading="loadingShift"
              label-key="label"
              value-key="value"
              placeholder="Pilih shift"
              class="w-full"
            />
          </UFormField>

          <div
            v-if="selectedShift"
            class="rounded-xl border border-default bg-muted/30 p-4"
          >
            <p class="text-sm font-semibold text-highlighted">
              {{ selectedShift.label }}
            </p>

            <p class="mt-1 text-sm text-muted">
              {{ selectedShift.description }}
            </p>

            <div class="mt-3 grid gap-2 sm:grid-cols-2">
              <div
                v-for="day in selectedShift.days"
                :key="day.id"
                class="rounded-lg border border-default px-3 py-2 text-sm"
                :class="day.is_working ? 'bg-default' : 'bg-muted/40'"
              >
                <div class="flex items-center justify-between gap-2">
                  <span>
                    {{ getDayName(day.day_of_week) }}
                  </span>

                  <UBadge
                    :color="day.is_working ? 'primary' : 'neutral'"
                    variant="soft"
                    size="xs"
                  >
                    {{ day.is_working ? getDayTime(day) : 'Libur' }}
                  </UBadge>
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside class="rounded-xl border border-default bg-elevated p-4">
          <div class="mb-4 flex items-center gap-2">
            <UIcon
              name="i-lucide-calendar-days"
              class="size-5 text-primary"
            />

            <p class="text-sm font-semibold text-highlighted">
              Preview Per Minggu
            </p>
          </div>

          <div
            v-if="!weeklyPreview.length"
            class="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-default text-sm text-muted"
          >
            Pilih shift dan tanggal terlebih dahulu.
          </div>

          <div
            v-else
            class="space-y-3"
          >
            <div
              v-for="week in weeklyPreview"
              :key="week.weekNumber"
              class="rounded-xl border border-default p-4"
            >
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-semibold text-highlighted">
                    Minggu {{ week.weekNumber }}
                  </p>

                  <p class="text-sm text-muted">
                    {{ week.startDate }} s/d {{ week.endDate }}
                  </p>
                </div>

                <UBadge
                  color="primary"
                  variant="soft"
                >
                  {{ week.shiftTime }}
                </UBadge>
              </div>
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
          icon="i-lucide-save"
          class="justify-center"
          :loading="loading"
          :disabled="!canSubmit"
          @click="submit"
        >
          Simpan Shift
        </UButton>
      </div>
    </template>
  </UModal>
</template>
