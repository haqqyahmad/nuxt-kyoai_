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

type AssignmentForm = {
  shiftTemplateId: number | undefined
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

const employeeSearch = ref('')
const employees = ref<EmployeeOption[]>([])
const shiftOptions = ref<ShiftOption[]>([])

const selectedMonth = ref('')

const form = reactive({
  employeeId: undefined as number | undefined,
  assignments: [] as AssignmentForm[]
})

const canSubmit = computed(() => {
  return Boolean(
    form.employeeId
    && form.assignments.length
    && form.assignments.every(item =>
      item.shiftTemplateId
      && item.startDate
      && item.endDate
      && item.startDate <= item.endDate
    )
  )
})

function formatYmd(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getCurrentMonthValue() {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
}

function getStartOfWeek(date: Date) {
  const start = new Date(date)
  const day = start.getDay()
  const diff = day === 0 ? -6 : 1 - day

  start.setDate(start.getDate() + diff)

  return start
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

function getSelectedShift(shiftTemplateId?: number) {
  return shiftOptions.value.find(shift => shift.value === shiftTemplateId)
}

function generateWeeklyAssignments() {
  if (!selectedMonth.value) return

  const [year, month] = selectedMonth.value.split('-').map(Number)

  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month, 0)

  const result: AssignmentForm[] = []
  const current = getStartOfWeek(monthStart)

  while (current <= monthEnd) {
    const weekStart = new Date(current)
    const weekEnd = new Date(current)

    weekEnd.setDate(weekStart.getDate() + 6)

    result.push({
      shiftTemplateId: undefined,
      startDate: formatYmd(weekStart),
      endDate: formatYmd(weekEnd)
    })

    current.setDate(current.getDate() + 7)
  }

  form.assignments = result
}

function resetForm() {
  form.employeeId = undefined
  form.assignments = []
  employeeSearch.value = ''
  selectedMonth.value = ''
}

function setDefaultForm() {
  selectedMonth.value = getCurrentMonthValue()
  generateWeeklyAssignments()
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

async function submit() {
  if (!canSubmit.value) return

  loading.value = true

  try {
    for (const item of form.assignments) {
      const payload = {
        employee_id: form.employeeId,
        template_id: item.shiftTemplateId,
        start_date: item.startDate,
        end_date: item.endDate
      }

      await api.post('/hris/shift/assignments', payload)
      await api.post('/hris/shift/schedules/generate', payload)
    }

    toast.add({
      title: 'Berhasil',
      description: 'Shift mingguan karyawan berhasil disimpan.',
      color: 'success'
    })

    emit('refresh')
    open.value = false
    resetForm()
  } catch (error) {
    console.error(error)

    toast.add({
      title: 'Gagal',
      description: 'Shift mingguan karyawan gagal disimpan.',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

watch(selectedMonth, () => {
  if (open.value) {
    generateWeeklyAssignments()
  }
})

watch(open, (value) => {
  if (value) {
    setDefaultForm()
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
    title="Assign Weekly Shift"
    description="Atur shift berbeda setiap minggu untuk satu karyawan."
    :ui="{
      content: 'sm:max-w-7xl'
    }"
  >
    <template #body>
      <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div class="space-y-5">
          <UFormField label="Employee" required>
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

          <div class="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <UFormField label="Bulan" required>
              <UInput
                v-model="selectedMonth"
                type="month"
                class="w-full"
              />
            </UFormField>

            <UButton
              icon="i-lucide-refresh-cw"
              variant="soft"
              class="justify-center"
              @click="generateWeeklyAssignments"
            >
              Generate Mingguan
            </UButton>
          </div>

          <div class="space-y-4">
            <div
              v-for="(assignment, index) in form.assignments"
              :key="index"
              class="rounded-xl border border-default bg-muted/20 p-4"
            >
              <div class="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p class="font-medium text-highlighted">
                    Minggu {{ index + 1 }}
                  </p>

                  <p class="text-sm text-muted">
                    {{ assignment.startDate }} s/d {{ assignment.endDate }}
                  </p>
                </div>
              </div>

              <UFormField label="Shift Template" required>
                <USelect
                  v-model="assignment.shiftTemplateId"
                  :items="shiftOptions"
                  :loading="loadingShift"
                  label-key="label"
                  value-key="value"
                  placeholder="Pilih shift untuk minggu ini"
                  class="w-full"
                />
              </UFormField>

              <div
                v-if="getSelectedShift(assignment.shiftTemplateId)"
                class="mt-4 rounded-xl border border-default bg-default p-4"
              >
                <p class="text-sm font-semibold text-highlighted">
                  {{ getSelectedShift(assignment.shiftTemplateId)?.label }}
                </p>

                <p class="mt-1 text-sm text-muted">
                  {{ getSelectedShift(assignment.shiftTemplateId)?.description }}
                </p>

                <div class="mt-3 grid gap-2 sm:grid-cols-2">
                  <div
                    v-for="day in getSelectedShift(assignment.shiftTemplateId)?.days"
                    :key="day.id"
                    class="rounded-lg border border-default px-3 py-2 text-sm"
                    :class="day.is_working ? 'bg-primary/5' : 'bg-muted/40'"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <span>{{ getDayName(day.day_of_week) }}</span>

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
          </div>
        </div>

        <aside class="rounded-xl border border-default bg-elevated p-4">
          <div class="mb-4 flex items-center gap-2">
            <UIcon
              name="i-lucide-calendar-days"
              class="size-5 text-primary"
            />

            <p class="text-sm font-semibold text-highlighted">
              Preview Mingguan
            </p>
          </div>

          <div
            v-if="!form.assignments.length"
            class="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-default px-4 text-center text-sm text-muted"
          >
            Pilih bulan terlebih dahulu.
          </div>

          <div
            v-else
            class="max-h-[620px] space-y-3 overflow-y-auto pr-1"
          >
            <div
              v-for="(assignment, index) in form.assignments"
              :key="index"
              class="rounded-xl border border-default bg-default p-4 transition hover:bg-muted/30"
            >
              <div class="flex items-start gap-3">
                <div class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {{ index + 1 }}
                </div>

                <div class="min-w-0">
                  <p class="font-semibold text-highlighted">
                    Minggu {{ index + 1 }}
                  </p>

                  <p class="mt-1 text-sm text-muted">
                    {{ assignment.startDate }} s/d {{ assignment.endDate }}
                  </p>

                  <p class="mt-2 text-sm font-medium text-highlighted">
                    {{ getSelectedShift(assignment.shiftTemplateId)?.label ?? 'Belum pilih shift' }}
                  </p>
                </div>
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
          Simpan Shift Mingguan
        </UButton>
      </div>
    </template>
  </UModal>
</template>
