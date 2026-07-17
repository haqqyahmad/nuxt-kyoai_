<!-- app/components/hris/attendance/schedule/ShiftCalendar.vue -->

<script setup lang="ts">
type DayValue
  = | 'sunday'
    | 'monday'
    | 'tuesday'
    | 'wednesday'
    | 'thursday'
    | 'friday'
    | 'saturday'

type ViewMode = 'day' | 'week' | 'month'

type FinalShiftStatus = 'active' | 'off'

type ShiftCode
  = | 'morning-shift'
    | 'evening-shift'
    | 'night-shift'
    | 'flexi-time'

type FinalShiftItem = {
  employee_id: number
  employee_name?: string
  department?: string

  date: string
  hari: string

  shift_code?: ShiftCode | null
  shift_name?: string | null

  start_time: string | null
  end_time: string | null

  status: FinalShiftStatus

  source: string

  override_type: string | null
  override_reason: string | null
}

type FinalShiftResponse = {
  success: boolean
  message: string
  data: FinalShiftItem[]
}

type CalendarEmployee = {
  id: number
  name: string
  department: string
  avatar: string
  shifts: (FinalShiftItem | null)[]
}

type CalendarDay = {
  label: string
  date: number
  fullDate: Date
  value: DayValue
  weekend: boolean
}

const props = defineProps<{
  finalShiftResponse?: FinalShiftResponse
  selectedDate: Date
  viewMode: ViewMode
  departmentFilter?: string
  shiftFilter?: string
}>()

const holidays = [
  '2025-06-01',
  '2026-01-01',
  '2026-04-03',
  '2026-04-04',
  '2026-05-01',
  '2026-05-14',
  '2026-08-17',
  '2026-12-25'
]

const dayValues: DayValue[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday'
]

const staffColumnWidth = computed(() => {
  if (props.viewMode === 'month') return 150
  if (props.viewMode === 'day') return 160

  return 180
})

const dayColumnMinWidth = computed(() => {
  if (props.viewMode === 'day') return 220
  if (props.viewMode === 'month') return 90

  return 128
})

const calendarMinWidth = computed(() => {
  if (props.viewMode === 'day') return '420px'
  if (props.viewMode === 'month') return '3000px'

  return '1080px'
})

const gridStyle = computed(() => ({
  gridTemplateColumns: `${staffColumnWidth.value}px repeat(${days.value.length}, minmax(${dayColumnMinWidth.value}px, 1fr))`
}))

function normalizeDate(value: Date | string) {
  return value instanceof Date ? new Date(value) : new Date(value)
}

function formatYmd(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function normalizeApiDate(value: string) {
  return value.includes('T') ? value.slice(0, 10) : value
}

function getStartOfWeek(date: Date) {
  const start = new Date(date)
  const day = start.getDay()
  const diff = day === 0 ? -6 : 1 - day

  start.setDate(start.getDate() + diff)

  return start
}

const days = computed<CalendarDay[]>(() => {
  const selectedDate = normalizeDate(props.selectedDate)

  if (props.viewMode === 'day') {
    const dayNumber = selectedDate.getDay()

    return [
      {
        label: selectedDate.toLocaleString('en-US', { weekday: 'short' }),
        date: selectedDate.getDate(),
        fullDate: new Date(selectedDate),
        value: dayValues[dayNumber],
        weekend: dayNumber === 0 || dayNumber === 6
      }
    ]
  }

  if (props.viewMode === 'month') {
    const year = selectedDate.getFullYear()
    const month = selectedDate.getMonth()
    const totalDays = new Date(year, month + 1, 0).getDate()

    return Array.from({ length: totalDays }, (_, index) => {
      const date = new Date(year, month, index + 1)
      const dayNumber = date.getDay()

      return {
        label: date.toLocaleString('en-US', { weekday: 'short' }),
        date: date.getDate(),
        fullDate: date,
        value: dayValues[dayNumber],
        weekend: dayNumber === 0 || dayNumber === 6
      }
    })
  }

  const start = getStartOfWeek(selectedDate)

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)

    const dayNumber = date.getDay()

    return {
      label: date.toLocaleString('en-US', { weekday: 'short' }),
      date: date.getDate(),
      fullDate: date,
      value: dayValues[dayNumber],
      weekend: dayNumber === 0 || dayNumber === 6
    }
  })
})

function getAvatarName(name: string) {
  return name
    .split(' ')
    .map(item => item[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function isSameDate(apiDate: string, calendarDate: Date) {
  return normalizeApiDate(apiDate) === formatYmd(calendarDate)
}

function getShiftItemForDate(
  shiftItems: FinalShiftItem[],
  date: Date
): FinalShiftItem | null {
  return shiftItems.find(item => isSameDate(item.date, date)) ?? null
}

const employees = computed<CalendarEmployee[]>(() => {
  const response = props.finalShiftResponse

  if (!response?.data?.length) {
    return []
  }

  const grouped = response.data.reduce<Record<number, FinalShiftItem[]>>(
    (result, item) => {
      if (!result[item.employee_id]) {
        result[item.employee_id] = []
      }

      result[item.employee_id].push(item)

      return result
    },
    {}
  )

  return Object.entries(grouped)
    .map(([employeeId, shiftItems]) => {
      const firstItem = shiftItems[0]
      const name = firstItem?.employee_name ?? `Employee ${employeeId}`
      const department = firstItem?.department ?? 'General'

      return {
        id: Number(employeeId),
        name,
        department,
        avatar: getAvatarName(name),
        shifts: days.value.map(day =>
          getShiftItemForDate(shiftItems, day.fullDate)
        )
      }
    })
    .filter((employee) => {
      const matchDepartment
        = props.departmentFilter && props.departmentFilter !== 'all'
          ? employee.department === props.departmentFilter
          : true

      const matchShift
        = props.shiftFilter && props.shiftFilter !== 'all'
          ? employee.shifts.some(
              shift =>
                shift?.shift_code === props.shiftFilter
                || shift?.status === props.shiftFilter
            )
          : true

      return matchDepartment && matchShift
    })
})

function getShiftBadgeColor(shift: FinalShiftItem) {
  if (shift.status === 'off') return 'neutral'
  if (shift.override_type) return 'warning'

  return 'success'
}

function getShiftBadgeLabel(shift: FinalShiftItem) {
  if (shift.status === 'off') return 'OFF'
  if (shift.override_type) return 'Override'

  return shift.shift_name ?? 'Active'
}

function getShiftTime(shift: FinalShiftItem) {
  if (!shift.start_time || !shift.end_time) return '-'

  return `${shift.start_time} - ${shift.end_time}`
}

function isToday(day: CalendarDay) {
  const today = new Date()

  return (
    today.getDate() === day.fullDate.getDate()
    && today.getMonth() === day.fullDate.getMonth()
    && today.getFullYear() === day.fullDate.getFullYear()
  )
}

function isSunday(day: CalendarDay) {
  return day.value === 'sunday'
}

function isHoliday(day: CalendarDay) {
  return holidays.includes(formatYmd(day.fullDate))
}

function isRedDay(day: CalendarDay) {
  return isSunday(day) || isHoliday(day)
}
console.log('days', days)

const weeks = computed(() => {
  // DAY / WEEK MODE
  if (props.viewMode !== 'month') {
    return [days.value]
  }

  const monthDays = days.value

  if (!monthDays.length) {
    return []
  }

  // Ambil hari pertama bulan
  const firstDay = monthDays[0].fullDate.getDay()
  // Minggu = 0, Senin = 1, dst

  // Tambahkan slot kosong di depan
  const paddedDays: (CalendarDay | null)[] = [
    ...Array(firstDay).fill(null),
    ...monthDays
  ]

  // Tambahkan slot kosong di belakang
  while (paddedDays.length % 7 !== 0) {
    paddedDays.push(null)
  }

  // Pecah per minggu
  const chunks: (CalendarDay | null)[][] = []

  for (let i = 0; i < paddedDays.length; i += 7) {
    chunks.push(paddedDays.slice(i, i + 7))
  }

  return chunks
})

const hasEmployees = computed(() => {
  return employees.value.length > 0
})
</script>

<template>
  <UCard class="overflow-hidden border-0 bg-transparent shadow-none">
    <div class="space-y-6">
      <!-- EMPLOYEE -->
      <div
        v-for="employee in employees"
        :key="employee.id"
        class="overflow-hidden rounded-2xl border border-default bg-default shadow-sm"
      >
        <!-- EMPLOYEE HEADER -->
        <div
          class="flex items-center justify-between border-b border-default bg-muted/30 px-5 py-4"
        >
          <div class="flex items-center gap-3">
            <UAvatar :text="employee.avatar" size="sm" />

            <div>
              <p class="text-sm font-semibold text-highlighted">
                {{ employee.name }}
              </p>

              <p class="text-xs text-muted">
                {{ employee.department }}
              </p>
            </div>
          </div>

          <UBadge color="neutral" variant="soft">
            {{ employee.shifts.length }} Days
          </UBadge>
        </div>

        <!-- WEEK -->
        <div
          v-for="(week, weekIndex) in weeks"
          :key="weekIndex"
          class="border-b border-default last:border-b-0"
        >
          <!-- DAYS -->
          <div class="grid grid-cols-7">
            <div
              v-for="day in week"
              :key="
                day
                  ? `${employee.id}-${day.fullDate.toISOString()}`
                  : Math.random()
              "
              class="border-r border-default p-3 last:border-r-0"
            >
              <div
                v-if="!day"
                class="border-r border-default bg-muted/10 p-3 last:border-r-0"
              >
                <div class="h-24" />
              </div>
              <div
                v-else
                class="border-r border-default p-3 last:border-r-0"
                :class="[
                  isRedDay(day)
                    ? 'bg-error/5'
                    : '',

                  isToday(day)
                    ? 'bg-primary/5'
                    : ''
                ]"
              >
                <!-- DATE -->
                <div class="mb-3">
                  <p
                    class="text-[10px] font-bold uppercase tracking-wide"
                    :class="[isRedDay(day) ? 'text-error' : 'text-muted']"
                  >
                    {{ day.label }}
                  </p>

                  <p
                    class="text-lg font-bold"
                    :class="[isToday(day) ? 'text-primary' : 'text-highlighted']"
                  >
                    {{ day.date }}
                  </p>
                </div>

                <template
                  v-if="
                    getShiftItemForDate(
                      employee.shifts.filter(Boolean),
                      day.fullDate
                    )
                  "
                >
                  <div
                    v-if="
                      getShiftItemForDate(
                        employee.shifts.filter(Boolean),
                        day.fullDate
                      )?.status === 'off'
                    "
                    class="flex h-18 items-center justify-center rounded-2xl bg-error/10 text-sm font-bold text-error"
                  >
                    OFF
                  </div>

                  <div
                    v-else
                    class="rounded-2xl border border-default bg-elevated p-3 transition hover:shadow-md"
                  >
                    <div class="mb-2 flex items-center justify-between">
                      <UBadge
                        :color="
                          getShiftBadgeColor(
                            getShiftItemForDate(
                              employee.shifts.filter(Boolean),
                              day.fullDate
                            )!
                          )
                        "
                        variant="soft"
                        size="xs"
                      >
                        {{
                          getShiftBadgeLabel(
                            getShiftItemForDate(
                              employee.shifts.filter(Boolean),
                              day.fullDate
                            )!
                          )
                        }}
                      </UBadge>
                    </div>

                    <p class="text-sm font-semibold text-highlighted">
                      {{
                        getShiftTime(
                          getShiftItemForDate(
                            employee.shifts.filter(Boolean),
                            day.fullDate
                          )!
                        )
                      }}
                    </p>

                    <p
                      v-if="
                        getShiftItemForDate(
                          employee.shifts.filter(Boolean),
                          day.fullDate
                        )?.override_reason
                      "
                      class="mt-2 line-clamp-2 text-[11px] text-muted"
                    >
                      {{
                        getShiftItemForDate(
                          employee.shifts.filter(Boolean),
                          day.fullDate
                        )?.override_reason
                      }}
                    </p>
                  </div>
                </template>

                <!-- EMPTY -->
                <div
                  v-else
                  class="flex h-24 items-center justify-center rounded-2xl border border-dashed border-default text-xs text-muted"
                >
                  Empty
                </div>
              </div>
            <!-- // end day -->
            </div>
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>
