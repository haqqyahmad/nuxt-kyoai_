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
  return props.rows.filter(row => normalizeStatus(row.status) === 'PRESENT').length
})

const totalAbsent = computed(() => {
  return props.rows.filter(row => normalizeStatus(row.status) === 'ABSENT').length
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
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
      <div class="rounded-xl border border-default bg-primary/10 p-4">
        <p class="text-xs font-semibold uppercase text-muted">
          Present
        </p>

        <p class="mt-1 text-xl font-bold text-primary">
          {{ totalPresent }}
        </p>

        <p class="text-xs text-muted">
          Hari
        </p>
      </div>

      <div class="rounded-xl border border-default bg-error/10 p-4">
        <p class="text-xs font-semibold uppercase text-muted">
          Absent
        </p>

        <p class="mt-1 text-xl font-bold text-error">
          {{ totalAbsent }}
        </p>

        <p class="text-xs text-muted">
          Hari
        </p>
      </div>

      <div class="rounded-xl border border-default bg-warning/10 p-4">
        <p class="text-xs font-semibold uppercase text-muted">
          Late (DT)
        </p>

        <p class="mt-1 text-xl font-bold text-warning">
          {{ totalLate }}
        </p>

        <p class="text-xs text-muted">
          Menit
        </p>
      </div>

      <div class="rounded-xl border border-default bg-orange-500/10 p-4">
        <p class="text-xs font-semibold uppercase text-muted">
          LEAVE EARLY (PC)
        </p>

        <p class="mt-1 text-xl font-bold text-orange-500">
          {{ totalEarlyCheckout }}
        </p>

        <p class="text-xs text-muted">
          Menit
        </p>
      </div>

      <div class="rounded-xl border border-default bg-success/10 p-4">
        <p class="text-xs font-semibold uppercase text-muted">
          Overtime (OT)
        </p>

        <p class="mt-1 text-xl font-bold text-success">
          {{ totalOvertime }}
        </p>

        <p class="text-xs text-muted">
          Menit
        </p>
      </div>

      <div class="rounded-xl border border-default bg-error/5 p-4">
        <p class="text-xs font-semibold uppercase text-muted">
          Holiday
        </p>

        <p class="mt-1 text-xl font-bold text-error">
          {{ totalHoliday }}
        </p>

        <p class="text-xs text-muted">
          Hari
        </p>
      </div>

      <div class="rounded-xl border border-default bg-muted/30 p-4">
        <p class="text-xs font-semibold uppercase text-muted">
          Off
        </p>

        <p class="mt-1 text-xl font-bold text-highlighted">
          {{ totalOff }}
        </p>

        <p class="text-xs text-muted">
          Hari
        </p>
      </div>

      <div class="rounded-xl border border-default bg-primary/5 p-4">
        <p class="text-xs font-semibold uppercase text-muted">
          Leave
        </p>

        <p class="mt-1 text-xl font-bold text-primary">
          {{ totalLeave }}
        </p>

        <p class="text-xs text-muted">
          Hari
        </p>
      </div>
    </div>
  </UCard>
</template>
