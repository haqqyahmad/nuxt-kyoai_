<!-- app/components/hris/attendance/tracking/AttendanceSummary.vue -->

<script setup lang="ts">
type AttendanceReportRow = {
  status: string
  checkin_time?: string | null
  checkout_time?: string | null
  shift_start?: string | null
  shift_end?: string | null
  dt_minutes: number
  pc_minutes?: number
  early_checkout_minutes?: number
  ot_minutes: number
  worked_minutes: number
}

const props = defineProps<{
  rows: AttendanceReportRow[]
}>()

function normalizeStatus(status: string) {
  return status?.toUpperCase?.() || '-'
}

function toMinutes(value?: string | null) {
  if (!value) return null

  let time = value

  if (value.includes('T')) {
    time = value.slice(11, 16)
  } else if (value.includes(' ')) {
    time = value.split(' ')[1]?.slice(0, 5) || ''
  } else {
    time = value.slice(0, 5)
  }

  const [hour, minute] = time.split(':').map(Number)

  if (Number.isNaN(hour) || Number.isNaN(minute)) return null

  return hour * 60 + minute
}

function getPcMinutes(row: AttendanceReportRow) {
  if (row.pc_minutes !== undefined) return Number(row.pc_minutes || 0)
  if (row.early_checkout_minutes !== undefined) return Number(row.early_checkout_minutes || 0)

  const checkout = toMinutes(row.checkout_time)
  const shiftEnd = toMinutes(row.shift_end)

  if (checkout === null || shiftEnd === null) return 0

  return checkout < shiftEnd ? shiftEnd - checkout : 0
}

const totalPresent = computed(() => {
  return props.rows.filter(
    row => normalizeStatus(row.status) === 'PRESENT'
      || normalizeStatus(row.status) === 'LATE').length
})

const totalAbsent = computed(() => {
  return props.rows.filter(
    row => normalizeStatus(row.status) === 'ABSENT').length
})

const totalLate = computed(() => {
  return props.rows.reduce((total, row) => total + Number(row.dt_minutes || 0), 0)
})

const totalEarlyCheckout = computed(() => {
  return props.rows.reduce((total, row) => {
    return total + getPcMinutes(row)
  }, 0)
})

const totalOvertime = computed(() => {
  return props.rows.reduce((total, row) => total + Number(row.ot_minutes || 0), 0)
})

const totalHoliday = computed(() => {
  return props.rows.filter(row => normalizeStatus(row.status) === 'HOLIDAY').length
})

const totalOff = computed(() => {
  return props.rows.filter(row => normalizeStatus(row.status) === 'OFF').length
})

const totalLeave = computed(() => {
  return props.rows.filter(row =>
    ['LEAVE', 'SICK', 'PERMIT'].includes(normalizeStatus(row.status))
  ).length
})
</script>

<template>
  <UCard>
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
      <div class="rounded-lg border border-default bg-blue-500/10 px-3 py-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-medium text-muted">
            Present
          </span>

          <span class="font-bold text-blue-600">
            {{ totalPresent }} Hari
          </span>
        </div>
      </div>

      <div class="rounded-lg border border-default bg-red-500/10 px-3 py-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-medium text-muted">
            Absent
          </span>

          <span class="font-bold text-red-600">
            {{ totalAbsent }} Hari
          </span>
        </div>
      </div>

      <div class="rounded-lg border border-default bg-amber-500/10 px-3 py-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-medium text-muted">
            Late
          </span>

          <span class="font-bold text-amber-600">
            {{ totalLate }} Menit
          </span>
        </div>
      </div>

      <div class="rounded-lg border border-default bg-orange-500/10 px-3 py-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-medium text-muted">
            PC
          </span>

          <span class="font-bold text-orange-600">
            {{ totalEarlyCheckout }} Menit
          </span>
        </div>
      </div>

      <div class="rounded-lg border border-default bg-green-500/10 px-3 py-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-medium text-muted">
            OT
          </span>

          <span class="font-bold text-green-600">
            {{ totalOvertime }} Menit
          </span>
        </div>
      </div>

      <div class="rounded-lg border border-default bg-violet-500/10 px-3 py-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-medium text-muted">
            Holiday
          </span>

          <span class="font-bold text-violet-600">
            {{ totalHoliday }} Hari
          </span>
        </div>
      </div>

      <div class="rounded-lg border border-default bg-slate-500/10 px-3 py-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-medium text-muted">
            Off
          </span>

          <span class="font-bold text-slate-600">
            {{ totalOff }} Hari
          </span>
        </div>
      </div>

      <div class="rounded-lg border border-default bg-cyan-500/10 px-3 py-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-medium text-muted">
            Leave
          </span>

          <span class="font-bold text-cyan-600">
            {{ totalLeave }} Hari
          </span>
        </div>
      </div>
    </div>
  </UCard>
</template>
