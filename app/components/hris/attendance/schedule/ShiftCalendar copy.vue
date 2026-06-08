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

type ShiftCode
  = | 'morning-shift'
    | 'evening-shift'
    | 'night-shift'
    | 'flexi-time'
    | 'off'
    | ''

type ShiftType = 'FIXED' | 'FLEXI'

type WorkingHour = {
  startTime: string
  endTime: string
  days: DayValue[]
}

type FlexiConfig = {
  minimumWorkHours: number
  coreStartTime: string
  coreEndTime: string
  days: DayValue[]
}

type ShiftConfiguration = {
  label: string
  value: ShiftCode
  color: 'success' | 'warning' | 'primary' | 'info' | 'neutral'
  type: ShiftType
  workingHours: WorkingHour[]
  flexiConfig?: FlexiConfig
}

type ShiftOption = {
  label: string
  value: string
  description: string
  type: ShiftType
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

type ShiftDetail = {
  weekNumber: number
  shiftCode: ShiftCode
}

type EmployeeShiftAssignment = {
  employee: string
  department: string
  year: number
  shift: ShiftOption
  weeklySchedules: WeekSchedule[]
  shiftDetails?: ShiftDetail[]
  summary: {
    totalWeeks: number
    totalWorkingDays: number
    totalOffDays: number
  }
}

type CalendarEmployee = {
  name: string
  department: string
  avatar: string
  shifts: ShiftCode[]
}

type CalendarDay = {
  label: string
  date: number
  fullDate: Date
  value: DayValue
  weekend: boolean
}

const props = defineProps<{
  assignments?: EmployeeShiftAssignment[]
  selectedDate: Date
  viewMode: ViewMode
  departmentFilter?: string
  shiftFilter?: string
}>()

const holidays = [
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

function getStartOfWeek(date: Date) {
  const start = new Date(date)
  const day = start.getDay()
  const diff = day === 0 ? -6 : 1 - day

  start.setDate(start.getDate() + diff)

  return start
}

function getWeekNumber(date: Date) {
  const start = new Date(date.getFullYear(), 0, 1)
  const diffDays = Math.floor(
    (date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  )

  return Math.ceil((diffDays + start.getDay() + 1) / 7)
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

const shiftConfigurations: ShiftConfiguration[] = [
  {
    label: 'Morning',
    value: 'morning-shift',
    color: 'success',
    type: 'FIXED',
    workingHours: [
      {
        startTime: '08:00',
        endTime: '16:00',
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
      },
      {
        startTime: '08:00',
        endTime: '13:00',
        days: ['saturday']
      }
    ]
  },
  {
    label: 'Evening',
    value: 'evening-shift',
    color: 'warning',
    type: 'FIXED',
    workingHours: [
      {
        startTime: '14:00',
        endTime: '23:00',
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
      }
    ]
  },
  {
    label: 'Night',
    value: 'night-shift',
    color: 'primary',
    type: 'FIXED',
    workingHours: [
      {
        startTime: '22:00',
        endTime: '07:00',
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
      }
    ]
  },
  {
    label: 'Flexi-time',
    value: 'flexi-time',
    color: 'info',
    type: 'FLEXI',
    workingHours: [],
    flexiConfig: {
      minimumWorkHours: 8,
      coreStartTime: '10:00',
      coreEndTime: '15:00',
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    }
  }
]

function getShiftConfig(shiftCode: ShiftCode) {
  return shiftConfigurations.find(item => item.value === shiftCode)
}

function getAvatarName(name: string) {
  return name
    .split(' ')
    .map(item => item[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function mapShiftValue(value: string): ShiftCode {
  const map: Record<string, ShiftCode> = {
    'morning-shift': 'morning-shift',
    'evening-shift': 'evening-shift',
    'night-shift': 'night-shift',
    'flexi-time': 'flexi-time'
  }

  return map[value] || ''
}

function isShiftActiveOnDay(shiftCode: ShiftCode, day: DayValue) {
  if (!shiftCode || shiftCode === 'off') return false

  const config = getShiftConfig(shiftCode)

  if (!config) return false

  if (config.type === 'FLEXI') {
    return config.flexiConfig?.days.includes(day) ?? false
  }

  return config.workingHours.some(hour => hour.days.includes(day))
}

function getShiftCodeForDate(
  assignment: EmployeeShiftAssignment,
  date: Date
): ShiftCode {
  const weekNumber = getWeekNumber(date)

  const detail = assignment.shiftDetails?.find(item =>
    item.weekNumber === weekNumber
  )

  return detail?.shiftCode ?? mapShiftValue(assignment.shift.value)
}

function generateShiftByVisibleDays(shiftCode: ShiftCode): ShiftCode[] {
  return days.value.map((day) => {
    if (!shiftCode) return ''

    return isShiftActiveOnDay(shiftCode, day.value)
      ? shiftCode
      : 'off'
  })
}

function generateShiftFromAssignment(
  assignment: EmployeeShiftAssignment
): ShiftCode[] {
  return days.value.map((day) => {
    const shiftCode = getShiftCodeForDate(assignment, day.fullDate)

    if (!shiftCode) return ''

    return isShiftActiveOnDay(shiftCode, day.value)
      ? shiftCode
      : 'off'
  })
}

const defaultEmployees = computed<CalendarEmployee[]>(() => [
  {
    name: 'Sarah J.',
    department: 'Operations',
    avatar: 'SJ',
    shifts: generateShiftByVisibleDays('morning-shift')
  },
  {
    name: 'Mark R.',
    department: 'Engineering',
    avatar: 'MR',
    shifts: generateShiftByVisibleDays('evening-shift')
  },
  {
    name: 'Elena P.',
    department: 'HR',
    avatar: 'EP',
    shifts: generateShiftByVisibleDays('flexi-time')
  }
])

const employees = computed<CalendarEmployee[]>(() => {
  const data = defaultEmployees.value.map(employee => ({
    ...employee,
    shifts: [...employee.shifts]
  }))

  const assignmentData = props.assignments?.length
    ? props.assignments
    : sampleAssignments

  assignmentData.forEach((assignment) => {
    const shiftPreview = generateShiftFromAssignment(assignment)

    const existingEmployee = data.find(employee =>
      employee.name === assignment.employee
    )

    if (existingEmployee) {
      existingEmployee.department = assignment.department
      existingEmployee.avatar = getAvatarName(assignment.employee)
      existingEmployee.shifts = shiftPreview
      return
    }

    data.push({
      name: assignment.employee,
      department: assignment.department,
      avatar: getAvatarName(assignment.employee),
      shifts: shiftPreview
    })
  })

  return data.filter((employee) => {
    const matchDepartment = props.departmentFilter && props.departmentFilter !== 'all'
      ? employee.department === props.departmentFilter
      : true

    const matchShift = props.shiftFilter && props.shiftFilter !== 'all'
      ? employee.shifts.some((shift) => {
          const meta = getShiftMeta(shift)
          return meta.label === props.shiftFilter
        })
      : true

    return matchDepartment && matchShift
  })
})

function getShiftMeta(shiftCode: ShiftCode) {
  if (shiftCode === 'off') {
    return {
      label: 'OFF',
      color: 'neutral'
    } as const
  }

  if (!shiftCode) {
    return {
      label: '',
      color: 'neutral'
    } as const
  }

  const config = getShiftConfig(shiftCode)

  return {
    label: config?.label ?? '',
    color: config?.color ?? 'neutral'
  } as const
}

function getShiftTimes(shiftCode: ShiftCode, dayIndex: number) {
  if (!shiftCode || shiftCode === 'off') return []

  const day = days.value[dayIndex]
  const config = getShiftConfig(shiftCode)

  if (!day || !config) return []

  if (config.type === 'FLEXI') {
    if (!config.flexiConfig?.days.includes(day.value)) return []

    return [
      `Core ${config.flexiConfig.coreStartTime} - ${config.flexiConfig.coreEndTime}`
    ]
  }

  return config.workingHours
    .filter(hour => hour.days.includes(day.value))
    .map(hour => `${hour.startTime} - ${hour.endTime}`)
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

const sampleAssignments: EmployeeShiftAssignment[] = [
  {
    employee: 'John Doe',
    department: 'Engineering',
    year: 2026,
    shift: {
      label: 'Morning',
      value: 'morning-shift',
      description: 'Morning Shift',
      type: 'FIXED'
    },
    weeklySchedules: [
      {
        weekNumber: 1,
        week: 'Week 1',
        startDate: '2026-01-01',
        endDate: '2026-01-07',
        dateRange: '01 Jan - 07 Jan 2026',
        totalDays: 7,
        workingDays: 6,
        offDays: 1
      },
      {
        weekNumber: 2,
        week: 'Week 2',
        startDate: '2026-01-08',
        endDate: '2026-01-14',
        dateRange: '08 Jan - 14 Jan 2026',
        totalDays: 7,
        workingDays: 6,
        offDays: 1
      }
    ],
    shiftDetails: [
      {
        weekNumber: 1,
        shiftCode: 'morning-shift'
      },
      {
        weekNumber: 2,
        shiftCode: 'evening-shift'
      },
      {
        weekNumber: 3,
        shiftCode: 'night-shift'
      },
      {
        weekNumber: 4,
        shiftCode: 'morning-shift'
      }
    ],
    summary: {
      totalWeeks: 52,
      totalWorkingDays: 312,
      totalOffDays: 53
    }
  }
]
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
          v-for="employee in employees"
          :key="employee.name"
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
            :key="`${employee.name}-${index}`"
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
            <template v-if="shift">
              <div
                v-if="shift === 'off'"
                class="flex h-full min-h-20 items-center justify-center rounded-lg bg-error/10 text-sm font-semibold text-error"
              >
                OFF
              </div>

              <div
                v-else
                class="h-full rounded-lg border border-default bg-elevated p-3 shadow-sm"
              >
                <UBadge
                  :color="getShiftMeta(shift).color"
                  variant="soft"
                  size="xs"
                  class="mb-2"
                >
                  {{ getShiftMeta(shift).label }}
                </UBadge>

                <div class="space-y-1">
                  <p
                    v-for="time in getShiftTimes(shift, index)"
                    :key="time"
                    class="text-xs font-semibold leading-snug text-highlighted"
                  >
                    {{ time }}
                  </p>
                </div>
              </div>
            </template>

            <button
              v-else
              type="button"
              class="flex h-full min-h-20 w-full items-center justify-center rounded-lg border border-dashed border-default text-muted transition hover:border-primary hover:text-primary"
            >
              <UIcon
                name="i-lucide-plus"
                class="size-4"
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>
