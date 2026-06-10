<!-- app/components/hris/attendance/schedule/ShiftCalendar.vue -->

<script setup lang="ts">
type ViewMode = 'day' | 'week' | 'month'
type FinalShiftStatus = 'active' | 'off'

type ShiftCode
  = | 'morning-shift'
    | 'evening-shift'
    | 'night-shift'
    | 'flexi-time'
    | string

type FinalShiftItem = {
  id?: number | string
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

type HolidayItem = {
  date: string
  name: string
}

type CalendarDay = {
  label: string
  date: number
  fullDate: Date
  ymd: string
  weekend: boolean
}

type CalendarEmployee = {
  id: number
  name: string
  department: string
  avatar: string
  shiftsByDate: Record<string, FinalShiftItem[]>
}

const props = withDefaults(defineProps<{
  finalShiftResponse?: FinalShiftResponse
  selectedDate: Date
  viewMode: ViewMode
  departmentFilter?: string
  shiftFilter?: string
  holidays?: HolidayItem[]
  loading?: boolean
}>(), {
  departmentFilter: 'all',
  shiftFilter: 'all',
  holidays: () => [],
  loading: false
})

const emit = defineEmits<{
  swapShift: [payload: {
    fromEmployeeId: number
    toEmployeeId: number
    date: string
    shift: FinalShiftItem
  }]
  editShift: [shift: FinalShiftItem]
}>()

const draggedShift = ref<{
  employeeId: number
  date: string
  shift: FinalShiftItem
} | null>(null)

const dayColumnClass = computed(() => {
  if (props.viewMode === 'day') return 'grid-cols-1'
  if (props.viewMode === 'week') return 'grid-cols-7'

  return 'grid-cols-7'
})

const maxCalendarWidth = computed(() => {
  if (props.viewMode === 'month') return 'min-w-[980px]'
  if (props.viewMode === 'week') return 'min-w-[920px]'

  return 'min-w-[320px]'
})

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

function getStartOfMonthCalendar(date: Date) {
  const firstDate = new Date(date.getFullYear(), date.getMonth(), 1)
  const day = firstDate.getDay()
  const diff = day === 0 ? -6 : 1 - day

  firstDate.setDate(firstDate.getDate() + diff)
  return firstDate
}

function getAvatarName(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map(item => item[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function createCalendarDay(date: Date): CalendarDay {
  const dayNumber = date.getDay()

  return {
    label: date.toLocaleString('en-US', { weekday: 'short' }),
    date: date.getDate(),
    fullDate: new Date(date),
    ymd: formatYmd(date),
    weekend: dayNumber === 0 || dayNumber === 6
  }
}

const days = computed<CalendarDay[]>(() => {
  const selectedDate = normalizeDate(props.selectedDate)

  if (props.viewMode === 'day') {
    return [createCalendarDay(selectedDate)]
  }

  if (props.viewMode === 'week') {
    const start = getStartOfWeek(selectedDate)

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start)
      date.setDate(start.getDate() + index)

      return createCalendarDay(date)
    })
  }

  const start = getStartOfMonthCalendar(selectedDate)

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)

    return createCalendarDay(date)
  })
})

const weeks = computed(() => {
  if (props.viewMode !== 'month') return [days.value]

  const result: CalendarDay[][] = []

  for (let i = 0; i < days.value.length; i += 7) {
    result.push(days.value.slice(i, i + 7))
  }

  return result
})

const holidayMap = computed(() => {
  return props.holidays.reduce<Record<string, HolidayItem>>((result, item) => {
    result[normalizeApiDate(item.date)] = item
    return result
  }, {})
})

const selectedMonth = computed(() => props.selectedDate.getMonth())

function isCurrentMonth(day: CalendarDay) {
  if (props.viewMode !== 'month') return true

  return day.fullDate.getMonth() === selectedMonth.value
}

function isToday(day: CalendarDay) {
  return formatYmd(new Date()) === day.ymd
}

function isHoliday(day: CalendarDay) {
  return Boolean(holidayMap.value[day.ymd])
}

function getHolidayName(day: CalendarDay) {
  return holidayMap.value[day.ymd]?.name
}

function isRedDay(day: CalendarDay) {
  return day.weekend || isHoliday(day)
}

const employees = computed<CalendarEmployee[]>(() => {
  const items = props.finalShiftResponse?.data ?? []
  const grouped: Record<number, CalendarEmployee> = {}

  for (const item of items) {
    const date = normalizeApiDate(item.date)

    if (!grouped[item.employee_id]) {
      const name = item.employee_name ?? `Employee ${item.employee_id}`

      grouped[item.employee_id] = {
        id: item.employee_id,
        name,
        department: item.department ?? 'General',
        avatar: getAvatarName(name),
        shiftsByDate: {}
      }
    }

    if (!grouped[item.employee_id].shiftsByDate[date]) {
      grouped[item.employee_id].shiftsByDate[date] = []
    }

    grouped[item.employee_id].shiftsByDate[date].push(item)
  }

  return Object.values(grouped)
    .map((employee) => {
      for (const date in employee.shiftsByDate) {
        employee.shiftsByDate[date].sort((a, b) => {
          return (a.start_time ?? '').localeCompare(b.start_time ?? '')
        })
      }

      return employee
    })
    .filter((employee) => {
      const matchDepartment
        = props.departmentFilter !== 'all'
          ? employee.department === props.departmentFilter
          : true

      const matchShift
        = props.shiftFilter !== 'all'
          ? Object.values(employee.shiftsByDate)
              .flat()
              .some(shift =>
                shift.shift_code === props.shiftFilter
                || shift.status === props.shiftFilter
              )
          : true

      return matchDepartment && matchShift
    })
})

function getShifts(employee: CalendarEmployee, day: CalendarDay) {
  return employee.shiftsByDate[day.ymd] ?? []
}

function getTotalShiftDays(employee: CalendarEmployee) {
  return days.value.filter(day => getShifts(employee, day).length > 0).length
}

function getShiftBadgeColor(shift: FinalShiftItem) {
  if (shift.status === 'off') return 'neutral'
  if (shift.override_type) return 'warning'
  if (shift.shift_code === 'night-shift') return 'primary'
  if (shift.shift_code === 'evening-shift') return 'info'

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

function onDragStart(employeeId: number, date: string, shift: FinalShiftItem) {
  draggedShift.value = {
    employeeId,
    date,
    shift
  }
}

function onDrop(toEmployeeId: number, date: string) {
  if (!draggedShift.value) return

  emit('swapShift', {
    fromEmployeeId: draggedShift.value.employeeId,
    toEmployeeId,
    date,
    shift: draggedShift.value.shift
  })

  draggedShift.value = null
}
</script>

<template>
  <UCard class="overflow-hidden border-0 bg-transparent shadow-none">
    <div
      v-if="loading"
      class="grid gap-4"
    >
      <USkeleton
        v-for="item in 5"
        :key="item"
        class="h-40 rounded-2xl"
      />
    </div>

    <div
      v-else-if="!employees.length"
      class="flex min-h-64 items-center justify-center rounded-2xl border border-dashed border-default text-sm text-muted"
    >
      Tidak ada data shift.
    </div>

    <div
      v-else
      class="overflow-x-auto"
    >
      <div
        class="space-y-6"
        :class="maxCalendarWidth"
      >
        <div
          v-for="employee in employees"
          :key="employee.id"
          class="overflow-hidden rounded-2xl border border-default bg-default shadow-sm"
        >
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-default bg-muted/30 px-4 py-4">
            <div class="flex min-w-0 items-center gap-3">
              <UAvatar
                :text="employee.avatar"
                size="sm"
              />

              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-highlighted">
                  {{ employee.name }}
                </p>

                <p class="truncate text-xs text-muted">
                  {{ employee.department }}
                </p>
              </div>
            </div>

            <UBadge
              color="neutral"
              variant="soft"
            >
              {{ getTotalShiftDays(employee) }} Days
            </UBadge>
          </div>

          <div
            v-for="(week, weekIndex) in weeks"
            :key="weekIndex"
            class="border-b border-default last:border-b-0"
          >
            <div
              class="grid"
              :class="dayColumnClass"
            >
              <div
                v-for="day in week"
                :key="day.ymd"
                class="min-h-36 border-r border-default p-2 last:border-r-0 sm:p-3"
                :class="[
                  isRedDay(day) ? 'bg-error/5' : '',
                  isToday(day) ? 'bg-primary/5' : '',
                  !isCurrentMonth(day) ? 'opacity-40' : ''
                ]"
                @dragover.prevent
                @drop="onDrop(employee.id, day.ymd)"
              >
                <div class="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <p
                      class="text-[10px] font-bold uppercase tracking-wide"
                      :class="isRedDay(day) ? 'text-error' : 'text-muted'"
                    >
                      {{ day.label }}
                    </p>

                    <p
                      class="text-lg font-bold"
                      :class="isToday(day) ? 'text-primary' : 'text-highlighted'"
                    >
                      {{ day.date }}
                    </p>
                  </div>

                  <UBadge
                    v-if="getShifts(employee, day).length > 1"
                    color="primary"
                    variant="soft"
                    size="xs"
                  >
                    {{ getShifts(employee, day).length }} shift
                  </UBadge>
                </div>

                <p
                  v-if="isHoliday(day)"
                  class="mb-2 line-clamp-1 text-[11px] font-medium text-error"
                >
                  {{ getHolidayName(day) }}
                </p>

                <div
                  v-if="getShifts(employee, day).length"
                  class="space-y-2"
                >
                  <div
                    v-for="shift in getShifts(employee, day)"
                    :key="`${shift.id ?? shift.shift_code}-${shift.start_time}-${shift.end_time}`"
                    draggable="true"
                    class="cursor-move rounded-2xl border border-default bg-elevated p-3 transition hover:shadow-md"
                    @dragstart="onDragStart(employee.id, day.ymd, shift)"
                    @dblclick="emit('editShift', shift)"
                  >
                    <div class="mb-2 flex items-center justify-between gap-2">
                      <UBadge
                        v-if="shift.status !== 'off'"
                        :color="getShiftBadgeColor(shift)"
                        variant="soft"
                        size="xs"
                      >
                        {{ getShiftBadgeLabel(shift) }}
                      </UBadge>

                      <!-- <span class="text-[10px] text-muted">
                        {{ shift.source }}
                      </span> -->
                    </div>

                    <template v-if="shift.status === 'off'">
                      <div class="rounded-xl bg-error/10 py-2 text-center text-sm font-bold text-error">
                        OFF
                      </div>
                    </template>

                    <template v-else>
                      <p class="text-sm font-semibold text-highlighted">
                        {{ getShiftTime(shift) }}
                      </p>

                      <p
                        v-if="shift.override_reason"
                        class="mt-2 line-clamp-2 text-[11px] text-muted"
                      >
                        {{ shift.override_reason }}
                      </p>
                    </template>
                  </div>
                </div>

                <div
                  v-else
                  class="flex h-24 items-center justify-center rounded-2xl border border-dashed border-default text-xs text-muted"
                >
                  Empty
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>
