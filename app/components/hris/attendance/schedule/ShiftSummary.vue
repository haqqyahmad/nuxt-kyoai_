<!-- app/components/hris/attendance/schedule/ShiftSummary.vue -->

<script setup lang="ts">
type FinalShiftStatus = 'active' | 'off'

type FinalShiftItem = {
  date: string
  start_time: string | null
  end_time: string | null
  status: FinalShiftStatus
}

type FinalShiftResponse = {
  success: boolean
  message: string
  data: FinalShiftItem[]
}

const props = defineProps<{
  finalShiftResponse?: FinalShiftResponse
}>()

function getMinutesBetween(startTime: string | null, endTime: string | null) {
  if (!startTime || !endTime) return 0

  const [startHour, startMinute] = startTime.split(':').map(Number)
  const [endHour, endMinute] = endTime.split(':').map(Number)

  const startTotal = startHour * 60 + startMinute
  let endTotal = endHour * 60 + endMinute

  // Untuk shift malam: 22:00 - 06:00
  if (endTotal <= startTotal) {
    endTotal += 24 * 60
  }

  return endTotal - startTotal
}

const totalScheduledMinutes = computed(() => {
  return (props.finalShiftResponse?.data ?? [])
    .filter(item => item.status === 'active')
    .reduce((total, item) => {
      return total + getMinutesBetween(item.start_time, item.end_time)
    }, 0)
})

const totalScheduledHours = computed(() => {
  return totalScheduledMinutes.value / 60
})

const totalScheduledHoursLabel = computed(() => {
  return totalScheduledHours.value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  })
})

const totalWorkingDays = computed(() => {
  return new Set(
    (props.finalShiftResponse?.data ?? [])
      .filter(item => item.status === 'active')
      .map(item => item.date)
  ).size
})
</script>

<template>
  <aside class="space-y-6">
    <UCard
      variant="subtle"
      class="overflow-hidden"
    >
      <template #header>
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-muted">
              Summary
            </p>

            <h3 class="mt-1 font-semibold text-highlighted">
              Period Overview
            </h3>
          </div>

          <div class="rounded-xl bg-primary/10 p-2 text-primary">
            <UIcon
              name="i-lucide-chart-no-axes-combined"
              class="size-5"
            />
          </div>
        </div>
      </template>

      <div class="space-y-5">
        <div class="rounded-2xl bg-default p-4 shadow-sm ring-1 ring-default">
          <div class="flex items-end justify-between gap-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-muted">
                Total Scheduled Hours
              </p>

              <p class="mt-1 text-3xl font-bold text-primary">
                {{ totalScheduledHoursLabel }}
              </p>

              <p class="text-xs text-muted">
                hours
              </p>
            </div>

            <div class="text-right">
              <p class="text-lg font-semibold text-success">
                {{ totalWorkingDays }}
              </p>

              <p class="mt-1 text-xs text-muted">
                Working Days
              </p>
            </div>
          </div>
        </div>
      </div>
    </UCard>

    <HrisAttendanceScheduleShiftCoverageCard
      :final-shift-response="finalShiftResponse"
    />
  </aside>
</template>
