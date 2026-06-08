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
  return value.includes('T')
    ? value.slice(0, 10)
    : value
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
      const matchDepartment = props.departmentFilter && props.departmentFilter !== 'all'
        ? employee.department === props.departmentFilter
        : true

      const matchShift = props.shiftFilter && props.shiftFilter !== 'all'
        ? employee.shifts.some(shift =>
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
</script>

<template>
  <UCard class="overflow-hidden">
    <div class="overflow-x-auto">
      <div :style="{ minWidth: calendarMinWidth }">
        <div
          class="grid border-b border-default bg-muted"
          :style="gridStyle"
        >
          <div class="sticky left-0 z-30 border-r border-default bg-muted px-3 py-4 text-sm font-semibold text-muted shadow-sm">
            Staff
          </div>

          <div
            v-for="day in days"
            :key="day.fullDate.toISOString()"
            class="border-r border-default px-3 py-4 text-center last:border-r-0"
            :class="[
              isRedDay(day)
                ? 'bg-error/10 text-error'
                : day.weekend
                  ? 'bg-muted/70 text-muted'
                  : 'text-highlighted',

              isToday(day)
                ? 'ring-2 ring-primary bg-primary/10 text-primary'
                : ''
            ]"
          >
            <p class="text-[11px] font-medium uppercase">
              {{ day.label }}
            </p>

            <p class="text-lg font-semibold">
              {{ day.date }}
            </p>

            <UBadge
              v-if="isHoliday(day)"
              color="error"
              variant="soft"
              size="xs"
              class="mt-1"
            >
              Holiday
            </UBadge>
          </div>
        </div>

        <div
          v-if="!employees.length"
          class="border-b border-default p-6 text-center text-sm text-muted"
        >
          Tidak ada data shift.
        </div>

        <div
          v-for="employee in employees"
          :key="employee.id"
          class="grid border-b border-default last:border-b-0 hover:bg-muted/40"
          :style="gridStyle"
        >
          <div class="sticky left-0 z-20 flex items-center gap-2 border-r border-default bg-default px-3 py-3 shadow-sm">
            <UAvatar
              :text="employee.avatar"
              size="xs"
            />

            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-highlighted">
                {{ employee.name }}
              </p>

              <p class="mt-0.5 truncate text-xs text-muted">
                {{ employee.department }}
              </p>
            </div>
          </div>

          <div
            v-for="(shift, index) in employee.shifts"
            :key="`${employee.id}-${days[index]?.fullDate.toISOString()}`"
            class="border-r border-default p-2 last:border-r-0"
            :class="[
              isRedDay(days[index])
                ? 'bg-error/5'
                : days[index]?.weekend
                  ? 'bg-muted/50'
                  : '',

              isToday(days[index])
                ? 'ring-1 ring-primary bg-primary/5'
                : '',

              viewMode === 'day'
                ? 'min-h-28'
                : 'min-h-24'
            ]"
          >
            <div
              v-if="!shift"
              class="flex h-full min-h-20 flex-col items-center justify-center rounded-lg border border-dashed border-default text-sm font-medium text-muted"
            >
              <UIcon
                name="i-lucide-calendar-x"
                class="mb-1 size-4"
              />

              <span>Not Scheduled</span>
            </div>

            <div
              v-else-if="shift.status === 'off'"
              class="flex h-full min-h-20 flex-col items-center justify-center rounded-lg bg-error/10 text-sm font-semibold text-error"
            >
              <span>OFF</span>
            </div>

            <div
              v-else
              class="h-full rounded-lg border border-default bg-elevated p-3 shadow-sm"
            >
              <UBadge
                :color="getShiftBadgeColor(shift)"
                variant="soft"
                size="xs"
                class="mb-2"
              >
                {{ getShiftBadgeLabel(shift) }}
              </UBadge>

              <div class="space-y-1">
                <p class="text-xs font-semibold leading-snug text-highlighted">
                  {{ getShiftTime(shift) }}
                </p>

                <p
                  v-if="shift.override_type"
                  class="text-[11px] font-medium text-warning"
                >
                  {{ shift.override_type }}
                </p>

                <p
                  v-if="shift.override_reason"
                  class="text-[11px] text-muted"
                >
                  {{ shift.override_reason }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>
