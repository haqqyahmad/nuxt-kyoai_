<!-- app/components/hris/attendance/schedule/AssignShiftModal.vue -->

<script setup lang="ts">
type ShiftTypeValue
  = | 'morning-shift'
    | 'evening-shift'
    | 'night-shift'
    | 'flexi-time'

type ShiftOption = {
  label: string
  value: ShiftTypeValue
  description: string
  type: 'FIXED' | 'FLEXI'
}

type WeekSchedule = {
  weekNumber: number
  week: string
  startDate: string
  endDate: string
  dateRange: string
  totalDays: number
  workingDays: number
  offDays: number
}

type EmployeeShiftAssignment = {
  employee: string
  department: string
  year: number
  shift: ShiftOption
  weeklySchedules: WeekSchedule[]
  summary: {
    totalWeeks: number
    totalWorkingDays: number
    totalOffDays: number
  }
}

const emit = defineEmits<{
  save: [payload: EmployeeShiftAssignment]
}>()

const open = defineModel<boolean>('open', {
  default: false
})

const currentYear = new Date().getFullYear()

const years = Array.from({ length: 6 }, (_, index) => {
  const year = currentYear - 2 + index

  return {
    label: String(year),
    value: year
  }
})

const form = reactive({
  employee: '',
  department: '',
  shiftType: '' as ShiftTypeValue | '',
  year: currentYear
})

const employees = [
  'Sarah J.',
  'Mark R.',
  'Elena P.',
  'Andi Saputra',
  'Budi Mahendra'
]

const departments = [
  'Engineering',
  'Operations',
  'Customer Support',
  'HR',
  'Finance'
]

const shiftOptions: ShiftOption[] = [
  {
    label: 'Morning Shift',
    value: 'morning-shift',
    description: 'Mon-Fri 08:00-16:00, Sat 08:00-13:00',
    type: 'FIXED'
  },
  {
    label: 'Evening Shift',
    value: 'evening-shift',
    description: 'Mon-Fri 14:00-23:00',
    type: 'FIXED'
  },
  {
    label: 'Night Shift',
    value: 'night-shift',
    description: 'Mon-Fri 22:00-07:00',
    type: 'FIXED'
  },
  {
    label: 'Flexi-time',
    value: 'flexi-time',
    description: 'Mon-Fri • Core Time 10:00-15:00 • Min 8 Hours',
    type: 'FLEXI'
  }
]

const selectedShift = computed(() => {
  return shiftOptions.find(shift => shift.value === form.shiftType)
})

function formatDate(date: Date) {
  return date.toLocaleString('en-US', {
    day: 'numeric',
    month: 'short'
  })
}

function formatDateValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function isWorkingDay(date: Date) {
  if (!selectedShift.value) return false

  const dayNumber = date.getDay()
  const isSunday = dayNumber === 0
  const isSaturday = dayNumber === 6

  if (selectedShift.value.value === 'morning-shift') {
    return !isSunday
  }

  return !isSaturday && !isSunday
}

const weeklySchedule = computed<WeekSchedule[]>(() => {
  if (!selectedShift.value) return []

  const weeks: WeekSchedule[] = []
  const startDate = new Date(form.year, 0, 1)
  const endDate = new Date(form.year, 11, 31)

  let currentWeekDates: Date[] = []

  for (
    let date = new Date(startDate);
    date <= endDate;
    date.setDate(date.getDate() + 1)
  ) {
    const currentDate = new Date(date)

    currentWeekDates.push(currentDate)

    const isSunday = currentDate.getDay() === 0
    const isLastDate = currentDate.toDateString() === endDate.toDateString()

    if (isSunday || isLastDate) {
      const firstDate = currentWeekDates[0]
      const lastDate = currentWeekDates[currentWeekDates.length - 1]
      const workingDays = currentWeekDates.filter(item => isWorkingDay(item)).length
      const weekNumber = weeks.length + 1

      weeks.push({
        weekNumber,
        week: `Week ${weekNumber}`,
        startDate: formatDateValue(firstDate),
        endDate: formatDateValue(lastDate),
        dateRange: `${formatDate(firstDate)} - ${formatDate(lastDate)}`,
        totalDays: currentWeekDates.length,
        workingDays,
        offDays: currentWeekDates.length - workingDays
      })

      currentWeekDates = []
    }
  }

  return weeks
})

const totalWorkingDays = computed(() => {
  return weeklySchedule.value.reduce((total, item) => total + item.workingDays, 0)
})

const totalOffDays = computed(() => {
  return weeklySchedule.value.reduce((total, item) => total + item.offDays, 0)
})

function resetForm() {
  Object.assign(form, {
    employee: '',
    department: '',
    shiftType: '',
    year: currentYear
  })
}

function submit() {
  if (!selectedShift.value) return

  emit('save', {
    employee: form.employee,
    department: form.department,
    year: form.year,
    shift: selectedShift.value,
    weeklySchedules: weeklySchedule.value,
    summary: {
      totalWeeks: weeklySchedule.value.length,
      totalWorkingDays: totalWorkingDays.value,
      totalOffDays: totalOffDays.value
    }
  })

  resetForm()
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Assign Shift"
    description="Tambahkan jadwal shift karyawan selama satu tahun."
    :ui="{
      content: 'sm:max-w-5xl'
    }"
  >
    <template #body>
      <div class="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div class="space-y-4">
          <UFormField label="Employee">
            <USelect
              v-model="form.employee"
              :items="employees"
              placeholder="Pilih karyawan"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Department">
            <USelect
              v-model="form.department"
              :items="departments"
              placeholder="Pilih departemen"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Year">
            <USelect
              v-model="form.year"
              :items="years"
              placeholder="Pilih tahun"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Shift">
            <USelect
              v-model="form.shiftType"
              :items="shiftOptions"
              placeholder="Pilih shift"
              label-key="label"
              value-key="value"
              class="w-full"
            />
          </UFormField>

          <div
            v-if="selectedShift"
            class="rounded-xl border border-default bg-muted/30 p-4"
          >
            <div class="flex items-start gap-3">
              <UIcon
                :name="selectedShift.type === 'FLEXI'
                  ? 'i-lucide-clock-3'
                  : 'i-lucide-calendar-days'"
                class="mt-0.5 size-5 text-primary"
              />

              <div>
                <p class="text-sm font-semibold text-highlighted">
                  {{ selectedShift.label }}
                </p>

                <p class="mt-1 text-sm text-muted">
                  {{ selectedShift.description }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="rounded-xl border border-default p-4">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 class="font-semibold text-highlighted">
                Yearly Shift Preview
              </h3>

              <p class="mt-1 text-sm text-muted">
                Detail jadwal shift per minggu selama tahun {{ form.year }}.
              </p>
            </div>

            <div class="flex flex-wrap gap-2">
              <UBadge color="primary" variant="soft">
                {{ weeklySchedule.length }} Weeks
              </UBadge>

              <UBadge color="success" variant="soft">
                {{ totalWorkingDays }} Working
              </UBadge>

              <UBadge color="warning" variant="soft">
                {{ totalOffDays }} Off
              </UBadge>
            </div>
          </div>

          <div
            v-if="selectedShift"
            class="mt-4 max-h-[430px] space-y-2 overflow-y-auto pr-1"
          >
            <div
              v-for="item in weeklySchedule"
              :key="item.weekNumber"
              class="rounded-lg border border-default bg-muted/20 p-3"
            >
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="font-semibold text-highlighted">
                    {{ item.week }}
                  </p>

                  <p class="font-normal text-error">
                    ( {{ item.dateRange }} )
                  </p>

                  <p class="mt-1 text-xs text-muted">
                    {{ item.startDate }} - {{ item.endDate }}
                  </p>
                </div>

                <UBadge
                  color="primary"
                  variant="soft"
                  class="shrink-0"
                >
                  {{ item.workingDays }} Working
                </UBadge>
              </div>

              <div class="mt-3 grid grid-cols-3 gap-2 text-sm">
                <div class="rounded-md bg-muted/40 p-2">
                  <p class="text-xs text-muted">
                    Total
                  </p>

                  <p class="font-semibold text-highlighted">
                    {{ item.totalDays }}
                  </p>
                </div>

                <div class="rounded-md bg-muted/40 p-2">
                  <p class="text-xs text-muted">
                    Working
                  </p>

                  <p class="font-semibold text-success">
                    {{ item.workingDays }}
                  </p>
                </div>

                <div class="rounded-md bg-muted/40 p-2">
                  <p class="text-xs text-muted">
                    Off
                  </p>

                  <p class="font-semibold text-warning">
                    {{ item.offDays }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div
            v-else
            class="mt-4 rounded-lg border border-dashed border-default p-6 text-center text-sm text-muted"
          >
            Pilih shift terlebih dahulu untuk melihat preview jadwal tahunan.
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <UButton
          color="neutral"
          variant="outline"
          class="justify-center"
          @click="open = false"
        >
          Batal
        </UButton>

        <UButton
          icon="i-lucide-save"
          class="justify-center"
          :disabled="!form.employee || !form.department || !form.shiftType"
          @click="submit"
        >
          Simpan Shift
        </UButton>
      </div>
    </template>
  </UModal>
</template>
